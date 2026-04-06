from pydantic import BaseModel
from ulid import ULID


class ChangeTemplateNameRequest(BaseModel):
    template_id: ULID
    new_name: str
