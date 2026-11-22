import React from 'react';
import {
  LayoutDashboard,
  Wallet as WalletIcon,
  Receipt,
  PieChart,
  Plus,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenAddModal,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 z-40 flex items-center justify-around shadow-lg">
      {/* 1. Overview */}
      <button
        onClick={() => onTabChange('dashboard')}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
          activeTab === 'dashboard' ? 'text-amber-600 font-bold' : 'text-slate-500 font-medium'
        }`}
      >
        <LayoutDashboard size={20} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
        <span className="text-[10px]">Overview</span>
      </button>

      {/* 2. Accounts & Wallets */}
      <button
        onClick={() => onTabChange('wallets')}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
          activeTab === 'wallets' ? 'text-amber-600 font-bold' : 'text-slate-500 font-medium'
        }`}
      >
        <WalletIcon size={20} strokeWidth={activeTab === 'wallets' ? 2.5 : 2} />
        <span className="text-[10px]">Accounts</span>
      </button>

      {/* 3. Floating Center Action Button */}
      <button
        onClick={onOpenAddModal}
        className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/35 border-2 border-white active:scale-95 transition-all cursor-pointer"
        aria-label="Add transaction"
      >
        <Plus size={24} strokeWidth={2.8} />
      </button>

      {/* 4. Transactions History */}
      <button
        onClick={() => onTabChange('transactions')}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
          activeTab === 'transactions' ? 'text-amber-600 font-bold' : 'text-slate-500 font-medium'
        }`}
      >
        <Receipt size={20} strokeWidth={activeTab === 'transactions' ? 2.5 : 2} />
        <span className="text-[10px]">History</span>
      </button>

      {/* 5. Budgets & Goals */}
      <button
        onClick={() => onTabChange('budgets')}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
          activeTab === 'budgets' ? 'text-amber-600 font-bold' : 'text-slate-500 font-medium'
        }`}
      >
        <PieChart size={20} strokeWidth={activeTab === 'budgets' ? 2.5 : 2} />
        <span className="text-[10px]">Budgets</span>
      </button>
    </div>
  );
};
