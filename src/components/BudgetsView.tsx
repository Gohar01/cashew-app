import React from 'react';
import {
  PieChart as PieChartIcon,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Budget, Transaction, Category } from '../types';

interface BudgetsViewProps {
  budgets: Budget[];
  transactions: Transaction[];
  categories: Category[];
  currencySymbol: string;
  onOpenAddBudget: () => void;
  onDeleteBudget: (id: string) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  budgets,
  transactions,
  categories,
  currencySymbol,
  onOpenAddBudget,
  onDeleteBudget,
}) => {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Calculate budget statistics
  const budgetStats = budgets.map((b) => {
    const spent = transactions
      .filter((t) => t.type === 'expense' && b.categoryIds.includes(t.categoryId))
      .reduce((acc, t) => acc + t.amount, 0);

    const percent = Math.round((spent / b.amount) * 100);
    const isOver = spent > b.amount;
    const remaining = b.amount - spent;

    return {
      budget: b,
      spent,
      percent,
      isOver,
      remaining,
    };
  });

  const totalBudgeted = budgets.reduce((acc, b) => acc + b.amount, 0);
  const totalSpentInBudgets = budgetStats.reduce((acc, bs) => acc + bs.spent, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-6">
      {/* Top Banner & Stats */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PieChartIcon size={20} className="text-amber-500" />
            <h3 className="font-bold text-slate-900 text-lg">Monthly Budget Targets</h3>
          </div>
          <p className="text-xs text-slate-600">
            Total Allocated: <span className="font-bold text-slate-900">{currencySymbol}{totalBudgeted.toFixed(2)}</span> • Spent: <span className="font-bold text-slate-900">{currencySymbol}{totalSpentInBudgets.toFixed(2)}</span>
          </p>
        </div>

        <button
          onClick={onOpenAddBudget}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Budget</span>
        </button>
      </div>

      {/* Budgets Grid */}
      {budgets.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-700">No active budgets yet.</p>
          <p className="text-xs text-slate-600 mt-1">Set spending limits on groceries, leisure, or utilities to stay on track.</p>
          <button
            onClick={onOpenAddBudget}
            className="mt-4 text-xs font-bold bg-amber-500 text-white px-4 py-2 rounded-xl cursor-pointer"
          >
            Create Your First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgetStats.map(({ budget, spent, percent, isOver, remaining }) => {
            return (
              <div
                key={budget.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{budget.name}</h4>
                      <div className="text-[11px] text-slate-600 font-medium capitalize mt-0.5">
                        {budget.period} Period
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteBudget(budget.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Delete budget"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xl font-black text-slate-900">
                      {currencySymbol}{spent.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      limit of {currencySymbol}{budget.amount.toFixed(2)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver
                          ? 'bg-rose-500'
                          : percent > 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>

                  {/* Status Note */}
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      {isOver ? (
                        <span className="text-rose-600 flex items-center gap-1">
                          <AlertTriangle size={13} />
                          Overbudget
                        </span>
                      ) : (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          On Track
                        </span>
                      )}
                    </div>
                    <div className={isOver ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                      {isOver ? `+${currencySymbol}${Math.abs(remaining).toFixed(2)}` : `${currencySymbol}${remaining.toFixed(2)} left`}
                    </div>
                  </div>
                </div>

                {/* Linked Categories Badges */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-[10px] uppercase font-bold text-slate-600 mb-1.5">
                    Covered Categories:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {budget.categoryIds.map((cid) => {
                      const cat = categoryMap.get(cid);
                      if (!cat) return null;
                      return (
                        <span
                          key={cid}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                        >
                          {cat.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
