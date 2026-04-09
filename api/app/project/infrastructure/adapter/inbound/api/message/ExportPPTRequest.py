from pydantic import BaseModel


class ExportPPTRequest(BaseModel):
    save_path: str
