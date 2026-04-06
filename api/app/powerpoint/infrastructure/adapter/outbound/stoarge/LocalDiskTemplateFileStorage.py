from pathlib import Path

from app.config import config
from app.powerpoint.domain.exception import FileNotPPTX
from app.powerpoint.domain.port.outbound import TemplateFileStoragePort


class LocalDiskTemplateFileStorage(TemplateFileStoragePort):
    def __init__(self) -> None:
        self.upload_directory: Path = Path(config.ppt_upload_directory)
        self.upload_directory.mkdir(parents=True, exist_ok=True)

    def save(self, data: bytes, filename: str) -> Path:
        if Path(filename).suffix != ".pptx":
            raise FileNotPPTX(f"File is not a PowerPoint file: {filename}")
        des: Path = self.upload_directory / filename
        des.write_bytes(data=data)
        return des
