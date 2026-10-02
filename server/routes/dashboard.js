/**
 * Dashboard API Routes (Phase 5)
 * Aggregates ITSM operational KPIs:
 * 1. Request volume (by day and by catalog item)
 * 2. Backlog (open requests by status)
 * 3. SLA compliance % (met vs breached, overall and per priority)
 * 4. Average resolution time (per catalog item in hours)
 * Filters: date range (days) and priority.
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { checkAndMarkBreaches } = require('../services/slaService');

// GET /api/dashboard
router.get('/', (req, res) => {
  try {
    // Keep breaches fresh
    checkAndMarkBreaches(db);

    const { days, priority } = req.query;

    let baseFilter = ' WHERE 1=1';
    const params = [];

    // Date range filter
    if (days && days !== 'all') {
      const numDays = Number(days);
      const cutoff = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000).toISOString();
      baseFilter += ' AND r.created_at >= ?';
      params.push(cutoff);
    }

    // Priority filter
    if (priority && priority !== 'all') {
      baseFilter += ' AND r.priority = ?';
      params.push(priority);
    }

    // --- KPI 1: Request Volume ---
    // 1a. Daily Intake
    const dailyVolume = db.prepare(`
      SELECT
        substr(r.created_at, 1, 10) AS date,
        COUNT(*) AS count
      FROM requests r
      ${baseFilter}
      GROUP BY substr(r.created_at, 1, 10)
      ORDER BY date ASC
    `).all(...params);

    // 1b. Volume by Catalog Item
    const catalogVolume = db.prepare(`
      SELECT
        c.name AS catalog_name,
        c.category,
        COUNT(r.id) AS count
      FROM catalog_items c
      LEFT JOIN requests r ON c.id = r.catalog_item_id
        ${days && days !== 'all' ? `AND r.created_at >= datetime('now', '-${Number(days)} days')` : ''}
        ${priority && priority !== 'all' ? `AND r.priority = '${priority.replace(/'/g, '')}'` : ''}
      GROUP BY c.id, c.name, c.category
      ORDER BY count DESC
    `).all();

    // --- KPI 2: Backlog (Active open requests by status) ---
    const backlogQuery = `
      SELECT
        r.status,
        COUNT(*) AS count
      FROM requests r
      ${baseFilter} AND r.status IN ('Pending Approval', 'Approved', 'In Progress')
      GROUP BY r.status
      ORDER BY count DESC
    `;
    const backlog = db.prepare(backlogQuery).all(...params);

    // Total open backlog count
    const totalBacklog = backlog.reduce((sum, item) => sum + item.count, 0);

    // --- KPI 3: SLA Compliance % (Overall & Per Priority) ---
    // Requests considered for SLA compliance are all finished tickets or breached open ones
    const slaOverallQuery = `
      SELECT
        SUM(CASE WHEN r.sla_breached = 1 THEN 1 ELSE 0 END) AS breached_count,
        SUM(CASE WHEN r.sla_breached = 0 THEN 1 ELSE 0 END) AS met_count,
        COUNT(*) AS total_count
      FROM requests r
      ${baseFilter}
    `;
    const slaOverallRaw = db.prepare(slaOverallQuery).get(...params);
    const totalSlaRequests = slaOverallRaw.total_count || 0;
    const breachedTotal = slaOverallRaw.breached_count || 0;
    const metTotal = slaOverallRaw.met_count || 0;
    const overallComplianceRate = totalSlaRequests > 0
      ? Math.round((metTotal / totalSlaRequests) * 100)
      : 100;

    // Per Priority SLA breakdown
    const slaByPriorityQuery = `
      SELECT
        r.priority,
        SUM(CASE WHEN r.sla_breached = 1 THEN 1 ELSE 0 END) AS breached,
        SUM(CASE WHEN r.sla_breached = 0 THEN 1 ELSE 0 END) AS met,
        COUNT(*) AS total
      FROM requests r
      ${baseFilter}
      GROUP BY r.priority
      ORDER BY CASE r.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END
    `;
    const slaByPriorityRaw = db.prepare(slaByPriorityQuery).all(...params);
    const slaByPriority = slaByPriorityRaw.map(p => ({
      priority: p.priority,
      met: p.met,
      breached: p.breached,
      total: p.total,
      complianceRate: p.total > 0 ? Math.round((p.met / p.total) * 100) : 100
    }));

    // --- KPI 4: Average Resolution Time (in hours) Per Catalog Item ---
    // Applicable for requests that have been resolved (resolved_at IS NOT NULL)
    const avgResolutionQuery = `
      SELECT
        c.name AS catalog_name,
        COUNT(r.id) AS resolved_count,
        ROUND(AVG((strftime('%s', r.resolved_at) - strftime('%s', r.created_at)) / 3600.0), 1) AS avg_hours
      FROM catalog_items c
      JOIN requests r ON c.id = r.catalog_item_id
      ${baseFilter} AND r.resolved_at IS NOT NULL
      GROUP BY c.id, c.name
      ORDER BY avg_hours DESC
    `;
    const avgResolution = db.prepare(avgResolutionQuery).all(...params);

    // Global overall average resolution time
    const globalAvgQuery = `
      SELECT
        ROUND(AVG((strftime('%s', r.resolved_at) - strftime('%s', r.created_at)) / 3600.0), 1) AS overall_avg_hours,
        COUNT(*) as resolved_total
      FROM requests r
      ${baseFilter} AND r.resolved_at IS NOT NULL
    `;
    const globalAvg = db.prepare(globalAvgQuery).get(...params);

    // Total requests in current view
    const totalRequestsCount = db.prepare(`
      SELECT COUNT(*) as count FROM requests r ${baseFilter}
    `).get(...params).count;

    res.json({
      success: true,
      filters: {
        days: days || 'all',
        priority: priority || 'all'
      },
      summary: {
        totalRequests: totalRequestsCount,
        openBacklog: totalBacklog,
        overallComplianceRate,
        breachedCount: breachedTotal,
        metCount: metTotal,
        avgResolutionHours: globalAvg.overall_avg_hours || 0,
        resolvedTotal: globalAvg.resolved_total || 0
      },
      widgets: {
        requestVolume: {
          daily: dailyVolume,
          byCatalogItem: catalogVolume
        },
        backlog: backlog,
        slaCompliance: {
          overall: {
            met: metTotal,
            breached: breachedTotal,
            total: totalSlaRequests,
            complianceRate: overallComplianceRate
          },
          byPriority: slaByPriority
        },
        avgResolutionTime: avgResolution
      }
    });
  } catch (err) {
    console.error('Error computing dashboard KPIs:', err);
    res.status(500).json({ success: false, error: 'Internal server error computing dashboard metrics' });
  }
});

module.exports = router;
