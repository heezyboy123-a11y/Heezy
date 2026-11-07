import React, { useRef } from 'react';
import { BookGenre, Book } from '../types/book';
import {
  BookOpen,
  Compass,
  Feather,
  Sparkles,
  Cpu,
  TrendingUp,
  Scroll,
  Trees,
  Sun,
  Target,
  Coins,
  Heart,
  Landmark,
  GraduationCap,
  Smile,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface CategorySectionProps {
  books: Book[];
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
}

interface CategoryMeta {
  genre: BookGenre;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryMeta[] = [
  {
    genre: 'Self-Help & Personal Growth',
    label: 'Self-Help & Growth',
    icon: Sun,
  },
  {
    genre: 'History & Biography',
    label: 'History & Biography',
    icon: Landmark,
  },
  {
    genre: 'Motivation & Success',
    label: 'Motivation & Drive',
    icon: Target,
  },
  {
    genre: 'Finance & Wealth',
    label: 'Finance & Wealth',
    icon: Coins,
  },
  {
    genre: 'African Literature',
    label: 'African Literature',
    icon: Scroll,
  },
  {
    genre: 'Literary Fiction',
    label: 'Literary Fiction',
    icon: Compass,
  },
  {
    genre: 'Philosophy & Thought',
    label: 'Philosophy & Thought',
    icon: Feather,
  },
  {
    genre: 'Religion & Spirituality',
    label: 'Faith & Devotion',
    icon: Sparkles,
  },
  {
    genre: 'Business & Craft',
    label: 'Business & Craft',
    icon: TrendingUp,
  },
  {
    genre: 'Technology & Society',
    label: 'Tech & Modernity',
    icon: Cpu,
  },
  {
    genre: 'Health & Wellness',
    label: 'Health & Vitality',
    icon: Smile,
  },
  {
    genre: 'Romance & Relationships',
    label: 'Romance & Bonds',
    icon: Heart,
  },
  {
    genre: 'Poetry',
    label: 'Poetry & Verses',
    icon: Sparkles,
  },
  {
    genre: 'Science & Nature',
    label: 'Science & Nature',
    icon: Trees,
  },
  {
    genre: 'Memoir & Essay',
    label: 'Memoirs & Essays',
    icon: BookOpen,
  },
  {
    genre: 'Education & Academics',
    label: 'Education & Studies',
    icon: GraduationCap,
  },
];

export const CategorySection: React.FC<CategorySectionProps> = ({
  books,
  selectedGenre,
  onSelectGenre,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Count books per genre
  const getGenreCount = (genre: BookGenre) => {
    return books.filter((b) => b.genre === genre).length;
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCategoryClick = (genre: string) => {
    onSelectGenre(genre === selectedGenre ? 'All' : genre);
    const target = document.getElementById('catalog-shelf');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="border-b border-[#E8E3D9] bg-stone-50/80 py-4 sm:py-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2.5">
        {/* Compact Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
            <Layers className="w-3.5 h-3.5 text-stone-800" />
            <span className="font-serif text-sm font-bold text-stone-900 tracking-tight">
              Explore Shelves by Category
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="text-[11px] text-stone-500 hidden sm:inline">
              1-click instant filter
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedGenre !== 'All' && (
              <button
                onClick={() => onSelectGenre('All')}
                className="text-xs font-medium text-stone-600 hover:text-stone-900 underline pr-2"
              >
                Clear Filter
              </button>
            )}

            {/* Scroll navigation arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleScroll('left')}
                className="w-7 h-7 rounded-md bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 flex items-center justify-center transition-colors shadow-2xs"
                title="Scroll left"
                aria-label="Scroll categories left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="w-7 h-7 rounded-md bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 flex items-center justify-center transition-colors shadow-2xs"
                title="Scroll right"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Compact Single-Row Horizontal Carousel */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto scroll-smooth py-1 px-0.5 no-scrollbar select-none"
        >
          {/* 'All Shelves' Button */}
          <button
            type="button"
            onClick={() => onSelectGenre('All')}
            className={`shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
              selectedGenre === 'All'
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-white text-stone-700 hover:text-stone-950 border-stone-200 hover:border-stone-300 hover:bg-stone-50/90'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">All Shelves</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                selectedGenre === 'All' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              }`}
            >
              {books.length}
            </span>
          </button>

          {/* Individual Category Items */}
          {CATEGORIES.map((cat) => {
            const count = getGenreCount(cat.genre);
            const isSelected = selectedGenre === cat.genre;
            const Icon = cat.icon;

            return (
              <button
                key={cat.genre}
                type="button"
                onClick={() => handleCategoryClick(cat.genre)}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs font-semibold'
                    : 'bg-white text-stone-700 hover:text-stone-950 border-stone-200 hover:border-stone-300 hover:bg-stone-50/90'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isSelected ? 'text-amber-300' : 'text-stone-500'
                  }`}
                />
                <span className="whitespace-nowrap">{cat.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full tabular-nums ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : count > 0
                      ? 'bg-stone-100 text-stone-600 font-semibold'
                      : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
