import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRightLeft } from 'lucide-react';
import { Transaction, Category, Wallet, TransactionType } from '../types';
import { isDebtAccount, isDebtSettlementTx, getDebtTransferType } from '../utils/debt';

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
  const [toWalletId, setToWalletId] = useState('');
  const [isDebtSettlement, setIsDebtSettlement] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setTitle(editingTransaction.title);
      setAmount(editingTransaction.amount.toString());
      setCategoryId(editingTransaction.categoryId);
      setWalletId(editingTransaction.walletId);
      setToWalletId(editingTransaction.toWalletId || '');
      setIsDebtSettlement(isDebtSettlementTx(editingTransaction));
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
      const initialWalletId = defaultWalletId || wallets[0]?.id || '';
      setWalletId(initialWalletId);
      const otherWallet = wallets.find((w) => w.id !== initialWalletId);
      const initialToId = otherWallet?.id || wallets[1]?.id || '';
      setToWalletId(initialToId);
      setIsDebtSettlement(
        isDebtAccount(wallets.find((w) => w.id === initialWalletId)) ||
        isDebtAccount(otherWallet)
      );
      setDate(new Date().toISOString().split('T')[0]);
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setNote('');
    }
  }, [isOpen, editingTransaction, defaultWalletId]);

  const fromWallet = wallets.find((w) => w.id === walletId);
  const toWallet = wallets.find((w) => w.id === toWalletId);
  const debtType = getDebtTransferType(fromWallet, toWallet);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));
  const selectedCategory = categories.find((c) => c.id === categoryId) || filteredCategories[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    if (type === 'transfer') {
      if (!toWalletId || walletId === toWalletId) {
        alert('Please select two different accounts for the transfer (From and To).');
        return;
      }
    }

    let createdTimestamp = editingTransaction?.createdAt || Date.now();
    if (date && time) {
      const [h, m] = time.split(':');
      const dt = new Date(date);
      if (!isNaN(dt.getTime())) {
        dt.setHours(parseInt(h || '0', 10), parseInt(m || '0', 10), 0, 0);
        createdTimestamp = dt.getTime();
      }
    }

    const transferCategory = categories.find((c) => c.id === 'cat-balance-correction') || categories[0];
    const activeCategory = type === 'transfer' ? transferCategory : selectedCategory;
    const defaultTitle = type === 'transfer'
      ? `${fromWallet?.name || 'Account'} → ${toWallet?.name || 'Account'}`
      : (selectedCategory?.name || 'Untitled');

    const finalTitle = title.trim() || defaultTitle;
    let finalNote = note.trim();
    if (type === 'transfer') {
      if (debtType === 'loan') {
        const defaultNote = `[Loan Given]\nTransferred Balance\n${fromWallet?.name} → ${toWallet?.name}`;
        finalNote = finalNote ? (finalNote.includes('[Loan Given]') ? finalNote : `[Loan Given] ${finalNote}`) : defaultNote;
      } else if (debtType === 'repayment') {
        const defaultNote = `[Debt Settlement]\nTransferred Balance\n${fromWallet?.name} → ${toWallet?.name}`;
        finalNote = finalNote ? (finalNote.includes('[Debt Settlement]') ? finalNote : `[Debt Settlement] ${finalNote}`) : defaultNote;
      } else {
        const defaultNote = `Transferred Balance\n${fromWallet?.name} → ${toWallet?.name}`;
        finalNote = finalNote || defaultNote;
      }
    }

    onSave({
      id: editingTransaction ? editingTransaction.id : undefined,
      type,
      title: finalTitle,
      amount: numAmount,
      categoryId: activeCategory?.id || 'cat-balance-correction',
      walletId: walletId || wallets[0]?.id || 'wal-main',
      toWalletId: type === 'transfer' ? toWalletId : undefined,
      date,
      time,
      createdAt: createdTimestamp,
      note: finalNote,
      isDebtSettlement: type === 'transfer' ? (debtType !== 'standard') : false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-slate-900 text-base sm:text-lg">
            {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
            {/* Type Toggle Pills */}
            <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-2xl text-xs font-bold gap-1">
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
            <button
              type="button"
              onClick={() => {
                setType('transfer');
                if (!toWalletId || toWalletId === walletId) {
                  const otherWallet = wallets.find((w) => w.id !== walletId);
                  if (otherWallet) setToWalletId(otherWallet.id);
                }
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                type === 'transfer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft size={13} strokeWidth={2.5} />
              <span>Transfer</span>
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {type === 'transfer' ? 'Transfer Amount' : 'Amount'} ({currencySymbol})
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

          {/* Account / Category Selection */}
          {type === 'transfer' ? (
            <div className="space-y-2.5 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
              <div className="flex items-center justify-between text-[11px] font-black text-indigo-900 uppercase tracking-wider">
                <span>Transfer Routing</span>
                <span className="text-indigo-600 font-semibold normal-case">
                  {isDebtSettlement ? 'Debt / Lent Settlement' : 'Deducts from source, adds to destination'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider mb-1">
                    From Account
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => {
                      const newFrom = e.target.value;
                      setWalletId(newFrom);
                      if (toWalletId === newFrom) {
                        const alt = wallets.find((w) => w.id !== newFrom);
                        if (alt) setToWalletId(alt.id);
                      }
                    }}
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-white border border-indigo-200 rounded-xl focus:outline-hidden cursor-pointer shadow-2xs"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({currencySymbol}{w.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider mb-1">
                    To Account
                  </label>
                  <select
                    value={toWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-white border border-indigo-200 rounded-xl focus:outline-hidden cursor-pointer shadow-2xs"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id} disabled={w.id === walletId}>
                        {w.name} ({currencySymbol}{w.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Debt / Loan Routing Information Card */}
              <div
                className={`p-2.5 rounded-xl border transition-all ${
                  debtType === 'loan'
                    ? 'bg-purple-50/90 border-purple-200 text-purple-950'
                    : debtType === 'repayment'
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                    : 'bg-white/80 border-indigo-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">
                    {debtType === 'loan' ? '💸' : debtType === 'repayment' ? '🤝' : '⇄'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">
                        {debtType === 'loan'
                          ? 'Giving Loan / Lending Money'
                          : debtType === 'repayment'
                          ? 'Loan Repayment Received'
                          : 'Account Transfer'}
                      </span>
                      {debtType !== 'standard' && (
                        <span
                          className={`text-[9px] text-white font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                            debtType === 'loan' ? 'bg-purple-600' : 'bg-emerald-600'
                          }`}
                        >
                          {debtType === 'loan' ? 'LOAN GIVEN' : 'SETTLEMENT'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 truncate mt-0.5">
                      {debtType === 'loan'
                        ? `Deducts from ${fromWallet?.name || 'Bank'} and increases ${toWallet?.name || 'Contact'}'s loan balance (more negative)`
                        : debtType === 'repayment'
                        ? `Receives into ${toWallet?.name || 'Account'} and settles ${fromWallet?.name || 'Contact'}'s debt towards Rs 0`
                        : `Transfers funds directly from ${fromWallet?.name || 'Source'} to ${toWallet?.name || 'Destination'}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Category & Wallet Dropdowns */
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
          )}

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
              placeholder={
                type === 'transfer'
                  ? `e.g. ${fromWallet?.name || 'From'} → ${toWallet?.name || 'To'}`
                  : selectedCategory
                  ? `e.g. ${selectedCategory.name}`
                  : "e.g. Trader Joe's, Gas, Salary"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-semibold px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
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

          {/* Optional Note (Multiline) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Optional Note
            </label>
            <textarea
              rows={3}
              placeholder="Add details, multiline notes, reference numbers..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-y"
            />
          </div>

          </div>

          {/* Sticky Docked Action Buttons */}
          <div className="p-3.5 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-white/95 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm transition-all cursor-pointer ${
                type === 'transfer'
                  ? debtType === 'loan'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : debtType === 'repayment'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              <Check size={16} strokeWidth={2.5} />
              <span>
                {editingTransaction
                  ? 'Update Entry'
                  : type === 'transfer'
                  ? debtType === 'loan'
                    ? 'Give Loan & Transfer'
                    : debtType === 'repayment'
                    ? 'Settle Debt & Transfer'
                    : 'Transfer Funds'
                  : 'Save Entry'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
