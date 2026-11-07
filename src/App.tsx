import React, { useState, useEffect, useMemo } from 'react';
import { Book, OrderItem, Currency, DeliveryCity, Order, BookGenre, User } from './types/book';
import {
  getStoredBooks,
  getStoredOrders,
  getStoredCities,
  fetchServerBooks,
  fetchServerOrders,
  fetchServerCities,
  addBook,
  getCurrentUser,
  setCurrentUser as persistUser,
  getStoredWishlist,
  toggleStoredWishlist,
  saveWishlist,
} from './services/storage';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategorySection } from './components/CategorySection';
import { BookCard } from './components/BookCard';
import { BookDetailModal } from './components/BookDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { UploadModal } from './components/UploadModal';
import { DispatcherModal } from './components/DispatcherModal';
import { ReaderModal } from './components/ReaderModal';
import { PaystackSettingsModal } from './components/PaystackSettingsModal';
import { AuthModal } from './components/AuthModal';
import { LegalModal } from './components/LegalModal';
import { WishlistModal } from './components/WishlistModal';
import {
  BookOpen,
  UploadCloud,
  Sparkles,
  Truck,
  Globe,
  ShieldCheck,
  Check,
  ArrowRight,
  Filter,
} from 'lucide-react';

export default function App() {
  // Main data states
  const [books, setBooks] = useState<Book[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryCities, setDeliveryCities] = useState<DeliveryCity[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [currency, setCurrency] = useState<Currency>('USD');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all'); // 'all' | 'free' | 'ebook' | 'print'
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'title'>('newest');

  // Modal visibility states
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDispatcherOpen, setIsDispatcherOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // User session state
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());

  // Wishlist state
  const [wishlist, setWishlist] = useState<string[]>(() => getStoredWishlist());

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleWishlist = (book: Book) => {
    const updated = toggleStoredWishlist(book.id);
    setWishlist(updated);
    const added = updated.includes(book.id);
    showToast(added ? `Saved "${book.title}" to Wishlist` : `Removed "${book.title}" from Wishlist`);
  };

  // Load persistent data on mount with live server sync across all devices
  useEffect(() => {
    setBooks(getStoredBooks());
    setOrders(getStoredOrders());
    setDeliveryCities(getStoredCities());

    fetchServerBooks().then((b) => setBooks(b));
    fetchServerOrders().then((o) => setOrders(o));
    fetchServerCities().then((c) => setDeliveryCities(c));
  }, []);

  // Handle new book uploaded by author/seller from phone
  const handleBookUploaded = async (newBook: Book) => {
    const updated = await addBook(newBook);
    setBooks(updated);
    showToast(`"${newBook.title}" was published to Open Shelf!`);
  };

  // Cart operations
  const handleAddToCart = (book: Book, format: 'ebook' | 'print') => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.book.id === book.id && item.format === format
      );
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      }
      return [...prev, { book, format, quantity: 1 }];
    });
    showToast(`Added "${book.title}" to bag`);
  };

  const handleUpdateCartQuantity = (bookId: string, format: 'ebook' | 'print', qty: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.book.id === bookId && item.format === format
          ? { ...item, quantity: qty }
          : item
      )
    );
  };

  const handleRemoveFromCart = (bookId: string, format: 'ebook' | 'print') => {
    setCart((prev) =>
      prev.filter((item) => !(item.book.id === bookId && item.format === format))
    );
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Extract unique genres for filter bar
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => set.add(b.genre));
    return ['All', ...Array.from(set)];
  }, [books]);

  // Filtered & Sorted books
  const filteredBooks = useMemo(() => {
    return books
      .filter((book) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = book.title.toLowerCase().includes(q);
          const matchAuthor = book.author.toLowerCase().includes(q);
          const matchGenre = book.genre.toLowerCase().includes(q);
          const matchYear = book.year?.toString().includes(q);
          if (!matchTitle && !matchAuthor && !matchGenre && !matchYear) return false;
        }

        // Active filter (all, free, ebook, print)
        if (activeFilter === 'free' && book.priceUSD !== 0) return false;
        if (activeFilter === 'ebook' && book.formatAvailable === 'print') return false;
        if (activeFilter === 'print' && book.formatAvailable === 'ebook') return false;

        // Genre filter
        if (selectedGenre !== 'All' && book.genre !== selectedGenre) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.priceUSD - b.priceUSD;
        if (sortBy === 'price-desc') return b.priceUSD - a.priceUSD;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        // Default: newest
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      });
  }, [books, searchQuery, activeFilter, selectedGenre, sortBy]);

  const freeCount = useMemo(() => books.filter((b) => b.priceUSD === 0).length, [books]);
  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const wishlistBooks = useMemo(() => books.filter((b) => wishlist.includes(b.id)), [books, wishlist]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-stone-900 font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200 border border-stone-700">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Contract (Wordmark · Links · Primary Actions) */}
      <Header
        cartCount={cartItemCount}
        wishlistCount={wishlist.length}
        currency={currency}
        onCurrencyChange={setCurrency}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenDispatcher={() => setIsDispatcherOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={() => {
          persistUser(null);
          setCurrentUser(null);
          showToast('Signed out successfully');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Storefront Hero with Autocomplete Search and Quick Tag Exploration */}
        <Hero
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenUpload={() => setIsUploadOpen(true)}
          totalBooksCount={books.length}
          freeBooksCount={freeCount}
          allBooks={books}
          onSelectBook={(b) => setSelectedBook(b)}
          onQuickFilter={(tag) => {
            if (tag === 'free') {
              setActiveFilter('free');
            } else if (tag === 'print') {
              setActiveFilter('print');
            } else {
              setSelectedGenre(tag);
              setActiveFilter('all');
            }
            document.getElementById('catalog-shelf')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Dedicated Browse Shelves by Category Section */}
        <CategorySection
          books={books}
          selectedGenre={selectedGenre}
          onSelectGenre={(g) => setSelectedGenre(g)}
        />

        {/* Featured Shelf / Collection Section */}
        <section id="catalog-shelf" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-8 scroll-mt-20">
          {/* Section Header & Interactive Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8E3D9] pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <span>The Open Catalog</span>
                <span aria-hidden="true">·</span>
                <span>{filteredBooks.length} {filteredBooks.length === 1 ? 'Title' : 'Titles'} Available</span>
                {selectedGenre !== 'All' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      onClick={() => setSelectedGenre('All')}
                      className="text-stone-800 underline hover:text-black cursor-pointer"
                    >
                      Show All Shelves
                    </button>
                  </>
                )}
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
                {selectedGenre !== 'All'
                  ? selectedGenre
                  : activeFilter === 'free'
                  ? 'The Free Reading Shelf'
                  : activeFilter === 'ebook'
                  ? 'Digital Ebooks for Immediate Download'
                  : activeFilter === 'print'
                  ? 'Print Editions for City Delivery'
                  : 'Curated Works & Independent Editions'}
              </h2>
            </div>

            {/* Segmented Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg text-xs">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  All Formats
                </button>
                <button
                  onClick={() => setActiveFilter('free')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    activeFilter === 'free'
                      ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Free Only ({freeCount})
                </button>
                <button
                  onClick={() => setActiveFilter('ebook')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    activeFilter === 'ebook'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Digital Ebooks
                </button>
                <button
                  onClick={() => setActiveFilter('print')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    activeFilter === 'print'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Print Delivery
                </button>
              </div>

              {/* Genre Selector */}
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="text-xs bg-white border border-[#DDD8CD] rounded-md px-3 py-2 text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-800"
              >
                {availableGenres.map((g) => (
                  <option key={g} value={g}>
                    Genre: {g}
                  </option>
                ))}
              </select>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-white border border-[#DDD8CD] rounded-md px-3 py-2 text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="title">Title: A-Z</option>
              </select>
            </div>
          </div>

          {/* Product Grid: 3-column desktop baseline */}
          {filteredBooks.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-dashed border-[#DDD8CD]">
              <BookOpen className="w-10 h-10 mx-auto text-stone-400" />
              <h3 className="font-serif text-xl font-bold text-stone-900">No books found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                No titles matched your current filter criteria. Reset your search or upload your own ebook right now.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                    setSelectedGenre('All');
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-md transition-colors"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Ebook</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  currency={currency}
                  onSelect={(b) => setSelectedBook(b)}
                  onQuickAdd={(b, format) => handleAddToCart(b, format)}
                  onOpenReader={(b) => setReadingBook(b)}
                  isWishlisted={wishlist.includes(book.id)}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
          )}
        </section>

        {/* Editorial Story / Craftsmanship Section */}
        <section className="border-t border-[#E8E3D9] bg-[#F4EFE6]/60 py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center">
                  <Globe className="w-4 h-4 text-amber-200" />
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  Global Instant Downloads
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  International readers can instantly purchase and download DRM-free EPUB and PDF editions. Paystack clears international cards in seconds with 3D Secure protection.
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center">
                  <Truck className="w-4 h-4 text-emerald-300" />
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  City Courier Deliveries
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Printed volumes are hand-delivered across partner metropolitan cities including Lagos, Abuja, Port Harcourt, and Ibadan. Couriers call prior to doorstep arrival.
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-rose-300" />
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  Upload &amp; Generate Covers
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Have ebooks saved on your phone? Upload them directly with zero platform hosting fees. Use our built-in canvas studio to generate neat, crisp, print-ready book covers.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#E8E3D9] bg-[#FBF9F5] py-10 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-stone-900 text-base">Open Shelf</span>
              <span aria-hidden="true">·</span>
              <span>Independent Digital &amp; Print Books Press</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="hover:text-stone-900 transition-colors"
              >
                Author Upload Studio
              </button>
              <button
                onClick={() => setIsDispatcherOpen(true)}
                className="hover:text-stone-900 transition-colors"
              >
                City Courier Board
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="hover:text-stone-900 transition-colors"
              >
                Paystack Settings
              </button>
              <button
                onClick={() => {
                  setLegalTab('terms');
                  setIsLegalOpen(true);
                }}
                className="hover:text-stone-900 transition-colors underline"
              >
                Terms of Service
              </button>
              <button
                onClick={() => {
                  setLegalTab('privacy');
                  setIsLegalOpen(true);
                }}
                className="hover:text-stone-900 transition-colors underline"
              >
                Privacy Policy
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8E3D9] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-400">
            <span>Powered by Paystack · International &amp; Domestic Card Clearance · Support: <a href="mailto:itljies@gmail.com" className="text-stone-600 underline">itljies@gmail.com</a></span>
            <span>Live Direct-to-Reader Publishing Sanctuary</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Book Details Modal */}
      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          currency={currency}
          onClose={() => setSelectedBook(null)}
          onAddToCart={handleAddToCart}
          onOpenReader={(b) => {
            setSelectedBook(null);
            setReadingBook(b);
          }}
        />
      )}

      {/* 2. Slide-out Cart Drawer with Paystack Checkout */}
      {isCartOpen && (
        <CartDrawer
          onClose={() => setIsCartOpen(false)}
          items={cart}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={handleClearCart}
          currency={currency}
          deliveryCities={deliveryCities}
          onOpenReader={(b) => setReadingBook(b)}
        />
      )}

      {/* 3. Author / Seller Upload Studio */}
      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onBookUploaded={handleBookUploaded}
          currentUser={currentUser}
        />
      )}

      {/* 4. City Dispatcher Courier Logistics Modal */}
      {isDispatcherOpen && (
        <DispatcherModal
          onClose={() => setIsDispatcherOpen(false)}
          orders={orders}
          onOrdersUpdated={setOrders}
          deliveryCities={deliveryCities}
          onCitiesUpdated={setDeliveryCities}
        />
      )}

      {/* 5. In-Browser Distraction-Free eBook Reader */}
      {readingBook && (
        <ReaderModal book={readingBook} onClose={() => setReadingBook(null)} />
      )}

      {/* 6. Paystack & Store Configuration Modal */}
      {isSettingsOpen && (
        <PaystackSettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onConfigSaved={() => showToast('Paystack settings updated successfully')}
        />
      )}

      {/* 7. User Registration & Sign In Modal */}
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onUserLoggedIn={(u) => {
            persistUser(u);
            setCurrentUser(u);
            showToast(`Welcome, ${u.name}!`);
          }}
        />
      )}

      {/* 8. Terms of Service & Privacy Policy Modal */}
      {isLegalOpen && (
        <LegalModal
          initialTab={legalTab}
          onClose={() => setIsLegalOpen(false)}
        />
      )}

      {/* 9. Saved Wishlist Modal */}
      {isWishlistOpen && (
        <WishlistModal
          wishlistBooks={wishlistBooks}
          currency={currency}
          onClose={() => setIsWishlistOpen(false)}
          onRemoveFromWishlist={(id) => {
            const b = books.find((bk) => bk.id === id);
            if (b) handleToggleWishlist(b);
          }}
          onAddToCart={handleAddToCart}
          onOpenReader={(b) => setReadingBook(b)}
          onClearWishlist={() => {
            saveWishlist([]);
            setWishlist([]);
            showToast('Wishlist cleared');
          }}
        />
      )}
    </div>
  );
}
