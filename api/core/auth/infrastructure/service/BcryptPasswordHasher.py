from passlib.context import CryptContext

from core.auth.domain.service import PasswordHasher


class BcryptPasswordHasher(PasswordHasher):
    def __init__(self, context: CryptContext = CryptContext(schemes=["bcrypt"], deprecated="auto")) -> None:
        self.context: CryptContext = context

    def hash(self, password: str) -> str:
        return self.context.hash(secret=password)

    def verify(self, plain: str, hashed: str) -> bool:
        return self.context.verify(secret=plain, hash=hashed)
