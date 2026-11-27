import { useState, useEffect, useRef } from 'react';
import { ActiveTab, Transaction, Category, Wallet, Budget, AppSettings } from './types';
import { Storage } from './utils/storage';
import { getTxBalanceDelta } from './utils/debt';
import {
  enqueueOfflineOp,
  executeOp,
  flushOfflineQueue,
  getOfflineQueue,
  OfflineOp,
} from './utils/offlineQueue';
import {
  fetchAllFromSupabase,
  dbFetchTrashTransactions,
  dbAutoPurgeOldTrash,
  subscribeToRealtimeChanges,
  mapRowToTransaction,
  mapRowToWallet,
  mapRowToCategory,
  mapRowToBudget,
} from './utils/supabase';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_WALLETS,
  DEFAULT_TRANSACTIONS,
  DEFAULT_BUDGETS,
} from './data/defaultData';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { WalletsView } from './components/WalletsView';
import { AnalyticsView } from './components/AnalyticsView';
import { ImportExportModal } from './components/ImportExportModal';
import { TransactionModal } from './components/TransactionModal';
import { BudgetModal } from './components/BudgetModal';
import { WalletModal } from './components/WalletModal';
import { TrashModal } from './components/TrashModal';
import { RotateCcw, Trash2, X } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [categories, setCategories] = useState<Category[]>(() => Storage.getCategories());
  const [wallets, setWallets] = useState<Wallet[]>(() => Storage.getWallets());
  const [transactions, setTransactions] = useState<Transaction[]>(() => Storage.getTransactions());
  const [budgets, setBudgets] = useState<Budget[]>(() => Storage.getBudgets());
  const [settings, setSettings] = useState<AppSettings>(() => Storage.getSettings());

  // Modals & Trash state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [initialTxWalletId, setInitialTxWalletId] = useState<string | undefined>(undefined);
  const [selectedWalletFilter, setSelectedWalletFilter] = useState<string>('all');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [trashTransactions, setTrashTransactions] = useState<Transaction[]>(() => Storage.getTrashTransactions());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getOfflineQueue().length);
  const [isFlushingQueue, setIsFlushingQueue] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<{
    tx: Transaction;
    message: string;
  } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const persistOrQueue = async (op: OfflineOp) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const q = enqueueOfflineOp(op);
      setPendingSyncCount(q.length);
      return;
    }
    const ok = await executeOp(op);
    if (!ok) {
      const q = enqueueOfflineOp(op);
      setPendingSyncCount(q.length);
    }
  };

  // Track local mutations so our client's own optimistic actions are not overridden or delayed
  const localTxMutationsRef = useRef<Map<string, { action: 'delete' | 'restore' | 'save' | 'purge'; timestamp: number }>>(new Map());
  const localWalletMutationRef = useRef<number>(0);
  const isSyncingRef = useRef(false);

  // Save to storage on change
  useEffect(() => {
    Storage.saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    Storage.saveWallets(wallets);
  }, [wallets]);

  useEffect(() => {
    Storage.saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    Storage.saveTrashTransactions(trashTransactions);
  }, [trashTransactions]);

  useEffect(() => {
    Storage.saveBudgets(budgets);
  }, [budgets]);

  useEffect(() => {
    Storage.saveSettings(settings);
  }, [settings]);

  // Sync with Supabase on mount and listen to realtime cross-device changes
  useEffect(() => {
    let isMounted = true;

    const syncCloudData = async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        // Auto-purge items in trash older than 30 days
        dbAutoPurgeOldTrash(30);

        const [cloudData, trashData] = await Promise.all([
          fetchAllFromSupabase(),
          dbFetchTrashTransactions(),
        ]);

        if (!isMounted) return;

        if (cloudData) {
          if (cloudData.wallets.length > 0 && Date.now() - localWalletMutationRef.current > 5000) {
            setWallets(cloudData.wallets);
          }
          if (cloudData.categories.length > 0) setCategories(cloudData.categories);
          if (cloudData.budgets.length > 0) setBudgets(cloudData.budgets);

          if (cloudData.transactions.length > 0) {
            setTransactions((prevLocal) => {
              const now = Date.now();
              const recentDeletedOrPurged = new Set(
                Array.from(localTxMutationsRef.current.entries())
                  .filter(([_, m]) => (m.action === 'delete' || m.action === 'purge') && now - m.timestamp < 15000)
                  .map(([id]) => id)
              );

              // Server transactions excluding any that we locally deleted recently
              let merged = cloudData.transactions.filter((tx) => !recentDeletedOrPurged.has(tx.id));

              // Ensure any recently restored or created transactions remain
              for (const localTx of prevLocal) {
                const mutation = localTxMutationsRef.current.get(localTx.id);
                if (mutation && (mutation.action === 'restore' || mutation.action === 'save') && now - mutation.timestamp < 15000) {
                  if (!merged.some((m) => m.id === localTx.id)) {
                    merged.unshift(localTx);
                  }
                }
              }
              return merged;
            });
          }
        }

        if (trashData) {
          setTrashTransactions((prevTrash) => {
            const now = Date.now();
            const recentRestoredOrPurged = new Set(
              Array.from(localTxMutationsRef.current.entries())
                .filter(([_, m]) => (m.action === 'restore' || m.action === 'purge') && now - m.timestamp < 15000)
                .map(([id]) => id)
            );

            let mergedTrash = trashData.filter((tx) => !recentRestoredOrPurged.has(tx.id));

            // Ensure any recently deleted transactions remain in trash
            for (const localTx of prevTrash) {
              const mutation = localTxMutationsRef.current.get(localTx.id);
              if (mutation && mutation.action === 'delete' && now - mutation.timestamp < 15000) {
                if (!mergedTrash.some((m) => m.id === localTx.id)) {
                  mergedTrash.unshift(localTx);
                }
              }
            }
            return mergedTrash;
          });
        }
      } catch (err) {
        console.error('Error syncing initial cloud data:', err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    const flushAndSync = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      setIsFlushingQueue(true);
      try {
        const { remainingCount } = await flushOfflineQueue();
        if (isMounted) setPendingSyncCount(remainingCount);
        if (remainingCount === 0) {
          await syncCloudData();
        }
      } finally {
        if (isMounted) setIsFlushingQueue(false);
      }
    };

    // Initial load: flush any pending offline edits before pulling cloud state
    flushAndSync();

    const handleOnline = () => {
      if (!isMounted) return;
      setIsOnline(true);
      flushAndSync();
    };
    const handleOffline = () => {
      if (!isMounted) return;
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for Realtime Postgres changes with granular incremental updates
    const unsubscribe = subscribeToRealtimeChanges((payload) => {
      if (!isMounted) return;
      const { table, eventType, new: newRow, old: oldRow } = payload;

      if (table === 'transactions') {
        const txId = (newRow?.id || oldRow?.id) as string;
        if (!txId) return;

        // If this transaction was mutated locally on this device in the last 15 seconds, ignore echo
        const localMutation = localTxMutationsRef.current.get(txId);
        if (localMutation && Date.now() - localMutation.timestamp < 15000) {
          return;
        }

        if (eventType === 'DELETE') {
          // Permanently deleted on another device
          setTransactions((prev) => prev.filter((t) => t.id !== txId));
          setTrashTransactions((prev) => prev.filter((t) => t.id !== txId));
        } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const tx = mapRowToTransaction(newRow);
          if (tx.deletedAt) {
            // Soft-deleted on another device
            setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
            setTrashTransactions((prev) => [tx, ...prev.filter((t) => t.id !== tx.id)]);
          } else {
            // Active or restored transaction on another device
            setTrashTransactions((prev) => prev.filter((t) => t.id !== tx.id));
            setTransactions((prev) => {
              const exists = prev.some((t) => t.id === tx.id);
              if (exists) {
                return prev.map((t) => (t.id === tx.id ? tx : t));
              }
              return [tx, ...prev];
            });
          }
        }
      } else if (table === 'wallets') {
        // If we recently updated wallets locally, ignore echo to prevent jitter
        if (Date.now() - localWalletMutationRef.current < 5000) {
          return;
        }
        if (newRow) {
          const w = mapRowToWallet(newRow);
          setWallets((prev) => prev.map((item) => (item.id === w.id ? { ...item, ...w } : item)));
        }
      } else if (table === 'categories') {
        if (newRow) {
          const c = mapRowToCategory(newRow);
          setCategories((prev) => {
            const exists = prev.some((item) => item.id === c.id);
            if (exists) return prev.map((item) => (item.id === c.id ? c : item));
            return [...prev, c];
          });
        }
      } else if (table === 'budgets') {
        if (newRow) {
          const b = mapRowToBudget(newRow);
          setBudgets((prev) => {
            const exists = prev.some((item) => item.id === b.id);
            if (exists) return prev.map((item) => (item.id === b.id ? b : item));
            return [...prev, b];
          });
        }
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Handle transaction save (create or update)
  const handleSaveTransaction = (txData: Partial<Transaction>) => {
    localWalletMutationRef.current = Date.now();
    if (txData.id) {
      // Update existing
      const oldTx = transactions.find((t) => t.id === txData.id);
      const updatedTx = { ...oldTx, ...txData } as Transaction;

      localTxMutationsRef.current.set(txData.id, { action: 'save', timestamp: Date.now() });

      setTransactions((prev) =>
        prev.map((t) => (t.id === txData.id ? updatedTx : t))
      );

      // Persist to Supabase (or queue if offline)
      persistOrQueue({ type: 'upsert_tx', tx: updatedTx });

      // Re-calculate affected wallet balances
      if (oldTx) {
        setWallets((prev) => {
          const next = prev.map((w) => {
            let b = w.balance;
            // Revert old transaction effect
            b -= getTxBalanceDelta(oldTx, w.id, prev);
            // Apply new transaction effect
            b += getTxBalanceDelta(updatedTx, w.id, prev);
            return { ...w, balance: Math.round(b * 100) / 100 };
          });
          persistOrQueue({ type: 'upsert_wallets', wallets: next });
          return next;
        });
      }
    } else {
      // Create new
      const newCat = categories.find((c) => c.id === txData.categoryId);
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        title: txData.title?.trim() || newCat?.name || 'Untitled',
        amount: txData.amount || 0,
        type: txData.type || 'expense',
        categoryId: txData.categoryId || categories[0]?.id || 'cat-food',
        walletId: txData.walletId || wallets[0]?.id || 'wal-main',
        toWalletId: txData.toWalletId,
        date: txData.date || new Date().toISOString().split('T')[0],
        time: txData.time,
        note: txData.note,
        createdAt: txData.createdAt || Date.now(),
        isDebtSettlement: txData.isDebtSettlement,
      };

      localTxMutationsRef.current.set(newTx.id, { action: 'save', timestamp: Date.now() });

      setTransactions((prev) => [newTx, ...prev]);
      persistOrQueue({ type: 'upsert_tx', tx: newTx });

      // Adjust wallet balance
      setWallets((prev) => {
        const next = prev.map((w) => {
          const delta = getTxBalanceDelta(newTx, w.id, prev);
          if (delta !== 0) {
            return { ...w, balance: Math.round((w.balance + delta) * 100) / 100 };
          }
          return w;
        });
        persistOrQueue({ type: 'upsert_wallets', wallets: next });
        return next;
      });
    }
  };

  // Soft delete transaction (moves to Recycle Bin / Trash)
  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    const deletedAt = new Date().toISOString();
    const deletedTx: Transaction = { ...tx, deletedAt };

    // Record local mutation to suppress remote echo and prevent UI bounce-back
    localTxMutationsRef.current.set(id, { action: 'delete', timestamp: Date.now() });
    localWalletMutationRef.current = Date.now();

    // 1. Move to Trash state & call Supabase soft delete (or queue if offline)
    setTrashTransactions((prev) => [deletedTx, ...prev.filter((t) => t.id !== id)]);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    persistOrQueue({ type: 'soft_delete_tx', id, deletedAt });

    // 2. Reverse wallet balance adjustment
    setWallets((prev) => {
      const next = prev.map((w) => {
        const delta = getTxBalanceDelta(tx, w.id, prev);
        if (delta !== 0) {
          return { ...w, balance: Math.round((w.balance - delta) * 100) / 100 };
        }
        return w;
      });
      persistOrQueue({ type: 'upsert_wallets', wallets: next });
      return next;
    });

    // 3. Show undo toast notification
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastNotification({
      tx: deletedTx,
      message: `"${tx.title}" moved to Trash (auto-deletes in 30 days)`,
    });
    toastTimeoutRef.current = setTimeout(() => {
      setToastNotification(null);
    }, 6000);
  };

  // Restore transaction from Trash
  const handleRestoreTransaction = (id: string) => {
    const tx = trashTransactions.find((t) => t.id === id);
    if (!tx) return;

    const restoredTx: Transaction = { ...tx, deletedAt: null };

    // Record local mutation to suppress remote echo and prevent UI delay
    localTxMutationsRef.current.set(id, { action: 'restore', timestamp: Date.now() });
    localWalletMutationRef.current = Date.now();

    // 1. Move from Trash back to active transactions & Supabase restore (or queue if offline)
    setTrashTransactions((prev) => prev.filter((t) => t.id !== id));
    setTransactions((prev) => [restoredTx, ...prev]);
    persistOrQueue({ type: 'restore_tx', id });

    // 2. Re-apply wallet balance
    setWallets((prev) => {
      const next = prev.map((w) => {
        const delta = getTxBalanceDelta(restoredTx, w.id, prev);
        if (delta !== 0) {
          return { ...w, balance: Math.round((w.balance + delta) * 100) / 100 };
        }
        return w;
      });
      persistOrQueue({ type: 'upsert_wallets', wallets: next });
      return next;
    });

    // Clear toast if it was this transaction
    if (toastNotification?.tx.id === id) {
      setToastNotification(null);
    }
  };

  // Permanently delete immediately from Trash
  const handlePermanentDeleteTransaction = (id: string) => {
    localTxMutationsRef.current.set(id, { action: 'purge', timestamp: Date.now() });
    setTrashTransactions((prev) => prev.filter((t) => t.id !== id));
    persistOrQueue({ type: 'permanent_delete_tx', id });
  };

  // Empty Trash (permanently wipe all)
  const handleEmptyTrash = () => {
    trashTransactions.forEach((tx) => {
      localTxMutationsRef.current.set(tx.id, { action: 'purge', timestamp: Date.now() });
    });
    setTrashTransactions([]);
    persistOrQueue({ type: 'empty_trash' });
  };

  const handleApplyImport = (
    newTxs: Transaction[],
    newCats: Category[],
    newWals: Wallet[],
    newBuds: Budget[],
    mode: 'merge' | 'replace'
  ) => {
    if (mode === 'replace') {
      setTransactions(newTxs);
      setCategories(newCats);
      setWallets(newWals);
      setBudgets(newBuds.length > 0 ? newBuds : budgets);
    } else {
      // Merge
      setTransactions((prev) => [...newTxs, ...prev]);
      setCategories(newCats);
      setWallets(newWals);
      if (newBuds.length > 0) setBudgets((prev) => [...newBuds, ...prev]);
    }
  };

  const handleResetToDefault = () => {
    Storage.resetAll();
    setCategories(DEFAULT_CATEGORIES);
    setWallets(DEFAULT_WALLETS);
    setTransactions(DEFAULT_TRANSACTIONS);
    setBudgets(DEFAULT_BUDGETS);
  };

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAddModal={() => {
          setEditingTransaction(null);
          setIsTxModalOpen(true);
        }}
        totalBalance={totalBalance}
        currencySymbol={settings.currencySymbol}
        onOpenTrash={() => setIsTrashOpen(true)}
        trashCount={trashTransactions.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          settings={settings}
          onUpdateCurrency={(code, symbol) =>
            setSettings((prev) => ({ ...prev, currency: code, currencySymbol: symbol }))
          }
          onOpenImport={() => setActiveTab('import-export')}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          isSyncing={isFlushingQueue}
        />

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              categories={categories}
              wallets={wallets}
              budgets={budgets}
              currencySymbol={settings.currencySymbol}
              onNavigateTab={setActiveTab}
              onOpenAddModal={() => {
                setEditingTransaction(null);
                setIsTxModalOpen(true);
              }}
              onEditTransaction={(tx) => {
                setEditingTransaction(tx);
                setIsTxModalOpen(true);
              }}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              categories={categories}
              wallets={wallets}
              currencySymbol={settings.currencySymbol}
              selectedWallet={selectedWalletFilter}
              onSelectWallet={setSelectedWalletFilter}
              onOpenAddModal={() => {
                setEditingTransaction(null);
                setInitialTxWalletId(undefined);
                setIsTxModalOpen(true);
              }}
              onEditTransaction={(tx) => {
                setEditingTransaction(tx);
                setIsTxModalOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenTrash={() => setIsTrashOpen(true)}
              trashCount={trashTransactions.length}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsView
              budgets={budgets}
              transactions={transactions}
              categories={categories}
              currencySymbol={settings.currencySymbol}
              onOpenAddBudget={() => setIsBudgetModalOpen(true)}
              onDeleteBudget={(id) => setBudgets((prev) => prev.filter((b) => b.id !== id))}
            />
          )}

          {activeTab === 'wallets' && (
            <WalletsView
              wallets={wallets}
              transactions={transactions}
              categories={categories}
              currencySymbol={settings.currencySymbol}
              onOpenAddWallet={() => setIsWalletModalOpen(true)}
              onDeleteWallet={(id) => setWallets((prev) => prev.filter((w) => w.id !== id))}
              onReorderWallets={setWallets}
              onEditTransaction={(tx) => {
                setEditingTransaction(tx);
                setIsTxModalOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
              onAddTransactionForWallet={(walletId) => {
                setEditingTransaction(null);
                setInitialTxWalletId(walletId);
                setIsTxModalOpen(true);
              }}
              onNavigateToTransactionsWithWallet={(walletId) => {
                setSelectedWalletFilter(walletId);
                setActiveTab('transactions');
              }}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              transactions={transactions}
              categories={categories}
              wallets={wallets}
              currencySymbol={settings.currencySymbol}
            />
          )}

          {activeTab === 'import-export' && (
            <ImportExportModal
              categories={categories}
              wallets={wallets}
              transactions={transactions}
              budgets={budgets}
              onApplyImport={handleApplyImport}
              onResetToDefault={handleResetToDefault}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAddModal={() => {
          setEditingTransaction(null);
          setIsTxModalOpen(true);
        }}
      />

      {/* Interactive Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
          setInitialTxWalletId(undefined);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        defaultWalletId={initialTxWalletId}
        categories={categories}
        wallets={wallets}
        currencySymbol={settings.currencySymbol}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onSave={(newBudget) => setBudgets((prev) => [newBudget, ...prev])}
        categories={categories}
        currencySymbol={settings.currencySymbol}
      />

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSave={(newWallet) => setWallets((prev) => [...prev, newWallet])}
        currencySymbol={settings.currencySymbol}
      />

      {/* Recycle Bin / Trash Modal */}
      <TrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        trashTransactions={trashTransactions}
        categories={categories}
        wallets={wallets}
        settings={settings}
        onRestoreTransaction={handleRestoreTransaction}
        onPermanentDeleteTransaction={handlePermanentDeleteTransaction}
        onEmptyTrash={handleEmptyTrash}
      />

      {/* Undo Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Trash2 size={16} className="text-rose-400 shrink-0" />
            <span className="text-xs font-medium truncate">{toastNotification.message}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleRestoreTransaction(toastNotification.tx.id)}
              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <RotateCcw size={12} strokeWidth={2.5} />
              <span>Undo</span>
            </button>
            <button
              onClick={() => {
                setToastNotification(null);
                setIsTrashOpen(true);
              }}
              className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Trash
            </button>
            <button
              onClick={() => setToastNotification(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
