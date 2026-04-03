<?php
// ============================================
// Configuration MealPlanner
// ============================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'mealplanner');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Google Calendar OAuth2
define('GOOGLE_CLIENT_ID', 'VOTRE_CLIENT_ID_ICI');
define('GOOGLE_CLIENT_SECRET', 'VOTRE_CLIENT_SECRET_ICI');
define('GOOGLE_REDIRECT_URI', 'http://localhost/mealplanner/php/google_callback.php');

// App settings
define('APP_NAME', 'Meal Planner');
define('APP_VERSION', '1.0.0');
define('MAX_WEEKS', 4);

// Connexion PDO
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Connexion BDD impossible: ' . $e->getMessage()]));
        }
    }
    return $pdo;
}

// Headers CORS pour les appels AJAX
function setCorsHeaders(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

// Réponse JSON
function jsonResponse(mixed $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Sanitize input
function sanitize(string $input): string {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

// Étiquettes des repas
function getMealLabels(): array {
    return [
        'breakfast' => ['label' => 'Petit-déjeuner', 'icon' => '☀️', 'color' => '#FF9F43'],
        'lunch'     => ['label' => 'Déjeuner',       'icon' => '🍽️', 'color' => '#48C774'],
        'snack'     => ['label' => 'Goûter',          'icon' => '🍪', 'color' => '#3273DC'],
        'dinner'    => ['label' => 'Dîner',           'icon' => '🌙', 'color' => '#9B59B6'],
    ];
}
