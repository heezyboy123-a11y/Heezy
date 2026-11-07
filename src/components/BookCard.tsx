import React from 'react';
import { Book, Currency } from '../types/book';
import { BookOpen, ShoppingBag, Download, ArrowUpRight, Heart, Sparkles, CheckCircle2 } from 'lucide-react';

interface BookCardProps {
  book: Book;
  currency: Currency;
  onSelect: (book: Book) => void;
  onQuickAdd: (book: Book, format: 'ebook' | 'print') => void;
  onOpenReader: (book: Book) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  currency,
  onSelect,
  onQuickAdd,
  onOpenReader,
  isWishlisted = false,
  onToggleWishlist,
}) => {
  const isFree = book.priceUSD === 0;

  // Format price display
  const formatPrice = () => {
    if (isFree) return 'Free';
    if (currency === 'NGN') {
      return `₦${book.priceNGN.toLocaleString()}`;
    }
    if (currency === 'GBP') {
      return `£${(book.priceUSD * 0.79).toFixed(2)}`;
    }
    if (currency === 'EUR') {
      return `€${(book.priceUSD * 0.92).toFixed(2)}`;
    }
    return `$${book.priceUSD.toFixed(2)}`;
  };

  return (
    <article className="group flex flex-col bg-white rounded-xl border border-stone-200/90 overflow-hidden hover:border-stone-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative">
      {/* Visual Cover Showcase Area */}
      <div
        onClick={() => onSelect(book)}
        className="relative aspect-3/4 w-full bg-[#F3EFE6]/70 p-5 sm:p-6 flex items-center justify-center cursor-pointer overflow-hidden border-b border-stone-200/60"
      >
        {/* Wishlist Button */}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(book);
            }}
            className={`absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isWishlisted
                ? 'bg-white text-rose-600 shadow-sm border border-rose-200 ring-1 ring-rose-200 scale-105'
                : 'bg-white/90 hover:bg-white text-stone-400 hover:text-stone-700 shadow-2xs border border-stone-200/80 backdrop-blur-xs'
            }`}
            title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
            aria-label={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                isWishlisted ? 'fill-rose-600 text-rose-600' : ''
              }`}
            />
          </button>
        )}

        {/* Featured Tag (if applicable) */}
        {book.featured && (
          <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-full backdrop-blur-xs shadow-2xs">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Featured</span>
          </div>
        )}

        {/* 3D Realistic Book Spine & Cover Canvas */}
        <div className="relative w-full max-w-[195px] aspect-3/4 rounded-xs overflow-hidden book-spine-shadow transition-transform duration-300 group-hover:scale-103 bg-stone-900">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-[#1A2538] text-white flex flex-col items-center justify-center p-4 text-center">
              <span className="font-serif text-base font-semibold leading-tight line-clamp-3">
                {book.title}
              </span>
              <span className="text-xs text-stone-300 mt-2 font-mono">
                {book.author}
              </span>
            </div>
          )}

          {/* Spine crease shadow & highlight */}
          <div className="absolute inset-y-0 left-0 w-3.5 bg-gradient-to-r from-black/35 via-white/10 to-transparent pointer-events-none" />
          {/* Subtle page edge highlight on the right edge */}
          <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-white/20 to-transparent pointer-events-none" />
        </div>

        {/* Hover Quick Actions Bar */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-stone-950/85 via-stone-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenReader(book);
            }}
            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-white/25 hover:bg-white/35 backdrop-blur-xs rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Read Sample</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(book);
            }}
            className="px-2.5 py-1.5 text-xs font-semibold text-stone-900 bg-white hover:bg-stone-100 rounded-md transition-colors flex items-center gap-1 shadow-xs"
          >
            <span>Overview</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-700" />
          </button>
        </div>
      </div>

      {/* Book Information & Metadata Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          {/* Clean Unboxed Metadata with Typographic Separator */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
            <span className="text-stone-700 font-semibold truncate max-w-[140px] sm:max-w-[160px]">
              {book.genre}
            </span>
            {book.year && (
              <>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span className="font-mono">{book.year}</span>
              </>
            )}
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="truncate">
              {book.formatAvailable === 'both'
                ? 'Ebook & Print'
                : book.formatAvailable === 'ebook'
                ? 'Digital Ebook'
                : 'Physical Print'}
            </span>
          </div>

          {/* Book Title */}
          <h3
            onClick={() => onSelect(book)}
            className="mt-1 font-serif text-lg sm:text-xl font-bold text-stone-900 group-hover:text-stone-700 transition-colors cursor-pointer line-clamp-1 leading-snug"
            title={book.title}
          >
            {book.title}
          </h3>

          {/* Author Name */}
          <p className="text-xs text-stone-600 font-medium mt-0.5 line-clamp-1">
            by <span className="text-stone-900 font-semibold">{book.author}</span>
          </p>

          {/* 2-line Synopsis */}
          <p className="mt-2 text-xs text-stone-500 line-clamp-2 leading-relaxed">
            {book.description}
          </p>
        </div>

        {/* Pricing & Quick Add Section */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-mono">
              Price
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`font-mono text-base sm:text-lg font-bold tabular-nums ${
                  isFree ? 'text-emerald-700' : 'text-stone-900'
                }`}
              >
                {formatPrice()}
              </span>
              {!isFree && currency !== 'NGN' && (
                <span className="text-[11px] text-stone-400 font-mono hidden sm:inline">
                  (₦{book.priceNGN.toLocaleString()})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isFree ? (
              <button
                type="button"
                onClick={() => onQuickAdd(book, 'ebook')}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Get Free</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onQuickAdd(book, book.formatAvailable === 'print' ? 'print' : 'ebook')
                }
                className="px-3.5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-97"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-200" />
                <span>Add to Bag</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
