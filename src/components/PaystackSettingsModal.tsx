import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Globe,
  Download,
  Save,
  Check,
  Landmark,
  Info,
} from 'lucide-react';
import {
  PaystackConfig,
  getPaystackConfig,
  savePaystackConfig,
  getStoredBooks,
} from '../services/storage';

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
    }, 1100);
  };

  const handleExportBackup = () => {
    const books = getStoredBooks();
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(books, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `openshelf_catalog_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isUsingTestKey = !config.publicKey || config.publicKey.startsWith('pk_test_');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                Bank Payout &amp; Paystack Settings
              </h2>
              <p className="text-xs text-stone-500">
                Receive customer payments directly into your bank account or link a Paystack Live key
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Clear Payout Explanation Notice */}
          <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>How You Receive Money Into Your Bank Account</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-amber-900/90">
              <li>
                <strong>Option 1 — Direct Bank Transfer (No Paystack account needed):</strong>{' '}
                Enter your Bank Name, Account Number, and Account Name below. Buyers transfer directly from their bank app to yours, and you approve the transfer under <strong>Orders &amp; Dispatch</strong> to unlock their ebook.
              </li>
              <li>
                <strong>Option 2 — Paystack Automatic Card Payouts:</strong> Paystack Test keys (<code className="font-mono">pk_test_...</code>) do not send real money. To receive automatic Visa/Mastercard/Verve payouts into your bank, sign up free at <span className="underline font-medium">dashboard.paystack.com</span>, link your bank under <strong>Settings &rarr; Settlement Accounts</strong>, then paste your Live Public Key (<code className="font-mono">pk_live_...</code>) below and enable Live Mode.
              </li>
            </ul>
          </div>

          {/* SECTION 1: DIRECT BANK ACCOUNT PAYOUT */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-700" />
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    Direct Bank Account (Receive Transfers Directly)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Shown at checkout so customers can pay straight into your bank account
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableBankTransfer ?? true}
                  onChange={(e) =>
                    setConfig({ ...config, enableBankTransfer: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-700"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={config.bankName || ''}
                  onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                  placeholder="e.g. GTBank, OPay, Access Bank, Kuda"
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={config.accountNumber || ''}
                  onChange={(e) => setConfig({ ...config, accountNumber: e.target.value.trim() })}
                  placeholder="e.g. 0123456789"
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={config.accountName || ''}
                  onChange={(e) => setConfig({ ...config, accountName: e.target.value })}
                  placeholder="Name on your bank account"
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  WhatsApp Number for Payment Receipts (Optional)
                </label>
                <input
                  type="tel"
                  value={config.ownerWhatsapp || ''}
                  onChange={(e) => setConfig({ ...config, ownerWhatsapp: e.target.value.trim() })}
                  placeholder="e.g. +2348012345678"
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PAYSTACK CONFIGURATION */}
          <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                <CreditCard className="w-4 h-4 text-stone-700" />
                <span>Paystack Gateway (Cards &amp; International Checkout)</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  config.isLive && !isUsingTestKey
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {config.isLive && !isUsingTestKey ? 'Live Payouts Active' : 'Sandbox / Test Mode'}
              </span>
            </div>

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
                Paste your <code className="font-mono">pk_live_...</code> key from Paystack{' '}
                <strong>Settings &rarr; API Keys &amp; Webhooks</strong> once you link your bank account on Paystack.
              </span>
            </div>

            {/* Test / Live Toggle */}
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 block">Paystack Live Mode</span>
                <span className="text-[11px] text-stone-500">
                  {config.isLive
                    ? 'Real card transactions active (requires a pk_live_ key linked to your Paystack account)'
                    : 'Sandbox test mode (no real money settled until switched to Live)'}
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

            <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Visa, Mastercard, Verve &amp; Amex · USD / NGN multi-currency conversion</span>
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
                  <span>Save Payout Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
