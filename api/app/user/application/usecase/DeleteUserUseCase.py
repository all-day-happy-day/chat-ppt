from ulid import ULID

from app.user.domain.repository import UserRepository
from core.auth.domain.repository import CredentialsRepository, PrincipalRepository


class DeleteUserUseCase:
    def __init__(
        self,
        user_repository: UserRepository,
        credentials_repository: CredentialsRepository,
        principal_repository: PrincipalRepository,
    ) -> None:
        self.user_repository: UserRepository = user_repository
        self.credentials_repository: CredentialsRepository = credentials_repository
        self.principal_repository: PrincipalRepository = principal_repository

    def __call__(self, user_id: ULID) -> None:
        self.credentials_repository.delete_by_user_id(user_id)
        self.principal_repository.delete_by_user_id(user_id)
        return self.user_repository.delete_by_id(user_id)
