import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import https from "https";
import http from "http";
import { URL } from "url";

const TEMP_DIR = path.join("/tmp", "art-style-cache");
const CACHE_DIR = path.join(process.cwd(), ".cache", "processed-images");

// 確保目錄存在
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 下載圖片
function downloadImage(
  url: string
): Promise<{ data: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === "https:" ? https : http;

    protocol
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download: ${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            data: Buffer.concat(chunks),
            contentType: res.headers["content-type"] || "image/jpeg",
          });
        });
      })
      .on("error", reject);
  });
}

// 執行 Python 處理
function processPython(
  inputPath: string,
  outputPath: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const pythonCommand = process.platform === "win32" ? "python" : "python3";
    const python = spawn(pythonCommand, [
      path.join(process.cwd(), "scripts/process_image_style.py"),
      inputPath,
      outputPath,
      "--k",
      "24",
    ]);

    let stderr = "";

    python.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("close", (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Python process failed: ${stderr}`));
      }
    });

    python.on("error", (err) => {
      reject(err);
    });
  });
}

// 生成快取鍵（基於 URL hash）
function getCacheKey(url: string): string {
  const hash = require("crypto")
    .createHash("md5")
    .update(url)
    .digest("hex");
  return hash.substring(0, 12);
}

export async function POST(request: NextRequest) {
  ensureDir(CACHE_DIR);

  try {
    const { imageUrl } = await request.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid imageUrl parameter" },
        { status: 400 }
      );
    }

    // 檢查快取
    const cacheKey = getCacheKey(imageUrl);
    const cachedPath = path.join(CACHE_DIR, `${cacheKey}.jpg`);

    if (fs.existsSync(cachedPath)) {
      const cachedData = fs.readFileSync(cachedPath);
      if (cachedData && cachedData.length > 100) {  // Ensure cached data is not too small
        return new NextResponse(new Uint8Array(cachedData), {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=2592000", // 30 天
          },
        });
      }
      // If cached data is too small, delete it and reprocess
      try {
        fs.unlinkSync(cachedPath);
      } catch (e) {
        console.warn('Failed to delete corrupted cache file:', e);
      }
    }

    // 下載原始圖片
    console.log(`Downloading image: ${imageUrl.substring(0, 50)}...`);
    const { data: imageData } = await downloadImage(imageUrl);

    ensureDir(TEMP_DIR);

    // 存檔為臨時檔案
    const inputPath = path.join(TEMP_DIR, `input_${Date.now()}.jpg`);
    const outputPath = path.join(TEMP_DIR, `output_${Date.now()}.jpg`);

    fs.writeFileSync(inputPath, imageData);

    // 執行 Python 處理
    console.log("Processing image with advanced artist style...");
    await processPython(inputPath, outputPath);

    // 讀取處理後的圖片
    if (!fs.existsSync(outputPath)) {
      throw new Error("Python processing failed - output file not created");
    }

    const processedData = fs.readFileSync(outputPath);
    
    // Validate processed data is not too small (likely incomplete)
    if (!processedData || processedData.length < 100) {
      throw new Error("Python processing produced incomplete output");
    }

    // 保存到 快取
    fs.writeFileSync(cachedPath, processedData);

    // 清理臨時檔案
    try {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch (e) {
      console.error("Failed to clean up temp files:", e);
    }

    console.log(`✓ Image processed and cached: ${cacheKey}`);

    return new NextResponse(new Uint8Array(processedData), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=2592000", // 30 天
      },
    });
  } catch (error) {
    console.error("Image processing error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Image processing failed",
      },
      { status: 500 }
    );
  }
}
