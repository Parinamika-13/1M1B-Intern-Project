# ==================== CONFIGURATION AND THRESHOLDS ====================
WORKLOAD_THRESHOLD_LOW = 80.0
WORKLOAD_THRESHOLD_HIGH = 110.0
MEETING_OVERLOAD_PCT = 30.0
DEADLINE_URGENCY_DAYS = 3
PROGRESS_RISK_THRESHOLD = 50.0

# Helper to normalize employee name formatting
def clean_name(name):
    if not name:
        return ""
    return name.replace("_", " ")


# ==================== AGENT 1: WORKLOAD ANALYSIS ====================
def analyze_workload(employee_id, employee_row, emp_tasks, emp_meetings):
    """
    Computes workload utilization percentage dynamically.
    utilization % = (sum of active task hours + sum of meeting hours) / available hours * 100
    """
    # Active tasks (exclude Completed or Done)
    active_tasks = [t for t in emp_tasks if t['status'] not in ['Completed', 'Done']]
    active_task_hours = sum(float(t['estimated_hours'] or 0.0) for t in active_tasks)
    
    # Meeting hours
    meeting_hours = sum(float(m['duration_minutes'] or 0.0) / 60.0 for m in emp_meetings)
    
    available_hours = float(employee_row.get('available_hours_per_week') or 40.0)
    total_committed = active_task_hours + meeting_hours
    utilization = (total_committed / available_hours) * 100.0 if available_hours > 0 else 0.0
    
    # Classification based on thresholds
    if utilization < WORKLOAD_THRESHOLD_LOW:
        risk = "Low"
    elif utilization <= WORKLOAD_THRESHOLD_HIGH:
        risk = "Medium"
    else:
        risk = "High"
        
    # Overdue and high priority counts
    overdue_tasks = [t for t in active_tasks if int(t.get('deadline_days_remaining') or 0) <= 0]
    high_priority = [t for t in active_tasks if t.get('priority') == 'High']
    
    # Build traceability trace logs
    traceability = {
        "employee_id": employee_id,
        "active_task_count": len(active_tasks),
        "active_task_hours": active_task_hours,
        "meeting_count": len(emp_meetings),
        "meeting_hours": round(meeting_hours, 2),
        "available_hours": available_hours,
        "total_committed": round(total_committed, 2),
        "utilization_percent": round(utilization, 2),
        "workload_risk": risk,
        "overdue_tasks": len(overdue_tasks),
        "high_priority_tasks": len(high_priority),
        "thresholds": {
            "low": WORKLOAD_THRESHOLD_LOW,
            "high": WORKLOAD_THRESHOLD_HIGH
        }
    }
    
    # Natural language summary generated entirely from computed metrics
    words = []
    words.append(f"Workload utilization is currently at {round(utilization, 1)}% ({round(total_committed, 1)} hours committed out of {available_hours} available).")
    
    if risk == "High":
        words.append(f"This is classified as High workload risk. The employee has {len(active_tasks)} active tasks requiring {active_task_hours} hours of effort, alongside {round(meeting_hours, 1)} hours of scheduled meetings.")
        if overdue_tasks:
            words.append(f"Additionally, {len(overdue_tasks)} tasks are already past their deadline, creating further bottleneck pressure.")
        else:
            words.append("No active tasks are currently overdue, but the schedule remains saturated.")
    elif risk == "Medium":
        words.append(f"This indicates a balanced Medium workload. Active tasks ({len(active_tasks)}) account for {active_task_hours} hours, and meetings require {round(meeting_hours, 1)} hours.")
        if overdue_tasks:
            words.append(f"However, attention is required for {len(overdue_tasks)} overdue tasks.")
    else:
        words.append(f"This shows Low workload risk with surplus capacity of {round(max(0.0, available_hours - total_committed), 1)} hours. The employee has {len(active_tasks)} active tasks and {round(meeting_hours, 1)} meeting hours.")
        
    ai_recommendation = " ".join(words)
    
    return {
        "utilization_percent": round(utilization, 1),
        "workload_risk": risk,
        "ai_recommendation": ai_recommendation,
        "traceability": traceability
    }


# ==================== AGENT 2: TASK ASSIGNMENT RECOMMENDATION ====================
def recommend_task_assignment(task_details, employees_list, tasks_df, meetings_df):
    """
    Ranks candidates for a new task based on skill, current workload, and capacity.
    Weighs confirmed primary skills higher than inferred departmental skills.
    """
    task_skill = task_details.get("required_skill", "").strip().lower()
    task_hours = float(task_details.get("estimated_hours", 8))
    
    candidates = []
    
    for emp in employees_list:
        emp_id = emp["employee_id"]
        emp_primary = (emp.get("primary_skill") or "").strip().lower()
        emp_dept = emp.get("department", "")
        
        # Determine supplementary skills dynamically based on department
        extra_skills = []
        if emp_dept == 'Engineering':
            extra_skills = ["code review", "data structures", "system design", "git workflow"]
        elif emp_dept == 'Design':
            extra_skills = ["ui prototyping", "design system", "visual identity", "typography"]
        elif emp_dept == 'Product':
            extra_skills = ["user stories", "roadmapping", "product analytics", "market fit"]
        elif emp_dept == 'Marketing':
            extra_skills = ["seo analytics", "campaign planning", "copywriting", "growth hacks"]
        elif emp_dept == 'Data Science':
            extra_skills = ["python model", "sql queries", "statistical analysis", "tableau charts"]
            
        # Check skill match types
        is_primary_match = (task_skill in emp_primary)
        is_inferred_match = not is_primary_match and any(task_skill in s for s in extra_skills)
        has_skill = is_primary_match or is_inferred_match
        
        # Load active workload from database
        emp_tasks = tasks_df[tasks_df["employee_id"] == emp_id].to_dict(orient="records")
        emp_meetings = meetings_df[meetings_df["employee_id"] == emp_id].to_dict(orient="records")
        
        analysis = analyze_workload(emp_id, emp, emp_tasks, emp_meetings)
        utilization = analysis["utilization_percent"]
        committed = analysis["traceability"]["total_committed"]
        available = analysis["traceability"]["available_hours"]
        capacity = max(0.0, available - committed)
        
        # Scoring logic:
        # Confirmed primary skill match is weighted highest (+1000 points).
        # Inferred departmental skill match is weighted lower (+300 points).
        # Lower workload is preferred (+100 - utilization).
        # Overloaded members receive penalty.
        skill_score = 0
        if is_primary_match:
            skill_score = 1000
        elif is_inferred_match:
            skill_score = 300
            
        score = skill_score + (100.0 - utilization) * 2.0
        if utilization > WORKLOAD_THRESHOLD_HIGH:
            score -= 500
            
        # Build reasoning string dynamically
        reason_parts = []
        reason_parts.append(f"Current workload is {utilization}% with {round(capacity, 1)}h of remaining capacity.")
        if is_primary_match:
            reason_parts.append(f"Confirmed match for primary skill '{emp.get('primary_skill')}'.")
        elif is_inferred_match:
            reason_parts.append(f"Inferred match for skill '{task_details.get('required_skill')}' (based on {emp_dept} department context).")
        else:
            reason_parts.append("Does not match required skill.")
            
        if utilization > WORKLOAD_THRESHOLD_HIGH:
            reason_parts.append("Warning: Employee is already overloaded; assigning additional tasks may increase burnout risk.")
        elif capacity >= task_hours:
            reason_parts.append(f"Has sufficient capacity to accommodate this {task_hours}-hour task.")
        else:
            reason_parts.append(f"Insufficient capacity ({round(capacity, 1)}h available vs {task_hours}h required).")
            
        reasoning = " ".join(reason_parts)
        
        candidates.append({
            "employee_id": emp_id,
            "employee_name": clean_name(emp.get("employee_name")),
            "department": emp_dept,
            "role": emp.get("role"),
            "utilization_percent": utilization,
            "remaining_capacity": round(capacity, 1),
            "has_skill": has_skill,
            "match_type": "Primary Skill Match" if is_primary_match else ("Inferred Dept Skill Match" if is_inferred_match else "No Skill Match"),
            "suitability_score": score,
            "reasoning": reasoning,
            "traceability": {
                "is_primary_match": is_primary_match,
                "is_inferred_match": is_inferred_match,
                "utilization_percent": utilization,
                "remaining_capacity": round(capacity, 1),
                "required_hours": task_hours,
                "calculated_score": score
            }
        })
        
    # Sort matching skill first, then higher suitability score first
    candidates.sort(key=lambda x: (-2 if x["match_type"] == "Primary Skill Match" else (-1 if x["match_type"] == "Inferred Dept Skill Match" else 0), -x["suitability_score"]))
    return candidates[:5]


# ==================== AGENT 3: WEEKLY PROGRESS SUMMARY ====================
def generate_weekly_summary(department, employees_df, tasks_df, meetings_df):
    """
    Aggregates a snapshot summary of task completion, workload risks, and meeting hours for the department or organization.
    Historical dated data is unsupported as there are no calendar timestamp fields in the active dataset.
    """
    if department:
        dept_emps = employees_df[employees_df["department"] == department]
    else:
        dept_emps = employees_df
        
    emp_ids = set(dept_emps["employee_id"].tolist())
    
    # Filter datasets
    dept_tasks = tasks_df[tasks_df["employee_id"].isin(emp_ids)].to_dict(orient="records")
    dept_meetings = meetings_df[meetings_df["employee_id"].isin(emp_ids)].to_dict(orient="records")
    
    total_tasks = len(dept_tasks)
    completed_tasks = len([t for t in dept_tasks if t["status"] in ["Completed", "Done"]])
    in_progress_tasks = len([t for t in dept_tasks if t["status"] == "In Progress"])
    overdue_tasks = len([t for t in dept_tasks if t["status"] not in ["Completed", "Done"] and int(t.get("deadline_days_remaining") or 0) <= 0])
    
    comp_pct = (completed_tasks / total_tasks * 100.0) if total_tasks > 0 else 0.0
    
    # Workload risks and meeting sums
    high_risk_count = 0
    medium_risk_count = 0
    low_risk_count = 0
    total_meeting_hours = 0.0
    
    for _, emp in dept_emps.iterrows():
        emp_id = emp["employee_id"]
        e_tasks = [t for t in dept_tasks if t["employee_id"] == emp_id]
        e_meetings = [m for m in dept_meetings if m["employee_id"] == emp_id]
        
        # Call Agent 1 Workload Analyzer
        analysis = analyze_workload(emp_id, emp, e_tasks, e_meetings)
        risk = analysis["workload_risk"]
        
        if risk == "High":
            high_risk_count += 1
        elif risk == "Medium":
            medium_risk_count += 1
        else:
            low_risk_count += 1
            
        m_hrs = sum(float(m["duration_minutes"] or 0) / 60.0 for m in e_meetings)
        total_meeting_hours += m_hrs
        
    # Generate Natural Language Summary sentences
    sentences = []
    dept_label = f"the {department} department" if department else "the organization"
    
    sentences.append(
        f"Within {dept_label}, we are currently tracking {total_tasks} active tasks across all personnel. "
        f"The current milestone completion rate is {round(comp_pct, 1)}% ({completed_tasks} completed tasks out of {total_tasks} total). "
        f"We have identified {overdue_tasks} overdue tasks requiring immediate prioritization."
    )
    
    sentences.append(
        f"A workload risk scan flags {high_risk_count} employees at High workload risk (utilization > {WORKLOAD_THRESHOLD_HIGH}%) and {medium_risk_count} at Medium workload risk. "
        f"Total meeting commitment for this group stands at {round(total_meeting_hours, 1)} hours."
    )
    
    sentences.append(
        "Note: Historical trend analysis and week-over-week comparisons are unavailable as the active dataset does not contain calendar timestamps."
    )
    
    summary_text = " ".join(sentences)
    
    return {
        "summary": summary_text,
        "traceability": {
            "department": department,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "in_progress_tasks": in_progress_tasks,
            "overdue_tasks": overdue_tasks,
            "completion_rate_percent": round(comp_pct, 2),
            "high_risk_count": high_risk_count,
            "medium_risk_count": medium_risk_count,
            "low_risk_count": low_risk_count,
            "total_meeting_hours": round(total_meeting_hours, 2),
            "trend_analysis_status": "Unsupported (No dates in dataset)"
        }
    }


# ==================== AGENT 4: EARLY-WARNING / OVERLOAD ALERTS ====================
def get_early_warning_alerts(employees_list, tasks_df, meetings_df):
    """
    Evaluates risk rules across the employee pool and generates live overload warnings.
    """
    high_workload = []
    deadline_risk = []
    meeting_overload = []
    available_capacity = []
    
    for emp in employees_list:
        emp_id = emp["employee_id"]
        emp_name = clean_name(emp["employee_name"])
        emp_dept = emp["department"]
        
        emp_tasks = tasks_df[tasks_df["employee_id"] == emp_id].to_dict(orient="records")
        emp_meetings = meetings_df[meetings_df["employee_id"] == emp_id].to_dict(orient="records")
        
        # Analyze workload using Agent 1
        analysis = analyze_workload(emp_id, emp, emp_tasks, emp_meetings)
        utilization = analysis["utilization_percent"]
        committed = analysis["traceability"]["total_committed"]
        avail = analysis["traceability"]["available_hours"]
        meeting_hours = analysis["traceability"]["meeting_hours"]
        
        # Rule 1: High Workload
        if utilization > WORKLOAD_THRESHOLD_HIGH:
            high_workload.append({
                "employee_id": emp_id,
                "employee_name": emp_name,
                "department": emp_dept,
                "value": f"{round(utilization, 1)}%",
                "description": f"Workload utilization is overloaded at {round(utilization, 1)}% ({round(committed, 1)}h committed vs {avail}h available)."
            })
            
        # Rule 2: Deadline risk (<50% progress, <=3 days left)
        risky_tasks = []
        for t in emp_tasks:
            if t["status"] not in ["Completed", "Done"]:
                days = int(t["deadline_days_remaining"] or 0)
                prog = float(t["progress_percent"] or 0.0)
                if days <= DEADLINE_URGENCY_DAYS and prog < PROGRESS_RISK_THRESHOLD:
                    risky_tasks.append(f"'{t['task_title']}' ({int(prog)}% done, {days}d left)")
                    
        if risky_tasks:
            deadline_risk.append({
                "employee_id": emp_id,
                "employee_name": emp_name,
                "department": emp_dept,
                "value": f"{len(risky_tasks)} tasks",
                "description": f"Tasks near deadline with low progress: {', '.join(risky_tasks)}."
            })
            
        # Rule 3: Meeting Overload
        meeting_pct = (meeting_hours / avail * 100.0) if avail > 0 else 0.0
        if meeting_pct > MEETING_OVERLOAD_PCT:
            meeting_overload.append({
                "employee_id": emp_id,
                "employee_name": emp_name,
                "department": emp_dept,
                "value": f"{round(meeting_hours, 1)}h/wk",
                "description": f"Meetings consume {round(meeting_pct, 1)}% of weekly capacity ({round(meeting_hours, 1)}h meetings vs {avail}h available)."
            })
            
        # Rule 4: Available capacity (Low workload and has active tasks)
        if utilization < WORKLOAD_THRESHOLD_LOW:
            available_capacity.append({
                "employee_id": emp_id,
                "employee_name": emp_name,
                "department": emp_dept,
                "value": f"{round(utilization, 1)}%",
                "description": f"High available capacity at {round(utilization, 1)}% utilization ({round(avail - committed, 1)}h buffer remaining)."
            })
            
    return {
        "high_workload": high_workload,
        "deadline_risk": deadline_risk,
        "meeting_overload": meeting_overload,
        "available_capacity": available_capacity,
        "traceability": {
            "total_headcount": len(employees_list),
            "thresholds": {
                "high_workload_pct": WORKLOAD_THRESHOLD_HIGH,
                "low_workload_pct": WORKLOAD_THRESHOLD_LOW,
                "deadline_urgency_days": DEADLINE_URGENCY_DAYS,
                "progress_risk_pct": PROGRESS_RISK_THRESHOLD,
                "meeting_overload_pct": MEETING_OVERLOAD_PCT
            }
        }
    }


# ==================== AGENT 5: EMPLOYEE AI ASSISTANT ====================
def answer_employee_question(employee_id, question, employees_df, tasks_df, meetings_df):
    """
    Answers workload and prioritization queries dynamically for individual staff.
    """
    match = employees_df[employees_df["employee_id"] == employee_id]
    if match.empty:
        return {"response": "Employee ID not found."}
        
    emp = match.iloc[0].to_dict()
    emp_tasks = tasks_df[tasks_df["employee_id"] == employee_id].to_dict(orient="records")
    emp_meetings = meetings_df[meetings_df["employee_id"] == employee_id].to_dict(orient="records")
    
    q = question.lower()
    
    # Question 1: Prioritization
    if "prioritize" in q or "priority" in q or "do today" in q:
        open_tasks = [t for t in emp_tasks if t["status"] not in ["Completed", "Done"]]
        if not open_tasks:
            return {
                "response": "You have no pending tasks today. Enjoy your Focus Block or check in with your manager for new projects!",
                "traceability": {"open_tasks_count": 0}
            }
            
        scored_tasks = []
        for t in open_tasks:
            p_val = 3.0 if t["priority"] == "High" else (2.0 if t["priority"] == "Medium" else 1.0)
            c_val = 3.0 if t["task_complexity"] == "High" else (2.0 if t["task_complexity"] == "Medium" else 1.0)
            days = max(0, int(t["deadline_days_remaining"] or 0))
            
            # Scoring: Priority*5 + (10 - Days)*3 + Complexity*2
            priority_part = p_val * 5.0
            deadline_part = max(0.0, (10.0 - days)) * 3.0
            complexity_part = c_val * 2.0
            total_score = priority_part + deadline_part + complexity_part
            
            scored_tasks.append({
                "task": t,
                "score": total_score,
                "breakdown": {
                    "priority_component": priority_part,
                    "deadline_component": deadline_part,
                    "complexity_component": complexity_part
                }
            })
            
        # Select highest score
        scored_tasks.sort(key=lambda x: -x["score"])
        top = scored_tasks[0]
        top_task = top["task"]
        
        response = (
            f"I recommend prioritizing the task: '{top_task['task_title']}'. "
            f"Under the priority scoring matrix, this task scored {top['score']:.1f} points "
            f"(Priority component: {top['breakdown']['priority_component']:.1f} based on '{top_task['priority']}' priority; "
            f"Deadline component: {top['breakdown']['deadline_component']:.1f} based on {top_task['deadline_days_remaining']} days remaining; "
            f"Complexity component: {top['breakdown']['complexity_component']:.1f} based on '{top_task['task_complexity']}' complexity). "
            f"Focus on clearing this first before attending to lower priority activities."
        )
        
        return {
            "response": response,
            "traceability": {
                "evaluated_tasks_count": len(open_tasks),
                "top_task_id": top_task["task_id"],
                "score": top["score"],
                "formula": "Score = Priority*5 + Max(0, 10-Deadline)*3 + Complexity*2",
                "breakdown": top["breakdown"]
            }
        }
        
    # Question 2: Overload
    elif "overloaded" in q or "burnout" in q or "workload" in q:
        analysis = analyze_workload(employee_id, emp, emp_tasks, emp_meetings)
        utilization = analysis["utilization_percent"]
        risk = analysis["workload_risk"]
        committed = analysis["traceability"]["total_committed"]
        avail = analysis["traceability"]["available_hours"]
        active_task_hours = analysis["traceability"]["active_task_hours"]
        meeting_hours = analysis["traceability"]["meeting_hours"]
        
        response = (
            f"Your current workload utilization is calculated at {utilization}% (representing {committed} hours of effort out of {avail} hours available this week). "
            f"This is classified as a {risk} workload risk. "
            f"This score is compiled from {active_task_hours} hours of active project tasks and {meeting_hours} hours of scheduled meetings."
        )
        if risk == "High":
            response += " I recommend scheduling a focus block or asking to reschedule lower-priority meetings to reduce stress."
            
        return {
            "response": response,
            "traceability": analysis["traceability"]
        }
        
    else:
        return {
            "response": "I can't help with that — please ask me something about your work, like your workload or task priorities.",
            "traceability": {
                "out_of_scope": True
            }
        }
