# 🍽️ Meal Planner — Guide d'installation

Application web de planification de repas : planning semaine, recettes, liste de courses, occasions spéciales, Google Calendar.

---

## 📁 Structure des fichiers

```
mealplanner/
├── index.html              ← Application principale
├── css/
│   └── app.css             ← Styles (responsive 320px+, accessible)
├── js/
│   └── app.js              ← Logique front-end
├── php/
│   ├── config.php          ← Configuration BDD + Google OAuth
│   └── api.php             ← API REST back-end
└── database.sql            ← Schéma + données de démo
```

---

## ⚙️ Installation

### 1. Prérequis
- PHP 8.0+ avec extension PDO MySQL
- MySQL 5.7+ ou MariaDB 10.3+
- Serveur web : Apache / Nginx / XAMPP / Laragon

### 2. Base de données
```sql
-- Dans phpMyAdmin ou MySQL CLI :
SOURCE /chemin/vers/mealplanner/database.sql;
```

### 3. Configuration
Éditer `php/config.php` :
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'mealplanner');
define('DB_USER', 'votre_utilisateur');
define('DB_PASS', 'votre_mot_de_passe');
```

### 4. Déployer les fichiers
Copier le dossier `mealplanner/` dans votre dossier web (`htdocs`, `www`, ou racine du serveur).

### 5. Accéder à l'app
```
http://localhost/mealplanner/
```

---

## 📅 Google Calendar (optionnel)

### Créer les credentials OAuth2
1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créer un projet > Activer **Google Calendar API**
3. Identifiants > Créer ID client OAuth 2.0 (type : Application web)
4. URI de redirection autorisée : `http://localhost/mealplanner/php/google_callback.php`
5. Copier Client ID et Client Secret dans `php/config.php`

### Installer la librairie Google
```bash
composer require google/apiclient:^2.0
```

---

## 🎯 Fonctionnalités

| Fonctionnalité | Détail |
|---|---|
| **Planning 4 semaines** | Visualisation semaine par semaine, navigation entre les 4 semaines |
| **4 repas/jour** | Petit-déjeuner, Déjeuner, Goûter, Dîner |
| **Recettes intégrées** | 14 recettes de démonstration incluses |
| **Affichage recette** | Clic sur un repas → recette complète avec ingrédients et étapes |
| **Liste de courses** | Génération automatique depuis le planning (1 à 4 semaines) |
| **Occasions spéciales** | Couleur + icône personnalisables par jour (anniversaire, Noël…) |
| **Google Calendar** | Synchronisation OAuth2 (nécessite configuration) |
| **RGAA / WCAG** | Skip link, aria-*, focus visible, rôles sémantiques, navigation clavier |
| **Responsive** | Mobile first, fonctionne dès 320px |

---

## ♿ Accessibilité (RGAA / WCAG 2.1 AA)

- Skip link "Aller au contenu principal"
- `lang="fr"` sur `<html>`
- Rôles ARIA : `dialog`, `radiogroup`, `grid`, `navigation`, `toolbar`
- `aria-live` sur les zones dynamiques (planning, messages)
- `aria-label` sur tous les boutons icônes
- Focus visible haute visibilité (outline 3px)
- Navigation entièrement possible au clavier
- Contraste couleurs conforme AA

---

## 🛠️ Personnalisation

### Ajouter des recettes
Via l'interface : bouton **"Recettes"** → **"+ Nouvelle"**

### Modifier les couleurs de thème
Dans `css/app.css`, section `:root { }` → modifier les variables CSS.

### Ajouter un type de repas
1. `database.sql` : modifier l'ENUM de `meal_type`
2. `php/api.php` : mettre à jour `getMealLabels()`
3. `js/app.js` : mettre à jour les tableaux `mealTypes` / `mealLabels`
4. `css/app.css` : ajouter la variable couleur correspondante
