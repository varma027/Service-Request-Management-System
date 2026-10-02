-- ITSM Service Request Management System - SQLite Schema

-- 1. Users table
-- Represents actors in the system with distinct roles:
-- requester, manager, it_approver, fulfiller
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('requester', 'manager', 'it_approver', 'fulfiller')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Catalog Items table
-- Defines available service requests and their approval requirements
CREATE TABLE IF NOT EXISTS catalog_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  requires_it_approval INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Requests table
-- Tracks lifecycle of submitted tickets
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  catalog_item_id INTEGER NOT NULL,
  requester_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('High', 'Medium', 'Low')),
  status TEXT NOT NULL CHECK(status IN ('New', 'Pending Approval', 'Approved', 'In Progress', 'Fulfilled', 'Closed', 'Rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  due_at TEXT NOT NULL,
  resolved_at TEXT,
  sla_breached INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
  FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id),
  FOREIGN KEY (requester_id) REFERENCES users(id)
);

-- 4. Approvals table
-- Level 1: Manager approval, Level 2: IT Approver approval
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  level INTEGER NOT NULL CHECK(level IN (1, 2)),
  approver_id INTEGER,
  decision TEXT NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending', 'approved', 'rejected')),
  decided_at TEXT,
  comments TEXT,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- 5. Request History table
-- Audit trail logging every status change and lifecycle event
CREATE TABLE IF NOT EXISTS request_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  changed_by INTEGER,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  note TEXT,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Indices for optimized queries
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approvals_request ON approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(decision);
CREATE INDEX IF NOT EXISTS idx_history_request ON request_history(request_id);
