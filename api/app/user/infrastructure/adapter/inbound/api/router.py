from fastapi import APIRouter, HTTPException, status
from ulid import ULID

from app.user.application.usecase import (
    CreateUserUseCase,
    DeleteUserUseCase,
    GetUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
)
from app.user.domain.entity import User
from app.user.infrastructure.adapter.inbound.api.message import CreateUserRequest, CreateUserResponse, GetUserResponse

router: APIRouter = APIRouter(tags=["User"])


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=CreateUserResponse)
def create_user(request: CreateUserRequest, usecase: CreateUserUseCase):
    user: User = usecase(email=request.email, username=request.username, password=request.password, role=request.role)
    return CreateUserResponse.from_domain_entity(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: ULID, usecase: DeleteUserUseCase):
    try:
        usecase(user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{user_id}", status_code=status.HTTP_200_OK, response_model=GetUserResponse)
def get_user(user_id: ULID, usecase: GetUserUseCase):
    try:
        user: User = usecase(user_id=user_id)
        return GetUserResponse.from_domain_entity(user)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/", status_code=status.HTTP_200_OK, response_model=list[GetUserResponse])
def get_users(usecase: GetUsersUseCase):
    users: list[User] = usecase()
    return [GetUserResponse.from_domain_entity(user) for user in users]
