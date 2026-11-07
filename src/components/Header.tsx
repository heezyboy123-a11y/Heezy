import React, { useState } from 'react';
import { BookOpen, ShoppingBag, Upload, Truck, SlidersHorizontal, User as UserIcon, LogOut, ShieldCheck, Heart, Share2, Check } from 'lucide-react';
import { Currency, User } from '../types/book';

interface HeaderProps {
  cartCount: number;
  wishlistCount: number;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenUpload: () => void;
  onOpenDispatcher: () => void;
  onOpenSettings: () => void;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  wishlistCount,
  currency,
  onCurrencyChange,
  onOpenCart,
  onOpenWishlist,
  onOpenUpload,
  onOpenDispatcher,
  onOpenSettings,
  activeFilter,
  onSelectFilter,
  currentUser,
  onOpenAuth,
  onSignOut,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    const liveUrl = window.location.origin.includes('localhost')
      ? 'https://ais-pre-ymtgxpaealvb3k5ds4hwhz-644129694611.europe-west3.run.app'
      : window.location.href;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(liveUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }).catch(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E8E3D9] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand wordmark (single line, no descriptor pill) */}
        <div className="flex items-center gap-6 shrink-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onSelectFilter('all');
            }}
            className="flex items-center gap-2.5 text-stone-900 group"
          >
            <div className="w-9 h-9 rounded-md bg-stone-900 text-[#FBF9F5] flex items-center justify-center transition-transform group-hover:scale-105">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-serif text-2xl font-bold tracking-tight text-stone-900 whitespace-nowrap">
              Open Shelf
            </span>
          </a>
        </div>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-stone-600">
          <button
            onClick={() => onSelectFilter('all')}
            className={`whitespace-nowrap transition-colors hover:text-stone-900 pb-0.5 ${
              activeFilter === 'all' ? 'text-stone-900 border-b-2 border-stone-900 font-semibold' : ''
            }`}
          >
            All Titles
          </button>
          <button
            onClick={() => onSelectFilter('free')}
            className={`whitespace-nowrap transition-colors hover:text-stone-900 pb-0.5 ${
              activeFilter === 'free' ? 'text-stone-900 border-b-2 border-stone-900 font-semibold' : ''
            }`}
          >
            Free Books
          </button>
          <button
            onClick={() => onSelectFilter('ebook')}
            className={`whitespace-nowrap transition-colors hover:text-stone-900 pb-0.5 ${
              activeFilter === 'ebook' ? 'text-stone-900 border-b-2 border-stone-900 font-semibold' : ''
            }`}
          >
            Digital Ebooks
          </button>
          <button
            onClick={() => onSelectFilter('print')}
            className={`whitespace-nowrap transition-colors hover:text-stone-900 pb-0.5 ${
              activeFilter === 'print' ? 'text-stone-900 border-b-2 border-stone-900 font-semibold' : ''
            }`}
          >
            City Delivery Editions
          </button>
          <button
            onClick={onOpenDispatcher}
            className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 whitespace-nowrap"
            title="City Courier Logistics Dashboard"
          >
            <Truck className="w-4 h-4 text-stone-500" />
            <span>Courier Dispatch</span>
          </button>
        </nav>

        {/* Zone 3: Primary actions & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Currency selector */}
          <div className="relative inline-flex items-center">
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as Currency)}
              className="text-xs font-mono font-medium bg-stone-100/80 hover:bg-stone-200/80 text-stone-800 rounded-md py-1.5 px-2.5 border border-stone-300/80 focus:outline-none focus:ring-1 focus:ring-stone-500 cursor-pointer transition-colors"
              title="Select pricing currency"
            >
              <option value="USD">USD ($)</option>
              <option value="NGN">NGN (₦)</option>
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          {/* User Account / Sign In */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-md transition-colors"
              >
                <div className="w-4.5 h-4.5 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px]">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[85px] sm:max-w-[120px] truncate">{currentUser.name}</span>
                {currentUser.role === 'admin' && (
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-1 rounded font-mono font-bold hidden sm:inline">
                    Admin
                  </span>
                )}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-stone-200 rounded-lg shadow-xl p-2 z-50 text-xs space-y-1">
                  <div className="px-2.5 py-1.5 border-b border-stone-100">
                    <span className="font-semibold text-stone-900 block truncate">{currentUser.name}</span>
                    <span className="text-[11px] text-stone-500 block truncate font-mono">{currentUser.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenWishlist();
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-stone-100 rounded text-stone-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      <span>Saved Wishlist</span>
                    </span>
                    <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 rounded font-bold text-stone-600">
                      {wishlistCount}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenUpload();
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-stone-100 rounded text-stone-700"
                  >
                    Upload New Book
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenDispatcher();
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-stone-100 rounded text-stone-700"
                  >
                    Courier Deliveries
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 text-red-600 rounded flex items-center gap-1.5 pt-1.5 border-t border-stone-100"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Live Link Share / Copy Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-300 rounded-md transition-colors"
            title="Click to copy live website link to open on any browser or phone"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden sm:inline">Live Link</span>
                <span className="sm:hidden">Link</span>
              </>
            )}
          </button>

          {/* Upload Ebook from Phone / Device */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-stone-800 bg-[#EFECE5] hover:bg-[#E5E1D8] border border-[#DDD8CD] rounded-md transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-stone-700" />
            <span className="hidden sm:inline">Upload Ebook</span>
            <span className="sm:hidden">Upload</span>
          </button>

          {/* Paystack settings */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
            title="Paystack & Store Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Wishlist Button */}
          <button
            onClick={onOpenWishlist}
            className="relative flex items-center justify-center p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
            aria-label="View Saved Wishlist"
            title="View Saved Wishlist"
          >
            <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'text-rose-600 fill-rose-600' : ''}`} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#FBF9F5]">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Shopping Bag / Cart */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center justify-center p-2 text-stone-900 bg-stone-900 hover:bg-stone-800 text-white rounded-md transition-all shadow-sm"
            aria-label="View Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#C25E3E] text-white font-mono text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-[#FBF9F5]">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
