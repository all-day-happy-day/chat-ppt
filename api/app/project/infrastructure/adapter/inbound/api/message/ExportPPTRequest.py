from pydantic import BaseModel
from ulid import ULID


class ExportPPTRequest(BaseModel):
    save_ppt_filename: str
    project_id: ULID
    user_id: ULID
