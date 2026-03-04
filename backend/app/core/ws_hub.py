from collections import defaultdict

from fastapi import WebSocket


class WebSocketHub:
    def __init__(self) -> None:
        self._channels: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, channel_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._channels[channel_id].add(websocket)

    def disconnect(self, channel_id: str, websocket: WebSocket) -> None:
        self._channels[channel_id].discard(websocket)

    async def broadcast(self, channel_id: str, payload: dict) -> None:
        for ws in list(self._channels[channel_id]):
            await ws.send_json(payload)
