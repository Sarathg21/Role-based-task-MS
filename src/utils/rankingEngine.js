/**
 * Ranking Engine
 * Sorts employees/managers based on performance scores.
 */
import { calculateEmployeeScore, calculateManagerScore } from './performanceEngine';

export const getEmployeeRankings = (employees, tasks) => {
    // employees: array of user objects with role 'Employee'
    const ranked = employees.map(emp => {
        const score = calculateEmployeeScore(tasks, emp.id);
        return { ...emp, score };
    });

    // Sort descending
    ranked.sort((a, b) => b.score - a.score);

    // Assign rank
    return ranked.map((emp, index) => ({
        ...emp,
        rank: index + 1
    }));
};

export const getManagerRankings = (managers, tasks, allEmployees) => {
    const ranked = managers.map(mgr => {
        // Find team members for this manager
        const teamMembers = allEmployees
            .filter(e => e.managerId === mgr.id)
            .map(e => e.id);

        const score = calculateManagerScore(tasks, mgr.id, teamMembers);
        return { ...mgr, score };
    });

    ranked.sort((a, b) => b.score - a.score);

    return ranked.map((mgr, index) => ({
        ...mgr,
        rank: index + 1
    }));
};

export const getTopPerformer = (rankedList) => {
    return rankedList.length > 0 ? rankedList[0] : null;
};
