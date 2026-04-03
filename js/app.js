/* ============================================
   MealPlanner - Application JS
   ============================================ */

'use strict';

// ---- État global ----
const App = {
  currentWeekStart: null,
  currentWeekOffset: 0,   // 0 à 3 (4 semaines)
  weekData: null,
  recipes: [],
  shoppingLists: [],
  pendingMeal: null,       // {date, meal_type} en cours d'édition
  selectedRecipeId: null,
  API: 'php/api.php',
};

// ---- Utilitaires ----
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function api(action, params = {}, body = null, method = 'GET') {
  const url = new URL(App.API, location.href);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const opts = { method };
  if (body) { opts.headers = {'Content-Type': 'application/json'}; opts.body = JSON.stringify(body); }
  return fetch(url).then(r => r.json());
}

function post(action, body) {
  return fetch(`${App.API}?action=${action}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  }).then(r => r.json());
}

function del(action, body) {
  return fetch(`${App.API}?action=${action}`, {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  }).then(r => r.json());
}

// Lundi de la semaine N depuis aujourd'hui
function getWeekStart(offset = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff + offset * 7);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', {day:'numeric', month:'long'});
}

function toast(msg, type = 'success') {
  const c = $('#toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ---- Modaux ----
function openModal(id) {
  const m = $(`#${id}`);
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  const first = m.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (first) setTimeout(() => first.focus(), 80);
}

function closeModal(id) {
  const m = $(`#${id}`);
  if (!m) return;
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
}

function closeAllModals() {
  $$('.modal-overlay').forEach(m => { m.classList.remove('open'); m.setAttribute('aria-hidden','true'); });
}

// Fermer modal avec Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
});

// Fermer en cliquant sur l'overlay
$$('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ---- PLANNING ----
async function loadWeek() {
  const ws = getWeekStart(App.currentWeekOffset);
  App.currentWeekStart = ws;

  // Mise à jour des onglets semaine
  $$('.week-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === App.currentWeekOffset);
  });

  // Afficher loader
  $('#planning-grid').innerHTML = `<div class="loader" style="grid-column:1/-1"><div class="spinner"></div>Chargement...</div>`;

  const data = await api('get_week', {week_start: ws});
  App.weekData = data;

  // Titre
  const start = new Date(data.week_start + 'T12:00:00');
  const end   = new Date(data.week_end   + 'T12:00:00');
  $('#week-label').textContent = `Semaine du ${start.toLocaleDateString('fr-FR', {day:'numeric',month:'long'})} au ${end.toLocaleDateString('fr-FR', {day:'numeric',month:'long', year:'numeric'})}`;

  renderGrid(data);
}

function renderGrid(data) {
  const grid = $('#planning-grid');
  grid.innerHTML = '';
  const today = new Date().toISOString().split('T')[0];

  const mealTypes = ['breakfast','lunch','snack','dinner'];
  const mealIcons = {breakfast:'☀️', lunch:'🍽️', snack:'🍪', dinner:'🌙'};
  const mealLabels = {breakfast:'Petit-déj', lunch:'Déjeuner', snack:'Goûter', dinner:'Dîner'};

  data.days.forEach(day => {
    const card = document.createElement('article');
    card.className = 'day-card' + (day.date === today ? ' today' : '') + (day.special ? ' special' : '');
    if (day.special) {
      card.style.setProperty('--special-color', day.special.color);
    }

    let specialHtml = '';
    if (day.special) {
      specialHtml = `
        <span class="special-badge" aria-hidden="true">${day.special.icon}</span>
        <span class="special-label">${escHtml(day.special.label)}</span>`;
    }

    let mealsHtml = '';
    mealTypes.forEach(type => {
      const meal = day.meals[type];
      const mealName = meal ? (meal.recipe_name || meal.custom_meal || 'Repas') : '';
      mealsHtml += `
        <div class="meal-slot ${type}" role="group" aria-label="${mealLabels[type]}">
          <div class="meal-slot-header" aria-hidden="true">
            <span>${mealIcons[type]}</span>${mealLabels[type]}
          </div>
          <div class="meal-slot-body" 
               tabindex="0"
               role="button"
               aria-label="${mealName ? 'Voir recette: ' + mealName : 'Ajouter ' + mealLabels[type]}"
               onclick="handleMealClick('${day.date}','${type}',${meal ? meal.recipe_id || 'null' : 'null'})"
               onkeydown="if(event.key==='Enter'||event.key===' ')handleMealClick('${day.date}','${type}',${meal ? meal.recipe_id || 'null' : 'null'})">
            ${meal
              ? `<span class="meal-name">${escHtml(mealName)}</span>`
              : `<span class="meal-empty">+ Ajouter</span>`}
          </div>
          ${meal ? `
          <div class="meal-actions" role="group" aria-label="Actions repas">
            <button class="meal-action-btn" onclick="openEditMeal('${day.date}','${type}')" aria-label="Modifier">✏</button>
            <button class="meal-action-btn" onclick="deleteMeal('${day.date}','${type}')" aria-label="Supprimer">✕</button>
          </div>` : ''}
        </div>`;
    });

    card.innerHTML = `
      <header class="day-header">
        <div class="day-name">${day.day_name}</div>
        <div class="day-num" aria-label="${day.day_name} ${day.day_num} ${day.month}">${day.day_num}</div>
        <div class="day-month">${day.month}</div>
        ${specialHtml}
      </header>
      <div class="day-meals">${mealsHtml}</div>
      <div style="padding:.5rem;display:flex;gap:.3rem;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="openSpecialDayModal('${day.date}')" aria-label="Marquer ${day.day_name} comme journée spéciale" style="font-size:.65rem;padding:.25rem .5rem">
          ${day.special ? '🎨 Modifier' : '+ Occasion'}</button>
        <button class="btn btn-ghost btn-sm" onclick="generateDayList('${day.date}')" aria-label="Liste de courses pour ${day.day_name}" style="font-size:.65rem;padding:.25rem .5rem">🛒 Courses</button>
      </div>`;

    grid.appendChild(card);
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- GESTION REPAS ----
function handleMealClick(date, mealType, recipeId) {
  if (recipeId) {
    openRecipeDetail(recipeId);
  } else {
    openAddMealModal(date, mealType);
  }
}

function openAddMealModal(date, mealType) {
  App.pendingMeal = {date, mealType};
  App.selectedRecipeId = null;

  const labels = {breakfast:'Petit-déjeuner', lunch:'Déjeuner', snack:'Goûter', dinner:'Dîner'};
  $('#meal-modal-title').textContent = `${labels[mealType]} — ${formatDate(date)}`;
  $('#meal-recipe-selected').textContent = 'Aucune recette sélectionnée';
  $('#meal-custom-input').value = '';
  $('#meal-servings').value = 4;
  $('#meal-notes').value = '';

  // Filtrer les recettes par type
  loadRecipesForMeal(mealType);
  openModal('meal-modal');
}

function openEditMeal(date, mealType) {
  openAddMealModal(date, mealType);
}

async function loadRecipesForMeal(category) {
  $('#meal-recipe-grid').innerHTML = `<div class="loader"><div class="spinner"></div></div>`;
  const recipes = await api('get_recipes', {category});
  App.recipes = recipes;
  renderMealRecipes(recipes);
}

function renderMealRecipes(recipes) {
  const grid = $('#meal-recipe-grid');
  const icons = {breakfast:'🌅', lunch:'🍲', snack:'🍰', dinner:'🌙'};

  if (!recipes.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><p>Aucune recette pour ce type de repas</p></div>`;
    return;
  }

  grid.innerHTML = recipes.map(r => `
    <div class="recipe-card ${App.selectedRecipeId === r.id ? 'selected' : ''}"
         role="radio"
         aria-checked="${App.selectedRecipeId === r.id}"
         tabindex="0"
         onclick="selectRecipeForMeal(${r.id})"
         onkeydown="if(event.key==='Enter')selectRecipeForMeal(${r.id})">
      <div class="recipe-card-img">
        ${r.image_url ? `<img src="${escHtml(r.image_url)}" alt="${escHtml(r.name)}" loading="lazy">` : icons[r.category] || '🍴'}
      </div>
      <div class="recipe-card-body">
        <div class="recipe-card-name">${escHtml(r.name)}</div>
        <div class="recipe-card-meta">
          ${r.prep_time ? `⏱ ${r.prep_time+r.cook_time} min` : ''}
          ${r.servings ? `· ${r.servings} pers.` : ''}
        </div>
      </div>
    </div>`).join('');
}

function selectRecipeForMeal(id) {
  App.selectedRecipeId = id;
  const recipe = App.recipes.find(r => r.id === id);
  if (recipe) {
    $('#meal-recipe-selected').textContent = `✓ ${recipe.name}`;
    $('#meal-custom-input').value = '';
  }
  // Mettre à jour la sélection visuelle
  $$('.recipe-card').forEach(card => {
    const selected = card.onclick.toString().includes(`(${id})`);
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-checked', selected);
  });
}

async function saveMeal() {
  const {date, mealType} = App.pendingMeal || {};
  if (!date || !mealType) return;

  const customMeal = $('#meal-custom-input').value.trim();
  const servings   = parseInt($('#meal-servings').value) || 4;
  const notes      = $('#meal-notes').value.trim();

  if (!App.selectedRecipeId && !customMeal) {
    toast('Sélectionnez une recette ou saisissez un repas personnalisé', 'error');
    return;
  }

  const res = await post('save_meal', {
    date, meal_type: mealType,
    recipe_id:   App.selectedRecipeId || null,
    custom_meal: customMeal || null,
    servings, notes,
  });

  if (res.error) { toast(res.error, 'error'); return; }

  toast('Repas enregistré !');
  closeModal('meal-modal');
  loadWeek();
}

async function deleteMeal(date, mealType) {
  if (!confirm('Supprimer ce repas du planning ?')) return;
  await post('delete_meal', {date, meal_type: mealType});
  toast('Repas supprimé');
  loadWeek();
}

// ---- RECETTE DÉTAIL ----
let recipeDetailOrigin = null;

async function openRecipeDetail(id) {
  // Mémoriser quel modal était ouvert, puis tout fermer
  const trackable = ['recipes-modal', 'meal-modal'];
  recipeDetailOrigin = trackable.find(m => document.getElementById(m)?.classList.contains('open')) || null;
  closeAllModals();

  const recipe = await api('get_recipe', {id});
  if (recipe.error) { toast(recipe.error, 'error'); return; }

  const icons = {breakfast:'🌅', lunch:'🍲', snack:'🍰', dinner:'🌙'};
  const steps = (recipe.instructions || '').split('\n').filter(s => s.trim());

  $('#recipe-detail-body').innerHTML = `
    <div class="recipe-detail-hero">
      ${recipe.image_url
        ? `<img src="${escHtml(recipe.image_url)}" alt="${escHtml(recipe.name)}">`
        : icons[recipe.category] || '🍴'}
    </div>
    <h2 style="margin-bottom:.5rem">${escHtml(recipe.name)}</h2>
    ${recipe.description ? `<p style="color:var(--muted);font-size:.87rem;margin-bottom:.75rem">${escHtml(recipe.description)}</p>` : ''}
    <div class="recipe-meta-chips">
      ${recipe.prep_time ? `<span class="chip">⏱ Prép. ${recipe.prep_time} min</span>` : ''}
      ${recipe.cook_time ? `<span class="chip">🔥 Cuisson ${recipe.cook_time} min</span>` : ''}
      ${recipe.servings  ? `<span class="chip">👤 ${recipe.servings} personnes</span>` : ''}
    </div>
    ${recipe.ingredients && recipe.ingredients.length ? `
    <h3 style="margin-bottom:.75rem">Ingrédients</h3>
    <ul class="ingredients-list" aria-label="Liste des ingrédients">
      ${recipe.ingredients.map(i => `
        <li class="ingredient-item">
          <span class="ingredient-qty">${i.quantity ? i.quantity + ' ' + (i.unit||'') : ''}</span>
          <span>${escHtml(i.ingredient_name)}</span>
          ${i.notes ? `<span style="color:var(--muted);font-size:.78rem">— ${escHtml(i.notes)}</span>` : ''}
        </li>`).join('')}
    </ul>` : ''}
    ${steps.length ? `
    <h3 style="margin:1rem 0 .75rem">Préparation</h3>
    <ol class="instructions-list" aria-label="Étapes de préparation">
      ${steps.map((step, i) => `
        <li class="instruction-step">
          <span class="step-num" aria-hidden="true">${i+1}</span>
          <span class="step-text">${escHtml(step.replace(/^\d+\.\s*/,''))}</span>
        </li>`).join('')}
    </ol>` : ''}`;

  // Bouton "Retour" dans le footer si on vient d'une liste
  const footer = document.querySelector('#recipe-detail-modal .modal-footer');
  if (footer) {
    const backBtn = recipeDetailOrigin
      ? `<button class="btn btn-ghost btn-sm" onclick="closeModal('recipe-detail-modal');openModal('${recipeDetailOrigin}')">‹ Retour</button>`
      : '';
    footer.innerHTML = backBtn + `<button class="btn btn-ghost" onclick="closeModal('recipe-detail-modal')">Fermer</button>`;
  }

  openModal('recipe-detail-modal');
}

// ---- JOURNÉES SPÉCIALES ----
const SPECIAL_COLORS = [
  '#FF6B9D','#FF6B6B','#FF9F43','#FFE66D','#4ECDC4','#48C774','#3273DC','#9B59B6','#E74C3C','#2C3E50'
];
const SPECIAL_ICONS = ['🎂','🎉','🎓','🏆','🏊','⚽','🎄','🐰','❤️','🎵','🌟','🦄','🍀','🎭','🌈'];

let specialDayTarget = null;

function openSpecialDayModal(date) {
  specialDayTarget = date;
  $('#special-day-date').value = date;
  $('#special-day-label').value = '';
  $('#special-day-color').value = SPECIAL_COLORS[0];

  renderColorPicker();
  renderIconPicker();
  openModal('special-day-modal');
}

function renderColorPicker() {
  $('#color-picker-row').innerHTML = SPECIAL_COLORS.map(c => `
    <button class="color-swatch ${$('#special-day-color').value === c ? 'selected' : ''}"
            style="background:${c}"
            aria-label="Couleur ${c}"
            onclick="selectColor('${c}')"
            type="button"></button>`).join('');
}

function renderIconPicker() {
  const selected = $('#special-day-icon').value || '🎉';
  $('#icon-picker-row').innerHTML = SPECIAL_ICONS.map(ic => `
    <button class="icon-btn ${selected === ic ? 'selected' : ''}"
            aria-label="${ic}"
            onclick="selectIcon('${ic}')"
            type="button">${ic}</button>`).join('');
}

function selectColor(color) {
  $('#special-day-color').value = color;
  renderColorPicker();
}

function selectIcon(icon) {
  $('#special-day-icon').value = icon;
  renderIconPicker();
}

async function saveSpecialDay() {
  const dayDate = $('#special-day-date').value;
  const label   = $('#special-day-label').value.trim();
  const color   = $('#special-day-color').value || SPECIAL_COLORS[0];
  const icon    = $('#special-day-icon').value   || '🎉';

  if (!dayDate || !label) { toast('Date et libellé requis', 'error'); return; }

  const res = await post('save_special_day', {day_date:dayDate, label, color, icon});
  if (res.error) { toast(res.error, 'error'); return; }

  toast('Occasion spéciale ajoutée !');
  closeModal('special-day-modal');
  loadWeek();
}

// ---- LISTE DE COURSES ----
async function openShoppingModal() {
  $('#shopping-week-start').value = App.currentWeekStart;
  $('#shopping-week-count').value = 1;
  $('#shopping-lists-container').innerHTML = '<div class="loader"><div class="spinner"></div></div>';
  openModal('shopping-modal');
  loadShoppingLists();
}

async function loadShoppingLists() {
  const lists = await api('get_shopping_lists');
  App.shoppingLists = lists;

  if (!lists.length) {
    $('#shopping-lists-container').innerHTML = `<div class="empty-state"><div class="empty-state-icon">🛒</div><p>Aucune liste créée</p></div>`;
    return;
  }

  $('#shopping-lists-container').innerHTML = lists.map(l => `
    <div style="display:flex;align-items:center;gap:.75rem;padding:.65rem;border-radius:var(--radius-sm);border:2px solid var(--border);margin-bottom:.5rem;background:#fff">
      <span style="font-size:1.1rem">🛒</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:.85rem">${escHtml(l.name)}</div>
        <div style="font-size:.72rem;color:var(--muted)">${l.items_count} article${l.items_count>1?'s':''}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="viewShoppingList(${l.id})">Voir</button>
      <button class="btn btn-danger btn-sm" onclick="deleteShoppingList(${l.id})" aria-label="Supprimer la liste">✕</button>
    </div>`).join('');
}

async function generateShoppingList() {
  const weekStart  = $('#shopping-week-start').value;
  const weekCount  = parseInt($('#shopping-week-count').value) || 1;

  const btn = $('#generate-list-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Génération...';

  const res = await post('generate_shopping_list', {week_start: weekStart, week_count: weekCount});
  btn.disabled = false;
  btn.innerHTML = '🛒 Générer la liste';

  if (res.error) { toast(res.error, 'error'); return; }

  toast(`Liste créée : ${res.items_count} article${res.items_count>1?'s':''} !`);
  loadShoppingLists();
  viewShoppingList(res.list_id);
}

async function viewShoppingList(id) {
  const data = await api('get_shopping_list', {id});
  if (data.error) { toast(data.error,'error'); return; }

  $('#shopping-list-title').textContent = data.name;
  renderShoppingItems(data.items, id);
  openModal('shopping-list-modal');
}

function renderShoppingItems(items, listId) {
  if (!items.length) {
    $('#shopping-list-items').innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><p>Liste vide</p></div>`;
    return;
  }

  $('#shopping-list-items').innerHTML = `
    <div class="shopping-items">
      ${items.map(item => `
        <div class="shopping-item ${item.checked ? 'checked' : ''}"
             role="checkbox"
             aria-checked="${!!item.checked}"
             tabindex="0"
             onclick="toggleItem(${item.id}, this, ${listId})"
             onkeydown="if(event.key==='Enter'||event.key===' ')toggleItem(${item.id}, this, ${listId})">
          <div class="item-check" aria-hidden="true">${item.checked ? '✓' : ''}</div>
          <span class="item-name">${escHtml(item.ingredient_name)}</span>
          <span class="item-qty">${item.quantity ? item.quantity + ' ' + (item.unit||'') : ''}</span>
        </div>`).join('')}
    </div>`;
}

async function toggleItem(id, el, listId) {
  await post('toggle_shopping_item', {id});
  const row = el.closest('.shopping-item');
  const checked = !row.classList.contains('checked');
  row.classList.toggle('checked', checked);
  row.setAttribute('aria-checked', checked);
  row.querySelector('.item-check').textContent = checked ? '✓' : '';
}

async function deleteShoppingList(id) {
  if (!confirm('Supprimer cette liste de courses ?')) return;
  await del('delete_shopping_list', {id});
  toast('Liste supprimée');
  loadShoppingLists();
}

function printShoppingList() {
  window.print();
}

async function generateDayList(date) {
  const res = await post('generate_shopping_list', {week_start: date, week_count: 1});
  if (res.error) { toast(res.error,'error'); return; }
  toast(`Liste créée !`);
  viewShoppingList(res.list_id);
}

// ---- RECETTES MANAGER ----
async function openRecipesManager() {
  openModal('recipes-modal');
  await loadAllRecipes();
}

async function loadAllRecipes(category = '', search = '') {
  $('#recipes-manager-grid').innerHTML = `<div class="loader"><div class="spinner"></div></div>`;
  const recipes = await api('get_recipes', {category, search});
  App.recipes = recipes;
  renderAllRecipes(recipes);
}

function renderAllRecipes(recipes) {
  const icons = {breakfast:'🌅', lunch:'🍲', snack:'🍰', dinner:'🌙'};
  const catLabels = {breakfast:'Petit-déj', lunch:'Déjeuner', snack:'Goûter', dinner:'Dîner'};

  if (!recipes.length) {
    $('#recipes-manager-grid').innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><p>Aucune recette trouvée</p></div>`;
    return;
  }

  $('#recipes-manager-grid').innerHTML = `<div class="recipe-grid">
    ${recipes.map(r => `
      <div class="recipe-card" tabindex="0"
           onclick="openRecipeDetail(${r.id})"
           onkeydown="if(event.key==='Enter')openRecipeDetail(${r.id})">
        <div class="recipe-card-img">${r.image_url ? `<img src="${escHtml(r.image_url)}" alt="" loading="lazy">` : icons[r.category]||'🍴'}</div>
        <div class="recipe-card-body">
          <div class="recipe-card-name">${escHtml(r.name)}</div>
          <div class="recipe-card-meta">
            <span style="color:var(--${r.category})">${catLabels[r.category]||''}</span>
            ${r.prep_time||r.cook_time ? `· ⏱ ${(r.prep_time||0)+(r.cook_time||0)} min` : ''}
          </div>
          <div style="display:flex;gap:.3rem;margin-top:.4rem">
            <button class="btn btn-ghost btn-sm" style="font-size:.65rem;padding:.2rem .4rem"
                    onclick="event.stopPropagation();openEditRecipeModal(${r.id})">✏ Modifier</button>
            <button class="btn btn-danger btn-sm" style="font-size:.65rem;padding:.2rem .4rem"
                    onclick="event.stopPropagation();deleteRecipe(${r.id})">✕</button>
          </div>
        </div>
      </div>`).join('')}
  </div>`;
}

function openAddRecipeModal() {
  $('#recipe-form-title').textContent = 'Nouvelle recette';
  $('#recipe-form').reset();
  $('#recipe-form').dataset.id = '';
  $('#recipe-ingredients-table tbody').innerHTML = '';
  addIngredientRow();
  openModal('recipe-form-modal');
}

async function openEditRecipeModal(id) {
  const recipe = await api('get_recipe', {id});
  if (recipe.error) { toast(recipe.error,'error'); return; }

  $('#recipe-form-title').textContent = 'Modifier la recette';
  $('#recipe-form').dataset.id = id;
  $('#rf-name').value         = recipe.name || '';
  $('#rf-description').value  = recipe.description || '';
  $('#rf-category').value     = recipe.category || 'lunch';
  $('#rf-prep-time').value    = recipe.prep_time || 0;
  $('#rf-cook-time').value    = recipe.cook_time || 0;
  $('#rf-servings').value     = recipe.servings || 4;
  $('#rf-instructions').value = recipe.instructions || '';
  $('#rf-image-url').value    = recipe.image_url || '';

  const tbody = $('#recipe-ingredients-table tbody');
  tbody.innerHTML = '';
  if (recipe.ingredients && recipe.ingredients.length) {
    recipe.ingredients.forEach(ing => addIngredientRow(ing));
  } else {
    addIngredientRow();
  }

  openModal('recipe-form-modal');
}

function addIngredientRow(ing = null) {
  const tbody = $('#recipe-ingredients-table tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="hidden" class="ing-id" value="${ing ? ing.ingredient_id : ''}">
        <input type="text" class="ing-name" placeholder="Ingrédient" value="${ing ? escHtml(ing.ingredient_name) : ''}" aria-label="Nom de l'ingrédient" style="width:100%;border:1px solid var(--border);border-radius:4px;padding:.25rem .4rem;font-size:.8rem"></td>
    <td><input type="number" class="ing-qty" placeholder="Qté" value="${ing ? ing.quantity || '' : ''}" aria-label="Quantité" style="width:100%;border:1px solid var(--border);border-radius:4px;padding:.25rem .4rem;font-size:.8rem" min="0" step="0.1"></td>
    <td><input type="text" class="ing-unit" placeholder="g, ml..." value="${ing ? ing.unit || '' : ''}" aria-label="Unité" style="width:100%;border:1px solid var(--border);border-radius:4px;padding:.25rem .4rem;font-size:.8rem"></td>
    <td><button type="button" onclick="this.closest('tr').remove()" class="btn btn-danger btn-sm" style="padding:.2rem .4rem" aria-label="Supprimer ingrédient">✕</button></td>`;
  tbody.appendChild(tr);
}

async function saveRecipe() {
  const id    = parseInt($('#recipe-form').dataset.id) || 0;
  const name  = $('#rf-name').value.trim();
  if (!name) { toast('Nom requis', 'error'); return; }

  const ingredients = [];
  $$('#recipe-ingredients-table tbody tr').forEach(row => {
    const ingName = row.querySelector('.ing-name').value.trim();
    const qty     = parseFloat(row.querySelector('.ing-qty').value) || null;
    const unit    = row.querySelector('.ing-unit').value.trim();
    const ingId   = parseInt(row.querySelector('.ing-id').value) || 0;
    if (ingName) ingredients.push({ingredient_id: ingId||null, ingredient_name: ingName, quantity: qty, unit});
  });

  const payload = {
    id,
    name,
    description:  $('#rf-description').value,
    category:     $('#rf-category').value,
    prep_time:    parseInt($('#rf-prep-time').value)||0,
    cook_time:    parseInt($('#rf-cook-time').value)||0,
    servings:     parseInt($('#rf-servings').value)||4,
    instructions: $('#rf-instructions').value,
    image_url:    $('#rf-image-url').value,
    ingredients,
  };

  const res = await post('save_recipe', payload);
  if (res.error) { toast(res.error,'error'); return; }

  toast(id ? 'Recette modifiée !' : 'Recette ajoutée !');
  closeModal('recipe-form-modal');
  loadAllRecipes();
}

async function deleteRecipe(id) {
  if (!confirm('Supprimer cette recette ?')) return;
  const res = await del('delete_recipe', {id});
  if (res.error) { toast(res.error,'error'); return; }
  toast('Recette supprimée');
  loadAllRecipes();
}

// ---- RECHERCHE RECETTES dans le manager ----
let searchTimeout;
function onRecipeSearch(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const cat = $('.filter-chip.active:not([data-cat="all"])')?.dataset.cat || '';
    loadAllRecipes(cat, val);
  }, 300);
}

function filterByCategory(chip) {
  $$('.filter-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  const cat = chip.dataset.cat === 'all' ? '' : chip.dataset.cat;
  loadAllRecipes(cat, $('#recipe-search-input').value || '');
}

// ---- SEMAINES ----
function switchWeek(offset) {
  App.currentWeekOffset = offset;
  loadWeek();
}

function prevWeek() {
  if (App.currentWeekOffset > 0) {
    App.currentWeekOffset--;
    loadWeek();
  }
}

function nextWeek() {
  if (App.currentWeekOffset < 3) {
    App.currentWeekOffset++;
    loadWeek();
  }
}

// ---- GOOGLE CALENDAR ----
async function openGoogleCalendar() {
  const res = await api('google_auth_url');
  if (res.url) {
    const confirmed = confirm('Ouvrir la connexion Google Calendar ? (Nécessite la configuration OAuth2 dans php/config.php)');
    if (confirmed) window.open(res.url, '_blank', 'width=600,height=700');
  }
}

// ---- TABS ----
function switchTab(btn, panelId) {
  const container = btn.closest('.tabs').parentElement;
  $$('.tab-btn', container).forEach(b => b.classList.remove('active'));
  $$('.tab-panel', container).forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  $(`#${panelId}`, container).classList.add('active');
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  // Initialiser les semaines
  for (let i = 0; i < 4; i++) {
    const tab = document.querySelectorAll('.week-tab')[i];
    if (tab) {
      tab.addEventListener('click', () => switchWeek(i));
    }
  }

  // Bouton modal close
  $$('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  // Initialiser les couleurs/icones
  renderColorPicker();
  renderIconPicker();

  // Charger la semaine
  loadWeek();
});
