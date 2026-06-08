# Chat PPT

A web application for creating and exporting PowerPoint presentations from reusable templates. Designed for worship teams and church use cases — integrates Bible verses and song lyrics directly into slides.

## Features

- **Template management** — upload `.pptx` files and define reusable slide layouts
- **Project-based workflow** — organize slides into projects with multiple containers and content parts
- **Bible integration** — look up and embed Bible verses by book, chapter, and verse
- **Song lyrics** — search and scrape lyrics, split into parts, and map to slide layouts
- **Variable substitution** — define project-level variables and inject them into slide placeholders
- **Authentication** — JWT-based sign-up/sign-in with user profile management
- **i18n** — English and Korean UI support

## Tech Stack

| Layer          | Technology                                               |
| -------------- | -------------------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend        | Python 3.13, FastAPI, SQLAlchemy 2, Alembic              |
| Database       | PostgreSQL (via Docker)                                  |
| PPT generation | python-pptx                                              |
| Auth           | JWT (python-jose, bcrypt)                                |

## Project Structure

```
chat-ppt/
├── api/        # FastAPI backend (Clean Architecture)
└── console/    # React frontend (Vite)
```

### Backend (`api/`)

Each domain module follows a 3-tier layout: `domain/` → `application/` → `infrastructure/`.

```
api/app/
├── auth/         # Sign-up, sign-in, JWT
├── user/         # User management
├── powerpoint/   # Template upload & layout management
├── project/      # Projects, containers, and parts
├── song/         # Song/lyrics with web scraping
├── bible/        # Bible verse lookup
└── shared/       # Cross-module domain models
```

### Frontend (`console/`)

```
console/src/
├── App/
│   ├── authenticated/    # Protected pages (projects, songs, templates, settings)
│   └── unauthenticated/  # Public pages (sign-in, sign-up)
├── api/                  # HTTP client + React Query hooks
├── components/           # Shared UI components
├── domain/               # TypeScript domain models
└── i18n/                 # English and Korean dictionaries
```

## Getting Started

### Prerequisites

- Node.js + pnpm
- Python 3.13 + uv
- Docker (for PostgreSQL)

### Backend

Configure `api/.env`:

| Variable                  | Description                            |
| ------------------------- | -------------------------------------- |
| `AUTH_SECRET_KEY`         | JWT signing secret                     |
| `AUTH_TOKEN_LIFE_DAY`     | Token lifetime in days                 |
| `BIBLE_DATA_PATH`         | Path to the Bible JSON data file       |
| `PPT_UPLOAD_DIRECTORY`    | Directory for uploaded template files  |
| `PPT_SAVE_TEMP_DIRECTORY` | Temporary directory for PPT generation |
| `EMAIL_SENDER_EMAIL`      | Email address for notifications        |
| `EMAIL_SENDER_PASSWORD`   | Email app password for notifications   |

Configure `api/.env.db`:

| Variable       | Description                     |
| -------------- | ------------------------------- |
| `DB_HOST`      | PostgreSQL host                 |
| `DB_PORT`      | PostgreSQL port                 |
| `DB_NAME`      | Database name                   |
| `DB_USERNAME`  | Database user                   |
| `DB_PASSWORD`  | Database password               |
| `DB_POOL_SIZE` | SQLAlchemy connection pool size |
