/**
 * Cover Service: Generates and serves unique, visually distinct, high-resolution
 * book covers tailored to each book's title, author, category, and department.
 */

const PALETTES = [
  { bg1: '#0f172a', bg2: '#1e293b', accent: '#38bdf8', border: '#7dd3fc', text: '#ffffff', tag: '#0284c7' }, // Slate & Sky
  { bg1: '#1e1b4b', bg2: '#312e81', accent: '#a5b4fc', border: '#c7d2fe', text: '#ffffff', tag: '#4f46e5' }, // Deep Indigo
  { bg1: '#14532d', bg2: '#166534', accent: '#86efac', border: '#bbf7d0', text: '#ffffff', tag: '#15803d' }, // Oxford Emerald
  { bg1: '#701a75', bg2: '#86198f', accent: '#f472b6', border: '#fbcfe8', text: '#ffffff', tag: '#a21caf' }, // Royal Fuchsia
  { bg1: '#7c2d12', bg2: '#9a3412', accent: '#fdba74', border: '#fed7aa', text: '#ffffff', tag: '#c2410c' }, // Terracotta Bronze
  { bg1: '#042f2e', bg2: '#115e59', accent: '#2dd4bf', border: '#99f6e4', text: '#ffffff', tag: '#0d9488' }, // Academic Teal
  { bg1: '#18181b', bg2: '#27272a', accent: '#facc15', border: '#fef08a', text: '#ffffff', tag: '#ca8a04' }, // Obsidian & Gold
  { bg1: '#831843', bg2: '#9d174d', accent: '#f9a8d4', border: '#fbcfe8', text: '#ffffff', tag: '#be185d' }, // Harvard Crimson
  { bg1: '#1e3a8a', bg2: '#1d4ed8', accent: '#93c5fd', border: '#bfdbfe', text: '#ffffff', tag: '#2563eb' }, // Sapphire Blue
  { bg1: '#365314', bg2: '#4d7c0f', accent: '#bef264', border: '#d9f99d', text: '#ffffff', tag: '#65a30d' }, // Sage Green
  { bg1: '#4c1d95', bg2: '#5b21b6', accent: '#c4b5fd', border: '#ddd6fe', text: '#ffffff', tag: '#7c3aed' }, // Imperial Violet
  { bg1: '#78350f', bg2: '#92400e', accent: '#fde68a', border: '#fef3c7', text: '#ffffff', tag: '#b45309' }, // Amber Leather
  { bg1: '#0c4a6e', bg2: '#0369a1', accent: '#7dd3fc', border: '#bae6fd', text: '#ffffff', tag: '#0284c7' }, // Deep Ocean
  { bg1: '#3f3f46', bg2: '#52525b', accent: '#e4e4e7', border: '#f4f4f5', text: '#ffffff', tag: '#71717a' }, // Steel Platinum
  { bg1: '#881337', bg2: '#9f1239', accent: '#fda4af', border: '#fecdd3', text: '#ffffff', tag: '#e11d48' }, // Rosewood
  { bg1: '#14213d', bg2: '#1d3557', accent: '#fca311', border: '#ffd166', text: '#ffffff', tag: '#e63946' }, // Navy & Marigold
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxCharsPerLine = 22) {
  const words = String(text || '').trim().split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 5); // limit to 5 lines
}

function getEmblemForCategory(category = '', dept = '') {
  const c = (category + ' ' + dept).toLowerCase();

  if (c.includes('tamil') || c.includes('sangam') || c.includes('kavithai')) {
    // Traditional Lamp / Lotus motif
    return `
      <g transform="translate(150, 160)" stroke="currentColor" fill="none" stroke-width="2.5" opacity="0.35">
        <circle cx="0" cy="-10" r="14" fill="currentColor" fill-opacity="0.15" />
        <path d="M-28 15 C-20 -5, -8 -15, 0 -30 C8 -15, 20 -5, 28 15 Z" />
        <path d="M-18 20 Q0 30 18 20" />
        <line x1="0" y1="20" x2="0" y2="35" stroke-width="3" />
        <ellipse cx="0" cy="38" rx="20" ry="5" />
      </g>
    `;
  }

  if (c.includes('shakespeare') || c.includes('drama') || c.includes('literature') || c.includes('tragedies')) {
    // Golden Laurel Wreath / Quill
    return `
      <g transform="translate(150, 160)" stroke="currentColor" fill="none" stroke-width="2.5" opacity="0.35">
        <path d="M-35 15 C-40 -15, -20 -35, 0 -40 C20 -35, 40 -15, 35 15" />
        <path d="M-28 20 C-32 -5, -15 -25, 0 -30 C15 -25, 32 -5, 28 20" />
        <path d="M-10 10 L15 -35 C20 -40, 25 -30, 20 -25 L0 25 Z" fill="currentColor" fill-opacity="0.2" />
        <circle cx="0" cy="30" r="4" fill="currentColor" />
      </g>
    `;
  }

  if (c.includes('ece') || c.includes('circuit') || c.includes('electric') || c.includes('eee')) {
    // Microchip / Waveform
    return `
      <g transform="translate(150, 160)" stroke="currentColor" fill="none" stroke-width="2.2" opacity="0.35">
        <rect x="-30" y="-30" width="60" height="60" rx="8" />
        <rect x="-18" y="-18" width="36" height="36" rx="4" fill="currentColor" fill-opacity="0.2" />
        <line x1="-30" y1="-15" x2="-42" y2="-15" /><line x1="-30" y1="0" x2="-42" y2="0" /><line x1="-30" y1="15" x2="-42" y2="15" />
        <line x1="30" y1="-15" x2="42" y2="-15" /><line x1="30" y1="0" x2="42" y2="0" /><line x1="30" y1="15" x2="42" y2="15" />
        <line x1="-15" y1="-30" x2="-15" y2="-42" /><line x1="0" y1="-30" x2="0" y2="-42" /><line x1="15" y1="-30" x2="15" y2="-42" />
        <line x1="-15" y1="30" x2="-15" y2="42" /><line x1="0" y1="30" x2="0" y2="42" /><line x1="15" y1="30" x2="15" y2="42" />
      </g>
    `;
  }

  if (c.includes('mechanical') || c.includes('civil') || c.includes('structure')) {
    // Gears & Drafting Compass
    return `
      <g transform="translate(150, 160)" stroke="currentColor" fill="none" stroke-width="2.5" opacity="0.35">
        <circle cx="0" cy="0" r="28" />
        <circle cx="0" cy="0" r="14" fill="currentColor" fill-opacity="0.2" />
        <line x1="0" y1="-38" x2="0" y2="-28" stroke-width="5" />
        <line x1="0" y1="28" x2="0" y2="38" stroke-width="5" />
        <line x1="-38" y1="0" x2="-28" y2="0" stroke-width="5" />
        <line x1="28" y1="0" x2="38" y2="0" stroke-width="5" />
        <line x1="-27" y1="-27" x2="-20" y2="-20" stroke-width="5" />
        <line x1="20" y1="20" x2="27" y2="27" stroke-width="5" />
        <line x1="27" y1="-27" x2="20" y2="-20" stroke-width="5" />
        <line x1="-20" y1="20" x2="-27" y2="27" stroke-width="5" />
      </g>
    `;
  }

  // Default: Algorithms & Computing Mesh / Academic Open Book
  return `
    <g transform="translate(150, 160)" stroke="currentColor" fill="none" stroke-width="2.5" opacity="0.35">
      <path d="M-40 25 C-25 15, -10 15, 0 20 C10 15, 25 15, 40 25 L40 -25 C25 -35, 10 -35, 0 -30 C-10 -35, -25 -35, -40 -25 Z" fill="currentColor" fill-opacity="0.15" />
      <line x1="0" y1="-30" x2="0" y2="20" stroke-width="3" />
      <path d="M-30 -10 Q-15 -18 0 -15" stroke-dasharray="2 3" />
      <path d="M0 -15 Q15 -18 30 -10" stroke-dasharray="2 3" />
    </g>
  `;
}

/**
 * Generate full SVG string for a given book
 */
function generateBookCoverSvg(book = {}) {
  const title = book.title || 'Library Textbook';
  const author = book.author || 'Academic Author';
  const category = book.category || 'General Engineering';
  const department = book.department || 'ACADEMIC';
  const id = book.id || 1;

  const h = hashString(title + id + category);
  const palette = PALETTES[h % PALETTES.length];

  const titleLines = wrapText(title, 20);
  const emblem = getEmblemForCategory(category, department);

  const startY = 240;
  const lineHeight = titleLines.length > 3 ? 24 : 28;
  const fontSize = titleLines.length > 3 ? '18' : '20';

  const titleSvg = titleLines.map((line, i) => {
    return `<text x="150" y="${startY + (i * lineHeight)}" text-anchor="middle" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="${fontSize}" font-weight="700" fill="${palette.text}" letter-spacing="-0.01em">${escapeXml(line)}</text>`;
  }).join('\n    ');

  const authorClean = escapeXml(author.length > 36 ? author.slice(0, 34) + '...' : author);
  const deptClean = escapeXml(department.toUpperCase().slice(0, 24));
  const catClean = escapeXml(category.slice(0, 28));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="300" height="450">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}" />
      <stop offset="50%" stop-color="${palette.bg2}" />
      <stop offset="100%" stop-color="${palette.bg1}" />
    </linearGradient>

    <!-- Spine 3D Cylinder Gradient -->
    <linearGradient id="spineShade" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.6" />
      <stop offset="30%" stop-color="#ffffff" stop-opacity="0.15" />
      <stop offset="70%" stop-color="#000000" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.0" />
    </linearGradient>

    <!-- Page Leaf Specular Right Edge -->
    <linearGradient id="pageEdge" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.0" />
      <stop offset="70%" stop-color="#f8fafc" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.7" />
    </linearGradient>

    <!-- Ornate Border Pattern -->
    <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${palette.accent}" stroke-width="0.5" opacity="0.08" />
    </pattern>
  </defs>

  <!-- Hardcover Base -->
  <rect x="0" y="0" width="300" height="450" rx="10" fill="url(#bgGrad)" />
  <rect x="0" y="0" width="300" height="450" rx="10" fill="url(#gridPattern)" />

  <!-- Outer Embossed Border -->
  <rect x="14" y="14" width="272" height="422" rx="6" fill="none" stroke="${palette.border}" stroke-width="1.5" opacity="0.5" />
  <rect x="18" y="18" width="264" height="414" rx="4" fill="none" stroke="${palette.border}" stroke-width="0.8" opacity="0.3" />

  <!-- Corner Filigree Ornaments -->
  <g stroke="${palette.accent}" fill="none" stroke-width="1.5" opacity="0.7">
    <path d="M 22 34 L 34 34 L 34 22" />
    <path d="M 278 34 L 266 34 L 266 22" />
    <path d="M 22 416 L 34 416 L 34 428" />
    <path d="M 278 416 L 266 416 L 266 428" />
  </g>

  <!-- Department & Category Pill -->
  <g transform="translate(150, 52)">
    <rect x="-105" y="-14" width="210" height="28" rx="14" fill="${palette.tag}" opacity="0.9" />
    <text x="0" y="4" text-anchor="middle" font-family="'Inter', sans-serif" font-size="10.5" font-weight="700" fill="#ffffff" letter-spacing="0.08em">${deptClean}</text>
  </g>

  <!-- College Library Seal / Subtitle -->
  <text x="150" y="96" text-anchor="middle" font-family="'Inter', sans-serif" font-size="8.5" font-weight="600" fill="${palette.accent}" letter-spacing="0.12em" opacity="0.85">KCT AI SMART LIBRARY</text>

  <!-- Central Discipline Emblem -->
  <g color="${palette.accent}">
    ${emblem}
  </g>

  <!-- Divider Line -->
  <line x1="60" y1="215" x2="240" y2="215" stroke="${palette.accent}" stroke-width="1" opacity="0.4" stroke-dasharray="4 3" />
  <circle cx="150" cy="215" r="3" fill="${palette.accent}" opacity="0.8" />

  <!-- Book Title Lines -->
  <g>
    ${titleSvg}
  </g>

  <!-- Category Footnote -->
  <text x="150" y="380" text-anchor="middle" font-family="'Inter', sans-serif" font-size="10" font-weight="500" fill="${palette.accent}" opacity="0.9">${catClean}</text>

  <!-- Author Name Box -->
  <g transform="translate(150, 408)">
    <rect x="-120" y="-12" width="240" height="24" rx="4" fill="#000000" fill-opacity="0.3" stroke="${palette.border}" stroke-width="0.8" opacity="0.5" />
    <text x="0" y="4" text-anchor="middle" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#ffffff">${authorClean}</text>
  </g>

  <!-- Book Spine 3D Shading (Left) -->
  <rect x="0" y="0" width="22" height="450" rx="10" fill="url(#spineShade)" />
  <line x1="22" y1="0" x2="22" y2="450" stroke="#000000" stroke-width="1" opacity="0.4" />
  <line x1="24" y1="0" x2="24" y2="450" stroke="#ffffff" stroke-width="0.5" opacity="0.2" />

  <!-- Book Leaf Page Trim (Right) -->
  <rect x="294" y="8" width="6" height="434" fill="url(#pageEdge)" />
</svg>`;
}

module.exports = {
  generateBookCoverSvg,
  wrapText,
  PALETTES
};

