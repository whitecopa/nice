import React from 'react';
import { BotStatus, StatsOverview } from '../types';
import { 
  Bot, 
  Terminal, 
  KeyRound, 
  ShoppingBag, 
  Receipt, 
  Gift, 
  Users, 
  Settings, 
  BarChart3, 
  Radio, 
  RefreshCw, 
  Layers,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  botStatus: BotStatus | null;
  stats: StatsOverview | null;
  onRefresh: () => void;
  onDeployCommands: () => void;
  isDeploying: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  botStatus,
  stats,
  onRefresh,
  onDeployCommands,
  isDeploying
}) => {
  const tabs = [
    { id: 'codes', label: 'Automated Code Checker', icon: KeyRound, badge: stats?.availableCodes },
    { id: 'simulator', label: 'Discord Bot Simulator', icon: Terminal },
    { id: 'products', label: 'Product Catalog', icon: ShoppingBag, badge: stats?.totalProducts },
    { id: 'orders', label: 'Orders & Payments', icon: Receipt, badge: stats?.pendingOrders ? `${stats.pendingOrders} pending` : undefined },
    { id: 'vouchers', label: 'Vouchers & Redeem', icon: Gift },
    { id: 'customers', label: 'Customers', icon: Users, badge: stats?.totalUsers },
    { id: 'analytics', label: 'Analytics & Logs', icon: BarChart3 },
    { id: 'settings', label: 'Railway & Config', icon: Settings },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      {/* Top Banner / Status Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-slate-800/80">
          {/* Logo & Bot Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-white tracking-tight">Discord Shop Bot</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  v2.5 Pro
                </span>
              </div>
              <p className="text-xs text-slate-400">Automated Digital Shop & Code Checker</p>
            </div>
          </div>

          {/* Quick Metrics & Bot Status */}
          <div className="flex items-center space-x-4">
            {/* Status Pill */}
            <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/70 px-3 py-1.5 rounded-lg text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${botStatus?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-200 font-medium">
                {botStatus?.isConnected ? 'Discord Bot Online' : 'Simulator Ready'}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 font-mono">
                {botStatus?.ping && botStatus.ping > 0 ? `${botStatus.ping}ms` : 'Ready'}
              </span>
            </div>

            {/* Deploy Slash Commands button */}
            <button
              id="deploy-commands-btn"
              onClick={onDeployCommands}
              disabled={isDeploying}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
              title="Sync slash commands with Discord"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isDeploying ? 'Syncing...' : 'Deploy Commands'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
export default Navbar;
