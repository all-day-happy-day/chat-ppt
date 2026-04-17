from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.bible.application.usecase import GetBiblePhrasesUseCase, GetBooksUseCase, GetChaptersUseCase, GetVersesUseCase
from app.bible.domain.exception import (
    MultipleNumbers,
    MultipleSeparators,
    PhraseNotFound,
    UnsupportedLetter,
    UnsupportedVersion,
)
from app.bible.domain.valueobject import BiblePhrase
from app.bible.infrastructure.adapter.inbound.api.message import (
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
from app.shared.bible.domain.enum import AvailableBibleVersions

router: APIRouter = APIRouter(tags=["Bible"])


@router.get(
    "/{version}/{book}/{chapter}/{verse}", status_code=status.HTTP_200_OK, response_model=list[GetBiblePhraseResponse]
)
def get_bibile_phrases(
    version: AvailableBibleVersions,
    book: str,
    chapter: str,
    verse: str,
    usecase: Annotated[GetBiblePhrasesUseCase, Depends(get_get_bible_phrases_use_case)],
):
    try:
        bible_phrases: list[BiblePhrase] = usecase(
            version=version,
            book=book,
            chapter=chapter,
            verse=verse,
        )
        return [GetBiblePhraseResponse.from_model(bible_phrase) for bible_phrase in bible_phrases]

    except PhraseNotFound as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnsupportedVersion as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except MultipleNumbers as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except MultipleSeparators as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except UnsupportedLetter as e:
        print(e)
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
