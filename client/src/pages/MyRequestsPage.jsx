import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaBadge from '../components/SlaBadge';
import TimelineModal from '../components/TimelineModal';

export default function MyRequestsPage() {
  const { currentUser } = useUser();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('mine'); // 'mine' or 'all'
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [closingId, setClosingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterMode === 'mine' && currentUser?.id) {
        params.requester_id = currentUser.id;
      }
      if (statusFilter !== 'All') {
        params.status = statusFilter;
      }
      if (priorityFilter !== 'All') {
        params.priority = priorityFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.getRequests(params);
      if (res.success) {
        setRequests(res.data);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser, filterMode, statusFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleOpenTimeline = async (reqId) => {
    try {
      const res = await api.getRequestById(reqId);
      if (res.success) {
        setSelectedRequest(res.data);
      }
    } catch (err) {
      console.error('Failed to load details:', err);
    }
  };

  const handleCloseTicket = async (reqId) => {
    try {
      setClosingId(reqId);
      const res = await api.closeRequest(reqId, {
        user_id: currentUser.id,
        note: `Closed by ${currentUser.name} after verification of service fulfillment.`
      });
      if (res.success) {
        setActionMessage(`Request REQ-${String(reqId).padStart(4, '0')} has been closed!`);
        fetchRequests();
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch (err) {
      alert(err.message || 'Error closing request');
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Scope Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Service Requests</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track status progression, live SLA countdowns, and audit histories.
          </p>
        </div>

        {/* Scope selector */}
        <div className="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-200 text-xs">
          <button
            onClick={() => setFilterMode('mine')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterMode === 'mine'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Requests ({currentUser?.name.split(' ')[0]})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterMode === 'all'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Organization Requests
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search request description, item name, or requester..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </form>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="In Progress">In Progress</option>
            <option value="Fulfilled">Fulfilled</option>
            <option value="Closed">Closed</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <button
            onClick={fetchRequests}
            title="Refresh list"
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No requests found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or browse the catalog to submit a request.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Catalog Item</th>
                  <th className="py-3 px-4">Requester</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA Target</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {requests.map((r) => {
                  const isFulfilled = r.status === 'Fulfilled';
                  const isOwner = currentUser?.id === r.requester_id;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Ticket ID */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                        REQ-{String(r.id).padStart(4, '0')}
                      </td>

                      {/* Item & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-bold text-slate-900 block">{r.catalog_name}</span>
                        <p className="text-slate-500 text-[11px] truncate mt-0.5">{r.description}</p>
                      </td>

                      {/* Requester */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 block">{r.requester_name}</span>
                        <span className="text-[10px] text-slate-400">{r.requester_email}</span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={r.priority} />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.status} />
                      </td>

                      {/* SLA Timer */}
                      <td className="py-3.5 px-4">
                        <SlaBadge request={r} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Close button for fulfilled requests */}
                          {isFulfilled && (
                            <button
                              onClick={() => handleCloseTicket(r.id)}
                              disabled={closingId === r.id}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{closingId === r.id ? 'Closing...' : 'Close Ticket'}</span>
                            </button>
                          )}

                          {/* View Audit Trail */}
                          <button
                            onClick={() => handleOpenTimeline(r.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                            title="View Audit Trail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Trail Modal */}
      {selectedRequest && (
        <TimelineModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}

    </div>
  );
}
