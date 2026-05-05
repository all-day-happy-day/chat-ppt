from typing import Self

from pydantic import BaseModel

from app.project.domain.valueobject import Variable


class BaseVariableResponse(BaseModel):
    name: str
    value: str

    @classmethod
    def from_domain_entity(cls, variable: Variable) -> Self:
        return cls(
            name=variable.name,
            value=variable.value,
        )
