/**
 * Performance Evaluation Engine
 * Handles weighted scoring for Employees and Managers.
 */

export const calculateEmployeeScore = (tasks, employeeId) => {
  if (!tasks || tasks.length === 0) return 0;

  const employeeTasks = tasks.filter(t => t.employeeId === employeeId);
  const totalAssigned = employeeTasks.length;
  if (totalAssigned === 0) return 0;

  const completedTasks = employeeTasks.filter(t => t.status === 'Completed');
  const completedCount = completedTasks.length;

  // 1. Completion Rate (40%)
  const completionRate = (completedCount / totalAssigned) * 100;

  // 2. Quality Rate (25%) - Tasks without rework
  // Assuming reworkCount is a field in task.
  const qualityTasks = completedTasks.filter(t => t.reworkCount === 0).length;
  const qualityRate = completedCount > 0 ? (qualityTasks / completedCount) * 100 : 0;

  // 3. Timeliness (20%) - Completed on or before due date
  const onTimeTasks = completedTasks.filter(t => {
    return new Date(t.completedDate) <= new Date(t.dueDate);
  }).length;
  const timelinessRate = completedCount > 0 ? (onTimeTasks / completedCount) * 100 : 0;

  // 4. Productivity (15%)
  // Normalized against a target. Let's assume target is 10 tasks/month for now.
  const COMPLETED_TARGET = 10; 
  const productivityScore = Math.min((completedCount / COMPLETED_TARGET) * 100, 100);

  // Final Weighted Score
  const finalScore = (
    (completionRate * 0.40) +
    (qualityRate * 0.25) +
    (timelinessRate * 0.20) +
    (productivityScore * 0.15)
  );

  return parseFloat(finalScore.toFixed(2));
};

export const calculateManagerScore = (tasks, managerId, teamMembers) => {
    // teamMembers is array of employeeIds
    if (!teamMembers || teamMembers.length === 0) return 0;

    const teamTasks = tasks.filter(t => teamMembers.includes(t.employeeId));
    const totalTeamAssigned = teamTasks.length;
    
    if (totalTeamAssigned === 0) return 0;

    const teamCompleted = teamTasks.filter(t => t.status === 'Completed');
    const teamCompletedCount = teamCompleted.length;

    // 1. Team Completion Rate (35%)
    const teamCompletionRate = (teamCompletedCount / totalTeamAssigned) * 100;

    // 2. Low Rework Percentage (30%)
    // Percentage of tasks that needed rework (inverse of quality)
    // "Low Rework" means high quality. So (Tasks with 0 rework / Total Completed) * 100
    const noReworkCount = teamCompleted.filter(t => t.reworkCount === 0).length;
    const lowReworkRate = teamCompletedCount > 0 ? (noReworkCount / teamCompletedCount) * 100 : 0;

    // 3. Approval Efficiency (20%)
    // Measure time between "Submitted" and "Approved/Completed". 
    // For now, simpler metric: % of tasks processed (Completed or Rejected) vs Pending Approval
    // Assuming status 'In Review' exists. 
    // Let's simplified: If manager has no 'In Review' tasks older than 2 days => 100%. 
    // For this mock, we'll simulate it based on ratio of 'Completed' to 'In Review'
    const inReviewCount = teamTasks.filter(t => t.status === 'In Review').length;
    const approvalEfficiency = (teamCompletedCount / (teamCompletedCount + inReviewCount || 1)) * 100;

    // 4. Team Stability (15%)
    // Hard to measure without turnover data. We'll set a baseline high score for now 
    // or base it on active employees vs total team size.
    const teamStability = 95; // Placeholder

    const finalScore = (
        (teamCompletionRate * 0.35) +
        (lowReworkRate * 0.30) +
        (approvalEfficiency * 0.20) +
        (teamStability * 0.15)
    );

    return parseFloat(finalScore.toFixed(2));
};
