# Crypto Pulse Backend

AI-powered backend for Crypto Pulse Dashboard using FastAPI.

## Architecture

```
backend/
├── agents/           # AI Agents
│   ├── deepseek_agent.py   # Data processing & Highlights
│   └── (qwen_agent.py)     # Pulse recommendations (TODO)
│   └── (gemini_agent.py)   # Chatbot (TODO)
├── data_sources/     # Data connectors
│   └── bwenews.py          # 方程式新闻 WebSocket/RSS
├── models/           # Pydantic schemas
│   └── schemas.py
├── utils/            # Utilities
│   └── cache.py            # In-memory cache with TTL
├── main.py           # FastAPI app entry
├── requirements.txt
└── .env.example      # Environment template
```

## Quick Start

### 1. Setup Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure API Keys

```bash
cp .env.example .env
# Edit .env and add your keys:
# - DEEPSEEK_API_KEY (required)
# - QWEN_API_KEY (optional)
# - GEMINI_API_KEY (optional)
```

### 3. Run Server

```bash
./start.sh
# Or manually:
python main.py
```

Server will start at `http://localhost:8000`

## API Endpoints

### Health
- `GET /` - API info
- `GET /health` - Health check & cache stats

### News
- `GET /api/news` - Get processed news
  - Query: `?category=regulation&priority=high&limit=20`
- `GET /api/news/trending` - Get trending news
- `POST /api/news/refresh` - Manually refresh from BWEnews

### Highlights (AI Generated)
- `GET /api/highlights/news` - News page summary
- `GET /api/highlights/markets` - Markets page summary
- `GET /api/highlights/company` - Company page summary
- `GET /api/highlights/crypto` - Crypto page summary

### Chat
- `POST /api/chat` - Gemini chatbot (TODO)

### WebSocket
- `WS /ws/news` - Real-time news updates

## Data Sources

| Source | Type | Cost | Status |
|--------|------|------|--------|
| BWEnews (方程式新闻) | WebSocket + RSS | Free | ✅ Implemented |
| FRED API | Economic data | Free | 📝 Planned |
| Binance API | Exchange announcements | Free | 📝 Planned |
| CoinGecko API | Price data | Free tier | 📝 Planned |

## AI Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| DeepSeek | deepseek-chat | News processing, Highlights |
| Qwen | (TODO) | Pulse page recommendations |
| Gemini | (TODO) | Chatbot |

## Cache Strategy

- **Memory Cache**: In-memory with TTL (30min for news, 5min for prices)
- **File Persistence**: Auto-save to `cache/` directory on shutdown
- **Auto-cleanup**: Expired entries cleaned on access

## Development

```bash
# Run with auto-reload
uvicorn main:app --reload

# Check code
python -m py_compile main.py

# Test API
curl http://localhost:8000/health
```
