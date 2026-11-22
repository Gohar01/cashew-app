import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Transaction, Category, Wallet, TransactionType } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Partial<Transaction>) => void;
  editingTransaction?: Transaction | null;
  defaultWalletId?: string;
  categories: Category[];
  wallets: Wallet[];
  currencySymbol: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  defaultWalletId,
  categories,
  wallets,
  currencySymbol,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setTitle(editingTransaction.title);
      setAmount(editingTransaction.amount.toString());
      setCategoryId(editingTransaction.categoryId);
      setWalletId(editingTransaction.walletId);
      setDate(editingTransaction.date);
      if (editingTransaction.createdAt) {
        const d = new Date(editingTransaction.createdAt);
        setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      }
      setNote(editingTransaction.note || '');
    } else {
      setType('expense');
      setTitle('');
      setAmount('');
      const defaultCat = categories.find((c) => c.type === 'expense');
      setCategoryId(defaultCat ? defaultCat.id : (categories[0]?.id || ''));
      setWalletId(defaultWalletId || wallets[0]?.id || '');
      setDate(new Date().toISOString().split('T')[0]);
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setNote('');
    }
  }, [editingTransaction, defaultWalletId, isOpen, categories, wallets]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));
  const selectedCategory = categories.find((c) => c.id === categoryId) || filteredCategories[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    let createdTimestamp = editingTransaction?.createdAt || Date.now();
    if (date && time) {
      const [h, m] = time.split(':');
      const dt = new Date(date);
      if (!isNaN(dt.getTime())) {
        dt.setHours(parseInt(h || '0', 10), parseInt(m || '0', 10), 0, 0);
        createdTimestamp = dt.getTime();
      }
    }

    const finalTitle = title.trim() || selectedCategory?.name || 'Untitled';

    onSave({
      id: editingTransaction ? editingTransaction.id : undefined,
      type,
      title: finalTitle,
      amount: numAmount,
      categoryId: categoryId || filteredCategories[0]?.id || 'cat-other-exp',
      walletId: walletId || wallets[0]?.id || 'wal-main',
      date,
      time,
      createdAt: createdTimestamp,
      note: note.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-lg">
            {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Toggle Pills */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const cat = categories.find((c) => c.type === 'expense');
                if (cat) setCategoryId(cat.id);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                const cat = categories.find((c) => c.type === 'income');
                if (cat) setCategoryId(cat.id);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Amount ({currencySymbol})
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-2xl font-black pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                autoFocus
              />
            </div>
          </div>

          {/* Title Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Title / Description
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                Optional
              </span>
            </div>
            <input
              type="text"
              placeholder={selectedCategory ? `e.g. ${selectedCategory.name}` : "e.g. Trader Joe's, Gas, Salary"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-semibold px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Category & Wallet Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
              >
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Account / Wallet
              </label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Time
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Optional Note
            </label>
            <input
              type="text"
              placeholder="Details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all cursor-pointer"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>{editingTransaction ? 'Update Entry' : 'Save Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
