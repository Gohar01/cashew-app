export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  type: 'cash' | 'bank' | 'card' | 'savings' | 'other';
  linkedAccountIds?: string[]; // IDs of sub-accounts sharing this physical account (e.g. Dad, Extra, Tenders)
  parentWalletId?: string; // ID of physical parent wallet if this is a sub-account/envelope
  monthlyNote?: string; // Monthly commitment note (e.g. "Rs 2,000/mo to MCF")
  reconciledBalance?: number; // Physical bank statement amount (reconciled bank balance)
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  walletId: string;
  toWalletId?: string; // For transfers
  date: string; // ISO date string YYYY-MM-DD
  time?: string; // Optional time string e.g. "3:31 AM"
  note?: string;
  createdAt: number;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  categoryIds: string[]; // Categories included in budget
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
}

export interface AppSettings {
  currency: string;
  currencySymbol: string;
  theme: 'light' | 'dark' | 'system';
}

export type ActiveTab = 'dashboard' | 'transactions' | 'budgets' | 'wallets' | 'analytics' | 'import-export';
