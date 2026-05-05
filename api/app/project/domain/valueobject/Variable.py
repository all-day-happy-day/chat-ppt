from pydantic import BaseModel
from ulid import ULID


class Variable(BaseModel):
    project_id: ULID
    name: str
    value: str
