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
  ExternalLink,
  CheckCircle2,
  Receipt,
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

  const isLiveKeyFormat = config.publicKey.trim().startsWith('pk_live_');
  const isTestKeyFormat = config.publicKey.trim().startsWith('pk_test_');
  const isLiveReady = config.isLive && isLiveKeyFormat;

  const handlePublicKeyChange = (val: string) => {
    const trimmed = val.trim();
    setConfig((prev) => ({
      ...prev,
      publicKey: trimmed,
      // Automatically turn Live Mode on if owner pastes a pk_live_ key
      isLive: trimmed.startsWith('pk_live_') ? true : trimmed.startsWith('pk_test_') ? false : prev.isLive,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    savePaystackConfig(config);
    onConfigSaved(config);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
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
                Connect Paystack &amp; Bank Payouts
              </h2>
              <p className="text-xs text-stone-500">
                Link your free Paystack account to receive payouts in your bank &amp; send instant email receipts
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
          {/* 4-Step Paystack Connection Guide */}
          <div className="p-4 rounded-xl bg-[#F7F4EC] border border-[#E8E3D9] space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-stone-900 text-sm">
                4 Quick Steps to Connect Your Bank via Paystack (100% Free)
              </span>
              <a
                href="https://dashboard.paystack.com/#/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1 shrink-0"
              >
                <span>Open Free Paystack</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 text-stone-700 leading-relaxed">
              <li>
                <strong>Create a free Paystack account</strong> (zero monthly fee; takes ~5 minutes with your BVN/NIN or business info).
              </li>
              <li>
                In Paystack Dashboard, go to <strong>Settings &rarr; Settlement Accounts</strong> and add your <strong>Bank Name &amp; 10-digit Account Number</strong>. Paystack deposits every book sale straight into your bank account.
              </li>
              <li>
                Go to <strong>Settings &rarr; API Keys &amp; Webhooks</strong> and copy your <strong>Live Public Key</strong> (starts with <code className="font-mono bg-white px-1 rounded border border-stone-200">pk_live_...</code>).
              </li>
              <li>
                Paste your key below and click <strong>Save &amp; Connect Paystack</strong>. Buyers will pay with Card/Transfer/USSD and immediately receive an official <strong>Paystack receipt email + Open Shelf receipt</strong>.
              </li>
            </ol>
          </div>

          {/* SECTION 1: PAYSTACK CONNECTION */}
          <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                <CreditCard className="w-4 h-4 text-stone-700" />
                <span>Paystack Merchant Connection</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold ${
                  isLiveReady
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isLiveReady ? 'Live Bank Payouts Connected' : 'Sandbox Test Mode'}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Your Paystack Public Key
              </label>
              <input
                type="text"
                required
                value={config.publicKey}
                onChange={(e) => handlePublicKeyChange(e.target.value)}
                placeholder="Paste pk_live_... (or pk_test_... for testing)"
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
              />
              {isLiveKeyFormat ? (
                <span className="text-[11px] text-emerald-700 mt-1.5 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Live Public Key detected — payments will settle to the bank account linked on your Paystack Dashboard.</span>
                </span>
              ) : isTestKeyFormat ? (
                <span className="text-[11px] text-amber-800 mt-1.5 block">
                  Currently using a Test Key (<code className="font-mono">pk_test_...</code>). Replace with your <code className="font-mono">pk_live_...</code> key once you activate your Paystack account to receive real bank payouts.
                </span>
              ) : (
                <span className="text-[11px] text-rose-600 mt-1.5 block">
                  Paystack Public Keys start with <code className="font-mono">pk_live_</code> or <code className="font-mono">pk_test_</code> (never paste your Secret Key <code className="font-mono">sk_...</code> here).
                </span>
              )}
            </div>

            {/* Test / Live Toggle */}
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 block">Paystack Live Mode</span>
                <span className="text-[11px] text-stone-500">
                  {isLiveReady
                    ? 'Accepting real customer payments into your Paystack-linked bank account'
                    : 'Safe test mode (switch ON after pasting your pk_live_ key)'}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600 pt-1">
              <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Automatic Paystack email receipt sent to buyer</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Cards, Bank Transfer, USSD &amp; international checkout</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: OPTIONAL DIRECT BANK TRANSFER FALLBACK */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-stone-700" />
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    Optional Direct Bank Transfer Option at Checkout
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Keep OFF if you want customers to pay exclusively through Paystack
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.enableBankTransfer)}
                  onChange={(e) =>
                    setConfig({ ...config, enableBankTransfer: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-700"></div>
              </label>
            </div>

            {config.enableBankTransfer && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={config.bankName || ''}
                    onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                    placeholder="e.g. GTBank, OPay, Access Bank"
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
                    placeholder="10-digit NUBAN"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={config.accountName || ''}
                    onChange={(e) => setConfig({ ...config, accountName: e.target.value })}
                    placeholder="Account holder name"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    WhatsApp for Receipts (Optional)
                  </label>
                  <input
                    type="tel"
                    value={config.ownerWhatsapp || ''}
                    onChange={(e) => setConfig({ ...config, ownerWhatsapp: e.target.value.trim() })}
                    placeholder="+2348012345678"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Business Name */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Store &amp; Receipt Imprint Name
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
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Connected &amp; Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save &amp; Connect Paystack</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
