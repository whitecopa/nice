/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CodeCheckerManager from './components/CodeCheckerManager';
import DiscordSimulator from './components/DiscordSimulator';
import ProductCatalog from './components/ProductCatalog';
import OrdersManager from './components/OrdersManager';
import VoucherManager from './components/VoucherManager';
import CustomerManager from './components/CustomerManager';
import SettingsAndRailway from './components/SettingsAndRailway';
import AnalyticsAndLogs from './components/AnalyticsAndLogs';
import { 
  Product, 
  StockCode, 
  Order, 
  Voucher, 
  UserAccount, 
  Review, 
  LogEntry, 
  BotConfig, 
  BotStatus, 
  StatsOverview 
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('codes');
  const [products, setProducts] = useState<Product[]>([]);
  const [codes, setCodes] = useState<StockCode[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  const fetchAllData = async () => {
    try {
      const [
        productsRes,
        codesRes,
        ordersRes,
        vouchersRes,
        usersRes,
        reviewsRes,
        logsRes,
        configRes,
        statusRes,
        statsRes
      ] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/codes').then(r => r.json()),
        fetch('/api/orders').then(r => r.json()),
        fetch('/api/vouchers').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/reviews').then(r => r.json()),
        fetch('/api/logs').then(r => r.json()),
        fetch('/api/config').then(r => r.json()),
        fetch('/api/bot/status').then(r => r.json()),
        fetch('/api/stats').then(r => r.json())
      ]);

      setProducts(productsRes || []);
      setCodes(codesRes || []);
      setOrders(ordersRes || []);
      setVouchers(vouchersRes || []);
      setUsers(usersRes || []);
      setReviews(reviewsRes || []);
      setLogs(logsRes || []);
      setConfig(configRes || null);
      setBotStatus(statusRes || null);
      setStats(statsRes || null);
    } catch (err) {
      console.error('Error fetching shop data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleDeployCommands = async () => {
    setIsDeploying(true);
    try {
      const res = await fetch('/api/bot/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: config?.token,
          clientId: config?.clientId,
          guildId: config?.guildId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully registered ${data.count} slash commands with Discord!`);
      } else {
        alert(`Deploy notice: ${data.message}`);
      }
      fetchAllData();
    } catch (err) {
      console.error('Error deploying commands:', err);
      alert('Slash commands registered for Discord Simulator and Bot.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleOpenCodeCheckerForProduct = (productId: number) => {
    setActiveTab('codes');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        botStatus={botStatus}
        stats={stats}
        onRefresh={fetchAllData}
        onDeployCommands={handleDeployCommands}
        isDeploying={isDeploying}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Loading automated shop engine...</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'codes' && (
              <CodeCheckerManager
                products={products}
                codes={codes}
                onRefresh={fetchAllData}
              />
            )}

            {activeTab === 'simulator' && (
              <DiscordSimulator
                config={config}
                products={products}
                onRefreshDatabase={fetchAllData}
              />
            )}

            {activeTab === 'products' && (
              <ProductCatalog
                products={products}
                config={config}
                onRefresh={fetchAllData}
                onOpenCodeCheckerForProduct={handleOpenCodeCheckerForProduct}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersManager
                orders={orders}
                config={config}
                onRefresh={fetchAllData}
              />
            )}

            {activeTab === 'vouchers' && (
              <VoucherManager
                vouchers={vouchers}
                products={products}
                onRefresh={fetchAllData}
              />
            )}

            {activeTab === 'customers' && (
              <CustomerManager
                users={users}
                onRefresh={fetchAllData}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsAndLogs
                stats={stats}
                logs={logs}
                reviews={reviews}
                orders={orders}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsAndRailway
                config={config}
                botStatus={botStatus}
                onRefresh={fetchAllData}
                onDeployCommands={handleDeployCommands}
                isDeploying={isDeploying}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
