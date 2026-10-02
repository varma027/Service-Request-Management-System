/**
 * API Service Client
 * Encapsulates all backend REST calls for ITSM Service Request Management System.
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  // Catalog
  getCatalog: () => request('/catalog'),

  // Users
  getUsers: () => request('/users'),

  // Requests
  getRequests: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return request(`/requests${queryString ? `?${queryString}` : ''}`);
  },

  getRequestById: (id) => request(`/requests/${id}`),

  createRequest: ({ catalog_item_id, requester_id, description, priority }) =>
    request('/requests', {
      method: 'POST',
      body: { catalog_item_id, requester_id, description, priority }
    }),

  progressRequest: (id, { user_id, note }) =>
    request(`/requests/${id}/progress`, {
      method: 'PATCH',
      body: { user_id, note }
    }),

  fulfillRequest: (id, { user_id, note }) =>
    request(`/requests/${id}/fulfill`, {
      method: 'PATCH',
      body: { user_id, note }
    }),

  closeRequest: (id, { user_id, note }) =>
    request(`/requests/${id}/close`, {
      method: 'PATCH',
      body: { user_id, note }
    }),

  // Approvals
  getApprovals: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return request(`/approvals${queryString ? `?${queryString}` : ''}`);
  },

  decideApproval: (id, { approver_id, decision, comments }) =>
    request(`/approvals/${id}/decide`, {
      method: 'POST',
      body: { approver_id, decision, comments }
    }),

  // Dashboard
  getDashboard: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return request(`/dashboard${queryString ? `?${queryString}` : ''}`);
  }
};
