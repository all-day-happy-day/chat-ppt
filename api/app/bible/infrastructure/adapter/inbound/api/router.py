from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.bible.application.command import GetBiblePhrasesCommand
from app.bible.application.usecase import GetBiblePhrasesUseCase, GetBooksUseCase, GetChaptersUseCase, GetVersesUseCase
from app.bible.domain.exception import PhraseNotFound, UnsupportedVersion
from app.bible.domain.service import ParseVerseQueryService as P
from app.bible.domain.valueobject import BiblePhrase, BibleVerseQuery
from app.bible.infrastructure.adapter.inbound.api.message import (
    GetBiblePhraseRequest,
    GetBiblePhraseResponse,
    GetBooksResponse,
    GetChaptersResponse,
    GetVersesResponse,
    GetVersionsResponse,
)
from app.di.application.usecase import (
    get_get_bible_phrases_use_case,
    get_get_books_use_case,
    get_get_chapters_use_case,
    get_get_verses_use_case,
)
from app.di.domain.service import get_parse_verse_query_service
from app.shared.bible.domain.enum import AvailableBibleVersions

router: APIRouter = APIRouter(tags=["Bible"])


@router.get("", status_code=status.HTTP_200_OK, response_model=list[GetBiblePhraseResponse])
def get_bible_phrases(
    request_model: list[GetBiblePhraseRequest],
    usecase: Annotated[GetBiblePhrasesUseCase, Depends(get_get_bible_phrases_use_case)],
    parse_verse_query_service: Annotated[P.ParseVerseQueryService, Depends(get_parse_verse_query_service)],
):
    try:
        queries: list[BibleVerseQuery] = []
        for request in request_model:
            queries.extend(parse_verse_query_service.parse(verse_query=request))

        bible_phrases: list[BiblePhrase] = usecase(
            commands=[
                GetBiblePhrasesCommand(
                    version=query.version,
                    book=query.book,
                    chapter=int(query.chapter),
                    verse=int(query.verse),
                )
                for query in queries
            ]
        )
        return [GetBiblePhraseResponse.from_model(bible_phrase) for bible_phrase in bible_phrases]

    except PhraseNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except UnsupportedVersion as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/books/{version}", status_code=status.HTTP_200_OK, response_model=GetBooksResponse)
def get_books(
    version: AvailableBibleVersions,
    usecase: Annotated[GetBooksUseCase, Depends(get_get_books_use_case)],
):
    books: list[str] = usecase(version=version)
    return GetBooksResponse(books=books)


@router.get("/chapters/{version}/{book}", status_code=status.HTTP_200_OK, response_model=GetChaptersResponse)
def get_chapters(
    version: AvailableBibleVersions,
    book: str,
    usecase: Annotated[GetChaptersUseCase, Depends(get_get_chapters_use_case)],
):
    chapters: list[int] = usecase(version=version, book=book)
    return GetChaptersResponse(chapters=chapters)


@router.get("/verses/{version}/{book}/{chapter}", status_code=status.HTTP_200_OK, response_model=GetVersesResponse)
def get_verses(
    version: AvailableBibleVersions,
    book: str,
    chapter: int,
    usecase: Annotated[GetVersesUseCase, Depends(get_get_verses_use_case)],
):
    verses: list[int] = usecase(version=version, book=book, chapter=chapter)
    return GetVersesResponse(verses=verses)


@router.get("/versions", status_code=status.HTTP_200_OK, response_model=GetVersionsResponse)
def get_versions():
    return GetVersionsResponse(versions=AvailableBibleVersions.__members__)
