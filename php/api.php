<?php
require_once __DIR__ . '/config.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        // ---- PLANNING ----
        case 'get_week':
            getWeekPlan();
            break;
        case 'save_meal':
            saveMeal();
            break;
        case 'delete_meal':
            deleteMeal();
            break;

        // ---- RECETTES ----
        case 'get_recipes':
            getRecipes();
            break;
        case 'get_recipe':
            getRecipe();
            break;
        case 'save_recipe':
            saveRecipe();
            break;
        case 'delete_recipe':
            deleteRecipe();
            break;

        // ---- JOURNÉES SPÉCIALES ----
        case 'get_special_days':
            getSpecialDays();
            break;
        case 'save_special_day':
            saveSpecialDay();
            break;
        case 'delete_special_day':
            deleteSpecialDay();
            break;

        // ---- COURSES ----
        case 'generate_shopping_list':
            generateShoppingList();
            break;
        case 'get_shopping_lists':
            getShoppingLists();
            break;
        case 'get_shopping_list':
            getShoppingList();
            break;
        case 'toggle_shopping_item':
            toggleShoppingItem();
            break;
        case 'delete_shopping_list':
            deleteShoppingList();
            break;

        // ---- GOOGLE CALENDAR ----
        case 'google_auth_url':
            getGoogleAuthUrl();
            break;
        case 'sync_google_calendar':
            syncGoogleCalendar();
            break;

        default:
            jsonResponse(['error' => 'Action inconnue'], 404);
    }
} catch (Exception $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
}

// ============================================
// PLANNING
// ============================================

function getWeekPlan(): void {
    $db = getDB();
    $weekStart = $_GET['week_start'] ?? date('Y-m-d', strtotime('monday this week'));

    // Valider et calculer les 7 jours
    $start = new DateTime($weekStart);
    $end   = clone $start;
    $end->modify('+6 days');

    // Récupérer les repas
    $stmt = $db->prepare("
        SELECT mp.*, r.name as recipe_name, r.description as recipe_desc,
               r.prep_time, r.cook_time, r.servings, r.image_url,
               r.category, r.instructions
        FROM meal_plans mp
        LEFT JOIN recipes r ON mp.recipe_id = r.id
        WHERE mp.plan_date BETWEEN ? AND ?
        ORDER BY mp.plan_date, FIELD(mp.meal_type,'breakfast','lunch','snack','dinner')
    ");
    $stmt->execute([$start->format('Y-m-d'), $end->format('Y-m-d')]);
    $meals = $stmt->fetchAll();

    // Récupérer les journées spéciales
    $stmt2 = $db->prepare("SELECT * FROM special_days WHERE day_date BETWEEN ? AND ?");
    $stmt2->execute([$start->format('Y-m-d'), $end->format('Y-m-d')]);
    $specialDays = $stmt2->fetchAll();

    // Organiser par jour
    $plan = [];
    $current = clone $start;
    while ($current <= $end) {
        $dateStr = $current->format('Y-m-d');
        $plan[$dateStr] = [
            'date'       => $dateStr,
            'day_name'   => formatDayFr($current),
            'day_short'  => formatDayShortFr($current),
            'day_num'    => $current->format('j'),
            'month'      => formatMonthFr($current),
            'special'    => null,
            'meals'      => ['breakfast'=>null,'lunch'=>null,'snack'=>null,'dinner'=>null],
        ];
        $current->modify('+1 day');
    }

    // Intégrer les repas
    foreach ($meals as $meal) {
        if (isset($plan[$meal['plan_date']])) {
            $plan[$meal['plan_date']]['meals'][$meal['meal_type']] = $meal;
        }
    }

    // Intégrer les journées spéciales
    foreach ($specialDays as $sd) {
        if (isset($plan[$sd['day_date']])) {
            $plan[$sd['day_date']]['special'] = $sd;
        }
    }

    jsonResponse([
        'week_start' => $start->format('Y-m-d'),
        'week_end'   => $end->format('Y-m-d'),
        'days'       => array_values($plan),
        'meal_labels'=> getMealLabels(),
    ]);
}

function saveMeal(): void {
    $db   = getDB();
    $data = json_decode(file_get_contents('php://input'), true);

    $date      = $data['date']      ?? '';
    $mealType  = $data['meal_type'] ?? '';
    $recipeId  = $data['recipe_id'] ?? null;
    $custom    = $data['custom_meal'] ?? null;
    $servings  = (int)($data['servings'] ?? 4);
    $notes     = $data['notes'] ?? '';

    if (!$date || !$mealType) {
        jsonResponse(['error' => 'Date et type de repas requis'], 400);
    }

    $stmt = $db->prepare("
        INSERT INTO meal_plans (plan_date, meal_type, recipe_id, custom_meal, servings, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            recipe_id=VALUES(recipe_id),
            custom_meal=VALUES(custom_meal),
            servings=VALUES(servings),
            notes=VALUES(notes)
    ");
    $stmt->execute([$date, $mealType, $recipeId, $custom, $servings, $notes]);

    jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
}

function deleteMeal(): void {
    $db = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $db->prepare("DELETE FROM meal_plans WHERE plan_date=? AND meal_type=?");
    $stmt->execute([$data['date'], $data['meal_type']]);
    jsonResponse(['success' => true]);
}

// ============================================
// RECETTES
// ============================================

function getRecipes(): void {
    $db = getDB();
    $category = $_GET['category'] ?? '';
    $search   = $_GET['search']   ?? '';

    $sql    = "SELECT id, name, description, prep_time, cook_time, servings, category, image_url FROM recipes WHERE 1=1";
    $params = [];

    if ($category) { $sql .= " AND category=?";          $params[] = $category; }
    if ($search)   { $sql .= " AND name LIKE ?";          $params[] = "%$search%"; }

    $sql .= " ORDER BY name";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function getRecipe(): void {
    $db = getDB();
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID manquant'], 400);

    $stmt = $db->prepare("SELECT * FROM recipes WHERE id=?");
    $stmt->execute([$id]);
    $recipe = $stmt->fetch();
    if (!$recipe) jsonResponse(['error' => 'Recette introuvable'], 404);

    // Ingrédients
    $stmt2 = $db->prepare("
        SELECT ri.*, i.name as ingredient_name
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id=?
        ORDER BY i.name
    ");
    $stmt2->execute([$id]);
    $recipe['ingredients'] = $stmt2->fetchAll();

    jsonResponse($recipe);
}

function saveRecipe(): void {
    $db   = getDB();
    $data = json_decode(file_get_contents('php://input'), true);

    $id           = (int)($data['id'] ?? 0);
    $name         = sanitize($data['name'] ?? '');
    $description  = sanitize($data['description'] ?? '');
    $category     = $data['category'] ?? 'lunch';
    $prep_time    = (int)($data['prep_time'] ?? 0);
    $cook_time    = (int)($data['cook_time'] ?? 0);
    $servings     = (int)($data['servings'] ?? 4);
    $instructions = $data['instructions'] ?? '';
    $image_url    = sanitize($data['image_url'] ?? '');

    if (!$name) jsonResponse(['error' => 'Nom requis'], 400);

    if ($id) {
        $stmt = $db->prepare("UPDATE recipes SET name=?,description=?,category=?,prep_time=?,cook_time=?,servings=?,instructions=?,image_url=? WHERE id=?");
        $stmt->execute([$name,$description,$category,$prep_time,$cook_time,$servings,$instructions,$image_url,$id]);
    } else {
        $stmt = $db->prepare("INSERT INTO recipes (name,description,category,prep_time,cook_time,servings,instructions,image_url) VALUES (?,?,?,?,?,?,?,?)");
        $stmt->execute([$name,$description,$category,$prep_time,$cook_time,$servings,$instructions,$image_url]);
        $id = (int)$db->lastInsertId();
    }

    // Ingrédients
    if (!empty($data['ingredients'])) {
        $db->prepare("DELETE FROM recipe_ingredients WHERE recipe_id=?")->execute([$id]);
        $insertIng = $db->prepare("
            INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes)
            VALUES (?,?,?,?,?)
        ");
        foreach ($data['ingredients'] as $ing) {
            // Créer l'ingrédient si nouveau
            $ingId = (int)($ing['ingredient_id'] ?? 0);
            if (!$ingId && !empty($ing['ingredient_name'])) {
                $findIng = $db->prepare("SELECT id FROM ingredients WHERE name=?");
                $findIng->execute([trim($ing['ingredient_name'])]);
                $found = $findIng->fetch();
                if ($found) {
                    $ingId = $found['id'];
                } else {
                    $db->prepare("INSERT INTO ingredients (name,unit) VALUES (?,?)")
                       ->execute([trim($ing['ingredient_name']), $ing['unit'] ?? '']);
                    $ingId = (int)$db->lastInsertId();
                }
            }
            if ($ingId) {
                $insertIng->execute([$id, $ingId, $ing['quantity'] ?? null, $ing['unit'] ?? '', $ing['notes'] ?? '']);
            }
        }
    }

    jsonResponse(['success' => true, 'id' => $id]);
}

function deleteRecipe(): void {
    $db   = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($data['id'] ?? 0);
    $db->prepare("DELETE FROM recipes WHERE id=?")->execute([$id]);
    jsonResponse(['success' => true]);
}

// ============================================
// JOURNÉES SPÉCIALES
// ============================================

function getSpecialDays(): void {
    $db    = getDB();
    $start = $_GET['start'] ?? date('Y-m-d');
    $end   = $_GET['end']   ?? date('Y-m-d', strtotime('+28 days'));
    $stmt  = $db->prepare("SELECT * FROM special_days WHERE day_date BETWEEN ? AND ? ORDER BY day_date");
    $stmt->execute([$start, $end]);
    jsonResponse($stmt->fetchAll());
}

function saveSpecialDay(): void {
    $db   = getDB();
    $data = json_decode(file_get_contents('php://input'), true);

    $date  = $data['day_date'] ?? '';
    $label = sanitize($data['label'] ?? '');
    $color = $data['color'] ?? '#FF6B6B';
    $icon  = $data['icon']  ?? '🎉';
    $id    = (int)($data['id'] ?? 0);

    if ($id) {
        $stmt = $db->prepare("UPDATE special_days SET day_date=?,label=?,color=?,icon=? WHERE id=?");
        $stmt->execute([$date, $label, $color, $icon, $id]);
    } else {
        $stmt = $db->prepare("
            INSERT INTO special_days (day_date,label,color,icon) VALUES (?,?,?,?)
            ON DUPLICATE KEY UPDATE label=VALUES(label),color=VALUES(color),icon=VALUES(icon)
        ");
        $stmt->execute([$date, $label, $color, $icon]);
    }
    jsonResponse(['success' => true]);
}

function deleteSpecialDay(): void {
    $db   = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
    $db->prepare("DELETE FROM special_days WHERE id=?")->execute([$data['id']]);
    jsonResponse(['success' => true]);
}

// ============================================
// LISTE DE COURSES
// ============================================

function generateShoppingList(): void {
    $db         = getDB();
    $data       = json_decode(file_get_contents('php://input'), true);
    $weekStart  = $data['week_start'] ?? date('Y-m-d', strtotime('monday this week'));
    $weekCount  = (int)($data['week_count'] ?? 1);

    $start = new DateTime($weekStart);
    $end   = clone $start;
    $end->modify('+' . ($weekCount * 7 - 1) . ' days');

    // Récupérer tous les repas avec leurs ingrédients
    $stmt = $db->prepare("
        SELECT mp.recipe_id, mp.servings as plan_servings, r.servings as recipe_servings,
               ri.quantity, ri.unit, i.name as ingredient_name, i.id as ingredient_id
        FROM meal_plans mp
        JOIN recipes r ON mp.recipe_id = r.id
        JOIN recipe_ingredients ri ON ri.recipe_id = r.id
        JOIN ingredients i ON i.id = ri.ingredient_id
        WHERE mp.plan_date BETWEEN ? AND ? AND mp.recipe_id IS NOT NULL
    ");
    $stmt->execute([$start->format('Y-m-d'), $end->format('Y-m-d')]);
    $rows = $stmt->fetchAll();

    // Agréger les ingrédients
    $aggregated = [];
    foreach ($rows as $row) {
        $ratio = $row['plan_servings'] / max(1, $row['recipe_servings']);
        $qty   = round($row['quantity'] * $ratio, 2);
        $key   = $row['ingredient_id'] . '_' . $row['unit'];

        if (isset($aggregated[$key])) {
            $aggregated[$key]['quantity'] += $qty;
        } else {
            $aggregated[$key] = [
                'ingredient_id'   => $row['ingredient_id'],
                'ingredient_name' => $row['ingredient_name'],
                'quantity'        => $qty,
                'unit'            => $row['unit'],
                'checked'         => 0,
            ];
        }
    }

    // Créer la liste
    $listName = 'Courses du ' . formatDateFr($start) . ' au ' . formatDateFr($end);
    $stmtList = $db->prepare("INSERT INTO shopping_lists (name,week_start,week_end) VALUES (?,?,?)");
    $stmtList->execute([$listName, $start->format('Y-m-d'), $end->format('Y-m-d')]);
    $listId = (int)$db->lastInsertId();

    // Insérer les items
    $stmtItem = $db->prepare("
        INSERT INTO shopping_items (list_id,ingredient_id,ingredient_name,quantity,unit)
        VALUES (?,?,?,?,?)
    ");
    foreach ($aggregated as $item) {
        $stmtItem->execute([$listId, $item['ingredient_id'], $item['ingredient_name'], $item['quantity'], $item['unit']]);
    }

    jsonResponse(['success' => true, 'list_id' => $listId, 'name' => $listName, 'items_count' => count($aggregated)]);
}

function getShoppingLists(): void {
    $db = getDB();
    $stmt = $db->query("SELECT *, (SELECT COUNT(*) FROM shopping_items WHERE list_id=sl.id) as items_count FROM shopping_lists sl ORDER BY created_at DESC LIMIT 20");
    jsonResponse($stmt->fetchAll());
}

function getShoppingList(): void {
    $db = getDB();
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID manquant'], 400);

    $stmt = $db->prepare("SELECT * FROM shopping_lists WHERE id=?");
    $stmt->execute([$id]);
    $list = $stmt->fetch();
    if (!$list) jsonResponse(['error' => 'Liste introuvable'], 404);

    $stmt2 = $db->prepare("SELECT * FROM shopping_items WHERE list_id=? ORDER BY ingredient_name");
    $stmt2->execute([$id]);
    $list['items'] = $stmt2->fetchAll();

    jsonResponse($list);
}

function toggleShoppingItem(): void {
    $db   = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($data['id'] ?? 0);
    $stmt = $db->prepare("UPDATE shopping_items SET checked = NOT checked WHERE id=?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

function deleteShoppingList(): void {
    $db   = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
    $db->prepare("DELETE FROM shopping_lists WHERE id=?")->execute([(int)($data['id'] ?? 0)]);
    jsonResponse(['success' => true]);
}

// ============================================
// GOOGLE CALENDAR
// ============================================

function getGoogleAuthUrl(): void {
    $params = http_build_query([
        'client_id'     => GOOGLE_CLIENT_ID,
        'redirect_uri'  => GOOGLE_REDIRECT_URI,
        'response_type' => 'code',
        'scope'         => 'https://www.googleapis.com/auth/calendar',
        'access_type'   => 'offline',
        'prompt'        => 'consent',
    ]);
    jsonResponse(['url' => 'https://accounts.google.com/o/oauth2/v2/auth?' . $params]);
}

function syncGoogleCalendar(): void {
    // Nécessite le token OAuth2 stocké en session ou BDD
    // Implémentation simplifiée - requiert google/apiclient
    jsonResponse(['message' => 'Synchronisation Google Calendar - Configurez votre Client ID dans php/config.php et installez la librairie Google API Client (composer require google/apiclient)']);
}

// ============================================
// HELPERS
// ============================================

function formatDayFr(DateTime $d): string {
    $days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    return $days[(int)$d->format('w')];
}

function formatDayShortFr(DateTime $d): string {
    $days = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    return $days[(int)$d->format('w')];
}

function formatMonthFr(DateTime $d): string {
    $months = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    return $months[(int)$d->format('n')];
}

function formatDateFr(DateTime $d): string {
    return $d->format('d') . ' ' . formatMonthFr($d) . ' ' . $d->format('Y');
}
