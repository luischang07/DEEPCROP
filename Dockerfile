
FROM php:8.4-fpm

RUN apt-get update && apt-get install -y nodejs npm


RUN apt-get update && apt-get install -y \
    git unzip zip curl libpng-dev libonig-dev libxml2-dev libzip-dev libpq-dev \
    && docker-php-ext-install pdo pdo_mysql zip

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /var/www

COPY . .

RUN composer install --no-interaction --prefer-dist --optimize-autoloader

RUN cp .env.example .env

RUN php artisan key:generate

RUN npm install && npm run build

EXPOSE 8000

CMD php artisan serve --host=0.0.0.0 --port=8000
