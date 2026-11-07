import React from 'react';
import { Book, Currency } from '../types/book';
import { X, Heart, ShoppingBag, BookOpen, Trash2, ArrowRight } from 'lucide-react';

interface WishlistModalProps {
  onClose: () => void;
  wishlistBooks: Book[];
  currency: Currency;
  onRemoveFromWishlist: (bookId: string) => void;
  onAddToCart: (book: Book, format: 'ebook' | 'print') => void;
  onOpenReader: (book: Book) => void;
  onClearWishlist: () => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  onClose,
  wishlistBooks,
  currency,
  onRemoveFromWishlist,
  onAddToCart,
  onOpenReader,
  onClearWishlist,
}) => {
  const formatPrice = (book: Book) => {
    if (book.priceUSD === 0) return 'Free';
    if (currency === 'NGN') return `₦${book.priceNGN.toLocaleString()}`;
    if (currency === 'GBP') return `£${(book.priceUSD * 0.79).toFixed(2)}`;
    if (currency === 'EUR') return `€${(book.priceUSD * 0.92).toFixed(2)}`;
    return `$${book.priceUSD.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                Saved Wishlist
              </h2>
              <p className="text-xs text-stone-500">
                {wishlistBooks.length} {wishlistBooks.length === 1 ? 'title' : 'titles'} saved for later
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

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {wishlistBooks.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                <Heart className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900">Your wishlist is empty</h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Explore our catalog and tap the heart icon on any title you would like to read or purchase later.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-md hover:bg-stone-800 transition-colors"
              >
                Browse Books
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 pb-1">
                <span>Books you saved:</span>
                <button
                  onClick={onClearWishlist}
                  className="text-stone-400 hover:text-stone-700 underline"
                >
                  Clear all
                </button>
              </div>

              {wishlistBooks.map((book) => (
                <div
                  key={book.id}
                  className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-12 h-16 object-cover rounded-xs book-spine-shadow shrink-0 bg-stone-200"
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-stone-500 block truncate">
                        {book.genre} {book.year ? `· ${book.year}` : ''}
                      </span>
                      <h4 className="text-sm font-bold text-stone-900 truncate">{book.title}</h4>
                      <p className="text-xs text-stone-600 truncate">by {book.author}</p>
                      <span className="font-mono text-xs font-bold text-stone-900 mt-1 block">
                        {formatPrice(book)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onOpenReader(book);
                        onClose();
                      }}
                      className="p-2 rounded bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors"
                      title="Read Sample"
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        onAddToCart(book, book.formatAvailable === 'print' ? 'print' : 'ebook')
                      }
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add to Bag</span>
                    </button>
                    <button
                      onClick={() => onRemoveFromWishlist(book.id)}
                      className="p-2 text-stone-400 hover:text-rose-600 transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {wishlistBooks.length > 0 && (
          <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
            <span className="text-xs text-stone-500">
              Saved in your personal reading library
            </span>
            <button
              onClick={() => {
                wishlistBooks.forEach((book) => {
                  onAddToCart(book, book.formatAvailable === 'print' ? 'print' : 'ebook');
                });
                onClose();
              }}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>Add All to Bag</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
