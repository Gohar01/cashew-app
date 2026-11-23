import { Wallet, Transaction } from '../types';

export const KNOWN_DEBT_ACCOUNTS = new Set([
  'wal-mom',
  'wal-wife',
  'wal-wife-mom',
  'wal-rizwan-bhai',
  'wal-abdul-rehman-hdc',
  'wal-waheed-build',
  'wal-samad-czn',
  'wal-shahrukh-hdc',
  'wal-jawad-hdc',
  'wal-mulla-waqas',
  'wal-tanveer-sf',
  'wal-abdul-mannan-wb',
  'wal-hassan-bhai',
  'wal-sajid-gali',
  'wal-farhan-gali',
  'wal-fareed-chowkidar',
  'wal-shahzad',
  'wal-bilal-build-plaza',
  'wal-bilal-build',
  'wal-k-khala',
  'wal-saifullah',
  'wal-billo-chacha',
  'wal-bilal-czn',
  'wal-rahib-hdc',
  'wal-shabu-bona',
  'wal-mubeen-build',
  'wal-rehan-build',
  'wal-s-cousn',
  'wal-ali',
  'wal-sherry',
  'wal-mohsin-hdc',
  'wal-khalid-pan-wala',
  'wal-asad-pathan',
  'wal-shahid-hdc',
  'wal-s--phuppi',
  'wal-anum-u',
  'wal-affan-hdc',
  'wal-javaid-ncm',
  'wal-aman-hdc',
  'wal-rabiya-tps',
]);

/**
 * Returns true if the wallet represents a person or lent/debt contact account.
 */
export function isDebtAccount(wallet?: Wallet | null): boolean {
  if (!wallet) return false;
  if (wallet.isDebt === true) return true;
  if (KNOWN_DEBT_ACCOUNTS.has(wallet.id)) return true;
  // If it's classified as 'other' and has a negative balance or is a contact (excluding Charity)
  if (wallet.type === 'other' && wallet.id !== 'wal-charity' && (wallet.balance < 0 || KNOWN_DEBT_ACCOUNTS.has(wallet.id))) {
    return true;
  }
  return false;
}

/**
 * Returns the nature of the transfer between two wallets.
 */
export function getDebtTransferType(
  fromWallet?: Wallet | null,
  toWallet?: Wallet | null
): 'repayment' | 'loan' | 'standard' {
  const sourceIsDebt = isDebtAccount(fromWallet);
  const destIsDebt = isDebtAccount(toWallet);

  if (sourceIsDebt && !destIsDebt) return 'repayment'; // Person pays back -> Cash/Bank
  if (!sourceIsDebt && destIsDebt) return 'loan';      // Bank/Cash -> Person (Loan Given)
  return 'standard';
}

/**
 * Returns true if a transaction represents a debt / lent settlement or loan given.
 */
export function isDebtSettlementTx(tx: Transaction, wallets?: Wallet[]): boolean {
  if (tx.isDebtSettlement === true) return true;
  if (
    tx.note &&
    (tx.note.includes('[Debt Settlement]') ||
      tx.note.includes('[Loan Given]') ||
      tx.note.includes('Debt Repaid') ||
      tx.note.includes('Settled Debt') ||
      tx.note.includes('Loan'))
  ) {
    return true;
  }

  // Automatic detection based on wallet ids
  if (tx.type === 'transfer' && tx.toWalletId) {
    const fromW = wallets?.find((w) => w.id === tx.walletId);
    const toW = wallets?.find((w) => w.id === tx.toWalletId);
    const sourceIsDebt = wallets ? isDebtAccount(fromW) : KNOWN_DEBT_ACCOUNTS.has(tx.walletId);
    const destIsDebt = wallets ? isDebtAccount(toW) : KNOWN_DEBT_ACCOUNTS.has(tx.toWalletId || '');
    if (sourceIsDebt || destIsDebt) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates the exact balance delta this transaction has on a target wallet.
 * Positive return value means wallet balance increases.
 * Negative return value means wallet balance decreases.
 */
export function getTxBalanceDelta(
  tx: Transaction,
  targetWalletId: string,
  wallets?: Wallet[]
): number {
  const isTransfer = tx.type === 'transfer' && Boolean(tx.toWalletId);

  if (isTransfer) {
    const fromW = wallets?.find((w) => w.id === tx.walletId);
    const toW = wallets?.find((w) => w.id === tx.toWalletId);
    const sourceIsDebt = wallets ? isDebtAccount(fromW) : KNOWN_DEBT_ACCOUNTS.has(tx.walletId);
    const destIsDebt = wallets ? isDebtAccount(toW) : KNOWN_DEBT_ACCOUNTS.has(tx.toWalletId || '');

    // Case A: Debt Repayment (Debtor pays back into Cash/Bank)
    // e.g. From: Mom (Debt), To: Cash (Asset)
    if (sourceIsDebt && !destIsDebt) {
      if (targetWalletId === tx.walletId) {
        // Debt is cleared towards 0 (+amount)
        return tx.amount;
      }
      if (targetWalletId === tx.toWalletId) {
        // Cash is received (+amount)
        return tx.amount;
      }
      return 0;
    }

    // Case B: Lending Money / Paying on behalf of person / Giving Loan
    // e.g. From: Meezan (Asset/Bank), To: Waheed Build (Debt/Person)
    if (!sourceIsDebt && destIsDebt) {
      if (targetWalletId === tx.walletId) {
        // Bank funds spent (-amount)
        return -tx.amount;
      }
      if (targetWalletId === tx.toWalletId) {
        // Loan balance INCREASES into negative (-amount)
        return -tx.amount;
      }
      return 0;
    }

    // Case C: Standard transfer between normal accounts (e.g. Meezan -> Cash)
    if (targetWalletId === tx.walletId) {
      return -tx.amount;
    }
    if (targetWalletId === tx.toWalletId) {
      return tx.amount;
    }
    return 0;
  }

  // Regular Income or Expense
  if (targetWalletId === tx.walletId) {
    return tx.type === 'income' ? tx.amount : -tx.amount;
  }

  return 0;
}
