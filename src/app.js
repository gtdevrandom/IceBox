// src/app.js
import { db, CATEGORIES_COLLECTION, ITEMS_COLLECTION, now } from "./firebase.js";
import {
  collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* DOM */
const el = id => document.getElementById(id);
const categoriesEl = el("categories");
const categorySelect = el("category-select");
const btnAddCat = el("btn-add-cat");
const modal = el("modal");
const modalCancel = el("modal-cancel");
const modalSave = el("modal-save");
const newCatName = el("new-cat-name");
const searchInput = el("search");
const itemsList = el("items-list");
const itemNameInput = el("item-name");
const itemQtyInput = el("item-qty");
const btnAddItem = el("btn-add-item");

let categories = [];
let items = [];
let activeCategoryId = null;
let searchTerm = "";

/* --- Categories --- */
const categoriesCol = collection(db, CATEGORIES_COLLECTION);
const itemsCol = collection(db, ITEMS_COLLECTION);

function uid(){ return Math.random().toString(36).slice(2,9); }

/* realtime listeners */
onSnapshot(query(categoriesCol, orderBy("createdAt")), snap => {
  categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCategories();
  populateCategorySelect();
});

onSnapshot(query(itemsCol, orderBy("createdAt", "desc")), snap => {
  items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderItems();
});

/* create category */
btnAddCat.addEventListener("click", () => {
  modal.classList.remove("hidden");
  newCatName.value = "";
  newCatName.focus();
});
modalCancel.addEventListener("click", () => modal.classList.add("hidden"));
modalSave.addEventListener("click", async () => {
  const name = newCatName.value.trim();
  if(!name) return;
  try {
    await addDoc(categoriesCol, { name, createdAt: now() });
    modal.classList.add("hidden");
  } catch(e) { console.error(e); alert("Erreur création catégorie"); }
});

/* populate category select (for add item) */
function populateCategorySelect(){
  categorySelect.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "Choisir catégorie";
  categorySelect.appendChild(optAll);
  categories.forEach(c => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name;
    categorySelect.appendChild(o);
  });
}

/* render categories as pills */
function renderCategories(){
  categoriesEl.innerHTML = "";
  // count items per category
  const counts = items.reduce((acc,it)=>{ acc[it.categoryId] = (acc[it.categoryId]||0)+1; return acc }, {});
  categories.forEach(c => {
    const pill = document.createElement("button");
    pill.className = "cat-pill" + (activeCategoryId === c.id ? " active" : "");
    pill.innerHTML = `<span>${c.name}</span><small class="count">${counts[c.id]||0}</small>`;
    pill.addEventListener("click", () => {
      activeCategoryId = activeCategoryId === c.id ? null : c.id;
      renderCategories();
      renderItems();
    });
    categoriesEl.appendChild(pill);
  });
}

/* --- Items CRUD --- */

/* add item */
btnAddItem.addEventListener("click", async () => {
  const name = itemNameInput.value.trim();
  const qty = Number(itemQtyInput.value) || 0;
  const categoryId = categorySelect.value;
  if(!name || !categoryId){ alert("Donne un nom et choisis une catégorie"); return; }

  const cat = categories.find(c => c.id === categoryId);
  try {
    await addDoc(itemsCol, {
      name,
      quantity: qty,
      categoryId,
      categoryName: cat ? cat.name : "Sans catégorie",
      createdAt: now()
    });
    itemNameInput.value = "";
    itemQtyInput.value = 1;
  } catch(e){ console.error(e); alert("Erreur ajout item"); }
});

/* render items (grouped by category) */
function renderItems(){
  const term = (searchTerm || "").toLowerCase().trim();
  // filter by search (global) and optional category selection
  let list = items.filter(it => {
    if(activeCategoryId && it.categoryId !== activeCategoryId) return false;
    if(!term) return true;
    return (it.name || "").toLowerCase().includes(term) || (it.categoryName||"").toLowerCase().includes(term);
  });

  // group by categoryName
  const groups = {};
  list.forEach(it => {
    const key = it.categoryName || "Sans catégorie";
    groups[key] = groups[key] || [];
    groups[key].push(it);
  });

  itemsList.innerHTML = "";
  if(list.length === 0){
    itemsList.innerHTML = `<p style="color:var(--muted)">Aucun item trouvé.</p>`;
    return;
  }

  Object.keys(groups).forEach(catName => {
    const groupWrap = document.createElement("div");
    groupWrap.className = "group";
    groupWrap.innerHTML = `<h4>${catName} — ${groups[catName].length}</h4>`;
    groups[catName].forEach(it => {
      const itemEl = document.createElement("div");
      itemEl.className = "item";
      itemEl.innerHTML = `
        <div class="left">
          <div>
            <div class="name">${escapeHtml(it.name)}</div>
            <div class="meta" style="font-size:12px;color:var(--muted)">${it.createdAt ? "" : ""}</div>
          </div>
        </div>
        <div class="right">
          <div class="qty-controls" data-id="${it.id}">
            <button class="icon-small btn-dec" title="Retirer">-</button>
            <span class="qty-value">${it.quantity}</span>
            <button class="icon-small btn-inc" title="Ajouter">+</button>
            <button class="icon-small btn-edit" title="Modifier">✎</button>
            <button class="icon-small btn-del btn-danger" title="Supprimer">🗑</button>
          </div>
        </div>
      `;
      // events
      const btnInc = itemEl.querySelector(".btn-inc");
      const btnDec = itemEl.querySelector(".btn-dec");
      const btnDel = itemEl.querySelector(".btn-del");
      const btnEdit = itemEl.querySelector(".btn-edit");
      const qtySpan = itemEl.querySelector(".qty-value");

      btnInc.addEventListener("click", () => adjustQty(it.id, it.quantity + 1));
      btnDec.addEventListener("click", () => adjustQty(it.id, Math.max(0, it.quantity - 1)));
      btnDel.addEventListener("click", () => deleteItemConfirm(it.id));
      btnEdit.addEventListener("click", () => promptEditQty(it));

      itemsList.appendChild(groupWrap);
      groupWrap.appendChild(itemEl);
    });
  });
}

/* helpers */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* adjust quantity */
async function adjustQty(id, newQty){
  try {
    const d = doc(db, ITEMS_COLLECTION, id);
    await updateDoc(d, { quantity: newQty });
  } catch(e){ console.error(e); alert("Erreur mise à jour quantité"); }
}

/* prompt edit */
function promptEditQty(it){
  const val = prompt(`Modifier quantité pour "${it.name}"`, String(it.quantity));
  if(val === null) return;
  const q = Number(val);
  if(isNaN(q) || q < 0){ alert("Quantité invalide"); return; }
  adjustQty(it.id, q);
}

/* delete confirm */
async function deleteItemConfirm(id){
  if(!confirm("Supprimer cet item définitivement ?")) return;
  try {
    const d = doc(db, ITEMS_COLLECTION, id);
    await deleteDoc(d);
  } catch(e){ console.error(e); alert("Erreur suppression"); }
}

/* search */
searchInput.addEventListener("input", (e) => {
  searchTerm = e.target.value;
  renderItems();
});

/* optional: delete category if empty (not implemented) */

/* initial render */
renderCategories();
renderItems();
