"""
BWEnews (方程式新闻) WebSocket and RSS data source
Documentation: https://telegra.ph/BWEnews-API-documentation-06-19
"""
import asyncio
import json
import websockets
import httpx
from typing import List, Optional, Callable
from datetime import datetime
from models.schemas import RawNewsItem
import xml.etree.ElementTree as ET


class BWEnewsClient:
    """
    BWEnews Client
    - WebSocket for real-time exclusive news
    - RSS for exchange announcements
    """
    
    WEBSOCKET_URL = "wss://bwenews-api.bwe-ws.com/ws"
    RSS_URL = "https://rss-public.bwe-ws.com/"
    
    def __init__(self):
        self.ws_connection = None
        self.message_handler: Optional[Callable[[RawNewsItem], None]] = None
        self._running = False
        
    def set_message_handler(self, handler: Callable[[RawNewsItem], None]):
        """Set callback for new messages"""
        self.message_handler = handler
    
    async def connect_websocket(self):
        """Connect to BWEnews WebSocket"""
        print("🔌 Connecting to BWEnews WebSocket...")
        try:
            self.ws_connection = await websockets.connect(
                self.WEBSOCKET_URL,
                ping_interval=20,
                ping_timeout=10
            )
            print("✅ Connected to BWEnews WebSocket")
            self._running = True
            
            # Start listening
            await self._listen()
        except Exception as e:
            print(f"❌ WebSocket connection failed: {e}")
            self._running = False
            raise
    
    async def _listen(self):
        """Listen for WebSocket messages"""
        while self._running and self.ws_connection:
            try:
                message = await self.ws_connection.recv()
                await self._handle_message(message)
            except websockets.exceptions.ConnectionClosed:
                print("⚠️ WebSocket connection closed, reconnecting...")
                await asyncio.sleep(5)
                await self.connect_websocket()
            except Exception as e:
                print(f"⚠️ Error handling message: {e}")
    
    async def _handle_message(self, message: str):
        """Parse and handle WebSocket message"""
        try:
            data = json.loads(message)
            
            # Check if it's a ping message
            if data.get("type") == "ping":
                await self._send_pong()
                return
            
            # Parse news item
            # BWEnews fields: source_name, news_title, coins_included, url, timestamp
            news_item = RawNewsItem(
                id=f"bwe-{data.get('timestamp', datetime.utcnow().timestamp())}",
                title=data.get("news_title", "Unknown"),
                content=None,  # WebSocket only provides title, need to fetch full content
                source=data.get("source_name", "BWEnews"),
                source_url=data.get("url"),
                publish_time=datetime.utcnow(),  # Use current time if timestamp format unknown
                raw_data=data
            )
            
            if self.message_handler:
                self.message_handler(news_item)
            
            print(f"📰 New BWEnews: {news_item.title[:50]}...")
            
        except json.JSONDecodeError:
            print(f"⚠️ Invalid JSON received: {message[:100]}")
        except Exception as e:
            print(f"⚠️ Error parsing message: {e}")
    
    async def _send_pong(self):
        """Send pong response to keep connection alive"""
        if self.ws_connection:
            try:
                await self.ws_connection.send(json.dumps({"type": "pong"}))
            except Exception as e:
                print(f"⚠️ Failed to send pong: {e}")
    
    async def disconnect(self):
        """Disconnect WebSocket"""
        self._running = False
        if self.ws_connection:
            await self.ws_connection.close()
            print("🔌 Disconnected from BWEnews WebSocket")
    
    async def fetch_rss(self) -> List[RawNewsItem]:
        """
        Fetch news from RSS feed
        RSS contains exchange announcements
        """
        print("📡 Fetching BWEnews RSS...")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.RSS_URL, timeout=30.0)
                response.raise_for_status()
                
                # Parse XML
                root = ET.fromstring(response.text)
                
                # RSS 2.0 format: <rss><channel><item>...</item></channel></rss>
                items = []
                channel = root.find("channel")
                if channel is None:
                    return items
                
                for item in channel.findall("item"):
                    title = item.find("title")
                    link = item.find("link")
                    pub_date = item.find("pubDate")
                    description = item.find("description")
                    
                    # Parse publication date
                    publish_time = datetime.utcnow()
                    if pub_date is not None and pub_date.text:
                        try:
                            # RSS date format: Mon, 01 Jan 2024 00:00:00 GMT
                            publish_time = datetime.strptime(
                                pub_date.text.replace(" GMT", "").replace(" UTC", ""),
                                "%a, %d %b %Y %H:%M:%S"
                            )
                        except ValueError:
                            pass
                    
                    news_item = RawNewsItem(
                        id=f"bwe-rss-{hash(title.text if title is not None else '')}",
                        title=title.text if title is not None else "Unknown",
                        content=description.text if description is not None else None,
                        source="BWEnews RSS",
                        source_url=link.text if link is not None else None,
                        publish_time=publish_time,
                        raw_data={
                            "rss_title": title.text if title is not None else None,
                            "rss_link": link.text if link is not None else None,
                        }
                    )
                    items.append(news_item)
                
                print(f"✅ Fetched {len(items)} items from BWEnews RSS")
                return items
                
        except Exception as e:
            print(f"❌ Failed to fetch RSS: {e}")
            return []


# Global client instance
bwenews_client = BWEnewsClient()


def get_bwenews_client() -> BWEnewsClient:
    """Get BWEnews client instance"""
    return bwenews_client
