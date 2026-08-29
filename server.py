import os
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Enable CORS for React development server (typically port 5173 or 3000)
CORS(app, resources={r"/api/*": {"origins": "*"}})

EXCEL_FILE = "My_Sustainable_Workforce_Dataset_200_Employees.xlsx"

# Load the data tables from Excel workbook on startup
if not os.path.exists(EXCEL_FILE):
    raise FileNotFoundError(f"Database workbook {EXCEL_FILE} was not found.")

print(f"Loading data sheets from {EXCEL_FILE}...")
xls = pd.ExcelFile(EXCEL_FILE)

# Read and clean DataFrames
# Replacing NaNs with None so they translate cleanly to JSON null
employees_df = pd.read_excel(xls, "Employees").where(pd.notnull(pd.read_excel(xls, "Employees")), None)
projects_df = pd.read_excel(xls, "Projects").where(pd.notnull(pd.read_excel(xls, "Projects")), None)
tasks_df = pd.read_excel(xls, "Tasks").where(pd.notnull(pd.read_excel(xls, "Tasks")), None)
meetings_df = pd.read_excel(xls, "Meetings").where(pd.notnull(pd.read_excel(xls, "Meetings")), None)
summary_df = pd.read_excel(xls, "Workload_Summary").where(pd.notnull(pd.read_excel(xls, "Workload_Summary")), None)

print("Data sheets loaded successfully:")
print(f" - Employees: {len(employees_df)}")
print(f" - Projects: {len(projects_df)}")
print(f" - Tasks: {len(tasks_df)}")
print(f" - Meetings: {len(meetings_df)}")
print(f" - Workload Summary: {len(summary_df)}")

# Helper to normalize employee name formats
def clean_name(name):
    if not name:
        return ""
    return name.replace("_", " ")

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    role = data.get("role", "employee").strip().lower()
    
    if not email:
        return jsonify({"status": "error", "message": "Email is required"}), 400
        
    if role == "manager":
        # Hardcoded admin/manager profile
        return jsonify({
            "status": "success",
            "role": "manager",
            "name": "Sarah Jenkins",
            "role_title": "Operations Director",
            "email": email
        })
    else:
        # Resolve employee based on email syntax or default values
        # e.g., e001@company.com -> Employee ID E001
        employee_id = None
        if email.startswith('e') and '@' in email:
            prefix = email.split('@')[0]
            # extract E001 format
            try:
                num = int(prefix[1:])
                employee_id = f"E{num:03d}"
            except ValueError:
                pass
                
        # Default fallback if parsing fails
        if not employee_id:
            employee_id = "E001"
            
        # Look up employee in database
        emp_match = employees_df[employees_df["employee_id"] == employee_id]
        if emp_match.empty:
            # Fall back to first employee
            emp = employees_df.iloc[0].to_dict()
        else:
            emp = emp_match.iloc[0].to_dict()
            
        return jsonify({
            "status": "success",
            "role": "employee",
            "employee_id": emp["employee_id"],
            "name": clean_name(emp["employee_name"]),
            "department": emp["department"],
            "role_title": emp["role"],
            "email": email
        })

@app.route("/api/stats", methods=["GET"])
def get_stats():
    # Dynamic computation of manager metrics
    employees_count = len(summary_df)
    projects_count = len(projects_df)
    
    total_tasks_done = int(summary_df["completed_tasks"].sum())
    total_tasks_pending = int(summary_df["pending_tasks"].sum() + summary_df["in_progress_tasks"].sum())
    total_tasks_overdue = int(summary_df["overdue_tasks"].sum())
    
    avg_workload = float(summary_df["utilization_percent"].mean())
    avg_satisfaction = float(summary_df["employee_satisfaction_score"].mean())
    avg_meetings = float(summary_df["meeting_hours"].mean())
    avg_completion = float(summary_df["completion_rate_percent"].mean())
    
    # Calculate risk counts
    risk_counts = summary_df["workload_risk"].value_counts().to_dict()
    low_risk = int(risk_counts.get("Low", 0))
    med_risk = int(risk_counts.get("Medium", 0))
    high_risk = int(risk_counts.get("High", 0))
    
    return jsonify({
        "employees_count": employees_count,
        "projects_count": projects_count,
        "completed_tasks": total_tasks_done,
        "pending_tasks": total_tasks_pending,
        "overdue_tasks": total_tasks_overdue,
        "avg_workload_percent": round(avg_workload, 1),
        "avg_satisfaction": round(avg_satisfaction, 1),
        "avg_meeting_hours_weekly": round(avg_meetings, 1),
        "avg_completion_rate_percent": round(avg_completion, 1),
        "risk_distribution": {
            "Low": low_risk,
            "Medium": med_risk,
            "High": high_risk
        }
    })

@app.route("/api/employees", methods=["GET"])
def get_employees():
    search_query = request.args.get("search", "").strip().lower()
    department = request.args.get("department", "").strip()
    risk_level = request.args.get("risk", "").strip()
    
    results = []
    
    for _, row in summary_df.iterrows():
        emp_id = row["employee_id"]
        emp_name = clean_name(row["employee_name"])
        emp_role = row["role"]
        emp_dept = row["department"]
        emp_risk = row["workload_risk"]
        
        # Search filter
        if search_query:
            match_search = (search_query in emp_id.lower() or 
                            search_query in emp_name.lower() or 
                            search_query in emp_role.lower())
            if not match_search:
                continue
                
        # Department filter
        if department and emp_dept != department:
            continue
            
        # Risk level filter
        if risk_level and emp_risk != risk_level:
            continue
            
        results.append({
            "employee_id": emp_id,
            "employee_name": emp_name,
            "department": emp_dept,
            "role": emp_role,
            "completed_tasks": int(row["completed_tasks"]),
            "total_tasks": int(row["total_tasks"]),
            "completion_rate_percent": float(row["completion_rate_percent"]),
            "utilization_percent": float(row["utilization_percent"]),
            "workload_risk": emp_risk
        })
        
    return jsonify(results)

@app.route("/api/employees/<employee_id>", methods=["GET"])
def get_employee_detail(employee_id):
    # Lookup summary record
    summary_match = summary_df[summary_df["employee_id"] == employee_id]
    if summary_match.empty:
        return jsonify({"status": "error", "message": "Employee not found"}), 404
        
    summary_row = summary_match.iloc[0].to_dict()
    employee_row = employees_df[employees_df["employee_id"] == employee_id].iloc[0].to_dict()
    
    # Get Tasks list
    emp_tasks = tasks_df[tasks_df["employee_id"] == employee_id].to_dict(orient="records")
    formatted_tasks = []
    for t in emp_tasks:
        formatted_tasks.append({
            "task_id": t["task_id"],
            "task_title": t["task_title"],
            "priority": t["priority"],
            "status": t["status"],
            "progress_percent": float(t["progress_percent"]) if t["progress_percent"] is not None else 0.0,
            "task_complexity": t["task_complexity"],
            "deadline_days_remaining": int(t["deadline_days_remaining"]) if t["deadline_days_remaining"] is not None else 0
        })
        
    # Get Meetings list
    emp_meetings = meetings_df[meetings_df["employee_id"] == employee_id].to_dict(orient="records")
    formatted_meetings = []
    for m in emp_meetings:
        formatted_meetings.append({
            "meeting_id": m["meeting_id"],
            "meeting_title": m["meeting_title"],
            "duration_minutes": int(m["duration_minutes"]),
            "attendance_type": m["attendance_type"],
            "meeting_status": m["meeting_status"]
        })
        
    # Mock supplemental skills based on department
    dept = summary_row["department"]
    extra_skills = ["Critical Thinking", "Agile Execution", "Team Collaboration"]
    if dept == 'Engineering':
        extra_skills = ["Code Review", "Data Structures", "System Design", "Git Workflow"]
    elif dept == 'Design':
        extra_skills = ["UI Prototyping", "Design System", "Visual Identity", "Typography"]
    elif dept == 'Product':
        extra_skills = ["User Stories", "Roadmapping", "Product Analytics", "Market Fit"]
    elif dept == 'Marketing':
        extra_skills = ["SEO Analytics", "Campaign Planning", "Copywriting", "Growth Hacks"]
    elif dept == 'Data Science':
        extra_skills = ["Python Model", "SQL Queries", "Statistical Analysis", "Tableau Charts"]
        
    return jsonify({
        "employee_id": summary_row["employee_id"],
        "employee_name": clean_name(summary_row["employee_name"]),
        "department": summary_row["department"],
        "role": summary_row["role"],
        "utilization_percent": float(summary_row["utilization_percent"]),
        "workload_risk": summary_row["workload_risk"],
        "employee_satisfaction_score": float(summary_row["employee_satisfaction_score"]),
        "completed_tasks": int(summary_row["completed_tasks"]),
        "total_tasks": int(summary_row["total_tasks"]),
        "in_progress_tasks": int(summary_row["in_progress_tasks"]),
        "pending_tasks": int(summary_row["pending_tasks"]),
        "overdue_tasks": int(summary_row["overdue_tasks"]),
        "completion_rate_percent": float(summary_row["completion_rate_percent"]),
        "meeting_hours": float(summary_row["meeting_hours"]),
        "leave_days_this_month": int(summary_row["leave_days_this_month"]),
        "ai_recommendation": summary_row["ai_recommendation"],
        "primary_skill": employee_row["primary_skill"],
        "skill_level": employee_row["skill_level"],
        "supplementary_skills": extra_skills,
        "tasks": formatted_tasks,
        "meetings": formatted_meetings
    })

@app.route("/api/employee-dashboard/<employee_id>", methods=["GET"])
def get_employee_dashboard(employee_id):
    # This matches the schema returned by get_employee_detail, but tailored for employee self-view
    return get_employee_detail(employee_id)

@app.route("/api/tasks/toggle/<task_id>", methods=["POST"])
def toggle_task(task_id):
    global tasks_df
    # In a real app we would modify the dataframe and save back or update cache.
    # We will simulate toggling in memory.
    mask = tasks_df["task_id"] == task_id
    if not mask.any():
        return jsonify({"status": "error", "message": "Task not found"}), 404
        
    current_status = tasks_df.loc[mask, "status"].values[0]
    new_status = "Completed" if current_status != "Completed" else "In Progress"
    new_progress = 100.0 if new_status == "Completed" else 50.0
    
    tasks_df.loc[mask, "status"] = new_status
    tasks_df.loc[mask, "progress_percent"] = new_progress
    
    # Recalculate summary metrics in summary_df for the owner of this task
    employee_id = tasks_df.loc[mask, "employee_id"].values[0]
    
    emp_tasks = tasks_df[tasks_df["employee_id"] == employee_id]
    total = len(emp_tasks)
    completed = len(emp_tasks[emp_tasks["status"] == "Completed"])
    in_progress = len(emp_tasks[emp_tasks["status"] == "In Progress"])
    pending = len(emp_tasks[emp_tasks["status"] == "To Do"]) # or "Pending"
    overdue = len(emp_tasks[(emp_tasks["status"] != "Completed") & (emp_tasks["deadline_days_remaining"] <= 0)])
    
    comp_rate = (completed / total * 100) if total > 0 else 0.0
    
    summary_mask = summary_df["employee_id"] == employee_id
    if not summary_mask.empty:
        summary_df.loc[summary_mask, "completed_tasks"] = completed
        summary_df.loc[summary_mask, "in_progress_tasks"] = in_progress
        summary_df.loc[summary_mask, "pending_tasks"] = pending
        summary_df.loc[summary_mask, "overdue_tasks"] = overdue
        summary_df.loc[summary_mask, "completion_rate_percent"] = comp_rate
        
    return jsonify({
        "status": "success",
        "task_id": task_id,
        "new_status": new_status,
        "new_progress": new_progress,
        "employee_updated_completed": completed,
        "employee_updated_completion_rate": comp_rate
    })

if __name__ == "__main__":
    print("Starting SustWork API server on http://localhost:5000...")
    app.run(host="127.0.0.1", port=5000, debug=True)
