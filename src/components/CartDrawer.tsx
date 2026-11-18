import React, { useState, useEffect } from 'react';
import { OrderItem, Currency, DeliveryCity, Order } from '../types/book';
import {
  X,
  Trash2,
  Download,
  Truck,
  Globe,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Landmark,
  Copy,
  Check,
  Clock,
  RefreshCw,
  MessageCircle,
  Receipt,
} from 'lucide-react';
import { initiatePaystackPayment } from '../services/paystack';
import {
  saveOrder,
  getPaystackConfig,
  fetchServerPaystackConfig,
  fetchServerOrders,
  PaystackConfig,
} from '../services/storage';
import { getBookFileBlob } from '../services/fileStore';
import { buildCleanFileName } from '../services/ebookCleaner';

interface CartDrawerProps {
  isOpen?: boolean;
  onClose: () => void;
  items: OrderItem[];
  onUpdateQuantity: (bookId: string, format: 'ebook' | 'print', qty: number) => void;
  onRemoveItem: (bookId: string, format: 'ebook' | 'print') => void;
  onClearCart: () => void;
  currency: Currency;
  deliveryCities: DeliveryCity[];
  onOpenReader: (book: OrderItem['book']) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  currency,
  deliveryCities,
  onOpenReader,
}) => {
  // Destination mode: 'international' (ebook only) vs 'domestic' (physical city delivery available)
  const [destinationType, setDestinationType] = useState<'international' | 'domestic'>('international');
  const [selectedCityId, setSelectedCityId] = useState<string>(deliveryCities[0]?.id || 'lagos-mainland');

  // Customer contact info
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Payout / Payment config & method selection
  const [payoutConfig, setPayoutConfig] = useState<PaystackConfig>(() => getPaystackConfig());
  const hasBankAccount = Boolean(
    payoutConfig.enableBankTransfer === true &&
      payoutConfig.bankName?.trim() &&
      payoutConfig.accountNumber?.trim() &&
      payoutConfig.accountName?.trim()
  );
  const isPaystackLive = Boolean(
    payoutConfig.isLive && payoutConfig.publicKey && payoutConfig.publicKey.startsWith('pk_live_')
  );
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'bank_transfer'>('paystack');
  const [bankSenderRef, setBankSenderRef] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Payment processing & completed order states
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check if cart has physical items
  const hasPhysicalItems = items.some((item) => item.format === 'print');
  const selectedCity = deliveryCities.find((c) => c.id === selectedCityId) || deliveryCities[0];

  // Refresh latest store bank/paystack config when bag opens
  useEffect(() => {
    fetchServerPaystackConfig().then((cfg) => {
      setPayoutConfig(cfg);
    });
  }, []);

  // Whenever a buyer orders a hardcopy (print) edition, automatically apply City Courier delivery fee
  useEffect(() => {
    if (hasPhysicalItems) {
      setDestinationType('domestic');
    }
  }, [hasPhysicalItems]);

  // Calculate pricing
  const subtotalUSD = items.reduce((sum, item) => {
    const unitPrice = item.format === 'print' ? item.book.priceUSD + 4.5 : item.book.priceUSD;
    return sum + unitPrice * item.quantity;
  }, 0);

  const subtotalNGN = items.reduce((sum, item) => {
    const unitPrice = item.format === 'print' ? item.book.priceNGN + 6500 : item.book.priceNGN;
    return sum + unitPrice * item.quantity;
  }, 0);

  const deliveryFeeUSD = destinationType === 'domestic' && hasPhysicalItems ? selectedCity?.deliveryFeeUSD || 3 : 0;
  const deliveryFeeNGN = destinationType === 'domestic' && hasPhysicalItems ? selectedCity?.deliveryFeeNGN || 4500 : 0;

  const totalUSD = subtotalUSD + deliveryFeeUSD;
  const totalNGN = subtotalNGN + deliveryFeeNGN;
  const isFreeTotal = totalUSD === 0;

  // Format currency display
  const formatAmount = (usd: number, ngn: number) => {
    if (usd === 0 && ngn === 0) return 'Free';
    if (currency === 'NGN') return `₦${ngn.toLocaleString()}`;
    if (currency === 'GBP') return `£${(usd * 0.79).toFixed(2)}`;
    if (currency === 'EUR') return `€${(usd * 0.92).toFixed(2)}`;
    return `$${usd.toFixed(2)}`;
  };

  // Convert physical items to digital if user switches to International
  const convertAllToEbook = () => {
    items.forEach((item) => {
      if (item.format === 'print') {
        onRemoveItem(item.book.id, 'print');
        onUpdateQuantity(item.book.id, 'ebook', item.quantity);
      }
    });
  };

  const handleCheckout = () => {
    setErrorMessage('');
    if (!customerEmail || !customerName) {
      setErrorMessage('Please provide your name and email to receive your books & receipt.');
      return;
    }

    if (destinationType === 'domestic' && hasPhysicalItems) {
      if (!customerPhone || !deliveryAddress) {
        setErrorMessage('Please provide your phone number and delivery street address for the courier.');
        return;
      }
    }

    const orderId = `ORD_${Date.now().toString().slice(-6)}`;

    // If completely free order ($0), grant instant access without payment card
    if (isFreeTotal) {
      const freeOrder: Order = {
        id: orderId,
        date: new Date().toISOString(),
        items: [...items],
        customerEmail,
        customerName,
        customerPhone,
        destinationType,
        deliveryCity: destinationType === 'domestic' ? selectedCity?.name : undefined,
        deliveryAddress: destinationType === 'domestic' ? deliveryAddress : undefined,
        deliveryInstructions: deliveryNotes,
        totalUSD: 0,
        totalNGN: 0,
        currency,
        paymentMethod: 'free',
        paymentStatus: 'free_granted',
        deliveryStatus: hasPhysicalItems ? 'preparing' : undefined,
        downloadAccessGranted: true,
      };

      saveOrder(freeOrder);
      setCompletedOrder(freeOrder);
      onClearCart();
      return;
    }

    // Direct Bank Transfer (straight into Store Owner's Bank Account)
    if (paymentMethod === 'bank_transfer' && hasBankAccount) {
      if (!bankSenderRef.trim()) {
        setErrorMessage(
          'Please enter the Sender Name or Bank Transfer Reference after sending your transfer.'
        );
        return;
      }

      const bankOrder: Order = {
        id: orderId,
        date: new Date().toISOString(),
        items: [...items],
        customerEmail,
        customerName,
        customerPhone,
        destinationType,
        deliveryCity: destinationType === 'domestic' ? selectedCity?.name : undefined,
        deliveryAddress: destinationType === 'domestic' ? deliveryAddress : undefined,
        deliveryInstructions: deliveryNotes,
        totalUSD,
        totalNGN,
        currency,
        paymentMethod: 'bank_transfer',
        bankTransferRef: bankSenderRef.trim(),
        paymentStatus: 'pending',
        deliveryStatus: hasPhysicalItems ? 'preparing' : undefined,
        downloadAccessGranted: false,
      };

      saveOrder(bankOrder);
      setCompletedOrder(bankOrder);
      onClearCart();
      return;
    }

    // Paid Order: Initiate Paystack
    setIsProcessing(true);

    const chargeAmount = currency === 'NGN' ? totalNGN : totalUSD;
    const chargeCurrency = currency === 'NGN' ? 'NGN' : 'USD';

    initiatePaystackPayment({
      email: customerEmail,
      amount: chargeAmount,
      currency: chargeCurrency,
      orderId,
      customerName,
      metadata: {
        destinationType,
        itemsCount: items.length,
        hasPhysical: hasPhysicalItems,
        city: selectedCity?.name,
      },
      onSuccess: (ref) => {
        setIsProcessing(false);
        const newOrder: Order = {
          id: orderId,
          date: new Date().toISOString(),
          items: [...items],
          customerEmail,
          customerName,
          customerPhone,
          destinationType,
          deliveryCity: destinationType === 'domestic' ? selectedCity?.name : undefined,
          deliveryAddress: destinationType === 'domestic' ? deliveryAddress : undefined,
          deliveryInstructions: deliveryNotes,
          totalUSD,
          totalNGN,
          currency,
          paystackReference: ref,
          paymentMethod: 'paystack',
          paymentStatus: 'paid',
          deliveryStatus: hasPhysicalItems ? 'preparing' : undefined,
          downloadAccessGranted: true,
        };

        saveOrder(newOrder);
        setCompletedOrder(newOrder);
        onClearCart();
      },
      onCancel: () => {
        setIsProcessing(false);
      },
      onError: (err) => {
        setIsProcessing(false);
        setErrorMessage(err || 'Payment was interrupted. Please try again.');
      },
    });
  };

  const handleRefreshOrderStatus = async () => {
    if (!completedOrder) return;
    setIsCheckingStatus(true);
    const latestOrders = await fetchServerOrders();
    const matched = latestOrders.find((o) => o.id === completedOrder.id);
    if (matched) {
      setCompletedOrder(matched);
    }
    setIsCheckingStatus(false);
  };

  const handleDownloadOfficialReceipt = (order: Order) => {
    const storeTitle = payoutConfig.businessName || 'Open Shelf Books';
    const ref = order.paystackReference || order.bankTransferRef || 'FREE_GRANT';
    const itemsHtml = order.items
      .map(
        (it) =>
          `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;"><strong>${it.book.title}</strong> (${it.format === 'print' ? 'Print Hardcopy' : 'Digital Ebook'}) x ${it.quantity}</td>
            <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;text-align:right;font-family:monospace;">₦${(
              (it.format === 'print' ? it.book.priceNGN + 6500 : it.book.priceNGN) * it.quantity
            ).toLocaleString()}</td>
          </tr>`
      )
      .join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payment Receipt - ${order.id}</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#faf8f5;padding:32px;color:#1c1917;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:28px;">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1c1917;padding-bottom:16px;margin-bottom:20px;">
      <div>
        <h1 style="margin:0;font-size:20px;">${storeTitle}</h1>
        <p style="margin:4px 0 0;font-size:12px;color:#57534e;">Official Payment Receipt · Secured by Paystack</p>
      </div>
      <span style="background:#dcfce7;color:#166534;font-weight:700;font-size:12px;padding:4px 10px;border-radius:999px;">PAID</span>
    </div>
    <p style="font-size:13px;margin:4px 0;"><strong>Receipt / Order ID:</strong> ${order.id}</p>
    <p style="font-size:13px;margin:4px 0;"><strong>Paystack Transaction Ref:</strong> ${ref}</p>
    <p style="font-size:13px;margin:4px 0;"><strong>Date:</strong> ${new Date(order.date).toLocaleString()}</p>
    <p style="font-size:13px;margin:4px 0 18px;"><strong>Billed To:</strong> ${order.customerName} (${order.customerEmail})</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr>
          <th style="text-align:left;padding-bottom:8px;border-bottom:1px solid #d6d3d1;">Book / Edition</th>
          <th style="text-align:right;padding-bottom:8px;border-bottom:1px solid #d6d3d1;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="margin-top:16px;padding-top:12px;border-top:2px solid #1c1917;display:flex;justify-content:space-between;font-size:16px;font-weight:700;">
      <span>Total Paid</span>
      <span>₦${order.totalNGN.toLocaleString()} ($${order.totalUSD.toFixed(2)})</span>
    </div>
    <p style="margin-top:20px;font-size:11px;color:#78716c;text-align:center;">Thank you for reading with ${storeTitle}. Keep this receipt for your records.</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OpenShelf_Receipt_${order.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold text-stone-900">
              {completedOrder
                ? completedOrder.downloadAccessGranted
                  ? 'Order & Official Receipt'
                  : 'Transfer Submitted'
                : 'Your Book Bag'}
            </span>
            {!completedOrder && (
              <span className="font-mono text-xs text-stone-500">
                ({items.reduce((s, i) => s + i.quantity, 0)} items)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* COMPLETED ORDER VIEW */}
        {completedOrder ? (
          <div className="p-6 space-y-5 flex-1 overflow-y-auto">
            {completedOrder.downloadAccessGranted ? (
              <>
                <div className="text-center space-y-2 py-2">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-stone-900">
                    Thank You, {completedOrder.customerName}!
                  </h3>
                  <p className="text-xs text-stone-600 font-mono">
                    Order #{completedOrder.id} · Paystack Ref:{' '}
                    {completedOrder.paystackReference || completedOrder.bankTransferRef || 'FREE_GRANT'}
                  </p>
                </div>

                {/* Official Paystack & Store Payment Receipt Card */}
                <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-xs space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                    <div className="flex items-center gap-2 font-bold text-stone-900">
                      <Receipt className="w-4 h-4 text-emerald-700" />
                      <span>Official Payment Receipt</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                      {completedOrder.paymentStatus === 'free_granted' ? 'FREE' : 'PAID · VERIFIED'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-stone-600">
                    <div className="flex justify-between">
                      <span>Merchant:</span>
                      <span className="font-semibold text-stone-900">
                        {payoutConfig.businessName || 'Open Shelf Books'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receipt Email:</span>
                      <span className="font-mono text-stone-900">{completedOrder.customerEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transaction Ref:</span>
                      <span className="font-mono font-semibold text-stone-900">
                        {completedOrder.paystackReference || completedOrder.bankTransferRef || 'FREE_GRANT'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-stone-100 text-stone-900 font-bold">
                      <span>Total Paid:</span>
                      <span className="font-mono">
                        {completedOrder.totalUSD === 0
                          ? 'Free'
                          : `₦${completedOrder.totalNGN.toLocaleString()} ($${completedOrder.totalUSD.toFixed(2)})`}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded border border-stone-100 leading-relaxed">
                    When completed through Paystack, Paystack immediately emails an official transaction receipt to{' '}
                    <strong className="text-stone-700">{completedOrder.customerEmail}</strong>. You can also save a copy below:
                  </p>

                  <button
                    type="button"
                    onClick={() => handleDownloadOfficialReceipt(completedOrder)}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Official Payment Receipt</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-3 py-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-stone-900">
                  Awaiting Transfer Verification
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
                  Order <strong className="font-mono">#{completedOrder.id}</strong> (Sender Ref:{' '}
                  <strong className="font-mono">{completedOrder.bankTransferRef}</strong>) is recorded. Once the Store Owner confirms your bank alert of{' '}
                  <strong>₦{completedOrder.totalNGN.toLocaleString()}</strong>, your ebooks unlock immediately below.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRefreshOrderStatus}
                    disabled={isCheckingStatus}
                    className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                    <span>{isCheckingStatus ? 'Checking...' : 'Check Approval Status'}</span>
                  </button>

                  {payoutConfig.ownerWhatsapp && (
                    <a
                      href={`https://wa.me/${payoutConfig.ownerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hello Open Shelf, I just transferred ₦${completedOrder.totalNGN.toLocaleString()} for Order #${completedOrder.id} (Sender/Ref: ${completedOrder.bankTransferRef}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send Receipt on WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Instant Ebook Downloads Card (unlocked once paid/confirmed) */}
            {completedOrder.downloadAccessGranted && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>Instant Digital Downloads Ready</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your digital reading access is active! You can download your ebooks or read them right in your browser now.
                </p>
              <div className="space-y-2 pt-2">
                {completedOrder.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-md border border-emerald-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-stone-900 block truncate">
                        {item.book.title}
                      </span>
                      <span className="text-[11px] text-stone-500 font-mono">
                        {item.book.fileType?.toUpperCase() || 'EPUB'} · {item.book.fileSize || '3.2 MB'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          onOpenReader(item.book);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded transition-colors flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const cleanName =
                            item.book.cleanFileName ||
                            buildCleanFileName(item.book.title, item.book.fileType || 'epub');

                          const stored = await getBookFileBlob(item.book.id);
                          if (stored?.blob) {
                            const url = URL.createObjectURL(stored.blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = stored.cleanFileName || cleanName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            setTimeout(() => URL.revokeObjectURL(url), 10000);
                            return;
                          }

                          if (item.book.downloadUrl && !item.book.downloadUrl.startsWith('blob:')) {
                            const link = document.createElement('a');
                            link.href = item.book.downloadUrl;
                            link.download = cleanName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          } else {
                            const content = `${item.book.title.toUpperCase()}\nBy ${item.book.author}\nGenre: ${item.book.genre}\n\n${item.book.description}\n\n=================================\n\n${item.book.sampleContent || 'Open Shelf Digital Edition'}`;
                            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = cleanName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            setTimeout(() => URL.revokeObjectURL(url), 10000);
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Physical Dispatch Card if applicable */}
            {completedOrder.deliveryCity && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-2 text-xs">
                <div className="flex items-center gap-2 text-stone-900 font-semibold">
                  <Truck className="w-4 h-4 text-stone-700" />
                  <span>City Courier Dispatch Assigned</span>
                </div>
                <p className="text-stone-600">
                  Your print order has been queued for delivery to{' '}
                  <strong className="text-stone-900">{completedOrder.deliveryCity}</strong>.
                  The courier will call{' '}
                  <strong className="font-mono text-stone-900">
                    {completedOrder.customerPhone}
                  </strong>{' '}
                  prior to drop-off.
                </p>
                <div className="text-[11px] text-stone-500 bg-white p-2.5 rounded border border-stone-200 mt-1">
                  <strong>Delivery Address:</strong> {completedOrder.deliveryAddress}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setCompletedOrder(null);
                onClose();
              }}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md transition-colors"
            >
              Continue Exploring Books
            </button>
          </div>
        ) : items.length === 0 ? (
          /* EMPTY CART VIEW */
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <p className="font-serif text-lg font-bold text-stone-900">Your bag is empty</p>
              <p className="text-xs text-stone-500 mt-1">
                Explore independent titles, free ebooks, and print editions on our shelves.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-md hover:bg-stone-800 transition-colors"
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          /* ACTIVE CART & CHECKOUT FORM */
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Items List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500 uppercase tracking-wider">
                <span>Selected Titles</span>
                <button
                  onClick={onClearCart}
                  className="text-stone-400 hover:text-stone-700 normal-case font-normal"
                >
                  Clear Bag
                </button>
              </div>

              {items.map((item) => (
                <div
                  key={`${item.book.id}-${item.format}`}
                  className="p-3 bg-stone-50/80 rounded-lg border border-stone-200/80 flex items-center gap-3"
                >
                  <img
                    src={item.book.coverUrl}
                    alt={item.book.title}
                    className="w-12 h-16 object-cover rounded-xs book-spine-shadow shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-stone-900 truncate">{item.book.title}</h4>
                    <p className="text-[11px] text-stone-500 truncate">by {item.book.author}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-medium text-stone-600 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                        {item.format === 'print' ? 'Print Edition' : 'Digital Ebook'}
                      </span>
                      <span className="font-mono text-xs font-bold text-stone-900">
                        {formatAmount(
                          (item.format === 'print' ? item.book.priceUSD + 4.5 : item.book.priceUSD) *
                            item.quantity,
                          (item.format === 'print' ? item.book.priceNGN + 6500 : item.book.priceNGN) *
                            item.quantity
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Remove */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.book.id, item.format, Math.max(1, item.quantity - 1))
                      }
                      className="w-6 h-6 rounded bg-white border border-stone-300 flex items-center justify-center text-xs text-stone-700 hover:bg-stone-100"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs font-semibold w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.book.id, item.format, item.quantity + 1)
                      }
                      className="w-6 h-6 rounded bg-white border border-stone-300 flex items-center justify-center text-xs text-stone-700 hover:bg-stone-100"
                    >
                      +
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.book.id, item.format)}
                      className="p-1 text-stone-400 hover:text-red-600 ml-1 transition-colors"
                      title="Remove from bag"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Destination Selector: International (Ebook Only) vs Domestic (City Delivery) */}
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
              <span className="text-xs font-bold text-stone-900 block">
                Destination &amp; Delivery Routing
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDestinationType('international')}
                  className={`p-2.5 rounded-md border text-xs font-medium text-left transition-all ${
                    destinationType === 'international'
                      ? 'border-stone-900 bg-white ring-1 ring-stone-900 text-stone-900 font-semibold'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className="w-3.5 h-3.5 text-stone-800" />
                    <span>International</span>
                  </div>
                  <span className="text-[11px] text-stone-500 block leading-tight">
                    Instant Ebook Download only. Worldwide cards.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDestinationType('domestic')}
                  className={`p-2.5 rounded-md border text-xs font-medium text-left transition-all ${
                    destinationType === 'domestic'
                      ? 'border-stone-900 bg-white ring-1 ring-stone-900 text-stone-900 font-semibold'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Truck className="w-3.5 h-3.5 text-stone-800" />
                    <span>Hardcopy City Delivery</span>
                  </div>
                  <span className="text-[11px] text-stone-500 block leading-tight">
                    Printed hardcopy + city courier delivery fee.
                  </span>
                </button>
              </div>

              {/* International Client Rule Notice */}
              {destinationType === 'international' && hasPhysicalItems && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 space-y-2">
                  <p>
                    <strong>International Client Policy:</strong> International clients can download ebooks only for now. Physical delivery is currently available in partner cities.
                  </p>
                  <button
                    type="button"
                    onClick={convertAllToEbook}
                    className="px-3 py-1 bg-amber-900 text-white font-medium rounded text-xs hover:bg-amber-800 transition-colors"
                  >
                    Switch Bag Items to Digital Ebook
                  </button>
                </div>
              )}

              {/* Domestic City Selection & Courier Details */}
              {destinationType === 'domestic' && (
                <div className="space-y-3 pt-2 border-t border-stone-200">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Select Delivery City:
                    </label>
                    <select
                      value={selectedCityId}
                      onChange={(e) => setSelectedCityId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                    >
                      {deliveryCities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.estimatedDays}) — Fee: {formatAmount(c.deliveryFeeUSD, c.deliveryFeeNGN)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {hasPhysicalItems && (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-stone-700 block mb-1">
                          Delivery Street Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="House/Plot No, Street Name, Area/Landmark"
                          className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-700 block mb-1">
                          Courier Contact Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="e.g. +234 801 234 5678"
                          className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-700 block mb-1">
                          Delivery Instructions for Courier (Optional)
                        </label>
                        <input
                          type="text"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="e.g. Call before arrival, leave with security"
                          className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Customer Contact for Receipt & Ebook Delivery */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-stone-900 block">Customer Information</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-600 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-600 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                  />
                </div>
              </div>
            </div>

              {/* Payment Method Selector */}
              {!isFreeTotal && (
                <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 block">
                      Secured Checkout · Paystack
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                        isPaystackLive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isPaystackLive ? 'Live Verified' : 'Test Mode'}
                    </span>
                  </div>

                  <div className={`grid gap-2 ${hasBankAccount ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paystack')}
                      className={`p-2.5 rounded-md border text-xs font-medium text-left transition-all cursor-pointer ${
                        paymentMethod === 'paystack'
                          ? 'border-stone-900 bg-white ring-1 ring-stone-900 text-stone-900 font-semibold'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-stone-800" />
                        <span>Paystack Checkout</span>
                      </div>
                      <span className="text-[11px] text-stone-500 block leading-tight">
                        Card, Bank Transfer, USSD · Instant Paystack email receipt.
                      </span>
                    </button>

                    {hasBankAccount && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bank_transfer')}
                        className={`p-2.5 rounded-md border text-xs font-medium text-left transition-all cursor-pointer ${
                          paymentMethod === 'bank_transfer'
                            ? 'border-stone-900 bg-white ring-1 ring-stone-900 text-stone-900 font-semibold'
                            : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Landmark className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Direct Bank Transfer</span>
                        </div>
                        <span className="text-[11px] text-stone-500 block leading-tight">
                          Transfer directly to Store Bank Account.
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Direct Bank Account Transfer Box (only if enabled by Store Owner) */}
                  {paymentMethod === 'bank_transfer' && hasBankAccount && (
                    <div className="p-3 bg-white rounded-md border border-emerald-200 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-700">Bank:</span>
                        <span className="font-bold text-stone-900">{payoutConfig.bankName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-stone-700">Account Number:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-stone-900 text-sm">
                            {payoutConfig.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(payoutConfig.accountNumber || '');
                              setCopiedAccount(true);
                              setTimeout(() => setCopiedAccount(false), 1800);
                            }}
                            className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded border border-stone-300 text-[10px] font-medium flex items-center gap-1"
                          >
                            {copiedAccount ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-700">Account Name:</span>
                        <span className="font-bold text-stone-900">{payoutConfig.accountName}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-stone-100">
                        <span className="font-semibold text-stone-700">Exact Transfer Amount:</span>
                        <span className="font-mono font-bold text-emerald-800">
                          ₦{totalNGN.toLocaleString()}
                        </span>
                      </div>

                      <div className="pt-1">
                        <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                          Sender Name / Bank Reference (after sending) *
                        </label>
                        <input
                          type="text"
                          value={bankSenderRef}
                          onChange={(e) => setBankSenderRef(e.target.value)}
                          placeholder="e.g. Chinedu Okafor / NIP-948201"
                          className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Footer / Checkout Button Bar */}
        {!completedOrder && items.length > 0 && (
          <div className="p-5 border-t border-stone-200 bg-stone-50 space-y-3">
            {/* Price Breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Books Subtotal:</span>
                <span className="font-mono font-medium">{formatAmount(subtotalUSD, subtotalNGN)}</span>
              </div>
              {hasPhysicalItems && destinationType === 'domestic' && (
                <div className="flex justify-between text-stone-600">
                  <span>City Courier Delivery ({selectedCity?.name}):</span>
                  <span className="font-mono font-medium">
                    {formatAmount(deliveryFeeUSD, deliveryFeeNGN)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                <span>Total Amount:</span>
                <span className="font-mono text-base">{formatAmount(totalUSD, totalNGN)}</span>
              </div>
            </div>

            {/* Payment Submit Button */}
            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className={`w-full py-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                isFreeTotal
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : paymentMethod === 'bank_transfer' && hasBankAccount
                  ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
            >
              {isProcessing ? (
                <span>Connecting to Paystack...</span>
              ) : isFreeTotal ? (
                <>
                  <Download className="w-4 h-4" />
                  <span>Claim Free Ebooks Now</span>
                </>
              ) : paymentMethod === 'bank_transfer' && hasBankAccount ? (
                <>
                  <Landmark className="w-4 h-4" />
                  <span>I Have Transferred ₦{totalNGN.toLocaleString()} · Submit Order</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {isPaystackLive
                      ? 'Pay with Paystack · International & Local Cards'
                      : 'Pay with Paystack (Test Mode)'}
                  </span>
                </>
              )}
            </button>

            {/* Trust badge */}
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {paymentMethod === 'bank_transfer' && hasBankAccount
                    ? 'Direct bank transfer to Store Owner bank account'
                    : 'Secured by Paystack · Accepts Visa, Mastercard, Verve & Amex'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
