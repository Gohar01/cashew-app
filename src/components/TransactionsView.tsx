import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  SlidersHorizontal,
} from 'lucide-react';
import { Transaction, Category, Wallet, TransactionType } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatTransactionTime, formatTransactionDate } from '../utils/date';
import { isDebtSettlementTx } from '../utils/debt';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  currencySymbol: string;
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  selectedWallet?: string;
  onSelectWallet?: (walletId: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  wallets,
  currencySymbol,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
  selectedWallet,
  onSelectWallet,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [internalWallet, setInternalWallet] = useState<string>('all');
  const [displayLimit, setDisplayLimit] = useState<number>(60);

  const activeWallet = selectedWallet !== undefined ? selectedWallet : internalWallet;
  const setActiveWallet = (wId: string) => {
    setInternalWallet(wId);
    if (onSelectWallet) onSelectWallet(wId);
  };

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search filter
        if (searchTerm) {
          const cat = categoryMap.get(tx.categoryId);
          const term = searchTerm.toLowerCase();
          const matchTitle = tx.title.toLowerCase().includes(term);
          const matchNote = tx.note?.toLowerCase().includes(term);
          const matchCat = cat?.name.toLowerCase().includes(term);
          if (!matchTitle && !matchNote && !matchCat) return false;
        }

        // Type filter
        if (selectedType !== 'all' && tx.type !== selectedType) return false;

        // Category filter
        if (selectedCategory !== 'all' && tx.categoryId !== selectedCategory) return false;

        // Wallet filter
        if (activeWallet !== 'all' && tx.walletId !== activeWallet) return false;

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedType, selectedCategory, activeWallet, categoryMap]);

  // Slice for high-performance rendering of thousands of records
  const displayTransactions = useMemo(() => {
    return filteredTransactions.slice(0, displayLimit);
  }, [filteredTransactions, displayLimit]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-6">
      {/* Top Controls Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, note, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          {/* Add Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Transaction</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold mr-1">
            <SlidersHorizontal size={14} />
            <span>Filters:</span>
          </div>

          {/* Type Toggle Pills */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 font-medium">
            {['all', 'expense', 'income', 'transfer'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                  selectedType === t
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-100 border border-slate-200/80 rounded-xl px-2.5 py-1 text-slate-700 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Wallet Dropdown */}
          <select
            value={activeWallet}
            onChange={(e) => setActiveWallet(e.target.value)}
            className="bg-slate-100 border border-slate-200/80 rounded-xl px-2.5 py-1 text-slate-700 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Accounts</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(searchTerm || selectedType !== 'all' || selectedCategory !== 'all' || activeWallet !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
                setSelectedCategory('all');
                setActiveWallet('all');
              }}
              className="text-amber-600 hover:text-amber-700 font-bold ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found</span>
          <span>Sorted by Date (Newest first)</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-semibold text-slate-700">No matching transactions found.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayTransactions.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const wal = walletMap.get(tx.walletId);
              const toWal = tx.toWalletId ? walletMap.get(tx.toWalletId) : null;
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';
              const isDebt = isDebtSettlementTx(tx);

              return (
                <div
                  key={tx.id}
                  className="p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <CategoryIcon
                      name={isDebt ? 'Handshake' : isTransfer ? 'ArrowRightLeft' : (cat?.icon || 'Tag')}
                      color={isDebt ? '#059669' : isTransfer ? '#4f46e5' : (cat?.color || (isIncome ? '#10b981' : '#f59e0b'))}
                      size={20}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {tx.title}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          isDebt
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            : isTransfer
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isDebt ? '🤝 Debt Settled' : isTransfer ? 'Transfer' : (cat?.name || 'Category')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 sm:gap-2 mt-1 truncate">
                        <span className="font-semibold text-slate-500">{formatTransactionDate(tx.date)}</span>
                        {formatTransactionTime(tx.createdAt, tx.time) && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                            {formatTransactionTime(tx.createdAt, tx.time)}
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-slate-600 font-medium">
                          {isTransfer && toWal ? `${wal?.name || 'Wallet'} → ${toWal.name}` : (wal?.name || 'Wallet')}
                        </span>
                        {tx.note && (
                          <>
                            <span>•</span>
                            <span className="italic truncate text-slate-500">"{tx.note}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-base font-black ${
                          isIncome ? 'text-emerald-600' : isTransfer ? 'text-indigo-600' : 'text-slate-900'
                        }`}
                      >
                        {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        {tx.type}
                      </div>
                    </div>

                    {/* Action buttons on hover */}
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditTransaction(tx)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit transaction"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete transaction"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load More Pagination */}
            {filteredTransactions.length > displayLimit && (
              <div className="p-4 bg-slate-50 text-center flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  Showing <strong>{displayTransactions.length}</strong> of{' '}
                  <strong>{filteredTransactions.length.toLocaleString()}</strong> transactions
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 100)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                  >
                    Load 100 More
                  </button>
                  <button
                    onClick={() => setDisplayLimit(filteredTransactions.length)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    Show All ({filteredTransactions.length.toLocaleString()})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
