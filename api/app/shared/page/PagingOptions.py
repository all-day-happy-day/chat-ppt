from pydantic import BaseModel, Field


class PagingOptions(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=10, ge=1)
