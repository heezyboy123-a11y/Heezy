import React, { useState } from 'react';
import { X, ShieldCheck, CreditCard, Globe, Download, Save, Check } from 'lucide-react';
import { PaystackConfig, getPaystackConfig, savePaystackConfig, getStoredBooks } from '../services/storage';

interface PaystackSettingsModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onConfigSaved: (config: PaystackConfig) => void;
}

export const PaystackSettingsModal: React.FC<PaystackSettingsModalProps> = ({
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<PaystackConfig>(getPaystackConfig());
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    savePaystackConfig(config);
    onConfigSaved(config);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  const handleExportBackup = () => {
    const books = getStoredBooks();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(books, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `openshelf_catalog_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                Paystack &amp; Store Settings
              </h2>
              <p className="text-xs text-stone-500">
                Payment clearance, international cards, and catalog backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Paystack Public Key */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Paystack Public Key (Live or Test)
            </label>
            <input
              type="text"
              required
              value={config.publicKey}
              onChange={(e) => setConfig({ ...config, publicKey: e.target.value.trim() })}
              placeholder="pk_test_... or pk_live_..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
            />
            <span className="text-[11px] text-stone-500 mt-1 block">
              Found under <strong>Settings &rarr; API Keys &amp; Webhooks</strong> on your Paystack Dashboard.
            </span>
          </div>

          {/* Test / Live Toggle */}
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-900 block">Payment Mode</span>
              <span className="text-[11px] text-stone-500">
                {config.isLive
                  ? 'Real transactions enabled with live Paystack credentials'
                  : 'Test mode (safe sandbox clearance)'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.isLive}
                onChange={(e) => setConfig({ ...config, isLive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900"></div>
            </label>
          </div>

          {/* International Cards Status */}
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
              <CreditCard className="w-4 h-4 text-stone-700" />
              <span>International Cards Acceptance</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Visa, Mastercard, Verve, and American Express are accepted. Paystack routes international cards through 3D-Secure authentication.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-800 font-medium">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>USD and NGN multi-currency conversion active</span>
            </div>
          </div>

          {/* Business Name */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Store &amp; Imprint Name
            </label>
            <input
              type="text"
              value={config.businessName}
              onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
            />
          </div>

          {/* Backup Catalog Action */}
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-900 block">Catalog Database Backup</span>
              <span className="text-[11px] text-stone-500">
                Download a JSON copy of all your uploaded books and metadata
              </span>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3 py-1.5 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>Export JSON</span>
            </button>
          </div>

          {/* Save Action */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Settings Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
