# syntax=docker/dockerfile:1.4

# ==============================================================================
# STAGE 1: Build Frontend Assets (Vite + React + TypeScript + Tailwind)
# ==============================================================================
FROM node:22-alpine AS assets

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy configuration and source files required for Vite build
COPY tsconfig.json vite.config.js tailwind.config.js postcss.config.js ./
COPY resources resources/
COPY public public/

# Build production bundle into public/build
RUN npm run build

# ==============================================================================
# STAGE 2: PHP Application Container (PHP 8.3 FPM Alpine)
# ==============================================================================
FROM php:8.3-fpm-alpine AS base

# Install system packages, build tools, and runtime utilities
RUN apk add --no-cache \
    bash \
    curl \
    git \
    icu-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    libxml2-dev \
    oniguruma-dev \
    sqlite-dev \
    postgresql-dev \
    su-exec \
    shadow

# Install official PHP extension installer for clean, minimal layers
ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

# Install PHP extensions required by Laravel, Inertia, Flysystem, and Permission
RUN install-php-extensions \
    bcmath \
    ctype \
    dom \
    fileinfo \
    filter \
    gd \
    intl \
    mbstring \
    opcache \
    pcntl \
    pdo_mysql \
    pdo_pgsql \
    pdo_sqlite \
    session \
    simplexml \
    tokenizer \
    xml \
    xmlwriter \
    zip \
    redis

# Install Composer from official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy custom PHP configuration
COPY docker/php/custom.ini /usr/local/etc/php/conf.d/99-custom.ini
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/99-opcache.ini

# Copy composer files first for caching
COPY composer.json composer.lock ./

# Install Composer dependencies (production only, no dev dependencies)
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-plugins \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

# Copy application source code
COPY . /var/www/html

# Copy compiled frontend assets from Stage 1
COPY --from=assets /app/public/build /var/www/html/public/build

# Finish composer autoload dump & package discovery
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# Ensure proper directories and file permissions
RUN mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    storage/app/public \
    bootstrap/cache \
    database \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Copy entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose PHP-FPM fastcgi port
EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
