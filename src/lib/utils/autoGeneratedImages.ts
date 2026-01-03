/**
 * Auto-Generated Logo & Banner Service
 * 
 * Generates professional SVG-based logos and banners from merchant name
 * when merchant hasn't uploaded their own images.
 */

// Color palettes for different merchant styles (30 palettes for variety)
const COLOR_PALETTES = [
  // Warm & Appetizing (for restaurants)
  { primary: '#E53935', secondary: '#FF7043', accent: '#FFF8E1', text: '#FFFFFF' },
  { primary: '#F4511E', secondary: '#FF8A65', accent: '#FBE9E7', text: '#FFFFFF' },
  { primary: '#FB8C00', secondary: '#FFB74D', accent: '#FFF3E0', text: '#FFFFFF' },
  { primary: '#D32F2F', secondary: '#EF5350', accent: '#FFEBEE', text: '#FFFFFF' },
  { primary: '#C62828', secondary: '#E57373', accent: '#FFCDD2', text: '#FFFFFF' },
  // Fresh & Healthy
  { primary: '#43A047', secondary: '#81C784', accent: '#E8F5E9', text: '#FFFFFF' },
  { primary: '#00897B', secondary: '#4DB6AC', accent: '#E0F2F1', text: '#FFFFFF' },
  { primary: '#2E7D32', secondary: '#66BB6A', accent: '#C8E6C9', text: '#FFFFFF' },
  { primary: '#388E3C', secondary: '#A5D6A7', accent: '#DCEDC8', text: '#FFFFFF' },
  { primary: '#00695C', secondary: '#26A69A', accent: '#B2DFDB', text: '#FFFFFF' },
  // Modern & Professional
  { primary: '#1E88E5', secondary: '#64B5F6', accent: '#E3F2FD', text: '#FFFFFF' },
  { primary: '#5E35B1', secondary: '#9575CD', accent: '#EDE7F6', text: '#FFFFFF' },
  { primary: '#1565C0', secondary: '#42A5F5', accent: '#BBDEFB', text: '#FFFFFF' },
  { primary: '#0277BD', secondary: '#29B6F6', accent: '#B3E5FC', text: '#FFFFFF' },
  { primary: '#4527A0', secondary: '#7E57C2', accent: '#D1C4E9', text: '#FFFFFF' },
  // Elegant & Premium
  { primary: '#37474F', secondary: '#78909C', accent: '#ECEFF1', text: '#FFFFFF' },
  { primary: '#6D4C41', secondary: '#A1887F', accent: '#EFEBE9', text: '#FFFFFF' },
  { primary: '#263238', secondary: '#546E7A', accent: '#CFD8DC', text: '#FFFFFF' },
  { primary: '#4E342E', secondary: '#8D6E63', accent: '#D7CCC8', text: '#FFFFFF' },
  { primary: '#212121', secondary: '#616161', accent: '#E0E0E0', text: '#FFFFFF' },
  // Vibrant & Fun
  { primary: '#D81B60', secondary: '#F48FB1', accent: '#FCE4EC', text: '#FFFFFF' },
  { primary: '#C2185B', secondary: '#EC407A', accent: '#F8BBD9', text: '#FFFFFF' },
  { primary: '#7B1FA2', secondary: '#AB47BC', accent: '#E1BEE7', text: '#FFFFFF' },
  { primary: '#6A1B9A', secondary: '#BA68C8', accent: '#CE93D8', text: '#FFFFFF' },
  // Sunset & Tropical
  { primary: '#FF6F00', secondary: '#FFA726', accent: '#FFE0B2', text: '#FFFFFF' },
  { primary: '#EF6C00', secondary: '#FF9800', accent: '#FFCC80', text: '#FFFFFF' },
  { primary: '#E65100', secondary: '#FF5722', accent: '#FFAB91', text: '#FFFFFF' },
  // Ocean & Cool
  { primary: '#006064', secondary: '#00ACC1', accent: '#B2EBF2', text: '#FFFFFF' },
  { primary: '#01579B', secondary: '#039BE5', accent: '#81D4FA', text: '#FFFFFF' },
  { primary: '#0097A7', secondary: '#00BCD4', accent: '#80DEEA', text: '#FFFFFF' },
];

// Food-related decorative icons as SVG paths (16 icons for variety)
const DECORATIVE_ICONS = {
  fork: 'M12 2c.55 0 1 .45 1 1v8.5c0 .83-.67 1.5-1.5 1.5h-1c-.83 0-1.5-.67-1.5-1.5V3c0-.55.45-1 1-1h2zm-3 0c.55 0 1 .45 1 1v5c0 .55-.45 1-1 1s-1-.45-1-1V3c0-.55.45-1 1-1zm6 0c.55 0 1 .45 1 1v5c0 .55-.45 1-1 1s-1-.45-1-1V3c0-.55.45-1 1-1z',
  spoon: 'M12 2c3.31 0 6 2.69 6 6 0 2.97-2.16 5.43-5 5.91V22h-2v-8.09c-2.84-.48-5-2.94-5-5.91 0-3.31 2.69-6 6-6z',
  chef: 'M12.5 1.5c-1.77 0-3.33.5-4.5 1.5-.17-1-.83-2-2-2-1.5 0-2.5 1.5-2.5 3s1 3 2.5 3c.67 0 1.17-.17 1.5-.5 0 2 1.5 3.5 3.5 3.5h3c2 0 3.5-1.5 3.5-3.5.33.33.83.5 1.5.5 1.5 0 2.5-1.5 2.5-3s-1-3-2.5-3c-1.17 0-1.83 1-2 2-1.17-1-2.73-1.5-4.5-1.5z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  leaf: 'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z',
  pizza: 'M12 2C8.43 2 5.23 3.54 3.01 6L12 22l8.99-16C18.77 3.54 15.57 2 12 2zM7 7c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm5 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
  coffee: 'M2 21h18v-2H2v2zm16-8v-2c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v6c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4zm-2-2H4V7h12v4z',
  utensils: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
  burger: 'M2 16h20v2c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-2zm18-4H4c-1.1 0-2 .9-2 2v1h20v-1c0-1.1-.9-2-2-2zM4 9h16c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zM2 5v1c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2z',
  bowl: 'M12 3C7.58 3 4 6.58 4 11h16c0-4.42-3.58-8-8-8zm-8 9v1c0 4.42 3.58 8 8 8s8-3.58 8-8v-1H4z',
  kebab: 'M11 2v4H9v2h2v3H9v2h2v3H9v2h2v4h2v-4h2v-2h-2v-3h2v-2h-2V8h2V6h-2V2h-2zm-4 6c0 1.1-.9 2-2 2V8h2zm14 0v2c-1.1 0-2-.9-2-2h2z',
  icecream: 'M12 2C9.24 2 7 4.24 7 7v1H5c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1l1.5 8h9l1.5-8h1c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2h-2V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v1H9V7c0-1.66 1.34-3 3-3z',
  cake: 'M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4 8H8v-5H6v5H4v-6l8-3 8 3v6h-4v5h-4v-5zm-4-3c-1.1 0-2 .9-2 2v3h4v-3c0-1.1-.9-2-2-2z',
  drink: 'M5 2v2h14V2H5zm1 4l2 14h8l2-14H6zm6 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z',
  rice: 'M7 7c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2H7zm0 2h10v9H7V9zm2-6c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v1H9V3z',
  fish: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM2 12c0-4.42 3.58-8 8-8 1.64 0 3.16.5 4.43 1.34L16 4h6v6l-1.34 1.57C21.5 12.84 22 14.36 22 16c0 4.42-3.58 8-8 8s-8-3.58-8-8z',
};

// Pattern generators for backgrounds (12 patterns for variety)
const PATTERNS = {
  dots: (color: string) => `
    <pattern id="dots" patternUnits="userSpaceOnUse" width="20" height="20">
      <circle cx="10" cy="10" r="2" fill="${color}" opacity="0.1"/>
    </pattern>
  `,
  lines: (color: string) => `
    <pattern id="lines" patternUnits="userSpaceOnUse" width="20" height="20">
      <line x1="0" y1="10" x2="20" y2="10" stroke="${color}" stroke-width="1" opacity="0.1"/>
    </pattern>
  `,
  waves: (color: string) => `
    <pattern id="waves" patternUnits="userSpaceOnUse" width="40" height="20">
      <path d="M0 10 Q10 0 20 10 T40 10" fill="none" stroke="${color}" stroke-width="2" opacity="0.1"/>
    </pattern>
  `,
  grid: (color: string) => `
    <pattern id="grid" patternUnits="userSpaceOnUse" width="30" height="30">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="${color}" stroke-width="1" opacity="0.08"/>
    </pattern>
  `,
  diamonds: (color: string) => `
    <pattern id="diamonds" patternUnits="userSpaceOnUse" width="24" height="24">
      <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="none" stroke="${color}" stroke-width="1" opacity="0.1"/>
    </pattern>
  `,
  zigzag: (color: string) => `
    <pattern id="zigzag" patternUnits="userSpaceOnUse" width="40" height="12">
      <path d="M0 6 L10 0 L20 6 L30 0 L40 6" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.1"/>
    </pattern>
  `,
  circles: (color: string) => `
    <pattern id="circles" patternUnits="userSpaceOnUse" width="40" height="40">
      <circle cx="20" cy="20" r="15" fill="none" stroke="${color}" stroke-width="1" opacity="0.08"/>
    </pattern>
  `,
  hexagons: (color: string) => `
    <pattern id="hexagons" patternUnits="userSpaceOnUse" width="28" height="49">
      <path d="M14 0 L28 8 L28 24 L14 32 L0 24 L0 8 Z" fill="none" stroke="${color}" stroke-width="1" opacity="0.08"/>
      <path d="M14 32 L28 40 L28 56 L14 64 L0 56 L0 40 Z" fill="none" stroke="${color}" stroke-width="1" opacity="0.08" transform="translate(0,-16)"/>
    </pattern>
  `,
  triangles: (color: string) => `
    <pattern id="triangles" patternUnits="userSpaceOnUse" width="30" height="26">
      <path d="M15 0 L30 26 L0 26 Z" fill="none" stroke="${color}" stroke-width="1" opacity="0.08"/>
    </pattern>
  `,
  crosshatch: (color: string) => `
    <pattern id="crosshatch" patternUnits="userSpaceOnUse" width="20" height="20">
      <path d="M0 0 L20 20 M20 0 L0 20" stroke="${color}" stroke-width="1" opacity="0.06"/>
    </pattern>
  `,
  confetti: (color: string) => `
    <pattern id="confetti" patternUnits="userSpaceOnUse" width="50" height="50">
      <rect x="5" y="5" width="4" height="4" fill="${color}" opacity="0.1" transform="rotate(15 7 7)"/>
      <rect x="25" y="15" width="3" height="3" fill="${color}" opacity="0.08" transform="rotate(-20 26.5 16.5)"/>
      <rect x="40" y="35" width="5" height="5" fill="${color}" opacity="0.12" transform="rotate(45 42.5 37.5)"/>
      <rect x="15" y="40" width="4" height="4" fill="${color}" opacity="0.09" transform="rotate(30 17 42)"/>
    </pattern>
  `,
  stars: (color: string) => `
    <pattern id="stars" patternUnits="userSpaceOnUse" width="50" height="50">
      <polygon points="25,5 28,18 40,18 30,26 34,40 25,31 16,40 20,26 10,18 22,18" fill="${color}" opacity="0.08"/>
    </pattern>
  `,
};

/**
 * Generate a consistent color palette based on merchant name
 */
function getColorPalette(name: string): typeof COLOR_PALETTES[0] {
  // Generate a hash from the name for consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTES.length;
  return COLOR_PALETTES[index];
}

/**
 * Get initials from merchant name (max 2 characters)
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Get a decorative icon based on merchant name
 */
function getDecorativeIcon(name: string): string {
  const icons = Object.keys(DECORATIVE_ICONS) as (keyof typeof DECORATIVE_ICONS)[];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % icons.length;
  return DECORATIVE_ICONS[icons[index]];
}

/**
 * Generate SVG logo for a merchant (Square shape with rounded corners)
 */
export function generateLogoSVG(merchantName: string, size: number = 200): string {
  const palette = getColorPalette(merchantName);
  const initials = getInitials(merchantName);
  const iconPath = getDecorativeIcon(merchantName);
  
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${palette.primary}"/>
      <stop offset="100%" style="stop-color:${palette.secondary}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.25"/>
    </filter>
    <clipPath id="roundedSquare">
      <rect x="5" y="5" width="190" height="190" rx="24" ry="24"/>
    </clipPath>
  </defs>
  
  <!-- Background Square with Rounded Corners -->
  <rect x="5" y="5" width="190" height="190" rx="24" ry="24" fill="url(#bgGradient)" filter="url(#shadow)"/>
  
  <!-- Inner Pattern Area -->
  <rect x="15" y="15" width="170" height="170" rx="20" ry="20" fill="${palette.primary}" opacity="0.2"/>
  
  <!-- Decorative Border -->
  <rect x="20" y="20" width="160" height="160" rx="16" ry="16" fill="none" stroke="${palette.text}" stroke-width="2" opacity="0.2"/>
  
  <!-- Initials Text -->
  <text x="100" y="115" text-anchor="middle" fill="${palette.text}" 
        font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="bold">
    ${initials}
  </text>
  
  <!-- Small decorative icon at bottom -->
  <g transform="translate(85, 145) scale(0.6)" fill="${palette.text}" opacity="0.4">
    <path d="${iconPath}"/>
  </g>
</svg>
  `.trim();
}

/**
 * Generate SVG banner for a merchant
 */
export function generateBannerSVG(
  merchantName: string, 
  width: number = 1200, 
  height: number = 400
): string {
  const palette = getColorPalette(merchantName);
  const iconPath = getDecorativeIcon(merchantName);
  const patternKeys = Object.keys(PATTERNS) as (keyof typeof PATTERNS)[];
  let hash = 0;
  for (let i = 0; i < merchantName.length; i++) {
    hash = merchantName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const patternIndex = Math.abs(hash) % patternKeys.length;
  const pattern = PATTERNS[patternKeys[patternIndex]](palette.text);
  
  // Truncate name if too long
  const displayName = merchantName.length > 30 
    ? merchantName.substring(0, 27) + '...' 
    : merchantName;
  
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1200 400">
  <defs>
    <linearGradient id="bannerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${palette.primary}"/>
      <stop offset="50%" style="stop-color:${palette.secondary}"/>
      <stop offset="100%" style="stop-color:${palette.primary}"/>
    </linearGradient>
    ${pattern}
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="400" fill="url(#bannerGradient)"/>
  
  <!-- Pattern Overlay -->
  <rect width="1200" height="400" fill="url(#${patternKeys[patternIndex]})"/>
  
  <!-- Decorative Shapes -->
  <circle cx="100" cy="350" r="150" fill="${palette.text}" opacity="0.05"/>
  <circle cx="1100" cy="50" r="200" fill="${palette.text}" opacity="0.05"/>
  <circle cx="600" cy="400" r="100" fill="${palette.text}" opacity="0.03"/>
  
  <!-- Left decorative icon -->
  <g transform="translate(80, 160) scale(3)" fill="${palette.text}" opacity="0.2">
    <path d="${iconPath}"/>
  </g>
  
  <!-- Right decorative icon -->
  <g transform="translate(1050, 160) scale(3)" fill="${palette.text}" opacity="0.2">
    <path d="${iconPath}"/>
  </g>
  
  <!-- Decorative lines -->
  <line x1="200" y1="320" x2="1000" y2="320" stroke="${palette.text}" stroke-width="2" opacity="0.2"/>
  <line x1="250" y1="80" x2="950" y2="80" stroke="${palette.text}" stroke-width="2" opacity="0.2"/>
  
  <!-- Main Text - Merchant Name -->
  <text x="600" y="220" text-anchor="middle" fill="${palette.text}" 
        font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="bold" 
        filter="url(#textShadow)">
    ${displayName}
  </text>
  
  <!-- Tagline -->
  <text x="600" y="280" text-anchor="middle" fill="${palette.text}" 
        font-family="Arial, Helvetica, sans-serif" font-size="24" opacity="0.8">
    Welcome to Our Restaurant
  </text>
  
  <!-- Decorative stars -->
  <g fill="${palette.text}" opacity="0.3">
    <polygon points="300,150 305,165 320,165 308,175 313,190 300,180 287,190 292,175 280,165 295,165"/>
    <polygon points="900,150 905,165 920,165 908,175 913,190 900,180 887,190 892,175 880,165 895,165"/>
  </g>
</svg>
  `.trim();
}

/**
 * Convert SVG to data URL for use as image source
 */
export function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Generate a logo data URL for a merchant
 */
export function generateLogoDataUrl(merchantName: string, size: number = 200): string {
  const svg = generateLogoSVG(merchantName, size);
  return svgToDataUrl(svg);
}

/**
 * Generate a banner data URL for a merchant
 */
export function generateBannerDataUrl(
  merchantName: string, 
  width: number = 1200, 
  height: number = 400
): string {
  const svg = generateBannerSVG(merchantName, width, height);
  return svgToDataUrl(svg);
}

/**
 * Get logo URL - uses uploaded URL if available, otherwise generates one
 */
export function getLogoUrl(merchantName: string, uploadedLogoUrl?: string | null): string {
  if (uploadedLogoUrl) {
    return uploadedLogoUrl;
  }
  return generateLogoDataUrl(merchantName);
}

/**
 * Get banner URL - uses uploaded URL if available, otherwise generates one
 */
export function getBannerUrl(merchantName: string, uploadedBannerUrl?: string | null): string {
  if (uploadedBannerUrl) {
    return uploadedBannerUrl;
  }
  return generateBannerDataUrl(merchantName);
}

// ============== CACHING SYSTEM ==============

const SVG_CACHE_PREFIX = 'genfity_svg_cache_';
const CACHE_EXPIRY_HOURS = 24;

interface CacheEntry {
  data: string;
  timestamp: number;
}

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate cache key for SVG
 */
function getCacheKey(type: 'logo' | 'banner', merchantName: string, params?: string): string {
  return `${SVG_CACHE_PREFIX}${type}_${merchantName}_${params || 'default'}`;
}

/**
 * Get cached SVG if available and not expired
 */
function getCachedSVG(cacheKey: string): string | null {
  if (!isStorageAvailable()) return null;
  
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
    
    if (now - entry.timestamp > expiryTime) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Cache SVG data
 */
function setCachedSVG(cacheKey: string, data: string): void {
  if (!isStorageAvailable()) return;
  
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // Storage full or other error, silently fail
    clearExpiredCache();
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  if (!isStorageAvailable()) return;
  
  try {
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SVG_CACHE_PREFIX)) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const entry: CacheEntry = JSON.parse(cached);
            if (now - entry.timestamp > expiryTime) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Silently fail
  }
}

/**
 * Clear all SVG cache
 */
export function clearAllCache(): void {
  if (!isStorageAvailable()) return;
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SVG_CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Silently fail
  }
}

/**
 * Generate logo with caching
 */
export function getCachedLogoDataUrl(merchantName: string, size: number = 200): string {
  const cacheKey = getCacheKey('logo', merchantName, `${size}`);
  const cached = getCachedSVG(cacheKey);
  
  if (cached) return cached;
  
  const dataUrl = generateLogoDataUrl(merchantName, size);
  setCachedSVG(cacheKey, dataUrl);
  
  return dataUrl;
}

/**
 * Generate banner with caching
 */
export function getCachedBannerDataUrl(
  merchantName: string, 
  width: number = 1200, 
  height: number = 400
): string {
  const cacheKey = getCacheKey('banner', merchantName, `${width}x${height}`);
  const cached = getCachedSVG(cacheKey);
  
  if (cached) return cached;
  
  const dataUrl = generateBannerDataUrl(merchantName, width, height);
  setCachedSVG(cacheKey, dataUrl);
  
  return dataUrl;
}

// ============== WATERMARK SYSTEM ==============

/**
 * Generate watermark SVG overlay
 */
export function generateWatermarkSVG(
  width: number = 400, 
  height: number = 400, 
  text: string = 'GENFITY ORDER'
): string {
  const fontSize = Math.min(width, height) * 0.08;
  const diagonal = Math.sqrt(width * width + height * height);
  const angle = -30;
  
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="watermarkPattern" patternUnits="userSpaceOnUse" width="${diagonal * 0.4}" height="${fontSize * 3}">
      <text x="0" y="${fontSize}" 
            font-family="Arial, Helvetica, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold"
            fill="#000000" 
            opacity="0.08"
            transform="rotate(${angle})">
        ${text}
      </text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#watermarkPattern)"/>
</svg>
  `.trim();
}

/**
 * Convert watermark SVG to data URL
 */
export function getWatermarkDataUrl(
  width: number = 400, 
  height: number = 400, 
  text: string = 'GENFITY ORDER'
): string {
  const svg = generateWatermarkSVG(width, height, text);
  return svgToDataUrl(svg);
}

/**
 * Apply watermark overlay to an image using canvas (client-side only)
 * Returns a Promise with the watermarked image as data URL
 */
export async function applyWatermarkToImage(
  imageUrl: string,
  watermarkText: string = 'GENFITY ORDER',
  opacity: number = 0.15
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Watermarking only available in browser'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Draw watermark pattern
      ctx.save();
      ctx.globalAlpha = opacity;
      
      const fontSize = Math.min(canvas.width, canvas.height) * 0.06;
      ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = '#000000';
      
      // Rotate canvas for diagonal watermark
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-30 * Math.PI / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      
      // Draw multiple watermark texts
      const spacing = fontSize * 4;
      for (let y = -canvas.height; y < canvas.height * 2; y += spacing) {
        for (let x = -canvas.width; x < canvas.width * 2; x += watermarkText.length * fontSize * 0.6 + spacing) {
          ctx.fillText(watermarkText, x, y);
        }
      }
      
      ctx.restore();
      
      // Return as data URL
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Generate simple corner watermark (lighter, less intrusive)
 */
export function generateCornerWatermarkSVG(
  width: number = 400, 
  height: number = 400, 
  text: string = 'GENFITY'
): string {
  const fontSize = Math.min(width, height) * 0.04;
  const padding = fontSize * 0.5;
  
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="watermarkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#000000;stop-opacity:0"/>
      <stop offset="30%" style="stop-color:#000000;stop-opacity:0.5"/>
      <stop offset="100%" style="stop-color:#000000;stop-opacity:0.7"/>
    </linearGradient>
  </defs>
  <rect x="${width - fontSize * text.length * 0.7 - padding * 3}" y="${height - fontSize - padding * 3}" 
        width="${fontSize * text.length * 0.7 + padding * 2}" height="${fontSize + padding * 2}" 
        fill="url(#watermarkGradient)" rx="4"/>
  <text x="${width - padding}" y="${height - padding}" 
        text-anchor="end" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold"
        fill="#FFFFFF" 
        opacity="0.9">
    ${text}
  </text>
</svg>
  `.trim();
}

/**
 * Get all available color palettes (useful for testing/preview)
 */
export function getAllColorPalettes(): typeof COLOR_PALETTES {
  return COLOR_PALETTES;
}

/**
 * Get all available pattern names
 */
export function getAllPatternNames(): string[] {
  return Object.keys(PATTERNS);
}

/**
 * Get all available icon names
 */
export function getAllIconNames(): string[] {
  return Object.keys(DECORATIVE_ICONS);
}
