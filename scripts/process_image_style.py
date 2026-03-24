#!/usr/bin/env python3
"""
Advanced Artist Style Image Processing
将照片转换为精緻的動漫/插畫筆觸感
使用邊緣保留平滑、色塊量化與線條提取
"""

import sys
import cv2
import numpy as np
import os
import argparse


def advanced_artist_style(image_path: str, k: int = 24) -> np.ndarray:
    """
    高級藝術風格轉換：結合邊緣保留平滑、精細色塊量化與線條提取，
    打造精緻的動漫/插畫筆觸感。
    
    Args:
        image_path: 輸入圖片路徑
        k: K-means 聚類的顏色數量 (預設 24)
    
    Returns:
        處理後的圖像 numpy array
    """
    
    # 載入圖片
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"無法載入圖片: {image_path}")
    
    # 步驟1：多尺度結構引導平滑 (使用邊緣保留濾波器)
    # 這能抹除皮膚和衣服的細微雜訊，但保留頭髮和五官的強烈邊緣，看起來像畫筆塗抹
    smoothed = cv2.ximgproc.dtFilter(image, image, 60, 0.4)
    
    # 步驟2：層次風格分離與色塊化 (使用 K-means 聚類)
    # 將顏色簡化為 K 種，打造插畫的「上色感」
    z = smoothed.reshape((-1, 3))
    z = np.float32(z)
    
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    # K=24 能保留足夠的光影層次，同時帶有色塊感
    ret, label, center = cv2.kmeans(z, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    
    center = np.uint8(center)
    res = center[label.flatten()]
    quantized = res.reshape((smoothed.shape))
    
    # 步驟3：特徵線條提取 (模擬手繪輪廓線)
    # 將原圖轉灰階並尋找邊緣，讓五官和髮絲的輪廓更明顯
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 5)
    edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 9)
    
    # 把黑白邊緣圖轉回彩色通道 (膨脹邊緣線條以提高可見性)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    edges = cv2.dilate(edges, kernel, iterations=1)
    edges_color = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    
    # 步驟4：合成最終畫風
    # 將抽取的輪廓線條與色塊化後的圖像疊加
    final_artwork = cv2.bitwise_and(quantized, edges_color)
    
    return final_artwork


def process_image(input_path: str, output_path: str, k: int = 24) -> bool:
    """
    處理單張圖片並保存
    
    Args:
        input_path: 輸入圖片路徑
        output_path: 輸出圖片路徑
        k: 顏色聚類數量
    
    Returns:
        是否成功
    """
    try:
        result = advanced_artist_style(input_path, k=k)
        success = cv2.imwrite(output_path, result)
        if not success:
            raise Exception(f"無法將圖片寫入: {output_path}")
        return True
    except Exception as e:
        print(f"錯誤: {str(e)}", file=sys.stderr)
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="進階藝術風格圖像轉換")
    parser.add_argument("input", help="輸入圖片路徑")
    parser.add_argument("output", help="輸出圖片路徑")
    parser.add_argument("--k", type=int, default=24, help="K-means 聚類顏色數 (預設: 24)")
    
    args = parser.parse_args()
    
    if process_image(args.input, args.output, k=args.k):
        print(f"✓ 成功轉換: {args.output}")
        sys.exit(0)
    else:
        print(f"✗ 轉換失敗", file=sys.stderr)
        sys.exit(1)
