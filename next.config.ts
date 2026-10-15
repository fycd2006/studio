
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "0.0.0",
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || `${Date.now()}`,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },

  /**
   * /lesson-plans/<組別> → /plans?group=<組別>
   *
   * 這裡刻意用 config 的 redirects() 而不是 Server Component 裡的 redirect()。
   * 原本 src/app/lesson-plans/[slug]/page.tsx 用 next/navigation 的 redirect()，
   * 但那在**初次文件請求**時回的是 HTTP 200 + RSC payload（裡面夾一段
   * NEXT_REDIRECT;replace;...;307;），真正執行跳轉的是**客戶端 router** ——
   * 沒有 Location header。實測（E2E 連跑 12 次）有 6 次客戶端沒有執行跳轉，
   * 使用者就被留在 /lesson-plans/<組別> 看一片**完全空白**的頁面
   * （document.body.innerText 長度 0，沒有任何錯誤或 overlay）。
   * 因為那個 page 本身只負責 redirect、不 render 任何東西，跳轉沒發生就等於白屏。
   *
   * redirects() 是在請求進到 React 之前就發出真正的 3xx，不依賴 hydration。
   * 對應測試：cypress/e2e/access_page/route-guard.cy.ts
   */
  async redirects() {
    return [
      {
        source: '/lesson-plans/:slug',
        destination: '/plans?group=:slug',
        permanent: false,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
