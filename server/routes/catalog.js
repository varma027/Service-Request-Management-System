/**
 * Catalog API Routes
 * GET /api/catalog - List all available service catalog offerings
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/catalog
router.get('/', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT
        id,
        name,
        description,
        category,
        requires_it_approval,
        created_at
      FROM catalog_items
      ORDER BY id ASC
    `).all();

    res.json({
      success: true,
      data: items
    });
  } catch (err) {
    console.error('Error fetching catalog items:', err);
    res.status(500).json({ success: false, error: 'Internal server error fetching catalog items' });
  }
});

module.exports = router;
