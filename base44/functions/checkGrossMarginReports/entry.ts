import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is called by a scheduled automation, but we still verify auth
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const activeStatuses = ['mobilization', 'active_construction', 'substantial_completion_closeout'];

    // Fetch all projects and filter active ones
    const allProjects = await base44.asServiceRole.entities.Project.list();
    const activeProjects = allProjects.filter(p => activeStatuses.includes(p.status));

    if (activeProjects.length === 0) {
      return Response.json({ message: 'No active projects to check', flagged: 0 });
    }

    // Fetch all gross margin reports
    const allReports = await base44.asServiceRole.entities.GrossMarginReport.list();

    // Fetch all users for PM names/emails
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userMap = {};
    allUsers.forEach(u => { userMap[u.id] = u; });

    // Determine the last required report date
    // Reports are due Tuesdays and Fridays
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Find the most recent due date (Tuesday=2, Friday=5)
    let lastDueDate = new Date(today);
    // Walk backwards to find the last Tuesday or Friday
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dow = d.getDay();
      if (dow === 2 || dow === 5) {
        lastDueDate = d;
        break;
      }
    }

    const lastDueDateStr = lastDueDate.toISOString().split('T')[0];

    // Check each active project for a report on or after the last due date
    const missingProjects = [];

    for (const project of activeProjects) {
      // Find reports for this project
      const projectReports = allReports.filter(r => r.project_id === project.id);

      // Check if there's a report on or after the last due date
      const hasRecentReport = projectReports.some(r => r.reporting_date >= lastDueDateStr);

      if (!hasRecentReport) {
        missingProjects.push(project);
      }
    }

    if (missingProjects.length === 0) {
      return Response.json({ message: 'All active projects have up-to-date reports', flagged: 0 });
    }

    // Create DataFlags and send emails for missing reports
    const results = [];

    for (const project of missingProjects) {
      const pm = userMap[project.project_manager_id];
      const pmName = pm?.full_name || 'Unassigned PM';
      const pmEmail = pm?.email;

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
        // Create DataFlag
        await base44.asServiceRole.entities.DataFlag.create({
          entity_type: 'Project',
          entity_id: project.id,
          entity_title: project.title,
          status: 'open',
          priority: 'high',
          issue_description: `Gross margin report overdue. No report submitted since ${lastDueDateStr}. Reports are due every Tuesday and Friday.`,
          flagged_by_user_id: 'system',
          flagged_by_name: 'Automated Check'
        });
      }

      // Send email to project manager
      if (pmEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: pmEmail,
          subject: `⚠️ Gross Margin Report Overdue: ${project.title}`,
          body: `Hi ${pmName},\n\nYour gross margin report for "${project.title}" is overdue. Reports are required every Tuesday and Friday.\n\nLast due date: ${lastDueDateStr}\n\nPlease submit your report as soon as possible in the Projects tab.\n\nThank you.`
        });
      }

      results.push({
        project_id: project.id,
        project_title: project.title,
        pm_name: pmName,
        pm_emailed: !!pmEmail,
        flag_created: !alreadyFlagged
      });
    }

    return Response.json({
      message: `Found ${missingProjects.length} projects with overdue reports`,
      flagged: missingProjects.length,
      details: results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});