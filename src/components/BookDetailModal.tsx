import React, { useState, useRef } from 'react';
import { Book, BookGenre, Currency, User } from '../types/book';
import {
  X,
  BookOpen,
  Download,
  Truck,
  Globe,
  ShieldCheck,
  Check,
  Crown,
  ImagePlus,
  Trash2,
} from 'lucide-react';
import { isStoreOwnerUser } from '../services/storage';

const ALL_GENRES: BookGenre[] = [
  'Self-Help & Personal Growth',
  'Motivation & Success',
  'Finance & Wealth',
  'Business & Craft',
  'Religion & Spirituality',
  'Literary Fiction',
  'African Literature',
  'Philosophy & Thought',
  'Health & Wellness',
  'Romance & Relationships',
  'Poetry',
  'Technology & Society',
  'Science & Nature',
  'Memoir & Essay',
  'History & Biography',
  'Sci-Fi & Fantasy',
  'Children & Young Adult',
  'Education & Academics',
];

interface BookDetailModalProps {
  book: Book;
  currency: Currency;
  onClose: () => void;
  onAddToCart: (book: Book, format: 'ebook' | 'print') => void;
  onOpenReader: (book: Book) => void;
  currentUser?: User | null;
  onUpdateBook?: (updated: Book) => void;
  onDeleteBook?: (id: string) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  currency,
  onClose,
  onAddToCart,
  onOpenReader,
  currentUser = null,
  onUpdateBook,
  onDeleteBook,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'ebook' | 'print'>(
    book.formatAvailable === 'print' ? 'print' : 'ebook'
  );
  const [addedNotice, setAddedNotice] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  // Store Owner inline shelf & cover controls
  const isOwner = isStoreOwnerUser(currentUser);
  const [editedGenre, setEditedGenre] = useState<BookGenre>(book.genre);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const coverUploadRef = useRef<HTMLInputElement>(null);

  const isFree = book.priceUSD === 0 && selectedFormat === 'ebook';

  const formatPrice = (format: 'ebook' | 'print') => {
    if (book.priceUSD === 0 && format === 'ebook') return 'Free';
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

  const handleGenreSave = (nextGenre: BookGenre) => {
    setEditedGenre(nextGenre);
    if (onUpdateBook) {
      onUpdateBook({ ...book, genre: nextGenre });
    }
  };

  const handleCoverReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUpdateBook) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setCoverFailed(false);
        onUpdateBook({ ...book, coverUrl: ev.target.result as string });
      }
    };
    reader.readAsDataURL(file);
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
              {book.coverUrl && !coverFailed ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setCoverFailed(true)}
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
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 font-medium">
                <span>{editedGenre}</span>
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

              {/* Store Owner Quick Shelf & Cover Controls */}
              {isOwner && (onUpdateBook || onDeleteBook) && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-950 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-700" />
                      <span>Store Owner Shelf Controls</span>
                    </span>
                    <input
                      ref={coverUploadRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverReplace}
                      className="hidden"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {onUpdateBook && (
                      <>
                        <select
                          value={editedGenre}
                          onChange={(e) => handleGenreSave(e.target.value as BookGenre)}
                          className="flex-1 min-w-[180px] px-2.5 py-1.5 text-xs bg-white border border-amber-300/80 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                          aria-label="Move book to shelf genre"
                        >
                          {ALL_GENRES.map((g) => (
                            <option key={g} value={g}>
                              Shelf: {g}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => coverUploadRef.current?.click()}
                          className="px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-800 border border-amber-300/80 rounded-md font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>Change Cover</span>
                        </button>
                      </>
                    )}

                    {onDeleteBook && (
                      confirmDelete ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteBook(book.id);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-md font-semibold cursor-pointer"
                          >
                            Confirm Remove
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="px-2 py-1.5 bg-white text-stone-700 border border-stone-300 rounded-md"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                          className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Format Selector */}
              <div className="mt-6 space-y-2">
                <span className="text-xs font-semibold text-stone-700 block">Select Edition Format:</span>
                <div className="grid grid-cols-2 gap-2.5">
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
                        <span>Hardcopy (Print)</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-stone-800">
                        {formatPrice('print')}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500 mt-1 block">
                      Physical hardcopy edition (+ city courier delivery fee at checkout).
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
                      <strong className="text-stone-900 font-medium">Instant Worldwide Download:</strong> Ebooks are immediately available for reading and download upon payment confirmation, complete with an official receipt.
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
