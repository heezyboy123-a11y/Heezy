import React, { useState } from 'react';
import { Book } from '../types/book';
import { X, Download, ZoomIn, ZoomOut, Type, Sun, Moon, BookOpen } from 'lucide-react';

interface ReaderModalProps {
  book: Book;
  onClose: () => void;
}

type PaperTheme = 'cream' | 'sepia' | 'dark';

export const ReaderModal: React.FC<ReaderModalProps> = ({ book, onClose }) => {
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [paperTheme, setPaperTheme] = useState<PaperTheme>('cream');

  const themeClasses: Record<PaperTheme, { bg: string; text: string; header: string; border: string }> = {
    cream: {
      bg: 'bg-[#FBF9F5]',
      text: 'text-[#1F1D1A]',
      header: 'bg-[#F4EFE6] border-[#E5DFD3]',
      border: 'border-[#E8E2D5]',
    },
    sepia: {
      bg: 'bg-[#F5EEDC]',
      text: 'text-[#3E2F1C]',
      header: 'bg-[#EBDDC3] border-[#DECEAF]',
      border: 'border-[#DFD1B5]',
    },
    dark: {
      bg: 'bg-[#18191B]',
      text: 'text-[#E4E3DF]',
      header: 'bg-[#222427] border-[#2E3136]',
      border: 'border-[#2E3136]',
    },
  };

  const currentTheme = themeClasses[paperTheme];

  const handleDownload = () => {
    if (book.downloadUrl) {
      const link = document.createElement('a');
      link.href = book.downloadUrl;
      link.download = `${book.title.replace(/\s+/g, '_')}.${book.fileType || 'epub'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Generate downloadable text/epub data blob
    const content = `${book.title.toUpperCase()}\nBy ${book.author}\nPublished: ${book.year || 'N/A'}\nGenre: ${book.genre}\n\n${book.description}\n\n=================================\n\n${book.sampleContent || 'Enjoy reading this Open Shelf edition.'}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${book.title.replace(/\s+/g, '_')}.${book.fileType || 'epub'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl h-full sm:h-[92vh] sm:rounded-xl shadow-2xl flex flex-col overflow-hidden transition-colors ${currentTheme.bg} ${currentTheme.text}`}
      >
        {/* Reader Top Controls */}
        <div
          className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${currentTheme.header}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 shrink-0 text-stone-500" />
            <div className="min-w-0">
              <h3 className="font-serif text-sm sm:text-base font-bold truncate leading-tight">
                {book.title}
              </h3>
              <p className="text-[11px] opacity-70 truncate font-mono">
                {book.author} · {book.genre}
              </p>
            </div>
          </div>

          {/* Reader Preferences Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Font Family Toggle */}
            <button
              onClick={() => setFontFamily(fontFamily === 'serif' ? 'sans' : 'serif')}
              className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-1"
              title="Toggle Serif / Sans font"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono">{fontFamily.toUpperCase()}</span>
            </button>

            {/* Font Size Steppers */}
            <div className="flex items-center border rounded px-1 text-xs">
              <button
                onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                className="p-1 hover:opacity-75"
                title="Decrease font size"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[11px]">{fontSize}px</span>
              <button
                onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                className="p-1 hover:opacity-75"
                title="Increase font size"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Theme Toggles */}
            <div className="flex items-center gap-1 border rounded p-0.5">
              <button
                onClick={() => setPaperTheme('cream')}
                className={`w-5 h-5 rounded-full bg-[#FBF9F5] border border-stone-300 ${
                  paperTheme === 'cream' ? 'ring-2 ring-stone-800' : ''
                }`}
                title="Cream paper"
              />
              <button
                onClick={() => setPaperTheme('sepia')}
                className={`w-5 h-5 rounded-full bg-[#F5EEDC] border border-stone-300 ${
                  paperTheme === 'sepia' ? 'ring-2 ring-amber-800' : ''
                }`}
                title="Sepia parchment"
              />
              <button
                onClick={() => setPaperTheme('dark')}
                className={`w-5 h-5 rounded-full bg-[#18191B] border border-stone-600 ${
                  paperTheme === 'dark' ? 'ring-2 ring-stone-300' : ''
                }`}
                title="Night dark mode"
              />
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="px-2.5 py-1.5 rounded text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 hover:opacity-90 flex items-center gap-1 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download File</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Document Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-16 py-10 sm:py-14">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Title Page Lockup */}
            <div className="text-center pb-8 border-b border-black/10 dark:border-white/10 space-y-2">
              <p className="text-xs uppercase tracking-widest font-mono opacity-60">
                {book.genre} {book.year ? `· ${book.year}` : ''}
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
                {book.title}
              </h1>
              <p className="text-sm sm:text-base font-medium opacity-80">
                by {book.author}
              </p>
            </div>

            {/* Reading Text */}
            <div
              className={`leading-relaxed whitespace-pre-line tracking-normal ${
                fontFamily === 'serif' ? 'font-serif' : 'font-sans'
              }`}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
            >
              {book.sampleContent ||
                `CHAPTER 1\n\nThe rain began just as the afternoon shadows stretched across the harbor. The fishermen were pulling their boats onto the pebbles, their oilskins shining in the gray light...\n\nEvery journey through a book is an invitation to inhabit another consciousness. Here in the Open Shelf collection, independent works are preserved and distributed directly to readers worldwide.`}
            </div>

            {/* Chapter End Mark */}
            <div className="pt-12 text-center text-xs opacity-50 font-serif italic">
              · · · Open Shelf Reader Sanctuary · · ·
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
