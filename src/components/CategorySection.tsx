import React from 'react';
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
  ArrowRight,
  Sun,
  Target,
  Coins,
  Heart,
  Landmark,
  GraduationCap,
  Smile,
} from 'lucide-react';

interface CategorySectionProps {
  books: Book[];
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
}

interface CategoryMeta {
  genre: BookGenre;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  toneColor: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    genre: 'Self-Help & Personal Growth',
    label: 'Self-Help & Growth',
    description: 'Habit formation, mindset mastery, emotional sovereignty, and purpose-driven living.',
    icon: Sun,
    toneColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    genre: 'Motivation & Success',
    label: 'Motivation & Drive',
    description: 'High-performance psychology, goal execution, leadership, and mental toughness.',
    icon: Target,
    toneColor: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  {
    genre: 'Finance & Wealth',
    label: 'Finance & Wealth',
    description: 'Personal budgeting, generational prosperity, emerging market investing, and cash flow.',
    icon: Coins,
    toneColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    genre: 'Religion & Spirituality',
    label: 'Faith & Spirituality',
    description: 'Devotionals, prayer companions, theological reflections, and sacred scriptures.',
    icon: Landmark,
    toneColor: 'bg-violet-50 text-violet-800 border-violet-200',
  },
  {
    genre: 'Literary Fiction',
    label: 'Literary Fiction',
    description: 'Immersive storytelling, contemporary prose, and award-winning international narratives.',
    icon: Compass,
    toneColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  {
    genre: 'African Literature',
    label: 'African Literature',
    description: 'Vibrant historical and contemporary voices across West, East, and Southern Africa.',
    icon: Scroll,
    toneColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    genre: 'Philosophy & Thought',
    label: 'Philosophy & Thought',
    description: 'Cognitive models, intuitive architectures, ethics, and deep human contemplation.',
    icon: Feather,
    toneColor: 'bg-stone-100 text-stone-800 border-stone-300',
  },
  {
    genre: 'Business & Craft',
    label: 'Business & Publishing',
    description: 'Practical playbooks on independent commerce, direct creator sales, and operations.',
    icon: TrendingUp,
    toneColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    genre: 'Health & Wellness',
    label: 'Health & Wellness',
    description: 'Holistic vitality, somatic wellness, nutrition, restorative sleep, and longevity.',
    icon: Smile,
    toneColor: 'bg-green-50 text-green-800 border-green-200',
  },
  {
    genre: 'Romance & Relationships',
    label: 'Romance & Love',
    description: 'Captivating emotional arcs, modern relationship insights, and heartfelt connections.',
    icon: Heart,
    toneColor: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  {
    genre: 'Poetry',
    label: 'Poetry & Verses',
    description: 'Ethereal lyrical collections, meditative nature stanzas, and intimate reflections.',
    icon: Sparkles,
    toneColor: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  {
    genre: 'Technology & Society',
    label: 'Tech & Modernity',
    description: 'Calm software design, ethics of intelligence, and digital humanities.',
    icon: Cpu,
    toneColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  {
    genre: 'Science & Nature',
    label: 'Science & Nature',
    description: 'Ecological journeys, scientific observations, biodiversity, and the cosmos.',
    icon: Trees,
    toneColor: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  {
    genre: 'Memoir & Essay',
    label: 'Memoirs & Essays',
    description: 'Personal accounts, cultural chronicles, and literary dispatches.',
    icon: BookOpen,
    toneColor: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  {
    genre: 'Education & Academics',
    label: 'Education & Studies',
    description: 'Scholarly research, study guides, textbooks, and lifelong learning resources.',
    icon: GraduationCap,
    toneColor: 'bg-blue-50 text-blue-800 border-blue-200',
  },
];

export const CategorySection: React.FC<CategorySectionProps> = ({
  books,
  selectedGenre,
  onSelectGenre,
}) => {
  // Count books per genre
  const getGenreCount = (genre: BookGenre) => {
    return books.filter((b) => b.genre === genre).length;
  };

  const handleCategoryClick = (genre: string) => {
    onSelectGenre(genre === selectedGenre ? 'All' : genre);
    // Smooth scroll down to the book grid
    const target = document.getElementById('catalog-shelf');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="border-b border-[#E8E3D9] bg-stone-50/60 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
              <span>Curated Departments</span>
              <span aria-hidden="true">·</span>
              <span>Find by Interest</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
              Browse Shelves by Category
            </h2>
          </div>
          {selectedGenre !== 'All' && (
            <button
              onClick={() => onSelectGenre('All')}
              className="text-xs font-semibold text-stone-700 hover:text-stone-900 underline"
            >
              Reset to All Shelves
            </button>
          )}
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const count = getGenreCount(cat.genre);
            const isSelected = selectedGenre === cat.genre;
            const Icon = cat.icon;

            return (
              <div
                key={cat.genre}
                onClick={() => handleCategoryClick(cat.genre)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-stone-900 shadow-md ring-1 ring-stone-900 -translate-y-0.5'
                    : 'bg-white hover:bg-stone-50/80 border-stone-200 hover:border-stone-300 hover:shadow-sm'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-transform group-hover:scale-105 ${cat.toneColor}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                      {count} {count === 1 ? 'title' : 'titles'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-base font-bold text-stone-900 group-hover:text-stone-700 transition-colors">
                      {cat.label}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-stone-700 group-hover:text-stone-900">
                  <span>{isSelected ? 'Filtering shelf' : 'Explore shelf'}</span>
                  <ArrowRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      isSelected ? 'translate-x-1' : 'group-hover:translate-x-1'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
