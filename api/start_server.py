#!/usr/bin/env python3
"""
Startup script for Zero Day Attack Detection API
"""
import uvicorn
import sys
import os
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from config import Config

def main():
    """Start the FastAPI server"""
    print("🚀 Starting Zero Day Attack Detection API...")
    print(f"📍 Host: {Config.API_HOST}")
    print(f"🔌 Port: {Config.API_PORT}")
    print(f"🔄 Reload: {Config.API_RELOAD}")
    print(f"📁 Models Directory: {Config.MODELS_DIR}")
    print(f"📤 Upload Directory: {Config.UPLOAD_DIR}")
    print("=" * 50)
    
    try:
        uvicorn.run(
            "main:app",
            host=Config.API_HOST,
            port=Config.API_PORT,
            reload=Config.API_RELOAD,
            log_level=Config.LOG_LEVEL.lower()
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
