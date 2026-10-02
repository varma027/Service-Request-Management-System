import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

const PRIORITY_CONFIG = {
  'High': {
    bg: 'bg-red-50 text-red-700 border-red-200',
    icon: ArrowUp,
    sla: '4h SLA'
  },
  'Medium': {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Minus,
    sla: '24h SLA'
  },
  'Low': {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: ArrowDown,
    sla: '72h SLA'
  }
};

export default function PriorityBadge({ priority, showSla = false }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.Medium;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border ${config.bg}`}>
      <Icon className="w-3 h-3 stroke-[2.5]" />
      <span>{priority}</span>
      {showSla && <span className="text-[10px] opacity-75 ml-0.5">({config.sla})</span>}
    </span>
  );
}
