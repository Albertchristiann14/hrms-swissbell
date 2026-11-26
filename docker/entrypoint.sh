#!/bin/bash
set -e

# ==============================================================================
# ENTRYPOINT SCRIPT FOR LARAVEL DOCKER CONTAINER
# Handles directory creation, permissions, migrations, and optimization
# ==============================================================================

echo "==> [Entrypoint] Starting Laravel initialization..."

# 1. Ensure required storage & cache subdirectories exist
mkdir -p /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/logs \
         /var/www/html/storage/app/public \
         /var/www/html/bootstrap/cache \
         /var/www/html/database

# 2. SQLite Database initialization if SQLite connection is configured
DB_CONN=$(grep -E '^DB_CONNECTION=' /var/www/html/.env 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo "sqlite")
if [ "$DB_CONN" = "sqlite" ] || [ -z "$DB_CONN" ]; then
    if [ ! -f /var/www/html/database/database.sqlite ]; then
        echo "==> [Entrypoint] Creating database/database.sqlite..."
        touch /var/www/html/database/database.sqlite
    fi
fi

# 3. Fix permissions for storage, cache, and database directories
chown -R www-data:www-data /var/www/html/storage \
                           /var/www/html/bootstrap/cache \
                           /var/www/html/database
chmod -R 775 /var/www/html/storage \
             /var/www/html/bootstrap/cache \
             /var/www/html/database

if [ -f /var/www/html/database/database.sqlite ]; then
    chmod 664 /var/www/html/database/database.sqlite
fi

# 4. Generate App Key if missing
if [ -f /var/www/html/.env ]; then
    if ! grep -q "^APP_KEY=base64:" /var/www/html/.env; then
        echo "==> [Entrypoint] Generating Laravel APP_KEY..."
        php artisan key:generate --force --no-interaction
    fi
fi

# 5. Create storage symlink if not already created
if [ ! -L /var/www/html/public/storage ]; then
    echo "==> [Entrypoint] Creating public storage symlink..."
    php artisan storage:link --no-interaction || true
fi

# 6. Run database migrations if AUTO_MIGRATE is true
if [ "${AUTO_MIGRATE:-false}" = "true" ]; then
    echo "==> [Entrypoint] Running database migrations..."
    php artisan migrate --force --no-interaction || {
        echo "==> [Entrypoint] Warning: Migration failed. Check database credentials or network."
    }
fi

# 7. Optimize Laravel cache in production
if [ "${AUTO_OPTIMIZE:-false}" = "true" ] && [ "${APP_ENV:-production}" = "production" ]; then
    echo "==> [Entrypoint] Caching config, routes, and views for production..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

echo "==> [Entrypoint] Initialization complete. Executing: $@"

exec "$@"
