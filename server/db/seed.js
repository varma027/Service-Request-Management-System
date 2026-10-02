/**
 * Database Seed Script (Phase 2 & Phase 7)
 * Populates users, service catalog items, and 25 realistic sample requests
 * spread across 14 days with realistic approval trails, fulfillments, and ~5 SLA breaches.
 */

const db = require('./database');
const { calculateDueAt } = require('../services/slaService');
const { logHistory } = require('../services/workflowService');

function seed() {
  console.log('🌱 Starting ITSM Database Seeding...');

  // Clear existing data in correct dependency order
  db.exec(`
    DELETE FROM request_history;
    DELETE FROM approvals;
    DELETE FROM requests;
    DELETE FROM catalog_items;
    DELETE FROM users;
    DELETE FROM sqlite_sequence WHERE name IN ('users', 'catalog_items', 'requests', 'approvals', 'request_history');
  `);

  // 1. Seed Users (Phase 1 & Phase 7 requirements: at least 4 covering each role)
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const users = [
    { id: 1, name: 'Alice Johnson', email: 'alice@company.com', role: 'requester' },
    { id: 2, name: 'Bob Smith', email: 'bob@company.com', role: 'manager' },
    { id: 3, name: 'Charlie Davis', email: 'charlie@company.com', role: 'it_approver' },
    { id: 4, name: 'Diana Prince', email: 'diana@company.com', role: 'fulfiller' },
    { id: 5, name: 'Evan Wright', email: 'evan@company.com', role: 'requester' }
  ];

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const HOUR_MS = 60 * 60 * 1000;

  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, u.role, new Date(now - 20 * DAY_MS).toISOString());
  }
  console.log(`✅ Seeded ${users.length} users across all 4 ITSM roles.`);

  // 2. Seed 5 Service Catalog Items (Phase 2 requirements)
  const insertCatalog = db.prepare(`
    INSERT INTO catalog_items (id, name, description, category, requires_it_approval, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const catalogItems = [
    {
      id: 1,
      name: 'Laptop Request',
      description: 'Request a standard or developer workstation laptop replacement or upgrade.',
      category: 'Hardware',
      requires_it_approval: 1 // 2-level: manager, then IT
    },
    {
      id: 2,
      name: 'Software Access',
      description: 'Request enterprise licenses for Figma, GitHub Enterprise, JetBrains, or AWS.',
      category: 'Software',
      requires_it_approval: 1 // 2-level: manager, then IT
    },
    {
      id: 3,
      name: 'VPN Access',
      description: 'Request remote access credentials and multi-factor VPN tunnel configuration.',
      category: 'Security & Access',
      requires_it_approval: 0 // Manager approval only
    },
    {
      id: 4,
      name: 'New User Onboarding',
      description: 'Provision corporate email, workstation, badges, and initial group memberships.',
      category: 'Human Resources',
      requires_it_approval: 0 // Manager approval only
    },
    {
      id: 5,
      name: 'Password Reset',
      description: 'Standard self-service or desk-assisted password reset and account unlock.',
      category: 'Identity',
      requires_it_approval: 0 // No approval needed
    }
  ];

  for (const item of catalogItems) {
    insertCatalog.run(item.id, item.name, item.description, item.category, item.requires_it_approval, new Date(now - 20 * DAY_MS).toISOString());
  }
  console.log(`✅ Seeded 5 service catalog items.`);

  // 3. Seed 25 Realistic Sample Requests (Phase 7 requirements)
  // Spread across last 14 days, across all 5 items, all 3 priorities, various statuses, ~5 SLA breaches
  const sampleRequestsData = [
    // --- 1. Closed Requests (Resolved within SLA & breached) ---
    {
      daysAgo: 13.5,
      catalogId: 1, // Laptop Request (2-level)
      requesterId: 1,
      priority: 'High', // SLA: 4 hours
      description: 'Developer laptop stopped booting after firmware update (kernel panic).',
      status: 'Closed',
      resolveHoursAfter: 3, // Met SLA (3h < 4h)
      breached: 0
    },
    {
      daysAgo: 12.0,
      catalogId: 5, // Password Reset (no approval)
      requesterId: 5,
      priority: 'High', // SLA: 4 hours
      description: 'Locked out of ERP portal during month-end financial reconciliation.',
      status: 'Closed',
      resolveHoursAfter: 5.5, // BREACHED! (5.5h > 4h) -> Breach #1
      breached: 1
    },
    {
      daysAgo: 11.2,
      catalogId: 2, // Software Access (2-level)
      requesterId: 1,
      priority: 'Medium', // SLA: 24 hours
      description: 'Figma Professional license for upcoming Q4 UX overhaul sprint.',
      status: 'Closed',
      resolveHoursAfter: 18, // Met SLA
      breached: 0
    },
    {
      daysAgo: 10.5,
      catalogId: 3, // VPN Access (1-level)
      requesterId: 5,
      priority: 'Low', // SLA: 72 hours
      description: 'Remote VPN access profile for contracted QA engineer.',
      status: 'Closed',
      resolveHoursAfter: 88, // BREACHED! (88h > 72h) -> Breach #2
      breached: 1
    },
    {
      daysAgo: 9.8,
      catalogId: 4, // New User Onboarding (1-level)
      requesterId: 1,
      priority: 'Medium', // SLA: 24 hours
      description: 'Onboarding packet and system accounts for Senior DevOps specialist.',
      status: 'Closed',
      resolveHoursAfter: 20, // Met SLA
      breached: 0
    },

    // --- 2. Fulfilled Requests (Awaiting Requester closure) ---
    {
      daysAgo: 8.0,
      catalogId: 5, // Password Reset
      requesterId: 1,
      priority: 'High', // SLA: 4 hours
      description: 'Single sign-on password expired while traveling overseas.',
      status: 'Fulfilled',
      resolveHoursAfter: 1.5, // Met SLA
      breached: 0
    },
    {
      daysAgo: 7.2,
      catalogId: 2, // Software Access (2-level)
      requesterId: 5,
      priority: 'High', // SLA: 4 hours
      description: 'Urgent GitHub Copilot Enterprise seat assignment for release engineer.',
      status: 'Fulfilled',
      resolveHoursAfter: 6.2, // BREACHED! (6.2h > 4h) -> Breach #3
      breached: 1
    },
    {
      daysAgo: 6.5,
      catalogId: 1, // Laptop Request
      requesterId: 5,
      priority: 'Medium', // SLA: 24 hours
      description: 'MacBook Pro 16" upgrade for machine learning data analytics role.',
      status: 'Fulfilled',
      resolveHoursAfter: 22, // Met SLA
      breached: 0
    },
    {
      daysAgo: 5.8,
      catalogId: 3, // VPN Access
      requesterId: 1,
      priority: 'Medium', // SLA: 24 hours
      description: 'Access token renewal for customer site branch connectivity.',
      status: 'Fulfilled',
      resolveHoursAfter: 16, // Met SLA
      breached: 0
    },

    // --- 3. Rejected Requests ---
    {
      daysAgo: 8.5,
      catalogId: 1, // Laptop Request
      requesterId: 1,
      priority: 'Medium',
      description: 'Request for secondary testing laptop (unapproved budget line).',
      status: 'Rejected',
      rejectLevel: 1, // Rejected by Manager
      breached: 0
    },
    {
      daysAgo: 6.0,
      catalogId: 2, // Software Access
      requesterId: 5,
      priority: 'High',
      description: 'Request for administrative AWS root access token.',
      status: 'Rejected',
      rejectLevel: 2, // Rejected by IT Approver
      breached: 0
    },

    // --- 4. In Progress Requests (Active Fulfillment) ---
    {
      daysAgo: 4.5,
      catalogId: 4, // New User Onboarding
      requesterId: 1,
      priority: 'Low', // SLA: 72 hours (Due at 1.5 days ago -> BREACHED!)
      description: 'Onboarding provisions for 3 summer engineering interns starting Monday.',
      status: 'In Progress',
      breached: 1 // BREACHED! Active open breach -> Breach #4
    },
    {
      daysAgo: 2.0,
      catalogId: 1, // Laptop Request
      requesterId: 1,
      priority: 'Medium', // SLA: 24 hours (Due at 1.0 day ago -> BREACHED!)
      description: 'Dell XPS 15 loaner laptop while current machine is in battery depot.',
      status: 'In Progress',
      breached: 1 // BREACHED! Active open breach -> Breach #5
    },
    {
      daysAgo: 0.8, // 19 hours ago
      catalogId: 3, // VPN Access
      requesterId: 5,
      priority: 'Medium', // SLA: 24 hours (5 hours remaining -> At Risk!)
      description: 'Emergency VPN configuration for offshore vendor support team.',
      status: 'In Progress',
      breached: 0
    },
    {
      daysAgo: 0.4, // ~9.6 hours ago
      catalogId: 2, // Software Access
      requesterId: 1,
      priority: 'Low', // SLA: 72 hours (Plenty of time)
      description: 'Postman Enterprise workspace license for API platform team.',
      status: 'In Progress',
      breached: 0
    },

    // --- 5. Approved Requests (Ready for Fulfiller to pick up) ---
    {
      daysAgo: 1.2,
      catalogId: 5, // Password Reset
      requesterId: 5,
      priority: 'Medium', // SLA: 24 hours
      description: 'Service account credentials reset for automated telemetry pipeline.',
      status: 'Approved',
      breached: 0
    },
    {
      daysAgo: 0.9,
      catalogId: 1, // Laptop Request
      requesterId: 1,
      priority: 'Low', // SLA: 72 hours
      description: 'Dual monitor and docking station bundle for hybrid workstation.',
      status: 'Approved',
      breached: 0
    },
    {
      daysAgo: 0.3,
      catalogId: 3, // VPN Access
      requesterId: 5,
      priority: 'High', // SLA: 4 hours
      description: 'High priority secure bastion tunnel for staging database migration.',
      status: 'Approved',
      breached: 0
    },

    // --- 6. Pending Approval Requests ---
    {
      daysAgo: 0.5, // 12 hours ago
      catalogId: 1, // Laptop Request (2-level: passed Manager, pending IT Approver)
      requesterId: 5,
      priority: 'Medium', // SLA: 24 hours
      description: 'Apple Silicon M3 Max for mobile iOS compilation cluster.',
      status: 'Pending Approval',
      pendingLevel: 2,
      breached: 0
    },
    {
      daysAgo: 0.2, // ~5 hours ago
      catalogId: 2, // Software Access (2-level: pending Manager)
      requesterId: 1,
      priority: 'Medium', // SLA: 24 hours
      description: 'Datadog observability seat for on-call site reliability team.',
      status: 'Pending Approval',
      pendingLevel: 1,
      breached: 0
    },
    {
      daysAgo: 0.1, // ~2.4 hours ago
      catalogId: 4, // New User Onboarding (1-level: pending Manager)
      requesterId: 5,
      priority: 'Low', // SLA: 72 hours
      description: 'Product Marketing Manager onboarding package and collateral access.',
      status: 'Pending Approval',
      pendingLevel: 1,
      breached: 0
    },
    {
      daysAgo: 0.08, // ~2 hours ago
      catalogId: 3, // VPN Access (1-level: pending Manager)
      requesterId: 1,
      priority: 'High', // SLA: 4 hours (2 hours left -> At Risk!)
      description: 'Production Kubernetes cluster VPN tunnel credential renewal.',
      status: 'Pending Approval',
      pendingLevel: 1,
      breached: 0
    },
    {
      daysAgo: 0.05, // ~1.2 hours ago
      catalogId: 2, // Software Access (2-level: pending Manager)
      requesterId: 5,
      priority: 'High', // SLA: 4 hours
      description: 'Tableau Desktop Creator license for executive board deck preparation.',
      status: 'Pending Approval',
      pendingLevel: 1,
      breached: 0
    },
    {
      daysAgo: 0.02, // ~30 mins ago
      catalogId: 1, // Laptop Request (2-level: pending Manager)
      requesterId: 1,
      priority: 'Low', // SLA: 72 hours
      description: 'Ergonomic keyboard and 32" 4K external display accessory kit.',
      status: 'Pending Approval',
      pendingLevel: 1,
      breached: 0
    },
    {
      daysAgo: 0.01, // ~15 mins ago
      catalogId: 5, // Password Reset
      requesterId: 5,
      priority: 'Medium', // SLA: 24 hours
      description: 'Active Directory password expired during weekend change freeze.',
      status: 'Approved', // Auto-approved
      breached: 0
    }
  ];

  console.log(`⏳ Seeding ${sampleRequestsData.length} realistic requests...`);

  const insertRequest = db.prepare(`
    INSERT INTO requests (id, catalog_item_id, requester_id, description, priority, status, created_at, due_at, resolved_at, sla_breached)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertApproval = db.prepare(`
    INSERT INTO approvals (request_id, level, approver_id, decision, decided_at, comments)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let reqId = 1;
  let breachCount = 0;

  for (const item of sampleRequestsData) {
    const createdTimestamp = new Date(now - item.daysAgo * DAY_MS).toISOString();
    const dueTimestamp = calculateDueAt(item.priority, createdTimestamp);
    let resolvedTimestamp = null;

    if (item.resolveHoursAfter) {
      resolvedTimestamp = new Date(new Date(createdTimestamp).getTime() + item.resolveHoursAfter * HOUR_MS).toISOString();
    }

    if (item.breached) breachCount++;

    insertRequest.run(
      reqId,
      item.catalogId,
      item.requesterId,
      item.description,
      item.priority,
      item.status,
      createdTimestamp,
      dueTimestamp,
      resolvedTimestamp,
      item.breached
    );

    // Initial creation history
    logHistory(
      db,
      reqId,
      'New',
      item.requesterId,
      `Request submitted with priority "${item.priority}".`,
      createdTimestamp
    );

    // Build realistic approval and progression histories
    if (item.catalogId === 5) {
      // Password reset: no approvals required
      logHistory(
        db,
        reqId,
        'Approved',
        null,
        'Pre-approved: Standard self-service password reset policy.',
        createdTimestamp
      );
    } else {
      // Approvals required
      const isTwoLevel = (item.catalogId === 1 || item.catalogId === 2);

      if (item.status === 'Rejected') {
        if (item.rejectLevel === 1) {
          const l1Time = new Date(new Date(createdTimestamp).getTime() + 1.2 * HOUR_MS).toISOString();
          insertApproval.run(reqId, 1, 2, 'rejected', l1Time, 'Rejected by Manager: Request not within quarterly IT allotment.');
          logHistory(db, reqId, 'Rejected', 2, 'Rejected by Manager Bob Smith.', l1Time);
        } else {
          // L1 approved, L2 rejected
          const l1Time = new Date(new Date(createdTimestamp).getTime() + 1.0 * HOUR_MS).toISOString();
          const l2Time = new Date(new Date(createdTimestamp).getTime() + 2.5 * HOUR_MS).toISOString();
          insertApproval.run(reqId, 1, 2, 'approved', l1Time, 'Manager endorsed.');
          insertApproval.run(reqId, 2, 3, 'rejected', l2Time, 'Rejected by IT Security: Elevated privileges violate policy.');
          logHistory(db, reqId, 'Pending Approval', 2, 'Approved at Level 1 by Manager.', l1Time);
          logHistory(db, reqId, 'Rejected', 3, 'Rejected at Level 2 by IT Approver Charlie Davis.', l2Time);
        }
      } else if (item.status === 'Pending Approval') {
        if (item.pendingLevel === 2) {
          // L1 is approved, waiting on L2
          const l1Time = new Date(new Date(createdTimestamp).getTime() + 1.1 * HOUR_MS).toISOString();
          insertApproval.run(reqId, 1, 2, 'approved', l1Time, 'Manager approved.');
          insertApproval.run(reqId, 2, null, 'pending', null, null);
          logHistory(db, reqId, 'Pending Approval', 2, 'Approved by Manager. Escalated to IT Approver.', l1Time);
        } else {
          // L1 is pending
          insertApproval.run(reqId, 1, null, 'pending', null, null);
          logHistory(db, reqId, 'Pending Approval', null, 'Awaiting Level 1 Manager approval.', createdTimestamp);
        }
      } else {
        // Status is Approved, In Progress, Fulfilled, or Closed
        const l1Time = new Date(new Date(createdTimestamp).getTime() + 0.8 * HOUR_MS).toISOString();
        insertApproval.run(reqId, 1, 2, 'approved', l1Time, 'Manager approved.');
        logHistory(db, reqId, 'Pending Approval', 2, 'Level 1 approved by Manager Bob Smith.', l1Time);

        let approvalFinalTime = l1Time;
        if (isTwoLevel) {
          const l2Time = new Date(new Date(createdTimestamp).getTime() + 1.8 * HOUR_MS).toISOString();
          insertApproval.run(reqId, 2, 3, 'approved', l2Time, 'IT architectural approval granted.');
          logHistory(db, reqId, 'Approved', 3, 'Level 2 approved by IT Approver Charlie Davis.', l2Time);
          approvalFinalTime = l2Time;
        } else {
          logHistory(db, reqId, 'Approved', 2, 'All required approvals cleared.', l1Time);
        }

        if (item.status === 'In Progress' || item.status === 'Fulfilled' || item.status === 'Closed') {
          const inProgTime = new Date(new Date(approvalFinalTime).getTime() + 0.5 * HOUR_MS).toISOString();
          logHistory(db, reqId, 'In Progress', 4, 'Fulfillment engineer Diana Prince claimed the ticket.', inProgTime);

          if (item.status === 'Fulfilled' || item.status === 'Closed') {
            const fulfillTime = resolvedTimestamp || new Date(new Date(inProgTime).getTime() + 2 * HOUR_MS).toISOString();
            logHistory(
              db,
              reqId,
              'Fulfilled',
              4,
              `Hardware/software provisioned and delivered. ${item.breached ? 'SLA breached.' : 'SLA met.'}`,
              fulfillTime
            );

            if (item.status === 'Closed') {
              const closeTime = new Date(new Date(fulfillTime).getTime() + 1 * HOUR_MS).toISOString();
              logHistory(db, reqId, 'Closed', item.requesterId, 'Requester verified service delivery and closed ticket.', closeTime);
            }
          }
        }
      }
    }

    reqId++;
  }

  console.log(`✅ Seeded ${reqId - 1} requests (${breachCount} SLA breaches simulated).`);
  console.log('🎉 Seeding successfully completed!');
}

// Execute if run directly via CLI
if (require.main === module) {
  seed();
}

module.exports = seed;
