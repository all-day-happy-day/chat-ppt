from pathlib import Path

from pydantic import BaseModel


class ExportPPTResponse(BaseModel):
    path: Path
