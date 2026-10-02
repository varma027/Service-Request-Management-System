import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  BarChart3,
  Calendar,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Inbox,
  TrendingUp,
  Percent
} from 'lucide-react';
import { api } from '../services/api';

const COLORS = {
  indigo: '#4f46e5',
  blue: '#3b82f6',
  teal: '#0d9488',
  amber: '#f59e0b',
  rose: '#e11d48',
  emerald: '#10b981',
  slate: '#64748b'
};

const PIE_COLORS = [COLORS.emerald, COLORS.rose];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState('14'); // '7', '14', '30', 'all'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all', 'High', 'Medium', 'Low'

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard({
        days: daysFilter,
        priority: priorityFilter
      });
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [daysFilter, priorityFilter]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const { summary, widgets } = data || { summary: {}, widgets: {} };

  // Prepare SLA Pie Chart Data
  const slaPieData = [
    { name: 'SLA Met', value: summary?.metCount || 0 },
    { name: 'SLA Breached', value: summary?.breachedCount || 0 }
  ];

  // Backlog colors
  const STATUS_FILLS = {
    'Pending Approval': '#f59e0b',
    'Approved': '#4f46e5',
    'In Progress': '#8b5cf6'
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">ITSM Executive Dashboard</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live KPIs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time analytics on ticket intake velocity, backlog queues, SLA compliance percentages, and turnaround times.
          </p>
        </div>

        {/* Global Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="7">Last 7 Days</option>
              <option value="14">Last 14 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs font-semibold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          <button
            onClick={fetchDashboard}
            title="Refresh dashboard"
            className="p-2 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-500 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Request Volume</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{summary?.totalRequests || 0}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Tickets across selected window</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Open Backlog */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Backlog</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{summary?.openBacklog || 0}</h3>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">Pending approval / in progress</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Inbox className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: SLA Compliance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">SLA Compliance Rate</span>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-2xl font-extrabold text-slate-900">{summary?.overallComplianceRate || 0}%</h3>
              <span className="text-xs text-slate-400">({summary?.metCount} met, {summary?.breachedCount} breached)</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Target SLA: ≥ 90%</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            summary?.overallComplianceRate >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Avg Resolution Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Avg Resolution Time</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{summary?.avgResolutionHours || 0} hrs</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Across {summary?.resolvedTotal || 0} completed tickets</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Widget 1: Request Volume */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                1. Request Volume Trends
              </h3>
              <span className="text-xs font-semibold text-slate-400">Daily intake & by Service</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Volume of service requests submitted over time.</p>
          </div>

          <div className="h-64 w-full">
            {widgets?.requestVolume?.daily?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={widgets.requestVolume.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                    labelFormatter={(d) => `Date: ${d}`}
                  />
                  <Area type="monotone" dataKey="count" stroke={COLORS.indigo} strokeWidth={2.5} fillOpacity={1} fill="url(#volGrad)" name="Requests" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No request volume data in selected range
              </div>
            )}
          </div>

          {/* Breakdown by Catalog Item */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 block mb-2">Volume by Catalog Service</span>
            <div className="space-y-1.5">
              {widgets?.requestVolume?.byCatalogItem?.map((item) => (
                <div key={item.catalog_name} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 truncate max-w-[200px]">{item.catalog_name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{
                          width: `${summary?.totalRequests > 0 ? (item.count / summary.totalRequests) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <span className="font-bold text-slate-900 w-6 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Widget 2: Backlog Analysis */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Inbox className="w-4 h-4 text-amber-500" />
                2. Active Backlog Distribution
              </h3>
              <span className="text-xs font-semibold text-slate-400">Open queues by status</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Tickets currently in work queue needing review or delivery.</p>
          </div>

          <div className="h-64 w-full">
            {widgets?.backlog?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={widgets.backlog} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" name="Open Tickets" radius={[6, 6, 0, 0]}>
                    {widgets.backlog.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_FILLS[entry.status] || COLORS.indigo} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Backlog is completely clear!
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-around text-center">
            {widgets?.backlog?.map((b) => (
              <div key={b.status}>
                <span className="text-[11px] text-slate-500 block">{b.status}</span>
                <span className="text-base font-extrabold text-slate-800">{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 3: SLA Compliance % */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                3. SLA Compliance % (Met vs Breached)
              </h3>
              <span className="text-xs font-semibold text-slate-400">Overall & Per Priority</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Adherence to target SLA resolutions across service priorities.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            
            {/* Donut Chart */}
            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slaPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {slaPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-slate-900">{summary?.overallComplianceRate || 0}%</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Compliance</span>
              </div>
            </div>

            {/* Per Priority Breakdown */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Compliance By Priority Tier</span>
              {widgets?.slaCompliance?.byPriority?.map((p) => (
                <div key={p.priority} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">{p.priority} Priority ({p.total} total)</span>
                    <span className={`font-bold ${p.complianceRate >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {p.complianceRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${p.complianceRate}%` }}
                      title={`Met: ${p.met}`}
                    />
                    <div
                      className="bg-rose-500 h-full"
                      style={{ width: `${100 - p.complianceRate}%` }}
                      title={`Breached: ${p.breached}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>{p.met} met</span>
                    <span className="text-rose-600">{p.breached} breached</span>
                  </div>
                </div>
              ))}
            </div>

          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              SLA Met ({summary?.metCount})
            </span>
            <span className="flex items-center gap-1.5 text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              SLA Breached ({summary?.breachedCount})
            </span>
          </div>
        </div>

        {/* Widget 4: Average Resolution Time */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                4. Average Resolution Time (Hours)
              </h3>
              <span className="text-xs font-semibold text-slate-400">By Service Catalog</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Mean operational turnaround from ticket creation to fulfillment.</p>
          </div>

          <div className="h-64 w-full">
            {widgets?.avgResolutionTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={widgets.avgResolutionTime}
                  margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" unit="h" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="catalog_name" tick={{ fontSize: 10, fill: '#64748b' }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} hours`, 'Avg Resolution Time']}
                  />
                  <Bar dataKey="avg_hours" fill={COLORS.teal} radius={[0, 6, 6, 0]} name="Average Hours" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No resolved ticket history in selected filter
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Overall Fleet Average: <strong className="text-slate-800">{summary?.avgResolutionHours || 0} hrs</strong></span>
            <span>Completed Tickets: <strong className="text-slate-800">{summary?.resolvedTotal || 0}</strong></span>
          </div>
        </div>

      </div>

    </div>
  );
}
