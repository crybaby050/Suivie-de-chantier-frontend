import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openModal } from "../../Components/modal.js";
import { createFormValidator, Rules } from "../../Utils/formValidator.js";
import { createTache, updateTache } from "../../Services/tacheService.js";
import { affecterUtilisateur, supprimerAffectation } from "../../Services/affectationService.js";
import { allUtilisateurs } from "./projetsState.js";

const TACHE_SCHEMA = {
    tacheTitre: { rules: [Rules.required("Le titre est obligatoire.")], transform: v => v.trim(), as: "titre" },
    tacheDescription: { rules: [], transform: v => v.trim(), as: "description" },
    tacheDebut: { rules: [Rules.required("La date de début est obligatoire.")], transform: v => v, as: "dateDeDebut" },
    tacheFin: { rules: [Rules.required("La date de fin est obligatoire.")], transform: v => v, as: "dateDeFin" },
    tacheStatut: { rules: [], transform: v => v, as: "statutTache" },
};

export function openTacheForm(phaseId, onSuccess, tache = null, currentAffectations = []) {
    const ouvriers = allUtilisateurs.filter(u => u.roleGlobal === "Ouvrier");
    const assignedIds = new Set(currentAffectations.map(a => a.utilisateurId));

    let validator;
    let modalRoot;

    openModal({
        title: tache ? "Modifier la tâche" : "Nouvelle tâche",
        icon: "fa-list-check",
        confirmLabel: tache ? "Enregistrer" : "Créer",
        confirmClass: "bg-primary shadow-primary/20 hover:bg-secondary",
        body: `
      <div class="grid gap-4">
        <div>
          <label for="tacheTitre" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
            Titre <span class="text-bloque">*</span>
          </label>
          <input type="text" id="tacheTitre" value="${escapeHtml(tache?.titre ?? "")}"
            placeholder="ex: Montage des murs RDC"
            class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label for="tacheDescription" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Description</label>
          <textarea id="tacheDescription" rows="3"
            class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >${escapeHtml(tache?.description ?? "")}</textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="tacheDebut" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Début <span class="text-bloque">*</span></label>
            <input type="date" id="tacheDebut" value="${escapeHtml(tache?.dateDeDebut ?? "")}"
              class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label for="tacheFin" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Fin <span class="text-bloque">*</span></label>
            <input type="date" id="tacheFin" value="${escapeHtml(tache?.dateDeFin ?? "")}"
              class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div>
          <label for="tacheStatut" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Statut</label>
          <select id="tacheStatut"
            class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="A faire"  ${tache?.statutTache === "A faire" ? "selected" : ""}>A faire</option>
            <option value="En cours" ${tache?.statutTache === "En cours" ? "selected" : ""}>En cours</option>
            <option value="Terminer" ${tache?.statutTache === "Terminer" ? "selected" : ""}>Terminer</option>
            <option value="Valider"  ${tache?.statutTache === "Valider" ? "selected" : ""}>Valider</option>
            <option value="Renvoyer" ${tache?.statutTache === "Renvoyer" ? "selected" : ""}>Renvoyer</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Ouvriers assignés</label>
          ${ouvriers.length === 0 ? `<p class="text-sm italic text-muted">Aucun ouvrier disponible.</p>` : `
            <div class="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-bordure p-2">
              ${ouvriers.map(o => `
                <label class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-texte transition hover:bg-fond">
                  <input type="checkbox" class="tache-ouvrier-check" value="${o.id}" ${assignedIds.has(o.id) ? "checked" : ""} />
                  ${escapeHtml(o.nom)}
                </label>
              `).join("")}
            </div>
          `}
        </div>
      </div>
    `,
        onMount: modal => {
            validator = createFormValidator(modal, TACHE_SCHEMA);
            modalRoot = modal;
        },
        onConfirm: async () => {
            const data = validator.validate();
            if (!data) return false;

            const checkedIds = [...modalRoot.querySelectorAll(".tache-ouvrier-check:checked")].map(el => el.value);

            try {
                let savedTache;
                if (tache) {
                    savedTache = await updateTache(tache.id, { ...data, phaseId });
                    showToast("Tâche modifiée.");
                } else {
                    savedTache = await createTache({ ...data, phaseId });
                    showToast("Tâche créée.");
                }

                const toAdd = checkedIds.filter(id => !assignedIds.has(id));
                const toRemove = currentAffectations.filter(a => !checkedIds.includes(a.utilisateurId));

                await Promise.all([
                    ...toAdd.map(utilisateurId => affecterUtilisateur({ tacheId: savedTache.id, utilisateurId })),
                    ...toRemove.map(a => supprimerAffectation(a.id, a.utilisateurId)),
                ]);

                await onSuccess();
                return true;
            } catch (err) {
                showToast(err.message, "error");
                return false;
            }
        },
    });
}