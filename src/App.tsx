import { useState, useEffect } from 'react';
import { ActiveTab, Transaction, Category, Wallet, Budget, AppSettings } from './types';
import { Storage } from './utils/storage';
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

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [categories, setCategories] = useState<Category[]>(() => Storage.getCategories());
  const [wallets, setWallets] = useState<Wallet[]>(() => Storage.getWallets());
  const [transactions, setTransactions] = useState<Transaction[]>(() => Storage.getTransactions());
  const [budgets, setBudgets] = useState<Budget[]>(() => Storage.getBudgets());
  const [settings, setSettings] = useState<AppSettings>(() => Storage.getSettings());

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [initialTxWalletId, setInitialTxWalletId] = useState<string | undefined>(undefined);
  const [selectedWalletFilter, setSelectedWalletFilter] = useState<string>('all');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

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
    Storage.saveBudgets(budgets);
  }, [budgets]);

  useEffect(() => {
    Storage.saveSettings(settings);
  }, [settings]);

  // Handle transaction save (create or update)
  const handleSaveTransaction = (txData: Partial<Transaction>) => {
    if (txData.id) {
      // Update existing
      setTransactions((prev) =>
        prev.map((t) => (t.id === txData.id ? ({ ...t, ...txData } as Transaction) : t))
      );
    } else {
      // Create new
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        title: txData.title || 'Untitled',
        amount: txData.amount || 0,
        type: txData.type || 'expense',
        categoryId: txData.categoryId || categories[0]?.id || 'cat-food',
        walletId: txData.walletId || wallets[0]?.id || 'wal-main',
        toWalletId: txData.toWalletId,
        date: txData.date || new Date().toISOString().split('T')[0],
        time: txData.time,
        note: txData.note,
        createdAt: txData.createdAt || Date.now(),
      };

      setTransactions((prev) => [newTx, ...prev]);

      // Adjust wallet balance
      setWallets((prev) =>
        prev.map((w) => {
          if (w.id === newTx.walletId) {
            const delta = newTx.type === 'income' ? newTx.amount : -newTx.amount;
            return { ...w, balance: w.balance + delta };
          }
          return w;
        })
      );
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    // Reverse balance adjustment
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === tx.walletId) {
          const delta = tx.type === 'income' ? -tx.amount : tx.amount;
          return { ...w, balance: w.balance + delta };
        }
        return w;
      })
    );

    setTransactions((prev) => prev.filter((t) => t.id !== id));
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
    </div>
  );
}

export default App;
