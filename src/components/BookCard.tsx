import React from 'react';
import { Book, Currency } from '../types/book';
import { BookOpen, ShoppingBag, Download, ArrowUpRight, Heart } from 'lucide-react';

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
    <article className="group flex flex-col bg-white rounded-lg border border-[#E8E3D9] overflow-hidden hover:border-stone-400/80 transition-all duration-200 hover:-translate-y-1 hover:shadow-md relative">
      {/* Visual Cover Area */}
      <div
        onClick={() => onSelect(book)}
        className="relative aspect-3/4 w-full bg-stone-100 p-4 sm:p-5 flex items-center justify-center cursor-pointer overflow-hidden border-b border-stone-200/70"
      >
        {/* Heart Wishlist Button */}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(book);
            }}
            className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isWishlisted
                ? 'bg-white text-rose-600 shadow-sm border border-rose-200 ring-1 ring-rose-200'
                : 'bg-white/90 hover:bg-white text-stone-400 hover:text-stone-700 shadow-xs border border-stone-200/80 backdrop-blur-xs'
            }`}
            title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
            aria-label={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
          >
            <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
          </button>
        )}

        <div className="relative w-full max-w-[200px] aspect-3/4 rounded-xs overflow-hidden book-spine-shadow transition-transform duration-300 group-hover:scale-102">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={`Book cover of ${book.title}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-[#1A2538] text-white flex flex-col items-center justify-center p-4 text-center">
              <span className="font-serif text-base font-semibold leading-tight">{book.title}</span>
              <span className="text-xs text-stone-300 mt-2 font-mono">{book.author}</span>
            </div>
          )}
          {/* Subtle spine glare effect */}
          <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 via-white/10 to-transparent pointer-events-none" />
        </div>

        {/* Hover overlay quick action button */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-stone-950/80 via-stone-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenReader(book);
            }}
            className="px-2.5 py-1.5 text-xs font-medium text-white bg-white/20 hover:bg-white/30 backdrop-blur-xs rounded-md transition-colors flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Read Sample</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(book);
            }}
            className="px-2.5 py-1.5 text-xs font-medium text-stone-900 bg-white hover:bg-stone-100 rounded-md transition-colors flex items-center gap-1 shadow-xs"
          >
            <span>View Edition</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Information Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Clean Unboxed Metadata with Typographic Separator */}
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
            <span>{book.genre}</span>
            {book.year && (
              <>
                <span aria-hidden="true">·</span>
                <span>{book.year}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{book.formatAvailable === 'both' ? 'Ebook & Print' : book.formatAvailable === 'ebook' ? 'Ebook Only' : 'Print Only'}</span>
          </div>

          {/* Book Title */}
          <h3
            onClick={() => onSelect(book)}
            className="mt-1.5 font-serif text-lg font-bold text-stone-900 hover:text-stone-700 transition-colors cursor-pointer line-clamp-1"
            title={book.title}
          >
            {book.title}
          </h3>

          {/* Author */}
          <p className="text-xs text-stone-600 font-medium mt-0.5 line-clamp-1">
            by {book.author}
          </p>

          {/* Quiet 2-line synopsis */}
          <p className="mt-2 text-xs text-stone-500 line-clamp-2 leading-relaxed">
            {book.description}
          </p>
        </div>

        {/* Pricing Baseline and Primary Purchase Action */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-stone-400 font-mono">Price</span>
            <span
              className={`font-mono text-base font-bold tabular-nums ${
                isFree ? 'text-emerald-700' : 'text-stone-900'
              }`}
            >
              {formatPrice()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isFree ? (
              <button
                onClick={() => onQuickAdd(book, 'ebook')}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Get Free</span>
              </button>
            ) : (
              <button
                onClick={() => onQuickAdd(book, book.formatAvailable === 'print' ? 'print' : 'ebook')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Bag</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
