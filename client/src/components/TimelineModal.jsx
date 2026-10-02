import React from 'react';
import { X, Check, XOctagon, Clock, User, ShieldCheck, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import SlaBadge from './SlaBadge';

export default function TimelineModal({ request, onClose }) {
  if (!request) return null;

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-slate-200 text-slate-700">
              REQ-{String(request.id).padStart(4, '0')}
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">{request.catalog_name}</h3>
              <p className="text-xs text-slate-500">Requested by {request.requester_name} ({request.requester_email})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Metadata Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-500 block mb-1">Status</span>
              <StatusBadge status={request.status} />
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Priority</span>
              <PriorityBadge priority={request.priority} showSla={true} />
            </div>
            <div>
              <span className="text-slate-500 block mb-1">SLA Status</span>
              <SlaBadge request={request} />
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Created At</span>
              <span className="font-medium text-slate-800">{formatDate(request.created_at)}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Request Description</h4>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {request.description}
            </div>
          </div>

          {/* Approvals Chain */}
          {request.approvals && request.approvals.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Approval Gateways</h4>
              <div className="space-y-2.5">
                {request.approvals.map((appr) => (
                  <div
                    key={appr.id}
                    className={`p-3.5 rounded-xl border flex items-start justify-between text-xs transition-all ${
                      appr.decision === 'approved'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : appr.decision === 'rejected'
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1 rounded-full ${
                        appr.decision === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : appr.decision === 'rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {appr.decision === 'approved' && <Check className="w-3.5 h-3.5" />}
                        {appr.decision === 'rejected' && <XOctagon className="w-3.5 h-3.5" />}
                        {appr.decision === 'pending' && <Clock className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            Level {appr.level}: {appr.level === 1 ? 'Manager Approval' : 'IT Approver'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-medium text-[11px] capitalize ${
                            appr.decision === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : appr.decision === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {appr.decision}
                          </span>
                        </div>
                        {appr.approver_name && (
                          <p className="text-slate-600 mt-1">
                            Decided by <span className="font-medium text-slate-800">{appr.approver_name}</span> on {formatDate(appr.decided_at)}
                          </p>
                        )}
                        {appr.comments && (
                          <p className="mt-1.5 text-slate-700 bg-white/80 p-2 rounded border border-slate-200/60 italic">
                            "{appr.comments}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit History Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Audit Trail History</h4>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {request.history && request.history.map((hist, idx) => (
                <div key={hist.id || idx} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 mt-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                  <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={hist.status} />
                        {hist.changed_by_name && (
                          <span className="text-slate-600 font-medium flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {hist.changed_by_name}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[11px]">{formatDate(hist.changed_at)}</span>
                    </div>
                    {hist.note && (
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed">{hist.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
