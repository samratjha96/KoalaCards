#!/bin/sh
set -e

echo "=== Starting KoalaCards Application ==="

# Wait for the database to be ready
echo "Waiting for PostgreSQL..."
until nc -z db 5432; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "PostgreSQL is up - continuing"

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Check if AWS credentials are mounted
echo "=== CHECKING AWS CREDENTIALS ==="
if [ -d "$HOME/.aws" ]; then
  echo "AWS credentials directory found at $HOME/.aws"
else
  echo "WARNING: AWS credentials directory not found at $HOME/.aws"
fi

# Print AWS env vars for debugging
echo "=== CHECKING AWS ENV VARS ==="
echo "AWS_REGION: $AWS_REGION"
echo "AWS_S3_BUCKET_NAME: $AWS_S3_BUCKET_NAME"

# Start the application (defined in the `command` field in `docker-compose.yml`)
echo "=== STARTING APPLICATION ==="
exec "$@"
