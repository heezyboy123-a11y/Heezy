import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Globe, Truck, Lock, Mail } from 'lucide-react';

interface LegalModalProps {
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({ onClose, initialTab = 'terms' }) => {
  const [tab, setTab] = useState<'terms' | 'privacy'>(initialTab);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                {tab === 'terms' ? 'Terms & Conditions of Service' : 'Privacy & Data Protection Policy'}
              </h2>
              <p className="text-xs text-stone-500">
                Official Open Shelf bookstore legal policies · Contact: itljies@gmail.com
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

        {/* Tab switcher */}
        <div className="grid grid-cols-2 border-b border-stone-200 text-xs font-semibold text-center bg-stone-100/50 shrink-0">
          <button
            type="button"
            onClick={() => setTab('terms')}
            className={`py-3 transition-colors flex items-center justify-center gap-2 ${
              tab === 'terms'
                ? 'text-stone-900 border-b-2 border-stone-900 bg-white font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms &amp; Distribution Agreement</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('privacy')}
            className={`py-3 transition-colors flex items-center justify-center gap-2 ${
              tab === 'privacy'
                ? 'text-stone-900 border-b-2 border-stone-900 bg-white font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy &amp; Security</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 text-xs text-stone-600 leading-relaxed">
          {tab === 'terms' ? (
            /* TERMS OF SERVICE */
            <div className="space-y-6">
              <div className="border-b border-stone-200 pb-4">
                <p className="text-stone-800 font-serif text-base font-semibold">
                  Open Shelf Publishing &amp; Bookstore Terms of Service
                </p>
                <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                  Effective Date: November 2026 · Official Custodian: itljies@gmail.com
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">1. Nature of the Service</h4>
                <p>
                  Open Shelf operates an open digital and print publishing press. We enable independent writers, researchers, and creators to upload and distribute original works, and provide readers worldwide with access to free and paid literary titles.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">2. Author &amp; Creator Distribution Rights</h4>
                <p>
                  When you upload an ebook or physical volume to Open Shelf:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>You retain 100% of your intellectual property, copyright, and publishing rights.</li>
                  <li>You grant Open Shelf a non-exclusive license to host, display, and deliver your files to buyers upon payment clearance.</li>
                  <li>You warrant that all uploaded content is your own work or that you hold legitimate distribution licenses, and that it does not infringe copyright or third-party rights.</li>
                  <li>You can set or modify prices (including free distribution) at your discretion.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">3. Digital Ebook Licenses for Readers</h4>
                <p>
                  Upon purchasing or claiming a digital ebook, readers receive an instant personal, non-transferable license to read and download the file (EPUB, PDF, MOBI, TXT) on any of their personal devices. Resale, mass redistribution, or unauthorized commercial copying is strictly prohibited.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">4. International Card Payments via Paystack</h4>
                <p>
                  All payments are processed securely via <strong>Paystack</strong>. Paystack accepts international cards (Visa, Mastercard, Verve, American Express). Prices can be paid in USD ($) or NGN (₦). Open Shelf does not store or process payment card numbers or CVVs on our own servers.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">5. City Courier Delivery Policy</h4>
                <p>
                  Physical book delivery is supported across select metropolitan partner cities (such as Lagos, Abuja, Port Harcourt, Ibadan, Enugu, and Accra). Couriers will contact the recipient via the phone number provided at checkout prior to drop-off. If a recipient is unreachable after multiple attempts, delivery may be rescheduled with applicable courier re-dispatch fees.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">6. International Client Policy</h4>
                <p>
                  For international clients residing outside our physical partner delivery zones, orders are limited strictly to digital ebook downloads. Instant download links are activated immediately upon Paystack payment verification.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">7. Inquiries &amp; Legal Notices</h4>
                <p>
                  For any questions regarding licensing, creator payouts, copyright claims, or terms, contact us directly at <a href="mailto:itljies@gmail.com" className="text-stone-900 font-semibold underline">itljies@gmail.com</a>.
                </p>
              </section>
            </div>
          ) : (
            /* PRIVACY POLICY */
            <div className="space-y-6">
              <div className="border-b border-stone-200 pb-4">
                <p className="text-stone-800 font-serif text-base font-semibold">
                  Open Shelf Privacy &amp; Data Protection Policy
                </p>
                <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                  Compliant with NDPR &amp; GDPR Standards · Data Controller: itljies@gmail.com
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">1. Information We Collect</h4>
                <p>
                  We believe in minimal data footprint. We only collect information strictly required to deliver your books:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Account &amp; Email:</strong> To deliver receipt confirmations, download tokens, and reading library access.</li>
                  <li><strong>Delivery Information:</strong> Physical street address and recipient phone number, collected solely for city courier riders to deliver print books.</li>
                  <li><strong>Creator Uploads:</strong> Ebook files, titles, and cover images uploaded to our server database for public bookstore display.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">2. Payment Security &amp; PCI-DSS</h4>
                <p>
                  All transactions are handled directly through Paystack&apos;s encrypted payment gateway. Open Shelf never sees, collects, or stores your credit/debit card numbers, CVVs, or bank credentials. All communications use TLS 1.3 encryption.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">3. Zero Data Brokering &amp; No Advertising</h4>
                <p>
                  We do not sell, rent, monetize, or share your personal data with third-party advertisers or data brokers under any circumstances.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">4. Cookies &amp; Local Storage</h4>
                <p>
                  We use browser local storage and essential session cookies only to remember your shopping bag, reading preferences (font size, paper theme), and authentication state across page reloads.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">5. Your Rights &amp; Data Erasure</h4>
                <p>
                  You have the right to request a copy of your personal data or request deletion of your account and uploaded titles at any time by contacting the Data Protection Officer at <a href="mailto:itljies@gmail.com" className="text-stone-900 font-semibold underline">itljies@gmail.com</a>.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
            <Mail className="w-3.5 h-3.5" />
            <span>Support &amp; Compliance: itljies@gmail.com</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md transition-colors"
          >
            I Understand &amp; Agree
          </button>
        </div>
      </div>
    </div>
  );
};
