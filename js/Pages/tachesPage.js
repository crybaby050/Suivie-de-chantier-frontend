import { escapeHtml } from "../Utils/html.js";
import { showToast } from "../Components/toast.js";
import { getSession } from "../Utils/auth.js";
import { getTaches, updateTache } from "../Services/tacheService.js";
import { getAffectationsByUtilisateur, getAffectationsByTache, updateStatutAffectation } from "../Services/affectationService.js";
import { getPhases } from "../Services/phaseService.js";
import { getProjets } from "../Services/projetService.js";
import { getPhotosByTache, createPhoto } from "../Services/photoService.js";
import { uploadImageCloudinary } from "../Services/cloudinaryService.js";
import { calculerStatutGlobalTache } from "../Utils/tacheStatutHelpers.js";

// ─── État local ───────────────────────────────────────────────────────────────
let allTaches       = [];
let allAffectations = []; // affectations DE L'OUVRIER CONNECTÉ uniquement
let allPhases       = [];
let allProjets      = [];
let photosByTache    = {};
let openPhotoForm    = null;
let currentFilter    = "Tout";

// Statuts (personnels) que l'ouvrier peut librement retravailler
const STATUTS_EDITABLES = ["En cours", "Renvoyer"];
// Statuts (personnels) totalement verrouillés pour l'ouvrier
const STATUTS_VERROUILLES = ["En attente", "Valider", "Terminer"];

// ─── Rendu principal ──────────────────────────────────────────────────────────
export async function renderTachesPage() {
  const app     = document.getElementById("app");
  const session = getSession();

  app.innerHTML = `
    <div class="grid min-h-[60vh] place-items-center">
      <div class="flex flex-col items-center gap-3">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-bordure border-t-primary"></div>
        <p class="text-sm font-semibold text-muted">Chargement...</p>
      </div>
    </div>
  `;

  [allAffectations, allTaches, allPhases, allProjets] = await Promise.all([
    getAffectationsByUtilisateur(session.id),
    getTaches(),
    getPhases(),
    getProjets(),
  ]);

  const tacheIds = allAffectations.map(a => a.tacheId);
  allTaches = allTaches.filter(t => tacheIds.includes(t.id));

  await chargerPhotos();

  renderPage();
}

async function chargerPhotos() {
  const entries = await Promise.all(
    allTaches.map(async t => [t.id, await getPhotosByTache(t.id)])
  );
  photosByTache = Object.fromEntries(entries);
}

// ─── Rendu page ───────────────────────────────────────────────────────────────
function renderPage() {
  const app = document.getElementById("app");

  const FILTERS = ["Tout", "A faire", "En cours", "En attente", "Renvoyer", "Valider"];

  const filtered = allTaches.filter(t => {
    if (currentFilter === "Tout") return true;
    const affectation = allAffectations.find(a => a.tacheId === t.id);
    const statutPersonnel = affectation?.statutPersonnel ?? "Non commencer";
    const statutAffiche = statutPersonnel === "Non commencer" ? "A faire" : statutPersonnel;
    return statutAffiche === currentFilter;
  });

  const compterParStatut = (label) => allTaches.filter(t => {
    const affectation = allAffectations.find(a => a.tacheId === t.id);
    const statutPersonnel = affectation?.statutPersonnel ?? "Non commencer";
    const statutAffiche = statutPersonnel === "Non commencer" ? "A faire" : statutPersonnel;
    return statutAffiche === label;
  }).length;

  const stats = [
    { label: "Total",       value: allTaches.length,                      icon: "fa-list-check",   bg: "bg-primary/10",   color: "text-primary" },
    { label: "À faire",     value: compterParStatut("A faire"),           icon: "fa-circle",       bg: "bg-attente/10",   color: "text-attente" },
    { label: "En cours",    value: compterParStatut("En cours"),          icon: "fa-spinner",      bg: "bg-secondary/10", color: "text-secondary" },
    { label: "Validées",    value: compterParStatut("Valider"),           icon: "fa-circle-check", bg: "bg-succes/10",    color: "text-succes" },
  ];

  app.innerHTML = `
    <div class="space-y-5">

      <div>
        <h1 class="text-2xl font-black text-texte sm:text-3xl">Mes tâches</h1>
        <p class="mt-1 text-sm text-muted">Suivez et mettez à jour l'avancement de vos tâches assignées</p>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        ${stats.map(s => `
          <div class="rounded-2xl bg-carte p-4 shadow-card">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${s.bg}">
                <i class="fa-solid ${s.icon} text-sm ${s.color}"></i>
              </div>
              <div>
                <p class="text-xs text-muted">${s.label}</p>
                <p class="text-xl font-black text-texte">${s.value}</p>
              </div>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="flex flex-wrap gap-2">
        ${FILTERS.map(f => `
          <button
            class="filter-btn rounded-xl px-4 py-2 text-sm font-bold transition
              ${currentFilter === f
                ? "bg-primary text-white shadow-soft"
                : "bg-carte text-muted border border-bordure hover:bg-fond hover:text-primary"}"
            data-filter="${f}"
          >
            ${f}
          </button>
        `).join("")}
      </div>

      <p class="text-xs text-muted">${filtered.length} tâche(s) affichée(s)</p>

      <div id="tachesContent" class="space-y-3">
        ${filtered.length === 0
          ? `
            <div class="rounded-2xl border border-dashed border-bordure bg-carte py-16 text-center">
              <i class="fa-solid fa-list-check text-3xl text-muted/30"></i>
              <p class="mt-3 text-sm font-semibold text-muted">Aucune tâche trouvée.</p>
            </div>
          `
          : filtered.map(tache => renderTacheCard(tache)).join("")
        }
      </div>

    </div>
  `;

  bindEvents();
}

// ─── Card tâche ───────────────────────────────────────────────────────────────
function renderTacheCard(tache) {
  const phase       = allPhases.find(p => p.id === tache.phaseId);
  const projet      = allProjets.find(p => p.id === phase?.projetId);
  const affectation = allAffectations.find(a => a.tacheId === tache.id);
  const statutPersonnel = affectation?.statutPersonnel ?? "Non commencer";
  const progression = tache.progression ?? 0;
  const photos      = photosByTache[tache.id] ?? [];

  // Toute la logique d'affichage se base sur LA PROPRE affectation de l'ouvrier,
  // pas sur le statut global de la tâche (qui dépend de tous les ouvriers assignés).
  const estEditable   = STATUTS_EDITABLES.includes(statutPersonnel);
  const estAFaire     = statutPersonnel === "Non commencer";
  const estRenvoyee   = statutPersonnel === "Renvoyer";
  const estEnAttente  = statutPersonnel === "En attente";
  const estValidee    = STATUTS_VERROUILLES.includes(statutPersonnel) && !estEnAttente;
  const peutAjouterPhoto = !estValidee;

  const statutAffiche = estAFaire ? "A faire" : statutPersonnel;

  return `
    <div class="rounded-2xl border border-bordure bg-carte p-5 shadow-card transition hover:shadow-soft" data-tache-id="${escapeHtml(tache.id)}">

      <div class="mb-4 flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            ${getStatutBadge(statutAffiche)}
            ${projet ? `<span class="text-xs text-muted">${escapeHtml(projet.nom)}</span>` : ""}
            ${phase ? `<span class="text-xs text-muted">→ ${escapeHtml(phase.libelle)}</span>` : ""}
          </div>
          <h3 class="font-black text-texte">${escapeHtml(tache.titre)}</h3>
          ${tache.description ? `<p class="mt-1 text-sm text-muted line-clamp-2">${escapeHtml(tache.description)}</p>` : ""}
        </div>
      </div>

      ${estRenvoyee ? `
        <div class="mb-4 flex items-start gap-2 rounded-xl bg-bloque/10 px-3 py-2.5 text-xs font-semibold text-bloque">
          <i class="fa-solid fa-triangle-exclamation mt-0.5"></i>
          <span>Votre contribution vous a été renvoyée par le chef de chantier. Corrigez et resoumettez.</span>
        </div>
      ` : ""}

      ${estEnAttente ? `
        <div class="mb-4 flex items-start gap-2 rounded-xl bg-attente/10 px-3 py-2.5 text-xs font-semibold text-attente">
          <i class="fa-solid fa-hourglass-half mt-0.5"></i>
          <span>Votre partie est en attente de validation du chef de chantier.</span>
        </div>
      ` : ""}

      ${estValidee ? `
        <div class="mb-4 flex items-start gap-2 rounded-xl bg-succes/10 px-3 py-2.5 text-xs font-semibold text-succes">
          <i class="fa-solid fa-circle-check mt-0.5"></i>
          <span>Votre contribution a été validée. Aucune modification possible.</span>
        </div>
      ` : ""}

      <div class="mb-4 flex flex-wrap gap-4 text-xs text-muted">
        <div class="flex items-center gap-1.5">
          <i class="fa-solid fa-calendar-days text-primary/50"></i>
          <span>Début : <strong class="text-texte">${formatDate(tache.dateDeDebut)}</strong></span>
        </div>
        <div class="flex items-center gap-1.5">
          <i class="fa-solid fa-calendar-check text-primary/50"></i>
          <span>Fin : <strong class="text-texte">${formatDate(tache.dateDeFin)}</strong></span>
        </div>
      </div>

      <div class="mb-4">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-xs font-bold text-texte">Progression</span>
          <span class="text-xs font-black text-primary">${progression}%</span>
        </div>
        <div class="h-2.5 w-full overflow-hidden rounded-full bg-fond">
          <div class="h-2.5 rounded-full transition-all duration-500 ${getProgressionColor(progression)}" style="width:${progression}%"></div>
        </div>
      </div>

      ${estEditable ? `
        <div class="mb-4">
          <label class="mb-1.5 block text-xs font-bold text-muted">Mettre à jour la progression</label>
          <input
            type="range"
            class="progression-slider w-full accent-primary"
            data-tache-id="${escapeHtml(tache.id)}"
            min="0" max="100" step="5"
            value="${progression}"
          />
          <div class="mt-1 flex justify-between text-[10px] text-muted">
            <span>0%</span>
            <span id="sliderValue-${escapeHtml(tache.id)}">${progression}%</span>
            <span>100%</span>
          </div>
        </div>
      ` : ""}

      <div class="mb-4 border-t border-bordure pt-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-bold text-texte">
            <i class="fa-solid fa-camera text-primary/60"></i> Photos (${photos.length})
          </span>
          ${peutAjouterPhoto ? `
            <button class="btn-toggle-photo text-xs font-bold text-primary hover:underline" data-tache-id="${escapeHtml(tache.id)}">
              ${openPhotoForm === tache.id ? "Fermer" : "+ Ajouter"}
            </button>
          ` : ""}
        </div>

        ${photos.length > 0 ? `
          <div class="mb-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            ${photos.map(p => `
              <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" class="block aspect-square overflow-hidden rounded-lg">
                <img src="${escapeHtml(p.url)}" alt="Photo tâche" class="h-full w-full object-cover" />
              </a>
            `).join("")}
          </div>
        ` : ""}

        ${openPhotoForm === tache.id ? renderPhotoUploadForm(tache.id) : ""}
      </div>

      <div class="flex flex-wrap items-center justify-end gap-3 border-t border-bordure pt-4">

        ${estAFaire ? `
          <button
            class="btn-commencer flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-secondary"
            data-tache-id="${escapeHtml(tache.id)}"
            data-affectation-id="${escapeHtml(affectation?.id ?? "")}"
          >
            <i class="fa-solid fa-play text-xs"></i>
            Démarrer la tâche
          </button>
        ` : ""}

        ${estEditable ? `
          <button
            class="btn-save-progression flex items-center gap-2 rounded-xl border border-bordure bg-fond px-4 py-2 text-xs font-bold text-texte transition hover:bg-carte"
            data-tache-id="${escapeHtml(tache.id)}"
            data-affectation-id="${escapeHtml(affectation?.id ?? "")}"
          >
            <i class="fa-solid fa-floppy-disk text-xs"></i>
            Enregistrer la progression
          </button>

          <button
            class="btn-terminer flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-soft transition
              ${progression === 100 ? "bg-succes hover:bg-succes/80" : "cursor-not-allowed bg-muted/30"}"
            data-tache-id="${escapeHtml(tache.id)}"
            data-affectation-id="${escapeHtml(affectation?.id ?? "")}"
            ${progression !== 100 ? "disabled" : ""}
            title="${progression !== 100 ? "Disponible une fois la progression à 100%" : "Soumettre votre partie pour validation"}"
          >
            <i class="fa-solid fa-flag-checkered text-xs"></i>
            Marquer ma partie comme terminée
          </button>
        ` : ""}

      </div>
    </div>
  `;
}

function renderPhotoUploadForm(tacheId) {
  const id = escapeHtml(tacheId);
  return `
    <div class="rounded-2xl border border-bordure bg-fond p-4">
      <label for="photoInput-${id}" class="photo-dropzone group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-bordure bg-carte px-4 py-6 text-center transition hover:border-primary hover:bg-primary/5" data-tache-id="${id}">
        <div id="photoPreviewWrap-${id}" class="hidden">
          <img id="photoPreview-${id}" class="mx-auto h-28 w-28 rounded-xl object-cover shadow-card" />
          <p id="photoFileName-${id}" class="mt-2 max-w-[200px] truncate text-[11px] text-muted"></p>
        </div>
        <div id="photoPlaceholder-${id}" class="flex flex-col items-center gap-2">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:scale-110">
            <i class="fa-solid fa-cloud-arrow-up text-base"></i>
          </div>
          <p class="text-xs font-bold text-texte">Cliquez ou glissez une photo ici</p>
          <p class="text-[10px] text-muted">JPG, PNG — 10 Mo max</p>
        </div>
      </label>

      <input type="file" accept="image/*" id="photoInput-${id}" class="photo-file-input hidden" data-tache-id="${id}" />

      <div class="mt-3 flex items-center justify-end gap-2">
        <button class="btn-cancel-photo rounded-xl border border-bordure bg-carte px-4 py-2 text-xs font-bold text-muted transition hover:bg-fond" data-tache-id="${id}">
          Annuler
        </button>
        <button class="btn-save-photo flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40" data-tache-id="${id}" disabled>
          <i class="fa-solid fa-upload text-xs"></i>
          Envoyer
        </button>
      </div>
    </div>
  `;
}

// ─── Événements ───────────────────────────────────────────────────────────────
function bindEvents() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      renderPage();
    });
  });

  document.querySelectorAll(".progression-slider").forEach(slider => {
    slider.addEventListener("input", () => {
      const valueEl = document.getElementById(`sliderValue-${slider.dataset.tacheId}`);
      if (valueEl) valueEl.textContent = `${slider.value}%`;

      const card = slider.closest("[data-tache-id]");
      const btnTerminer = card?.querySelector(".btn-terminer");
      if (btnTerminer) {
        const complet = Number(slider.value) === 100;
        btnTerminer.disabled = !complet;
        btnTerminer.classList.toggle("bg-succes", complet);
        btnTerminer.classList.toggle("hover:bg-succes/80", complet);
        btnTerminer.classList.toggle("bg-muted/30", !complet);
        btnTerminer.classList.toggle("cursor-not-allowed", !complet);
      }
    });
  });

  document.querySelectorAll(".btn-commencer").forEach(btn => {
    btn.addEventListener("click", () => handleCommencer(btn.dataset.tacheId, btn.dataset.affectationId, btn));
  });

  document.querySelectorAll(".btn-save-progression").forEach(btn => {
    btn.addEventListener("click", () => handleEnregistrerProgression(btn.dataset.tacheId, btn.dataset.affectationId, btn));
  });

  document.querySelectorAll(".btn-terminer").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      handleTerminer(btn.dataset.tacheId, btn.dataset.affectationId, btn);
    });
  });

  document.querySelectorAll(".btn-toggle-photo").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.tacheId;
      openPhotoForm = openPhotoForm === id ? null : id;
      renderPage();
    });
  });

  document.querySelectorAll(".btn-cancel-photo").forEach(btn => {
    btn.addEventListener("click", () => {
      openPhotoForm = null;
      renderPage();
    });
  });

  document.querySelectorAll(".photo-file-input").forEach(input => {
    input.addEventListener("change", () => {
      if (input.files?.[0]) afficherApercuPhoto(input.dataset.tacheId, input.files[0]);
    });
  });

  document.querySelectorAll(".photo-dropzone").forEach(zone => {
    const tacheId = zone.dataset.tacheId;
    const input = document.getElementById(`photoInput-${tacheId}`);

    zone.addEventListener("dragover", e => {
      e.preventDefault();
      zone.classList.add("border-primary", "bg-primary/5");
    });
    zone.addEventListener("dragleave", () => {
      zone.classList.remove("border-primary", "bg-primary/5");
    });
    zone.addEventListener("drop", e => {
      e.preventDefault();
      zone.classList.remove("border-primary", "bg-primary/5");
      const file = e.dataTransfer.files?.[0];
      if (file && input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        afficherApercuPhoto(tacheId, file);
      }
    });
  });

  document.querySelectorAll(".btn-save-photo").forEach(btn => {
    btn.addEventListener("click", () => handleAjouterPhoto(btn.dataset.tacheId, btn));
  });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

// Recalcule le statut global de la tâche à partir de TOUTES les affectations
// (tous les ouvriers, pas seulement celui connecté), et le synchronise.
async function recalculerEtSynchroniserTache(tacheId) {
  const tache = allTaches.find(t => t.id === tacheId);
  if (!tache) return tache;

  const affectations = await getAffectationsByTache(tacheId);
  const nouveauStatut = calculerStatutGlobalTache(affectations) ?? tache.statutTache;

  if (nouveauStatut !== tache.statutTache) {
    await updateTache(tacheId, { ...tache, statutTache: nouveauStatut });
  }
  return { ...tache, statutTache: nouveauStatut };
}

async function handleCommencer(tacheId, affectationId, btn) {
  if (!affectationId) return;

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin text-xs"></i> Démarrage...`;

  try {
    await updateStatutAffectation(affectationId, "En cours");
    const tacheMaj = await recalculerEtSynchroniserTache(tacheId);

    const idxT = allTaches.findIndex(t => t.id === tacheId);
    if (idxT !== -1) allTaches[idxT] = tacheMaj;

    const idxA = allAffectations.findIndex(a => a.id === affectationId);
    if (idxA !== -1) allAffectations[idxA] = { ...allAffectations[idxA], statutPersonnel: "En cours" };

    showToast("Tâche démarrée.");
    renderPage();
  } catch (err) {
    showToast(err.message, "error");
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-play text-xs"></i> Démarrer la tâche`;
  }
}

async function handleEnregistrerProgression(tacheId, affectationId, btn) {
  const tache = allTaches.find(t => t.id === tacheId);
  const card  = document.querySelector(`[data-tache-id="${tacheId}"]`);
  const slider = card?.querySelector(".progression-slider");
  if (!tache || !slider) return;

  const progression = Number(slider.value);
  const affectation = allAffectations.find(a => a.id === affectationId);

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin text-xs"></i> Enregistrement...`;

  try {
    // Si l'ouvrier avait été renvoyé, le fait de retravailler dessus repasse SA contribution "En cours"
    if (affectation?.statutPersonnel === "Renvoyer") {
      await updateStatutAffectation(affectationId, "En cours");
      const idxA = allAffectations.findIndex(a => a.id === affectationId);
      if (idxA !== -1) allAffectations[idxA] = { ...allAffectations[idxA], statutPersonnel: "En cours" };
    }

    await updateTache(tacheId, { ...tache, progression });
    const tacheMaj = await recalculerEtSynchroniserTache(tacheId);

    const idxT = allTaches.findIndex(t => t.id === tacheId);
    if (idxT !== -1) allTaches[idxT] = { ...tacheMaj, progression };

    showToast("Progression enregistrée.");
    renderPage();
  } catch (err) {
    showToast(err.message, "error");
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-floppy-disk text-xs"></i> Enregistrer la progression`;
  }
}

async function handleTerminer(tacheId, affectationId, btn) {
  if (!affectationId) return;

  const confirme = window.confirm(
    "Marquer votre partie comme terminée ? Elle attendra la validation du chef de chantier."
  );
  if (!confirme) return;

  const tache = allTaches.find(t => t.id === tacheId);
  if (!tache) return;

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin text-xs"></i> Envoi...`;

  try {
    await updateStatutAffectation(affectationId, "En attente");
    await updateTache(tacheId, { ...tache, progression: 100 });
    const tacheMaj = await recalculerEtSynchroniserTache(tacheId);

    const idxT = allTaches.findIndex(t => t.id === tacheId);
    if (idxT !== -1) allTaches[idxT] = { ...tacheMaj, progression: 100 };

    const idxA = allAffectations.findIndex(a => a.id === affectationId);
    if (idxA !== -1) allAffectations[idxA] = { ...allAffectations[idxA], statutPersonnel: "En attente" };

    showToast("Votre partie a été soumise, en attente de validation.");
    renderPage();
  } catch (err) {
    showToast(err.message, "error");
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-flag-checkered text-xs"></i> Marquer ma partie comme terminée`;
  }
}

function afficherApercuPhoto(tacheId, file) {
  const previewWrap  = document.getElementById(`photoPreviewWrap-${tacheId}`);
  const preview      = document.getElementById(`photoPreview-${tacheId}`);
  const fileName     = document.getElementById(`photoFileName-${tacheId}`);
  const placeholder  = document.getElementById(`photoPlaceholder-${tacheId}`);
  const card         = document.querySelector(`[data-tache-id="${tacheId}"]`);
  const btnSave      = card?.querySelector(".btn-save-photo");

  if (!previewWrap || !preview) return;

  preview.src = URL.createObjectURL(file);
  if (fileName) fileName.textContent = file.name;
  previewWrap.classList.remove("hidden");
  placeholder?.classList.add("hidden");

  if (btnSave) btnSave.disabled = false;
}

async function handleAjouterPhoto(tacheId, btn) {
  const card  = document.querySelector(`[data-tache-id="${tacheId}"]`);
  const input = card?.querySelector(".photo-file-input");
  if (!input) return;

  const file = input.files?.[0];
  if (!file) {
    showToast("Veuillez sélectionner une image.", "error");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin text-xs"></i> Envoi...`;

  try {
    const url = await uploadImageCloudinary(file);
    await createPhoto({ tacheId, url });

    photosByTache[tacheId] = await getPhotosByTache(tacheId);
    openPhotoForm = null;

    showToast("Photo ajoutée.");
    renderPage();
  } catch (err) {
    showToast(err.message, "error");
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-upload text-xs"></i> Envoyer`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatutBadge(statut) {
  const MAP = {
    "A faire":   "bg-attente/10 text-attente",
    "En cours":  "bg-secondary/10 text-secondary",
    "En attente":"bg-attente/10 text-attente",
    "Valider":   "bg-succes/10 text-succes",
    "Renvoyer":  "bg-bloque/10 text-bloque",
    "Terminer":  "bg-succes/10 text-succes",
  };
  const cls = MAP[statut] ?? "bg-muted/10 text-muted";
  return `<span class="rounded-full px-2.5 py-1 text-xs font-bold ${cls}">${escapeHtml(statut ?? "—")}</span>`;
}

function getProgressionColor(pct) {
  if (pct === 100) return "bg-succes";
  if (pct >= 60)   return "bg-secondary";
  if (pct >= 30)   return "bg-attente";
  return "bg-bloque";
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}