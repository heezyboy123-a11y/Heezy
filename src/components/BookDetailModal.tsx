import React, { useState } from 'react';
import { Book, Currency } from '../types/book';
import { X, BookOpen, Download, Truck, Globe, ShieldCheck, Check } from 'lucide-react';

interface BookDetailModalProps {
  book: Book;
  currency: Currency;
  onClose: () => void;
  onAddToCart: (book: Book, format: 'ebook' | 'print') => void;
  onOpenReader: (book: Book) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  currency,
  onClose,
  onAddToCart,
  onOpenReader,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'ebook' | 'print'>(
    book.formatAvailable === 'print' ? 'print' : 'ebook'
  );
  const [addedNotice, setAddedNotice] = useState(false);

  const isFree = book.priceUSD === 0 && selectedFormat === 'ebook';

  const formatPrice = (format: 'ebook' | 'print') => {
    if (book.priceUSD === 0 && format === 'ebook') return 'Free';
    // If physical print edition, calculate standard production/print adjustment if applicable
    const basePrice = format === 'print' ? book.priceUSD + 4.5 : book.priceUSD;
    const baseNGN = format === 'print' ? book.priceNGN + 6500 : book.priceNGN;

    if (currency === 'NGN') return `₦${baseNGN.toLocaleString()}`;
    if (currency === 'GBP') return `£${(basePrice * 0.79).toFixed(2)}`;
    if (currency === 'EUR') return `€${(basePrice * 0.92).toFixed(2)}`;
    return `$${basePrice.toFixed(2)}`;
  };

  const handleAdd = () => {
    onAddToCart(book, selectedFormat);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-stone-400 hover:text-stone-800 bg-white/80 hover:bg-stone-100 rounded-full transition-colors"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Left: Book Cover & Quick Read Sample */}
          <div className="md:col-span-5 bg-stone-100/90 p-6 sm:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-stone-200">
            <div className="relative w-48 sm:w-56 aspect-3/4 rounded-xs overflow-hidden book-spine-shadow mb-6">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-[#1A2538] text-white flex flex-col items-center justify-center p-6 text-center">
                  <span className="font-serif text-lg font-bold">{book.title}</span>
                  <span className="text-xs text-stone-300 mt-2 font-mono">{book.author}</span>
                </div>
              )}
              <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 via-white/10 to-transparent pointer-events-none" />
            </div>

            {book.sampleContent && (
              <button
                onClick={() => onOpenReader(book)}
                className="w-full py-2.5 px-4 text-xs font-semibold text-stone-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-md transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <BookOpen className="w-4 h-4 text-stone-600" />
                <span>Read First Chapter</span>
              </button>
            )}
          </div>

          {/* Right: Book Details & Contiguous Purchase Module */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              {/* Unboxed Metadata */}
              <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                <span>{book.genre}</span>
                {book.year && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{book.year}</span>
                  </>
                )}
                {book.pageCount && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{book.pageCount} pages</span>
                  </>
                )}
                {book.fileType && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase font-mono text-[11px]">{book.fileType}</span>
                  </>
                )}
              </div>

              {/* Title & Author */}
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1.5 leading-snug">
                {book.title}
              </h2>
              <p className="text-sm text-stone-600 font-medium mt-1">
                Written by <span className="text-stone-900 font-semibold">{book.author}</span>
              </p>

              {/* Synopsis */}
              <p className="mt-4 text-sm text-stone-600 leading-relaxed">
                {book.description}
              </p>

              {/* Format Selector */}
              <div className="mt-6 space-y-2">
                <span className="text-xs font-semibold text-stone-700 block">Select Edition Format:</span>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Digital Ebook Option */}
                  <button
                    type="button"
                    disabled={book.formatAvailable === 'print'}
                    onClick={() => setSelectedFormat('ebook')}
                    className={`p-3 text-left rounded-lg border transition-all ${
                      selectedFormat === 'ebook'
                        ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    } ${book.formatAvailable === 'print' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-stone-700" />
                        <span>Digital Ebook</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-stone-800">
                        {formatPrice('ebook')}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500 mt-1 block">
                      Instant EPUB/PDF download. International &amp; local cards accepted.
                    </span>
                  </button>

                  {/* Physical Print Option */}
                  <button
                    type="button"
                    disabled={book.formatAvailable === 'ebook'}
                    onClick={() => setSelectedFormat('print')}
                    className={`p-3 text-left rounded-lg border transition-all ${
                      selectedFormat === 'print'
                        ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    } ${book.formatAvailable === 'ebook' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-stone-700" />
                        <span>Print Edition</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-stone-800">
                        {formatPrice('print')}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500 mt-1 block">
                      Physical paper edition. Delivered by city couriers.
                    </span>
                  </button>
                </div>
              </div>

              {/* Delivery / International Context Notice */}
              <div className="mt-4 p-3 rounded-md bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-start gap-2.5">
                {selectedFormat === 'print' ? (
                  <>
                    <Truck className="w-4 h-4 text-stone-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900 font-medium">City Courier Delivery:</strong> Physical print editions are dispatched across partner cities (Lagos, Abuja, Port Harcourt, Ibadan, etc.). International clients can order the instant Ebook edition.
                    </div>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 text-stone-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900 font-medium">Instant Worldwide Download:</strong> Ebooks are immediately available for reading and download upon checkout. All international Visa &amp; Mastercard cards cleared via Paystack.
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-stone-400 uppercase font-mono block">Selected Total</span>
                <span className="font-mono text-xl font-bold text-stone-900">
                  {formatPrice(selectedFormat)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdd}
                  className={`px-5 py-2.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 shadow-sm ${
                    addedNotice
                      ? 'bg-emerald-700 text-white'
                      : 'bg-stone-900 hover:bg-stone-800 text-white'
                  }`}
                >
                  {addedNotice ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Bag</span>
                    </>
                  ) : isFree ? (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Claim Free Ebook</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Add to Bag</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
