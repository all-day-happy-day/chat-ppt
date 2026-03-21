#!/bin/sh
set -e

source .venv/bin/activate

echo "Starting MySQL container..."
docker start chat-ppt-mysql
echo "MySQL container started."
echo

# echo "Running Alembic migrations..."
# alembic revision --autogenerate
# alembic upgrade head
# echo "Alembic migrations completed."
# echo

echo "Starting FastAPI server..."
uv run -m app.main