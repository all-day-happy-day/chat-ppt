from pydantic import BaseModel

from app.user.domain.enum import Role


class UpdateUserRoleRequest(BaseModel):
    role: Role
