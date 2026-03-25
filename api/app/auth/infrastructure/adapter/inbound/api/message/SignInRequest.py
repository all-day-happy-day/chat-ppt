from pydantic import BaseModel


class SignInRequest(BaseModel):
    principal: str
    secret: str
