import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Wallet } from '../types';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wallet: Wallet) => void;
  currencySymbol: string;
}

const WALLET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
];

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currencySymbol,
}) => {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [type, setType] = useState<Wallet['type']>('bank');
  const [color, setColor] = useState(WALLET_COLORS[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numBalance = parseFloat(balance) || 0;

    onSave({
      id: `wal-${Date.now()}`,
      name: name.trim() || 'New Account',
      balance: numBalance,
      currency: 'USD',
      color,
      icon: type === 'cash' ? 'Banknote' : type === 'card' ? 'CreditCard' : 'Landmark',
      type,
    });

    setName('');
    setBalance('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-lg">Add Account or Wallet</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Account Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Chase Checking, Cash Wallet, Revolut"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-semibold px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Starting Balance ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full text-sm font-bold px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Account Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Wallet['type'])}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
              >
                <option value="bank">Bank Account</option>
                <option value="cash">Cash in Hand</option>
                <option value="savings">Savings Account</option>
                <option value="card">Credit Card</option>
                <option value="other">Other / Digital</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Color Tag
            </label>
            <div className="flex items-center gap-2">
              {WALLET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    color === c ? 'scale-125 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
            >
              <Check size={16} />
              <span>Add Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
