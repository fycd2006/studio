"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Pencil, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { renderCanvasJsonToPng } from "@/lib/canvas-image";
import { parseEditorHtml } from "@/lib/editor-html";
import { useTranslation } from "@/lib/i18n-context";
import { stripHtml } from "@/lib/utils";
import type { Group, LessonPlan } from "@/types/plan";

const actionClass =
  "inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function EditorContent({ value }: { value?: string }) {
  const html = useMemo(() => {
    if (!value?.trim() || typeof document === "undefined") return "";
    const cleaned = parseEditorHtml(value);
    for (const link of Array.from(cleaned.content.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    return cleaned.content.textContent?.trim() || cleaned.content.querySelector("img, table, hr")
      ? cleaned.innerHTML
      : "";
  }, [value]);

  return html ? (
    <div
      className="prose prose-sm max-w-none overflow-x-auto break-words whitespace-pre-wrap dark:prose-invert [&_img]:max-w-full [&_table]:w-auto [&_td]:border [&_td]:px-2 [&_th]:border [&_th]:px-2 [&>:first-child]:mt-0 [&>:last-child]:mb-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : <p className="text-sm text-muted-foreground">—</p>;
}

function Blueprint({ data, height, image, title, loading, error }: {
  data?: string | null;
  height?: number | null;
  image?: string | null;
  title: string;
  loading: string;
  error: string;
}) {
  const [rendered, setRendered] = useState<{ data: string; image: string } | null>(null);
  const storedImage = image && /^(?:https?:\/\/|\/(?!\/)|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(image) ? image : "";

  useEffect(() => {
    if (storedImage || !data) return;
    let cancelled = false;
    renderCanvasJsonToPng(data, height || 500, true).then(
      (image) => { if (!cancelled) setRendered({ data, image }); },
      () => { if (!cancelled) setRendered({ data, image: "" }); },
    );
    return () => { cancelled = true; };
  }, [data, height, storedImage]);

  const src = storedImage || (rendered?.data === data ? rendered?.image : "");
  return (
    <Section title={title}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={title} className="max-h-[65dvh] max-w-full rounded-md border bg-[#f3f2ef] object-contain dark:bg-stone-700" />
      ) : <p className="text-sm text-muted-foreground" role="status">{rendered?.data === data ? error : loading}</p>}
    </Section>
  );
}

export function PlanPreviewDialog({ plan, group, onClose, trigger }: {
  plan: LessonPlan;
  group?: Group;
  onClose: () => void;
  trigger: HTMLButtonElement | null;
}) {
  const { t, language } = useTranslation();
  const heading = useRef<HTMLHeadingElement>(null);
  const zh = language === "zh";
  const title = stripHtml(plan.activityName) || (zh ? "未命名教案" : "Untitled lesson plan");
  const editLabel = zh ? "前往編輯頁" : "Open editor";
  const closeLabel = zh ? "關閉" : "Close";
  const groupLabel = (zh ? group?.nameZh : group?.nameEn) || (zh ? group?.nameEn : group?.nameZh)
    || (plan.category === "teaching" ? t("TEACHING_MODULE") : zh ? "活動組" : "Activity group");
  const details = [
    [zh ? "組別" : "Group", groupLabel],
    [t("TIME_WINDOW"), stripHtml(plan.time)],
    [t("VENUE"), stripHtml(plan.location)],
    [t("CASE_PERSONNEL"), stripHtml(plan.members)],
    [t("LEAD"), stripHtml(plan.leadMember)],
    [t("ASSISTANT"), stripHtml(plan.assistantMember)],
  ];
  const sections = [
    [t("MISSION_OBJ"), plan.purpose],
    [t("PROCEDURES"), plan.process],
    [t("VISUAL_BLUEPRINT"), plan.content],
    [t("OPENING_CLOSING"), plan.openingClosingRemarks],
  ];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            heading.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (trigger?.isConnected) trigger.focus({ preventScroll: true });
          }}
          className="fixed left-1/2 top-1/2 z-[101] flex max-h-[min(48rem,calc(100dvh_-_1rem))] w-[calc(100%_-_1rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-xl sm:w-[calc(100%_-_2rem)]"
        >
          <header className="flex shrink-0 items-start justify-between gap-2 border-b px-4 py-3 sm:px-6">
            <DialogTitle ref={heading} tabIndex={-1} className="min-w-0 pt-1.5 text-lg font-semibold leading-snug break-words focus:outline-none sm:text-xl">
              {title}
            </DialogTitle>
            <div className="flex shrink-0 gap-1">
              <Link
                href={`/plans/${encodeURIComponent(plan.id)}`}
                prefetch={false}
                aria-label={editLabel}
                title={editLabel}
                className={actionClass}
              >
                <Pencil aria-hidden className="size-4" />
              </Link>
              <DialogClose aria-label={closeLabel} title={closeLabel} className={actionClass}>
                <X aria-hidden className="size-5" />
              </DialogClose>
            </div>
          </header>
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6" data-testid="plan-preview-body">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border bg-muted/40 p-3 text-sm sm:grid-cols-3 sm:p-4">
              {details.map(([label, value], index) => (index < 4 || value) && (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {sections.map(([label, value]) => (
              <Section key={label} title={label}><EditorContent value={value} /></Section>
            ))}
            {plan.divisionOfLabor && (
              <Section title={zh ? "分工" : "Division of work"}><EditorContent value={plan.divisionOfLabor} /></Section>
            )}
            {(plan.canvasImage || plan.canvasData) && (
              <Blueprint data={plan.canvasData} height={plan.canvasHeight} image={plan.canvasImage}
                title={zh ? "手繪藍圖" : "Hand-drawn blueprint"}
                loading={zh ? "載入藍圖中…" : "Loading blueprint…"}
                error={zh ? "無法顯示手繪藍圖" : "Could not display the blueprint"} />
            )}
            <Section title={t("PROPS_LIST")}>
              {plan.props?.length ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-3 py-2">{t("PROP_NAME")}</th>
                        <th scope="col" className="px-3 py-2">{zh ? "數量" : "Quantity"}</th>
                        <th scope="col" className="px-3 py-2">{zh ? "單位" : "Unit"}</th>
                        <th scope="col" className="px-3 py-2">{t("OP_REMARKS")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.props.map((prop) => (
                        <tr key={prop.id} className="border-t align-top">
                          <td className="whitespace-pre-wrap break-words px-3 py-2">{stripHtml(prop.name) || "—"}</td>
                          <td className="px-3 py-2 tabular-nums">{prop.quantity || "—"}</td>
                          <td className="px-3 py-2">{prop.unit || "—"}</td>
                          <td className="whitespace-pre-wrap break-words px-3 py-2">{stripHtml(prop.remarks) || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-muted-foreground">{t("EMPTY_SLOT")}</p>}
            </Section>
            <Section title={t("OP_REMARKS")}><EditorContent value={plan.remarks} /></Section>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
