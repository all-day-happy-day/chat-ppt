from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock
from typing import Dict

from pydantic import BaseModel
from ulid import ULID


class ExportRecord(BaseModel):
    export_id: str
    file_path: Path
    filename: str
    user_id: ULID
    project_id: ULID
    expires_at: datetime


class ExportRegistry:
    def __init__(self, ttl_minutes: int = 10) -> None:
        self.ttl_minutes: int = ttl_minutes
        self.lock: Lock = Lock()
        self.items: Dict[str, ExportRecord] = {}

    def put(self, file_path: Path, filename: str, user_id: ULID, project_id: ULID) -> ExportRecord:
        now: datetime = datetime.now(timezone.utc)
        export_id: str = str(ULID())
        record: ExportRecord = ExportRecord(
            export_id=export_id,
            file_path=file_path,
            filename=filename,
            user_id=user_id,
            project_id=project_id,
            expires_at=now + timedelta(minutes=self.ttl_minutes),
        )
        with self.lock:
            self.items[export_id] = record
        return record

    def pop_valid(self, export_id: str) -> ExportRecord | None:
        now: datetime = datetime.now(timezone.utc)
        with self.lock:
            record: ExportRecord | None = self.items.pop(export_id, None)
        if record is None:
            return None
        if record.expires_at < now:
            return None
        return record
