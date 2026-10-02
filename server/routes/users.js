/**
 * Users API Routes
 * GET /api/users - List users for the demo role switcher and assignment
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/users
router.get('/', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY id ASC').all();
    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, error: 'Internal server error fetching users' });
  }
});

module.exports = router;
