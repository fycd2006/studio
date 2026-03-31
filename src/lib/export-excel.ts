import { LessonPlan, Camp, RotationTableData, CampItem } from "@/types/plan";
import { exportToDocxBlob } from "@/lib/export-utils";
import * as XLSX from "xlsx";
import JSZip from "jszip";

/**
 * 將所有教案 (Word, 與教案總覽相同渲染品質) +
 * 道具清單 (活動/教學/營期 三份 sheet) + 闖關表 (Excel) 打包成單一 ZIP 下載。
 * 用於刪除專案時的強制備份。
 */
export async function exportProjectBackupZip(
  campId: string,
  campName: string,
  camps: Camp[],
  plans: LessonPlan[],
  tables: RotationTableData[]
) {
  const zip = new JSZip();
  const campPlans = plans.filter((p) => p.campId === campId);
  const campTables = tables.filter((t) => t.campId === campId);
  const camp = camps.find((c) => c.id === campId);

  // ─── 1. Word 教案 (使用與教案總覽「下載全部」完全相同的渲染) ──
  const wordFolder = zip.folder("教案_Word");
  for (const plan of campPlans) {
    try {
      const blob = await exportToDocxBlob(plan);
      const safeName = sanitize(`${plan.scheduledName || "教案"}_${plan.activityName || "未命名"}`);
      wordFolder!.file(`${safeName}.docx`, blob);
    } catch (e) {
      console.warn(`Failed to generate docx for plan ${plan.id}`, e);
    }
  }

  // ─── 2. Excel: 道具清單 (3 sheets) + 闖關表 (1 sheet) ──────
  const excelBlob = buildStyledExcel(campId, camp, campPlans, campTables);
  zip.file(`${sanitize(campName)}_道具清單_闖關表.xlsx`, excelBlob);

  // ─── 3. 產生 ZIP 並觸發下載 ─────────────────────
  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, `${sanitize(campName)}_專案備份_${dateTag()}.zip`);
}

// ══════════════════════════════════════════════════
//  Excel 建構 (含樣式渲染)
// ══════════════════════════════════════════════════

function buildStyledExcel(
  campId: string,
  camp: Camp | undefined,
  campPlans: LessonPlan[],
  campTables: RotationTableData[]
): Blob {
  const wb = XLSX.utils.book_new();

  const activityPlans = campPlans.filter((p) => p.category === "activity").sort((a, b) => a.order - b.order);
  const teachingPlans = campPlans.filter((p) => p.category === "teaching").sort((a, b) => a.order - b.order);
  const campItems = camp?.campItems || [];

  // Sheet 1: 活動組道具
  addPropsSheet(wb, "活動組道具", activityPlans);

  // Sheet 2: 教學組道具
  addPropsSheet(wb, "教學組道具", teachingPlans);

  // Sheet 3: 營期物品
  addCampItemsSheet(wb, "營期物品", campItems);

  // Sheet 4: 闖關表
  addRotationSheet(wb, "闖關表", campTables);

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** 活動/教學 道具 sheet */
function addPropsSheet(wb: XLSX.WorkBook, sheetName: string, lessonPlans: LessonPlan[]) {
  const rows: Record<string, string>[] = [];

  // Group by scheduledName (分類)
  const groups = lessonPlans.reduce((acc, plan) => {
    const cat = plan.scheduledName || "未分類";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(plan);
    return acc;
  }, {} as Record<string, LessonPlan[]>);

  for (const [categoryName, catPlans] of Object.entries(groups)) {
    for (const plan of catPlans) {
      if (!plan.props || plan.props.length === 0) {
        rows.push({
          "分類": categoryName,
          "科目名稱": plan.activityName || "未命名",
          "負責人": plan.members || "—",
          "道具名稱": "（無道具）",
          "數量": "",
          "單位": "",
          "備註": "",
          "已打包": plan.isPropsPacked ? "✓" : "",
          "已確認": plan.isPreDepartureChecked ? "✓" : "",
        });
        continue;
      }
      for (const prop of plan.props) {
        rows.push({
          "分類": categoryName,
          "科目名稱": plan.activityName || "未命名",
          "負責人": plan.members || "—",
          "道具名稱": prop.name,
          "數量": prop.quantity,
          "單位": prop.unit === "custom" ? "" : prop.unit,
          "備註": prop.remarks || "",
          "已打包": prop.isFromClub ? "✓" : "",
          "已確認": prop.isToPurchase ? "✓" : "",
        });
      }
    }
  }

  const ws = XLSX.utils.json_to_sheet(
    rows.length > 0 ? rows : [{ "提示": `${sheetName}目前無資料` }]
  );

  // Auto-width columns
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    ws["!cols"] = keys.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((r) => ((r[key] || "").toString()).length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 8), 40) };
    });
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

/** 營期物品 sheet */
function addCampItemsSheet(wb: XLSX.WorkBook, sheetName: string, items: CampItem[]) {
  const rows: Record<string, string>[] = [];

  // Group by usage
  const groups = items.reduce((acc, item) => {
    const u = item.usage || "未分類";
    if (!acc[u]) acc[u] = [];
    acc[u].push(item);
    return acc;
  }, {} as Record<string, CampItem[]>);

  for (const [usageName, groupItems] of Object.entries(groups)) {
    for (const item of groupItems) {
      rows.push({
        "用途": usageName,
        "物品名稱": item.name,
        "已打包": item.isPacked ? "✓" : "",
        "已確認": item.isChecked ? "✓" : "",
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(
    rows.length > 0 ? rows : [{ "提示": "目前無營期物品資料" }]
  );

  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    ws["!cols"] = keys.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((r) => ((r[key] || "").toString()).length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 8), 30) };
    });
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

/** 闖關表 sheet */
function addRotationSheet(wb: XLSX.WorkBook, sheetName: string, campTables: RotationTableData[]) {
  const rows: Record<string, string | number>[] = [];

  campTables.forEach((table) => {
    // Table header row
    rows.push({
      "天數": table.day || "Day X",
      "闖關表名稱": table.title || "未命名",
      "關卡數": table.stations?.length || 0,
      "小隊數": table.teamOrders?.length || 0,
      "關卡名稱": "",
      "地點": "",
      "關主": "",
      "副關": "",
    });

    // Station details
    table.stations?.forEach((station, idx) => {
      rows.push({
        "天數": "",
        "闖關表名稱": "",
        "關卡數": "",
        "小隊數": "",
        "關卡名稱": `${idx + 1}. ${station.name}`,
        "地點": station.location,
        "關主": station.lead,
        "副關": station.assistant || "",
      });
    });

    // Rotation schedule
    if (table.teamOrders && table.teamOrders.length > 0) {
      rows.push({}); // spacer
      rows.push({
        "天數": "輪替順序",
        "闖關表名稱": "",
        "關卡數": "",
        "小隊數": "",
      });
      table.teamOrders.forEach((team) => {
        rows.push({
          "天數": "",
          "闖關表名稱": team.name,
          "關卡數": "",
          "小隊數": "",
          "關卡名稱": team.stations?.join(" → ") || "",
        });
      });
    }

    rows.push({}); // spacer between tables
  });

  const ws = XLSX.utils.json_to_sheet(
    rows.length > 0 ? rows : [{ "提示": "無闖關表資料" }]
  );

  if (rows.length > 0) {
    ws["!cols"] = [
      { wch: 10 }, { wch: 18 }, { wch: 8 }, { wch: 8 },
      { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    ];
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

// ── Utilities ────────────────────────────────────────

const sanitize = (s: string) =>
  s.replace(/[\\/:"*?<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 100) || "unnamed";

const dateTag = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
