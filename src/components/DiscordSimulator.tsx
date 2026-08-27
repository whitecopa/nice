import React, { useState, useRef, useEffect } from 'react';
import { BotConfig, Product } from '../types';
import { 
  Terminal, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  HelpCircle, 
  Layers, 
  CornerDownLeft,
  ShoppingBag,
  CreditCard,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface DiscordSimulatorProps {
  config: BotConfig | null;
  products: Product[];
  onRefreshDatabase: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  userTag: string;
  avatarBg: string;
  timestamp: string;
  commandText?: string;
  content?: string;
  embeds?: any[];
  components?: any[];
  isEphemeral?: boolean;
}

export const DiscordSimulator: React.FC<DiscordSimulatorProps> = ({
  config,
  products,
  onRefreshDatabase
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'bot',
      userTag: 'ShopBot#0001 (Automated)',
      avatarBg: 'bg-indigo-600',
      timestamp: 'Today at 12:00 PM',
      content: '👋 Welcome to the **Discord Shop Bot Interactive Simulator**! Type `/shop`, `/buy`, `/checkcodes`, `/checkpayment`, or `/redeem` below to test the bot commands live with the store database.'
    }
  ]);

  const [inputCommand, setInputCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeUserTag, setActiveUserTag] = useState('WhiteCopa (Admin)');
  const [activeUserId, setActiveUserId] = useState('985810642818703401');
  const [activeIsAdmin, setActiveIsAdmin] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickCommands = [
    { label: '/shop', cmd: '/shop', desc: 'Browse store catalog' },
    { label: '/stock', cmd: '/stock', desc: 'View live inventory' },
    { label: '/buy Nitro', cmd: '/buy product:"Discord Nitro" quantity:1', desc: 'Instant purchase' },
    { label: '/checkcodes', cmd: '/checkcodes product:"Steam Random"', desc: 'Automated code check' },
    { label: '/balance', cmd: '/balance', desc: 'Check account balance' },
    { label: '/redeem WELCOME10', cmd: '/redeem code:WELCOME10', desc: 'Redeem $10 gift code' },
    { label: '/orders', cmd: '/orders', desc: 'View recent purchases' },
    { label: '/stats', cmd: '/stats', desc: 'Admin sales stats' },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Execute Command
  const handleSendCommand = async (cmdToRun?: string) => {
    const raw = (cmdToRun || inputCommand).trim();
    if (!raw) return;

    setInputCommand('');

    // Parse command
    let commandName = raw.startsWith('/') ? raw.slice(1).split(' ')[0].toLowerCase() : raw.split(' ')[0].toLowerCase();
    const args: Record<string, any> = {};

    // Simple arg parser for key:value or key:"value"
    const regex = /(\w+):(?:"([^"]*)"|'([^']*)'|(\S+))/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      const key = match[1];
      const val = match[2] || match[3] || match[4];
      args[key] = isNaN(Number(val)) ? val : Number(val);
    }

    // Positional fallback for /buy or /redeem if no flags provided
    const parts = raw.split(' ');
    if (commandName === 'buy' && !args.product && parts[1]) {
      args.product = parts.slice(1).join(' ').replace(/"/g, '');
    }
    if (commandName === 'redeem' && !args.code && parts[1]) {
      args.code = parts[1];
    }
    if (commandName === 'pay' && !args.order && parts[1]) {
      args.order = parts[1];
    }
    if (commandName === 'checkpayment' && !args.order && parts[1]) {
      args.order = parts[1];
    }

    // Add user message
    const userMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      userTag: activeUserTag,
      avatarBg: activeIsAdmin ? 'bg-indigo-500' : 'bg-emerald-500',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      commandText: raw
    };

    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/simulate-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: commandName,
          args,
          user: {
            id: activeUserId,
            tag: activeUserTag,
            isAdmin: activeIsAdmin
          }
        })
      });

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        userTag: 'ShopBot#0001 (Automated)',
        avatarBg: 'bg-indigo-600',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: data.content,
        embeds: data.embeds,
        components: data.components,
        isEphemeral: data.ephemeral
      };

      setMessages(prev => [...prev, botMsg]);
      onRefreshDatabase();
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          userTag: 'ShopBot#0001 (Automated)',
          avatarBg: 'bg-indigo-600',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: '❌ Failed to execute command on the bot server.'
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Interactive Buttons & Select Menus clicked in chat
  const handleInteractionClick = async (customId: string, values: string[] = []) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/simulate-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customId,
          values,
          user: {
            id: activeUserId,
            tag: activeUserTag,
            isAdmin: activeIsAdmin
          }
        })
      });

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'bot',
        userTag: 'ShopBot#0001 (Automated)',
        avatarBg: 'bg-indigo-600',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: data.content,
        embeds: data.embeds,
        components: data.components,
        isEphemeral: data.ephemeral
      };

      setMessages(prev => [...prev, botMsg]);
      onRefreshDatabase();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'cleared-1',
        sender: 'bot',
        userTag: 'ShopBot#0001 (Automated)',
        avatarBg: 'bg-indigo-600',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: '🧹 Terminal cleared. Ready for new commands!'
      }
    ]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main Terminal Window (Discord Theme) */}
      <div className="lg:col-span-8 bg-[#313338] border border-slate-700/80 rounded-2xl flex flex-col h-[750px] shadow-2xl overflow-hidden">
        {/* Discord Channel Header */}
        <div className="bg-[#2B2D31] px-4 py-3 border-b border-[#1F2023] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="text-slate-400 font-bold text-lg">#</span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white tracking-wide">🛒・shop-automated</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#1E1F22] text-emerald-400 rounded font-mono">
                  ACTIVE SYNC
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Automated shop channel • Instant code check & delivery</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearHistory}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#35373C] rounded transition"
              title="Clear terminal history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm scrollbar-thin">
          {messages.map(msg => (
            <div key={msg.id} className="flex items-start space-x-3 group">
              <div className={`w-9 h-9 rounded-full ${msg.avatarBg} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md`}>
                {msg.sender === 'bot' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>

              <div className="flex-1 space-y-1.5 overflow-hidden">
                {/* Sender & Timestamp */}
                <div className="flex items-center space-x-2">
                  <span className={`font-semibold text-xs ${msg.sender === 'bot' ? 'text-indigo-400' : 'text-slate-200'}`}>
                    {msg.userTag}
                  </span>
                  {msg.sender === 'bot' && (
                    <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1 rounded uppercase tracking-wider">
                      BOT
                    </span>
                  )}
                  {msg.isEphemeral && (
                    <span className="text-[10px] text-slate-400 italic">
                      (Only you can see this • Ephemeral)
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500">{msg.timestamp}</span>
                </div>

                {/* Command bubble if user */}
                {msg.commandText && (
                  <div className="bg-[#2B2D31] text-indigo-300 font-mono text-xs px-3 py-1.5 rounded-lg inline-block border border-slate-700/50">
                    {msg.commandText}
                  </div>
                )}

                {/* Text Content */}
                {msg.content && (
                  <div className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                )}

                {/* Discord Embeds */}
                {msg.embeds && msg.embeds.map((embed, idx) => (
                  <div
                    key={idx}
                    className="bg-[#2B2D31] border-l-4 border-indigo-500 rounded-r-lg p-3.5 max-w-xl space-y-2 shadow-md"
                  >
                    {embed.title && (
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        {embed.title}
                      </h4>
                    )}
                    {embed.description && (
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {embed.description}
                      </p>
                    )}
                    {embed.fields && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {embed.fields.map((field: any, fIdx: number) => (
                          <div key={fIdx} className={field.inline ? 'col-span-1' : 'col-span-2'}>
                            <span className="text-[11px] font-bold text-slate-400 block">{field.name}</span>
                            <span className="text-xs text-slate-200 font-mono">{field.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {embed.footer && (
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                        {embed.footer.text}
                      </div>
                    )}
                  </div>
                ))}

                {/* Interactive Components (Action Rows, Buttons, Menus) */}
                {msg.components && msg.components.map((row, rIdx) => (
                  <div key={rIdx} className="flex flex-wrap gap-2 pt-1">
                    {row.components?.map((comp: any, cIdx: number) => {
                      if (comp.type === 3) {
                        // String Select Menu
                        return (
                          <div key={cIdx} className="w-full max-w-md">
                            <select
                              onChange={e => handleInteractionClick(comp.custom_id, [e.target.value])}
                              className="w-full bg-[#1E1F22] border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">{comp.placeholder || 'Select an option...'}</option>
                              {comp.options?.map((opt: any, oIdx: number) => (
                                <option key={oIdx} value={opt.value}>
                                  {opt.label} — {opt.description}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      // Button style styling
                      let styleClass = 'bg-[#4E5058] hover:bg-[#6D6F78] text-white';
                      if (comp.style === 1) styleClass = 'bg-[#5865F2] hover:bg-[#4752C4] text-white'; // Primary Blurple
                      if (comp.style === 3) styleClass = 'bg-[#248046] hover:bg-[#1A6334] text-white'; // Success Green
                      if (comp.style === 4) styleClass = 'bg-[#DA373C] hover:bg-[#A1282C] text-white'; // Danger Red

                      return (
                        <button
                          key={cIdx}
                          disabled={comp.disabled || isProcessing}
                          onClick={() => handleInteractionClick(comp.custom_id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition shadow-sm disabled:opacity-50 ${styleClass}`}
                        >
                          {comp.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#2B2D31] border-t border-[#1F2023]">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendCommand();
            }}
            className="flex items-center bg-[#383A40] rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500"
          >
            <span className="text-slate-400 font-bold mr-2 text-sm">/</span>
            <input
              id="simulator-input-field"
              type="text"
              value={inputCommand}
              onChange={e => setInputCommand(e.target.value)}
              placeholder='Try typing "shop", "buy Nitro", "checkcodes", "redeem WELCOME10", "balance"...'
              className="flex-1 bg-transparent text-slate-100 text-xs focus:outline-none placeholder-slate-500 font-mono"
            />
            <button
              type="submit"
              disabled={isProcessing || !inputCommand.trim()}
              className="p-1.5 text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Simulator Control Panel (Right Sidebar) */}
      <div className="lg:col-span-4 space-y-6">
        {/* User Identity Switcher */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Simulated Discord User</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Username / Tag</label>
              <input
                type="text"
                value={activeUserTag}
                onChange={e => setActiveUserTag(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Discord User ID</label>
              <input
                type="text"
                value={activeUserId}
                onChange={e => setActiveUserId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-300">Admin Permissions</span>
              <button
                type="button"
                onClick={() => setActiveIsAdmin(!activeIsAdmin)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  activeIsAdmin
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {activeIsAdmin ? 'Administrator' : 'Customer Only'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Command Launcher */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Quick Command Shortcuts</h3>
            </div>
            <span className="text-[10px] text-slate-500">1-Click Test</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {quickCommands.map((qc, i) => (
              <button
                key={i}
                onClick={() => handleSendCommand(qc.cmd)}
                disabled={isProcessing}
                className="flex items-center justify-between p-2.5 bg-slate-800/80 hover:bg-slate-800 hover:border-indigo-500/40 border border-slate-700/60 rounded-lg text-left transition group"
              >
                <div>
                  <span className="font-mono text-xs text-indigo-300 font-semibold block group-hover:text-indigo-200">
                    {qc.label}
                  </span>
                  <span className="text-[10px] text-slate-400">{qc.desc}</span>
                </div>
                <CornerDownLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default DiscordSimulator;
