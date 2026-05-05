from datetime import datetime

from pydantic import BaseModel


class ExportPPTResponse(BaseModel):
    export_id: str
    download_url: str
    filename: str
    expires_at: datetime
