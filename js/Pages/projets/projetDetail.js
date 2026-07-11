import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openConfirm } from "../../Components/modal.js";
import { canManage } from "../../Utils/auth.js";
import { updateProjet } from "../../Services/projetService.js";
import { getStatutBadge, formatDate, getInitials } from "./projetsHelpers.js";
import { allUtilisateurs } from "./projetsState.js";
import { openProjetForm } from "./projetForm.js";
import { openPhaseForm } from "./phaseForm.js";
import { openTacheForm } from "./tacheForm.js";
import { openTacheDetail } from "./tacheDetail.js";
import { calculerProgressionPhase, calculerProgressionProjet } from "../../Utils/progressionHelpers.js";

export async function renderProjetDetail(projetId) {
    const app = document.getElementById("app");

    app.innerHTML = `
    <div class="grid min-h-[60vh] place-items-center">
      <div class="flex flex-col items-center gap-3">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-bordure border-t-primary"></div>
        <p class="text-sm font-semibold text-muted">Chargement...</p>
      </div>
    </div>
  `;

    const { getPhasesByProjet } = await import("../../Services/phaseService.js");
    const { getProjet } = await import("../../Services/projetService.js");
    const { getTachesByPhase } = await import("../../Services/tacheService.js");
    const { getAffectationsByTache } = await import("../../Services/affectationService.js");

    const [projet, phases] = await Promise.all([
        getProjet(projetId),
        getPhasesByProjet(projetId),
    ]);

    const tachesParPhase = await Promise.all(phases.map(p => getTachesByPhase(p.id)));

    const tachesByPhaseId = {};
    phases.forEach((p, i) => { tachesByPhaseId[p.id] = tachesParPhase[i]; });

    // Progression calculée dynamiquement, jamais stockée en base
    const phasesAvecProgression = phases.map(p => ({
        ...p,
        progression: calculerProgressionPhase(tachesByPhaseId[p.id] ?? []),
    }));
    const progressionProjet = calculerProgressionProjet(phasesAvecProgression);

    const toutesLesTaches = tachesParPhase.flat();
    const affectationsParTache = await Promise.all(
        toutesLesTaches.map(t => getAffectationsByTache(t.id))
    );

    const affectationsByTacheId = {};
    toutesLesTaches.forEach((t, i) => { affectationsByTacheId[t.id] = affectationsParTache[i]; });

    const chef = allUtilisateurs.find(u => u.roleGlobal === "Chef de chantier");
    const client = allUtilisateurs.find(u => u.roleGlobal === "Client");
    const membres = allUtilisateurs.filter(u => u.roleGlobal === "Ouvrier");

    let activeTab = "overview";

    function reload() {
        return renderProjetDetail(projetId);
    }

    function renderDetail() {
        app.innerHTML = `
      <div class="space-y-5">

        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button id="btnRetour" class="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted transition hover:text-primary">
              <i class="fa-solid fa-arrow-left text-xs"></i> Retour aux projets
            </button>
            <h1 class="text-2xl font-black text-texte sm:text-3xl">Projets</h1>
            <p class="mt-1 text-sm text-muted">Contrôler et suivre la progression de vos chantiers en temps réel</p>
          </div>
          ${canManage() ? `
  <div class="flex flex-shrink-0 flex-wrap gap-2">
    ${projet.statutProjet === "Planifier" ? `
      <button id="btnDemarrerProjet" class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-secondary">
        <i class="fa-solid fa-play text-xs"></i>
        <span>Démarrer le projet</span>
      </button>
    ` : ""}
    ${projet.statutProjet === "En cours" ? `
      <button
        id="btnTerminerProjet"
        class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-soft transition
          ${toutesLesPhasesTerminees(phases) ? "bg-succes hover:bg-succes/80" : "cursor-not-allowed bg-muted/30"}"
        ${toutesLesPhasesTerminees(phases) ? "" : "disabled"}
        title="${toutesLesPhasesTerminees(phases) ? "Terminer le projet" : "Disponible une fois toutes les phases terminées"}"
      >
        <i class="fa-solid fa-flag-checkered text-xs"></i>
        <span>Terminer le projet</span>
      </button>
    ` : ""}
    ${projet.statutProjet === "Terminer" ? `
      <button id="btnReprendreProjet" class="flex items-center gap-2 rounded-xl border border-bordure bg-carte px-4 py-2.5 text-sm font-bold text-texte shadow-card transition hover:bg-fond">
        <i class="fa-solid fa-rotate-left text-xs"></i>
        <span>Reprendre le projet</span>
      </button>
    ` : ""}
    <button id="btnRapport2" class="flex items-center gap-2 rounded-xl border border-bordure bg-carte px-4 py-2.5 text-sm font-bold text-texte shadow-card transition hover:bg-fond">
      <i class="fa-solid fa-file-lines text-xs"></i>
      <span class="hidden sm:inline">Rapport</span>
    </button>
    <button id="btnNewProjet2" class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-secondary">
      <i class="fa-solid fa-plus text-xs"></i>
      <span>Nouveau projet</span>
    </button>
  </div>
` : ""}
        </div>

        <div class="flex items-end justify-between border-b border-bordure">
          <div class="flex gap-1">
            <button class="tab-btn px-4 py-2.5 text-sm font-bold transition border-b-2 ${activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted hover:text-primary"}" data-tab="overview">
              Vue d'ensemble
            </button>
            <button class="tab-btn px-4 py-2.5 text-sm font-bold transition border-b-2 ${activeTab === "phases" ? "border-primary text-primary" : "border-transparent text-muted hover:text-primary"}" data-tab="phases">
              Phase
            </button>
          </div>
          ${canManage() ? `
            <button id="btnArchiver" class="mb-1 flex items-center gap-2 rounded-xl bg-inactif/10 px-3 py-1.5 text-xs font-bold text-inactif transition hover:bg-inactif/20">
              <i class="fa-solid fa-box-archive text-xs"></i> Archiver
            </button>
          ` : ""}
        </div>

        <div id="tabContent">
            ${activeTab === "overview"
                ? renderOverviewTab({ ...projet, progression: progressionProjet }, chef, client, membres)
                : renderPhasesTab(phasesAvecProgression, projetId, tachesByPhaseId, affectationsByTacheId)}
        </div>

      </div>
    `;

        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                activeTab = btn.dataset.tab;
                renderDetail();
            });
        });

        document.getElementById("btnRetour")?.addEventListener("click", async () => {
            const { renderProjetsPage } = await import("./projetsPage.js");
            await renderProjetsPage();
        });

        document.getElementById("btnModifier")?.addEventListener("click", () => {
            openProjetForm(projet, reload);
        });

        document.getElementById("btnArchiver")?.addEventListener("click", () => {
            openConfirm({
                message: `Archiver le projet "${projet.nom}" ?`,
                confirmLabel: "Archiver",
                onConfirm: async () => {
                    try {
                        await updateProjet(projet.id, { ...projet, statutProjet: "Suspendu" });
                        showToast("Projet archivé.");
                        const { renderProjetsPage } = await import("./projetsPage.js");
                        await renderProjetsPage();
                    } catch (err) {
                        showToast(err.message, "error");
                    }
                }
            });
        });

        document.getElementById("btnDemarrerProjet")?.addEventListener("click", async () => {
            try {
                await updateProjet(projet.id, { ...projet, statutProjet: "En cours" });
                showToast("Projet démarré.");
                await reload();
            } catch (err) {
                showToast(err.message, "error");
            }
        });

        document.getElementById("btnTerminerProjet")?.addEventListener("click", async () => {
            if (!toutesLesPhasesTerminees(phases)) return;
            openConfirm({
                message: `Marquer le projet "${projet.nom}" comme terminé ?`,
                confirmLabel: "Terminer",
                onConfirm: async () => {
                    try {
                        await updateProjet(projet.id, { ...projet, statutProjet: "Terminer" });
                        showToast("Projet terminé.");
                        await reload();
                    } catch (err) {
                        showToast(err.message, "error");
                    }
                },
            });
        });

        document.getElementById("btnReprendreProjet")?.addEventListener("click", async () => {
            try {
                await updateProjet(projet.id, { ...projet, statutProjet: "En cours" });
                showToast("Projet repris.");
                await reload();
            } catch (err) {
                showToast(err.message, "error");
            }
        });

        // Nouvelle tâche (une phase à la fois)
        document.querySelectorAll(".btn-add-tache").forEach(btn => {
            btn.addEventListener("click", () => {
                openTacheForm(btn.dataset.phaseId, reload);
            });
        });

        // Clic sur une ligne de tâche → détail
        document.querySelectorAll(".tache-row").forEach(row => {
            row.addEventListener("click", () => {
                const tacheId = row.dataset.tacheId;
                const phaseId = row.dataset.phaseId;
                const taches = tachesByPhaseId[phaseId] ?? [];
                const tache = taches.find(t => t.id === tacheId);
                const affectations = affectationsByTacheId[tacheId] ?? [];
                openTacheDetail(tache, affectations, phaseId, reload);
            });
        });

        // Nouvelle phase
        document.getElementById("btnNouvellePhase")?.addEventListener("click", () => {
            openPhaseForm(projetId, reload);
        });

        // Filtres phases
        document.querySelectorAll(".phase-filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".phase-filter-btn").forEach(b => {
                    b.classList.remove("bg-primary", "text-white");
                    b.classList.add("bg-carte", "text-muted", "border", "border-bordure");
                });
                btn.classList.add("bg-primary", "text-white");
                btn.classList.remove("bg-carte", "text-muted", "border", "border-bordure");
            });
        });
    }

    renderDetail();
}

function toutesLesPhasesTerminees(phases) {
    return phases.length > 0 && phases.every(p => p.statutPhase === "Terminer");
}

// ─── Onglet Vue d'ensemble ────────────────────────────────────────────────────
function renderOverviewTab(projet, chef, client, membres) {
    const progression = projet.progression ?? 0;
    const statut = getStatutBadge(projet.statutProjet);

    return `
    <div class="grid gap-5 lg:grid-cols-2">
      <div class="space-y-4">

        <div class="rounded-2xl border border-bordure bg-carte p-5 shadow-card">
          <h2 class="mb-4 text-base font-black text-texte">Projet information</h2>
          <div class="space-y-3">
            ${[
            { label: "Client", value: client?.nom ?? "—" },
            { label: "Chef de chantier", value: chef?.nom ?? "—" },
            { label: "Date de début", value: formatDate(projet.dateDeDebut) },
            { label: "Date de fin", value: formatDate(projet.dateDeFinPrevue) },
            { label: "Adresse", value: projet.adresse },
        ].map(row => `
              <div class="flex items-center justify-between border-b border-bordure pb-2 last:border-0 last:pb-0">
                <span class="text-sm font-bold text-texte">${row.label}</span>
                <span class="text-sm text-muted">${escapeHtml(row.value ?? "—")}</span>
              </div>
            `).join("")}
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-texte">Statut</span>
              ${statut}
            </div>
          </div>
          ${canManage() ? `
            <div class="mt-4 flex gap-2">
              <button id="btnModifier" class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-secondary">
                <i class="fa-solid fa-pen text-xs"></i> Modifier
              </button>
              <button class="flex items-center gap-2 rounded-xl border border-bordure bg-carte px-4 py-2 text-sm font-bold text-muted transition hover:bg-fond">
                <i class="fa-solid fa-box-archive text-xs"></i> Archiver
              </button>
            </div>
          ` : ""}
        </div>

        ${projet.description ? `
          <div class="rounded-2xl border border-bordure bg-carte p-5 shadow-card">
            <h2 class="mb-3 text-base font-black text-texte">Description</h2>
            <p class="text-sm leading-6 text-muted">${escapeHtml(projet.description)}</p>
          </div>
        ` : ""}

      </div>

      <div class="space-y-4">
        <div class="rounded-2xl border border-bordure bg-carte p-5 shadow-card">
          <h2 class="mb-4 text-base font-black text-texte">Progression de l'ensemble</h2>
          <p class="text-4xl font-black text-primary">${progression} %</p>
          <div class="my-3 h-3 w-full overflow-hidden rounded-full bg-fond">
            <div class="h-3 rounded-full bg-primary transition-all" style="width:${progression}%"></div>
          </div>
          <p class="text-sm text-muted">${progression}% complété</p>
        </div>

        <div class="rounded-2xl border border-bordure bg-carte p-5 shadow-card">
          <h2 class="mb-4 text-base font-black text-texte">Membres</h2>
          <div class="space-y-3">
            ${chef ? renderMembreRow(chef, "Chef de chantier") : ""}
            ${membres.map(m => renderMembreRow(m, "Ouvrier")).join("")}
            ${client ? renderMembreRow(client, "Client") : ""}
            ${!chef && membres.length === 0 && !client
            ? `<p class="text-sm text-muted">Aucun membre assigné.</p>`
            : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMembreRow(membre, role) {
    const ROLE_COLORS = {
        "Chef de chantier": "bg-role-chef/10 text-role-chef",
        "Ouvrier": "bg-role-ouvrier/10 text-role-ouvrier",
        "Client": "bg-role-client/10 text-role-client",
        "Admin": "bg-role-admin/10 text-role-admin",
    };
    const color = ROLE_COLORS[role] ?? "bg-muted/10 text-muted";

    return `
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <i class="fa-solid fa-user text-xs"></i>
      </div>
      <span class="flex-1 text-sm font-semibold text-texte">${escapeHtml(membre.nom)}</span>
      <span class="rounded-full border border-bordure px-2.5 py-1 text-xs font-bold ${color}">${role}</span>
    </div>
  `;
}

// ─── Onglet Phases (+ tâches) ─────────────────────────────────────────────────
function renderPhasesTab(phases, projetId, tachesByPhaseId, affectationsByTacheId) {
    const FILTERS = ["Tout", "En cours", "Terminer", "Ordre"];

    return `
    <div class="space-y-4">

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap gap-2">
          ${FILTERS.map((f, i) => `
            <button class="phase-filter-btn rounded-xl px-4 py-2 text-sm font-bold transition ${i === 0 ? "bg-primary text-white" : "bg-carte text-muted border border-bordure hover:bg-fond"}">
              ${f}
            </button>
          `).join("")}
        </div>
        ${canManage() ? `
          <button id="btnNouvellePhase" class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-secondary">
            <i class="fa-solid fa-plus text-xs"></i> Nouvelle phase
          </button>
        ` : ""}
      </div>

      <div class="space-y-3">
        ${phases.length === 0
            ? `
            <div class="rounded-2xl border border-dashed border-bordure bg-carte py-12 text-center">
              <i class="fa-solid fa-layer-group text-3xl text-muted/30"></i>
              <p class="mt-3 text-sm font-semibold text-muted">Aucune phase créée.</p>
            </div>
          `
            : phases.map(phase => renderPhaseCard(
                phase,
                tachesByPhaseId[phase.id] ?? [],
                affectationsByTacheId
            )).join("")
        }
      </div>
    </div>
  `;
}

function renderPhaseCard(phase, taches, affectationsByTacheId) {
    const progression = phase.progression ?? 0;

    return `
    <div class="rounded-2xl border border-bordure bg-carte p-5 shadow-card">
      <div class="flex gap-4">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
          ${phase.ordre}
        </div>

        <div class="flex-1 min-w-0">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-black text-texte">Phase ${phase.ordre} : ${escapeHtml(phase.libelle)}</h3>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-texte">${taches.length}</span>
              <span class="text-xs text-muted">Tâches</span>
            </div>
          </div>
          <p class="mb-3 text-xs text-muted">
            <span class="font-semibold">Début :</span> ${formatDate(phase.dateDeDebut)}
            &nbsp;&nbsp;
            <span class="font-semibold">Fin :</span> ${formatDate(phase.dateDeFinPrevue)}
          </p>
          <p class="mb-2 text-xs font-bold text-texte">Progression</p>
          <div class="h-2 w-full overflow-hidden rounded-full bg-fond">
            <div class="h-2 rounded-full bg-primary transition-all" style="width:${progression}%"></div>
          </div>
        </div>

        ${canManage() ? `
          <div class="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
            <button class="btn-edit-phase flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-secondary" data-phase-id="${escapeHtml(phase.id)}">
              <i class="fa-solid fa-pen text-xs"></i> Modifier
            </button>
            <button class="btn-delete-phase flex items-center gap-1.5 rounded-xl border border-bordure bg-carte px-3 py-1.5 text-xs font-bold text-muted transition hover:bg-bloque/10 hover:text-bloque" data-phase-id="${escapeHtml(phase.id)}">
              <i class="fa-solid fa-box-archive text-xs"></i> Archive
            </button>
          </div>
        ` : ""}
      </div>

      <!-- Tâches de la phase -->
      <div class="mt-4 border-t border-bordure pt-4">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-xs font-black uppercase tracking-wider text-muted">Tâches</p>
          ${canManage() ? `
            <button class="btn-add-tache flex items-center gap-1 text-xs font-bold text-primary transition hover:text-secondary" data-phase-id="${escapeHtml(phase.id)}">
              <i class="fa-solid fa-plus text-[10px]"></i> Ajouter
            </button>
          ` : ""}
        </div>
        ${taches.length === 0
            ? `<p class="text-xs italic text-muted">Aucune tâche pour cette phase.</p>`
            : `
            <div class="space-y-2">
              ${taches.map(t => renderTacheRow(t, affectationsByTacheId[t.id] ?? [], phase.id)).join("")}
            </div>
          `}
      </div>
    </div>
  `;
}

function renderTacheRow(tache, affectations, phaseId) {
    const statut = getStatutBadge(tache.statutTache);
    const progression = tache.progression ?? 0;
    const assignes = affectations
        .map(a => allUtilisateurs.find(u => u.id === a.utilisateurId))
        .filter(Boolean);

    return `
    <div class="tache-row flex cursor-pointer items-center gap-3 rounded-xl bg-fond p-3 transition hover:bg-fond/70" data-tache-id="${escapeHtml(tache.id)}" data-phase-id="${escapeHtml(phaseId)}">
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-texte">${escapeHtml(tache.titre)}</p>
        <div class="mt-1 h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-bordure/40">
          <div class="h-1.5 rounded-full bg-primary" style="width:${progression}%"></div>
        </div>
      </div>
      <div class="flex flex-shrink-0 -space-x-2">
        ${assignes.slice(0, 3).map(u => `
          <div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-fond bg-primary/10 text-[10px] font-black text-primary" title="${escapeHtml(u.nom)}">
            ${getInitials(u.nom)}
          </div>
        `).join("")}
        ${assignes.length > 3 ? `<div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-fond bg-muted/10 text-[10px] font-black text-muted">+${assignes.length - 3}</div>` : ""}
        ${assignes.length === 0 ? `<span class="text-xs italic text-muted">Non assignée</span>` : ""}
      </div>
      <div class="flex-shrink-0">${statut}</div>
    </div>
  `;
}