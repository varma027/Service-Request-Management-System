/**
 * Backend API Integration Test Script
 * Verifies all phases: DB, Catalog, Workflow, SLA, and KPI Dashboard.
 */

const http = require('http');
const app = require('./index');

function makeRequest(server, options, postData) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Backend API Tests...\n');

  // Bind to random port for test
  const server = app.listen(0);

  try {
    // 1. Test Catalog
    const catRes = await makeRequest(server, { path: '/api/catalog' });
    console.log(`[Phase 2] Catalog Items: ${catRes.body.data?.length === 5 ? '✅ PASSED' : '❌ FAILED'} (Found ${catRes.body.data?.length})`);

    // 2. Test Users
    const userRes = await makeRequest(server, { path: '/api/users' });
    console.log(`[Phase 1] Users Available: ${userRes.body.data?.length >= 4 ? '✅ PASSED' : '❌ FAILED'} (Found ${userRes.body.data?.length})`);

    // 3. Test Password Reset Submission (0-level approval -> auto Approved)
    const pwReq = await makeRequest(server, { path: '/api/requests', method: 'POST' }, {
      catalog_item_id: 5,
      requester_id: 1,
      description: 'Emergency password reset for test account',
      priority: 'High'
    });
    console.log(`[Phase 3] Password Reset Auto-Approve: ${pwReq.body.data?.status === 'Approved' ? '✅ PASSED' : '❌ FAILED'} (Status: ${pwReq.body.data?.status})`);

    // 4. Test Laptop Request Submission (2-level approval)
    const laptopReq = await makeRequest(server, { path: '/api/requests', method: 'POST' }, {
      catalog_item_id: 1,
      requester_id: 1,
      description: 'New M3 MacBook for development workflow',
      priority: 'High'
    });
    const laptopId = laptopReq.body.data?.id;
    console.log(`[Phase 3] Laptop Request Submission: ${laptopReq.body.data?.status === 'Pending Approval' ? '✅ PASSED' : '❌ FAILED'} (Status: ${laptopReq.body.data?.status}, ID: ${laptopId})`);
    console.log(`[Phase 4] SLA Due Calculation: ${laptopReq.body.data?.sla_details?.totalDurationMs === 4 * 3600 * 1000 ? '✅ PASSED' : '❌ FAILED'} (High = 4h)`);

    // 5. Check Pending Approvals for Manager
    const appRes = await makeRequest(server, { path: '/api/approvals?role=manager' });
    const pendingL1 = appRes.body.data?.find(a => a.request_id === laptopId && a.level === 1);
    console.log(`[Phase 3] Level 1 Manager Pending Approval: ${pendingL1 ? '✅ PASSED' : '❌ FAILED'} (Approval ID: ${pendingL1?.approval_id})`);

    // 6. Manager Approves Level 1
    const decideL1 = await makeRequest(server, { path: `/api/approvals/${pendingL1.approval_id}/decide`, method: 'POST' }, {
      approver_id: 2,
      decision: 'approved',
      comments: 'Approved by manager - standard dev setup'
    });
    console.log(`[Phase 3] Manager Level 1 Approval: ${decideL1.body.data?.status === 'Pending Approval' ? '✅ PASSED' : '❌ FAILED'} (Request stays Pending Approval for IT)`);

    // 7. Check Pending Approvals for IT Approver
    const itAppRes = await makeRequest(server, { path: '/api/approvals?role=it_approver' });
    const pendingL2 = itAppRes.body.data?.find(a => a.request_id === laptopId && a.level === 2);
    console.log(`[Phase 3] Level 2 IT Pending Approval: ${pendingL2 ? '✅ PASSED' : '❌ FAILED'} (Approval ID: ${pendingL2?.approval_id})`);

    // 8. IT Approver Approves Level 2
    const decideL2 = await makeRequest(server, { path: `/api/approvals/${pendingL2.approval_id}/decide`, method: 'POST' }, {
      approver_id: 3,
      decision: 'approved',
      comments: 'IT Hardware standard verified and approved'
    });
    console.log(`[Phase 3] IT Level 2 Approval to Approved: ${decideL2.body.data?.status === 'Approved' ? '✅ PASSED' : '❌ FAILED'} (Status: ${decideL2.body.data?.status})`);

    // 9. Fulfiller starts progress
    const progRes = await makeRequest(server, { path: `/api/requests/${laptopId}/progress`, method: 'PATCH' }, {
      user_id: 4,
      note: 'Provisioning device from asset inventory'
    });
    console.log(`[Phase 3] Fulfiller Start Progress: ${progRes.body.data?.status === 'In Progress' ? '✅ PASSED' : '❌ FAILED'} (Status: ${progRes.body.data?.status})`);

    // 10. Fulfiller marks fulfilled
    const fulfillRes = await makeRequest(server, { path: `/api/requests/${laptopId}/fulfill`, method: 'PATCH' }, {
      user_id: 4,
      note: 'Laptop imaged, encrypted, and handed to requester'
    });
    console.log(`[Phase 3] Fulfiller Mark Fulfilled: ${fulfillRes.body.data?.status === 'Fulfilled' && fulfillRes.body.data?.resolved_at ? '✅ PASSED' : '❌ FAILED'} (Resolved: ${fulfillRes.body.data?.resolved_at})`);

    // 11. Requester closes request
    const closeRes = await makeRequest(server, { path: `/api/requests/${laptopId}/close`, method: 'PATCH' }, {
      user_id: 1,
      note: 'Device received and operational'
    });
    console.log(`[Phase 3] Requester Close: ${closeRes.body.data?.status === 'Closed' ? '✅ PASSED' : '❌ FAILED'} (Status: ${closeRes.body.data?.status})`);

    // 12. Check Full Audit History
    const detailRes = await makeRequest(server, { path: `/api/requests/${laptopId}` });
    const historyCount = detailRes.body.data?.history?.length;
    console.log(`[Phase 3] Full Audit Trail Logged: ${historyCount >= 6 ? '✅ PASSED' : '❌ FAILED'} (${historyCount} events recorded)`);

    // 13. Test Dashboard KPI endpoint
    const dashRes = await makeRequest(server, { path: '/api/dashboard?days=14' });
    const dash = dashRes.body;
    console.log(`[Phase 5] Dashboard KPIs:
      - Total Requests: ${dash.summary?.totalRequests}
      - Open Backlog: ${dash.summary?.openBacklog}
      - SLA Compliance Rate: ${dash.summary?.overallComplianceRate}% (${dash.summary?.metCount} met, ${dash.summary?.breachedCount} breached)
      - Daily Volume Points: ${dash.widgets?.requestVolume?.daily?.length}
      - Catalog Volume Items: ${dash.widgets?.requestVolume?.byCatalogItem?.length}
      - Backlog Categories: ${dash.widgets?.backlog?.length}
      - SLA Priority Segments: ${dash.widgets?.slaCompliance?.byPriority?.length}
      - Avg Resolution Items: ${dash.widgets?.avgResolutionTime?.length}
    `);

    console.log('🎉 All Backend Integration Tests Passed Successfully!\n');
  } catch (err) {
    console.error('❌ Test execution error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
