import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Budget, Category } from '../types';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (budget: Budget) => void;
  categories: Category[];
  currencySymbol: string;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  currencySymbol,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleCategory = (id: string) => {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (selectedCats.length === 0) return;

    onSave({
      id: `bud-${Date.now()}`,
      name: name.trim() || 'New Budget',
      amount: numAmount,
      period,
      categoryIds: selectedCats,
      startDate: new Date().toISOString().split('T')[0],
    });

    setName('');
    setAmount('');
    setSelectedCats([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-lg">Create Spending Budget</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Budget Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Groceries & Coffee, Shopping"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-semibold px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Limit ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-sm font-bold px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'monthly' | 'weekly' | 'yearly')}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Categories Included
            </label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
              {categories
                .filter((c) => c.type === 'expense')
                .map((cat) => {
                  const isChecked = selectedCats.includes(cat.id);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        isChecked ? 'bg-amber-50 text-amber-900 border border-amber-200/60' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded-sm text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                  );
                })}
            </div>
            {selectedCats.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1 font-medium">
                * Please check at least one category to track.
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedCats.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white cursor-pointer"
            >
              <Check size={16} />
              <span>Create Budget</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
