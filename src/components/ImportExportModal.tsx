import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  FileText,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { Category, Wallet, Transaction, Budget } from '../types';
import { importFromCSV, importFromJSON, exportDataToFile, ImportResult } from '../utils/importers';

interface ImportExportModalProps {
  categories: Category[];
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: Budget[];
  onApplyImport: (
    newTransactions: Transaction[],
    newCategories: Category[],
    newWallets: Wallet[],
    newBudgets: Budget[],
    mode: 'merge' | 'replace'
  ) => void;
  onResetToDefault: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  categories,
  wallets,
  transactions,
  budgets,
  onApplyImport,
  onResetToDefault,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lowerName = file.name.toLowerCase();
      let result: ImportResult;

      if (lowerName.endsWith('.csv')) {
        result = importFromCSV(text, categories, wallets);
      } else {
        // Assume JSON or Cashew data format
        result = importFromJSON(text, categories, wallets, budgets);
      }

      setImportResult(result);
    };

    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!importResult || !importResult.success) return;

    onApplyImport(
      importResult.transactions,
      importResult.categories,
      importResult.wallets,
      importResult.budgets,
      importMode
    );

    setNotification(`Successfully ${importMode === 'replace' ? 'replaced data with' : 'merged'} ${importResult.transactions.length} transactions!`);
    setImportResult(null);
    setFileName('');
  };

  const handleExportJSON = () => {
    const payload = {
      app: 'Cashew Pro Web/Desktop',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      categories,
      wallets,
      budgets,
      transactions,
    };
    exportDataToFile(payload, `cashew-backup-${new Date().toISOString().split('T')[0]}.json`, 'json');
  };

  const handleExportCSV = () => {
    exportDataToFile(transactions, `cashew-transactions-${new Date().toISOString().split('T')[0]}.csv`, 'csv');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 md:pb-6">
      {/* Status banner */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" />
            <span className="font-semibold">{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Cashew Mobile Export Instructions Card */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 border border-amber-300/60 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <HelpCircle size={22} />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-base">
              How to export your data from the Cashew Mobile App:
            </h3>
            <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside font-medium leading-relaxed">
              <li>
                Open <strong>Cashew</strong> on your phone.
              </li>
              <li>
                Tap <strong>More</strong> (or <strong>Settings</strong>) in the bottom navigation.
              </li>
              <li>
                Select <strong>Settings & Customization</strong> $\rightarrow$ <strong>Import & Export Data</strong>.
              </li>
              <li>
                Tap <strong>Export Cashew Data File</strong> (or <strong>Export to CSV</strong>) and save it to your device or Google Drive.
              </li>
              <li>
                Upload or drag that file into the box below.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <h3 className="font-bold text-slate-900 text-lg mb-1 flex items-center gap-2">
          <UploadCloud size={20} className="text-amber-500" />
          <span>Upload Cashew Backup or CSV File</span>
        </h3>
        <p className="text-xs text-slate-600 mb-4">
          Supports <strong>.json</strong> (Cashew backup), <strong>.csv</strong> (Cashew transactions export), or <strong>.txt</strong>.
        </p>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-amber-500 bg-amber-50/50 scale-[1.01]'
              : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.txt,.cashew"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
            <FileSpreadsheet size={28} />
          </div>
          <p className="text-sm font-bold text-slate-800">
            Click to browse or drag and drop your Cashew data file here
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Data is parsed locally in your browser. Nothing is ever sent to an external server.
          </p>
        </div>

        {/* Parsed File Preview */}
        {importResult && (
          <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileText size={20} className="text-amber-600" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{fileName}</h4>
                  <p className="text-xs text-slate-600">{importResult.message}</p>
                </div>
              </div>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  importResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {importResult.success ? 'Ready to Import' : 'Error'}
              </span>
            </div>

            {importResult.success && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-lg font-black text-slate-900">
                      {importResult.stats.importedTransactions}
                    </div>
                    <div className="text-[10px] text-slate-600 font-semibold uppercase">
                      Transactions
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-lg font-black text-slate-900">
                      {importResult.categories.length}
                    </div>
                    <div className="text-[10px] text-slate-600 font-semibold uppercase">
                      Categories
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-lg font-black text-slate-900">
                      {importResult.wallets.length}
                    </div>
                    <div className="text-[10px] text-slate-600 font-semibold uppercase">
                      Accounts
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-lg font-black text-slate-900">
                      {importResult.budgets.length}
                    </div>
                    <div className="text-[10px] text-slate-600 font-semibold uppercase">
                      Budgets
                    </div>
                  </div>
                </div>

                {/* Import Mode Selection */}
                <div className="flex items-center gap-4 text-xs pt-2">
                  <span className="font-bold text-slate-700">Import Method:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-medium text-slate-700">Merge with existing</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-medium text-rose-700">Replace current data</span>
                  </label>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={handleConfirmImport}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <span>Apply & Load Transactions</span>
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Export & Backup Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
          <Download size={20} className="text-amber-500" />
          <span>Export & Backup</span>
        </h3>
        <p className="text-xs text-slate-600">
          Save your current financial records to your computer or phone anytime.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 text-slate-800 font-bold text-xs transition-all cursor-pointer text-center"
          >
            <Download size={16} className="text-amber-600" />
            <span>Download Full Backup (JSON)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 text-slate-800 font-bold text-xs transition-all cursor-pointer text-center"
          >
            <FileSpreadsheet size={16} className="text-amber-600" />
            <span>Export Transactions (CSV)</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Reset to sample data */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-rose-600">
            <AlertCircle size={16} />
            <span>Reset / Reload Sample Data</span>
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            Reset accounts, categories, and sample transactions to test out the application.
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to reload sample data? Current unsaved entries will be replaced.')) {
              onResetToDefault();
              setNotification('Reset back to default sample state!');
            }
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw size={14} />
          <span>Reload Defaults</span>
        </button>
      </div>
    </div>
  );
};
