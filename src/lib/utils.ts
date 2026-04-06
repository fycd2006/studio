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
  ) => ({
    // New fields
    bg,
    text: lightText,
    dot,
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
    build('bg-indigo-500 dark:bg-indigo-500', 'text-white', 'bg-white/95', 'ring-indigo-500/45', 'from-indigo-500 to-indigo-600', 'bg-indigo-500', 'shadow-indigo-500/25', '#6366F1', '#FFFFFF'),
    build('bg-rose-500 dark:bg-rose-500', 'text-white', 'bg-white/95', 'ring-rose-500/45', 'from-rose-500 to-rose-600', 'bg-rose-500', 'shadow-rose-500/25', '#F43F5E', '#FFFFFF'),
    build('bg-emerald-500 dark:bg-emerald-500', 'text-white', 'bg-white/95', 'ring-emerald-500/45', 'from-emerald-500 to-emerald-600', 'bg-emerald-500', 'shadow-emerald-500/25', '#10B981', '#FFFFFF'),
    build('bg-blue-500 dark:bg-blue-500', 'text-white', 'bg-white/95', 'ring-blue-500/45', 'from-blue-500 to-blue-600', 'bg-blue-500', 'shadow-blue-500/25', '#3B82F6', '#FFFFFF'),
    build('bg-violet-500 dark:bg-violet-500', 'text-white', 'bg-white/95', 'ring-violet-500/45', 'from-violet-500 to-violet-600', 'bg-violet-500', 'shadow-violet-500/25', '#8B5CF6', '#FFFFFF'),
    build('bg-cyan-500 dark:bg-cyan-500', 'text-white', 'bg-white/95', 'ring-cyan-500/45', 'from-cyan-500 to-cyan-600', 'bg-cyan-500', 'shadow-cyan-500/25', '#06B6D4', '#FFFFFF'),
    build('bg-fuchsia-500 dark:bg-fuchsia-500', 'text-white', 'bg-white/95', 'ring-fuchsia-500/45', 'from-fuchsia-500 to-fuchsia-600', 'bg-fuchsia-500', 'shadow-fuchsia-500/25', '#D946EF', '#FFFFFF'),
    build('bg-teal-500 dark:bg-teal-500', 'text-white', 'bg-white/95', 'ring-teal-500/45', 'from-teal-500 to-teal-600', 'bg-teal-500', 'shadow-teal-500/25', '#14B8A6', '#FFFFFF'),
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
