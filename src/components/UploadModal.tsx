import React, { useState, useRef, useEffect } from 'react';
import { Book, BookGenre, BookFormat, User } from '../types/book';
import {
  X,
  Upload,
  Sparkles,
  Image as ImageIcon,
  Check,
  BookOpen,
  AlertCircle,
  FileText,
  Link as LinkIcon,
  Smartphone,
  FileUp,
  ShieldCheck,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import { generateCanvasBookCover, COVER_THEMES, CoverThemeId } from '../services/coverGenerator';
import { isStoreOwnerUser } from '../services/storage';

interface UploadModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onBookUploaded: (newBook: Book) => void;
  currentUser?: User | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  onClose,
  onBookUploaded,
  currentUser = null,
}) => {
  const isStoreOwner = isStoreOwnerUser(currentUser);

  // Form states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState(() => (isStoreOwner ? '' : currentUser?.name || ''));
  const [genre, setGenre] = useState<BookGenre>('Self-Help & Personal Growth');
  const [declaredOriginalWork, setDeclaredOriginalWork] = useState(false);
  const [declarationError, setDeclarationError] = useState<string | null>(null);
  const [year, setYear] = useState<number | ''>(new Date().getFullYear());
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [priceUSD, setPriceUSD] = useState<number>(5.0);
  const [priceNGN, setPriceNGN] = useState<number>(7500);
  const [formatAvailable, setFormatAvailable] = useState<BookFormat>('both');
  const [stockPhysical, setStockPhysical] = useState<number>(10);
  const [sampleContent, setSampleContent] = useState('');

  // Upload method tab: 'device' | 'text' | 'link'
  const [uploadMethod, setUploadMethod] = useState<'device' | 'text' | 'link'>('device');
  const [pasteContent, setPasteContent] = useState('');
  const [externalLink, setExternalLink] = useState('');

  // Uploaded file metadata
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'epub' | 'mobi' | 'txt'>('epub');
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Cover designer state
  const [coverSource, setCoverSource] = useState<'generate' | 'upload'>('generate');
  const [selectedThemeId, setSelectedThemeId] = useState<CoverThemeId>('minimalist-editorial');
  const [coverDataUrl, setCoverDataUrl] = useState<string>('');
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate cover preview when title, author, or theme changes
  useEffect(() => {
    if (coverSource === 'generate') {
      const displayTitle = title.trim() || 'Your Book Title';
      const displayAuthor = author.trim() || 'Author Name';
      const generated = generateCanvasBookCover({
        title: displayTitle,
        author: displayAuthor,
        genre,
        year: year ? Number(year) : undefined,
        themeId: selectedThemeId,
      });
      setCoverDataUrl(generated);
    }
  }, [title, author, genre, year, selectedThemeId, coverSource]);

  // Process selected file from phone or computer
  const processSelectedFile = (file: File) => {
    setFileName(file.name);
    // Format size
    const mb = file.size / (1024 * 1024);
    setFileSize(mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`);

    // Detect format
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.pdf')) setFileType('pdf');
    else if (lower.endsWith('.epub')) setFileType('epub');
    else if (lower.endsWith('.mobi') || lower.endsWith('.azw') || lower.endsWith('.azw3')) setFileType('mobi');
    else if (lower.endsWith('.txt') || lower.endsWith('.text') || lower.endsWith('.rtf') || lower.endsWith('.md')) setFileType('txt');
    else setFileType('epub');

    // Create immediate Object URL for instant zero-lag download & reader access
    try {
      const objUrl = URL.createObjectURL(file);
      setFileDataUrl(objUrl);
    } catch (e) {
      console.warn('Object URL creation failed:', e);
    }

    // For files under 10MB, also read as data URL for persistent offline storage
    if (file.size < 10 * 1024 * 1024) {
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setFileDataUrl(event.target.result as string);
          }
        };
        reader.onerror = () => {
          console.warn('FileReader failed, keeping object URL');
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.warn('Error reading file as data URL:', err);
      }
    }

    // If it's a readable text file and sampleContent is empty, extract first chapter/excerpt
    if (file.type.includes('text') || lower.endsWith('.txt') || lower.endsWith('.md')) {
      try {
        const textReader = new FileReader();
        textReader.onload = (event) => {
          const text = event.target?.result as string;
          if (text && !sampleContent) {
            setSampleContent(text.slice(0, 1500));
          }
        };
        textReader.readAsText(file);
      } catch (e) {
        console.warn('Text reader failed:', e);
      }
    }

    // Auto-fill Title if empty
    if (!title) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setTitle(cleanName);
    }
  };

  // Handle ebook file selection from phone or desktop
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Handle custom cover image upload from phone
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCoverDataUrl(event.target.result as string);
        setCoverSource('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  // Sync USD and NGN prices
  const handleUSDChange = (val: number) => {
    setPriceUSD(val);
    setPriceNGN(Math.round(val * 1500));
  };

  const handleNGNChange = (val: number) => {
    setPriceNGN(val);
    setPriceUSD(Number((val / 1500).toFixed(2)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    if (!isStoreOwner && !declaredOriginalWork) {
      setDeclarationError('Author Protection Policy: You must certify that this is your own original work before publishing.');
      return;
    }

    let finalDownloadUrl = fileDataUrl || undefined;
    let finalSample = sampleContent.trim();
    let finalFileSize = fileSize || '2.8 MB';
    let finalFileType = fileType;

    if (uploadMethod === 'text' && pasteContent.trim()) {
      const blob = new Blob([pasteContent.trim()], { type: 'text/plain;charset=utf-8' });
      finalDownloadUrl = URL.createObjectURL(blob);
      if (!finalSample) {
        finalSample = pasteContent.trim().slice(0, 1500);
      }
      finalFileSize = `${Math.max(1, Math.round(pasteContent.length / 1024))} KB`;
      finalFileType = 'txt';
    } else if (uploadMethod === 'link' && externalLink.trim()) {
      finalDownloadUrl = externalLink.trim();
      finalFileSize = 'Cloud Ebook';
    }

    const newBook: Book = {
      id: `book-user-${Date.now()}`,
      title: title.trim(),
      author: author.trim(),
      genre,
      year: year ? Number(year) : undefined,
      description:
        description.trim() ||
        `${title} is an independent publication by ${author}, available for immediate digital reading and distribution.`,
      priceUSD: isFree ? 0 : priceUSD,
      priceNGN: isFree ? 0 : priceNGN,
      formatAvailable,
      coverUrl: coverDataUrl,
      fileSize: finalFileSize,
      fileType: finalFileType,
      downloadUrl: finalDownloadUrl,
      sampleContent:
        finalSample ||
        `PREVIEW EXCERPT — ${title.toUpperCase()}\n\nBy ${author}\n\nThis volume is distributed directly to readers through Open Shelf. All digital reading rights and instant downloads are unlocked upon checkout.`,
      stockPhysical: formatAvailable !== 'ebook' ? stockPhysical : 0,
      uploadedAt: new Date().toISOString().split('T')[0],
      isUserUploaded: true,
    };

    onBookUploaded(newBook);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                Seller &amp; Author Upload Studio
              </h2>
              <p className="text-xs text-stone-500">
                Direct phone &amp; desktop upload · Free plan enabled · Built-in cover designer
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

        {/* Ownership Status Banner */}
        {isStoreOwner ? (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <Crown className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Store Owner Master Rights:</strong> You have full distributor authority to upload and curate any books (including third-party authors, biographies, and classics).
              </span>
            </div>
            <span className="font-mono text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shrink-0">
              Admin Distributor
            </span>
          </div>
        ) : (
          <div className="px-6 py-2.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-stone-800 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Author Protection Policy:</strong> You may only publish books that are your own original work. Curating third-party books is reserved for the store administrator.
              </span>
            </div>
            <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
              Original Works Only
            </span>
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Section 1: Multiple Upload Methods for Phone & Computer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <FileUp className="w-4 h-4 text-stone-800" />
                <span>Upload or Add Your Ebook Content</span>
              </span>
              <span className="text-[11px] text-stone-500 font-mono">Free plan enabled</span>
            </div>

            {/* Method Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setUploadMethod('device')}
                className={`py-2 px-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  uploadMethod === 'device'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="truncate">File on Phone</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod('text')}
                className={`py-2 px-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  uploadMethod === 'text'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate">Paste Text</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod('link')}
                className={`py-2 px-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  uploadMethod === 'link'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="truncate">Drive / Link</span>
              </button>
            </div>

            {/* TAB 1: DEVICE FILE PICKER */}
            {uploadMethod === 'device' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processSelectedFile(file);
                }}
                className={`relative border-2 border-dashed rounded-lg p-5 text-center transition-all ${
                  isDragOver
                    ? 'border-stone-900 bg-stone-100'
                    : fileName
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-stone-300 bg-stone-50 hover:bg-stone-100/70'
                }`}
              >
                {/* 
                  CRITICAL CROSS-PLATFORM INPUT:
                  1. Sits directly over the card with absolute inset-0 opacity-0 z-20.
                  2. NO 'sr-only', NO 'display: none'.
                  3. Direct user touch anywhere on this card touches the native input directly!
                */}
                <input
                  id="ebook-file-input"
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  aria-label="Upload ebook file"
                />

                {fileName ? (
                  <div className="relative z-30 bg-white p-4 rounded-lg border border-emerald-200 shadow-xs max-w-xl mx-auto text-left pointer-events-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-md bg-stone-900 text-white flex items-center justify-center font-mono text-xs font-bold uppercase shrink-0">
                          {fileType}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-stone-900 truncate block">
                              {fileName}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          </div>
                          <span className="text-xs text-stone-500 font-mono mt-0.5 block">
                            {fileSize} · Ready for instant download &amp; reading
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFileName('');
                          setFileSize('');
                          setFileDataUrl('');
                        }}
                        className="px-3.5 py-1.5 text-xs text-stone-700 hover:text-stone-950 font-semibold bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md transition-colors text-center shrink-0 cursor-pointer"
                      >
                        Remove / Choose Another
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-3 select-none pointer-events-none">
                    <div className="w-13 h-13 mx-auto rounded-full bg-stone-900 text-white flex items-center justify-center shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-serif font-bold text-stone-900">
                        Tap anywhere here to select an ebook file
                      </p>
                      <p className="text-xs text-stone-600 max-w-md mx-auto">
                        Works with files on your phone storage, Downloads, Google Drive, or iCloud.
                      </p>
                      <div className="pt-1.5 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-stone-500 font-mono">
                        <span className="bg-stone-200/80 px-2 py-0.5 rounded">EPUB</span>
                        <span className="bg-stone-200/80 px-2 py-0.5 rounded">PDF</span>
                        <span className="bg-stone-200/80 px-2 py-0.5 rounded">MOBI</span>
                        <span className="bg-stone-200/80 px-2 py-0.5 rounded">TXT</span>
                        <span className="bg-stone-200/80 px-2 py-0.5 rounded">Any file (*.*)</span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-md shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tap to Browse Phone Files</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Secondary 100% visible native browser button for in-app browsers */}
                {!fileName && (
                  <div className="mt-4 pt-3 border-t border-stone-200/70 flex flex-col sm:flex-row items-center justify-center gap-2 relative z-30">
                    <span className="text-[11px] text-stone-500 font-medium">
                      Direct phone browser button:
                    </span>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="text-xs text-stone-700 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-stone-200 file:text-stone-800 hover:file:bg-stone-300 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PASTE BOOK MANUSCRIPT / CHAPTER TEXT */}
            {uploadMethod === 'text' && (
              <div className="bg-stone-50 border border-stone-300 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-stone-700" />
                    <span className="text-xs font-semibold text-stone-900">
                      Paste Book Chapters / Text Directly
                    </span>
                  </div>
                  {pasteContent.trim() && (
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      {pasteContent.trim().split(/\s+/).length} words · ~{Math.max(1, Math.round(pasteContent.length / 1024))} KB
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600">
                  Ideal if your manuscript is in your phone's Notes app, Google Docs, or email. Open Shelf will turn it into a downloadable digital book.
                </p>
                <textarea
                  rows={6}
                  value={pasteContent}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPasteContent(val);
                    setFileType('txt');
                    if (!title && val.trim()) {
                      const firstLine = val.trim().split('\n')[0].replace(/^[#*\s]+/, '').slice(0, 60);
                      if (firstLine.length > 3) setTitle(firstLine);
                    }
                  }}
                  placeholder="Paste your prologue, chapters, poetry, or full manuscript here..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-serif leading-relaxed"
                />
              </div>
            )}

            {/* TAB 3: CLOUD STORAGE OR PUBLIC LINK */}
            {uploadMethod === 'link' && (
              <div className="bg-stone-50 border border-stone-300 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-stone-700" />
                  <span className="text-xs font-semibold text-stone-900">
                    Google Drive, Dropbox, or Direct Ebook Link
                  </span>
                </div>
                <p className="text-xs text-stone-600">
                  Have your file hosted on Google Drive, Dropbox, iCloud, or your website? Paste the shareable link below so buyers and readers can download it.
                </p>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => {
                    setExternalLink(e.target.value);
                    if (e.target.value.toLowerCase().includes('.pdf')) setFileType('pdf');
                    else if (e.target.value.toLowerCase().includes('.epub')) setFileType('epub');
                  }}
                  placeholder="https://drive.google.com/file/d/... or direct .pdf/.epub URL"
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                />
              </div>
            )}
          </div>

          {/* Section 2: Book Details & Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Book Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Echoes Across the River"
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
              />
            </div>

            {/* Author */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700">
                  {isStoreOwner ? 'Author Name *' : 'Author Name (Your Original Creator Name) *'}
                </label>
                {!isStoreOwner && (
                  <span className="text-[11px] text-amber-800 font-medium">
                    Original work only
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={
                  isStoreOwner
                    ? 'e.g. Walter Isaacson, Chinua Achebe, or your name'
                    : 'Your true author or pen name'
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                {isStoreOwner
                  ? 'Master distributor privileges: you may enter any author name.'
                  : 'Must match your true original creator identity. Distributing third-party books is prohibited.'}
              </p>
            </div>

            {/* Genre */}
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Genre / Shelf Category
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value as BookGenre)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
              >
                <option value="Self-Help & Personal Growth">Self-Help &amp; Personal Growth</option>
                <option value="Motivation & Success">Motivation &amp; Success</option>
                <option value="Finance & Wealth">Finance &amp; Wealth</option>
                <option value="Business & Craft">Business &amp; Craft</option>
                <option value="Religion & Spirituality">Religion &amp; Spirituality</option>
                <option value="Literary Fiction">Literary Fiction</option>
                <option value="African Literature">African Literature</option>
                <option value="Philosophy & Thought">Philosophy &amp; Thought</option>
                <option value="Health & Wellness">Health &amp; Wellness</option>
                <option value="Romance & Relationships">Romance &amp; Relationships</option>
                <option value="Poetry">Poetry</option>
                <option value="Technology & Society">Technology &amp; Society</option>
                <option value="Science & Nature">Science &amp; Nature</option>
                <option value="Memoir & Essay">Memoir &amp; Essay</option>
                <option value="History & Biography">History &amp; Biography</option>
                <option value="Sci-Fi & Fantasy">Sci-Fi &amp; Fantasy</option>
                <option value="Children & Young Adult">Children &amp; Young Adult</option>
                <option value="Education & Academics">Education &amp; Academics</option>
              </select>
            </div>

            {/* Publication Year (Optional / Auto as user requested) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700">
                  Publication Year (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setYear(new Date().getFullYear())}
                  className="text-[11px] text-stone-500 hover:text-stone-800 underline"
                >
                  Use Current Year
                </button>
              </div>
              <input
                type="number"
                min="1800"
                max="2030"
                value={year}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
                placeholder="Leave blank or enter year (e.g. 2026)"
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
              />
            </div>
          </div>

          {/* Pricing Setup */}
          <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 block">Pricing &amp; Distribution</span>
                <span className="text-xs text-stone-500">
                  Offer as a free digital gift or sell worldwide via Paystack
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="w-4 h-4 rounded text-stone-900 focus:ring-stone-800"
                />
                <span>Distribute for Free ($0)</span>
              </label>
            </div>

            {!isFree && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200">
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Price in USD ($) — for International Cards
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-stone-400 font-mono">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={priceUSD}
                      onChange={(e) => handleUSDChange(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Price in NGN (₦) — Paystack Domestic
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-stone-400 font-mono">
                      ₦
                    </span>
                    <input
                      type="number"
                      step="500"
                      min="500"
                      value={priceNGN}
                      onChange={(e) => handleNGNChange(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Distribution Formats */}
            <div className="pt-2 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">
                  Available Formats
                </label>
                <select
                  value={formatAvailable}
                  onChange={(e) => setFormatAvailable(e.target.value as BookFormat)}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                >
                  <option value="both">Both Digital Ebook &amp; Physical Print</option>
                  <option value="ebook">Digital Ebook Only (Instant Download)</option>
                  <option value="print">Physical Print Only (City Delivery)</option>
                </select>
              </div>

              {formatAvailable !== 'ebook' && (
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Physical Print Stock Count (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stockPhysical}
                    onChange={(e) => setStockPhysical(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Neat & Clear Cover Image Generator */}
          <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-stone-800" />
                  <span>Neat &amp; Clear Cover Generator</span>
                </span>
                <span className="text-xs text-stone-500">
                  Generate an authentic, print-quality book cover or upload from phone
                </span>
              </div>
              <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-md text-xs">
                <button
                  type="button"
                  onClick={() => setCoverSource('generate')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    coverSource === 'generate' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                  }`}
                >
                  Smart Designer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCoverSource('upload');
                    coverInputRef.current?.click();
                  }}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    coverSource === 'upload' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                  }`}
                >
                  Upload Photo
                </button>
              </div>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* Cover Live Preview */}
              <div className="sm:col-span-4 flex justify-center">
                <div className="w-36 aspect-3/4 rounded-xs overflow-hidden book-spine-shadow bg-stone-200 border border-stone-300 relative">
                  {coverDataUrl ? (
                    <img
                      src={coverDataUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">
                      Generating...
                    </div>
                  )}
                  <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/25 via-white/10 to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Theme Choices */}
              <div className="sm:col-span-8 space-y-3">
                <span className="text-xs font-semibold text-stone-700 block">
                  Select Cover Style &amp; Texture:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COVER_THEMES.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => {
                        setSelectedThemeId(th.id);
                        setCoverSource('generate');
                      }}
                      className={`p-2.5 text-left rounded-md border text-xs transition-all flex items-center gap-2 ${
                        selectedThemeId === th.id && coverSource === 'generate'
                          ? 'border-stone-900 bg-white ring-1 ring-stone-900 font-semibold'
                          : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: th.bgFill }}
                      />
                      <span className="truncate">{th.name}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const themes = COVER_THEMES.map((t) => t.id);
                      const next = themes[(themes.indexOf(selectedThemeId) + 1) % themes.length];
                      setSelectedThemeId(next);
                      setCoverSource('generate');
                    }}
                    className="text-xs font-medium text-stone-700 hover:text-stone-900 underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Shuffle Style Preset</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Synopsis & Sample Chapter */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Book Synopsis / Overview
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Give readers a short, captivating summary of what this book explores..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Sample Excerpt / First Chapter (Optional)
              </label>
              <textarea
                rows={3}
                value={sampleContent}
                onChange={(e) => setSampleContent(e.target.value)}
                placeholder="Paste the opening paragraph or chapter so visitors can sample your book in the reader..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-serif text-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Mandatory Authorship Declaration for Non-Owners */}
          {!isStoreOwner && (
            <div className="p-4 bg-amber-50/80 rounded-lg border border-amber-200/90 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={declaredOriginalWork}
                  onChange={(e) => {
                    setDeclaredOriginalWork(e.target.checked);
                    if (e.target.checked) setDeclarationError(null);
                  }}
                  className="w-4 h-4 mt-0.5 rounded text-stone-900 border-stone-300 focus:ring-stone-800 cursor-pointer"
                />
                <span className="text-xs text-stone-800 leading-relaxed">
                  <strong className="font-bold text-stone-900 block mb-0.5">
                    Original Authorship &amp; Copyright Certification (Mandatory):
                  </strong>
                  I declare, warrant, and legally certify that I am the sole author and legitimate copyright owner of this book manuscript. This volume is my own original creation and has not been copied, plagiarized, or authored by any other third party.
                </span>
              </label>
              {declarationError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-700 font-semibold pt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{declarationError}</span>
                </div>
              )}
            </div>
          )}

          {/* Submission bar */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Persists locally on your device without subscription fees</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Publish to Open Shelf</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
