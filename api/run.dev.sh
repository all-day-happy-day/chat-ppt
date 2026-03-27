#!/bin/sh
set -e

source .venv/bin/activate

echo "Starting PostgreSQL container..."
docker start chatppt-postgres
echo "PostgreSQL container started."
echo

# echo "Running Alembic migrations..."
# alembic revision --autogenerate
# alembic upgrade head
# echo "Alembic migrations completed."
# echo

echo "Starting FastAPI server..."
uv run -m app.main