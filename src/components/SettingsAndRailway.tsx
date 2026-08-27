import React, { useState } from 'react';
import { BotConfig, BotStatus } from '../types';
import { 
  Settings, 
  Server, 
  ShieldCheck, 
  Save, 
  Copy, 
  Check, 
  ExternalLink, 
  Play, 
  Square, 
  RefreshCw, 
  AlertCircle,
  HelpCircle,
  Cpu
} from 'lucide-react';

interface SettingsAndRailwayProps {
  config: BotConfig | null;
  botStatus: BotStatus | null;
  onRefresh: () => void;
  onDeployCommands: () => void;
  isDeploying: boolean;
}

export const SettingsAndRailway: React.FC<SettingsAndRailwayProps> = ({
  config,
  botStatus,
  onRefresh,
  onDeployCommands,
  isDeploying
}) => {
  const [token, setToken] = useState(config?.token || '');
  const [clientId, setClientId] = useState(config?.clientId || '');
  const [guildId, setGuildId] = useState(config?.guildId || '');
  const [ownerId, setOwnerId] = useState(config?.ownerId || '');
  const [autoDelivery, setAutoDelivery] = useState(config?.autoDelivery ?? true);
  const [currencySymbol, setCurrencySymbol] = useState(config?.currencySymbol || '$');
  const [paymentTimeout, setPaymentTimeout] = useState(config?.paymentTimeoutMinutes || 30);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingBot, setIsStartingBot] = useState(false);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          clientId,
          guildId,
          ownerId,
          autoDelivery,
          currencySymbol,
          paymentTimeoutMinutes: Number(paymentTimeout)
        })
      });
      alert('Configuration saved successfully!');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartBot = async () => {
    if (!token) {
      alert('Please configure your Discord Bot Token first.');
      return;
    }
    setIsStartingBot(true);
    try {
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Failed to start Discord client: ${data.message}`);
      } else {
        alert(`Connected to Discord as ${data.user}!`);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsStartingBot(false);
    }
  };

  const handleStopBot = async () => {
    try {
      await fetch('/api/bot/stop', { method: 'POST' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const railwayEnvSnippet = `DISCORD_TOKEN=${token || 'YOUR_BOT_TOKEN'}
CLIENT_ID=${clientId || 'YOUR_APPLICATION_ID'}
GUILD_ID=${guildId || 'YOUR_SERVER_ID'}
OWNER_ID=${ownerId || 'YOUR_DISCORD_USER_ID'}
PORT=3000
NODE_ENV=production`;

  const copyRailwayEnv = () => {
    navigator.clipboard.writeText(railwayEnvSnippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Bot Configuration & Railway Hosting</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure Discord API credentials, payment channels, auto-delivery parameters, and 24/7 Railway deployment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Discord Credentials & Parameters */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Discord Application Credentials</span>
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Discord Bot Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Bot token from Discord Developer Portal..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Keep this secret! Used to log the bot into your Discord server.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Client / Application ID
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    placeholder="123456789012345678"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Guild / Server ID
                  </label>
                  <input
                    type="text"
                    value={guildId}
                    onChange={e => setGuildId(e.target.value)}
                    placeholder="123456789012345678"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Owner / Administrator Discord User ID
                </label>
                <input
                  type="text"
                  value={ownerId}
                  onChange={e => setOwnerId(e.target.value)}
                  placeholder="Your Discord user ID for admin command bypass..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={e => setCurrencySymbol(e.target.value)}
                    placeholder="$"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Order Expiry (Minutes)</label>
                  <input
                    type="number"
                    value={paymentTimeout}
                    onChange={e => setPaymentTimeout(Number(e.target.value))}
                    placeholder="30"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-200 font-medium block">Automated Code Delivery</span>
                  <span className="text-slate-400 text-[11px]">
                    Automatically reserve and send unique codes from stock when paid
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoDelivery}
                  onChange={e => setAutoDelivery(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg transition shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Bot Process Status & Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Live Discord Gateway Connection</span>
            </h3>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${botStatus?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="font-semibold text-white text-xs">
                    {botStatus?.isConnected ? `Connected: ${botStatus.userTag}` : 'Gateway Idle'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {botStatus?.isConnected ? `Servers: ${botStatus.guildCount} | Latency: ${botStatus.ping}ms` : 'Simulator is active. Click "Connect Bot" to connect live bot token to Discord Gateway.'}
                </span>
              </div>

              <div className="flex space-x-2">
                {botStatus?.isConnected ? (
                  <button
                    onClick={handleStopBot}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-lg transition"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartBot}
                    disabled={isStartingBot}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shadow"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{isStartingBot ? 'Connecting...' : 'Connect Bot'}</span>
                  </button>
                )}

                <button
                  onClick={onDeployCommands}
                  disabled={isDeploying}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                  title="Deploy Slash Commands to Discord Guild"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isDeploying ? 'Deploying...' : 'Deploy Slash Commands'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Railway Hosting Guide & Env Snippets */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-indigo-500/20 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Railway Deployment Guide</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This repository is fully configured for 24/7 hosting on <strong>Railway</strong> with healthchecks, persistent storage, and automatic slash command sync.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg space-y-1.5 border border-slate-800">
                <span className="font-bold text-indigo-300 block">Step 1: Connect Repository to Railway</span>
                <p className="text-slate-400 text-[11px]">
                  Go to <a href="https://railway.app" target="_blank" rel="noreferrer" className="text-indigo-400 underline">railway.app</a>, click <strong>"New Project"</strong> → <strong>"Deploy from GitHub repo"</strong> and select your repository.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg space-y-2 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300">Step 2: Add Environment Variables</span>
                  <button
                    onClick={copyRailwayEnv}
                    className="flex items-center space-x-1 text-[10px] text-slate-300 hover:text-white bg-slate-800 px-2 py-0.5 rounded"
                  >
                    {copiedEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedEnv ? 'Copied!' : 'Copy RAW'}</span>
                  </button>
                </div>
                <pre className="p-2 bg-slate-900 rounded font-mono text-[10px] text-slate-300 overflow-x-auto whitespace-pre">
                  {railwayEnvSnippet}
                </pre>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg space-y-1 border border-slate-800">
                <span className="font-bold text-indigo-300 block">Step 3: Instant 24/7 Execution</span>
                <p className="text-slate-400 text-[11px]">
                  Railway uses <code className="text-indigo-300">railway.json</code> with start command <code className="text-indigo-300">npm run start</code> and continuous healthcheck at <code className="text-indigo-300">/api/health</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsAndRailway;
