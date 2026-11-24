import React, { useState, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  X,
  AlertTriangle,
  Calendar,
  Wallet as WalletIcon,
  Search,
  Sparkles,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { Transaction, Category, Wallet, AppSettings } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashTransactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  settings: AppSettings;
  onRestoreTransaction: (id: string) => void;
  onPermanentDeleteTransaction: (id: string) => void;
  onEmptyTrash: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  trashTransactions,
  categories,
  wallets,
  settings,
  onRestoreTransaction,
  onPermanentDeleteTransaction,
  onEmptyTrash,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);

  const filteredTrash = useMemo(() => {
    if (!searchTerm.trim()) return trashTransactions;
    const term = searchTerm.toLowerCase();
    return trashTransactions.filter((tx) => {
      const titleMatch = tx.title.toLowerCase().includes(term);
      const noteMatch = tx.note?.toLowerCase().includes(term);
      const cat = categoryMap.get(tx.categoryId);
      const catMatch = cat?.name.toLowerCase().includes(term);
      const wal = walletMap.get(tx.walletId);
      const walMatch = wal?.name.toLowerCase().includes(term);
      return titleMatch || noteMatch || catMatch || walMatch;
    });
  }, [trashTransactions, searchTerm, categoryMap, walletMap]);

  if (!isOpen) return null;

  const getDaysRemaining = (deletedAt?: string | null) => {
    if (!deletedAt) return 30;
    const deletedTime = new Date(deletedAt).getTime();
    if (isNaN(deletedTime)) return 30;
    const elapsedDays = Math.floor((Date.now() - deletedTime) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - elapsedDays);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <Trash2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg">Recycle Bin / Trash</h3>
                <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded-full">
                  {trashTransactions.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Items are safely kept for 30 days before being automatically purged to free space.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar & Search */}
        {trashTransactions.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search deleted transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Empty Trash Button with Confirmation */}
            {confirmEmpty ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertTriangle size={13} /> Purge all?
                </span>
                <button
                  onClick={() => {
                    onEmptyTrash();
                    setConfirmEmpty(false);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Yes, Empty All
                </button>
                <button
                  onClick={() => setConfirmEmpty(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0"
              >
                <Trash2 size={13} />
                <span>Empty Trash</span>
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {trashTransactions.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <Trash2 size={26} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">Recycle Bin is Empty</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Any transactions you delete will be safely stored here for 30 days before being automatically purged.
                </p>
              </div>
            </div>
          ) : filteredTrash.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No deleted transactions match "{searchTerm}"
            </div>
          ) : (
            filteredTrash.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const wal = walletMap.get(tx.walletId);
              const toWal = tx.toWalletId ? walletMap.get(tx.toWalletId) : null;
              const daysLeft = getDaysRemaining(tx.deletedAt);
              const isDeleting = deletingId === tx.id;

              return (
                <div
                  key={tx.id}
                  className="p-3.5 bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Left: Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                      style={{
                        backgroundColor: `${cat?.color || '#94a3b8'}20`,
                        color: cat?.color || '#64748b',
                      }}
                    >
                      {tx.type === 'transfer' ? (
                        <ArrowRightLeft size={18} />
                      ) : (
                        <CategoryIcon name={cat?.icon || 'Tag'} color={cat?.color} size={18} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">{tx.title}</span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                            tx.type === 'income'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : tx.type === 'expense'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <WalletIcon size={12} className="text-slate-400" />
                          <span className="font-medium text-slate-700">
                            {tx.type === 'transfer' && toWal
                              ? `${wal?.name || 'Account'} → ${toWal.name}`
                              : wal?.name || 'Account'}
                          </span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{tx.date}</span>
                        </span>
                        <span>•</span>
                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                          Auto-deletes in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                        </span>
                      </div>

                      {tx.note && (
                        <p className="text-[11px] text-slate-400 italic truncate mt-1">"{tx.note}"</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <span
                      className={`text-base font-black tracking-tight ${
                        tx.type === 'income'
                          ? 'text-emerald-600'
                          : tx.type === 'expense'
                          ? 'text-rose-600'
                          : 'text-indigo-600'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {settings.currencySymbol} {tx.amount.toLocaleString()}
                    </span>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {/* Restore Button */}
                      <button
                        onClick={() => onRestoreTransaction(tx.id)}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                        title="Restore this transaction and update balance"
                      >
                        <RotateCcw size={12} strokeWidth={2.5} />
                        <span>Restore</span>
                      </button>

                      {/* Immediate Permanent Delete */}
                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              onPermanentDeleteTransaction(tx.id);
                              setDeletingId(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                          >
                            Purge Now
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-2 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(tx.id)}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
                          title="Permanently delete immediately from trash"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {trashTransactions.length} {trashTransactions.length === 1 ? 'item' : 'items'} in Recycle Bin
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
