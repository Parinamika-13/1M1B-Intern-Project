/**
 * SustWork AI - Client Data Service Layer
 * Fully migrated from Flask REST backend to Cloud Firestore.
 * Caches documents in memory after initial fetch to optimize Firestore quota usage.
 */

import { 
    collection, 
    getDocs, 
    getDoc, 
    doc, 
    updateDoc, 
    query, 
    where, 
    limit,
    writeBatch,
    addDoc,
    deleteDoc,
    serverTimestamp
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { 
    analyzeWorkload, 
    recommendTaskAssignment, 
    generateWeeklySummary, 
    getEarlyWarningAlerts, 
    answerEmployeeQuestion, 
    AI_CONFIG,
    cleanName
} from "./aiAgents";

// Memory cache state for database records
let cache = {
    employees: null,
    projects: null,
    tasks: null,
    meetings: null,
    lastFetch: 0
};

// Ensures collections are loaded in memory and up-to-date
async function ensureCache(force = false) {
    const now = Date.now();
    // Cache remains valid for 30 seconds unless force-refreshed
    if (force || !cache.employees || (now - cache.lastFetch > 30000)) {
        try {
            const [empSnap, projSnap, taskSnap, meetSnap] = await Promise.all([
                getDocs(collection(db, "employees")),
                getDocs(collection(db, "projects")),
                getDocs(collection(db, "tasks")),
                getDocs(collection(db, "meetings"))
            ]);

            cache.employees = empSnap.docs.map(d => d.data());
            cache.projects = projSnap.docs.map(d => d.data());
            cache.tasks = taskSnap.docs.map(d => d.data());
            cache.meetings = meetSnap.docs.map(d => d.data());
            cache.lastFetch = now;
        } catch (err) {
            console.error("Failed to fetch Firestore collections for cache:", err);
            throw new Error(`Firestore unavailable: ${err.message}`);
        }
    }
}

export const apiService = {
    // Check if Firestore collections are empty to trigger migration UI
    async isDatabaseEmpty() {
        try {
            const snap = await getDocs(query(collection(db, "employees"), limit(1)));
            return snap.empty;
        } catch (e) {
            console.error("Failed to verify if employees database is empty:", e);
            return true;
        }
    },

    // Migrates local JSON files to Firestore in batches
    async migrateExcelDataToFirestore(progressCallback) {
        progressCallback("Reading initial dataset records...");
        
        const employees = (await import('../data/employees.json')).default;
        const projects = (await import('../data/projects.json')).default;
        const tasks = (await import('../data/tasks.json')).default;
        const meetings = (await import('../data/meetings.json')).default;

        const migrateColl = async (collName, list, idKey) => {
            progressCallback(`Migrating ${collName} collection (${list.length} records)...`);
            let count = 0;
            let batch = writeBatch(db);

            for (const item of list) {
                const docId = String(item[idKey]);
                const docRef = doc(db, collName, docId);
                batch.set(docRef, item);
                count++;

                if (count % 500 === 0 || count === list.length) {
                    progressCallback(`Uploading batch to '${collName}' (${count}/${list.length})...`);
                    await batch.commit();
                    batch = writeBatch(db);
                }
            }
        };

        await migrateColl("employees", employees, "employee_id");
        await migrateColl("projects", projects, "project_id");
        await migrateColl("tasks", tasks, "task_id");
        await migrateColl("meetings", meetings, "meeting_id");

        progressCallback("Syncing database memory cache...");
        await ensureCache(true);
    },

    async getDemoAccounts() {
        try {
            const snapshot = await getDocs(query(collection(db, "users"), where("demo", "==", true)));
            return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        } catch (err) {
            console.error("Failed to query demo accounts:", err);
            throw err;
        }
    },

    async getStats() {
        await ensureCache();
        
        const employeesCount = cache.employees.length;
        const projectsCount = cache.projects.length;
        
        let totalCompleted = 0;
        let totalPending = 0;
        let totalOverdue = 0;
        let sumUtilization = 0;
        let sumSatisfaction = 0;
        let sumMeetingHours = 0;
        let sumCompletionRate = 0;
        
        const riskDistribution = { Low: 0, Medium: 0, High: 0 };
        
        for (const emp of cache.employees) {
            const empId = emp.employee_id;
            const empTasks = cache.tasks.filter(t => t.employee_id === empId);
            const empMeetings = cache.meetings.filter(m => m.employee_id === empId);
            const analysis = analyzeWorkload(empId, emp, empTasks, empMeetings);
            
            const utilization = analysis.utilization_percent;
            const risk = analysis.workload_risk;
            
            sumSatisfaction += parseFloat(emp.employee_satisfaction_score) || 8.0;
            const mHrs = analysis.traceability.meeting_hours;
            sumMeetingHours += mHrs;
            
            const tTotal = empTasks.length;
            const tCompleted = empTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
            const tPending = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done').length;
            const tOverdue = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done' && (parseInt(t.deadline_days_remaining) || 0) <= 0).length;
            
            totalCompleted += tCompleted;
            totalPending += tPending;
            totalOverdue += tOverdue;
            
            sumUtilization += utilization;
            riskDistribution[risk] = (riskDistribution[risk] || 0) + 1;
            
            const rate = tTotal > 0 ? (tCompleted / tTotal * 100.0) : 0.0;
            sumCompletionRate += rate;
        }
        
        return {
            employees_count: employeesCount,
            projects_count: projectsCount,
            completed_tasks: totalCompleted,
            pending_tasks: totalPending,
            overdue_tasks: totalOverdue,
            avg_workload_percent: employeesCount > 0 ? Math.round((sumUtilization / employeesCount) * 10) / 10 : 0.0,
            avg_satisfaction: employeesCount > 0 ? Math.round((sumSatisfaction / employeesCount) * 10) / 10 : 0.0,
            avg_meeting_hours_weekly: employeesCount > 0 ? Math.round((sumMeetingHours / employeesCount) * 10) / 10 : 0.0,
            avg_completion_rate_percent: employeesCount > 0 ? Math.round((sumCompletionRate / employeesCount) * 10) / 10 : 0.0,
            risk_distribution: riskDistribution
        };
    },

    async getEmployees({ search = '', department = '', risk = '' } = {}) {
        await ensureCache();
        
        let results = cache.employees.map(emp => {
            const empId = emp.employee_id;
            const empTasks = cache.tasks.filter(t => t.employee_id === empId);
            const empMeetings = cache.meetings.filter(m => m.employee_id === empId);
            const analysis = analyzeWorkload(empId, emp, empTasks, empMeetings);
            
            const completed = empTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
            const total = empTasks.length;
            
            return {
                ...emp,
                employee_name: cleanName(emp.employee_name),
                utilization_percent: analysis.utilization_percent,
                workload_risk: analysis.workload_risk,
                completed_tasks: completed,
                total_tasks: total
            };
        });
        
        if (search) {
            const s = search.toLowerCase();
            results = results.filter(e => e.employee_name.toLowerCase().includes(s) || e.employee_id.toLowerCase().includes(s));
        }
        
        if (department) {
            results = results.filter(e => e.department === department);
        }
        
        if (risk) {
            results = results.filter(e => e.workload_risk === risk);
        }
        
        return results;
    },

    async getEmployeeDetails(employeeId) {
        await ensureCache();
        const emp = cache.employees.find(e => e.employee_id === employeeId);
        if (!emp) {
            throw new Error(`Employee with ID ${employeeId} not found.`);
        }
        
        const empTasks = cache.tasks.filter(t => t.employee_id === employeeId);
        const empMeetings = cache.meetings.filter(m => m.employee_id === employeeId);
        const analysis = analyzeWorkload(employeeId, emp, empTasks, empMeetings);
        
        let supplementarySkills = [];
        if (emp.department === 'Engineering') {
            supplementarySkills = ["code review", "data structures", "system design", "git workflow"];
        } else if (emp.department === 'Design') {
            supplementarySkills = ["ui prototyping", "design system", "visual identity", "typography"];
        } else if (emp.department === 'Product') {
            supplementarySkills = ["user stories", "roadmapping", "product analytics", "market fit"];
        } else if (emp.department === 'Marketing') {
            supplementarySkills = ["seo analytics", "campaign planning", "copywriting", "growth hacks"];
        } else if (emp.department === 'Data Science') {
            supplementarySkills = ["python model", "sql queries", "statistical analysis", "tableau charts"];
        }
        
        const completed = empTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
        const pending = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done').length;
        const inProgress = empTasks.filter(t => t.status === 'In Progress').length;
        const overdue = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done' && (parseInt(t.deadline_days_remaining) || 0) <= 0).length;
        const total = empTasks.length;
        const meetingHours = empMeetings.reduce((sum, m) => sum + (parseFloat(m.duration_minutes) || 0) / 60.0, 0.0);
        
        return {
            ...emp,
            employee_name: cleanName(emp.employee_name),
            utilization_percent: analysis.utilization_percent,
            workload_risk: analysis.workload_risk,
            ai_recommendation: analysis.ai_recommendation,
            traceability: analysis.traceability,
            completed_tasks: completed,
            pending_tasks: pending,
            in_progress_tasks: inProgress,
            overdue_tasks: overdue,
            total_tasks: total,
            meeting_hours: meetingHours,
            leave_days_this_month: emp.leave_days_this_month || 0,
            experience_years: emp.experience_years || 0,
            work_mode: emp.work_mode || "—",
            remote_days_per_week: emp.remote_days_per_week || 0,
            employee_satisfaction_score: parseFloat(emp.employee_satisfaction_score) || 8.0,
            available_hours_per_week: parseFloat(emp.available_hours_per_week) || 40.0,
            primary_skill: emp.primary_skill || "—",
            skill_level: emp.skill_level || "—",
            supplementary_skills: supplementarySkills,
            tasks: empTasks,
            meetings: empMeetings
        };
    },

    async getEmployeeDashboard(employeeId) {
        await ensureCache();
        const emp = cache.employees.find(e => e.employee_id === employeeId);
        if (!emp) {
            throw new Error(`Employee with ID ${employeeId} not found.`);
        }
        
        const empTasks = cache.tasks.filter(t => t.employee_id === employeeId);
        const empMeetings = cache.meetings.filter(m => m.employee_id === employeeId);
        const analysis = analyzeWorkload(employeeId, emp, empTasks, empMeetings);
        
        const completed = empTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
        const inProgress = empTasks.filter(t => t.status === 'In Progress').length;
        const overdue = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done' && (parseInt(t.deadline_days_remaining) || 0) <= 0).length;
        
        return {
            employee_id: employeeId,
            employee_name: cleanName(emp.employee_name),
            department: emp.department,
            role: emp.role,
            utilization_percent: analysis.utilization_percent,
            workload_risk: analysis.workload_risk,
            completed_tasks: completed,
            in_progress_tasks: inProgress,
            overdue_tasks: overdue,
            completion_rate_percent: Math.round(empTasks.length > 0 ? (completed / empTasks.length * 100) : 0),
            tasks: empTasks,
            meetings: empMeetings
        };
    },

    async toggleTask(taskId) {
        await ensureCache();
        const task = cache.tasks.find(t => t.task_id === taskId);
        if (!task) {
            throw new Error(`Task with ID ${taskId} not found.`);
        }
        
        const currentStatus = task.status;
        const newStatus = (currentStatus === 'Completed' || currentStatus === 'Done') ? 'In Progress' : 'Completed';
        const newProgress = newStatus === 'Completed' ? 100 : 50;
        
        // Write status update to Firestore document
        const docRef = doc(db, "tasks", taskId);
        await updateDoc(docRef, {
            status: newStatus,
            progress_percent: newProgress
        });
        
        // Mirror changes in the active local memory cache
        task.status = newStatus;
        task.progress_percent = newProgress;
        
        const empId = task.employee_id;
        const empTasks = cache.tasks.filter(t => t.employee_id === empId);
        const completed = empTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
        const rate = Math.round(empTasks.length > 0 ? (completed / empTasks.length * 100) : 0);
        
        return {
            status: 'success',
            task_id: taskId,
            new_status: newStatus,
            employee_updated_completion_rate: rate
        };
    },

    async getTaskAssignmentRecommendations(taskDetails) {
        await ensureCache();
        return recommendTaskAssignment(taskDetails, cache.employees, cache.tasks, cache.meetings);
    },

    async getWeeklySummary(department = '') {
        await ensureCache();
        return generateWeeklySummary(department, cache.employees, cache.tasks, cache.meetings);
    },

    async getEarlyWarnings() {
        await ensureCache();
        return getEarlyWarningAlerts(cache.employees, cache.tasks, cache.meetings);
    },

    async askEmployeeAssistant(employeeId, question) {
        await ensureCache();
        return answerEmployeeQuestion(employeeId, question, cache.employees, cache.tasks, cache.meetings);
    },

    async getAiConfig() {
        return AI_CONFIG;
    },

    async getDepartments() {
        await ensureCache();
        const depts = cache.employees.map(e => e.department).filter(Boolean);
        return [...new Set(depts)].sort();
    },

    async getSkills() {
        await ensureCache();
        const skills = cache.employees.map(e => e.primary_skill).filter(Boolean);
        return [...new Set(skills)].sort();
    },

    async getTasks() {
        await ensureCache();
        return cache.tasks.map(t => {
            const emp = cache.employees.find(e => e.employee_id === t.employee_id);
            const proj = cache.projects.find(p => p.project_id === t.project_id);
            return {
                ...t,
                employee_name: emp ? cleanName(emp.employee_name) : "Unassigned",
                project_name: proj ? proj.project_name : "General"
            };
        });
    },

    async getMeetings() {
        await ensureCache();
        return cache.meetings.map(m => {
            const emp = cache.employees.find(e => e.employee_id === m.employee_id);
            return {
                ...m,
                employee_name: emp ? cleanName(emp.employee_name) : "Unassigned"
            };
        });
    },

    async getProjects() {
        await ensureCache();
        return cache.projects;
    },

    resolveEmployeeId(currentUser) {
        if (!currentUser) return null;
        const profile = currentUser.profile || currentUser;
        
        // 1. If Firestore users document had employee_id, use it
        if (profile.employee_id) return profile.employee_id;
        
        // 2. Map demo email
        const email = profile.email || '';
        if (email === 'employee@worklens.com') {
            return 'E001';
        }
        
        // 3. Match by name in cache if available
        if (cache.employees && profile.name) {
            const match = cache.employees.find(e => e.employee_name && e.employee_name.toLowerCase() === profile.name.toLowerCase());
            if (match) return match.employee_id;
        }
        
        // 4. Default fallback to prevent crash
        return null;
    },

    async getCalendarNotes(userId) {
        if (!userId) return [];
        try {
            const qRef = query(collection(db, "calendarNotes"), where("userId", "==", userId));
            const snap = await getDocs(qRef);
            const notes = [];
            snap.forEach(docSnap => {
                const data = docSnap.data();
                notes.push({
                    note_id: docSnap.id,
                    userId: data.userId,
                    employeeId: data.employeeId || "",
                    date: data.date,
                    content: data.content || "",
                    text: data.content || "",
                    created_at: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : "",
                    updated_at: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : ""
                });
            });
            return notes;
        } catch (err) {
            console.error("Failed to fetch calendar notes:", err);
            return [];
        }
    },

    async addCalendarNote(userId, employeeId, date, content) {
        console.log("--- FIREBASE WRITE DEBUG ---");
        console.log("auth.currentUser.uid:", auth?.currentUser?.uid);
        console.log("auth.currentUser.email:", auth?.currentUser?.email);
        console.log("userId argument:", userId);
        console.log("employeeId argument:", employeeId);
        console.log("date argument:", date);
        console.log("content argument:", content);
        
        if (!userId || !date || !content) throw new Error("Invalid note parameters.");
        const newNote = {
            userId,
            employeeId: employeeId || "",
            date,
            content,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        console.log("newNote payload being written:", newNote);
        const docRef = await addDoc(collection(db, "calendarNotes"), newNote);
        console.log("docRef created successfully with ID:", docRef.id);
        return {
            note_id: docRef.id,
            userId,
            employeeId: employeeId || "",
            date,
            content,
            text: content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    },

    async updateCalendarNote(noteId, content) {
        if (!noteId || !content) throw new Error("Invalid note update parameters.");
        const noteRef = doc(db, "calendarNotes", noteId);
        const updateData = {
            content,
            updatedAt: serverTimestamp()
        };
        await updateDoc(noteRef, updateData);
        return {
            note_id: noteId,
            content,
            text: content,
            updated_at: new Date().toISOString()
        };
    },

    async deleteCalendarNote(noteId) {
        if (!noteId) throw new Error("Invalid note ID.");
        const noteRef = doc(db, "calendarNotes", noteId);
        await deleteDoc(noteRef);
        return { status: "success", note_id: noteId };
    }
};
