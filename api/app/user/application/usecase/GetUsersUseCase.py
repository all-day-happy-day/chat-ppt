from app.user.domain.entity import User
from app.user.domain.repository import UserRepository


class GetUsersUseCase:
    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository: UserRepository = user_repository

    def __call__(self) -> list[User]:
        return self.user_repository.get()
