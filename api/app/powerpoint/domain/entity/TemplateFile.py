from pydantic import BaseModel
from ulid import ULID


class TemplateFile(BaseModel):
    template_id: ULID
    user_id: ULID
    path: str
    size: int
