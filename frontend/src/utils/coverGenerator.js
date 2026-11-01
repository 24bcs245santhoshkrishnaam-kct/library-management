/**
 * Client-Side Book Cover Generator: Produces beautiful, distinct SVG data URIs
 * for books based on their title, author, category, and ID.
 */

const PALETTES = [
  { bg1: '#0f172a', bg2: '#1e293b', accent: '#38bdf8', border: '#7dd3fc', text: '#ffffff', tag: '#0284c7' },
  { bg1: '#1e1b4b', bg2: '#312e81', accent: '#a5b4fc', border: '#c7d2fe', text: '#ffffff', tag: '#4f46e5' },
  { bg1: '#14532d', bg2: '#166534', accent: '#86efac', border: '#bbf7d0', text: '#ffffff', tag: '#15803d' },
  { bg1: '#701a75', bg2: '#86198f', accent: '#f472b6', border: '#fbcfe8', text: '#ffffff', tag: '#a21caf' },
  { bg1: '#7c2d12', bg2: '#9a3412', accent: '#fdba74', border: '#fed7aa', text: '#ffffff', tag: '#c2410c' },
  { bg1: '#042f2e', bg2: '#115e59', accent: '#2dd4bf', border: '#99f6e4', text: '#ffffff', tag: '#0d9488' },
  { bg1: '#18181b', bg2: '#27272a', accent: '#facc15', border: '#fef08a', text: '#ffffff', tag: '#ca8a04' },
  { bg1: '#831843', bg2: '#9d174d', accent: '#f9a8d4', border: '#fbcfe8', text: '#ffffff', tag: '#be185d' },
  { bg1: '#1e3a8a', bg2: '#1d4ed8', accent: '#93c5fd', border: '#bfdbfe', text: '#ffffff', tag: '#2563eb' },
  { bg1: '#365314', bg2: '#4d7c0f', accent: '#bef264', border: '#d9f99d', text: '#ffffff', tag: '#65a30d' },
  { bg1: '#4c1d95', bg2: '#5b21b6', accent: '#c4b5fd', border: '#ddd6fe', text: '#ffffff', tag: '#7c3aed' },
  { bg1: '#78350f', bg2: '#92400e', accent: '#fde68a', border: '#fef3c7', text: '#ffffff', tag: '#b45309' },
  { bg1: '#0c4a6e', bg2: '#0369a1', accent: '#7dd3fc', border: '#bae6fd', text: '#ffffff', tag: '#0284c7' },
  { bg1: '#3f3f46', bg2: '#52525b', accent: '#e4e4e7', border: '#f4f4f5', text: '#ffffff', tag: '#71717a' },
  { bg1: '#881337', bg2: '#9f1239', accent: '#fda4af', border: '#fecdd3', text: '#ffffff', tag: '#e11d48' },
  { bg1: '#14213d', bg2: '#1d3557', accent: '#fca311', border: '#ffd166', text: '#ffffff', tag: '#e63946' },
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

function wrapText(text, maxChars = 20) {
  const words = String(text || '').trim().split(/\s+/);
  const lines = [];
  let cur = '';

  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

export function generateFallbackCoverDataUri(book = {}) {
  const title = book.title || 'Library Book';
  const author = book.author || 'Academic Author';
  const category = book.category || 'General';
  const dept = book.department || 'ACADEMIC';
  const id = book.id || 1;

  const h = hashString(title + id + category);
  const p = PALETTES[h % PALETTES.length];
  const lines = wrapText(title, 18);

  const startY = 230;
  const lineHeight = lines.length > 3 ? 24 : 28;
  const fontSize = lines.length > 3 ? '18' : '20';

  const titleSvg = lines.map((l, i) => 
    `<text x="150" y="${startY + (i * lineHeight)}" text-anchor="middle" font-family="'Inter', sans-serif" font-size="${fontSize}" font-weight="700" fill="${p.text}">${escapeXml(l)}</text>`
  ).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="300" height="450">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${p.bg1}" />
        <stop offset="50%" stop-color="${p.bg2}" />
        <stop offset="100%" stop-color="${p.bg1}" />
      </linearGradient>
      <linearGradient id="sp" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#000" stop-opacity="0.6"/>
        <stop offset="30%" stop-color="#fff" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    <rect width="300" height="450" rx="10" fill="url(#bg)"/>
    <rect x="14" y="14" width="272" height="422" rx="6" fill="none" stroke="${p.border}" stroke-width="1.5" opacity="0.5"/>
    <rect x="18" y="18" width="264" height="414" rx="4" fill="none" stroke="${p.border}" stroke-width="0.8" opacity="0.3"/>
    <g transform="translate(150, 52)">
      <rect x="-90" y="-13" width="180" height="26" rx="13" fill="${p.tag}" opacity="0.9"/>
      <text x="0" y="4" text-anchor="middle" font-family="'Inter', sans-serif" font-size="10" font-weight="700" fill="#fff" letter-spacing="0.08em">${escapeXml(dept.toUpperCase().slice(0, 20))}</text>
    </g>
    <text x="150" y="96" text-anchor="middle" font-family="'Inter', sans-serif" font-size="8.5" font-weight="600" fill="${p.accent}" letter-spacing="0.1em" opacity="0.85">SMART COLLEGE LIBRARY</text>
    <circle cx="150" cy="155" r="32" fill="${p.accent}" fill-opacity="0.15" stroke="${p.accent}" stroke-width="2" opacity="0.4"/>
    <text x="150" y="162" text-anchor="middle" font-family="'Inter', sans-serif" font-size="22" fill="${p.accent}">📖</text>
    <line x1="60" y1="205" x2="240" y2="205" stroke="${p.accent}" stroke-width="1" opacity="0.4" stroke-dasharray="4 3"/>
    ${titleSvg}
    <text x="150" y="375" text-anchor="middle" font-family="'Inter', sans-serif" font-size="10" font-weight="500" fill="${p.accent}" opacity="0.9">${escapeXml(category.slice(0, 26))}</text>
    <g transform="translate(150, 408)">
      <rect x="-110" y="-12" width="220" height="24" rx="4" fill="#000" fill-opacity="0.3" stroke="${p.border}" stroke-width="0.8" opacity="0.5"/>
      <text x="0" y="4" text-anchor="middle" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#fff">${escapeXml(author.slice(0, 32))}</text>
    </g>
    <rect width="22" height="450" rx="10" fill="url(#sp)"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

