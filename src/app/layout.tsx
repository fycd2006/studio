
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/auth-context';
import { I18nProvider } from '@/lib/i18n-context';
import { AppShell } from '@/components/AppShell';
import Script from 'next/script';

export const metadata: Metadata = {
 title: 'NTUT CD Camp — Volunteer Studio',
 description: '匯聚創意火花，點燃營隊靈感。專業營隊教案協作平台。',
 icons: {
 icon: '/favicon.ico',
 },
};

export const viewport: Viewport = {
 themeColor: [
 { media: '(prefers-color-scheme: light)', color: '#FBF9F6' },
 { media: '(prefers-color-scheme: dark)', color: '#121212' },
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
 <link rel="preconnect" href="https://fonts.googleapis.com" />
 <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
 <link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@300;400;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
 </head>
 <body className="font-body antialiased" suppressHydrationWarning>
 <ThemeProvider>
 <FirebaseClientProvider>
 <AuthProvider>
 <I18nProvider>
 <AppShell>
 {children}
 </AppShell>
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
