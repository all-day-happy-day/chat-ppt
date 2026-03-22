from pydantic import BaseModel
from ulid import ULID

from core.auth.domain.enum import CredentialsType


class Credentials(BaseModel):
    user_id: ULID
    type: CredentialsType
    raw_value: str
