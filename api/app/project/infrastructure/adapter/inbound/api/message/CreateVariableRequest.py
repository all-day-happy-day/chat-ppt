from pydantic import BaseModel


class CreateVariableRequest(BaseModel):
    name: str
    value: str
