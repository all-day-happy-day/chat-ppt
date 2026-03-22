from enum import StrEnum


class CredentialsType(StrEnum):
    SHORT_LIVED = "SHORT_LIVED"
    LONG_LIVED = "LONG_LIVED"
