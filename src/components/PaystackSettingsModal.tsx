import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Download,
  Save,
  Check,
  Landmark,
  ExternalLink,
  CheckCircle2,
  Link2,
  Zap,
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

  const isPaystackLiveKey = config.publicKey.trim().startsWith('pk_live_');
  const isFlutterwaveKeyValid = Boolean(
    config.flutterwavePublicKey &&
      (config.flutterwavePublicKey.trim().startsWith('FLWPUBK-') ||
        config.flutterwavePublicKey.trim().startsWith('FLWPUBK_TEST-'))
  );
  const hasBankReady = Boolean(
    config.bankName?.trim() && config.accountNumber?.trim() && config.accountName?.trim()
  );

  const handlePublicKeyChange = (val: string) => {
    const trimmed = val.trim();
    setConfig((prev) => ({
      ...prev,
      publicKey: trimmed,
      isLive: trimmed.startsWith('pk_live_')
        ? true
        : trimmed.startsWith('pk_test_')
        ? false
        : prev.isLive,
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
                Store Payment Methods &amp; Bank Payouts
              </h2>
              <p className="text-xs text-stone-500">
                Receive payments directly today via Bank Transfer, Selar Link, Flutterwave, or Paystack
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
          {/* Quick Recommendation Banner */}
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2 text-xs text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <Zap className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Start Receiving Payments Today (No Waiting 7 Days!)</span>
            </div>
            <p className="leading-relaxed text-emerald-900/90">
              While Paystack reviews your business, turn on <strong>Direct Bank Transfer</strong> (0% fees, instant bank alert to your account today), connect a free <strong>Selar / Payment Link</strong>, or connect <strong>Flutterwave</strong> below.
            </p>
          </div>

          {/* Primary Active Checkout Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-900 block">
              Default Payment Method Shown First at Checkout
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'bank_transfer' as const, label: 'Direct Bank Transfer', sub: '0-day wait' },
                { id: 'payment_link' as const, label: 'Selar / Pay Link', sub: 'Fast setup' },
                { id: 'flutterwave' as const, label: 'Flutterwave', sub: 'Card & USSD' },
                { id: 'paystack' as const, label: 'Paystack', sub: 'After review' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setConfig({ ...config, activeGateway: opt.id })}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    (config.activeGateway || 'bank_transfer') === opt.id
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span className="font-semibold block">{opt.label}</span>
                  <span
                    className={`text-[10px] ${
                      (config.activeGateway || 'bank_transfer') === opt.id
                        ? 'text-amber-200'
                        : 'text-stone-400'
                    }`}
                  >
                    {opt.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* OPTION 1: DIRECT BANK TRANSFER (READY IMMEDIATELY) */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-700" />
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    1. Direct Bank Transfer (Instant · No Approval Wait)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Works with OPay, Kuda, GTBank, Access, Zenith, Moniepoint, First Bank &amp; more
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={config.bankName || ''}
                  onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                  placeholder="e.g. OPay, GTBank, Kuda, Zenith"
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
                  placeholder="10-digit account number"
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
                  placeholder="Your full name on bank account"
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  WhatsApp Number for Receipt Alerts (Optional)
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

            {hasBankReady && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Bank account ready — buyers can transfer directly to your bank and receive receipts.</span>
              </div>
            )}
          </div>

          {/* OPTION 2: SELAR / EXTERNAL INSTANT PAYMENT LINK */}
          <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-700" />
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    2. Selar / Payment Link Checkout (Great for Nigerian Ebooks)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Create a free{' '}
                    <a
                      href="https://selar.co"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-stone-800 font-medium inline-flex items-center gap-0.5"
                    >
                      Selar.co <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    or OPay/Flutterwave checkout link &amp; paste it here
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.enablePaymentLink)}
                  onChange={(e) =>
                    setConfig({ ...config, enablePaymentLink: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-stone-900"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Payment Link URL
                </label>
                <input
                  type="url"
                  value={config.paymentLinkUrl || ''}
                  onChange={(e) => setConfig({ ...config, paymentLinkUrl: e.target.value.trim() })}
                  placeholder="https://selar.co/your-store"
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Button Label at Checkout
                </label>
                <input
                  type="text"
                  value={config.paymentLinkLabel || 'Selar / Instant Checkout'}
                  onChange={(e) => setConfig({ ...config, paymentLinkLabel: e.target.value })}
                  placeholder="e.g. Pay via Selar (Card & Transfer)"
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>
            </div>
          </div>

          {/* OPTION 3: FLUTTERWAVE INLINE CHECKOUT */}
          <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-600" />
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    3. Flutterwave Inline Checkout (Card, Bank Transfer &amp; USSD)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Free signup at{' '}
                    <a
                      href="https://app.flutterwave.com/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-stone-800 font-medium inline-flex items-center gap-0.5"
                    >
                      flutterwave.com <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    · Emails receipts &amp; pays to your bank
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.enableFlutterwave)}
                  onChange={(e) =>
                    setConfig({ ...config, enableFlutterwave: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-stone-900"></div>
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Flutterwave Public Key (FLWPUBK-...)
              </label>
              <input
                type="text"
                value={config.flutterwavePublicKey || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    flutterwavePublicKey: e.target.value.trim(),
                    enableFlutterwave: e.target.value.trim().startsWith('FLWPUBK')
                      ? true
                      : config.enableFlutterwave,
                  })
                }
                placeholder="FLWPUBK-..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
              />
              {isFlutterwaveKeyValid && (
                <span className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Flutterwave Public Key ready.</span>
                </span>
              )}
            </div>
          </div>

          {/* OPTION 4: PAYSTACK (AFTER 7-DAY REVIEW COMPLETES) */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                <CreditCard className="w-4 h-4 text-stone-700" />
                <span>4. Paystack (Once Your 7-Day Review Finishes)</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  config.isLive && isPaystackLiveKey
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                {config.isLive && isPaystackLiveKey ? 'Live Connected' : 'Standby'}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Paystack Public Key
              </label>
              <input
                type="text"
                value={config.publicKey}
                onChange={(e) => handlePublicKeyChange(e.target.value)}
                placeholder="pk_live_... or pk_test_..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-stone-600">Enable Paystack Live Mode</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isLive}
                  onChange={(e) => setConfig({ ...config, isLive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-stone-900"></div>
              </label>
            </div>
          </div>

          {/* Business Name */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Store &amp; Receipt Name
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
                  <span>Payment Settings Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Payment Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
