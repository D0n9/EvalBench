#!/bin/bash
set -e

echo "Waiting for database to be ready..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "Database is ready!"

echo "Creating database tables..."
python -c "from app.models import Base; from app.db.session import engine; Base.metadata.create_all(engine)"

echo "Creating initial data (admin user)..."
python scripts/init_db.py

echo "Seeding builtin datasets..."
python scripts/seed_datasets.py

echo "Starting application..."
exec "$@"
