import { escapeHtml } from "../Utils/html.js";
import { showToast } from "../Components/toast.js";
import { openConfirm } from "../Components/modal.js";
import { getTaches, updateTache } from "../Services/tacheService.js";
import { getPhases } from "../Services/phaseService.js";
import { getProjets } from "../Services/projetService.js";
import { getUtilisateurs } from "../Services/utilisateurService.js";
import { getAffectationsByTache, updateStatutAffectation } from "../Services/affectationService.js";
import { getPhotosByTache } from "../Services/photoService.js";
import { calculerStatutGlobalTache } from "../Utils/tacheStatutHelpers.js";

let allTaches = [];
let allPhases = [];
let allProjets = [];
let allUtilisateurs = [];
let affectationsByTache = {};
let photosByTache = {};
let currentFilter = "En attente";

export async function renderValidationTachesPage() {
    const app = document.getElementById("app");

    app.innerHTML = `
    <div class="grid min-h-[60vh] place-items-center">
      <div class="flex flex-col items-center gap-3">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-bordure border-t-primary"></div>
        <p class="text-sm font-semibold text-muted">Chargement...</p>
      </div>
    </div>
  `;

    [allTaches, allPhases, allProjets, allUtilisateurs] = await Promise.all([
        getTaches(),
        getPhases(),
        getProjets(),
        getUtilisateurs(),
    ]);

    const entriesAff = await Promise.all(
        allTaches.map(async t => [t.id, await getAffectationsByTache(t.id)])
    );
    affectationsByTache = Object.fromEntries(entriesAff);

    const entriesPhotos = await Promise.all(
        allTaches.map(async t => [t.id, await getPhotosByTache(t.id)])
    );
    photosByTache = Object.fromEntries(entriesPhotos);

    renderPage();
}

function renderPage() {
    const app = document.getElementById("app");
    const FILTERS = ["En attente", "En cours", "Valider", "Tout"];

    const filtered = allTaches.filter(t => currentFilter === "Tout" || t.statutTache === currentFilter);

    app.innerHTML = `
    <div class="space-y-5">
      <div>
        <h1 class="text-2xl font-black text-texte sm:text-3xl">Validation des tâches</h1>
        <p class="mt-1 text-sm text-muted">Vérifiez le travail soumis par les ouvriers et validez chaque contribution</p>
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

      <div class="space-y-3">
        ${filtered.length === 0 ? `
          <div class="rounded-2xl border border-dashed border-bordure bg-carte py-16 text-center">
            <i class="fa-solid fa-list-check text-3xl text-muted/30"></i>
            <p class="mt-3 text-sm font-semibold text-muted">Aucune tâche trouvée.</p>
          </div>
        ` : filtered.map(t => renderTacheValidationCard(t)).join("")}
      </div>
    </div>
  `;

    bindEvents();
}

function renderTacheValidationCard(tache) {
    const phase = allPhases.find(p => p.id === tache.phaseId);
    const projet = allProjets.find(p => p.id === phase?.projetId);
    const affectations = affectationsByTache[tache.id] ?? [];
    const photos = photosByTache[tache.id] ?? [];

    return `
    <div class="rounded-2xl border border-bordure bg-carte p-5 shadow-card" data-tache-id="${escapeHtml(tache.id)}">
      <div class="mb-3 flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            ${getStatutBadge(tache.statutTache)}
            ${projet ? `<span class="text-xs text-muted">${escapeHtml(projet.nom)}</span>` : ""}
            ${phase ? `<span class="text-xs text-muted">→ ${escapeHtml(phase.libelle)}</span>` : ""}
          </div>
          <h3 class="font-black text-texte">${escapeHtml(tache.titre)}</h3>
        </div>
        <span class="flex-shrink-0 text-xs font-black text-primary">${tache.progression ?? 0}%</span>
      </div>

      <div class="mb-4 space-y-2">
        <p class="text-xs font-black uppercase tracking-wider text-muted">Ouvriers assignés</p>
        ${affectations.length === 0
            ? `<p class="text-xs italic text-muted">Aucun ouvrier assigné.</p>`
            : affectations.map(a => renderAffectationRow(a, tache.id)).join("")}
      </div>

      <div class="border-t border-bordure pt-4">
        <p class="mb-2 text-xs font-black uppercase tracking-wider text-muted">Photos (${photos.length})</p>
        ${photos.length === 0
            ? `<p class="text-xs italic text-muted">Aucune photo.</p>`
            : `
            <div class="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              ${photos.map(p => `
                <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" class="block aspect-square overflow-hidden rounded-lg">
                  <img src="${escapeHtml(p.url)}" alt="Photo tâche" class="h-full w-full object-cover" />
                </a>
              `).join("")}
            </div>
          `}
      </div>
    </div>
  `;
}

function renderAffectationRow(affectation, tacheId) {
    const user = allUtilisateurs.find(u => u.id === affectation.utilisateurId);
    const nom = user ? escapeHtml(user.nom) : "Utilisateur inconnu";
    const statut = affectation.statutPersonnel;

    const BADGE = {
        "Non commencer": "bg-muted/10 text-muted",
        "En cours": "bg-secondary/10 text-secondary",
        "En attente": "bg-attente/10 text-attente",
        "Valider": "bg-succes/10 text-succes",
        "Renvoyer": "bg-bloque/10 text-bloque",
    };
    const cls = BADGE[statut] ?? "bg-muted/10 text-muted";

    return `
    <div class="flex items-center gap-3 rounded-xl bg-fond p-3">
      <span class="flex-1 truncate text-sm font-semibold text-texte">${nom}</span>
      <span class="rounded-full px-2.5 py-1 text-xs font-bold ${cls}">${escapeHtml(statut ?? "—")}</span>
      ${statut === "En attente" ? `
        <div class="flex flex-shrink-0 gap-1.5">
          <button
            class="btn-valider-affectation flex items-center gap-1 rounded-lg bg-succes px-3 py-1.5 text-xs font-bold text-white transition hover:bg-succes/80"
            data-affectation-id="${escapeHtml(affectation.id)}"
            data-tache-id="${escapeHtml(tacheId)}"
            title="Valider cette contribution"
          >
            <i class="fa-solid fa-check text-xs"></i>
          </button>
          <button
            class="btn-renvoyer-affectation flex items-center gap-1 rounded-lg border border-bordure bg-carte px-3 py-1.5 text-xs font-bold text-muted transition hover:bg-bloque/10 hover:text-bloque"
            data-affectation-id="${escapeHtml(affectation.id)}"
            data-tache-id="${escapeHtml(tacheId)}"
            title="Renvoyer à l'ouvrier"
          >
            <i class="fa-solid fa-rotate-left text-xs"></i>
          </button>
        </div>
      ` : ""}
    </div>
  `;
}

function bindEvents() {
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentFilter = btn.dataset.filter;
            renderPage();
        });
    });

    document.querySelectorAll(".btn-valider-affectation").forEach(btn => {
        btn.addEventListener("click", () => handleValiderAffectation(btn.dataset.affectationId, btn.dataset.tacheId));
    });

    document.querySelectorAll(".btn-renvoyer-affectation").forEach(btn => {
        btn.addEventListener("click", () => handleRenvoyerAffectation(btn.dataset.affectationId, btn.dataset.tacheId));
    });
}

async function handleValiderAffectation(affectationId, tacheId) {
    try {
        await updateStatutAffectation(affectationId, "Valider");
        await recalculerEtSynchroniserTache(tacheId);
        showToast("Contribution validée.");
        await renderValidationTachesPage();
    } catch (err) {
        showToast(err.message, "error");
    }
}

function handleRenvoyerAffectation(affectationId, tacheId) {
    openConfirm({
        message: "Renvoyer cette contribution à l'ouvrier pour correction ?",
        confirmLabel: "Renvoyer",
        onConfirm: async () => {
            try {
                await updateStatutAffectation(affectationId, "Renvoyer");
                await recalculerEtSynchroniserTache(tacheId);
                showToast("Contribution renvoyée.");
                await renderValidationTachesPage();
            } catch (err) {
                showToast(err.message, "error");
            }
        },
    });
}

async function recalculerEtSynchroniserTache(tacheId) {
    const tache = allTaches.find(t => t.id === tacheId);
    if (!tache) return;

    const affectations = await getAffectationsByTache(tacheId);
    const nouveauStatut = calculerStatutGlobalTache(affectations);

    if (nouveauStatut && nouveauStatut !== tache.statutTache) {
        await updateTache(tacheId, { ...tache, statutTache: nouveauStatut });
    }
}

function getStatutBadge(statut) {
    const MAP = {
        "A faire": "bg-attente/10 text-attente",
        "En cours": "bg-secondary/10 text-secondary",
        "En attente": "bg-attente/10 text-attente",
        "Valider": "bg-succes/10 text-succes",
        "Renvoyer": "bg-bloque/10 text-bloque",
        "Terminer": "bg-succes/10 text-succes",
    };
    const cls = MAP[statut] ?? "bg-muted/10 text-muted";
    return `<span class="rounded-full px-2.5 py-1 text-xs font-bold ${cls}">${escapeHtml(statut ?? "—")}</span>`;
}