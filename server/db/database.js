/**
 * Database Module (SQLite)
 * Initializes SQLite connection, enables foreign keys, and provisions tables.
 * Employs better-sqlite3 with standard prepared statement helpers.
 */

const path = require('path');
const fs = require('fs');

// Path to SQLite database file
const DB_PATH = path.join(__dirname, 'itsm.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  // Enable foreign key enforcement
  db.pragma('foreign_keys = ON');
} catch (err) {
  // Graceful fallback to node:sqlite if better-sqlite3 native bindings fail
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
}

/**
 * Initialize database schema
 */
function initDb() {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schemaSql);
}

// Ensure schema is created on startup
initDb();

module.exports = db;
