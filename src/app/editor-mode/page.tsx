"use client";

import React from "react";
import { Bold, Check, Italic, List, Pencil, Quote, Underline } from "lucide-react";

const SCROLL_DELTA_THRESHOLD = 6;

function clampScrollY(y: number) {
  if (typeof window === "undefined") return 0;
  const maxScrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(Math.max(y, 0), maxScrollable);
}

export default function EditorModePage() {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isFabVisible, setIsFabVisible] = React.useState(true);

  const lastScrollYRef = React.useRef(0);
  const tickingRef = React.useRef(false);

  React.useEffect(() => {
    lastScrollYRef.current = clampScrollY(window.scrollY || 0);

    const updateFabVisibility = () => {
      tickingRef.current = false;

      if (isEditing) return;

      const currentY = clampScrollY(window.scrollY || 0);
      const previousY = lastScrollYRef.current;
      const delta = currentY - previousY;

      if (currentY <= 12) {
        setIsFabVisible(true);
        lastScrollYRef.current = currentY;
        return;
      }

      if (Math.abs(delta) >= SCROLL_DELTA_THRESHOLD) {
        if (delta > 0) {
          setIsFabVisible(false);
        } else {
          setIsFabVisible(true);
        }
        lastScrollYRef.current = currentY;
      }
    };

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(updateFabVisibility);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [isEditing]);

  React.useEffect(() => {
    if (isEditing) {
      setIsFabVisible(false);
      return;
    }

    lastScrollYRef.current = clampScrollY(window.scrollY || 0);
    setIsFabVisible(true);
  }, [isEditing]);

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#151821]">
      <header
        className={[
          "fixed inset-x-0 top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-xl",
          "transition-transform duration-300 ease-out",
          isEditing ? "translate-y-0" : "-translate-y-full",
        ].join(" ")}
      >
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            aria-label="完成編輯"
            onClick={() => setIsEditing(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <Check className="h-5 w-5" />
          </button>

          <p className="text-sm font-semibold tracking-wide text-stone-700">編輯模式</p>

          <div className="w-9" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_15px_40px_rgba(0,0,0,0.06)] sm:p-8">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[34px] font-semibold leading-tight text-stone-900 sm:text-[42px]">Cymbal Cleaning Company</h1>
              <p className="mt-2 text-sm text-stone-500">Product strategy draft · Collaboration enabled</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {isEditing ? "Editing" : "Read-only"}
            </span>
          </div>

          <article className="space-y-8 text-[18px] leading-8 text-stone-800">
            <section>
              <h2 className="mb-3 inline-block bg-amber-100 px-2 py-1 text-xl font-semibold">Product development plan</h2>
              <ul className="list-disc space-y-1 pl-6">
                <li>Use eco-friendly ingredients</li>
                <li>Include scented and unscented products</li>
                <li>Have a variety of bottle shapes and sizes</li>
                <li>Use approved shades of green for bottles and caps</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">Marketing plan</h2>
              <ul className="list-disc space-y-1 pl-6">
                <li><span className="bg-amber-100 px-1">Launch a new webpage</span>, develop social media promotions and email campaigns</li>
                <li>Paid media investment</li>
                <li>Build partnerships with other companies in the eco-friendly space</li>
                <li>Partner with eco-friendly focused influencers</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">Distribution plan</h2>
              <ul className="list-disc space-y-1 pl-6">
                <li>Online via company website</li>
                <li>Independent, local boutiques</li>
                <li>Seasonal events</li>
              </ul>
            </section>

            {Array.from({ length: 10 }).map((_, i) => (
              <section key={i}>
                <h3 className="mb-2 text-lg font-semibold text-stone-900">Extended notes {i + 1}</h3>
                <p>
                  This block is intentionally long to produce enough vertical content for scroll-direction detection.
                  While in read-only mode, scrolling down hides the floating action button and scrolling up reveals it.
                  When switched to editing mode, the FAB stays hidden and top/bottom toolbars remain visible.
                </p>
              </section>
            ))}
          </article>
        </section>
      </main>

      <footer
        className={[
          "fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/80 bg-white/95 backdrop-blur-xl",
          "transition-transform duration-300 ease-out",
          isEditing ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-center gap-3 px-4 pb-[max(env(safe-area-inset-bottom),0px)] sm:px-6">
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700 transition-colors hover:bg-stone-200">
            <Bold className="h-4 w-4" />
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700 transition-colors hover:bg-stone-200">
            <Italic className="h-4 w-4" />
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700 transition-colors hover:bg-stone-200">
            <Underline className="h-4 w-4" />
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700 transition-colors hover:bg-stone-200">
            <List className="h-4 w-4" />
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700 transition-colors hover:bg-stone-200">
            <Quote className="h-4 w-4" />
          </button>
        </div>
      </footer>

      <button
        type="button"
        aria-label="進入編輯模式"
        onClick={() => setIsEditing(true)}
        className={[
          "fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] right-4 z-50",
          "inline-flex h-14 w-14 items-center justify-center rounded-2xl",
          "bg-[#bcd1f7] text-[#1847a5] shadow-[0_8px_24px_rgba(24,71,165,0.25)]",
          "transition-all duration-300 ease-out",
          "hover:scale-105 active:scale-95",
          !isEditing && isFabVisible ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-6 opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <Pencil className="h-5 w-5" />
      </button>
    </div>
  );
}
