/**
 * SustWork AI - Client-side AI Agent Layer
 * Translates and implements the logic of agents.py to run natively in the browser.
 */

// Configuration thresholds corresponding to backend variables
export const AI_CONFIG = {
    WORKLOAD_THRESHOLD_LOW: 80.0,
    WORKLOAD_THRESHOLD_HIGH: 110.0,
    MEETING_OVERLOAD_PCT: 30.0,
    DEADLINE_URGENCY_DAYS: 3,
    PROGRESS_RISK_THRESHOLD: 50.0
};

export function cleanName(name) {
    if (!name) return "";
    return name.replace(/_/g, " ");
}

/**
 * Agent 1: Workload Analysis
 * Computes workload utilization percentage dynamically.
 */
export function analyzeWorkload(employeeId, employeeRow, empTasks, empMeetings) {
    const activeTasks = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done');
    const activeTaskHours = activeTasks.reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0.0), 0.0);
    const meetingHours = empMeetings.reduce((sum, m) => sum + (parseFloat(m.duration_minutes) || 0.0) / 60.0, 0.0);
    
    const availableHours = parseFloat(employeeRow.available_hours_per_week) || 40.0;
    const totalCommitted = activeTaskHours + meetingHours;
    const utilization = availableHours > 0 ? (totalCommitted / availableHours) * 100.0 : 0.0;
    
    let risk = "Low";
    if (utilization > AI_CONFIG.WORKLOAD_THRESHOLD_HIGH) {
        risk = "High";
    } else if (utilization >= AI_CONFIG.WORKLOAD_THRESHOLD_LOW) {
        risk = "Medium";
    }
    
    const overdueTasks = activeTasks.filter(t => (parseInt(t.deadline_days_remaining) || 0) <= 0);
    const highPriority = activeTasks.filter(t => t.priority === 'High');
    
    const traceability = {
        employee_id: employeeId,
        active_task_count: activeTasks.length,
        active_task_hours: activeTaskHours,
        meeting_count: empMeetings.length,
        meeting_hours: Math.round(meetingHours * 100) / 100,
        available_hours: availableHours,
        total_committed: Math.round(totalCommitted * 100) / 100,
        utilization_percent: Math.round(utilization * 100) / 100,
        workload_risk: risk,
        overdue_tasks: overdueTasks.length,
        high_priority_tasks: highPriority.length,
        thresholds: {
            low: AI_CONFIG.WORKLOAD_THRESHOLD_LOW,
            high: AI_CONFIG.WORKLOAD_THRESHOLD_HIGH
        }
    };
    
    const words = [];
    words.push(`Workload utilization is currently at ${Math.round(utilization * 10) / 10}% (${Math.round(totalCommitted * 10) / 10} hours committed out of ${availableHours} available).`);
    
    if (risk === "High") {
        words.push(`This is classified as High workload risk. The employee has ${activeTasks.length} active tasks requiring ${activeTaskHours} hours of effort, alongside ${Math.round(meetingHours * 10) / 10} hours of scheduled meetings.`);
        if (overdueTasks.length > 0) {
            words.push(`Additionally, ${overdueTasks.length} tasks are already past their deadline, creating further bottleneck pressure.`);
        } else {
            words.push("No active tasks are currently overdue, but the schedule remains saturated.");
        }
    } else if (risk === "Medium") {
        words.push(`This indicates a balanced Medium workload. Active tasks (${activeTasks.length}) account for ${activeTaskHours} hours, and meetings require ${Math.round(meetingHours * 10) / 10} hours.`);
        if (overdueTasks.length > 0) {
            words.push(`However, attention is required for ${overdueTasks.length} overdue tasks.`);
        }
    } else {
        words.push(`This shows Low workload risk with surplus capacity of ${Math.round(Math.max(0.0, availableHours - totalCommitted) * 10) / 10} hours. The employee has ${activeTasks.length} active tasks and ${Math.round(meetingHours * 10) / 10} meeting hours.`);
    }
    
    const aiRecommendation = words.join(" ");
    
    return {
        utilization_percent: Math.round(utilization * 10) / 10,
        workload_risk: risk,
        ai_recommendation: aiRecommendation,
        traceability: traceability
    };
}

/**
 * Agent 2: Task Assignment Recommendation
 * Ranks candidates for a new task based on skill, workload, and capacity.
 */
export function recommendTaskAssignment(taskDetails, employeesList, tasksList, meetingsList) {
    const taskSkill = (taskDetails.required_skill || "").trim().toLowerCase();
    const taskHours = parseFloat(taskDetails.estimated_hours) || 8.0;
    
    const candidates = [];
    
    for (const emp of employeesList) {
        const empId = emp.employee_id;
        const empPrimary = (emp.primary_skill || "").trim().toLowerCase();
        const empDept = emp.department || "";
        
        let extraSkills = [];
        if (empDept === 'Engineering') {
            extraSkills = ["code review", "data structures", "system design", "git workflow"];
        } else if (empDept === 'Design') {
            extraSkills = ["ui prototyping", "design system", "visual identity", "typography"];
        } else if (empDept === 'Product') {
            extraSkills = ["user stories", "roadmapping", "product analytics", "market fit"];
        } else if (empDept === 'Marketing') {
            extraSkills = ["seo analytics", "campaign planning", "copywriting", "growth hacks"];
        } else if (empDept === 'Data Science') {
            extraSkills = ["python model", "sql queries", "statistical analysis", "tableau charts"];
        }
        
        const isPrimaryMatch = empPrimary.includes(taskSkill);
        const isInferredMatch = !isPrimaryMatch && extraSkills.some(s => s.includes(taskSkill));
        const hasSkill = isPrimaryMatch || isInferredMatch;
        
        const empTasks = tasksList.filter(t => t.employee_id === empId);
        const empMeetings = meetingsList.filter(m => m.employee_id === empId);
        
        const analysis = analyzeWorkload(empId, emp, empTasks, empMeetings);
        const utilization = analysis.utilization_percent;
        const committed = analysis.traceability.total_committed;
        const available = analysis.traceability.available_hours;
        const capacity = Math.max(0.0, available - committed);
        
        let skillScore = 0;
        if (isPrimaryMatch) {
            skillScore = 1000;
        } else if (isInferredMatch) {
            skillScore = 300;
        }
        
        let score = skillScore + (100.0 - utilization) * 2.0;
        if (utilization > AI_CONFIG.WORKLOAD_THRESHOLD_HIGH) {
            score -= 500;
        }
        
        const reasonParts = [];
        reasonParts.push(`Current workload is ${utilization}% with ${Math.round(capacity * 10) / 10}h of remaining capacity.`);
        if (isPrimaryMatch) {
            reasonParts.push(`Confirmed match for primary skill '${emp.primary_skill}'.`);
        } else if (isInferredMatch) {
            reasonParts.push(`Inferred match for skill '${taskDetails.required_skill}' (based on ${empDept} department context).`);
        } else {
            reasonParts.push("Does not match required skill.");
        }
        
        if (utilization > AI_CONFIG.WORKLOAD_THRESHOLD_HIGH) {
            reasonParts.push("Warning: Employee is already overloaded; assigning additional tasks may increase burnout risk.");
        } else if (capacity >= taskHours) {
            reasonParts.push(`Has sufficient capacity to accommodate this ${taskHours}-hour task.`);
        } else {
            reasonParts.push(`Insufficient capacity (${Math.round(capacity * 10) / 10}h available vs ${taskHours}h required).`);
        }
        
        const reasoning = reasonParts.join(" ");
        
        candidates.push({
            employee_id: empId,
            employee_name: cleanName(emp.employee_name),
            department: empDept,
            role: emp.role,
            utilization_percent: utilization,
            remaining_capacity: Math.round(capacity * 10) / 10,
            has_skill: hasSkill,
            match_type: isPrimaryMatch ? "Primary Skill Match" : (isInferredMatch ? "Inferred Dept Skill Match" : "No Skill Match"),
            suitability_score: Math.round(score * 100) / 100,
            reasoning: reasoning,
            traceability: {
                is_primary_match: isPrimaryMatch,
                is_inferred_match: isInferredMatch,
                utilization_percent: utilization,
                remaining_capacity: Math.round(capacity * 10) / 10,
                required_hours: taskHours,
                calculated_score: Math.round(score * 100) / 100
            }
        });
    }
    
    // Sort matches: primary match first, then inferred, then score
    candidates.sort((a, b) => {
        const typeA = a.match_type === 'Primary Skill Match' ? 2 : (a.match_type === 'Inferred Dept Skill Match' ? 1 : 0);
        const typeB = b.match_type === 'Primary Skill Match' ? 2 : (b.match_type === 'Inferred Dept Skill Match' ? 1 : 0);
        if (typeB !== typeA) return typeB - typeA;
        return b.suitability_score - a.suitability_score;
    });
    
    return candidates.slice(0, 5);
}

/**
 * Agent 3: Progress Summary snapshot
 * Aggregates live snapshots without dates.
 */
export function generateWeeklySummary(department, employeesList, tasksList, meetingsList) {
    const deptEmps = department 
        ? employeesList.filter(emp => emp.department === department)
        : employeesList;
        
    const empIds = new Set(deptEmps.map(emp => emp.employee_id));
    
    const deptTasks = tasksList.filter(t => empIds.has(t.employee_id));
    const deptMeetings = meetingsList.filter(m => empIds.has(m.employee_id));
    
    const totalTasks = deptTasks.length;
    const completedTasks = deptTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
    const inProgressTasks = deptTasks.filter(t => t.status === 'In Progress').length;
    const overdueTasks = deptTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done' && (parseInt(t.deadline_days_remaining) || 0) <= 0).length;
    
    const compPct = totalTasks > 0 ? (completedTasks / totalTasks * 100.0) : 0.0;
    
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    let totalMeetingHours = 0.0;
    
    for (const emp of deptEmps) {
        const empId = emp.employee_id;
        const eTasks = deptTasks.filter(t => t.employee_id === empId);
        const eMeetings = deptMeetings.filter(m => m.employee_id === empId);
        
        const analysis = analyzeWorkload(empId, emp, eTasks, eMeetings);
        const risk = analysis.workload_risk;
        
        if (risk === "High") {
            highRiskCount++;
        } else if (risk === "Medium") {
            mediumRiskCount++;
        } else {
            lowRiskCount++;
        }
        
        const mHrs = eMeetings.reduce((sum, m) => sum + (parseFloat(m.duration_minutes) || 0) / 60.0, 0.0);
        totalMeetingHours += mHrs;
    }
    
    const sentences = [];
    const deptLabel = department ? `the ${department} department` : "the organization";
    
    sentences.push(
        `Within ${deptLabel}, we are currently tracking ${totalTasks} active tasks across all personnel. ` +
        `The current milestone completion rate is ${Math.round(compPct * 10) / 10}% (${completedTasks} completed tasks out of ${totalTasks} total). ` +
        `We have identified ${overdueTasks} overdue tasks requiring immediate prioritization.`
    );
    
    sentences.push(
        `A workload risk scan flags ${highRiskCount} employees at High workload risk (utilization > 110%) and ${mediumRiskCount} at Medium workload risk. ` +
        `Total meeting commitment for this group stands at ${Math.round(totalMeetingHours * 10) / 10} hours.`
    );
    
    sentences.push(
        "Note: Historical trend analysis and week-over-week comparisons are unavailable as the active dataset does not contain calendar timestamps."
    );
    
    const summaryText = sentences.join(" ");
    
    return {
        summary: summaryText,
        traceability: {
            department: department,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            in_progress_tasks: inProgressTasks,
            overdue_tasks: overdueTasks,
            completion_rate_percent: Math.round(compPct * 100) / 100,
            high_risk_count: highRiskCount,
            medium_risk_count: mediumRiskCount,
            low_risk_count: lowRiskCount,
            total_meeting_hours: Math.round(totalMeetingHours * 100) / 100,
            trend_analysis_status: "Unsupported (No dates in dataset)"
        }
    };
}

/**
 * Agent 4: Early Warning Alerts
 * Scans employees and assigns alert classifications.
 */
export function getEarlyWarningAlerts(employeesList, tasksList, meetingsList) {
    const highWorkload = [];
    const deadlineRisk = [];
    const meetingOverload = [];
    const availableCapacity = [];
    
    for (const emp of employeesList) {
        const empId = emp.employee_id;
        const empName = cleanName(emp.employee_name);
        const empDept = emp.department;
        
        const empTasks = tasksList.filter(t => t.employee_id === empId);
        const empMeetings = meetingsList.filter(m => m.employee_id === empId);
        
        const analysis = analyzeWorkload(empId, emp, empTasks, empMeetings);
        const utilization = analysis.utilization_percent;
        const committed = analysis.traceability.total_committed;
        const avail = analysis.traceability.available_hours;
        const meetingHours = analysis.traceability.meeting_hours;
        
        // Rule 1: High Workload
        if (utilization > AI_CONFIG.WORKLOAD_THRESHOLD_HIGH) {
            highWorkload.push({
                employee_id: empId,
                employee_name: empName,
                department: empDept,
                value: `${Math.round(utilization * 10) / 10}%`,
                description: `Workload utilization is overloaded at ${Math.round(utilization * 10) / 10}% (${Math.round(committed * 10) / 10}h committed vs {avail}h available).`
            });
        }
        
        // Rule 2: Deadline Risk
        const riskyTasks = [];
        for (const t of empTasks) {
            if (t.status !== 'Completed' && t.status !== 'Done') {
                const days = parseInt(t.deadline_days_remaining) || 0;
                const prog = parseFloat(t.progress_percent) || 0.0;
                if (days <= AI_CONFIG.DEADLINE_URGENCY_DAYS && prog < AI_CONFIG.PROGRESS_RISK_THRESHOLD) {
                    riskyTasks.push(`'${t.task_title}' (${Math.round(prog)}% done, ${days}d left)`);
                }
            }
        }
        
        if (riskyTasks.length > 0) {
            deadlineRisk.push({
                employee_id: empId,
                employee_name: empName,
                department: empDept,
                value: `${riskyTasks.length} tasks`,
                description: `Tasks near deadline with low progress: ${riskyTasks.join(", ")}.`
            });
        }
        
        // Rule 3: Meeting Overload
        const meetingPct = avail > 0 ? (meetingHours / avail * 100.0) : 0.0;
        if (meetingPct > AI_CONFIG.MEETING_OVERLOAD_PCT) {
            meetingOverload.push({
                employee_id: empId,
                employee_name: empName,
                department: empDept,
                value: `${Math.round(meetingHours * 10) / 10}h/wk`,
                description: `Meetings consume ${Math.round(meetingPct * 10) / 10}% of weekly capacity (${Math.round(meetingHours * 10) / 10}h meetings vs ${avail}h available).`
            });
        }
        
        // Rule 4: Available capacity
        if (utilization < AI_CONFIG.WORKLOAD_THRESHOLD_LOW) {
            availableCapacity.push({
                employee_id: empId,
                employee_name: empName,
                department: empDept,
                value: `${Math.round(utilization * 10) / 10}%`,
                description: `High available capacity at ${Math.round(utilization * 10) / 10}% utilization (${Math.round((avail - committed) * 10) / 10}h buffer remaining).`
            });
        }
    }
    
    return {
        high_workload: highWorkload,
        deadline_risk: deadlineRisk,
        meeting_overload: meetingOverload,
        available_capacity: availableCapacity,
        traceability: {
            total_headcount: employeesList.length,
            thresholds: {
                high_workload_pct: AI_CONFIG.WORKLOAD_THRESHOLD_HIGH,
                low_workload_pct: AI_CONFIG.WORKLOAD_THRESHOLD_LOW,
                deadline_urgency_days: AI_CONFIG.DEADLINE_URGENCY_DAYS,
                progress_risk_pct: AI_CONFIG.PROGRESS_RISK_THRESHOLD,
                meeting_overload_pct: AI_CONFIG.MEETING_OVERLOAD_PCT
            }
        }
    };
}

/**
 * Agent 5: Employee Assistant Q&A
 * Answers staff questions based on matching triggers.
 */
export function answerEmployeeQuestion(employeeId, question, employeesList, tasksList, meetingsList) {
    const emp = employeesList.find(e => e.employee_id === employeeId);
    if (!emp) {
        return { response: "Employee ID not found." };
    }
    
    const empTasks = tasksList.filter(t => t.employee_id === employeeId);
    const empMeetings = meetingsList.filter(m => m.employee_id === employeeId);
    
    const q = question.toLowerCase();
    
    // Analyze Workload variables helper
    const workloadAnalysis = analyzeWorkload(employeeId, emp, empTasks, empMeetings);
    const utilization = workloadAnalysis.utilization_percent;
    const risk = workloadAnalysis.workload_risk;
    const committed = workloadAnalysis.traceability.total_committed;
    const avail = workloadAnalysis.traceability.available_hours;
    const activeTaskHours = workloadAnalysis.traceability.active_task_hours;
    const meetingHours = workloadAnalysis.traceability.meeting_hours;

    // 1. PRIORITIZE / FOCUS TODAY (what should I prioritize today? what do I need to work on today? what should I do first?)
    if (
        q.includes("prioritize") || 
        q.includes("priority") || 
        q.includes("do today") || 
        q.includes("work on today") || 
        q.includes("do first") || 
        q.includes("concentrate on today")
    ) {
        const openTasks = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done');
        if (openTasks.length === 0) {
            return {
                response: "You have no pending tasks today. Enjoy your Focus Block or check in with your manager for new projects!",
                traceability: { 
                    score: 0,
                    evaluated_tasks_count: 0,
                    formula: "Score = Priority*5 + Max(0, 10-Deadline)*3 + Complexity*2",
                    breakdown: { priority_component: 0, deadline_component: 0, complexity_component: 0 },
                    utilization_percent: utilization,
                    active_task_hours: activeTaskHours,
                    meeting_hours: meetingHours
                }
            };
        }
        
        const scoredTasks = [];
        for (const t of openTasks) {
            const pVal = t.priority === "High" ? 3.0 : (t.priority === "Medium" ? 2.0 : 1.0);
            const cVal = t.task_complexity === "High" ? 3.0 : (t.task_complexity === "Medium" ? 2.0 : 1.0);
            const days = Math.max(0, parseInt(t.deadline_days_remaining) || 0);
            
            const priorityPart = pVal * 5.0;
            const deadlinePart = Math.max(0.0, (10.0 - days)) * 3.0;
            const complexityPart = cVal * 2.0;
            const totalScore = priorityPart + deadlinePart + complexityPart;
            
            scoredTasks.push({
                task: t,
                score: totalScore,
                breakdown: {
                    priority_component: priorityPart,
                    deadline_component: deadlinePart,
                    complexity_component: complexityPart
                }
            });
        }
        
        scoredTasks.sort((a, b) => b.score - a.score);
        const top = scoredTasks[0];
        const topTask = top.task;
        
        let response = `Your top priority today is '${topTask.task_title}' (${topTask.task_id}), because it is currently active, has ${topTask.deadline_days_remaining} days remaining, and is classified as ${topTask.priority} priority.`;
        if (scoredTasks.length > 1) {
            const nextTasks = scoredTasks.slice(1, 3).map(st => `'${st.task.task_title}' (${st.task.task_id})`);
            response += ` After that, focus on: ${nextTasks.join(', ')}.`;
        } else {
            response += ` This is the only pending task on your checklist.`;
        }
            
        return {
            response: response,
            traceability: {
                evaluated_tasks_count: openTasks.length,
                top_task_id: topTask.task_id,
                score: top.score,
                formula: "Score = Priority*5 + Max(0, 10-Deadline)*3 + Complexity*2",
                breakdown: top.breakdown,
                utilization_percent: utilization,
                active_task_hours: activeTaskHours,
                meeting_hours: meetingHours
            }
        };
    } 
    
    // 2. OVERLOADED (am I overloaded? am I too busy? do I have too much work?)
    else if (
        q.includes("overloaded") || 
        q.includes("burnout") || 
        q.includes("too busy") || 
        q.includes("too much work") || 
        q.includes("overload")
    ) {
        let response = `Your current workload utilization is ${utilization}%, which is in the ${risk.toLowerCase()} risk range. You have ${empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done').length} active task(s) requiring attention and upcoming meetings contributing approximately ${meetingHours.toFixed(1)} hours.`;
        
        if (risk === "High") {
            response += " Your workload indicates high workload density. I recommend scheduling a focus block or asking to reschedule lower-priority meetings to reduce burnout risk.";
        } else {
            response += " Your workload does not currently indicate severe overload, but the overdue items or high-priority tasks should be addressed first.";
        }
        
        return {
            response: response,
            traceability: {
                utilization_percent: utilization,
                active_task_hours: activeTaskHours,
                meeting_hours: meetingHours,
                total_committed: committed,
                available_hours: avail
            }
        };
    } 
    
    // 3. DEADLINES (which deadlines need attention? what deadlines are coming up? deadlines)
    else if (
        q.includes("deadline") || 
        q.includes("deadlines") || 
        q.includes("due soon")
    ) {
        const activeTasks = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done');
        const overdue = activeTasks.filter(t => (parseInt(t.deadline_days_remaining) || 0) <= 0);
        const upcoming = activeTasks.filter(t => {
            const days = parseInt(t.deadline_days_remaining) || 0;
            return days > 0 && days <= 5;
        });

        let response = "";
        if (overdue.length > 0) {
            response += `You have ${overdue.length} overdue task(s) requiring IMMEDIATE attention: ` +
                overdue.map(t => `'${t.task_title}' (${t.task_id}, Past Due)`).join(', ') + ". ";
        } else {
            response += "You have no overdue tasks at the moment. ";
        }

        if (upcoming.length > 0) {
            response += `You also have ${upcoming.length} upcoming deadline(s) this week: ` +
                upcoming.map(t => `'${t.task_title}' (${t.task_id}, due in ${t.deadline_days_remaining} days)`).join(', ') + ".";
        } else {
            response += "No other major deadlines are approaching within the next 5 days.";
        }

        return {
            response: response,
            traceability: {
                evaluated_tasks_count: activeTasks.length,
                overdue_count: overdue.length,
                upcoming_count: upcoming.length,
                utilization_percent: utilization,
                active_task_hours: activeTaskHours,
                meeting_hours: meetingHours
            }
        };
    } 
    
    // 4. HOW IS MY WORKLOAD (how is my workload? workload)
    else if (
        q.includes("workload") || 
        q.includes("how is my work") || 
        q.includes("work load")
    ) {
        let response = `Your current workload is ${utilization}% (${committed} hours committed out of ${avail} hours available this week). This is classified as a ${risk.toLowerCase()} workload risk. You have ${activeTaskHours} hours of active tasks and ${meetingHours.toFixed(1)} hours of scheduled meetings.`;
        if (risk === "High") {
            response += " This suggests high congestion. Consider deferring non-urgent backlog streams.";
        } else {
            response += " This represents a healthy, manageable focus balance.";
        }

        return {
            response: response,
            traceability: {
                utilization_percent: utilization,
                active_task_hours: activeTaskHours,
                meeting_hours: meetingHours,
                total_committed: committed,
                available_hours: avail
            }
        };
    } 
    
    // 5. FOCUS THIS WEEK (what should I focus this week? what should I concentrate on this week? focus this week)
    else if (
        q.includes("focus") || 
        q.includes("concentrate on this week") || 
        q.includes("this week")
    ) {
        const activeTasks = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done');
        if (activeTasks.length === 0) {
            return {
                response: "You have no active tasks this week. Use this capacity for professional training, review past projects, or synchronize with the team.",
                traceability: {
                    evaluated_tasks_count: 0,
                    utilization_percent: utilization,
                    active_task_hours: activeTaskHours,
                    meeting_hours: meetingHours
                }
            };
        }

        // Score them by priority and deadline urgency
        const scoredTasks = activeTasks.map(t => {
            const pVal = t.priority === "High" ? 3.0 : (t.priority === "Medium" ? 2.0 : 1.0);
            const days = Math.max(0, parseInt(t.deadline_days_remaining) || 0);
            const score = pVal * 5.0 + Math.max(0, 10 - days) * 3.0;
            return { task: t, score };
        }).sort((a, b) => b.score - a.score);

        const focusList = scoredTasks.slice(0, 3).map((st, idx) => {
            const t = st.task;
            return `${idx + 1}. '${t.task_title}' (${t.task_id}) - Priority: ${t.priority}, due in ${t.deadline_days_remaining} days.`;
        });

        const response = `Here is the ranked list of tasks you should focus on this week:\n\n` +
            focusList.join('\n') + `\n\nThese priorities were chosen based on deadline urgency and baseline priority levels. You also have ${meetingHours.toFixed(1)} hours of meetings scheduled this week.`;

        return {
            response: response,
            traceability: {
                score: scoredTasks[0]?.score || 0,
                evaluated_tasks_count: activeTasks.length,
                utilization_percent: utilization,
                active_task_hours: activeTaskHours,
                meeting_hours: meetingHours
            }
        };
    } 
    
    // FALLBACK
    else {
        return {
            response: "I can't help with that — please ask me something about your work, like your workload or task priorities.",
            traceability: {
                out_of_scope: true,
                utilization_percent: utilization,
                active_task_hours: activeTaskHours,
                meeting_hours: meetingHours
            }
        };
    }
}
