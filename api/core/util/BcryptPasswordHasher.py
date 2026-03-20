from passlib.context import CryptContext


class BCryptPasswordHasher:
    def __init__(self, context: CryptContext = CryptContext(schemes=["bcrypt"], deprecated="auto")) -> None:
        self.context: CryptContext = context

    def hash(self, passowrd: str) -> str:
        return self.context.hash(secret=passowrd)

    def verify(self, plain: str, hashed: str) -> bool:
        return self.context.verify(secret=plain, hash=hashed)
