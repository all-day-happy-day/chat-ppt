from core.auth.domain.entity import Principal
from core.auth.domain.repository import PrincipalRepository
from core.auth.domain.service import PasswordHasher


class VerifyPasswordUseCase:
    def __init__(self, principal_repository: PrincipalRepository, password_hasher: PasswordHasher) -> None:
        self.principal_repository: PrincipalRepository = principal_repository
        self.password_hasher: PasswordHasher = password_hasher

    def __call__(self, principal: str, password: str) -> bool:
        principal_entity: Principal = self.principal_repository.get_by_principal(principal=principal)
        return principal_entity.verify_password(plain=password, hasher=self.password_hasher)
