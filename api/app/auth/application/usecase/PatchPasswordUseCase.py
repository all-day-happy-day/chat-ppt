from ulid import ULID

from app.user.domain.entity import User
from app.user.domain.repository import UserRepository
from core.auth.domain.entity import Principal
from core.auth.domain.repository import PrincipalRepository
from core.auth.domain.service import PasswordHasher


class PatchPasswordUseCase:
    def __init__(
        self,
        principal_repository: PrincipalRepository,
        user_repository: UserRepository,
        password_hasher: PasswordHasher,
    ) -> None:
        self.principal_repository: PrincipalRepository = principal_repository
        self.user_repository: UserRepository = user_repository
        self.password_hasher: PasswordHasher = password_hasher

    def __call__(self, user_id: ULID, password: str) -> User:
        principal_entity: Principal = self.principal_repository.get_by_user_id(user_id=user_id)
        principal_entity.password_hashed = self.password_hasher.hash(password=password)
        self.principal_repository.patch(principal=principal_entity)
        return self.user_repository.get_by_id(user_id=user_id)
