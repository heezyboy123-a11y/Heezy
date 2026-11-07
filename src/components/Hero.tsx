import React, { useState, useRef, useEffect } from 'react';
import { Book } from '../types/book';
import { Search, Globe, Truck, ShieldCheck, UploadCloud, ArrowUpRight, BookOpen } from 'lucide-react';

interface HeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenUpload: () => void;
  totalBooksCount: number;
  freeBooksCount: number;
  allBooks: Book[];
  onSelectBook: (book: Book) => void;
  onQuickFilter: (tag: string) => void;
}

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  onSearchChange,
  onOpenUpload,
  totalBooksCount,
  freeBooksCount,
  allBooks,
  onSelectBook,
  onQuickFilter,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live search matches
  const searchMatches = searchQuery.trim()
    ? allBooks
        .filter((b) => {
          const q = searchQuery.toLowerCase();
          return (
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            b.genre.toLowerCase().includes(q) ||
            b.year?.toString().includes(q)
          );
        })
        .slice(0, 5)
    : [];

  const quickTags = [
    { label: 'Self-Help', tag: 'Self-Help & Personal Growth' },
    { label: 'Biography', tag: 'History & Biography' },
    { label: 'Free Shelf', tag: 'free' },
    { label: 'African Lit', tag: 'African Literature' },
    { label: 'Philosophy', tag: 'Philosophy & Thought' },
    { label: 'Finance & Wealth', tag: 'Finance & Wealth' },
    { label: 'Print Delivery', tag: 'print' },
  ];

  return (
    <section className="relative overflow-visible border-b border-[#E8E3D9] bg-[#FBF9F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Editorial Headline & Value Propositions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-xs font-medium text-stone-500 uppercase tracking-widest">
              <span>Direct-to-Reader Publishing</span>
              <span aria-hidden="true">·</span>
              <span>Open Shelf Press</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-stone-900 leading-[1.12] text-balance">
              An open sanctuary for digital ebooks &amp; handcrafted print editions.
            </h1>

            <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl">
              Publish directly from your phone. Set your own prices, accept international cards worldwide with{' '}
              <strong className="text-stone-900 font-semibold">Paystack</strong>, and send printed volumes straight to readers via trusted city couriers.
            </p>

            {/* Search Input Bar with Live Suggestions Dropdown */}
            <div ref={containerRef} className="relative max-w-xl space-y-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsFocused(true)}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search by title, author, year, or genre..."
                  className="w-full pl-10 pr-16 py-3 bg-white border border-[#DDD8CD] rounded-lg text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 shadow-xs transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-stone-400 hover:text-stone-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Instant Search Dropdown Preview */}
              {isFocused && searchQuery.trim() && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-xl p-2 z-50 text-xs divide-y divide-stone-100 max-h-72 overflow-y-auto">
                  {searchMatches.length === 0 ? (
                    <div className="p-3 text-stone-500 text-center">
                      No matching titles found for &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    searchMatches.map((book) => (
                      <div
                        key={book.id}
                        onClick={() => {
                          onSelectBook(book);
                          setIsFocused(false);
                        }}
                        className="p-2.5 hover:bg-stone-50 rounded flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={book.coverUrl}
                            alt={book.title}
                            className="w-8 h-11 object-cover rounded-xs book-spine-shadow shrink-0 bg-stone-100"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-stone-900 block truncate">
                              {book.title}
                            </span>
                            <span className="text-[11px] text-stone-500 block truncate">
                              by {book.author} · {book.genre}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-stone-800 text-[11px]">
                            {book.priceUSD === 0 ? 'Free' : `$${book.priceUSD.toFixed(2)}`}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-stone-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Quick Search Tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-stone-500">
                <span className="text-[11px] font-medium text-stone-400">Quick explore:</span>
                {quickTags.map((qt) => (
                  <button
                    key={qt.tag}
                    type="button"
                    onClick={() => onQuickFilter(qt.tag)}
                    className="px-2.5 py-1 bg-stone-100/90 hover:bg-stone-200 text-stone-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quiet feature claims with proof */}
            <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-stone-600">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-stone-700" />
                <span>Instant International Ebook Downloads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-stone-700" />
                <span>City Courier Delivery Network</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-700" />
                <span>Paystack Card Clearance (Visa · Mastercard)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Anchor & Quick Upload Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-xl overflow-hidden border border-[#E8E3D9] bg-white shadow-sm">
              <div className="aspect-16/10 sm:aspect-16/9 relative overflow-hidden">
                <img
                  src="/src/assets/images/hero_bookstore_editorial_1793896191247.jpg"
                  alt="Open Shelf peaceful architectural reading salon"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-102"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-xs font-mono uppercase tracking-widest text-stone-300">Open Shelf Catalog</p>
                  <p className="font-serif text-lg font-semibold leading-snug">
                    {totalBooksCount} Independent Titles · {freeBooksCount} Free to Read
                  </p>
                </div>
              </div>

              {/* Quick Seller Phone Upload Action Strip */}
              <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
                <div className="text-xs text-stone-600">
                  <span className="font-semibold text-stone-900 block">Have ebooks on your phone?</span>
                  <span>Upload directly with zero plan fees &amp; design covers.</span>
                </div>
                <button
                  onClick={onOpenUpload}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-md flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
