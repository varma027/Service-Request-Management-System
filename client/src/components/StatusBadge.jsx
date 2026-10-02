import React from 'react';
import {
  Clock,
  CheckCircle,
  FileCheck,
  AlertOctagon,
  CheckCheck,
  Loader2,
  Sparkles
} from 'lucide-react';

const STATUS_CONFIG = {
  'New': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Sparkles
  },
  'Pending Approval': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock
  },
  'Approved': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: CheckCircle
  },
  'In Progress': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: Loader2,
    spin: true
  },
  'Fulfilled': {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: FileCheck
  },
  'Closed': {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    icon: CheckCheck
  },
  'Rejected': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: AlertOctagon
  }
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: Sparkles
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <Icon className={`w-3.5 h-3.5 ${config.spin ? 'animate-spin' : ''}`} />
      {status}
    </span>
  );
}
