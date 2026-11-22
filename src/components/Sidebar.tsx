import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Wallet,
  BarChart3,
  FileSpreadsheet,
  Plus,
  Sparkles,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  totalBalance: number;
  currencySymbol: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenAddModal,
  totalBalance,
  currencySymbol,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'budgets', label: 'Budgets & Goals', icon: PieChart },
    { id: 'wallets', label: 'Accounts & Wallets', icon: Wallet },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'import-export', label: 'Cashew Sync & Backup', icon: FileSpreadsheet, badge: 'Data' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 min-h-screen p-5 select-none shrink-0 shadow-sm">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-bold text-xl">
          🌰
        </div>
        <div>
          <h1 className="font-extrabold text-slate-900 tracking-tight text-lg flex items-center gap-1.5">
            Cashew <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">Pro</span>
          </h1>
          <p className="text-xs text-slate-600 font-medium">Cross-Platform Tracker</p>
        </div>
      </div>

      {/* Quick Add Action Button */}
      <button
        onClick={onOpenAddModal}
        className="w-full mb-6 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 px-4 rounded-2xl shadow-md shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span>Add Transaction</span>
      </button>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-50 text-amber-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={19}
                  className={isActive ? 'text-amber-600' : 'text-slate-500'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100/80 text-amber-800">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Total Balance Mini Card */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium mb-1">
            <span>Net Worth</span>
            <Sparkles size={13} className="text-amber-500" />
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">
            {currencySymbol}{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
            <span>●</span> Local & Private Storage
          </div>
        </div>
      </div>
    </aside>
  );
};
