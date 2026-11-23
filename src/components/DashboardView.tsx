import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart as PieChartIcon,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { Transaction, Category, Wallet, Budget, ActiveTab } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatTransactionTime, formatTransactionDate } from '../utils/date';
import { isDebtSettlementTx } from '../utils/debt';

interface DashboardViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  budgets: Budget[];
  currencySymbol: string;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  categories,
  wallets,
  budgets,
  currencySymbol,
  onNavigateTab,
  onOpenAddModal,
}) => {
  // Calculations
  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const netSavings = totalIncome - totalExpense;

  // Category map for rapid lookup
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const walletMap = new Map(wallets.map((w) => [w.id, w]));

  // Expenses grouped by category
  const expenseByCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
    });

  const sortedCategories = Object.entries(expenseByCategory)
    .map(([catId, amount]) => ({
      category: categoryMap.get(catId),
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .filter((item) => item.category !== undefined)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  // Recent 5 transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-6">
      {/* Cashew Import Banner if few transactions */}
      {transactions.length <= 10 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <Upload size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Have a Cashew App backup file?
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Drop your Cashew exported JSON or CSV file here to instantly populate your history, categories, and accounts.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('import-export')}
            className="w-full sm:w-auto text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0 cursor-pointer text-center"
          >
            Import Backup File
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Balance (Clickable: navigates to Accounts & Wallets) */}
        <div 
          onClick={() => onNavigateTab('wallets')}
          className="bg-white border border-slate-200/80 hover:border-amber-400 rounded-2xl p-4 sm:p-5 shadow-xs min-w-0 cursor-pointer transition-all group"
          title="Click to view all accounts & wallets"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span>Net Balance</span>
            <span className="p-1 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
              <TrendingUp size={16} />
            </span>
          </div>
          <div 
            className="text-xl sm:text-2xl xl:text-[26px] font-black text-slate-900 tracking-tight truncate"
            title={`${currencySymbol}${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          >
            {currencySymbol}{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-amber-600 mt-2 font-medium flex items-center justify-between">
            <span>Across {wallets.length} active wallets</span>
            <span className="text-[11px] font-bold group-hover:underline">View All →</span>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span>Total Income</span>
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowDownLeft size={16} />
            </span>
          </div>
          <div 
            className="text-xl sm:text-2xl xl:text-[26px] font-black text-emerald-600 tracking-tight truncate"
            title={`+${currencySymbol}${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          >
            +{currencySymbol}{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-600/90 mt-2 font-medium flex items-center gap-1">
            <span>↑</span> Inflow recorded
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span>Total Expenses</span>
            <span className="p-1 rounded-lg bg-rose-50 text-rose-600">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <div 
            className="text-xl sm:text-2xl xl:text-[26px] font-black text-rose-600 tracking-tight truncate"
            title={`-${currencySymbol}${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          >
            -{currencySymbol}{totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-rose-600/90 mt-2 font-medium flex items-center gap-1">
            <span>↓</span> Outflow recorded
          </div>
        </div>

        {/* Net Cash Flow / Savings */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span>Net Savings</span>
            <span className={`p-1 rounded-lg ${netSavings >= 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
              <TrendingDown size={16} />
            </span>
          </div>
          <div 
            className={`text-xl sm:text-2xl xl:text-[26px] font-black tracking-tight truncate ${netSavings >= 0 ? 'text-amber-600' : 'text-red-600'}`}
            title={`${netSavings >= 0 ? '+' : ''}${currencySymbol}${netSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          >
            {netSavings >= 0 ? '+' : ''}{currencySymbol}{netSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-600 mt-2 font-medium">
            Cash retained this period
          </div>
        </div>
      </div>

      {/* Main Grid: Budgets & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Budgets Preview */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChartIcon size={18} className="text-amber-500" />
              <h3 className="font-bold text-slate-900 text-base">Active Budgets</h3>
            </div>
            <button
              onClick={() => onNavigateTab('budgets')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Budgets</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {budgets.slice(0, 3).map((budget) => {
              // Calculate spending for categories in this budget
              const spent = transactions
                .filter(
                  (t) =>
                    t.type === 'expense' &&
                    budget.categoryIds.includes(t.categoryId)
                )
                .reduce((acc, t) => acc + t.amount, 0);

              const percent = Math.min(Math.round((spent / budget.amount) * 100), 100);
              const isOver = spent > budget.amount;

              return (
                <div key={budget.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800 text-sm">{budget.name}</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {currencySymbol}{spent.toFixed(2)} / <span className="text-slate-900">{currencySymbol}{budget.amount.toFixed(2)}</span>
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isOver
                          ? 'bg-rose-500'
                          : percent > 85
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] font-medium text-slate-600">
                    <span>{percent}% used</span>
                    <span>
                      {isOver ? (
                        <span className="text-rose-600 font-bold">
                          Exceeded by {currencySymbol}{(spent - budget.amount).toFixed(2)}
                        </span>
                      ) : (
                        <span>{currencySymbol}{(budget.amount - spent).toFixed(2)} remaining</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Spending Categories */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col">
          <h3 className="font-bold text-slate-900 text-base mb-4">Top Spending</h3>
          {sortedCategories.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs my-auto">
              No expense categories recorded yet.
            </div>
          ) : (
            <div className="space-y-3.5 my-auto">
              {sortedCategories.map(({ category, amount, percentage }) => {
                if (!category) return null;
                return (
                  <div key={category.id} className="flex items-center gap-3">
                    <CategoryIcon name={category.icon} color={category.color} size={16} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 truncate">{category.name}</span>
                        <span className="font-bold text-slate-900">{currencySymbol}{amount.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: category.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-base">Recent Transactions</h3>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({transactions.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-slate-600">No transactions recorded yet.</p>
            <button
              onClick={onOpenAddModal}
              className="mt-3 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              Add First Transaction
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const wal = walletMap.get(tx.walletId);
              const toWal = tx.toWalletId ? walletMap.get(tx.toWalletId) : null;
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';
              const isDebt = isDebtSettlementTx(tx);

              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon
                      name={isDebt ? 'Handshake' : isTransfer ? 'ArrowRightLeft' : (cat?.icon || 'Tag')}
                      color={isDebt ? '#059669' : isTransfer ? '#4f46e5' : (cat?.color || (isIncome ? '#10b981' : '#f59e0b'))}
                      size={18}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">
                        {tx.title}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5 truncate">
                        <span className="font-semibold text-slate-500">{formatTransactionDate(tx.date)}</span>
                        {formatTransactionTime(tx.createdAt, tx.time) && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                            {formatTransactionTime(tx.createdAt, tx.time)}
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-medium text-slate-600">
                          {isTransfer && toWal ? `${wal?.name || 'Wallet'} → ${toWal.name}` : (wal?.name || 'Wallet')}
                        </span>
                        {tx.note && (
                          <>
                            <span>•</span>
                            <span className="italic truncate">{tx.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-black ${
                        isIncome ? 'text-emerald-600' : isDebt ? 'text-emerald-600' : isTransfer ? 'text-indigo-600' : 'text-slate-900'
                      }`}
                    >
                      {isIncome ? '+' : isDebt ? '🤝 ' : isTransfer ? '⇄ ' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium capitalize">
                      {isDebt ? 'Debt Settled' : tx.type}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
