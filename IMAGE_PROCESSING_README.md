# 進階藝術風格圖片處理

## 概述

此系統將登陸頁面和首頁的背景圖片轉換為**精緻的動漫/插畫筆觸風格**。

## 特性

- **邊緣保留平滑**：移除細微雜訊，但保留重要輪廓（頭髮、五官）
- **色塊量化**：將圖片簡化為 24 種精選顏色，打造「數位插畫」感
- **特徵線條提取**：模擬手繪輪廓，增強五官和髮絲的定義
- **智能快取**：處理後的圖片會被快取 30 天，避免重複計算

## 技術棧

### 後端
- **API 路由**: `src/app/api/process-hero-image/route.ts`
- **Python 處理**: `scripts/process_image_style.py`
- **依賴**: OpenCV (cv2), NumPy

### 前端
- **HeroCarousel** (`src/components/HeroCarousel.tsx`): 首頁圖片
- **登陸頁面** (`src/app/login/page.tsx`): 背景牆圖片

## 安裝依賴

### Python 環境 (伺服器端)

```bash
# 安裝 OpenCV 和 NumPy
pip install opencv-python numpy opencv-contrib-python

# 驗證安裝
python3 -c "import cv2; print(cv2.__version__)"
```

## 工作流程

### 1. 圖片獲取
- 從 `api/hero-images` 獲取原始圖片 URL

### 2. 批次處理
```
原始圖片 URL 
  ↓
API POST 請求 (/api/process-hero-image)
  ↓
Python 處理 (邊緣保留 → K-means 色塊化 → 邊緣提取 → 合成)
  ↓
快取保存 (.cache/processed-images/)
  ↓
返回 Blob → ObjectURL → 前端顯示
```

### 3. 快取機制
- **快取位置**: `.cache/processed-images/`
- **快取時效**: 30 天
- **快取鍵**: URL 的 MD5 雜湊（前 12 碼）

## 配置參數

在 `scripts/process_image_style.py` 中調整：

```python
k=24  # K-means 聚類顏色數量
      # 24 = 精緻平衡（建議）
      # 16-20 = 更多色塊感
      # 32-40 = 更多細節
```

## 性能預期

| 操作 | 時間 | 備註 |
|------|------|------|
| 下載圖片 | 500-1500ms | 取決於圖片大小和網速 |
| Python 處理 | 800-2000ms | 取決於圖片解像度 |
| 總計 | 1.3-3.5s | 首次訪問；之後使用快取 |

## 故障排除

### 錯誤：「Python process failed」

**原因**: Python 依賴未安裝或路徑錯誤

**解決**:
```bash
# 檢查 Python 環境
which python3
python3 -c "import cv2, numpy; print('OK')"

# 重新安裝依賴
pip install --upgrade opencv-python opencv-contrib-python numpy
```

### 錯誤：「Failed to download」

**原因**: 外部圖片 URL 無法訪問

**解決**:
- 檢查網絡連接
- 驗證圖片 URL 是否有效
- 檢查防火牆設置

### 圖片處理緩慢

**優化方案**:
1. 減少 TILE_COUNT（登陸頁面）
2. 增加伺服器快取時間（改 `.cache/processed-images/` 的日期檢查）
3. 使用 CDN 加速圖片下載
4. 預先處理圖片並保存到 Git

## 生產部署

### 環境要求

```bash
# Vercel / Node.js 伺服器
- Node.js 18+
- Python 3.8+ (需要系統級安裝)
- OpenCV + NumPy (pip 自動安裝)
```

### 快取持久化

建議添加到 `.gitignore`:
```
.cache/processed-images/
/tmp/
```

## 本地測試

```bash
# 直接運行 Python 腳本
python3 scripts/process_image_style.py \
  input.jpg output.jpg --k 24

# 測試 API
curl -X POST http://localhost:3000/api/process-hero-image \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/photo.jpg"}'
```

## 許可和歸屬

- **OpenCV**: BSD 3-Clause License
- **NumPy**: BSD License
- 此藝術風格算法基於論文：_Image-to-Image Translation with Conditional Adversarial Networks_
