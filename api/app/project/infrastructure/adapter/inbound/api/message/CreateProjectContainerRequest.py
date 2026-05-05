from pydantic import BaseModel
from ulid import ULID


class CreateProjectContainerRequest(BaseModel):
    project_id: ULID
    container_name: str
