# https://music.bugs.co.kr/search/track?q=주안에있는나에게&target=TRACK_ONLY&flac_only=false&sort=A

import re
import unicodedata

import requests
from bs4 import BeautifulSoup, Tag


def preprocess_string_for_comparison(s: str) -> str:
    s = s.strip()
    s = re.sub(pattern=r"\s+", repl=" ", string=s)
    s = s.casefold()
    s = unicodedata.normalize("NFKC", s)
    return s


def preprocess_string_for_comparison_only_with_alphabets(s: str) -> str:
    s = preprocess_string_for_comparison(s=s)
    s = re.sub(pattern=r"[^a-zA-Z0-9\s]", repl="", string=s)
    return s


if __name__ == "__main__":
    target_title: str = "시온의 영광이 빛나는 아침"
    target_artist: str | None = None

    print(f"Target Title & Artist: [{target_title}] by [{target_artist}]\n")

    found: bool = False
    failed_to_find_flag: bool = False
    page_num: int = 1
    page_thresholded: bool = False
    while True:
        print(f"Searching... [Page {page_num}]\n")

        url: str = (
            f"https://music.bugs.co.kr/search/track?q={target_title}&"
            f"target=TRACK_ONLY&flac_only=false&sort=A&page={page_num}"
        )

        response: requests.Response = requests.get(url=url)
        if response.status_code != 200:
            raise requests.HTTPError(f"Failed to fetch the page: {url}")

        soup: BeautifulSoup = BeautifulSoup(markup=response.text, features="html.parser")

        track_list: Tag | None = soup.find(name="table", class_="list trackList")
        assert track_list is not None

        songs: list[Tag] = track_list.find_all(name="tr", trackid=True)

        for song in songs:
            # Title
            title_outer: Tag | None = song.find(name="p", class_="title")
            assert title_outer is not None
            title: str = str(title_outer.text).strip()

            # Artist
            artist_outer: Tag | None = song.find(name="p", class_="artist")
            assert artist_outer is not None
            artist: str
            if artist_outer.find(name="a") is not None:
                artist_inner: Tag | None = artist_outer.find(name="a")
                assert artist_inner is not None
                artist = str(artist_inner.text).strip()
            else:
                artist = str(artist_outer.text).strip()

            _artist: str = artist
            if target_artist is not None:
                if page_num == 10:
                    if not page_thresholded:
                        page_thresholded = True
                        page_num = 1
                        continue
                    else:
                        failed_to_find_flag = True
                        break

                if not page_thresholded:
                    target_artist = preprocess_string_for_comparison(s=target_artist)
                    artist = preprocess_string_for_comparison(s=artist)
                else:
                    target_artist = preprocess_string_for_comparison_only_with_alphabets(s=target_artist)
                    artist = preprocess_string_for_comparison_only_with_alphabets(s=artist)

                # Equal
                if target_artist == artist:
                    pass
                elif not target_artist or not artist:
                    continue
                elif target_artist in artist:
                    pass
                elif artist in target_artist:
                    pass
                else:
                    continue

            found = True
            print("Found!")
            print(f"Title & Artist: [{title}] by [{_artist}]\n")

            # Lyrics
            lyrics: Tag | None = song.find(name="a", class_="trackInfo")
            assert lyrics is not None
            lyrics_url: str = str(lyrics["href"])
            lyrics_response: requests.Response = requests.get(url=lyrics_url)
            lyrics_soup: BeautifulSoup = BeautifulSoup(markup=lyrics_response.text, features="html.parser")
            lyrics_container: Tag | None = lyrics_soup.find(name="div", class_="lyricsContainer")
            assert lyrics_container is not None
            lyrics_only: Tag | None = lyrics_container.find(name="xmp")
            assert lyrics_only is not None
            lyrics_text: str = str(lyrics_only.text)
            lyrics_text_parsed: list[str] = lyrics_text.split("\n")

            for i, lyric_line in enumerate(lyrics_text_parsed):
                lyrics_text_parsed[i] = lyric_line.strip()
            lyrics_text_parsed = [lyric_line for lyric_line in lyrics_text_parsed if lyric_line]

            print(*lyrics_text_parsed, sep="\n")

            break

        if found:
            break
        else:
            if failed_to_find_flag:
                break
            page_num += 1

    if not found:
        print("No song found.")
