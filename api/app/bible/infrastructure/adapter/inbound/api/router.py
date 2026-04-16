from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.bible.application.command import GetBiblePhrasesCommand
from app.bible.application.usecase import GetBiblePhrasesUseCase, GetBooksUseCase, GetChaptersUseCase, GetVersesUseCase
from app.bible.domain.exception import PhraseNotFound, UnsupportedVersion
from app.bible.domain.valueobject import BiblePhrase
from app.bible.infrastructure.adapter.inbound.api.message import (
    GetBiblePhraseRequest,
    GetBiblePhraseResponse,
    GetBooksRequest,
    GetBooksResponse,
    GetChaptersRequest,
    GetChaptersResponse,
    GetVersesRequest,
    GetVersesResponse,
)
from app.di.application.usecase import (
    get_get_bible_phrases_use_case,
    get_get_books_use_case,
    get_get_chapters_use_case,
    get_get_verses_use_case,
)

router: APIRouter = APIRouter(tags=["Bible"])


@router.get("", status_code=status.HTTP_200_OK, response_model=list[GetBiblePhraseResponse])
def get_bible_phrases(
    request_model: list[GetBiblePhraseRequest],
    usecase: Annotated[GetBiblePhrasesUseCase, Depends(get_get_bible_phrases_use_case)],
):
    try:
        bible_phrases: list[BiblePhrase] = usecase(
            commands=[
                GetBiblePhrasesCommand(
                    version=request.version,
                    book=request.book,
                    chapter=request.chapter,
                    verse=request.verse,
                )
                for request in request_model
            ]
        )
        return [GetBiblePhraseResponse.from_model(bible_phrase) for bible_phrase in bible_phrases]

    except PhraseNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except UnsupportedVersion as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/books", status_code=status.HTTP_200_OK, response_model=GetBooksResponse)
def get_books(
    request_model: GetBooksRequest,
    usecase: Annotated[GetBooksUseCase, Depends(get_get_books_use_case)],
):
    books: list[str] = usecase(version=request_model.version)
    return GetBooksResponse(books=books)


@router.get("/chapters", status_code=status.HTTP_200_OK, response_model=GetChaptersResponse)
def get_chapters(
    request_model: GetChaptersRequest,
    usecase: Annotated[GetChaptersUseCase, Depends(get_get_chapters_use_case)],
):
    chapters: list[int] = usecase(version=request_model.version, book=request_model.book)
    return GetChaptersResponse(chapters=chapters)


@router.get("/verses", status_code=status.HTTP_200_OK, response_model=GetVersesResponse)
def get_verses(
    request_model: GetVersesRequest,
    usecase: Annotated[GetVersesUseCase, Depends(get_get_verses_use_case)],
):
    verses: list[int] = usecase(version=request_model.version, book=request_model.book, chapter=request_model.chapter)
    return GetVersesResponse(verses=verses)
