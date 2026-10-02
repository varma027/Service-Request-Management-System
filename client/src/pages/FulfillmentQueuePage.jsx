import React, { useState, useEffect } from 'react';
import {
  Wrench,
  PlayCircle,
  CheckCircle,
  Clock,
  User,
  AlertTriangle,
  RefreshCw,
  Eye,
  MessageSquare,
  X,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaBadge from '../components/SlaBadge';
import TimelineModal from '../components/TimelineModal';

export default function FulfillmentQueuePage() {
  const { currentUser, isFulfiller } = useUser();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' (Approved + In Progress), 'Approved', 'In Progress'
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [fulfillModal, setFulfillModal] = useState(null); // Request being marked fulfilled
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedTimelineReq, setSelectedTimelineReq] = useState(null);

  const fetchFulfillmentQueue = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter === 'Approved') params.status = 'Approved';
      else if (statusFilter === 'In Progress') params.status = 'In Progress';
      if (priorityFilter !== 'All') params.priority = priorityFilter;

      const res = await api.getRequests(params);
      if (res.success) {
        // If active, filter in memory to Approved and In Progress
        let filtered = res.data;
        if (statusFilter === 'active') {
          filtered = res.data.filter(r => r.status === 'Approved' || r.status === 'In Progress');
        }
        // Sort by SLA urgency: breached/soonest due first
        filtered.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
        setRequests(filtered);
      }
    } catch (err) {
      console.error('Failed to load fulfillment queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFulfillmentQueue();
  }, [statusFilter, priorityFilter, currentUser]);

  const handleStartProgress = async (reqId) => {
    try {
      const res = await api.progressRequest(reqId, {
        user_id: currentUser.id,
        note: `Ticket claimed and work started by ${currentUser.name} (IT Fulfiller).`
      });
      if (res.success) {
        setToastMessage(`Request REQ-${String(reqId).padStart(4, '0')} moved to In Progress!`);
        fetchFulfillmentQueue();
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      alert(err.message || 'Error starting progress');
    }
  };

  const handleOpenFulfillModal = (req) => {
    setFulfillModal(req);
    setResolutionNote('');
  };

  const handleConfirmFulfillment = async (e) => {
    e.preventDefault();
    if (!fulfillModal) return;

    try {
      setSubmitting(true);
      const res = await api.fulfillRequest(fulfillModal.id, {
        user_id: currentUser.id,
        note: resolutionNote.trim() || `Hardware/software delivery completed by ${currentUser.name}.`
      });

      if (res.success) {
        setToastMessage(`Request REQ-${String(fulfillModal.id).padStart(4, '0')} successfully Fulfilled!`);
        setFulfillModal(null);
        fetchFulfillmentQueue();
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err) {
      alert(err.message || 'Error fulfilling request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenTimeline = async (reqId) => {
    try {
      const res = await api.getRequestById(reqId);
      if (res.success) {
        setSelectedTimelineReq(res.data);
      }
    } catch (err) {
      console.error('Failed to load details:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Fulfillment Queue</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold border border-teal-200">
              {requests.length} Open Workorders
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pick up approved service tickets, execute IT service delivery, and record completion notes.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs outline-none"
          >
            <option value="active">All Active (Approved & In Progress)</option>
            <option value="Approved">Approved (Ready to Start)</option>
            <option value="In Progress">In Progress (Underway)</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <button
            onClick={fetchFulfillmentQueue}
            title="Refresh queue"
            className="p-2 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-500 shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Role Tip Banner */}
      {!isFulfiller && (
        <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl flex items-start gap-3 text-xs text-teal-900">
          <Sparkles className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Demo Tip: Testing Fulfiller Workflows</p>
            <p className="text-teal-700 mt-0.5">
              You are currently viewing as <strong>{currentUser?.name}</strong> ({currentUser?.role}). Use the role switcher to switch to <strong>Diana Prince (Fulfiller)</strong> to test claiming workorders and fulfilling tickets.
            </p>
          </div>
        </div>
      )}

      {/* Queue Cards */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <CheckCircle className="w-12 h-12 text-teal-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Tickets Waiting for Fulfillment!</h3>
          <p className="text-xs text-slate-500 mt-1">All approved requests have been resolved or closed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((r) => {
            const isApproved = r.status === 'Approved';
            const isInProgress = r.status === 'In Progress';

            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                
                {/* Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      REQ-{String(r.id).padStart(4, '0')}
                    </span>
                    <StatusBadge status={r.status} />
                    <PriorityBadge priority={r.priority} showSla={true} />
                    <SlaBadge request={r} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{r.catalog_name}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{r.description}"
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Requester: <strong className="text-slate-700">{r.requester_name}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Created: {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleOpenTimeline(r.id)}
                      className="text-teal-700 hover:text-teal-900 underline font-medium"
                    >
                      View audit history
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  {isApproved && (
                    <button
                      onClick={() => handleStartProgress(r.id)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Start Progress</span>
                    </button>
                  )}

                  {isInProgress && (
                    <button
                      onClick={() => handleOpenFulfillModal(r)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Mark Fulfilled</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Fulfillment Resolution Modal */}
      {fulfillModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="px-6 py-4 border-b border-teal-100 bg-teal-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Complete Fulfillment</h3>
                  <p className="text-xs text-slate-500">
                    REQ-{String(fulfillModal.id).padStart(4, '0')} • {fulfillModal.catalog_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFulfillModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmFulfillment} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Resolution & Delivery Notes
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Record serial numbers, license keys assigned, software provisioned, or handover instructions..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <p>
                  Fulfillment Engineer: <strong>{currentUser?.name}</strong>
                </p>
                <p className="text-slate-500">
                  Completing this ticket will set the resolution timestamp, calculate SLA compliance, and invite the requester to close the request.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFulfillModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  {submitting ? 'Recording...' : 'Confirm Fulfilled'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Audit modal */}
      {selectedTimelineReq && (
        <TimelineModal
          request={selectedTimelineReq}
          onClose={() => setSelectedTimelineReq(null)}
        />
      )}

    </div>
  );
}
