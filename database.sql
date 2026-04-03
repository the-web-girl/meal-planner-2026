-- ============================================
-- MealPlanner - Schéma de base de données
-- ============================================

CREATE DATABASE IF NOT EXISTS mealplanner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mealplanner;

-- Table des recettes
CREATE TABLE recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prep_time INT DEFAULT 0 COMMENT 'en minutes',
    cook_time INT DEFAULT 0 COMMENT 'en minutes',
    servings INT DEFAULT 4,
    category ENUM('breakfast','lunch','snack','dinner') NOT NULL,
    image_url VARCHAR(500),
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des ingrédients
CREATE TABLE ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison recette <-> ingrédients
CREATE TABLE recipe_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    notes VARCHAR(255),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Table des semaines de planning
CREATE TABLE meal_weeks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    week_start DATE NOT NULL COMMENT 'Lundi de la semaine',
    week_number INT NOT NULL,
    year INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_week (week_start)
);

-- Table des journées spéciales
CREATE TABLE special_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day_date DATE NOT NULL UNIQUE,
    label VARCHAR(255),
    color VARCHAR(7) NOT NULL DEFAULT '#FF6B6B',
    icon VARCHAR(10) DEFAULT '🎉',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des repas planifiés
CREATE TABLE meal_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_date DATE NOT NULL,
    meal_type ENUM('breakfast','lunch','snack','dinner') NOT NULL,
    recipe_id INT,
    custom_meal VARCHAR(255) COMMENT 'Repas sans recette',
    servings INT DEFAULT 4,
    notes TEXT,
    week_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
    FOREIGN KEY (week_id) REFERENCES meal_weeks(id) ON DELETE SET NULL,
    UNIQUE KEY unique_meal (plan_date, meal_type)
);

-- Table des listes de courses
CREATE TABLE shopping_lists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    week_start DATE,
    week_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des éléments de liste de courses
CREATE TABLE shopping_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    list_id INT NOT NULL,
    ingredient_id INT,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    checked TINYINT(1) DEFAULT 0,
    category VARCHAR(100),
    FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL
);

-- ============================================
-- DONNÉES DE DÉMONSTRATION
-- ============================================

-- Ingrédients de base
INSERT INTO ingredients (name, unit) VALUES
('Oeufs', 'unités'),('Lait', 'ml'),('Farine', 'g'),('Sucre', 'g'),
('Beurre', 'g'),('Sel', 'g'),('Poivre', 'g'),('Huile d\'olive', 'ml'),
('Ail', 'gousses'),('Oignon', 'unités'),('Tomates', 'unités'),
('Pâtes', 'g'),('Riz', 'g'),('Poulet', 'g'),('Saumon', 'g'),
('Carottes', 'unités'),('Pommes de terre', 'g'),('Fromage', 'g'),
('Crème fraîche', 'ml'),('Jambon', 'tranches'),('Pain', 'tranches'),
('Yaourt', 'unités'),('Confiture', 'g'),('Chocolat', 'g'),
('Banane', 'unités'),('Pomme', 'unités'),('Orange', 'unités'),
('Lardons', 'g'),('Champignons', 'g'),('Courgette', 'unités'),
('Poireaux', 'unités'),('Céleri', 'branches'),('Thon', 'boîte'),
('Moutarde', 'cuillère'),('Citron', 'unités'),('Persil', 'g'),
('Basilic', 'g'),('Levure chimique', 'g'),('Vanille', 'g'),
('Miel', 'g');

-- Recettes petit-déjeuner
INSERT INTO recipes (name, description, prep_time, cook_time, servings, category, instructions) VALUES
('Crêpes maison', 'Des crêpes légères et dorées, parfaites pour commencer la journée', 10, 20, 4, 'breakfast',
'1. Mélanger la farine et le sel dans un saladier.\n2. Creuser un puits, ajouter les oeufs.\n3. Incorporer le lait progressivement en fouettant.\n4. Ajouter le beurre fondu et laisser reposer 30 min.\n5. Cuire les crêpes dans une poêle chaude huilée.\n6. Servir avec confiture ou chocolat fondu.'),
('Pancakes américains', 'Pancakes moelleux et épais à l\'américaine', 10, 15, 4, 'breakfast',
'1. Mélanger farine, sucre, levure et sel.\n2. Battre les oeufs avec le lait et le beurre fondu.\n3. Combiner les deux mélanges sans trop travailler.\n4. Cuire dans une poêle à feu moyen, 2-3 min par face.\n5. Servir chauds avec sirop d\'érable ou miel.'),
('Tartines avocat-oeuf', 'Toast croustillant avec avocat écrasé et oeuf poché', 5, 10, 2, 'breakfast',
'1. Toaster le pain.\n2. Écraser l\'avocat avec citron, sel et poivre.\n3. Pocher les oeufs dans l\'eau frémissante vinaigrée.\n4. Étaler l\'avocat sur les tartines.\n5. Déposer l\'oeuf poché. Assaisonner et servir.'),
('Porridge aux fruits', 'Flocons d\'avoine crémeux aux fruits frais', 5, 10, 2, 'breakfast',
'1. Porter le lait à frémissement.\n2. Ajouter les flocons d\'avoine et le miel.\n3. Cuire 5 min en remuant.\n4. Verser dans des bols.\n5. Garnir de fruits frais et d\'une touche de cannelle.');

-- Recettes déjeuner
INSERT INTO recipes (name, description, prep_time, cook_time, servings, category, instructions) VALUES
('Quiche Lorraine', 'La quiche classique aux lardons et fromage, toujours appréciée', 20, 35, 6, 'lunch',
'1. Foncer un moule avec la pâte brisée.\n2. Mélanger oeufs, crème, lardons poêlés et fromage râpé.\n3. Assaisonner avec sel, poivre et noix de muscade.\n4. Verser l\'appareil sur la pâte.\n5. Cuire 35 min à 180°C jusqu\'à dorure.\n6. Laisser tiédir avant de servir.'),
('Poulet rôti aux herbes', 'Poulet doré au four avec ses herbes aromatiques', 15, 70, 4, 'lunch',
'1. Préchauffer le four à 200°C.\n2. Frotter le poulet avec beurre, ail, romarin et thym.\n3. Saler et poivrer l\'intérieur et l\'extérieur.\n4. Enfourner 1h10 en arrosant régulièrement.\n5. Laisser reposer 10 min avant de découper.\n6. Servir avec les jus de cuisson.'),
('Pâtes carbonara', 'Pâtes crémeuses à la romaine, sans crème fraîche', 10, 15, 4, 'lunch',
'1. Cuire les pâtes al dente.\n2. Faire revenir les lardons à sec.\n3. Battre les jaunes d\'oeufs avec le parmesan râpé.\n4. Mélanger pâtes égouttées et lardons hors du feu.\n5. Ajouter le mélange oeuf-fromage en remuant vite.\n6. Poivrer généreusement. Servir immédiatement.'),
('Saumon en papillote', 'Saumon délicat cuit à l\'étouffée avec légumes', 15, 20, 4, 'lunch',
'1. Préchauffer le four à 180°C.\n2. Découper des feuilles de papier sulfurisé.\n3. Déposer le saumon, rondelles de citron, aneth.\n4. Ajouter courgettes et tomates en dés.\n5. Fermer les papillotes hermétiquement.\n6. Cuire 20 min. Ouvrir à table.'),
('Ratatouille provençale', 'Le grand classique provençal de légumes mijotés', 20, 45, 6, 'lunch',
'1. Couper tous les légumes en dés réguliers.\n2. Faire revenir l\'oignon et l\'ail dans l\'huile d\'olive.\n3. Ajouter les poivrons, puis courgettes et aubergines.\n4. Incorporer les tomates et les herbes de Provence.\n5. Mijoter à feu doux 45 min en remuant.\n6. Ajuster l\'assaisonnement et servir chaud ou froid.');

-- Recettes goûter
INSERT INTO recipes (name, description, prep_time, cook_time, servings, category, instructions) VALUES
('Gâteau au chocolat fondant', 'Le gâteau moelleux au chocolat qui fond en bouche', 15, 25, 8, 'snack',
'1. Préchauffer le four à 180°C.\n2. Faire fondre le chocolat et le beurre au bain-marie.\n3. Battre les oeufs avec le sucre jusqu\'à blanchiment.\n4. Incorporer le chocolat fondu, puis la farine.\n5. Verser dans un moule beurré.\n6. Cuire 25 min. Le coeur doit rester fondant.'),
('Muffins aux fruits rouges', 'Muffins moelleux garnis de fruits rouges juteux', 15, 20, 12, 'snack',
'1. Mélanger farine, sucre, levure et sel.\n2. Battre oeuf, lait, huile et vanille.\n3. Combiner les deux mélanges rapidement.\n4. Incorporer délicatement les fruits rouges.\n5. Remplir les caissettes aux 2/3.\n6. Cuire 20 min à 180°C.'),
('Smoothie tropical', 'Boisson fraîche et vitaminée aux fruits exotiques', 5, 0, 2, 'snack',
'1. Peler et couper la mangue en morceaux.\n2. Éplucher la banane.\n3. Presser l\'orange.\n4. Mixer tous les fruits avec le yaourt.\n5. Ajouter un peu de lait si trop épais.\n6. Servir immédiatement avec de la glace.');

-- Recettes dîner
INSERT INTO recipes (name, description, prep_time, cook_time, servings, category, instructions) VALUES
('Soupe de légumes maison', 'Soupe réconfortante aux légumes de saison', 20, 30, 6, 'dinner',
'1. Éplucher et couper tous les légumes.\n2. Faire revenir l\'oignon et l\'ail dans le beurre.\n3. Ajouter carottes, poireaux, pommes de terre.\n4. Couvrir de bouillon, saler et poivrer.\n5. Cuire 30 min à frémissement.\n6. Mixer selon la consistance désirée.'),
('Gratin dauphinois', 'Pommes de terre fondantes en gratin crémeux', 25, 60, 6, 'dinner',
'1. Préchauffer le four à 180°C.\n2. Éplucher et trancher finement les pommes de terre.\n3. Frotter le plat avec de l\'ail.\n4. Alterner couches de pommes de terre et crème.\n5. Parsemer de fromage râpé.\n6. Cuire 1h jusqu\'à dorure.'),
('Omelette aux champignons', 'Omelette baveuse aux champignons et fines herbes', 10, 10, 2, 'dinner',
'1. Nettoyer et émincer les champignons.\n2. Les faire sauter au beurre avec l\'ail.\n3. Battre les oeufs avec sel, poivre et persil haché.\n4. Cuire l\'omelette dans une poêle beurrée bien chaude.\n5. Ajouter les champignons au centre.\n6. Plier et servir immédiatement.'),
('Tarte aux poireaux', 'Tarte fondante aux poireaux et fromage de chèvre', 20, 35, 6, 'dinner',
'1. Préchauffer le four à 180°C.\n2. Foncer un moule avec la pâte brisée et précuire 10 min.\n3. Faire fondre les poireaux émincés dans le beurre.\n4. Mélanger oeufs, crème, fromage de chèvre et poireaux.\n5. Assaisonner et verser sur la pâte.\n6. Cuire 25 min jusqu\'à prise.');

-- Liaisons recettes-ingrédients (quelques exemples)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
-- Crêpes (recipe 1)
(1, 3, 250, 'g'), (1, 1, 3, 'unités'), (1, 2, 500, 'ml'), (1, 5, 50, 'g'), (1, 6, 1, 'pincée'),
-- Pancakes (recipe 2)
(2, 3, 200, 'g'), (2, 1, 2, 'unités'), (2, 2, 300, 'ml'), (2, 4, 30, 'g'), (2, 5, 30, 'g'), (2, 38, 10, 'g'),
-- Quiche lorraine (recipe 5)
(5, 1, 3, 'unités'), (5, 19, 200, 'ml'), (5, 28, 150, 'g'), (5, 18, 100, 'g'), (5, 6, 1, 'pincée'),
-- Pâtes carbonara (recipe 7)
(7, 12, 400, 'g'), (7, 28, 150, 'g'), (7, 1, 4, 'unités'), (7, 18, 80, 'g'), (7, 7, 1, 'pincée'),
-- Gâteau chocolat (recipe 11)
(11, 24, 200, 'g'), (11, 5, 150, 'g'), (11, 1, 4, 'unités'), (11, 4, 150, 'g'), (11, 3, 50, 'g');

-- Planning exemple (semaine courante)
INSERT INTO meal_weeks (week_start, week_number, year) VALUES
(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), WEEK(CURDATE(), 1), YEAR(CURDATE()));

-- Journées spéciales exemple
INSERT INTO special_days (day_date, label, color, icon) VALUES
(DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Anniversaire de Léa', '#FF6B9D', '🎂'),
(DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'Compétition de natation', '#4ECDC4', '🏊'),
(DATE_ADD(CURDATE(), INTERVAL 17 DAY), 'Diplôme de Thomas', '#FFE66D', '🎓');
