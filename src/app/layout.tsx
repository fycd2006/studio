
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/auth-context';
import { I18nProvider } from '@/lib/i18n-context';
import { PlansProvider } from '@/lib/plans-context';
import { TimerProvider } from '@/lib/timer-context';
import { AppShell } from '@/components/AppShell';
import { WhatsNewDialog } from '@/components/WhatsNewDialog';
import { MotionProvider } from '@/components/MotionProvider';
import Script from 'next/script';
import { Inter, Space_Grotesk, Fira_Code, Fira_Sans } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fira-code',
});

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-fira-sans',
});

export const metadata: Metadata = {
 title: 'NTUT CD Camp — Volunteer Studio',
 description: '匯聚創意火花，點燃營隊靈感。專業營隊教案協作平台。',
 icons: {
 icon: '/favicon.ico',
 },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF8F5' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1012' },
  ],
 width: 'device-width',
 initialScale: 1,
 viewportFit: 'cover',
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="zh-TW" suppressHydrationWarning>
 <head>
 <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
 <meta name="mobile-web-app-capable" content="yes" />
 <meta name="apple-mobile-web-app-capable" content="yes" />
 <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
 <meta name="apple-mobile-web-app-title" content="CD Camp" />
 <link rel="apple-touch-icon" href="/logo.png" />
 </head>
 <body className={`${inter.variable} ${spaceGrotesk.variable} ${firaCode.variable} ${firaSans.variable} font-body antialiased`} suppressHydrationWarning>
 <ThemeProvider>
 <FirebaseClientProvider>
 <AuthProvider>
 <I18nProvider>
 <PlansProvider>
 <TimerProvider>
 <MotionProvider>
 <AppShell>
 <WhatsNewDialog />
 {children}
 </AppShell>
 </MotionProvider>
 </TimerProvider>
 </PlansProvider>
 </I18nProvider>
 </AuthProvider>
 </FirebaseClientProvider>
 </ThemeProvider>
 <Script id="register-sw" strategy="afterInteractive" dangerouslySetInnerHTML={{
 __html: `
 if ('serviceWorker' in navigator) {
 window.addEventListener('load', function() {
 navigator.serviceWorker.register('/sw.js').then(function(registration) {
 console.log('ServiceWorker registration successful with scope: ', registration.scope);
 }, function(err) {
 console.log('ServiceWorker registration failed: ', err);
 });
 });
 }
 `
 }} />
 </body>
 </html>
 );
}
