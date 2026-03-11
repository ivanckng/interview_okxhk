"""
Pydantic models for the Crypto Pulse Dashboard
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class NewsCategory(str, Enum):
    REGULATION = "regulation"
    TECHNOLOGY = "technology"
    MARKET = "market"
    SECURITY = "security"
    ADOPTION = "adoption"
    DEFI = "defi"
    NFT = "nft"


class NewsPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TrendDirection(str, Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    MIXED = "mixed"
    NEUTRAL = "neutral"


class RawNewsItem(BaseModel):
    """Raw news from data sources"""
    id: str
    title: str
    content: Optional[str] = None
    source: str
    source_url: Optional[str] = None
    publish_time: datetime
    raw_data: Optional[dict] = None


class ProcessedNews(BaseModel):
    """News processed by DeepSeek Agent"""
    id: str
    title: str
    summary: str
    source: str
    source_url: Optional[str] = None
    publish_time: datetime
    category: NewsCategory
    priority: NewsPriority
    hot_score: int = Field(ge=0, le=100)
    tags: List[str] = []
    sentiment: Optional[str] = None
    key_topics: List[str] = []
    is_relevant: bool = True  # Flag to filter out promotional/non-crypto content
    processed_at: datetime = Field(default_factory=datetime.utcnow)


class HighlightSummary(BaseModel):
    """AI-generated highlight for each page"""
    title: str
    summary: str
    trend: TrendDirection
    highlights: List[str] = []
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class PulseRecommendation(BaseModel):
    """Qwen Agent recommendation for Pulse page"""
    recommendation_type: str
    title: str
    description: str
    confidence: int = Field(ge=0, le=100)
    related_items: List[str] = []
    action_items: List[str] = []


class ChatMessage(BaseModel):
    """Chat message for AI Agent"""
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatRequest(BaseModel):
    """Chat request from frontend"""
    message: str
    context: Optional[List[ChatMessage]] = []
    page_context: Optional[str] = None  # current page: news/markets/company/crypto/pulse
    language: Optional[str] = "zh"  # zh or en


class ChatResponse(BaseModel):
    """Chat response from AI Agent"""
    message: str
    suggested_questions: List[str] = []
    related_data: Optional[dict] = None
