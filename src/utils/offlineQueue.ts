import { Transaction, Wallet } from '../types';
import {
  dbUpsertTransaction,
  dbSoftDeleteTransaction,
  dbRestoreTransaction,
  dbPermanentDeleteTransaction,
  dbEmptyTrash,
  dbUpsertWallets,
} from './supabase';

const OFFLINE_QUEUE_KEY = 'cashew_offline_queue_v1';

export type OfflineOp =
  | { type: 'upsert_tx'; tx: Transaction }
  | { type: 'soft_delete_tx'; id: string; deletedAt: string }
  | { type: 'restore_tx'; id: string }
  | { type: 'permanent_delete_tx'; id: string }
  | { type: 'empty_trash' }
  | { type: 'upsert_wallets'; wallets: Wallet[] };

export function getOfflineQueue(): OfflineOp[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: OfflineOp[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save offline queue:', err);
  }
}

export function enqueueOfflineOp(op: OfflineOp): OfflineOp[] {
  let queue = getOfflineQueue();

  if (op.type === 'upsert_wallets') {
    // Only keep the latest wallet snapshot
    queue = queue.filter((item) => item.type !== 'upsert_wallets');
  } else if (op.type === 'upsert_tx') {
    queue = queue.filter((item) => !(item.type === 'upsert_tx' && item.tx.id === op.tx.id));
  } else if (op.type === 'permanent_delete_tx') {
    queue = queue.filter(
      (item) =>
        !(
          (item.type === 'upsert_tx' && item.tx.id === op.id) ||
          (item.type === 'soft_delete_tx' && item.id === op.id) ||
          (item.type === 'restore_tx' && item.id === op.id) ||
          (item.type === 'permanent_delete_tx' && item.id === op.id)
        )
    );
  } else if (op.type === 'empty_trash') {
    queue = queue.filter((item) => item.type !== 'empty_trash');
  }

  queue.push(op);
  saveOfflineQueue(queue);
  return queue;
}

export async function executeOp(op: OfflineOp): Promise<boolean> {
  switch (op.type) {
    case 'upsert_tx':
      return dbUpsertTransaction(op.tx);
    case 'soft_delete_tx':
      return dbSoftDeleteTransaction(op.id, op.deletedAt);
    case 'restore_tx':
      return dbRestoreTransaction(op.id);
    case 'permanent_delete_tx':
      return dbPermanentDeleteTransaction(op.id);
    case 'empty_trash':
      return dbEmptyTrash();
    case 'upsert_wallets':
      return dbUpsertWallets(op.wallets);
  }
}

export async function flushOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const q = getOfflineQueue();
    return { syncedCount: 0, remainingCount: q.length };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, remainingCount: 0 };
  }

  let syncedCount = 0;
  for (let i = 0; i < queue.length; i++) {
    const ok = await executeOp(queue[i]);
    if (!ok) {
      const remaining = queue.slice(i);
      saveOfflineQueue(remaining);
      return { syncedCount, remainingCount: remaining.length };
    }
    syncedCount++;
  }

  saveOfflineQueue([]);
  return { syncedCount, remainingCount: 0 };
}
