/**
 * Workflow Service
 * Manages request transitions, approval state machine, and audit trail logging.
 */

const { calculateDueAt } = require('./slaService');

/**
 * Log an entry to the request_history table
 * @param {object} db - Database instance
 * @param {number} requestId - ID of the request
 * @param {string} status - New or current status
 * @param {number|null} changedBy - User ID who triggered the action
 * @param {string} note - Human-readable explanation
 * @param {string} [timestamp] - Optional custom ISO timestamp (useful for seeding)
 */
function logHistory(db, requestId, status, changedBy, note, timestamp = null) {
  const time = timestamp || new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO request_history (request_id, status, changed_by, changed_at, note)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(requestId, status, changedBy, time, note);
}

/**
 * Create a new service request and initialize its workflow
 * @param {object} db
 * @param {object} params - { catalog_item_id, requester_id, description, priority, customCreatedAt }
 * @returns {object} Created request object
 */
function createRequest(db, { catalog_item_id, requester_id, description, priority, customCreatedAt = null }) {
  // Validate catalog item
  const catalogItem = db.prepare('SELECT * FROM catalog_items WHERE id = ?').get(catalog_item_id);
  if (!catalogItem) {
    throw new Error('Catalog item not found');
  }

  // Validate requester
  const requester = db.prepare('SELECT * FROM users WHERE id = ?').get(requester_id);
  if (!requester) {
    throw new Error('Requester user not found');
  }

  const createdAt = customCreatedAt || new Date().toISOString();
  const dueAt = calculateDueAt(priority, createdAt);

  // Determine initial status based on catalog approval rules
  // Password Reset needs NO approval (auto-moves to Approved)
  // Others need at least Level 1 manager approval
  const isNoApprovalItem = catalogItem.name === 'Password Reset';
  const initialStatus = isNoApprovalItem ? 'Approved' : 'Pending Approval';

  const insertRequest = db.prepare(`
    INSERT INTO requests (catalog_item_id, requester_id, description, priority, status, created_at, due_at, sla_breached)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `);

  const info = insertRequest.run(
    catalog_item_id,
    requester_id,
    description,
    priority,
    initialStatus,
    createdAt,
    dueAt
  );
  const requestId = info.lastInsertRowid;

  // Log creation in history
  logHistory(
    db,
    requestId,
    'New',
    requester_id,
    `Request created by ${requester.name} for "${catalogItem.name}" with priority ${priority}`,
    createdAt
  );

  if (isNoApprovalItem) {
    // Auto-approve Password Reset
    logHistory(
      db,
      requestId,
      'Approved',
      null,
      'Pre-approved: This standard catalog item does not require manual approval.',
      createdAt
    );
  } else {
    // Create Level 1 Manager approval record
    const insertApproval = db.prepare(`
      INSERT INTO approvals (request_id, level, approver_id, decision)
      VALUES (?, 1, NULL, 'pending')
    `);
    insertApproval.run(requestId);

    logHistory(
      db,
      requestId,
      'Pending Approval',
      null,
      'Submitted for Level 1 Manager Approval',
      createdAt
    );
  }

  return getRequestById(db, requestId);
}

/**
 * Handle approval or rejection decision
 * @param {object} db
 * @param {number} approvalId
 * @param {number} approverId
 * @param {string} decision - 'approved' | 'rejected'
 * @param {string} comments
 * @param {string} [customTimestamp]
 */
function handleApprovalDecision(db, approvalId, approverId, decision, comments = '', customTimestamp = null) {
  const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(approvalId);
  if (!approval) {
    throw new Error('Approval task not found');
  }
  if (approval.decision !== 'pending') {
    throw new Error(`Approval has already been ${approval.decision}`);
  }

  const approver = db.prepare('SELECT * FROM users WHERE id = ?').get(approverId);
  if (!approver) {
    throw new Error('Approver user not found');
  }

  const request = db.prepare('SELECT r.*, c.name as catalog_name, c.requires_it_approval FROM requests r JOIN catalog_items c ON r.catalog_item_id = c.id WHERE r.id = ?').get(approval.request_id);
  if (!request) {
    throw new Error('Associated request not found');
  }

  const decidedAt = customTimestamp || new Date().toISOString();

  // Update current approval record
  db.prepare(`
    UPDATE approvals
    SET decision = ?, approver_id = ?, decided_at = ?, comments = ?
    WHERE id = ?
  `).run(decision, approverId, decidedAt, comments || null, approvalId);

  const levelName = approval.level === 1 ? 'Manager' : 'IT Approver';

  if (decision === 'rejected') {
    // Rejection immediately terminates the request
    db.prepare(`UPDATE requests SET status = 'Rejected' WHERE id = ?`).run(request.id);
    logHistory(
      db,
      request.id,
      'Rejected',
      approverId,
      `Rejected at Level ${approval.level} (${levelName}) by ${approver.name}. Reason: ${comments || 'No comment provided'}`,
      decidedAt
    );
  } else if (decision === 'approved') {
    // If Level 1 was approved and item requires Level 2 (IT approval)
    if (approval.level === 1 && request.requires_it_approval === 1) {
      // Spawn Level 2 approval
      db.prepare(`
        INSERT INTO approvals (request_id, level, approver_id, decision)
        VALUES (?, 2, NULL, 'pending')
      `).run(request.id);

      logHistory(
        db,
        request.id,
        'Pending Approval',
        approverId,
        `Level 1 approved by Manager (${approver.name}). Forwarded to Level 2 (IT Approver). Comment: ${comments || 'None'}`,
        decidedAt
      );
    } else {
      // All required approvals completed -> Move request to 'Approved'
      db.prepare(`UPDATE requests SET status = 'Approved' WHERE id = ?`).run(request.id);
      logHistory(
        db,
        request.id,
        'Approved',
        approverId,
        `Level ${approval.level} approved by ${levelName} (${approver.name}). Request is now ready for fulfillment.`,
        decidedAt
      );
    }
  }

  return getRequestById(db, request.id);
}

/**
 * Move approved request to 'In Progress' by a fulfiller
 */
function startFulfillment(db, requestId, fulfillerId, note = '', customTimestamp = null) {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
  if (!request) throw new Error('Request not found');
  if (request.status !== 'Approved') {
    throw new Error(`Cannot start progress: request is in status "${request.status}" (must be "Approved")`);
  }

  const fulfiller = db.prepare('SELECT * FROM users WHERE id = ?').get(fulfillerId);
  const timestamp = customTimestamp || new Date().toISOString();

  db.prepare(`UPDATE requests SET status = 'In Progress' WHERE id = ?`).run(requestId);

  logHistory(
    db,
    requestId,
    'In Progress',
    fulfillerId,
    note || `Fulfillment started by ${fulfiller ? fulfiller.name : 'fulfiller'}`,
    timestamp
  );

  return getRequestById(db, requestId);
}

/**
 * Mark request as 'Fulfilled' by a fulfiller
 */
function fulfillRequest(db, requestId, fulfillerId, note = '', customTimestamp = null) {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
  if (!request) throw new Error('Request not found');
  if (request.status !== 'In Progress' && request.status !== 'Approved') {
    throw new Error(`Cannot fulfill request in status "${request.status}"`);
  }

  const fulfiller = db.prepare('SELECT * FROM users WHERE id = ?').get(fulfillerId);
  const timestamp = customTimestamp || new Date().toISOString();

  // Check if resolution breaches SLA
  const resolvedTime = new Date(timestamp).getTime();
  const dueTime = new Date(request.due_at).getTime();
  const isBreached = resolvedTime > dueTime ? 1 : (request.sla_breached || 0);

  db.prepare(`
    UPDATE requests
    SET status = 'Fulfilled', resolved_at = ?, sla_breached = ?
    WHERE id = ?
  `).run(timestamp, isBreached, requestId);

  logHistory(
    db,
    requestId,
    'Fulfilled',
    fulfillerId,
    note || `Work completed and marked Fulfilled by ${fulfiller ? fulfiller.name : 'fulfiller'}. ${isBreached ? '⚠️ SLA breached.' : '✅ SLA met.'}`,
    timestamp
  );

  return getRequestById(db, requestId);
}

/**
 * Close request by requester
 */
function closeRequest(db, requestId, requesterId, note = '', customTimestamp = null) {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
  if (!request) throw new Error('Request not found');
  if (request.status !== 'Fulfilled') {
    throw new Error(`Cannot close request in status "${request.status}" (must be "Fulfilled")`);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(requesterId);
  const timestamp = customTimestamp || new Date().toISOString();

  db.prepare(`UPDATE requests SET status = 'Closed' WHERE id = ?`).run(requestId);

  logHistory(
    db,
    requestId,
    'Closed',
    requesterId,
    note || `Request verified and closed by ${user ? user.name : 'requester'}`,
    timestamp
  );

  return getRequestById(db, requestId);
}

/**
 * Retrieve a request by ID with all joined details, approvals, and history
 */
function getRequestById(db, requestId) {
  const request = db.prepare(`
    SELECT
      r.*,
      c.name AS catalog_name,
      c.category AS catalog_category,
      c.requires_it_approval,
      u.name AS requester_name,
      u.email AS requester_email,
      u.role AS requester_role
    FROM requests r
    JOIN catalog_items c ON r.catalog_item_id = c.id
    JOIN users u ON r.requester_id = u.id
    WHERE r.id = ?
  `).get(requestId);

  if (!request) return null;

  // Fetch approvals chain
  const approvals = db.prepare(`
    SELECT
      a.*,
      u.name AS approver_name,
      u.role AS approver_role
    FROM approvals a
    LEFT JOIN users u ON a.approver_id = u.id
    WHERE a.request_id = ?
    ORDER BY a.level ASC
  `).all(requestId);

  // Fetch history audit trail
  const history = db.prepare(`
    SELECT
      h.*,
      u.name AS changed_by_name,
      u.role AS changed_by_role
    FROM request_history h
    LEFT JOIN users u ON h.changed_by = u.id
    WHERE h.request_id = ?
    ORDER BY h.changed_at ASC, h.id ASC
  `).all(requestId);

  return {
    ...request,
    approvals,
    history
  };
}

module.exports = {
  createRequest,
  handleApprovalDecision,
  startFulfillment,
  fulfillRequest,
  closeRequest,
  getRequestById,
  logHistory
};
