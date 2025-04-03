# DeepCrop

A Laravel-based backend with a React frontend using TypeScript.

## Requirements

- PHP >= 8.1
- Composer
- Node.js >= 16.x
- npm or yarn
- MySQL or any supported database

## Contributing

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Submit a pull request.

## Installation

1. Clone the repository:

    ```bash
    git clone <URL>
    cd DeepCrop
    ```

2. Install backend dependencies:

    ```bash
    composer install
    ```

3. Set up the `.env` file:

    ```bash
    cp .env.example .env
    php artisan key:generate
    ```

4. Configure database in the `.env` file.

5. Run database migrations:

    ```bash
    php artisan migrate
    ```

6. Install frontend dependencies:

    ```bash
    npm install
    ```

7. Build the frontend:

    ```bash
    npm run dev
    ```

8. Start the Laravel development server:
    ```bash
    php artisan serve
    ```

## Usage

- Access the application at `http://localhost:8000`.
- For frontend development, run:
    ```bash
    npm run dev
    ```

## Project Structure

- **Backend**: Laravel framework for API and server-side logic.
- **Frontend**: React with TypeScript for the user interface.

## License

JYPE
