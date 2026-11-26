import { Category, Wallet, Transaction, Budget, AppSettings } from '../types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_WALLETS,
  DEFAULT_TRANSACTIONS,
  DEFAULT_BUDGETS,
  DEFAULT_SETTINGS,
} from '../data/defaultData';

const STORAGE_KEYS = {
  CATEGORIES: 'cashew_categories_v11',
  WALLETS: 'cashew_wallets_v11',
  TRANSACTIONS: 'cashew_transactions_v11',
  BUDGETS: 'cashew_budgets_v11',
  SETTINGS: 'cashew_settings_v11',
  TRASH: 'cashew_trash_v11',
};

export function loadStoredData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // If current key doesn't exist yet, check and migrate forward from previous versions
    // so user edits are NEVER lost on updates
    const baseKey = key.replace(/_v\d+$/, '');
    for (let v = 20; v >= 1; v--) {
      const prevKey = `${baseKey}_v${v}`;
      const prevRaw = localStorage.getItem(prevKey);
      if (prevRaw) {
        try {
          const parsed = JSON.parse(prevRaw);
          localStorage.setItem(key, prevRaw);
          return parsed;
        } catch {
          // ignore corrupted previous keys
        }
      }
    }

    return fallback;
  } catch (err) {
    console.error(`Error loading key "${key}" from localStorage:`, err);
    return fallback;
  }
}

export function saveStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving key "${key}" to localStorage:`, err);
  }
}

export const Storage = {
  getCategories: () => loadStoredData<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES),
  saveCategories: (cats: Category[]) => saveStoredData(STORAGE_KEYS.CATEGORIES, cats),

  getWallets: () => {
    const rawWallets = loadStoredData<Wallet[]>(STORAGE_KEYS.WALLETS, DEFAULT_WALLETS);
    const defMap = new Map(DEFAULT_WALLETS.map((w) => [w.id, w]));

    return rawWallets.map((w) => {
      const def = defMap.get(w.id);
      let updated = { ...w };

      if (def) {
        if (def.linkedAccountIds) updated.linkedAccountIds = def.linkedAccountIds;
        if (def.parentWalletId) updated.parentWalletId = def.parentWalletId;
        if (def.monthlyNote) updated.monthlyNote = def.monthlyNote;
        if (def.reconciledBalance !== undefined) updated.reconciledBalance = def.reconciledBalance;
      }

      // Hard safety guarantees for physical bank grouping
      if (updated.id === 'wal-meezan') {
        if (def?.reconciledBalance !== undefined) {
          updated.reconciledBalance = def.reconciledBalance;
        }
        if (!updated.linkedAccountIds?.includes('wal-charity')) {
          updated.linkedAccountIds = [...(updated.linkedAccountIds || []), 'wal-charity'];
        }
      }
      if (updated.id === 'wal-charity') {
        updated.parentWalletId = 'wal-meezan';
        updated.monthlyNote = 'Stored in Meezan';
      }

      return updated;
    });
  },
  saveWallets: (wals: Wallet[]) => saveStoredData(STORAGE_KEYS.WALLETS, wals),

  getTransactions: () => loadStoredData<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS),
  saveTransactions: (txs: Transaction[]) => saveStoredData(STORAGE_KEYS.TRANSACTIONS, txs),

  getBudgets: () => loadStoredData<Budget[]>(STORAGE_KEYS.BUDGETS, DEFAULT_BUDGETS),
  saveBudgets: (buds: Budget[]) => saveStoredData(STORAGE_KEYS.BUDGETS, buds),

  getSettings: () => loadStoredData<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
  saveSettings: (settings: AppSettings) => saveStoredData(STORAGE_KEYS.SETTINGS, settings),

  getTrashTransactions: () => loadStoredData<Transaction[]>(STORAGE_KEYS.TRASH, []),
  saveTrashTransactions: (txs: Transaction[]) => saveStoredData(STORAGE_KEYS.TRASH, txs),

  resetAll: () => {
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.WALLETS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.BUDGETS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.TRASH);
  },
};
