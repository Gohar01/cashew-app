import React, { useState, useRef, useMemo } from 'react';
import {
  Wallet as WalletIcon,
  Plus,
  Landmark,
  Banknote,
  PiggyBank,
  CreditCard,
  Trash2,
  GripVertical,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Edit2,
  Receipt,
  Layers,
  Calendar,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { Wallet, Transaction, Category } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatTransactionTime, formatTransactionDate } from '../utils/date';

interface WalletsViewProps {
  wallets: Wallet[];
  transactions?: Transaction[];
  categories?: Category[];
  currencySymbol: string;
  onOpenAddWallet: () => void;
  onDeleteWallet: (id: string) => void;
  onReorderWallets?: (wallets: Wallet[]) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onAddTransactionForWallet?: (walletId: string) => void;
  onNavigateToTransactionsWithWallet?: (walletId: string) => void;
}

const WALLET_ICONS: Record<string, React.ElementType> = {
  bank: Landmark,
  cash: Banknote,
  savings: PiggyBank,
  card: CreditCard,
  other: WalletIcon,
};

export const WalletsView: React.FC<WalletsViewProps> = ({
  wallets,
  transactions = [],
  categories = [],
  currencySymbol,
  onOpenAddWallet,
  onDeleteWallet,
  onReorderWallets,
  onEditTransaction,
  onDeleteTransaction,
  onAddTransactionForWallet,
  onNavigateToTransactionsWithWallet,
}) => {
  // Search & Type Filter for Accounts Tab
  const [accountSearch, setAccountSearch] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  // Selected Wallet for Ledger / Statement View
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [ledgerDisplayLimit, setLedgerDisplayLimit] = useState<number>(60);
  const [includeLinkedSubAccounts, setIncludeLinkedSubAccounts] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'transactions' | 'envelopes'>('transactions');

  const touchSourceIndex = useRef<number | null>(null);
  const touchCurrentTargetIndex = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  // Lookup maps
  const walletMap = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Transaction count map by wallet
  const walletTxCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      map.set(t.walletId, (map.get(t.walletId) || 0) + 1);
      if (t.toWalletId) {
        map.set(t.toWalletId, (map.get(t.toWalletId) || 0) + 1);
      }
    }
    return map;
  }, [transactions]);

  // Helper: compute actual combined physical balance for a wallet
  const getActualPhysicalBalance = (
    wallet: Wallet
  ): {
    actualBalance: number;
    calculatedSum: number;
    discrepancy: number;
    linkedWallets: Wallet[];
  } => {
    const isMeezan = wallet.id === 'wal-meezan' || wallet.name.toLowerCase().includes('meezan');
    let linkedIds = wallet.linkedAccountIds ? [...wallet.linkedAccountIds] : [];
    if (isMeezan && !linkedIds.includes('wal-charity')) {
      linkedIds.push('wal-charity');
    }

    if (linkedIds.length === 0) {
      const reconciled = wallet.reconciledBalance ?? (isMeezan ? 68804.39 : undefined);
      return {
        actualBalance: reconciled ?? wallet.balance,
        calculatedSum: wallet.balance,
        discrepancy: 0,
        linkedWallets: [],
      };
    }

    const linked = linkedIds
      .map((id) => walletMap.get(id))
      .filter(Boolean) as Wallet[];
    const subTotal = linked.reduce((acc, w) => acc + w.balance, 0);
    const calculatedSum = wallet.balance + subTotal;

    const reconciled = wallet.reconciledBalance ?? (isMeezan ? 68804.39 : undefined);
    const actualBalance = reconciled !== undefined ? reconciled : calculatedSum;
    const discrepancy = calculatedSum - actualBalance;

    return {
      actualBalance,
      calculatedSum,
      discrepancy,
      linkedWallets: linked,
    };
  };

  // Filtered wallets list for main Accounts Tab based on search & category filter
  const filteredWallets = useMemo(() => {
    return wallets.filter((wallet) => {
      // Type filter
      if (accountTypeFilter !== 'all' && wallet.type !== accountTypeFilter) {
        return false;
      }

      // Search query
      if (accountSearch.trim()) {
        const q = accountSearch.toLowerCase();
        const parentW = wallet.parentWalletId ? walletMap.get(wallet.parentWalletId) : null;
        const linkedWNames = (wallet.linkedAccountIds || [])
          .map((id) => walletMap.get(id)?.name.toLowerCase() || '')
          .join(' ');

        const matchName = wallet.name.toLowerCase().includes(q);
        const matchType = wallet.type.toLowerCase().includes(q);
        const matchMonthly = wallet.monthlyNote?.toLowerCase().includes(q);
        const matchParent = parentW?.name.toLowerCase().includes(q);
        const matchLinked = linkedWNames.includes(q);

        if (!matchName && !matchType && !matchMonthly && !matchParent && !matchLinked) {
          return false;
        }
      }

      return true;
    });
  }, [wallets, accountSearch, accountTypeFilter, walletMap]);

  // Active wallet details
  const activeDetailWallet = useMemo(() => {
    return wallets.find((w) => w.id === selectedWalletId) || null;
  }, [wallets, selectedWalletId]);

  // Combined linked wallets for active modal
  const activeLinkedWallets = useMemo(() => {
    if (!activeDetailWallet) return [];
    return getActualPhysicalBalance(activeDetailWallet).linkedWallets;
  }, [activeDetailWallet, walletMap]);

  // Total transactions count across active wallet + linked sub accounts
  const totalCombinedTxsCount = useMemo(() => {
    if (!activeDetailWallet) return 0;
    let count = walletTxCountMap.get(activeDetailWallet.id) || 0;
    for (const lw of activeLinkedWallets) {
      count += walletTxCountMap.get(lw.id) || 0;
    }
    return count;
  }, [activeDetailWallet, activeLinkedWallets, walletTxCountMap]);

  // Transactions against active detail wallet (with optional sub-accounts like Dad, Extra, MCF, MIACF, etc.)
  const walletTransactions = useMemo(() => {
    if (!selectedWalletId || !activeDetailWallet) return [];

    const allowedWalletIds = new Set<string>([selectedWalletId]);
    if (includeLinkedSubAccounts) {
      for (const lw of activeLinkedWallets) {
        allowedWalletIds.add(lw.id);
      }
    }

    return transactions
      .filter((t) => allowedWalletIds.has(t.walletId) || (t.toWalletId && allowedWalletIds.has(t.toWalletId)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedWalletId, includeLinkedSubAccounts, activeDetailWallet, activeLinkedWallets]);

  // Filtered transactions in the ledger modal
  const filteredWalletTransactions = useMemo(() => {
    return walletTransactions.filter((tx) => {
      if (ledgerTypeFilter !== 'all' && tx.type !== ledgerTypeFilter) return false;
      if (ledgerSearch.trim()) {
        const query = ledgerSearch.toLowerCase();
        const cat = categoryMap.get(tx.categoryId);
        const wal = walletMap.get(tx.walletId);
        const matchTitle = tx.title.toLowerCase().includes(query);
        const matchNote = tx.note?.toLowerCase().includes(query);
        const matchCat = cat?.name.toLowerCase().includes(query);
        const matchWal = wal?.name.toLowerCase().includes(query);
        if (!matchTitle && !matchNote && !matchCat && !matchWal) return false;
      }
      return true;
    });
  }, [walletTransactions, ledgerTypeFilter, ledgerSearch, categoryMap, walletMap]);

  // Sliced for high performance rendering of thousands of records
  const displayedWalletTransactions = useMemo(() => {
    return filteredWalletTransactions.slice(0, ledgerDisplayLimit);
  }, [filteredWalletTransactions, ledgerDisplayLimit]);

  // Inflow / Outflow stats for active detail wallet
  const walletStats = useMemo(() => {
    if (!selectedWalletId) return { inflow: 0, outflow: 0, count: 0 };
    let inflow = 0;
    let outflow = 0;
    for (const t of walletTransactions) {
      if (t.type === 'income' || t.toWalletId === selectedWalletId) {
        inflow += t.amount;
      } else {
        outflow += t.amount;
      }
    }
    return { inflow, outflow, count: walletTransactions.length };
  }, [walletTransactions, selectedWalletId]);

  const moveWallet = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || !onReorderWallets) return;
    const updated = [...wallets];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onReorderWallets(updated);

    setReorderNotice(`Moved "${moved.name}" to position #${toIndex + 1}`);
    setTimeout(() => setReorderNotice(null), 2500);
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    hasDraggedRef.current = true;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveWallet(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 100);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 100);
  };

  // Touch handlers for mobile
  const handleTouchStart = (index: number) => {
    hasDraggedRef.current = true;
    touchSourceIndex.current = index;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchSourceIndex.current === null) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = element?.closest('[data-wallet-index]') as HTMLElement | null;
    if (card && card.dataset.walletIndex) {
      const targetIdx = parseInt(card.dataset.walletIndex, 10);
      if (!isNaN(targetIdx) && targetIdx !== dragOverIndex) {
        touchCurrentTargetIndex.current = targetIdx;
        setDragOverIndex(targetIdx);
      }
    }
  };

  const handleTouchEnd = () => {
    if (
      touchSourceIndex.current !== null &&
      touchCurrentTargetIndex.current !== null &&
      touchSourceIndex.current !== touchCurrentTargetIndex.current
    ) {
      moveWallet(touchSourceIndex.current, touchCurrentTargetIndex.current);
    }
    touchSourceIndex.current = null;
    touchCurrentTargetIndex.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 100);
  };

  const handleCardClick = (wallet: Wallet) => {
    if (hasDraggedRef.current || isReorderMode) return;
    setSelectedWalletId(wallet.id);
    setModalTab('transactions');
    setLedgerSearch('');
    setLedgerTypeFilter('all');
    setLedgerDisplayLimit(60);
    setIncludeLinkedSubAccounts(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <WalletIcon size={20} className="text-amber-500" />
            <h3 className="font-bold text-slate-900 text-lg">Accounts & Wallets</h3>
          </div>
          <p className="text-xs text-slate-600">
            Combined Total:{' '}
            <span className="font-black text-slate-900">
              {currencySymbol}
              {totalBalance.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>{' '}
            across {wallets.length} accounts •{' '}
            <span className="text-amber-600 font-semibold">Click any account to view statement</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Reorder Mode Toggle */}
          <button
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              isReorderMode
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Toggle drag & reorder mode"
          >
            {isReorderMode ? (
              <>
                <Check size={15} className="text-amber-700" />
                <span>Done Reordering</span>
              </>
            ) : (
              <>
                <ArrowUpDown size={15} />
                <span>Reorder Accounts</span>
              </>
            )}
          </button>

          {/* Add Account Button */}
          <button
            onClick={onOpenAddWallet}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Floating Reorder Feedback */}
      {reorderNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600" />
            <span>{reorderNotice}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Saved</span>
        </div>
      )}

      {isReorderMode && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GripVertical size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Drag & Drop Mode:</strong> Drag cards by their grip handles or use the arrows to reorder.
            </span>
          </div>
          <button
            onClick={() => setIsReorderMode(false)}
            className="text-xs font-bold text-amber-800 hover:underline shrink-0 cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACCOUNTS SEARCH & TYPE FILTER TOOLBAR                                    */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search accounts (e.g. Meezan, Habib, Cash, MCF, MIACF, Dad)..."
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-8 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            {accountSearch && (
              <button
                onClick={() => setAccountSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Type Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            {[
              { id: 'all', label: 'All' },
              { id: 'bank', label: 'Banks' },
              { id: 'card', label: 'Cards' },
              { id: 'cash', label: 'Cash' },
              { id: 'savings', label: 'Savings & Tenders' },
              { id: 'other', label: 'Envelopes & Other' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAccountTypeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  accountTypeFilter === tab.id
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Results Info */}
        {(accountSearch || accountTypeFilter !== 'all') && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>
              Showing <strong>{filteredWallets.length}</strong> of {wallets.length} accounts
            </span>
            <button
              onClick={() => {
                setAccountSearch('');
                setAccountTypeFilter('all');
              }}
              className="text-amber-600 hover:text-amber-700 font-bold cursor-pointer"
            >
              Reset Search & Filters
            </button>
          </div>
        )}
      </div>

      {/* Wallets Grid */}
      {filteredWallets.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400">
          <WalletIcon size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold text-slate-700">No matching accounts found</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Try searching with a different keyword or resetting filters.
          </p>
          <button
            onClick={() => {
              setAccountSearch('');
              setAccountTypeFilter('all');
            }}
            className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Show All Accounts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWallets.map((wallet) => {
            const Icon = WALLET_ICONS[wallet.type] || WalletIcon;
            const isNegative = wallet.balance < 0;
            const originalIndex = wallets.findIndex((w) => w.id === wallet.id);
            const isBeingDragged = draggedIndex === originalIndex;
            const isDropTarget = dragOverIndex === originalIndex && draggedIndex !== originalIndex;
            const txCount = walletTxCountMap.get(wallet.id) || 0;

            // Check if this wallet has linked sub-accounts (e.g. Meezan, Habibmetro)
            const { actualBalance, linkedWallets } = getActualPhysicalBalance(wallet);
            const hasLinkedAccounts = linkedWallets.length > 0;

            // Check if this wallet is a sub-account of a parent (e.g. Dad, Extra, MCF, MIACF, MFPF, etc.)
            const parentWallet = wallet.parentWalletId ? walletMap.get(wallet.parentWalletId) : null;

            return (
              <div
                key={wallet.id}
                data-wallet-index={originalIndex}
                draggable={!accountSearch && accountTypeFilter === 'all'}
                onDragStart={(e) => handleDragStart(e, originalIndex)}
                onDragOver={(e) => handleDragOver(e, originalIndex)}
                onDrop={(e) => handleDrop(e, originalIndex)}
                onDragEnd={handleDragEnd}
                onClick={() => handleCardClick(wallet)}
                className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between group relative overflow-hidden transition-all duration-150 select-none cursor-pointer ${
                  isBeingDragged
                    ? 'opacity-40 scale-95 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                    : isDropTarget
                    ? 'border-amber-500 ring-2 ring-amber-500/50 bg-amber-50/20 translate-y-[-2px]'
                    : 'border-slate-200/80 hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* Card Top: Icon, Position, Grip & Delete */}
                <div className="flex items-start justify-between mb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                      style={{ backgroundColor: wallet.color }}
                    >
                      <Icon size={20} />
                    </div>
                    {isReorderMode && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        #{originalIndex + 1}
                      </span>
                    )}
                    {hasLinkedAccounts && (
                      <span
                        className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1"
                        title="Physical bank account combining sub-accounts"
                      >
                        <Layers size={11} />
                        <span>Bank Combined</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {/* Reorder Arrows in reorder mode */}
                    {isReorderMode && (
                      <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (originalIndex > 0) moveWallet(originalIndex, originalIndex - 1);
                          }}
                          disabled={originalIndex === 0}
                          className={`p-1 rounded text-slate-600 hover:text-slate-900 transition-colors ${
                            originalIndex === 0
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-white cursor-pointer shadow-xs'
                          }`}
                          title="Move Left"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (originalIndex < wallets.length - 1) moveWallet(originalIndex, originalIndex + 1);
                          }}
                          disabled={originalIndex === wallets.length - 1}
                          className={`p-1 rounded text-slate-600 hover:text-slate-900 transition-colors ${
                            originalIndex === wallets.length - 1
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-white cursor-pointer shadow-xs'
                          }`}
                          title="Move Right"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}

                    {/* Grip Drag Handle */}
                    <div
                      title="Drag to reorder account"
                      onTouchStart={() => handleTouchStart(originalIndex)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <GripVertical size={18} />
                    </div>

                    {/* Delete Wallet Button */}
                    {wallets.length > 1 && !isReorderMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteWallet(wallet.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 transition-opacity p-1 cursor-pointer"
                        title="Delete account"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Wallet Info */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {wallet.type}
                  </span>
                  <h4 className="font-bold text-slate-900 text-base mb-1 truncate" title={wallet.name}>
                    {wallet.name}
                  </h4>

                  {/* SPECIAL DISPLAY: If this account combines sub-accounts (e.g. Meezan or Habibmetro) */}
                  {hasLinkedAccounts ? (
                    <div className="space-y-2 my-2">
                      {/* Actual Physical Bank Balance */}
                      <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-200/80">
                        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 mb-0.5">
                          <span className="flex items-center gap-1">
                            <Landmark size={12} className="text-emerald-600" />
                            <span>Actual in Bank</span>
                          </span>
                          <span>Physical</span>
                        </div>
                        <div className="text-lg font-black text-emerald-800 tracking-tight">
                          {currencySymbol}
                          {actualBalance.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <p className="text-[10px] text-emerald-700/80 mt-0.5 truncate" title={`Includes ${wallet.name} + ${linkedWallets.map((lw) => lw.name).join(' + ')}`}>
                          Includes {wallet.name} + {linkedWallets.map((lw) => lw.name).join(', ')}
                        </p>
                      </div>

                      {/* Ledger Share */}
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="text-slate-500 font-medium">Ledger Share:</span>
                        <span
                          className={`font-black ${
                            isNegative ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {currencySymbol}
                          {wallet.balance.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  ) : parentWallet ? (
                    /* Sub-account (e.g. Dad, Extra, Emergency Fund, TBI Tenders) belonging to physical bank */
                    <div className="space-y-1.5 my-2">
                      <div
                        className={`text-xl font-black ${
                          isNegative ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {currencySymbol}
                        {wallet.balance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>

                      {/* Parent bank link & monthly note */}
                      <div className="space-y-1">
                        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 flex items-center gap-1">
                          <Landmark size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">
                            Kept in <strong>{parentWallet.name}</strong>
                          </span>
                        </div>

                        {wallet.monthlyNote && (
                          <div className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 truncate flex items-center gap-1">
                            <Calendar size={10} className="text-amber-600 shrink-0" />
                            <span>{wallet.monthlyNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Standard Account */
                    <div
                      className={`text-xl font-black mb-2.5 ${
                        isNegative ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {currencySymbol}
                      {wallet.balance.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  )}

                  {/* Footer hint with transaction count */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Receipt size={12} className="text-amber-500" />
                      <span>{txCount} records</span>
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center">
                      Statement &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACCOUNT TRANSACTIONS DETAIL MODAL / STATEMENT                            */}
      {/* ========================================================================= */}
      {activeDetailWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header (Compact & Clean) */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                    style={{ backgroundColor: activeDetailWallet.color }}
                  >
                    {(() => {
                      const IconComp = WALLET_ICONS[activeDetailWallet.type] || WalletIcon;
                      return <IconComp size={22} />;
                    })()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {activeDetailWallet.type}
                      </span>
                      {activeDetailWallet.linkedAccountIds && activeDetailWallet.linkedAccountIds.length > 0 && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Layers size={10} />
                          <span>Physical Bank</span>
                        </span>
                      )}
                      {activeDetailWallet.monthlyNote && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 truncate">
                          {activeDetailWallet.monthlyNote}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight truncate">
                        {activeDetailWallet.name}
                      </h2>
                      {activeDetailWallet.linkedAccountIds && activeDetailWallet.linkedAccountIds.length > 0 ? (
                        <span className="text-xs sm:text-sm font-extrabold text-emerald-700">
                          Bank Actual: {currencySymbol}
                          {getActualPhysicalBalance(activeDetailWallet).actualBalance.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span
                          className={`text-xs sm:text-sm font-black ${
                            activeDetailWallet.balance < 0 ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          Balance: {currencySymbol}
                          {activeDetailWallet.balance.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedWalletId(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs Switcher: Transactions vs Bank Envelopes (when has linked accounts) */}
              {activeDetailWallet.linkedAccountIds && activeDetailWallet.linkedAccountIds.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setModalTab('transactions')}
                    className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      modalTab === 'transactions'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Receipt size={14} className={modalTab === 'transactions' ? 'text-amber-500' : 'text-slate-400'} />
                    <span>Transactions ({filteredWalletTransactions.length})</span>
                  </button>
                  <button
                    onClick={() => setModalTab('envelopes')}
                    className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      modalTab === 'envelopes'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Landmark size={14} />
                    <span>8 Envelopes & Reconciliation ({getActualPhysicalBalance(activeDetailWallet).linkedWallets.length + 1})</span>
                  </button>
                </div>
              )}
            </div>

            {/* ================================================================= */}
            {/* TAB 1: TRANSACTIONS LIST                                          */}
            {/* ================================================================= */}
            {modalTab === 'transactions' && (
              <>
                {/* Secondary Bar: Scope Toggle & Summary Stats */}
                <div className="px-4 sm:px-6 py-2.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                  {/* Scope Switcher if linked */}
                  {activeDetailWallet.linkedAccountIds && activeDetailWallet.linkedAccountIds.length > 0 ? (
                    <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                      <button
                        onClick={() => setIncludeLinkedSubAccounts(false)}
                        className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                          !includeLinkedSubAccounts
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {activeDetailWallet.name} Only ({walletTxCountMap.get(activeDetailWallet.id) || 0})
                      </button>
                      <button
                        onClick={() => setIncludeLinkedSubAccounts(true)}
                        className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                          includeLinkedSubAccounts
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Bank Activity ({totalCombinedTxsCount})
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-medium">
                      Showing <strong>{filteredWalletTransactions.length}</strong> of {walletStats.count} transactions
                    </div>
                  )}

                  {/* Summary Balance & Inflow/Outflow */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500">
                      Share:{' '}
                      <strong
                        className={
                          activeDetailWallet.balance < 0 && !includeLinkedSubAccounts
                            ? 'text-rose-600'
                            : 'text-slate-900'
                        }
                      >
                        {currencySymbol}
                        {(includeLinkedSubAccounts
                          ? getActualPhysicalBalance(activeDetailWallet).actualBalance
                          : activeDetailWallet.balance
                        ).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600">
                      +{currencySymbol}
                      {walletStats.inflow.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[11px] font-bold text-rose-600">
                      -{currencySymbol}
                      {walletStats.outflow.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>

                    {onAddTransactionForWallet && (
                      <button
                        onClick={() => {
                          const targetId = activeDetailWallet.id;
                          setSelectedWalletId(null);
                          onAddTransactionForWallet(targetId);
                        }}
                        className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer ml-1"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Add Entry</span>
                      </button>
                    )}

                    {onNavigateToTransactionsWithWallet && (
                      <button
                        onClick={() => {
                          const targetId = activeDetailWallet.id;
                          setSelectedWalletId(null);
                          onNavigateToTransactionsWithWallet(targetId);
                        }}
                        className="flex items-center gap-1 bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold text-[11px] px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Open in Transactions Tab"
                      >
                        <ExternalLink size={11} />
                        <span className="hidden sm:inline">Ledger</span>
                      </button>
                    )}
                  </div>
                </div>

            {/* Filter & Search Bar */}
            <div className="p-3 sm:px-6 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeDetailWallet.name} transactions...`}
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Type pill filter */}
              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs shrink-0">
                {(['all', 'expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setLedgerTypeFilter(t)}
                    className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer font-medium ${
                      ledgerTypeFilter === t
                        ? 'bg-amber-500 text-white font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {t === 'all' ? 'All' : t === 'expense' ? 'Expenses' : 'Incomes'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Transactions List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100">
              {filteredWalletTransactions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Receipt size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold text-slate-600">No transactions found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ledgerSearch ? 'Try clearing your search query' : `No records yet for ${activeDetailWallet.name}`}
                  </p>
                </div>
              ) : (
                <>
                  {displayedWalletTransactions.map((tx) => {
                    const cat = categoryMap.get(tx.categoryId);
                    const wal = walletMap.get(tx.walletId);
                    const isIncome = tx.type === 'income' || tx.toWalletId === activeDetailWallet.id;
                    const isTransfer = tx.note?.includes('Transferred Balance') || !!tx.toWalletId;

                    return (
                      <div
                        key={tx.id}
                        className="py-3 flex items-start justify-between gap-3 group hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <CategoryIcon
                            name={cat?.icon || 'Tag'}
                            color={cat?.color || '#f59e0b'}
                            size={18}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm truncate">
                                {tx.title || cat?.name || 'Untitled'}
                              </span>
                              {includeLinkedSubAccounts && wal && wal.id !== activeDetailWallet.id && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                                  {wal.name}
                                </span>
                              )}
                              {isTransfer && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-sky-100 text-sky-800 shrink-0">
                                  Transfer
                                </span>
                              )}
                            </div>

                            {/* Multi-line or single-line note */}
                            {tx.note && (
                              <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line line-clamp-2">
                                {tx.note}
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 text-[11px] text-slate-400">
                              <span className="font-semibold text-slate-500">{formatTransactionDate(tx.date)}</span>
                              {formatTransactionTime(tx.createdAt, tx.time) && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                                  {formatTransactionTime(tx.createdAt, tx.time)}
                                </span>
                              )}
                              <span>•</span>
                              <span>{cat?.name || 'General'}</span>
                              {wal && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-600 font-medium">{wal.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Actions */}
                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <div
                            className={`font-black text-sm sm:text-base ${
                              isIncome ? 'text-emerald-600' : 'text-slate-900'
                            }`}
                          >
                            {isIncome ? '+' : '-'}{currencySymbol}
                            {tx.amount.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>

                          {/* Hover Actions: Edit & Delete */}
                          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onEditTransaction && (
                              <button
                                onClick={() => {
                                  setSelectedWalletId(null);
                                  onEditTransaction(tx);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                title="Edit transaction"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            {onDeleteTransaction && (
                              <button
                                onClick={() => onDeleteTransaction(tx.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete transaction"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Load more if records exceed limit */}
                  {filteredWalletTransactions.length > ledgerDisplayLimit && (
                    <div className="pt-4 pb-2 text-center flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                      <span>
                        Showing <strong>{displayedWalletTransactions.length}</strong> of{' '}
                        <strong>{filteredWalletTransactions.length.toLocaleString()}</strong> transactions
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setLedgerDisplayLimit((prev) => prev + 100)}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                        >
                          Load 100 More
                        </button>
                        <button
                          onClick={() => setLedgerDisplayLimit(filteredWalletTransactions.length)}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-2xs transition-colors cursor-pointer"
                        >
                          Show All ({filteredWalletTransactions.length.toLocaleString()})
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* TAB 2: 8 ENVELOPES BREAKDOWN & RECONCILIATION                     */}
        {/* ================================================================= */}
        {modalTab === 'envelopes' && (() => {
          const { actualBalance, calculatedSum, discrepancy, linkedWallets } =
            getActualPhysicalBalance(activeDetailWallet);
          if (linkedWallets.length === 0) return null;

          return (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Big Actual Physical Bank Balance Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200/90 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-900">
                      <Landmark size={16} className="text-emerald-700" />
                      <span>Actual Physical Amount in {activeDetailWallet.name} Bank</span>
                    </div>
                    <p className="text-[11px] text-emerald-700/90 mt-0.5">
                      Combined funds of <strong>{activeDetailWallet.name}</strong> +{' '}
                      {linkedWallets.map((w) => w.name).join(', ')}
                    </p>
                  </div>

                  <div className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">
                    {currencySymbol}
                    {actualBalance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>

                {/* Breakdown grid of sub-account envelopes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {/* Parent Share */}
                  <div className="p-3 rounded-xl bg-white border border-emerald-100 shadow-2xs flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[150px]">
                        {activeDetailWallet.name} (Base Account)
                      </div>
                      <div
                        className={`text-sm font-black ${
                          activeDetailWallet.balance < 0 ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {currencySymbol}
                        {activeDetailWallet.balance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                      {walletTxCountMap.get(activeDetailWallet.id) || 0} txs
                    </span>
                  </div>

                  {/* Linked Sub-Accounts */}
                  {linkedWallets.map((lw) => (
                    <div
                      key={lw.id}
                      className="p-3 rounded-xl bg-white border border-emerald-100 shadow-2xs flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase truncate" title={lw.name}>
                          {lw.name}
                        </div>
                        <div
                          className={`text-sm font-black ${
                            lw.balance < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {currencySymbol}
                          {lw.balance.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        {lw.monthlyNote && (
                          <div className="text-[9px] text-amber-700 font-semibold truncate mt-0.5">
                            {lw.monthlyNote}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md shrink-0">
                        {walletTxCountMap.get(lw.id) || 0} txs
                      </span>
                    </div>
                  ))}
                </div>

                {/* Reconciliation adjustment alert */}
                {discrepancy !== 0 && (
                  <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-start sm:items-center gap-2">
                      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                      <div className="text-amber-900 leading-snug">
                        <span className="font-extrabold">Bank Statement Reconciliation:</span>{' '}
                        <span>
                          Calculated sum across all {linkedWallets.length + 1} envelopes is{' '}
                          <strong>
                            {currencySymbol}
                            {calculatedSum.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </strong>
                          . Reconciled to physical bank balance of{' '}
                          <strong className="text-emerald-800">
                            {currencySymbol}
                            {actualBalance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </strong>
                          .
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-200/80 text-amber-900 whitespace-nowrap shrink-0">
                      Adjustment: {discrepancy > 0 ? '-' : '+'}
                      {currencySymbol}
                      {Math.abs(discrepancy).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Switch to statement button */}
              <div className="pt-2 text-center">
                <button
                  onClick={() => setModalTab('transactions')}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  View {activeDetailWallet.name} Transactions ({filteredWalletTransactions.length}) &rarr;
                </button>
              </div>
            </div>
          );
        })()}

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedWalletId(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
