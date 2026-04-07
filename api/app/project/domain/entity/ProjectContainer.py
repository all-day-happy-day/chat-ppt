from datetime import datetime

from pydantic import Field
from ulid import ULID

from .PartsMixin import PartsMixin


class ProjectContainer(PartsMixin):
    id: ULID = Field(default_factory=lambda: ULID())
    project_id: ULID
    container_name: str
    created_at: datetime
    updated_at: datetime
    completed: bool
