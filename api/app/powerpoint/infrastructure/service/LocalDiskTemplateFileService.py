from datetime import datetime, timezone
from pathlib import Path

from ulid import ULID

from app.config import config
from app.powerpoint.domain.entity import TemplateFile
from app.powerpoint.domain.exception import FileNotPPTX
from app.powerpoint.domain.service import TemplateFileStorageService


class LocalDiskTemplateFileService(TemplateFileStorageService):
    def __init__(self) -> None:
        self.upload_directory: Path = Path(config.ppt_upload_directory)

    def save(self, data: bytes, filename: str, user_id: ULID) -> Path:
        self.upload_directory = self.upload_directory / str(user_id)
        self.upload_directory.mkdir(parents=True, exist_ok=True)
        if Path(filename).suffix != ".pptx":
            raise FileNotPPTX(f"File is not a PowerPoint file: {filename}")
        des: Path = self.upload_directory / filename
        des = des.with_stem(f"{filename}_{datetime.now(timezone.utc).isoformat()}")
        des.write_bytes(data=data)
        return des

    def delete(self, template_file: TemplateFile) -> None:
        Path(template_file.path).unlink(missing_ok=True)
