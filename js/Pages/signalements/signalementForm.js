import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openModal } from "../../Components/modal.js";
import { createFormValidator, Rules } from "../../Utils/formValidator.js";
import { createSignalement } from "../../Services/signalementService.js";
import { getPhasesByProjet } from "../../Services/phaseService.js";
import { getTachesByPhase } from "../../Services/tacheService.js";
import { getRapportsByProjet } from "../../Services/rapportService.js";
import { getSession } from "../../Utils/auth.js";
import { formatDateCourte, getCibleInfo } from "./signalementsHelpers.js";

const SIGNALEMENT_SCHEMA = {
    signalementCibleType: { rules: [Rules.required("Le type de cible est obligatoire.")], transform: v => v, as: "cibleType" },
    signalementTitre: { rules: [Rules.required("Le titre est obligatoire."), Rules.minLength(3, "Minimum 3 caractères.")], transform: v => v.trim(), as: "titre" },
    signalementDescription: { rules: [], transform: v => v.trim(), as: "description" },
};

const SIGNALEMENT_SCHEMA_RAPIDE = {
    signalementTitre: { rules: [Rules.required("Le titre est obligatoire."), Rules.minLength(3, "Minimum 3 caractères.")], transform: v => v.trim(), as: "titre" },
    signalementDescription: { rules: [], transform: v => v.trim(), as: "description" },
};

/**
 * @param {object[]} projets - liste de projets, utilisée uniquement si aucune préselection
 * @param {Function} onSuccess
 * @param {object|null} [preselection] - { cibleType, cibleLabel, projetId, phaseId?, tacheId?, rapportId? }
 *   Si fourni, la cible est déjà connue : le formulaire n'affiche que titre + description.
 */
export function openSignalementForm(projets = [], onSuccess, preselection = null) {
    let validator;
    const session = getSession();

    openModal({
        title: "Nouveau signalement",
        icon: "fa-triangle-exclamation",
        confirmLabel: "Signaler",
        confirmIcon: "fa-flag",
        confirmClass: "bg-bloque shadow-bloque/20 hover:bg-bloque/80",
        body: preselection ? signalementFormBodyRapide(preselection) : signalementFormBody(projets),
        onMount: modal => {
            validator = createFormValidator(modal, preselection ? SIGNALEMENT_SCHEMA_RAPIDE : SIGNALEMENT_SCHEMA);
            if (!preselection) bindCascade(modal, projets, session);
        },
        onConfirm: async () => {
            const data = validator.validate();
            if (!data) return false;

            let cibleType, cibleData;

            if (preselection) {
                cibleType = preselection.cibleType;
                cibleData = {
                    projetId: preselection.projetId,
                    phaseId: preselection.phaseId ?? null,
                    tacheId: preselection.tacheId ?? null,
                    rapportId: preselection.rapportId ?? null,
                };
            } else {
                cibleType = data.cibleType;
                const zone = document.getElementById("signalementCibleZone");
                cibleData = lireCibleSelectionnee(zone, cibleType);
                if (!cibleData) {
                    showToast("Veuillez sélectionner une cible valide.", "error");
                    return false;
                }
            }

            try {
                await createSignalement({
                    cibleType,
                    titre: data.titre,
                    description: data.description,
                    ...cibleData,
                });
                showToast("Signalement envoyé.");
                await onSuccess();
                return true;
            } catch (err) {
                showToast(err.message, "error");
                return false;
            }
        },
    });
}

function signalementFormBody(projets) {
    return `
    <div class="grid gap-4">
      <div>
        <label for="signalementCibleType" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Type de cible <span class="text-bloque">*</span>
        </label>
        <select id="signalementCibleType"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Sélectionner...</option>
          <option value="Projet">Projet</option>
          <option value="Phase">Phase</option>
          <option value="Tache">Tâche</option>
          <option value="Rapport">Rapport</option>
        </select>
      </div>

      <div id="signalementCibleZone">
        <p class="text-xs italic text-muted">Choisissez d'abord un type de cible.</p>
      </div>

      <div>
        <label for="signalementTitre" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Titre <span class="text-bloque">*</span>
        </label>
        <input type="text" id="signalementTitre"
          placeholder="ex: Retard de livraison"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label for="signalementDescription" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Description
        </label>
        <textarea id="signalementDescription" rows="4"
          placeholder="Décrivez le problème..."
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
        ></textarea>
      </div>
    </div>
  `;
}

function signalementFormBodyRapide(preselection) {
  const info = getCibleInfo(preselection.cibleType);

  return `
    <div class="grid gap-4">
      <div class="flex items-center gap-3 rounded-xl bg-fond p-3">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${info.bg} ${info.color}">
          <i class="fa-solid ${info.icon} text-sm"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs text-muted">${info.label} signalé(e)</p>
          <p class="truncate text-sm font-bold text-texte">${escapeHtml(preselection.cibleLabel ?? "")}</p>
        </div>
      </div>

      <div>
        <label for="signalementTitre" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Titre <span class="text-bloque">*</span>
        </label>
        <input type="text" id="signalementTitre"
          placeholder="ex: Retard de livraison"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label for="signalementDescription" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Description
        </label>
        <textarea id="signalementDescription" rows="4"
          placeholder="Décrivez le problème..."
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
        ></textarea>
      </div>
    </div>
  `;
}

function bindCascade(modal, projets, session) {
    const cibleTypeSelect = modal.querySelector("#signalementCibleType");
    const zone = modal.querySelector("#signalementCibleZone");

    cibleTypeSelect.addEventListener("change", async () => {
        const type = cibleTypeSelect.value;

        if (type === "Projet") {
            zone.innerHTML = renderSelectProjet(projets);
            return;
        }

        if (type === "Phase") {
            zone.innerHTML = renderSelectProjet(projets, "cibleProjetPourPhase") + `<div id="cibleSousZone" class="mt-3"></div>`;
            zone.querySelector("#cibleProjetPourPhase").addEventListener("change", async e => {
                const phases = e.target.value ? await getPhasesByProjet(e.target.value) : [];
                zone.querySelector("#cibleSousZone").innerHTML = renderSelectPhase(phases);
            });
            return;
        }

        if (type === "Tache") {
            zone.innerHTML = renderSelectProjet(projets, "cibleProjetPourTache") + `<div id="cibleSousZone" class="mt-3"></div>`;
            zone.querySelector("#cibleProjetPourTache").addEventListener("change", async e => {
                const phases = e.target.value ? await getPhasesByProjet(e.target.value) : [];
                const sousZone = zone.querySelector("#cibleSousZone");
                sousZone.innerHTML = renderSelectPhase(phases, "ciblePhasePourTache") + `<div id="cibleSousSousZone" class="mt-3"></div>`;
                sousZone.querySelector("#ciblePhasePourTache")?.addEventListener("change", async e2 => {
                    const taches = e2.target.value ? await getTachesByPhase(e2.target.value) : [];
                    sousZone.querySelector("#cibleSousSousZone").innerHTML = renderSelectTache(taches);
                });
            });
            return;
        }

        if (type === "Rapport") {
            zone.innerHTML = renderSelectProjet(projets, "cibleProjetPourRapport") + `<div id="cibleSousZone" class="mt-3"></div>`;
            zone.querySelector("#cibleProjetPourRapport").addEventListener("change", async e => {
                const rapports = e.target.value ? await getRapportsByProjet(e.target.value) : [];
                // On ne peut pas signaler son propre rapport
                const rapportsSignalables = rapports.filter(r => r.auteurId !== session?.id);
                zone.querySelector("#cibleSousZone").innerHTML = renderSelectRapport(rapportsSignalables);
            });
            return;
        }

        zone.innerHTML = `<p class="text-xs italic text-muted">Choisissez d'abord un type de cible.</p>`;
    });
}

function renderSelectProjet(projets, id = "cibleProjet") {
    return `
    <div>
      <label for="${id}" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
        Projet <span class="text-bloque">*</span>
      </label>
      <select id="${id}" class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
        <option value="">Sélectionner un projet</option>
        ${projets.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nom)}</option>`).join("")}
      </select>
      ${projets.length === 0 ? `<p class="mt-1 text-xs text-bloque">Aucun projet accessible.</p>` : ""}
    </div>
  `;
}

function renderSelectPhase(phases, id = "ciblePhase") {
    if (phases.length === 0) return `<p class="text-xs italic text-muted">Aucune phase pour ce projet.</p>`;
    return `
    <div>
      <label for="${id}" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
        Phase <span class="text-bloque">*</span>
      </label>
      <select id="${id}" class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
        <option value="">Sélectionner une phase</option>
        ${phases.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.libelle)}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderSelectTache(taches, id = "cibleTache") {
    if (taches.length === 0) return `<p class="text-xs italic text-muted">Aucune tâche pour cette phase.</p>`;
    return `
    <div>
      <label for="${id}" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
        Tâche <span class="text-bloque">*</span>
      </label>
      <select id="${id}" class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
        <option value="">Sélectionner une tâche</option>
        ${taches.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.titre)}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderSelectRapport(rapports, id = "cibleRapport") {
    if (rapports.length === 0) return `<p class="text-xs italic text-muted">Aucun rapport signalable pour ce projet.</p>`;
    return `
    <div>
      <label for="${id}" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
        Rapport <span class="text-bloque">*</span>
      </label>
      <select id="${id}" class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
        <option value="">Sélectionner un rapport</option>
        ${rapports.map(r => `<option value="${escapeHtml(r.id)}">${formatDateCourte(r.date)} — ${escapeHtml(r.contenu.slice(0, 40))}${r.contenu.length > 40 ? "..." : ""}</option>`).join("")}
      </select>
    </div>
  `;
}

function lireCibleSelectionnee(zone, cibleType) {
    if (!zone) return null;

    if (cibleType === "Projet") {
        const projetId = zone.querySelector("#cibleProjet")?.value;
        return projetId ? { projetId } : null;
    }

    if (cibleType === "Phase") {
        const projetId = zone.querySelector("#cibleProjetPourPhase")?.value;
        const phaseId = zone.querySelector("#ciblePhase")?.value;
        return (projetId && phaseId) ? { projetId, phaseId } : null;
    }

    if (cibleType === "Tache") {
        const projetId = zone.querySelector("#cibleProjetPourTache")?.value;
        const phaseId = zone.querySelector("#ciblePhasePourTache")?.value;
        const tacheId = zone.querySelector("#cibleTache")?.value;
        return (projetId && phaseId && tacheId) ? { projetId, phaseId, tacheId } : null;
    }

    if (cibleType === "Rapport") {
        const projetId = zone.querySelector("#cibleProjetPourRapport")?.value;
        const rapportId = zone.querySelector("#cibleRapport")?.value;
        return (projetId && rapportId) ? { projetId, rapportId } : null;
    }

    return null;
}