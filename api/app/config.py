from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    auth_secret_key: str
    auth_token_life_day: int

    model_config = SettingsConfigDict(env_file=".env")
