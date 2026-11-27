import { createClient } from '@supabase/supabase-js';
import { Wallet, Category, Transaction, Budget } from '../types';

export const SUPABASE_URL = 'https://cngomgzuejxjxuqwlset.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_HQgfABLoFk0hQY3ZI_pHzw_Di-jbEI8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function mapRowToWallet(row: any): Wallet {
  return {
    id: row.id,
    name: row.name,
    balance: Number(row.balance),
    currency: row.currency || 'PKR',
    color: row.color,
    icon: row.icon,
    type: row.type,
    parentWalletId: row.parent_wallet_id,
    monthlyNote: row.monthly_note,
    linkedAccountIds: Array.isArray(row.linked_account_ids) ? row.linked_account_ids : [],
    reconciledBalance: row.id === 'wal-meezan' ? 74504.39 : undefined,
  };
}

export function mapRowToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type,
  };
}

export function mapRowToBudget(row: any): Budget {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.limit_amount),
    period: row.period || 'monthly',
    categoryIds: Array.isArray(row.category_ids) ? row.category_ids : [],
    startDate: new Date().toISOString().split('T')[0],
  };
}

export function mapRowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    type: row.type,
    categoryId: row.category_id,
    walletId: row.wallet_id,
    toWalletId: row.to_wallet_id || undefined,
    date: row.date,
    time: row.time || undefined,
    note: row.note || undefined,
    createdAt: Number(row.created_at),
    deletedAt: row.deleted_at || undefined,
    isBorrowedExpense: row.is_borrowed_expense ?? Boolean(row.note?.includes('[Paid on Credit]')),
  };
}

// Fetch all core data from Supabase
export async function fetchAllFromSupabase(): Promise<{
  wallets: Wallet[];
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
} | null> {
  try {
    // 1. Fetch metadata in parallel
    const [wRes, cRes, bRes] = await Promise.all([
      supabase.from('wallets').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('budgets').select('*'),
    ]);

    if (wRes.error || cRes.error || bRes.error) {
      console.warn('Supabase fetch error, fallback to local:', {
        wErr: wRes.error,
        cErr: cRes.error,
        bErr: bRes.error,
      });
      return null;
    }

    // 2. Fetch all transactions with pagination (Supabase default limit is 1,000 rows)
    let allTxRows: any[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data: chunk, error: tErr } = await supabase
        .from('transactions')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (tErr) {
        console.warn('Supabase transactions chunk fetch error:', tErr);
        if (allTxRows.length === 0) return null;
        break;
      }
      if (!chunk || chunk.length === 0) break;
      allTxRows = allTxRows.concat(chunk);
      if (chunk.length < pageSize) break;
      page++;
    }

    const wallets: Wallet[] = (wRes.data || []).map(mapRowToWallet);
    const categories: Category[] = (cRes.data || []).map(mapRowToCategory);
    const budgets: Budget[] = (bRes.data || []).map(mapRowToBudget);
    const transactions: Transaction[] = allTxRows.map(mapRowToTransaction);

    return { wallets, categories, budgets, transactions };
  } catch (err) {
    console.error('Failed to load data from Supabase:', err);
    return null;
  }
}

// Save or update transaction
export async function dbUpsertTransaction(tx: Transaction): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from('transactions').upsert({
      id: tx.id,
      title: tx.title,
      amount: tx.amount,
      type: tx.type,
      category_id: tx.categoryId,
      wallet_id: tx.walletId,
      to_wallet_id: tx.toWalletId || null,
      date: tx.date,
      time: tx.time || null,
      note: tx.note || null,
      created_at: tx.createdAt || Date.now(),
      deleted_at: tx.deletedAt || null,
      is_borrowed_expense: Boolean(tx.isBorrowedExpense),
    });
    if (error) {
      console.error('dbUpsertTransaction error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('dbUpsertTransaction error:', err);
    return false;
  }
}

// Soft-delete transaction (moves to Trash)
export async function dbSoftDeleteTransaction(id: string, deletedAt?: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: deletedAt || new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('dbSoftDeleteTransaction error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('dbSoftDeleteTransaction error:', err);
    return false;
  }
}

// Restore transaction from Trash
export async function dbRestoreTransaction(id: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: null })
      .eq('id', id);
    if (error) {
      console.error('dbRestoreTransaction error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('dbRestoreTransaction error:', err);
    return false;
  }
}

// Permanently delete transaction immediately from Trash
export async function dbPermanentDeleteTransaction(id: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.error('dbPermanentDeleteTransaction error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('dbPermanentDeleteTransaction error:', err);
    return false;
  }
}

// Legacy alias for backwards compatibility
export const dbDeleteTransaction = dbSoftDeleteTransaction;

// Fetch all transactions currently in Trash
export async function dbFetchTrashTransactions(): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapRowToTransaction);
  } catch (err) {
    console.error('dbFetchTrashTransactions error:', err);
    return [];
  }
}

// Empty Trash (permanently wipe all deleted transactions)
export async function dbEmptyTrash(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from('transactions').delete().not('deleted_at', 'is', null);
    if (error) {
      console.error('dbEmptyTrash error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('dbEmptyTrash error:', err);
    return false;
  }
}

// Auto-purge transactions that have been in Trash longer than retentionDays (default 30 days)
export async function dbAutoPurgeOldTrash(retentionDays = 30): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoff)
      .select('id');

    if (error) {
      console.warn('Auto-purge trash notice:', error);
      return 0;
    }
    return data?.length || 0;
  } catch (err) {
    console.error('dbAutoPurgeOldTrash error:', err);
    return 0;
  }
}

// Save or update wallet
export async function dbUpsertWallet(w: Wallet): Promise<void> {
  try {
    await supabase.from('wallets').upsert({
      id: w.id,
      name: w.name,
      balance: w.balance,
      currency: w.currency || 'PKR',
      color: w.color,
      icon: w.icon,
      type: w.type,
      parent_wallet_id: w.parentWalletId || null,
      monthly_note: w.monthlyNote || null,
      linked_account_ids: w.linkedAccountIds || [],
    });
  } catch (err) {
    console.error('dbUpsertWallet error:', err);
  }
}

// Save multiple wallets (e.g. after balance adjustment)
export async function dbUpsertWallets(wallets: Wallet[]): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const rows = wallets.map((w) => ({
      id: w.id,
      name: w.name,
      balance: w.balance,
      currency: w.currency || 'PKR',
      color: w.color,
      icon: w.icon,
      type: w.type,
      parent_wallet_id: w.parentWalletId || null,
      monthly_note: w.monthlyNote || null,
      linked_account_ids: w.linkedAccountIds || [],
    }));
    const { error } = await supabase.from('wallets').upsert(rows);
    if (error) {
      console.error('dbUpsertWallets error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('dbUpsertWallets error:', err);
    return false;
  }
}

export interface RealtimeChangePayload {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
}

// Setup real-time listener for cross-device updates
export function subscribeToRealtimeChanges(onPayload: (payload: RealtimeChangePayload) => void) {
  const channel = supabase
    .channel('db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      (payload) => {
        onPayload(payload as unknown as RealtimeChangePayload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
