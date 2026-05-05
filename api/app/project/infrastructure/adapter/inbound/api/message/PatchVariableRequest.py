from pydantic import BaseModel


class PatchVariableRequest(BaseModel):
    value: str | None = None
