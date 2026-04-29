from pydantic import BaseModel


class PatchPasswordRequest(BaseModel):
    password: str
