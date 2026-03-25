from pydantic import BaseModel


class VerifyPasswordRequest(BaseModel):
    principal: str
    password: str
