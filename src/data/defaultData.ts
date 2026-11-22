import { Category, Wallet, Transaction, Budget, AppSettings } from '../types';
import {
  CASHEW_SETTINGS,
  CASHEW_CATEGORIES,
  CASHEW_WALLETS,
  CASHEW_BUDGETS,
  CASHEW_TRANSACTIONS,
} from './cashewInitialData';

export const DEFAULT_SETTINGS: AppSettings = CASHEW_SETTINGS;
export const DEFAULT_CATEGORIES: Category[] = CASHEW_CATEGORIES;
export const DEFAULT_WALLETS: Wallet[] = CASHEW_WALLETS;
export const DEFAULT_BUDGETS: Budget[] = CASHEW_BUDGETS;
export const DEFAULT_TRANSACTIONS: Transaction[] = CASHEW_TRANSACTIONS;
