from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.bible.application.usecase import GetBiblePhraseUseCase
from app.bible.domain.exception import PhraseNotFound, UnsupportedVersion
from app.bible.domain.valueobject import BiblePhrase
from app.bible.infrastructure.adapter.api.message import GetBiblePhraseRequest, GetBiblePhraseResponse
from app.di.application.usecase import get_get_bible_phrase_use_case

router: APIRouter = APIRouter(tags=["Bible"])


@router.get("/", status_code=status.HTTP_200_OK, response_model=GetBiblePhraseResponse)
def get_bible_phrase(
    request_model: GetBiblePhraseRequest,
    usecase: Annotated[GetBiblePhraseUseCase, Depends(get_get_bible_phrase_use_case)],
):
    try:
        bible_phrase: BiblePhrase = usecase(
            version=request_model.version,
            book=request_model.book,
            chapter=request_model.chapter,
            verse=request_model.verse,
        )
        return GetBiblePhraseResponse.from_model(bible_phrase)

    except PhraseNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except UnsupportedVersion as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
