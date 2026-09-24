import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getUnifiedGroupBadgeParams(slug: string = '', nameZh: string = '') {
  const norm = (slug + nameZh).toLowerCase();

  const build = (
    lightBg: string,
    lightText: string,
    dot: string,
    ring: string,
    gradient: string,
    bg: string,
    shadow: string,
    uiBg: string,
    uiText: string,
    colorDot: string,
    softBg: string,
    softText: string,
    softBorder: string,
  ) => ({
    // New fields
    bg,
    text: lightText,
    dot,
    colorDot,
    softBg,
    softText,
    softBorder,
    // Legacy fields (kept for compatibility)
    lightBg,
    lightText,
    ring,
    gradient,
    shadow,
    // Inline color tokens for interaction states
    uiBg,
    uiText,
  });

  const palettes = [
    build('bg-indigo-500 dark:bg-indigo-500', 'text-white', 'bg-white/95', 'ring-indigo-500/45', 'from-indigo-500 to-indigo-600', 'bg-indigo-500', 'shadow-indigo-500/25', '#6366F1', '#FFFFFF', 'bg-indigo-500', 'bg-indigo-500/15 dark:bg-indigo-500/20', 'text-indigo-700 dark:text-indigo-300', 'border-indigo-500/30 dark:border-indigo-500/40'),
    build('bg-rose-500 dark:bg-rose-500', 'text-white', 'bg-white/95', 'ring-rose-500/45', 'from-rose-500 to-rose-600', 'bg-rose-500', 'shadow-rose-500/25', '#F43F5E', '#FFFFFF', 'bg-rose-500', 'bg-rose-500/15 dark:bg-rose-500/20', 'text-rose-700 dark:text-rose-300', 'border-rose-500/30 dark:border-rose-500/40'),
    build('bg-emerald-500 dark:bg-emerald-500', 'text-white', 'bg-white/95', 'ring-emerald-500/45', 'from-emerald-500 to-emerald-600', 'bg-emerald-500', 'shadow-emerald-500/25', '#10B981', '#FFFFFF', 'bg-emerald-500', 'bg-emerald-500/15 dark:bg-emerald-500/20', 'text-emerald-700 dark:text-emerald-300', 'border-emerald-500/30 dark:border-emerald-500/40'),
    build('bg-blue-500 dark:bg-blue-500', 'text-white', 'bg-white/95', 'ring-blue-500/45', 'from-blue-500 to-blue-600', 'bg-blue-500', 'shadow-blue-500/25', '#3B82F6', '#FFFFFF', 'bg-blue-500', 'bg-blue-500/15 dark:bg-blue-500/20', 'text-blue-700 dark:text-blue-300', 'border-blue-500/30 dark:border-blue-500/40'),
    build('bg-violet-500 dark:bg-violet-500', 'text-white', 'bg-white/95', 'ring-violet-500/45', 'from-violet-500 to-violet-600', 'bg-violet-500', 'shadow-violet-500/25', '#8B5CF6', '#FFFFFF', 'bg-violet-500', 'bg-violet-500/15 dark:bg-violet-500/20', 'text-violet-700 dark:text-violet-300', 'border-violet-500/30 dark:border-violet-500/40'),
    build('bg-cyan-500 dark:bg-cyan-500', 'text-white', 'bg-white/95', 'ring-cyan-500/45', 'from-cyan-500 to-cyan-600', 'bg-cyan-500', 'shadow-cyan-500/25', '#06B6D4', '#FFFFFF', 'bg-cyan-500', 'bg-cyan-500/15 dark:bg-cyan-500/20', 'text-cyan-700 dark:text-cyan-300', 'border-cyan-500/30 dark:border-cyan-500/40'),
    build('bg-fuchsia-500 dark:bg-fuchsia-500', 'text-white', 'bg-white/95', 'ring-fuchsia-500/45', 'from-fuchsia-500 to-fuchsia-600', 'bg-fuchsia-500', 'shadow-fuchsia-500/25', '#D946EF', '#FFFFFF', 'bg-fuchsia-500', 'bg-fuchsia-500/15 dark:bg-fuchsia-500/20', 'text-fuchsia-700 dark:text-fuchsia-300', 'border-fuchsia-500/30 dark:border-fuchsia-500/40'),
    build('bg-teal-500 dark:bg-teal-500', 'text-white', 'bg-white/95', 'ring-teal-500/45', 'from-teal-500 to-teal-600', 'bg-teal-500', 'shadow-teal-500/25', '#14B8A6', '#FFFFFF', 'bg-teal-500', 'bg-teal-500/15 dark:bg-teal-500/20', 'text-teal-700 dark:text-teal-300', 'border-teal-500/30 dark:border-teal-500/40'),
  ];

  // Requirement: activity group always orange.
  if (norm.includes('activity') || norm.includes('活動')) {
    return build(
      'bg-orange-500 dark:bg-orange-500',
      'text-white',
      'bg-white/95',
      'ring-orange-500/50',
      'from-orange-500 to-orange-600',
      'bg-orange-500',
      'shadow-orange-500/25',
      '#F97316',
      '#FFFFFF',
      'bg-orange-500',
      'bg-orange-500/15 dark:bg-orange-500/20',
      'text-orange-700 dark:text-orange-400',
      'border-orange-500/30 dark:border-orange-500/40',
    );
  }

  if (norm.includes('teaching') || norm.includes('教學')) {
    return palettes[2];
  }

  if (norm.includes('admin') || norm.includes('行政')) {
    return palettes[3];
  }

  // Deterministic unique-ish colors for custom groups.
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash += norm.charCodeAt(i);
  }

  return palettes[hash % palettes.length];
}

export function stripHtml(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

