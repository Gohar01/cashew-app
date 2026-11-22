import { Category, Wallet, Transaction, Budget, TransactionType } from '../types';

export interface ImportResult {
  success: boolean;
  message: string;
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  budgets: Budget[];
  stats: {
    importedTransactions: number;
    importedCategories: number;
    importedWallets: number;
    importedBudgets: number;
  };
}

/**
 * Robustly parses a CSV string into rows of string arrays, handling newlines inside quotes.
 */
function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === ',' || char === ';') && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function formatHexColor(colorStr: string, fallback: string): string {
  if (!colorStr) return fallback;
  const match = colorStr.match(/0X[0-9A-Fa-f]{2}([0-9A-Fa-f]{6})/i);
  if (match) return `#${match[1].toLowerCase()}`;
  if (colorStr.startsWith('#')) return colorStr;
  return fallback;
}

/**
 * Intelligently imports CSV data from Cashew or other expense trackers.
 */
export function importFromCSV(
  csvText: string,
  existingCategories: Category[],
  existingWallets: Wallet[]
): ImportResult {
  const rows = parseCSVRows(csvText);
  if (rows.length < 2) {
    return {
      success: false,
      message: 'The CSV file appears to be empty or does not contain valid data rows.',
      transactions: [],
      categories: existingCategories,
      wallets: existingWallets,
      budgets: [],
      stats: { importedTransactions: 0, importedCategories: 0, importedWallets: 0, importedBudgets: 0 },
    };
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Detect column indices
  const accountIdx = headers.findIndex((h) => h === 'account' || h.includes('wallet') || h.includes('method'));
  const amountIdx = headers.findIndex((h) => h === 'amount' || h.includes('cost') || h.includes('val'));
  const titleIdx = headers.findIndex((h) => h === 'title' || h.includes('payee') || h.includes('desc'));
  const noteIdx = headers.findIndex((h) => h === 'note' || h.includes('memo') || h.includes('comment'));
  const dateIdx = headers.findIndex((h) => h === 'date' || h.includes('time'));
  const incomeIdx = headers.findIndex((h) => h === 'income');
  const typeIdx = headers.findIndex((h) => h === 'type' || h.includes('direction'));
  const categoryIdx = headers.findIndex((h) => h.includes('category') || h.includes('cat'));
  const colorIdx = headers.findIndex((h) => h === 'color');
  const emojiIdx = headers.findIndex((h) => h === 'emoji');

  if (amountIdx === -1) {
    return {
      success: false,
      message: 'Could not find an "Amount" column in the uploaded CSV.',
      transactions: [],
      categories: existingCategories,
      wallets: existingWallets,
      budgets: [],
      stats: { importedTransactions: 0, importedCategories: 0, importedWallets: 0, importedBudgets: 0 },
    };
  }

  const newCategories = [...existingCategories];
  const newWallets = [...existingWallets];
  const importedTransactions: Transaction[] = [];

  const getOrCreateCategory = (name: string, isIncome: boolean, colorStr?: string, emoji?: string): string => {
    const cleanName = name.trim() || (isIncome ? 'Income' : 'General');
    const found = newCategories.find((c) => c.name.toLowerCase() === cleanName.toLowerCase());
    if (found) return found.id;

    const newId = `cat-imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const color = formatHexColor(colorStr || '', isIncome ? '#10b981' : '#f59e0b');
    const icon = emoji || (isIncome ? 'TrendingUp' : 'Tag');

    newCategories.push({
      id: newId,
      name: cleanName,
      icon,
      color,
      type: isIncome ? 'income' : 'expense',
    });
    return newId;
  };

  const getOrCreateWallet = (name: string): string => {
    const cleanName = name.trim() || 'Primary Account';
    const found = newWallets.find((w) => w.name.toLowerCase() === cleanName.toLowerCase());
    if (found) return found.id;

    const newId = `wal-imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    newWallets.push({
      id: newId,
      name: cleanName,
      balance: 0,
      currency: 'PKR',
      color: '#0284c7',
      icon: 'Landmark',
      type: 'bank',
    });
    return newId;
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= amountIdx) continue;

    // Parse amount
    const rawAmountStr = row[amountIdx].replace(/[^\d.-]/g, '');
    const amount = parseFloat(rawAmountStr);
    if (isNaN(amount)) continue;

    // Determine type & income
    let type: TransactionType = 'expense';
    let isIncome = false;

    if (incomeIdx !== -1 && row[incomeIdx]) {
      isIncome = row[incomeIdx].toLowerCase() === 'true';
      type = isIncome ? 'income' : 'expense';
    } else if (typeIdx !== -1 && row[typeIdx]) {
      const typeStr = row[typeIdx].toLowerCase();
      if (typeStr.includes('income') || typeStr.includes('credit')) {
        type = 'income';
        isIncome = true;
      }
    } else if (amount > 0) {
      type = 'income';
      isIncome = true;
    }

    // Determine date
    let dateStr = new Date().toISOString().split('T')[0];
    let createdTimestamp = Date.now() - (rows.length - i) * 1000;
    if (dateIdx !== -1 && row[dateIdx]) {
      const dateMatch = row[dateIdx].match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        dateStr = dateMatch[1];
      }
      const parsedTime = new Date(row[dateIdx]).getTime();
      if (!isNaN(parsedTime)) {
        createdTimestamp = parsedTime;
      }
    }

    // Category
    const catName = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx] : 'General';
    const colorStr = colorIdx !== -1 ? row[colorIdx] : '';
    const emoji = emojiIdx !== -1 ? row[emojiIdx] : '';
    const catId = getOrCreateCategory(catName, isIncome, colorStr, emoji);

    // Wallet
    const walName = accountIdx !== -1 && row[accountIdx] ? row[accountIdx] : 'Cash';
    const walId = getOrCreateWallet(walName);

    // Title & note
    const title = titleIdx !== -1 && row[titleIdx] ? row[titleIdx] : '';
    const note = noteIdx !== -1 && row[noteIdx] ? row[noteIdx] : '';
    const displayTitle = title || (note ? note.split('\n')[0].substring(0, 40) : catName);

    importedTransactions.push({
      id: `tx-imp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      title: displayTitle || 'Imported Transaction',
      amount: Math.abs(amount),
      type,
      categoryId: catId,
      walletId: walId,
      date: dateStr,
      note: note || undefined,
      createdAt: createdTimestamp,
    });
  }

  return {
    success: true,
    message: `Successfully processed Cashew CSV with ${importedTransactions.length} transactions.`,
    transactions: importedTransactions,
    categories: newCategories,
    wallets: newWallets,
    budgets: [],
    stats: {
      importedTransactions: importedTransactions.length,
      importedCategories: newCategories.length - existingCategories.length,
      importedWallets: newWallets.length - existingWallets.length,
      importedBudgets: 0,
    },
  };
}

/**
 * Imports full JSON backup from Cashew or this application.
 */
export function importFromJSON(
  jsonText: string,
  existingCategories: Category[],
  existingWallets: Wallet[],
  existingBudgets: Budget[]
): ImportResult {
  try {
    const data = JSON.parse(jsonText);

    // If it's an array of transactions
    if (Array.isArray(data)) {
      const txs: Transaction[] = data.map((item, idx) => ({
        id: item.id || `tx-imp-${Date.now()}-${idx}`,
        title: item.title || item.name || item.note || 'Imported Transaction',
        amount: Math.abs(parseFloat(item.amount) || 0),
        type: (item.type === 'income' ? 'income' : item.type === 'transfer' ? 'transfer' : 'expense') as TransactionType,
        categoryId: item.categoryId || existingCategories[0]?.id || 'cat-general',
        walletId: item.walletId || existingWallets[0]?.id || 'wal-cash',
        toWalletId: item.toWalletId,
        date: item.date || new Date().toISOString().split('T')[0],
        note: item.note || '',
        createdAt: item.createdAt || Date.now(),
      }));

      return {
        success: true,
        message: `Successfully imported ${txs.length} transactions from JSON.`,
        transactions: txs,
        categories: existingCategories,
        wallets: existingWallets,
        budgets: existingBudgets,
        stats: {
          importedTransactions: txs.length,
          importedCategories: 0,
          importedWallets: 0,
          importedBudgets: 0,
        },
      };
    }

    // If it's a full backup object
    const newCategories = data.categories || existingCategories;
    const newWallets = data.wallets || existingWallets;
    const newBudgets = data.budgets || existingBudgets;
    const newTransactions = data.transactions || [];

    return {
      success: true,
      message: `Full backup imported: ${newTransactions.length} transactions, ${newWallets.length} accounts, ${newCategories.length} categories.`,
      transactions: newTransactions,
      categories: newCategories,
      wallets: newWallets,
      budgets: newBudgets,
      stats: {
        importedTransactions: newTransactions.length,
        importedCategories: newCategories.length - existingCategories.length,
        importedWallets: newWallets.length - existingWallets.length,
        importedBudgets: newBudgets.length - existingBudgets.length,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown JSON parse error';
    return {
      success: false,
      message: `Failed to parse JSON file: ${message}`,
      transactions: [],
      categories: existingCategories,
      wallets: existingWallets,
      budgets: existingBudgets,
      stats: { importedTransactions: 0, importedCategories: 0, importedWallets: 0, importedBudgets: 0 },
    };
  }
}

/**
 * Exports all application data into clean downloadable JSON
 */
export function exportToJSON(
  categories: Category[],
  wallets: Wallet[],
  transactions: Transaction[],
  budgets: Budget[]
): string {
  const exportData = {
    appName: 'Cashew PWA',
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    stats: {
      totalTransactions: transactions.length,
      totalWallets: wallets.length,
      totalCategories: categories.length,
      totalBudgets: budgets.length,
    },
    categories,
    wallets,
    budgets,
    transactions,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Exports transactions to CSV compatible with Cashew and spreadsheets
 */
export function exportToCSV(
  transactions: Transaction[],
  categories: Category[],
  wallets: Wallet[]
): string {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const walMap = new Map(wallets.map((w) => [w.id, w]));

  const headers = ['Account', 'Amount', 'Currency', 'Title', 'Note', 'Date', 'Income', 'Category'];
  const rows = transactions.map((t) => {
    const wal = walMap.get(t.walletId);
    const cat = catMap.get(t.categoryId);
    const isIncome = t.type === 'income';
    const amountVal = isIncome ? t.amount : -t.amount;
    const cleanNote = (t.note || '').replace(/"/g, '""');
    const cleanTitle = (t.title || '').replace(/"/g, '""');

    return [
      `"${wal?.name || 'Account'}"`,
      amountVal.toFixed(2),
      'PKR',
      `"${cleanTitle}"`,
      `"${cleanNote}"`,
      t.date,
      isIncome ? 'true' : 'false',
      `"${cat?.name || 'General'}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Triggers a client-side file download of JSON or CSV
 */
export function exportDataToFile(data: unknown, filename: string, type: 'json' | 'csv'): void {
  let content = '';
  let mimeType = 'text/plain';

  if (type === 'json') {
    content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    mimeType = 'application/json';
  } else {
    if (typeof data === 'string') {
      content = data;
    } else if (Array.isArray(data)) {
      const headers = ['ID', 'Account', 'Amount', 'Date', 'Type', 'Title', 'Note'];
      const rows = (data as Transaction[]).map((t) => [
        t.id,
        t.walletId,
        t.amount,
        t.date,
        t.type,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ].join(','));
      content = [headers.join(','), ...rows].join('\r\n');
    }
    mimeType = 'text/csv';
  }

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
