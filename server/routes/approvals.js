/**
 * Approvals API Routes
 * Manages approval queues for Managers (Level 1) and IT Approvers (Level 2).
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { handleApprovalDecision } = require('../services/workflowService');
const { checkAndMarkBreaches, getSlaDetails } = require('../services/slaService');

// GET /api/approvals - List pending approval items with rich context
router.get('/', (req, res) => {
  try {
    checkAndMarkBreaches(db);
    const { level, decision = 'pending', role } = req.query;

    let query = `
      SELECT
        a.id AS approval_id,
        a.level,
        a.decision,
        a.decided_at,
        a.comments,
        a.approver_id,
        r.id AS request_id,
        r.description,
        r.priority,
        r.status AS request_status,
        r.created_at,
        r.due_at,
        r.sla_breached,
        c.name AS catalog_name,
        c.category AS catalog_category,
        c.requires_it_approval,
        u.name AS requester_name,
        u.email AS requester_email
      FROM approvals a
      JOIN requests r ON a.request_id = r.id
      JOIN catalog_items c ON r.catalog_item_id = c.id
      JOIN users u ON r.requester_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (decision) {
      query += ' AND a.decision = ?';
      params.push(decision);
    }

    if (level) {
      query += ' AND a.level = ?';
      params.push(Number(level));
    } else if (role === 'manager') {
      // Managers review Level 1
      query += ' AND a.level = 1';
    } else if (role === 'it_approver') {
      // IT Approvers review Level 2
      query += ' AND a.level = 2';
    }

    query += ' ORDER BY r.due_at ASC, a.id ASC';

    const rawApprovals = db.prepare(query).all(...params);

    const decorated = rawApprovals.map(appr => ({
      ...appr,
      sla_details: getSlaDetails({
        created_at: appr.created_at,
        due_at: appr.due_at,
        status: appr.request_status,
        sla_breached: appr.sla_breached,
        resolved_at: null
      })
    }));

    res.json({
      success: true,
      count: decorated.length,
      data: decorated
    });
  } catch (err) {
    console.error('Error fetching approvals:', err);
    res.status(500).json({ success: false, error: 'Internal server error fetching approvals' });
  }
});

// POST /api/approvals/:id/decide - Record an approval or rejection decision
router.post('/:id/decide', (req, res) => {
  try {
    const approvalId = Number(req.params.id);
    const { approver_id, decision, comments } = req.body;

    if (!approver_id || !decision) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: approver_id and decision ("approved" or "rejected")'
      });
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Decision must be either "approved" or "rejected"'
      });
    }

    const updatedRequest = handleApprovalDecision(
      db,
      approvalId,
      Number(approver_id),
      decision,
      comments || ''
    );

    res.json({
      success: true,
      message: `Request successfully ${decision}`,
      data: {
        ...updatedRequest,
        sla_details: getSlaDetails(updatedRequest)
      }
    });
  } catch (err) {
    console.error('Error deciding approval:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
