import { getSession, isAdmin, isChef, isOuvrier, isClient } from "../Utils/auth.js";
import { getProjets } from "../Services/projetService.js";
import { getTaches } from "../Services/tacheService.js";
import { getUtilisateurs } from "../Services/utilisateurService.js";
import { escapeHtml } from "../Utils/html.js";
import { getPhases } from "../Services/phaseService.js";
import { calculerProgressionPhase, calculerProgressionProjet } from "../Utils/progressionHelpers.js";
import { filtrerProjetsAccessibles } from "../Utils/projetAccessHelpers.js";
import { showBrickLoader, brickCycleDelay } from "../Utils/pageLoader.js";

export async function renderDashboardPage() {
  const app = document.getElementById("app");
  const session = getSession();

  const stopLoader = showBrickLoader(app);

  // Chargement des données
  const [projetsBruts, tachesBrutes, utilisateurs, phases] = await Promise.all([
    getProjets(),
    getTaches(),
    isAdmin() ? getUtilisateurs() : Promise.resolve([]),
    getPhases(),
    brickCycleDelay(),
  ]);

  const projets = await filtrerProjetsAccessibles(projetsBruts, session);
  const projetIdsAccessibles = new Set(projets.map(p => p.id));
  const phasesAccessibles = phases.filter(ph => projetIdsAccessibles.has(ph.projetId));
  const phaseIdsAccessibles = new Set(phasesAccessibles.map(ph => ph.id));
  const taches = tachesBrutes.filter(t => phaseIdsAccessibles.has(t.phaseId));

  const progressionParProjet = {};
  projets.forEach(projet => {
    const phasesDuProjet = phases.filter(p => p.projetId === projet.id);
    const phasesAvecProgression = phasesDuProjet.map(phase => ({
      ...phase,
      progression: calculerProgressionPhase(taches.filter(t => t.phaseId === phase.id)),
    }));
    progressionParProjet[projet.id] = calculerProgressionProjet(phasesAvecProgression);
  });

  // Calculs stats
  const projetsActifs = projets.filter(p => p.statutProjet === "En cours");
  const projetTermines = projets.filter(p => p.statutProjet === "Terminer");


  const tachesEnAttente = taches.filter(t => t.statutTache === "A faire");
  const tachesEnCours = taches.filter(t => t.statutTache === "En cours");
  const tachesTerminees = taches.filter(t => t.statutTache === "Terminer");
  const tachesAValider = taches.filter(t => t.statutTache === "Valider");

  const progressionGlobale = taches.length
    ? Math.round(taches.reduce((sum, t) => sum + (t.progression || 0), 0) / taches.length)
    : 0;

  // Stats selon rôle
  const stats = buildStats({ projets, projetsActifs, projetTermines, taches, tachesEnCours, tachesTerminees, utilisateurs, progressionGlobale });

  stopLoader();
  app.innerHTML = `
    <div class="space-y-6">

      <!-- En-tête -->
      <div>
        <h1 class="text-2xl font-black text-texte sm:text-3xl">
          Bonjour, ${escapeHtml(session?.nom ?? "—")} 👋
        </h1>
        <p class="mt-1 text-sm text-muted">
          Vue d'ensemble de la plateforme — ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <!-- Cards stats -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        ${stats.map(stat => `
          <div class="rounded-2xl bg-carte p-4 shadow-card sm:p-5">
            <div class="flex items-start justify-between">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-muted sm:text-sm">${stat.label}</p>
                <p class="mt-1 text-2xl font-black text-texte sm:text-3xl">${stat.value}</p>
                ${stat.sub ? `<p class="mt-1 text-xs text-muted">${stat.sub}</p>` : ""}
              </div>
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${stat.iconBg}">
                <i class="fa-solid ${stat.icon} text-sm ${stat.iconColor}"></i>
              </div>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Corps principal -->
      <div class="grid gap-4 lg:grid-cols-5">

        <!-- Évolution des projets récents -->
        <div class="rounded-2xl bg-carte p-5 shadow-card lg:col-span-3">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-base font-black text-texte">Évolution des projets récents</h2>
              <p class="text-xs text-muted">${projets.length} projet(s) au total</p>
            </div>
            <button
              data-page="projets"
              class="rounded-xl border border-bordure px-3 py-1.5 text-xs font-bold text-muted transition hover:bg-fond hover:text-primary"
            >
              Voir tout
            </button>
          </div>

          <div class="space-y-4">
            ${projets.length === 0
      ? `<p class="py-6 text-center text-sm text-muted">Aucun projet enregistré.</p>`
      : projets.slice(0, 5).map(projet => {
        const progression = progressionParProjet[projet.id] ?? 0;
        const statutColor = getStatutColor(projet.statutProjet);

        return `
                    <div class="group">
                      <div class="mb-1.5 flex items-center justify-between">
                        <div class="flex items-center gap-2 min-w-0">
                          <div class="h-2 w-2 flex-shrink-0 rounded-full ${statutColor.dot}"></div>
                          <span class="truncate text-sm font-semibold text-texte">${escapeHtml(projet.nom)}</span>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span class="text-xs text-muted">${progression}%</span>
                          <button
                            data-page="projets"
                            class="text-xs font-bold text-secondary opacity-0 transition group-hover:opacity-100"
                          >
                            Voir plus
                          </button>
                        </div>
                      </div>
                      <div class="h-2 w-full overflow-hidden rounded-full bg-fond">
                        <div
                          class="h-2 rounded-full transition-all duration-500 ${statutColor.bar}"
                          style="width: ${progression}%"
                        ></div>
                      </div>
                    </div>
                  `;
      }).join("")
    }
          </div>
        </div>

        <!-- Tâches en attente -->
        <div class="rounded-2xl bg-carte p-5 shadow-card lg:col-span-2">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-base font-black text-texte">Tâches en attente</h2>
              <p class="text-xs text-muted">${tachesEnAttente.length} tâche(s) à traiter</p>
            </div>
            ${!isClient() ? `
              <button
                data-page="taches"
                class="rounded-xl border border-bordure px-3 py-1.5 text-xs font-bold text-muted transition hover:bg-fond hover:text-primary"
              >
                Voir tout
              </button>
            ` : ""}
          </div>

          <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
            ${tachesEnAttente.length === 0
      ? `<p class="py-6 text-center text-sm text-muted">Aucune tâche en attente.</p>`
      : tachesEnAttente.slice(0, 6).map(tache => `
                <div class="flex items-start gap-3 rounded-xl bg-fond p-3">
                  <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-attente/10">
                    <i class="fa-solid fa-clock text-xs text-attente"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-texte">${escapeHtml(tache.titre)}</p>
                    <p class="text-xs text-muted">
                      Échéance : ${tache.dateDeFin
          ? new Date(tache.dateDeFin).toLocaleDateString("fr-FR")
          : "—"}
                    </p>
                  </div>
                  <span class="flex-shrink-0 rounded-full bg-attente/10 px-2 py-0.5 text-[10px] font-bold text-attente">
                    À faire
                  </span>
                </div>
              `).join("")
    }
          </div>
        </div>

      </div>

      <!-- Ligne du bas : tâches en cours + résumé statuts -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl bg-carte p-4 shadow-card">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
              <i class="fa-solid fa-spinner text-sm text-secondary"></i>
            </div>
            <div>
              <p class="text-xs text-muted">En cours</p>
              <p class="text-xl font-black text-texte">${tachesEnCours.length}</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl bg-carte p-4 shadow-card">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-succes/10">
              <i class="fa-solid fa-circle-check text-sm text-succes"></i>
            </div>
            <div>
              <p class="text-xs text-muted">Terminées</p>
              <p class="text-xl font-black text-texte">${tachesTerminees.length}</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl bg-carte p-4 shadow-card">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-attente/10">
              <i class="fa-solid fa-hourglass-half text-sm text-attente"></i>
            </div>
            <div>
              <p class="text-xs text-muted">À valider</p>
              <p class="text-xl font-black text-texte">${tachesAValider.length}</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl bg-carte p-4 shadow-card">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <i class="fa-solid fa-chart-line text-sm text-primary"></i>
            </div>
            <div>
              <p class="text-xs text-muted">Progression globale</p>
              <p class="text-xl font-black text-texte">${progressionGlobale}%</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  // Réattacher les événements de navigation sur les boutons "Voir tout" / "Voir plus"
  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { navigate } = await import("../router.js");
      await navigate(btn.dataset.page);
    });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildStats({ projets, projetsActifs, projetTermines, taches, tachesEnCours, tachesTerminees, utilisateurs, progressionGlobale }) {
  if (isAdmin()) {
    return [
      { label: "Projets actifs", value: projetsActifs.length, sub: `${projets.length} au total`, icon: "fa-building", iconBg: "bg-primary/10", iconColor: "text-primary" },
      { label: "Progression moyenne", value: `${progressionGlobale}%`, sub: "sur toutes les tâches", icon: "fa-chart-pie", iconBg: "bg-secondary/10", iconColor: "text-secondary" },
      { label: "Utilisateurs", value: utilisateurs.length, sub: "comptes actifs", icon: "fa-users", iconBg: "bg-role-admin/10", iconColor: "text-role-admin" },
      { label: "Projets achevés", value: projetTermines.length, sub: `${projets.length} au total`, icon: "fa-circle-check", iconBg: "bg-succes/10", iconColor: "text-succes" },
    ];
  }
  if (isChef()) {
    return [
      { label: "Mes projets", value: projetsActifs.length, sub: `${projets.length} au total`, icon: "fa-building", iconBg: "bg-primary/10", iconColor: "text-primary" },
      { label: "Tâches en cours", value: tachesEnCours.length, sub: "à superviser", icon: "fa-list-check", iconBg: "bg-secondary/10", iconColor: "text-secondary" },
      { label: "Tâches terminées", value: tachesTerminees.length, sub: "complétées", icon: "fa-circle-check", iconBg: "bg-succes/10", iconColor: "text-succes" },
      { label: "Progression globale", value: `${progressionGlobale}%`, sub: "sur toutes les tâches", icon: "fa-chart-pie", iconBg: "bg-accent/10", iconColor: "text-accent" },
    ];
  }
  if (isOuvrier()) {
    return [
      { label: "Mes tâches", value: taches.length, sub: "assignées", icon: "fa-list-check", iconBg: "bg-role-ouvrier/10", iconColor: "text-role-ouvrier" },
      { label: "En cours", value: tachesEnCours.length, sub: "à compléter", icon: "fa-spinner", iconBg: "bg-secondary/10", iconColor: "text-secondary" },
      { label: "Terminées", value: tachesTerminees.length, sub: "complétées", icon: "fa-circle-check", iconBg: "bg-succes/10", iconColor: "text-succes" },
      { label: "Progression", value: `${progressionGlobale}%`, sub: "de mes tâches", icon: "fa-chart-pie", iconBg: "bg-primary/10", iconColor: "text-primary" },
    ];
  }
  // Client
  return [
    { label: "Projets suivis", value: projets.length, sub: "en cours", icon: "fa-building", iconBg: "bg-primary/10", iconColor: "text-primary" },
    { label: "Avancement", value: `${progressionGlobale}%`, sub: "progression globale", icon: "fa-chart-pie", iconBg: "bg-secondary/10", iconColor: "text-secondary" },
    { label: "Projets actifs", value: projetsActifs.length, sub: "en cours", icon: "fa-spinner", iconBg: "bg-attente/10", iconColor: "text-attente" },
    { label: "Projets achevés", value: projetTermines.length, sub: "terminés", icon: "fa-circle-check", iconBg: "bg-succes/10", iconColor: "text-succes" },
  ];
}

function getStatutColor(statut) {
  const colors = {
    "En cours": { dot: "bg-secondary", bar: "bg-secondary" },
    "Planifier": { dot: "bg-attente", bar: "bg-attente" },
    "Terminer": { dot: "bg-succes", bar: "bg-succes" },
    "Suspendu": { dot: "bg-inactif", bar: "bg-inactif" },
  };
  return colors[statut] ?? { dot: "bg-muted", bar: "bg-muted" };
}