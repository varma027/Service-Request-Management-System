/**
 * Requests API Routes
 * Manages request creation, retrieval, progression, and fulfillment.
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const {
  createRequest,
  startFulfillment,
  fulfillRequest,
  closeRequest,
  getRequestById
} = require('../services/workflowService');
const { checkAndMarkBreaches, getSlaDetails } = require('../services/slaService');

// GET /api/requests - List requests with optional filters
router.get('/', (req, res) => {
  try {
    // Run SLA check on read to update any breached requests
    checkAndMarkBreaches(db);

    const { requester_id, status, priority, catalog_item_id, sla_breached, search } = req.query;

    let query = `
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
      WHERE 1=1
    `;
    const params = [];

    if (requester_id) {
      query += ' AND r.requester_id = ?';
      params.push(Number(requester_id));
    }

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (priority) {
      query += ' AND r.priority = ?';
      params.push(priority);
    }

    if (catalog_item_id) {
      query += ' AND r.catalog_item_id = ?';
      params.push(Number(catalog_item_id));
    }

    if (sla_breached !== undefined && sla_breached !== '') {
      query += ' AND r.sla_breached = ?';
      params.push(Number(sla_breached));
    }

    if (search) {
      query += ' AND (r.description LIKE ? OR c.name LIKE ? OR u.name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY r.created_at DESC';

    const rawRequests = db.prepare(query).all(...params);

    // Decorate each request with SLA metrics
    const requests = rawRequests.map(r => ({
      ...r,
      sla_details: getSlaDetails(r)
    }));

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ success: false, error: 'Internal server error fetching requests' });
  }
});

// GET /api/requests/:id - Retrieve complete request detail with history & approvals
router.get('/:id', (req, res) => {
  try {
    checkAndMarkBreaches(db);
    const requestId = Number(req.params.id);
    const request = getRequestById(db, requestId);

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    const decorated = {
      ...request,
      sla_details: getSlaDetails(request)
    };

    res.json({
      success: true,
      data: decorated
    });
  } catch (err) {
    console.error('Error fetching request details:', err);
    res.status(500).json({ success: false, error: 'Internal server error fetching request details' });
  }
});

// POST /api/requests - Create a new service request
router.post('/', (req, res) => {
  try {
    const { catalog_item_id, requester_id, description, priority } = req.body;

    // Validation
    if (!catalog_item_id || !requester_id || !description || !priority) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: catalog_item_id, requester_id, description, and priority are required'
      });
    }

    if (!['High', 'Medium', 'Low'].includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid priority. Must be "High", "Medium", or "Low"'
      });
    }

    if (description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Description must be at least 5 characters long'
      });
    }

    const newRequest = createRequest(db, {
      catalog_item_id: Number(catalog_item_id),
      requester_id: Number(requester_id),
      description: description.trim(),
      priority
    });

    const decorated = {
      ...newRequest,
      sla_details: getSlaDetails(newRequest)
    };

    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      data: decorated
    });
  } catch (err) {
    console.error('Error creating request:', err);
    res.status(400).json({ success: false, error: err.message || 'Error creating request' });
  }
});

// PATCH /api/requests/:id/progress - Move to In Progress by fulfiller
router.patch('/:id/progress', (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { user_id, note } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const updated = startFulfillment(db, requestId, Number(user_id), note);
    res.json({
      success: true,
      message: 'Request moved to In Progress',
      data: {
        ...updated,
        sla_details: getSlaDetails(updated)
      }
    });
  } catch (err) {
    console.error('Error starting progress:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/requests/:id/fulfill - Mark as Fulfilled by fulfiller
router.patch('/:id/fulfill', (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { user_id, note } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const updated = fulfillRequest(db, requestId, Number(user_id), note);
    res.json({
      success: true,
      message: 'Request marked as Fulfilled',
      data: {
        ...updated,
        sla_details: getSlaDetails(updated)
      }
    });
  } catch (err) {
    console.error('Error fulfilling request:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/requests/:id/close - Requester closes fulfilled request
router.patch('/:id/close', (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { user_id, note } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const updated = closeRequest(db, requestId, Number(user_id), note);
    res.json({
      success: true,
      message: 'Request closed successfully',
      data: {
        ...updated,
        sla_details: getSlaDetails(updated)
      }
    });
  } catch (err) {
    console.error('Error closing request:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
