import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  ShieldCheck,
  MessageSquare,
  X,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import PriorityBadge from '../components/PriorityBadge';
import SlaBadge from '../components/SlaBadge';
import TimelineModal from '../components/TimelineModal';

export default function ApprovalsQueuePage() {
  const { currentUser, isManager, isItApprover } = useUser();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState(
    isManager ? '1' : isItApprover ? '2' : 'all'
  );
  const [decisionModal, setDecisionModal] = useState(null); // { item, type: 'approved' | 'rejected' }
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [viewHistoryItem, setViewHistoryItem] = useState(null);

  // Sync default filter if role changes
  useEffect(() => {
    if (isManager) setLevelFilter('1');
    else if (isItApprover) setLevelFilter('2');
    else setLevelFilter('all');
  }, [currentUser?.role]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const params = { decision: 'pending' };
      if (levelFilter !== 'all') {
        params.level = levelFilter;
      }
      const res = await api.getApprovals(params);
      if (res.success) {
        setApprovals(res.data);
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [levelFilter, currentUser]);

  const handleOpenDecision = (item, type) => {
    setDecisionModal({ item, type });
    setComments('');
  };

  const handleConfirmDecision = async (e) => {
    e.preventDefault();
    if (!decisionModal) return;

    try {
      setSubmitting(true);
      const res = await api.decideApproval(decisionModal.item.approval_id, {
        approver_id: currentUser.id,
        decision: decisionModal.type,
        comments: comments.trim()
      });

      if (res.success) {
        setToastMessage(`Request REQ-${String(decisionModal.item.request_id).padStart(4, '0')} has been ${decisionModal.type}!`);
        setDecisionModal(null);
        fetchApprovals();
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err) {
      alert(err.message || 'Error recording approval decision');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewHistory = async (requestId) => {
    try {
      const res = await api.getRequestById(requestId);
      if (res.success) {
        setViewHistoryItem(res.data);
      }
    } catch (err) {
      console.error('Failed to load ticket details:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Approvals Gateway</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
              {approvals.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review and adjudicate service requests requiring management endorsement and IT security verification.
          </p>
        </div>

        {/* Filter by Approval Tier */}
        <div className="flex items-center gap-2">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs outline-none"
          >
            <option value="all">All Pending Levels</option>
            <option value="1">Level 1: Manager Endorsement</option>
            <option value="2">Level 2: IT Security & Architecture</option>
          </select>
          <button
            onClick={fetchApprovals}
            title="Refresh list"
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

      {/* Role Context Helper Banner */}
      {(!isManager && !isItApprover) && (
        <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl flex items-start gap-3 text-xs text-indigo-900">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Demo Tip: Testing Approver Workflows</p>
            <p className="text-indigo-700 mt-0.5">
              You are currently viewing as <strong>{currentUser?.name}</strong> ({currentUser?.role}). Use the role switcher in the top right to switch to <strong>Bob Smith (Manager)</strong> for Level 1 approvals or <strong>Charlie Davis (IT Approver)</strong> for Level 2 approvals.
            </p>
          </div>
        </div>
      )}

      {/* Approvals Cards / List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Approvals Queue is Clear!</h3>
          <p className="text-xs text-slate-500 mt-1">There are no pending requests waiting for this approval tier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {approvals.map((appr) => (
            <div
              key={appr.approval_id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              
              {/* Request Info */}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    REQ-{String(appr.request_id).padStart(4, '0')}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    appr.level === 1
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    Level {appr.level}: {appr.level === 1 ? 'Manager Review' : 'IT Security Review'}
                  </span>
                  <PriorityBadge priority={appr.priority} showSla={true} />
                  <SlaBadge
                    request={{
                      created_at: appr.created_at,
                      due_at: appr.due_at,
                      status: appr.request_status,
                      sla_breached: appr.sla_breached,
                      resolved_at: null
                    }}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{appr.catalog_name}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    "{appr.description}"
                  </p>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Requester: <strong className="text-slate-700">{appr.requester_name}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Submitted: {new Date(appr.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleViewHistory(appr.request_id)}
                    className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                  >
                    View audit trail
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                <button
                  onClick={() => handleOpenDecision(appr, 'rejected')}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => handleOpenDecision(appr, 'approved')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              decisionModal.type === 'approved' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
            }`}>
              <div className="flex items-center gap-2.5">
                {decisionModal.type === 'approved' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {decisionModal.type === 'approved' ? 'Approve Request' : 'Reject Request'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    REQ-{String(decisionModal.item.request_id).padStart(4, '0')} • {decisionModal.item.catalog_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDecisionModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDecision} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Decision Notes & Comments {decisionModal.type === 'rejected' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    decisionModal.type === 'approved'
                      ? 'Add any conditions, budget allocation codes, or approval remarks (optional)...'
                      : 'Provide justification for rejection (required)...'
                  }
                  required={decisionModal.type === 'rejected'}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600">
                <p>
                  Approving as: <strong>{currentUser?.name}</strong> ({currentUser?.role})
                </p>
                <p className="mt-0.5 text-slate-500">
                  {decisionModal.type === 'rejected'
                    ? '⚠️ Rejection is terminal. The request will be closed and requester notified.'
                    : decisionModal.item.requires_it_approval === 1 && decisionModal.item.level === 1
                    ? '➡️ Level 1 endorsement will forward this request to Level 2 (IT Security).'
                    : '✅ Final approval will move this request to the Fulfillment Queue.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition-colors shadow-xs ${
                    decisionModal.type === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? 'Submitting...' : `Confirm ${decisionModal.type === 'approved' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* History modal */}
      {viewHistoryItem && (
        <TimelineModal
          request={viewHistoryItem}
          onClose={() => setViewHistoryItem(null)}
        />
      )}

    </div>
  );
}
