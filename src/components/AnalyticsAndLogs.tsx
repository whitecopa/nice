import React from 'react';
import { StatsOverview, LogEntry, Review, Order } from '../types';
import { 
  BarChart3, 
  DollarSign, 
  ShoppingBag, 
  KeyRound, 
  Users, 
  Activity, 
  Star,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface AnalyticsAndLogsProps {
  stats: StatsOverview | null;
  logs: LogEntry[];
  reviews: Review[];
  orders: Order[];
}

export const AnalyticsAndLogs: React.FC<AnalyticsAndLogsProps> = ({
  stats,
  logs,
  reviews,
  orders
}) => {
  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Shop Revenue</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            ${stats?.revenue.toFixed(2) || '0.00'}
          </div>
          <span className="text-[11px] text-emerald-400 flex items-center">
            {stats?.completedOrders || 0} completed orders
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Digital Stock Health</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.availableCodes || 0}
          </div>
          <span className="text-[11px] text-slate-400">
            {stats?.totalCodes || 0} total codes imported
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active Products</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalProducts || 0}
          </div>
          <span className="text-[11px] text-slate-400">
            Across multiple categories
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Registered Buyers</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalUsers || 0}
          </div>
          <span className="text-[11px] text-slate-400">
            With tracked wallets
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Activity & Audit Logs */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Live Bot Activity & Audit Logs</h3>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto font-mono text-xs scrollbar-thin">
            {logs.length === 0 ? (
              <p className="text-slate-500 text-center py-8 font-sans">No audit events recorded yet.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-400 uppercase text-[11px]">
                      [{log.type}]
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px] break-all">
                    {JSON.stringify(log.data)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Customer Reviews & Vouches */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Customer Reviews & Vouches</h3>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
            {reviews.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-xs">No vouches received yet. Customers can use <code className="text-indigo-400">/vouch</code> on Discord.</p>
            ) : (
              reviews.map(rev => (
                <div key={rev.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{rev.user_tag}</span>
                    <div className="flex text-amber-400">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-indigo-300 block font-mono">
                    Product: {rev.product_name}
                  </span>
                  <p className="text-xs text-slate-300 italic">
                    "{rev.comment}"
                  </p>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AnalyticsAndLogs;
