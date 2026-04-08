from pydantic import BaseModel
from ulid import ULID


class CreateProjectRequest(BaseModel):
    template_id: ULID
    user_id: ULID
    name: str
