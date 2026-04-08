from pydantic import BaseModel, ConfigDict, Field
from ulid import ULID


class BasePart(BaseModel):
    model_config = ConfigDict(validate_assignment=True)

    id: ULID = Field(default_factory=lambda: ULID())
    project_id: ULID
    container_id: ULID | None = None
    order: int = Field(ge=0, description="Index number starting from 0.")
