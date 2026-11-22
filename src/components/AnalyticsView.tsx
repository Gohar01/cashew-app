import React from 'react';
import { BarChart3, TrendingDown, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Transaction, Category, Wallet } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  currencySymbol: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  categories,
  currencySymbol,
}) => {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + t.amount;
    });

  const categoryAnalytics = Object.entries(expensesByCategory)
    .map(([catId, amount]) => {
      const cat = categoryMap.get(catId);
      const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      return {
        cat,
        amount,
        percentage,
      };
    })
    .filter((item) => item.cat !== undefined)
    .sort((a, b) => b.amount - a.amount);

  // Largest transaction
  const largestExpense = transactions
    .filter((t) => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span>Total Inflow</span>
            <ArrowDownLeft size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            +{currencySymbol}{totalIncome.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span>Total Outflow</span>
            <ArrowUpRight size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">
            -{currencySymbol}{totalExpense.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span>Largest Single Expense</span>
            <TrendingDown size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {largestExpense ? `${currencySymbol}${largestExpense.amount.toFixed(2)}` : 'N/A'}
          </div>
          {largestExpense && (
            <div className="text-xs text-slate-600 mt-1 truncate">
              {largestExpense.title} ({largestExpense.date})
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown Breakdown */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-amber-500" />
            <h3 className="font-bold text-slate-900 text-lg">Expense Breakdown by Category</h3>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {categoryAnalytics.length} active spending categories
          </span>
        </div>

        {categoryAnalytics.length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-sm">
            No expenses recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {categoryAnalytics.map(({ cat, amount, percentage }) => {
              if (!cat) return null;
              return (
                <div key={cat.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon name={cat.icon} color={cat.color} size={16} />
                      <span className="font-bold text-slate-900 text-sm">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 text-sm">
                        {currencySymbol}{amount.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-600 font-semibold ml-2">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Meter bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
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
