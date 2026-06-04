import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Only Active Construction and Substantial Completion & Closeout require GM reports
    const gmStatuses = ['active_construction', 'substantial_completion_closeout'];

    const allProjects = await base44.asServiceRole.entities.Project.list();
    const activeProjects = allProjects.filter(p => gmStatuses.includes(p.status));

    if (activeProjects.length === 0) {
      return Response.json({ message: 'No projects requiring GM reports', flagged: 0 });
    }

    // Get company settings for the configurable due day
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0] || {};
    const dueDay = settings.gm_report_due_day ?? 5; // default Friday

    const allReports = await base44.asServiceRole.entities.GrossMarginReport.list();
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userMap = {};
    allUsers.forEach(u => { userMap[u.id] = u; });

    // Find the most recent due date (weekly, based on configurable day)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let lastDueDate = new Date(today);
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (d.getDay() === dueDay) {
        lastDueDate = d;
        break;
      }
    }
    const lastDueDateStr = lastDueDate.toISOString().split('T')[0];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const missingProjects = [];

    for (const project of activeProjects) {
      const projectReports = allReports.filter(r => r.project_id === project.id);
      const hasRecentReport = projectReports.some(r => r.reporting_date >= lastDueDateStr);

      if (!hasRecentReport) {
        missingProjects.push(project);
      }
    }

    if (missingProjects.length === 0) {
      return Response.json({ message: 'All projects have up-to-date GM reports', flagged: 0 });
    }

    const results = [];

    for (const project of missingProjects) {
      // Use GM report assignee if set, otherwise fall back to project manager
      const assigneeId = project.gm_report_assignee_id || project.project_manager_id;
      const assignee = userMap[assigneeId];
      const assigneeName = assignee?.full_name || 'Unassigned';
      const assigneeEmail = assignee?.email;

      // Check if there's already an open DataFlag for this project about gross margin
      const existingFlags = await base44.asServiceRole.entities.DataFlag.filter({
        entity_type: 'Project',
        entity_id: project.id,
        status: 'open'
      });

      const alreadyFlagged = existingFlags.some(f =>
        f.issue_description && f.issue_description.includes('Gross margin report overdue')
      );

      if (!alreadyFlagged) {
        await base44.asServiceRole.entities.DataFlag.create({
          entity_type: 'Project',
          entity_id: project.id,
          entity_title: project.title,
          status: 'open',
          priority: 'high',
          issue_description: `Gross margin report overdue. No report submitted since ${lastDueDateStr}. Reports are due every ${dayNames[dueDay]}.`,
          flagged_by_user_id: 'system',
          flagged_by_name: 'Automated Check'
        });
      }

      if (assigneeEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: assigneeEmail,
          subject: `⚠️ Gross Margin Report Overdue: ${project.title}`,
          body: `Hi ${assigneeName},\n\nYour gross margin report for "${project.title}" is overdue. Reports are required every ${dayNames[dueDay]}.\n\nLast due date: ${lastDueDateStr}\n\nPlease submit your report as soon as possible in the Projects tab.\n\nThank you.`
        });
      }

      results.push({
        project_id: project.id,
        project_title: project.title,
        assignee_name: assigneeName,
        assignee_emailed: !!assigneeEmail,
        flag_created: !alreadyFlagged
      });
    }

    return Response.json({
      message: `Found ${missingProjects.length} projects with overdue GM reports`,
      flagged: missingProjects.length,
      details: results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});