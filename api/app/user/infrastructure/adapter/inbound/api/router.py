from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from ulid import ULID

from app.di.application.usecase import (
    get_create_user_use_case,
    get_delete_user_use_case,
    get_get_user_use_case,
    get_get_users_use_case,
    get_update_user_use_case,
)
from app.user.application.usecase import (
    CreateUserUseCase,
    DeleteUserUseCase,
    GetUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
)
from app.user.domain.entity import User
from app.user.infrastructure.adapter.inbound.api.message import (
    CreateUserRequest,
    CreateUserResponse,
    GetUserResponse,
    UpdateUserRequest,
    UpdateUserResponse,
)

router: APIRouter = APIRouter(tags=["User"])


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=CreateUserResponse)
def create_user(
    request_model: CreateUserRequest, usecase: Annotated[CreateUserUseCase, Depends(get_create_user_use_case)]
):
    user: User = usecase(
        email=request_model.email,
        username=request_model.username,
        password=request_model.password,
        role=request_model.role,
    )
    return CreateUserResponse.from_domain_entity(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: ULID, usecase: Annotated[DeleteUserUseCase, Depends(get_delete_user_use_case)]):
    try:
        usecase(user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{user_id}", status_code=status.HTTP_200_OK, response_model=GetUserResponse)
def get_user(user_id: ULID, usecase: Annotated[GetUserUseCase, Depends(get_get_user_use_case)]):
    try:
        user: User = usecase(user_id=user_id)
        return GetUserResponse.from_domain_entity(user)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/", status_code=status.HTTP_200_OK, response_model=list[GetUserResponse])
def get_users(usecase: Annotated[GetUsersUseCase, Depends(get_get_users_use_case)]):
    users: list[User] = usecase()
    return [GetUserResponse.from_domain_entity(user) for user in users]


@router.patch("/{user_id}", status_code=status.HTTP_200_OK, response_model=UpdateUserResponse)
def patch_user(
    user_id: ULID,
    request_model: UpdateUserRequest,
    usecase: Annotated[UpdateUserUseCase, Depends(get_update_user_use_case)],
):
    try:
        update_fields: dict[str, Any] = {k: v for k, v in request_model.model_dump().items() if v is not None}
        user: User = usecase(user_id=user_id, update_fields=update_fields)
        return UpdateUserResponse.from_domain_entity(user)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
