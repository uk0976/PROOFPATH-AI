import asyncio
import json
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class SSEManager:
    def __init__(self):
        # Maps session_id to list of asyncio.Queue
        self._listeners: Dict[str, List[asyncio.Queue]] = {}

    def subscribe(self, session_id: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        if session_id not in self._listeners:
            self._listeners[session_id] = []
        self._listeners[session_id].append(queue)
        logger.debug(f"Client subscribed to SSE for session {session_id}. Total listeners: {len(self._listeners[session_id])}")
        return queue

    def unsubscribe(self, session_id: str, queue: asyncio.Queue) -> None:
        if session_id in self._listeners:
            try:
                self._listeners[session_id].remove(queue)
                if not self._listeners[session_id]:
                    del self._listeners[session_id]
            except ValueError:
                pass

    async def broadcast(self, session_id: str, stage: str, progress: int, message: str, data: Any = None, event_type: str = "progress") -> None:
        if session_id not in self._listeners:
            return

        payload = {
            "session_id": session_id,
            "stage": stage,
            "progress": progress,
            "message": message,
            "data": data or {},
        }

        # Put message in all listening queues
        for queue in list(self._listeners[session_id]):
            await queue.put((event_type, payload))


sse_manager = SSEManager()
