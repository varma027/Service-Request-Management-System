import React, { useState, useEffect } from 'react';
import {
  Layers,
  Inbox,
  CheckSquare,
  Wrench,
  BarChart3,
  UserCheck,
  ChevronDown,
  Shield,
  LifeBuoy
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';

export default function Navbar({ activeTab, setActiveTab }) {
  const { users, currentUser, switchUser, isManager, isItApprover, isFulfiller } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [fulfillmentCount, setFulfillmentCount] = useState(0);

  // Periodically fetch queue badge counts
  useEffect(() => {
    async function fetchCounts() {
      try {
        if (currentUser) {
          // Approvals count
          const roleParam = currentUser.role === 'manager' ? 'manager' : currentUser.role === 'it_approver' ? 'it_approver' : undefined;
          if (roleParam) {
            const appr = await api.getApprovals({ role: roleParam });
            setPendingApprovalsCount(appr.data?.length || 0);
          } else {
            setPendingApprovalsCount(0);
          }

          // Fulfillment count
          if (currentUser.role === 'fulfiller') {
            const reqs = await api.getRequests({ status: 'Approved' });
            const inProg = await api.getRequests({ status: 'In Progress' });
            setFulfillmentCount((reqs.data?.length || 0) + (inProg.data?.length || 0));
          } else {
            setFulfillmentCount(0);
          }
        }
      } catch (err) {
        // Silently catch background badge polling errors
      }
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const navItems = [
    { id: 'catalog', label: 'Service Catalog', icon: Layers },
    { id: 'requests', label: 'My Requests', icon: Inbox },
    {
      id: 'approvals',
      label: 'Approvals Queue',
      icon: CheckSquare,
      badge: pendingApprovalsCount,
      visibleTo: isManager || isItApprover
    },
    {
      id: 'fulfillment',
      label: 'Fulfillment Queue',
      icon: Wrench,
      badge: fulfillmentCount,
      visibleTo: isFulfiller
    },
    { id: 'dashboard', label: 'KPI Dashboard', icon: BarChart3 }
  ];

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'it_approver':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'fulfiller':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatRoleName = (role) => {
    switch (role) {
      case 'manager': return 'Manager (L1 Approver)';
      case 'it_approver': return 'IT Approver (L2 Approver)';
      case 'fulfiller': return 'IT Fulfiller (Engineer)';
      default: return 'Service Requester';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">ServiceFlow</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase tracking-wider">
                  ITSM
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Enterprise Service Request Management</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isHighlight = item.badge && item.badge > 0;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Persona / Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                {currentUser?.name?.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="hidden lg:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 leading-tight">{currentUser?.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${getRoleBadgeColor(currentUser?.role)}`}>
                    {currentUser?.role}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 block leading-tight">{formatRoleName(currentUser?.role)}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-2 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 bg-slate-50/80">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Demo Role Switcher</p>
                    <p className="text-xs text-slate-500">Switch user persona to test role-specific workflows:</p>
                  </div>
                  <div className="py-1">
                    {users.map((u) => {
                      const isSelected = u.id === currentUser?.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUser(u.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-indigo-50/60 font-medium' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                              {u.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 leading-tight">{u.name}</p>
                              <p className="text-[11px] text-slate-500">{u.email}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getRoleBadgeColor(u.role)}`}>
                            {u.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
