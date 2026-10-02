/**
 * ITSM Service Request Management System - Express API Server
 * Provides RESTful endpoints for catalog, request lifecycle, approvals, and KPI analytics.
 */

const express = require('express');
const cors = require('cors');
const db = require('./db/database');
const { checkAndMarkBreaches } = require('./services/slaService');

// Initialize routes
const catalogRoutes = require('./routes/catalog');
const usersRoutes = require('./routes/users');
const requestsRoutes = require('./routes/requests');
const approvalsRoutes = require('./routes/approvals');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming JSON payloads
app.use(express.json());

// API health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ITSM Service Request API'
  });
});

// Mount modular API routers
app.use('/api/catalog', catalogRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start background SLA breach inspector (runs every 60 seconds)
const SLA_INTERVAL_MS = 60 * 1000;
const slaTimer = setInterval(() => {
  const updatedCount = checkAndMarkBreaches(db);
  if (updatedCount > 0) {
    console.log(`⏱️ SLA Monitor: Detected and updated ${updatedCount} newly breached request(s).`);
  }
}, SLA_INTERVAL_MS);

// Ensure cleanup on graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(slaTimer);
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 ITSM Backend Server running on http://localhost:${PORT}`);
  console.log(`   - Catalog:    GET  http://localhost:${PORT}/api/catalog`);
  console.log(`   - Users:      GET  http://localhost:${PORT}/api/users`);
  console.log(`   - Requests:   GET  http://localhost:${PORT}/api/requests`);
  console.log(`   - Approvals:  GET  http://localhost:${PORT}/api/approvals`);
  console.log(`   - Dashboard:  GET  http://localhost:${PORT}/api/dashboard`);
  console.log(`=======================================================`);
});

module.exports = app;
