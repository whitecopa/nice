import React, { useState } from 'react';
import { UserAccount } from '../types';
import { 
  Users, 
  Search, 
  DollarSign, 
  ShieldAlert, 
  ShieldCheck, 
  Plus, 
  Edit, 
  ShoppingBag,
  Clock
} from 'lucide-react';

interface CustomerManagerProps {
  users: UserAccount[];
  onRefresh: () => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  users,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceAction, setBalanceAction] = useState<'add' | 'set'>('add');
  const [blacklistReason, setBlacklistReason] = useState('');
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !balanceAmount) return;

    try {
      await fetch(`/api/users/${selectedUser.user_id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(balanceAmount),
          action: balanceAction
        })
      });
      setIsBalanceModalOpen(false);
      setBalanceAmount('');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBlacklist = async (user: UserAccount) => {
    try {
      await fetch(`/api/users/${user.user_id}/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blacklisted: !user.blacklisted,
          reason: blacklistReason || 'Violating shop terms'
        })
      });
      setIsBlacklistModalOpen(false);
      setBlacklistReason('');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return u.user_id.includes(q) || u.username.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Customer Accounts & Wallets</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage Discord buyer profiles, shop balances, spent history, and moderation blacklists.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Discord ID or tag..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Discord ID</th>
                <th className="py-3 px-4">Wallet Balance</th>
                <th className="py-3 px-4">Orders Placed</th>
                <th className="py-3 px-4">Total Spent</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No customer accounts registered yet.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.user_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-white">
                      {user.username}
                    </td>
                    <td className="py-3 px-4 font-mono text-indigo-400">
                      {user.user_id}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      ${user.balance.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {user.orders_count} orders
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      ${user.total_spent.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        user.blacklisted
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {user.blacklisted ? 'BLACKLISTED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsBalanceModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition"
                        title="Adjust balance"
                      >
                        <DollarSign className="w-3.5 h-3.5 inline mr-0.5" />
                        <span>Balance</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsBlacklistModalOpen(true);
                        }}
                        className={`px-2.5 py-1 rounded text-xs transition ${
                          user.blacklisted
                            ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                            : 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30'
                        }`}
                      >
                        {user.blacklisted ? 'Unban' : 'Blacklist'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Balance Modal */}
      {isBalanceModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Adjust Balance for {selectedUser.username}
            </h3>

            <form onSubmit={handleUpdateBalance} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Action</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setBalanceAction('add')}
                    className={`flex-1 py-1.5 rounded font-medium ${
                      balanceAction === 'add' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    + Add / Deduct
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceAction('set')}
                    className={`flex-1 py-1.5 rounded font-medium ${
                      balanceAction === 'set' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    = Set Exact
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={balanceAmount}
                  onChange={e => setBalanceAmount(e.target.value)}
                  placeholder="25.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBalanceModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blacklist Confirmation Modal */}
      {isBlacklistModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {selectedUser.blacklisted ? 'Unblacklist Customer' : 'Blacklist Customer'}
            </h3>
            <p className="text-xs text-slate-400">
              {selectedUser.blacklisted
                ? `Restore store purchasing access for ${selectedUser.username}?`
                : `Prevent ${selectedUser.username} from purchasing or interacting with the shop bot?`}
            </p>

            {!selectedUser.blacklisted && (
              <div>
                <label className="block text-xs text-slate-300 mb-1">Blacklist Reason</label>
                <input
                  type="text"
                  value={blacklistReason}
                  onChange={e => setBlacklistReason(e.target.value)}
                  placeholder="Chargeback attempt, scam, terms violation..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBlacklistModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleBlacklist(selectedUser)}
                className={`px-4 py-1.5 text-xs font-semibold rounded text-white ${
                  selectedUser.blacklisted ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {selectedUser.blacklisted ? 'Confirm Unban' : 'Confirm Blacklist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerManager;
