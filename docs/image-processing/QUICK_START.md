# 🎨 進階藝術風格系統 - 快速安裝指南

## 🚀 一鍵部署

### 第  1 步：安裝 Python 依賴

```bash
# 在專案根目錄執行
pip install opencv-python opencv-contrib-python numpy
```

### 第 2 步：驗證環境

```bash
# 執行環境檢查
python3 scripts/check_env.py
```

### 第 3 步：啟動開發伺服器

```bash
# Next.js 將自動使用新的 API 端點
npm run dev
```

## ✅ 成功標誌

1. 訪問 **http://localhost:3000/login** - 背景圖片應顯示為**藝術風格**
2. 訪問 **http://localhost:3000** - 首頁 HeroCarousel 圖片應為**色塊藝術風格**
3. 瀏覽器控制檯無紅色錯誤

## 🎯 效果預覽

### 原始照片
- Unsplash 自然風光照片

### 轉換後
- 24 色精選色塊
- 手繪輪廓線條
- 動漫/插畫筆觸感
- 保留面部特徵和光影

## ⚙️ 配置調整

### 更改色塊數量

編輯 `src/app/api/process-hero-image/route.ts`：

```typescript
// 改這行
"--k", "24"  // 24 = 精緻（推薦）

// 試試這些值
"--k", "16"  // 更多色塊感
"--k", "32"  // 更多細節
```

### 快取時間

編輯 `src/app/api/process-hero-image/route.ts`：

```typescript
"Cache-Control": "public, max-age=2592000"  // 30 天
// 改成
"Cache-Control": "public, max-age=86400"    // 1 天
```

## 🐛 常見問題

### Q: 圖片沒有顯示藝術風格？
A: 
1. 檢查瀏覽器控制檯是否有錯誤
2. 執行 `python3 scripts/check_env.py`
3. 確保已安裝 `opencv-contrib-python`（含 ximgproc 模組）

### Q: 處理很慢？
A:
- 首次訪問較慢（1-3 秒），之後使用快取
- 確保網絡連接良好
- 檢查伺服器 CPU 使用率

### Q: 快取大小會不會太大？
A:
- 每張圖 100-300 KB
- 15 張圖 ≈ 1.5-4.5 MB
- 30 天快取 ≈ 150 MB（可管理）

## 📊 系統架構

```
登陸頁面 / 首頁
    ↓
獲取圖片 URL (api/hero-images)
    ↓
批次處理 (api/process-hero-image)
    ↓
Python 處理 (process_image_style.py)
    ↓
快取保存 (.cache/processed-images/)
    ↓
返回給前端
```

## 📝 文件清單

| 文件 | 用途 |
|------|------|
| `scripts/process_image_style.py` | 核心 Python 處理引擎 |
| `scripts/check_env.py` | 環境檢查工具 |
| `src/app/api/process-hero-image/route.ts` | API 端點（後端） |
| `src/components/HeroCarousel.tsx` | 首頁圖片處理（前端） |
| `src/app/login/page.tsx` | 登陸頁面圖片處理（前端） |
| `IMAGE_PROCESSING_README.md` | 詳細技術文檔 |

## 🎬 演示

```bash
# 手動測試 Python 處理
python3 scripts/process_image_style.py input.jpg output.jpg --k 24

# 測試 API
curl -X POST http://localhost:3000/api/process-hero-image \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://images.unsplash.com/..."}'
```

## 🔗 相關文檔

- [詳細技術文檔](IMAGE_PROCESSING_README.md)
- [OpenCV 官方文檔](https://docs.opencv.org/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**狀態**: ✅ 準備就緒  
**上次更新**: 2026-03-24  
**維護者**: Jeffrey Chen
