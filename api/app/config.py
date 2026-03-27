from pydantic import EmailStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    auth_secret_key: str = Field(alias="AUTH_SECRET_KEY")
    auth_token_life_day: int = Field(alias="AUTH_TOKEN_LIFE_DAY")
    email_sender_email: EmailStr = Field(alias="EMAIL_SENDER_EMAIL")
    email_sender_password: str = Field(alias="EMAIL_SENDER_PASSWORD")

    model_config = SettingsConfigDict(env_file=".env")


config: Config = Config()  # type: ignore[call-arg]
