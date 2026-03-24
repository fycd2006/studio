#!/usr/bin/env python3
"""
環境檢查腳本 - 驗證圖片處理所需的依賴
"""

import sys
import subprocess

def check_python_version():
    """檢查 Python 版本"""
    version = sys.version_info
    if version.major == 3 and version.minor >= 8:
        print(f"✓ Python 版本: {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print(f"✗ Python 版本: {version.major}.{version.minor}.{version.micro} (需要 3.8+)")
        return False

def check_module(module_name):
    """檢查 Python 模組"""
    try:
        __import__(module_name)
        print(f"✓ {module_name} 已安裝")
        return True
    except ImportError:
        print(f"✗ {module_name} 未安裝")
        return False

def main():
    print("=" * 50)
    print("進階藝術風格圖片處理 - 環境檢查")
    print("=" * 50)
    print()
    
    all_ok = True
    
    # 檢查 Python 版本
    if not check_python_version():
        all_ok = False
    print()
    
    # 檢查必要模組
    print("檢查必要模組:")
    required_modules = ["cv2", "numpy", "argparse"]
    
    for module in required_modules:
        if not check_module(module):
            all_ok = False
    
    print()
    
    if all_ok:
        print("✓ 所有檢查通過！環境已準備就緒。")
        print()
        print("安裝完整指南:")
        print("  pip install opencv-python opencv-contrib-python numpy")
        return 0
    else:
        print("✗ 某些檢查未通過，請安裝缺失的依賴:")
        print()
        print("  pip install opencv-python opencv-contrib-python numpy")
        print()
        return 1

if __name__ == "__main__":
    sys.exit(main())
