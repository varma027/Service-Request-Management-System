/**
 * SLA Service
 * Handles SLA calculation, breach detection, and status determination.
 *
 * SLA Standards:
 * - High: 4 hours (4 * 3600 * 1000 ms)
 * - Medium: 1 day (24 * 3600 * 1000 ms)
 * - Low: 3 days (72 * 3600 * 1000 ms)
 */

const SLA_HOURS = {
  High: 4,
  Medium: 24,
  Low: 72
};

/**
 * Calculates due_at date ISO string based on priority and base creation date.
 * @param {string} priority - 'High', 'Medium', or 'Low'
 * @param {Date|string} [baseDate=new Date()]
 * @returns {string} ISO Date string
 */
function calculateDueAt(priority, baseDate = new Date()) {
  const start = new Date(baseDate);
  const hours = SLA_HOURS[priority] || 24;
  const due = new Date(start.getTime() + hours * 60 * 60 * 1000);
  return due.toISOString();
}

/**
 * Checks and updates SLA breach flags for open requests in the database.
 * Run on request queries and periodically via background timer.
 * @param {object} db - Database instance
 */
function checkAndMarkBreaches(db) {
  try {
    const nowIso = new Date().toISOString();
    // Open requests are those not in terminal or fulfilled states
    // Terminal/resolved states: 'Fulfilled', 'Closed', 'Rejected'
    const stmt = db.prepare(`
      UPDATE requests
      SET sla_breached = 1
      WHERE status NOT IN ('Fulfilled', 'Closed', 'Rejected')
        AND due_at < ?
        AND sla_breached = 0
    `);
    const result = stmt.run(nowIso);
    return result.changes;
  } catch (err) {
    console.error('Error checking SLA breaches:', err);
    return 0;
  }
}

/**
 * Determine SLA health status for a single request object
 * @param {object} request
 * @returns {object} { status: 'healthy'|'at_risk'|'breached'|'met'|'not_applicable', remainingMs, percentLeft }
 */
function getSlaDetails(request) {
  const now = Date.now();
  const created = new Date(request.created_at).getTime();
  const due = new Date(request.due_at).getTime();
  const totalDuration = due - created;

  // If already resolved/fulfilled/closed
  if (request.resolved_at) {
    const resolved = new Date(request.resolved_at).getTime();
    const breached = resolved > due || request.sla_breached === 1;
    return {
      status: breached ? 'breached' : 'met',
      breached,
      remainingMs: 0,
      percentLeft: 0,
      totalDurationMs: totalDuration,
      resolvedInMs: resolved - created
    };
  }

  // If rejected, SLA is no longer active
  if (request.status === 'Rejected') {
    return {
      status: 'rejected',
      breached: false,
      remainingMs: 0,
      percentLeft: 0,
      totalDurationMs: totalDuration
    };
  }

  // Open request calculation
  const remainingMs = due - now;
  if (remainingMs <= 0 || request.sla_breached === 1) {
    return {
      status: 'breached',
      breached: true,
      remainingMs: Math.min(0, remainingMs),
      percentLeft: 0,
      totalDurationMs: totalDuration
    };
  }

  const percentLeft = Math.max(0, Math.min(100, (remainingMs / totalDuration) * 100));

  // At risk if under 20% of time left
  if (percentLeft <= 20) {
    return {
      status: 'at_risk',
      breached: false,
      remainingMs,
      percentLeft: Math.round(percentLeft),
      totalDurationMs: totalDuration
    };
  }

  return {
    status: 'healthy',
    breached: false,
    remainingMs,
    percentLeft: Math.round(percentLeft),
    totalDurationMs: totalDuration
  };
}

module.exports = {
  SLA_HOURS,
  calculateDueAt,
  checkAndMarkBreaches,
  getSlaDetails
};
