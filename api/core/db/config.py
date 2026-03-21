from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class DBConfig(BaseSettings):
    host: str = Field(alias="DB_HOST")
    port: int = Field(alias="DB_PORT")
    name: str = Field(alias="DB_NAME")
    username: str = Field(alias="DB_USERNAME")
    password: str = Field(alias="DB_PASSWORD")
    pool_size: int = Field(alias="DB_POOL_SIZE")
    max_overflow: int = Field(alias="DB_MAX_OVERFLOW")

    model_config = SettingsConfigDict(env_file=".env.db")

    @property
    def url(self) -> str:
        # return f"mysql+pymysql://{self.username}:{self.password}@{self.host}:{self.port}/{self.name}"
        return f"postgresql+psycopg2://{self.username}:{self.password}@{self.host}:{self.port}/{self.name}"


db_config: DBConfig = DBConfig()  # type: ignore[call-arg]
