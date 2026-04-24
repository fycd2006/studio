import { NextResponse } from 'next/server';
import fallbackImagesData from '@/data/fallback-images.json';

export const revalidate = 2700; // Cache for 45 minutes

function getFallbackImages(): string[] {
  try {
    return fallbackImagesData?.images || [];
  } catch (err) {
    console.error('Failed to load fallback images:', err);
    return [];
  }
}

export async function GET() {
  try {
    const albumUrl = process.env.TARGET_ALBUM_ID;
    if (!albumUrl) {
      console.warn('TARGET_ALBUM_ID is not defined, using fallback images');
      const backup = getFallbackImages();
      if (backup.length > 0) {
        // Shuffle backup
        const shuffled = [...backup];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return NextResponse.json({ images: shuffled.slice(0, 15) });
      }
      throw new Error('TARGET_ALBUM_ID is not defined and no fallback available');
    }

    // Google Photos Library API severely restricted non-app-created album reads via readonly scope. 
    // We now use a lightning-fast, highly reliable HTML scraper to bypass OAuth 403s on Public Share Links.
    const res = await fetch(albumUrl, { redirect: 'follow' });
    if (!res.ok) {
      throw new Error(`Failed to fetch public album HTML: ${res.statusText}`);
    }
    const html = await res.text();
    if (!html || !html.trim()) {
      throw new Error('Empty response body from album URL');
    }

    const regex = /\["(https:\/\/lh3\.googleusercontent\.com\/pw\/[a-zA-Z0-9\-_]+)"/g;
    let match;
    const links = new Set<string>();

    while ((match = regex.exec(html)) !== null) {
      links.add(match[1]);
    }

    if (links.size === 0) {
      throw new Error('No photos matched in the scraped URL. The link might be invalid or not public.');
    }

    // Format all to High-Res 1080p center cropped
    const images = Array.from(links).map((baseUrl) => `${baseUrl}=w1920-h1080-c`);

    // Deterministic shuffle logic over the cached duration (changes every 45 mins)
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }

    // Limit payload to 15 random memory highlights
    return NextResponse.json({ images: images.slice(0, 15) });
  } catch (error) {
    console.error('Hero Image API Error (Scraper):', error);
    const backup = getFallbackImages();
    if (backup.length > 0) {
       const shuffled = [...backup];
       for (let i = shuffled.length - 1; i > 0; i--) {
         const j = Math.floor(Math.random() * (i + 1));
         [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
       }
       return NextResponse.json({ images: shuffled.slice(0, 15) });
    }
    return NextResponse.json({ error: 'Failed to extract images' }, { status: 500 });
  }
}
