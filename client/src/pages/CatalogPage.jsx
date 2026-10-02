import React, { useState, useEffect } from 'react';
import {
  Laptop,
  AppWindow,
  KeyRound,
  UserPlus,
  Lock,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Send,
  X,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import PriorityBadge from '../components/PriorityBadge';

const ITEM_ICONS = {
  'Laptop Request': Laptop,
  'Software Access': AppWindow,
  'VPN Access': KeyRound,
  'New User Onboarding': UserPlus,
  'Password Reset': Lock
};

export default function CatalogPage({ onNavigateToRequests }) {
  const { currentUser } = useUser();
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Form fields
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await api.getCatalog();
        if (res.success) {
          setCatalogItems(res.data);
        }
      } catch (err) {
        console.error('Failed to load catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const openRequestModal = (item) => {
    setSelectedItem(item);
    setPriority('Medium');
    setDescription('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage('Please provide a descriptive reason (at least 5 characters).');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const res = await api.createRequest({
        catalog_item_id: selectedItem.id,
        requester_id: currentUser.id,
        description: description.trim(),
        priority
      });

      if (res.success) {
        setSuccessMessage(`Request REQ-${String(res.data.id).padStart(4, '0')} submitted successfully! Initial status: ${res.data.status}`);
        setTimeout(() => {
          setSelectedItem(null);
          if (onNavigateToRequests) {
            onNavigateToRequests();
          }
        }, 1200);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            IT Service Catalog
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Enterprise Service Catalog</h1>
          <p className="mt-2 text-indigo-100 text-sm leading-relaxed">
            Submit IT requests for hardware provisioning, software licenses, remote access tunnels, and identity services with automated workflow routing and SLA governance.
          </p>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {catalogItems.map((item) => {
          const Icon = ITEM_ICONS[item.name] || Laptop;
          const isTwoLevel = item.requires_it_approval === 1;
          const isNoApproval = item.name === 'Password Reset';

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg hover:border-indigo-200 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Icon className="w-6 h-6 stroke-[2]" />
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                    {item.category}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {item.name}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed min-h-[40px]">
                  {item.description}
                </p>

                {/* Workflow requirements */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      Approvals:
                    </span>
                    <span className={`font-semibold ${
                      isNoApproval ? 'text-teal-700' : isTwoLevel ? 'text-purple-700' : 'text-amber-700'
                    }`}>
                      {isNoApproval ? 'None (Pre-approved)' : isTwoLevel ? '2-Level (Manager + IT)' : '1-Level (Manager)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      SLA Target:
                    </span>
                    <span className="font-semibold text-slate-800">
                      4h (High) / 24h (Med) / 72h (Low)
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="mt-6 pt-2">
                <button
                  onClick={() => openRequestModal(item)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs group-hover:shadow-md"
                >
                  <span>Request Service</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submission Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Request: {selectedItem.name}</h3>
                  <p className="text-xs text-slate-500">Submitting as: <strong className="text-slate-800">{currentUser?.name}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  {successMessage}
                </div>
              )}

              {/* Priority Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Priority & SLA Target <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'High', sla: '4 Hours SLA', color: 'border-red-200 hover:border-red-300' },
                    { val: 'Medium', sla: '24 Hours SLA', color: 'border-amber-200 hover:border-amber-300' },
                    { val: 'Low', sla: '72 Hours SLA', color: 'border-blue-200 hover:border-blue-300' }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setPriority(p.val)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        priority === p.val
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900">{p.val}</span>
                      <span className="text-[10px] text-slate-500">{p.sla}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Business Justification & Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide specifications, software licenses required, business reasons, or relevant details..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Approval Info Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Workflow Routing:</p>
                <p>
                  {selectedItem.name === 'Password Reset'
                    ? '⚡ This standard catalog item is pre-approved and will proceed straight to fulfillment.'
                    : selectedItem.requires_it_approval === 1
                    ? '🛡️ This request requires 2 approval steps: Manager endorsement (Level 1) followed by IT Security review (Level 2).'
                    : '🛡️ This request requires Manager approval (Level 1) before fulfillment.'}
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Confirm & Submit'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
