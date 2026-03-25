from typing import Literal

from pydantic import BaseModel


class VerifyTokenResponse(BaseModel):
    principal: str
    token_type: Literal["bearer"] = "bearer"
