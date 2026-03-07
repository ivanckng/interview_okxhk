#!/bin/bash

# Crypto Pulse Backend Startup Script

echo "🚀 Starting Crypto Pulse Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check environment file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your API keys!"
fi

# Create cache directory
mkdir -p cache

# Start server
echo "🔥 Starting FastAPI server on http://localhost:8000"
python main.py
