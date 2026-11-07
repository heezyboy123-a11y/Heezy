export type CoverThemeId =
  | 'minimalist-editorial'
  | 'terracotta-arch'
  | 'indigo-stamped'
  | 'vintage-linen'
  | 'modern-bauhaus'
  | 'botanical-cyan';

export interface CoverTheme {
  id: CoverThemeId;
  name: string;
  bgFill: string;
  accentColor: string;
  textColor: string;
  subtitleColor: string;
  borderStyle: 'hairline' | 'geometric' | 'frame' | 'none';
}

export const COVER_THEMES: CoverTheme[] = [
  {
    id: 'minimalist-editorial',
    name: 'Minimalist Cream',
    bgFill: '#F7F4EC',
    accentColor: '#8C6843',
    textColor: '#1A1815',
    subtitleColor: '#6B655B',
    borderStyle: 'frame',
  },
  {
    id: 'terracotta-arch',
    name: 'Terracotta Earth',
    bgFill: '#C45E3D',
    accentColor: '#E6A177',
    textColor: '#FFFFFF',
    subtitleColor: '#F5DDD0',
    borderStyle: 'geometric',
  },
  {
    id: 'indigo-stamped',
    name: 'Deep Indigo Cloth',
    bgFill: '#1A2538',
    accentColor: '#D4AF37', // Gold foil
    textColor: '#FAF8F5',
    subtitleColor: '#9FAFC8',
    borderStyle: 'hairline',
  },
  {
    id: 'vintage-linen',
    name: 'Warm Linen Weave',
    bgFill: '#EDE6DA',
    accentColor: '#4A3B32',
    textColor: '#2C221E',
    subtitleColor: '#786960',
    borderStyle: 'frame',
  },
  {
    id: 'modern-bauhaus',
    name: 'Modernist Bauhaus',
    bgFill: '#24272B',
    accentColor: '#E06D53',
    textColor: '#FDFBF7',
    subtitleColor: '#D1BA8E',
    borderStyle: 'geometric',
  },
  {
    id: 'botanical-cyan',
    name: 'Cyanotype Botanical',
    bgFill: '#163E59',
    accentColor: '#79B3D6',
    textColor: '#FFFFFF',
    subtitleColor: '#A5CCE1',
    borderStyle: 'hairline',
  },
];

/**
 * Generates an ultra-crisp, high-resolution book cover using HTML5 Canvas.
 * Returns a high-quality data URL (JPEG/PNG) that looks authentic, professional, and neat.
 */
export function generateCanvasBookCover({
  title,
  author,
  genre = 'Open Shelf Edition',
  year,
  themeId = 'minimalist-editorial',
  width = 900,
  height = 1200,
}: {
  title: string;
  author: string;
  genre?: string;
  year?: number;
  themeId?: CoverThemeId;
  width?: number;
  height?: number;
}): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const theme = COVER_THEMES.find((t) => t.id === themeId) || COVER_THEMES[0];

  // 1. Background fill
  ctx.fillStyle = theme.bgFill;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle organic paper / linen texture grain
  ctx.fillStyle = 'rgba(0, 0, 0, 0.025)';
  for (let i = 0; i < width; i += 4) {
    for (let j = 0; j < height; j += 4) {
      if ((i + j) % 3 === 0) {
        ctx.fillRect(i, j, 2, 2);
      }
    }
  }

  // 3. Theme-specific graphic elements
  if (theme.id === 'terracotta-arch') {
    // Arch cutouts and modernist geometry
    ctx.fillStyle = 'rgba(230, 161, 119, 0.25)';
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.42, 220, Math.PI, 0, false);
    ctx.lineTo(width / 2 + 220, height * 0.62);
    ctx.lineTo(width / 2 - 220, height * 0.62);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.38, 140, 0, Math.PI * 2);
    ctx.fill();
  } else if (theme.id === 'modern-bauhaus') {
    // Asymmetric color blocks
    ctx.fillStyle = '#E06D53';
    ctx.fillRect(width * 0.1, height * 0.15, width * 0.8, 16);

    ctx.fillStyle = 'rgba(209, 186, 142, 0.3)';
    ctx.beginPath();
    ctx.arc(width * 0.75, height * 0.52, 160, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#48685C';
    ctx.fillRect(width * 0.1, height * 0.55, width * 0.35, 120);
  } else if (theme.id === 'indigo-stamped') {
    // Gold foil starburst geometry
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.46, 180, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, height * 0.46, 150, 0, Math.PI * 2);
    ctx.stroke();

    // Geometric diamond
    ctx.beginPath();
    ctx.moveTo(width / 2, height * 0.46 - 80);
    ctx.lineTo(width / 2 + 80, height * 0.46);
    ctx.lineTo(width / 2, height * 0.46 + 80);
    ctx.lineTo(width / 2 - 80, height * 0.46);
    ctx.closePath();
    ctx.stroke();
  } else if (theme.id === 'botanical-cyan') {
    // Elegant botanical leaves silhouette
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, height * 0.3);
    ctx.bezierCurveTo(width / 2 + 100, height * 0.4, width / 2 - 100, height * 0.5, width / 2, height * 0.65);
    ctx.stroke();

    // Leaf nodes
    for (let y = height * 0.35; y <= height * 0.6; y += 40) {
      ctx.beginPath();
      ctx.ellipse(width / 2 + 35, y, 24, 10, Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(121, 179, 214, 0.28)';
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(width / 2 - 35, y + 15, 24, 10, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Frames / Hairlines
  if (theme.borderStyle === 'frame') {
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, width - 96, height - 96);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(56, 56, width - 112, height - 112);
  } else if (theme.borderStyle === 'hairline') {
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(52, 52, width - 104, height - 104);
  }

  // Spine edge shadow / fold line
  const spineGradient = ctx.createLinearGradient(0, 0, 36, 0);
  spineGradient.addColorStop(0, 'rgba(0,0,0,0.22)');
  spineGradient.addColorStop(0.3, 'rgba(0,0,0,0.06)');
  spineGradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spineGradient;
  ctx.fillRect(0, 0, 36, height);

  // 5. Typography
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Genre / Top Kicker
  ctx.fillStyle = theme.subtitleColor;
  ctx.font = '500 24px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.letterSpacing = '4px';
  const displayGenre = (genre || 'OPEN SHELF EDITION').toUpperCase();
  ctx.fillText(displayGenre, width / 2, height * 0.14);

  // Divider dash
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(width / 2 - 28, height * 0.175, 56, 2);

  // Title wrap & render
  ctx.fillStyle = theme.textColor;
  const isSerif = theme.id !== 'modern-bauhaus';
  const fontSize = title.length > 35 ? 54 : title.length > 20 ? 64 : 76;
  ctx.font = `${isSerif ? '600' : '700'} ${fontSize}px ${isSerif ? '"Cormorant Garamond", Georgia, serif' : '"Plus Jakarta Sans", sans-serif'}`;
  ctx.letterSpacing = isSerif ? '1px' : '0px';

  const words = title.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > width - 160 && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const titleCenterY = height * 0.36;
  const lineHeight = fontSize * 1.15;
  const totalTitleHeight = lines.length * lineHeight;
  const startY = titleCenterY - totalTitleHeight / 2 + lineHeight / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + index * lineHeight);
  });

  // Author
  const authorY = height * 0.76;
  ctx.fillStyle = theme.textColor;
  ctx.font = '600 34px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText(author.toUpperCase(), width / 2, authorY);

  // Publisher imprint & Year
  ctx.fillStyle = theme.subtitleColor;
  ctx.font = '400 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  const imprint = year ? `OPEN SHELF PRESS · ${year}` : `OPEN SHELF PRESS · INDEPENDENT EDITION`;
  ctx.fillText(imprint, width / 2, height * 0.88);

  return canvas.toDataURL('image/jpeg', 0.92);
}
