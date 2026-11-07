import React, { useState } from 'react';
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
  ExternalLink,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { initiatePaystackPayment, generatePaystackReference } from '../services/paystack';
import { saveOrder } from '../services/storage';

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

  // Payment processing & completed order states
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Check if cart has physical items
  const hasPhysicalItems = items.some((item) => item.format === 'print');
  const selectedCity = deliveryCities.find((c) => c.id === selectedCityId) || deliveryCities[0];

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
        paymentStatus: 'free_granted',
        deliveryStatus: hasPhysicalItems ? 'preparing' : undefined,
        downloadAccessGranted: true,
      };

      saveOrder(freeOrder);
      setCompletedOrder(freeOrder);
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold text-stone-900">
              {completedOrder ? 'Order Confirmed' : 'Your Book Bag'}
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
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="text-center space-y-2 py-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-stone-900">
                Thank You, {completedOrder.customerName}!
              </h3>
              <p className="text-xs text-stone-600 font-mono">
                Order #{completedOrder.id} · Paystack Ref:{' '}
                {completedOrder.paystackReference || 'FREE_GRANT'}
              </p>
            </div>

            {/* Instant Ebook Downloads Card */}
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
                        onClick={() => {
                          if (item.book.downloadUrl) {
                            const link = document.createElement('a');
                            link.href = item.book.downloadUrl;
                            link.download = `${item.book.title.replace(/\s+/g, '_')}.${item.book.fileType || 'epub'}`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          } else {
                            const content = `${item.book.title.toUpperCase()}\nBy ${item.book.author}\nGenre: ${item.book.genre}\n\n${item.book.description}\n\n=================================\n\n${item.book.sampleContent || 'Open Shelf Digital Edition'}`;
                            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${item.book.title.replace(/\s+/g, '_')}.${item.book.fileType || 'epub'}`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
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
                    <span>City Delivery</span>
                  </div>
                  <span className="text-[11px] text-stone-500 block leading-tight">
                    Local courier hand-delivery to your doorstep.
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

            {/* Paystack Payment Button */}
            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className={`w-full py-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs ${
                isFreeTotal
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
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
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay with Paystack · International &amp; Local Cards</span>
                </>
              )}
            </button>

            {/* Paystack Trust badge */}
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Secured by Paystack · Accepts Visa, Mastercard, Verve &amp; Amex</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
