import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Format milliseconds into human-readable duration (e.g. "2h 15m 30s")
 */
function formatDuration(ms) {
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);

  const totalSeconds = Math.floor(absMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let str = '';
  if (days > 0) {
    str += `${days}d `;
  }
  if (hours > 0 || days > 0) {
    str += `${hours}h `;
  }
  str += `${minutes}m ${seconds}s`;

  return isNegative ? `-${str}` : str;
}

/**
 * SlaBadge component
 * Displays real-time live ticking countdown timer with Breached, At Risk (<20%), or Healthy badges.
 */
export default function SlaBadge({ request, showDetails = false }) {
  const [timeState, setTimeState] = useState(computeState());

  function computeState() {
    if (!request || !request.due_at) return null;

    const now = Date.now();
    const created = new Date(request.created_at).getTime();
    const due = new Date(request.due_at).getTime();
    const totalDuration = due - created;

    // Resolved / Closed
    if (request.resolved_at) {
      const resolved = new Date(request.resolved_at).getTime();
      const breached = resolved > due || request.sla_breached === 1;
      const durationMs = resolved - created;
      return {
        type: 'resolved',
        breached,
        resolvedIn: formatDuration(durationMs)
      };
    }

    // Rejected
    if (request.status === 'Rejected') {
      return {
        type: 'rejected'
      };
    }

    // Open ticket
    const remainingMs = due - now;
    const isBreached = remainingMs <= 0 || request.sla_breached === 1;
    const percentLeft = Math.max(0, Math.min(100, (remainingMs / totalDuration) * 100));
    const isAtRisk = !isBreached && percentLeft <= 20;

    return {
      type: 'open',
      breached: isBreached,
      atRisk: isAtRisk,
      remainingMs,
      percentLeft: Math.round(percentLeft),
      formatted: formatDuration(remainingMs)
    };
  }

  useEffect(() => {
    // Only tick for open tickets
    if (request.status === 'Fulfilled' || request.status === 'Closed' || request.status === 'Rejected') {
      return;
    }

    const timer = setInterval(() => {
      setTimeState(computeState());
    }, 1000);

    return () => clearInterval(timer);
  }, [request.due_at, request.status, request.resolved_at, request.sla_breached]);

  if (!timeState) return null;

  if (timeState.type === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        N/A (Rejected)
      </span>
    );
  }

  if (timeState.type === 'resolved') {
    if (timeState.breached) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          Breached ({timeState.resolvedIn})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Met SLA ({timeState.resolvedIn})
      </span>
    );
  }

  // Open ticket states
  if (timeState.breached) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
        BREACHED ({timeState.formatted})
      </span>
    );
  }

  if (timeState.atRisk) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        At Risk ({timeState.formatted} left)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Clock className="w-3.5 h-3.5 text-emerald-600" />
      {timeState.formatted} left
    </span>
  );
}
