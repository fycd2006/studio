import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['var(--font-inter)', 'Inter', 'sans-serif'],
        headline: ['var(--font-space-grotesk)', 'Space Grotesk', 'sans-serif'],
        comic: ['Comic Neue', 'cursive'],
        code: ['var(--font-fira-code)', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // SaaS Brand Colors (Navy & Gold -> Updated to Warm Agency)
        brand: {
          navy: '#0B132B',
          navyLight: '#1C2541',
          gold: '#C5A059',
          goldLight: '#D4AF37',
          goldDark: '#B8860B',
          warmBg: '#FAF9F6',
          warmAccent: '#F97316',
          warmHighlight: '#FACC15',
          warmText: '#292524',
        },
        // Fluid Glass Architectural Design Tokens
        canvas: {
          dark: '#0B1012',
          surface: '#15181A',
          elevated: '#1C2023',
          light: '#F4F5F6',
        },
        fg: {
          primary: '#FFFFFF',
          secondary: '#8E9498',
          muted: '#5A6065',
          inverse: '#111315',
        },
        hairline: {
          light: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.22)',
          dark: 'rgba(0, 0, 0, 0.08)',
        },
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        technical: '0.08em',
        widest: '0.15em',
      },
      backdropBlur: {
        capsule: '18px',
        drawer: '30px',
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'gentle-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '800': '800ms',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px hsl(var(--primary) / 0.1)' },
          '50%': { boxShadow: '0 0 25px hsl(var(--primary) / 0.2)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;