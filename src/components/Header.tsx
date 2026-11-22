import React from 'react';
import { Coins, Cloud } from 'lucide-react';
import { AppSettings, ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  settings: AppSettings;
  onUpdateCurrency: (currency: string, symbol: string) => void;
  onOpenImport: () => void;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'PKR', symbol: 'Rs', label: 'PKR (Rs)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'AED', symbol: 'AED', label: 'AED (د.إ)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
];

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Financial Overview', subtitle: 'Real-time cash flow & budget tracking' },
  transactions: { title: 'Transactions Log', subtitle: 'View, filter, and organize all spending' },
  budgets: { title: 'Budgets & Limits', subtitle: 'Keep spending on target across categories' },
  wallets: { title: 'Accounts & Wallets', subtitle: 'Manage multiple bank, cash, and credit cards' },
  analytics: { title: 'Analytics & Insights', subtitle: 'Visual charts and expense breakdown' },
  'import-export': { title: 'Cashew Sync & Backup', subtitle: 'Import Cashew files, restore backups, or export' },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  settings,
  onUpdateCurrency,
  onOpenImport,
}) => {
  const currentInfo = TAB_TITLES[activeTab];

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Title & Mobile Brand */}
      <div className="flex items-center gap-3">
        {/* Mobile-only logo */}
        <div className="md:hidden w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
          🌰
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none">
            {currentInfo.title}
          </h2>
          <p className="text-xs text-slate-600 hidden sm:block mt-1">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Cloud live sync badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <Cloud size={13} className="text-emerald-600" />
          <span className="hidden sm:inline">Cloud Live Sync</span>
          <span className="sm:hidden">Synced</span>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-100 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors border border-slate-200/60">
          <Coins size={14} className="text-amber-600" />
          <select
            value={settings.currency}
            onChange={(e) => {
              const selected = CURRENCIES.find((c) => c.code === e.target.value);
              if (selected) {
                onUpdateCurrency(selected.code, selected.symbol);
              }
            }}
            className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cashew Import Quick Button */}
        {activeTab !== 'import-export' && (
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 rounded-xl px-3 py-1.5 transition-all cursor-pointer"
          >
            <span>Import Cashew</span>
          </button>
        )}
      </div>
    </header>
  );
};
