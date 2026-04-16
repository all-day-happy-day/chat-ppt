from pydantic import BaseModel


class GetVersionsResponse(BaseModel):
    versions: dict[str, str]
