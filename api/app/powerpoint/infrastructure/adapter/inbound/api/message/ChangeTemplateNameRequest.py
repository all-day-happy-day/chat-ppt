from pydantic import BaseModel


class ChangeTemplateNameRequest(BaseModel):
    new_name: str
