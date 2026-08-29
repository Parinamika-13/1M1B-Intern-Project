import os
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from agents import (
    analyze_workload,
    recommend_task_assignment,
    generate_weekly_summary,
    get_early_warning_alerts,
    answer_employee_question
)

app = Flask(__name__)
# Enable CORS for React development server
CORS(app, resources={r"/api/*": {"origins": "*"}})

EXCEL_FILE = "My_Sustainable_Workforce_Dataset_200_Employees.xlsx"

# Load the data tables from Excel workbook on startup
if not os.path.exists(EXCEL_FILE):
    raise FileNotFoundError(f"Database workbook {EXCEL_FILE} was not found.")

print(f"Loading data sheets from {EXCEL_FILE}...")
xls = pd.ExcelFile(EXCEL_FILE)

# Read and clean DataFrames
employees_df = pd.read_excel(xls, "Employees").where(pd.notnull(pd.read_excel(xls, "Employees")), None)
projects_df = pd.read_excel(xls, "Projects").where(pd.notnull(pd.read_excel(xls, "Projects")), None)
tasks_df = pd.read_excel(xls, "Tasks").where(pd.notnull(pd.read_excel(xls, "Tasks")), None)
meetings_df = pd.read_excel(xls, "Meetings").where(pd.notnull(pd.read_excel(xls, "Meetings")), None)

print("Data sheets loaded successfully:")
print(f" - Employees: {len(employees_df)}")
print(f" - Projects: {len(projects_df)}")
print(f" - Tasks: {len(tasks_df)}")
print(f" - Meetings: {len(meetings_df)}")

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
        # Parse name from email prefix dynamically
        prefix = email.split('@')[0]
        name_parts = prefix.split('.')
        manager_name = " ".join([p.capitalize() for p in name_parts])
        if not manager_name:
            manager_name = "Operations Manager"
        return jsonify({
            "status": "success",
            "role": "manager",
            "name": manager_name,
            "role_title": "Operations Director" if "director" in prefix or "jenkins" in prefix else "Operations Manager",
            "email": email
        })
    else:
        employee_id = None
        if email.startswith('e') and '@' in email:
            prefix = email.split('@')[0]
            try:
                num = int(prefix[1:])
                employee_id = f"E{num:03d}"
            except ValueError:
                pass
                
        if not employee_id:
            return jsonify({"status": "error", "message": "Invalid employee email format"}), 400
            
        emp_match = employees_df[employees_df["employee_id"] == employee_id]
        if emp_match.empty:
            return jsonify({"status": "error", "message": f"Employee record {employee_id} not found"}), 404
            
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

@app.route("/api/demo-accounts", methods=["GET"])
def get_demo_accounts():
    emails = []
    if len(employees_df) >= 2:
        emp1 = employees_df.iloc[0]
        emp2 = employees_df.iloc[1]
        emails.append({
            "name": clean_name(emp1["employee_name"]),
            "email": f"{emp1['employee_id'].lower()}@company.com",
            "role": "employee"
        })
        emails.append({
            "name": clean_name(emp2["employee_name"]),
            "email": f"{emp2['employee_id'].lower()}@company.com",
            "role": "employee"
        })
    else:
        emails.append({
            "name": "Team Member",
            "email": "e001@company.com",
            "role": "employee"
        })
        
    emails.insert(0, {
        "name": "Operations Manager",
        "email": "operations.manager@company.com",
        "role": "manager"
    })
    return jsonify(emails)

@app.route("/api/stats", methods=["GET"])
def get_stats():
    # Dynamic calculation of manager metrics from live employees, tasks, and meetings tables
    employees_count = len(employees_df)
    projects_count = len(projects_df)
    
    total_completed = 0
    total_pending = 0
    total_overdue = 0
    sum_utilization = 0.0
    sum_satisfaction = 0.0
    sum_meeting_hours = 0.0
    sum_completion_rate = 0.0
    
    risk_counts = {"Low": 0, "Medium": 0, "High": 0}
    
    for _, emp in employees_df.iterrows():
        emp_id = emp["employee_id"]
        emp_tasks = tasks_df[tasks_df["employee_id"] == emp_id].to_dict(orient="records")
        emp_meetings = meetings_df[meetings_df["employee_id"] == emp_id].to_dict(orient="records")
        
        # Analyze workload dynamically using Agent 1
        analysis = analyze_workload(emp_id, emp, emp_tasks, emp_meetings)
        utilization = analysis["utilization_percent"]
        risk = analysis["workload_risk"]
        
        sum_satisfaction += float(emp.get("employee_satisfaction_score") or 8.0)
        
        m_hrs = analysis["traceability"]["meeting_hours"]
        sum_meeting_hours += m_hrs
        
        t_total = len(emp_tasks)
        t_completed = len([t for t in emp_tasks if t["status"] in ["Completed", "Done"]])
        t_pending = len([t for t in emp_tasks if t["status"] not in ["Completed", "Done"]])
        t_overdue = len([t for t in emp_tasks if t["status"] not in ["Completed", "Done"] and int(t.get("deadline_days_remaining") or 0) <= 0])
        
        total_completed += t_completed
        total_pending += t_pending
        total_overdue += t_overdue
        
        sum_utilization += utilization
        risk_counts[risk] += 1
        
        rate = (t_completed / t_total * 100.0) if t_total > 0 else 0.0
        sum_completion_rate += rate
        
    return jsonify({
        "employees_count": employees_count,
        "projects_count": projects_count,
        "completed_tasks": total_completed,
        "pending_tasks": total_pending,
        "overdue_tasks": total_overdue,
        "avg_workload_percent": round(sum_utilization / employees_count, 1) if employees_count > 0 else 0.0,
        "avg_satisfaction": round(sum_satisfaction / employees_count, 1) if employees_count > 0 else 0.0,
        "avg_meeting_hours_weekly": round(sum_meeting_hours / employees_count, 1) if employees_count > 0 else 0.0,
        "avg_completion_rate_percent": round(sum_completion_rate / employees_count, 1) if employees_count > 0 else 0.0,
        "risk_distribution": risk_counts
    })

@app.route("/api/employees", methods=["GET"])
def get_employees():
    search_query = request.args.get("search", "").strip().lower()
    department = request.args.get("department", "").strip()
    risk_level = request.args.get("risk", "").strip()
    
    results = []
    
    for _, emp in employees_df.iterrows():
        emp_id = emp["employee_id"]
        emp_name = clean_name(emp["employee_name"])
        emp_role = emp["role"]
        emp_dept = emp["department"]
        
        if search_query:
            match_search = (search_query in emp_id.lower() or 
                            search_query in emp_name.lower() or 
                            search_query in emp_role.lower())
            if not match_search:
                continue
                
        if department and emp_dept != department:
            continue
            
        emp_tasks = tasks_df[tasks_df["employee_id"] == emp_id].to_dict(orient="records")
        emp_meetings = meetings_df[meetings_df["employee_id"] == emp_id].to_dict(orient="records")
        
        analysis = analyze_workload(emp_id, emp, emp_tasks, emp_meetings)
        utilization = analysis["utilization_percent"]
        emp_risk = analysis["workload_risk"]
        
        if risk_level and emp_risk != risk_level:
            continue
            
        total_tasks_count = len(emp_tasks)
        completed_tasks_count = len([t for t in emp_tasks if t["status"] in ["Completed", "Done"]])
        comp_rate = (completed_tasks_count / total_tasks_count * 100.0) if total_tasks_count > 0 else 0.0
        
        results.append({
            "employee_id": emp_id,
            "employee_name": emp_name,
            "department": emp_dept,
            "role": emp_role,
            "completed_tasks": completed_tasks_count,
            "total_tasks": total_tasks_count,
            "completion_rate_percent": round(comp_rate, 1),
            "utilization_percent": round(utilization, 1),
            "workload_risk": emp_risk
        })
        
    return jsonify(results)

@app.route("/api/employees/<employee_id>", methods=["GET"])
def get_employee_detail(employee_id):
    emp_match = employees_df[employees_df["employee_id"] == employee_id]
    if emp_match.empty:
        return jsonify({"status": "error", "message": "Employee not found"}), 404
        
    emp = emp_match.iloc[0].to_dict()
    
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
            "deadline_days_remaining": int(t["deadline_days_remaining"]) if t["deadline_days_remaining"] is not None else 0,
            "estimated_hours": int(t.get("estimated_hours") or 8)
        })
        
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
        
    # Agent 1 dynamic workload analysis
    analysis = analyze_workload(employee_id, emp, emp_tasks, emp_meetings)
    utilization = analysis["utilization_percent"]
    emp_risk = analysis["workload_risk"]
    ai_recommendation = analysis["ai_recommendation"]
    
    total = len(emp_tasks)
    completed = len([t for t in emp_tasks if t["status"] in ["Completed", "Done"]])
    in_progress = len([t for t in emp_tasks if t["status"] == "In Progress"])
    pending = len([t for t in emp_tasks if t["status"] == "To Do"])
    overdue = len([t for t in emp_tasks if t["status"] not in ["Completed", "Done"] and int(t.get("deadline_days_remaining") or 0) <= 0])
    comp_rate = (completed / total * 100.0) if total > 0 else 0.0
    
    dept = emp["department"]
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
        "employee_id": emp["employee_id"],
        "employee_name": clean_name(emp["employee_name"]),
        "department": emp["department"],
        "role": emp["role"],
        "utilization_percent": round(utilization, 1),
        "workload_risk": emp_risk,
        "employee_satisfaction_score": float(emp["employee_satisfaction_score"] or 8.0),
        "completed_tasks": completed,
        "total_tasks": total,
        "in_progress_tasks": in_progress,
        "pending_tasks": pending,
        "overdue_tasks": overdue,
        "completion_rate_percent": round(comp_rate, 1),
        "meeting_hours": sum(float(m['duration_minutes'] or 0.0) / 60.0 for m in emp_meetings),
        "leave_days_this_month": int(emp["leave_days_this_month"] or 0),
        "ai_recommendation": ai_recommendation,
        "primary_skill": emp["primary_skill"],
        "skill_level": emp["skill_level"],
        "supplementary_skills": extra_skills,
        "tasks": formatted_tasks,
        "meetings": formatted_meetings,
        "traceability": analysis["traceability"]
    })

@app.route("/api/employee-dashboard/<employee_id>", methods=["GET"])
def get_employee_dashboard(employee_id):
    return get_employee_detail(employee_id)

@app.route("/api/tasks/toggle/<task_id>", methods=["POST"])
def toggle_task(task_id):
    global tasks_df
    mask = tasks_df["task_id"] == task_id
    if not mask.any():
        return jsonify({"status": "error", "message": "Task not found"}), 404
        
    current_status = tasks_df.loc[mask, "status"].values[0]
    new_status = "Completed" if current_status != "Completed" else "In Progress"
    new_progress = 100.0 if new_status == "Completed" else 50.0
    
    tasks_df.loc[mask, "status"] = new_status
    tasks_df.loc[mask, "progress_percent"] = new_progress
    
    employee_id = tasks_df.loc[mask, "employee_id"].values[0]
    emp_tasks = tasks_df[tasks_df["employee_id"] == employee_id]
    total = len(emp_tasks)
    completed = len(emp_tasks[emp_tasks["status"] == "Completed"])
    comp_rate = (completed / total * 100.0) if total > 0 else 0.0
    
    return jsonify({
        "status": "success",
        "task_id": task_id,
        "new_status": new_status,
        "new_progress": new_progress,
        "employee_updated_completed": completed,
        "employee_updated_completion_rate": comp_rate
    })

@app.route("/api/departments", methods=["GET"])
def get_departments():
    depts = employees_df["department"].dropna().unique().tolist()
    return jsonify(depts)

@app.route("/api/skills", methods=["GET"])
def get_skills():
    skills = employees_df["primary_skill"].dropna().unique().tolist()
    return jsonify(skills)

@app.route("/api/ai/config", methods=["GET"])
def get_ai_config():
    from agents import (
        WORKLOAD_THRESHOLD_LOW,
        WORKLOAD_THRESHOLD_HIGH,
        MEETING_OVERLOAD_PCT,
        DEADLINE_URGENCY_DAYS,
        PROGRESS_RISK_THRESHOLD
    )
    return jsonify({
        "WORKLOAD_THRESHOLD_LOW": WORKLOAD_THRESHOLD_LOW,
        "WORKLOAD_THRESHOLD_HIGH": WORKLOAD_THRESHOLD_HIGH,
        "MEETING_OVERLOAD_PCT": MEETING_OVERLOAD_PCT,
        "DEADLINE_URGENCY_DAYS": DEADLINE_URGENCY_DAYS,
        "PROGRESS_RISK_THRESHOLD": PROGRESS_RISK_THRESHOLD
    })

# ==================== NEW AI AGENT ENDPOINTS ====================

@app.route("/api/ai/recommend-task-assignment", methods=["POST"])
def get_assignment_recommendations():
    # Agent 2
    data = request.json or {}
    employees_list = employees_df.to_dict(orient="records")
    recommendations = recommend_task_assignment(data, employees_list, tasks_df, meetings_df)
    return jsonify(recommendations)

@app.route("/api/ai/weekly-summary", methods=["GET"])
def get_department_weekly_summary():
    # Agent 3
    dept = request.args.get("department", "").strip()
    summary = generate_weekly_summary(dept, employees_df, tasks_df, meetings_df)
    return jsonify(summary)

@app.route("/api/ai/early-warnings", methods=["GET"])
def get_warnings():
    # Agent 4
    employees_list = employees_df.to_dict(orient="records")
    alerts = get_early_warning_alerts(employees_list, tasks_df, meetings_df)
    return jsonify(alerts)

@app.route("/api/ai/employee-assistant", methods=["POST"])
def ask_employee_assistant():
    # Agent 5
    data = request.json or {}
    employee_id = data.get("employee_id")
    question = data.get("question", "")
    
    if not employee_id:
        return jsonify({"status": "error", "message": "employee_id is required"}), 400
        
    answer = answer_employee_question(employee_id, question, employees_df, tasks_df, meetings_df)
    return jsonify(answer)

if __name__ == "__main__":
    print("Starting SustWork API server on http://localhost:5000...")
    app.run(host="127.0.0.1", port=5000, debug=True)
