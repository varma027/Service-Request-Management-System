import React, { useState } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import Navbar from './components/Navbar';
import CatalogPage from './pages/CatalogPage';
import MyRequestsPage from './pages/MyRequestsPage';
import ApprovalsQueuePage from './pages/ApprovalsQueuePage';
import FulfillmentQueuePage from './pages/FulfillmentQueuePage';
import DashboardPage from './pages/DashboardPage';
import { ShieldCheck, HelpCircle } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { currentUser } = useUser();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'catalog' && (
          <CatalogPage onNavigateToRequests={() => setActiveTab('requests')} />
        )}
        {activeTab === 'requests' && <MyRequestsPage />}
        {activeTab === 'approvals' && <ApprovalsQueuePage />}
        {activeTab === 'fulfillment' && <FulfillmentQueuePage />}
        {activeTab === 'dashboard' && <DashboardPage />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">ServiceFlow ITSM Simulator</span>
            <span>•</span>
            <span>React (Vite) + Express + SQLite</span>
          </div>
          <div className="flex items-center gap-4">
            <span>SLA Engine Active (1m sync)</span>
            <span>•</span>
            <span className="text-indigo-600 font-semibold">Active Persona: {currentUser?.name} ({currentUser?.role})</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
