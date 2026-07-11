import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openModal } from "../../Components/modal.js";
import { createFormValidator, Rules } from "../../Utils/formValidator.js";

const PHASE_SCHEMA = {
    phaseLibelle: { rules: [Rules.required("Le libellé est obligatoire.")], transform: v => v.trim(), as: "libelle" },
    phaseOrdre: { rules: [Rules.required("L'ordre est obligatoire.")], transform: v => Number(v), as: "ordre" },
    phaseDebut: { rules: [Rules.required("La date de début est obligatoire.")], transform: v => v, as: "dateDeDebut" },
    phaseFin: { rules: [Rules.required("La date de fin est obligatoire.")], transform: v => v, as: "dateDeFinPrevue" },
    phaseStatut: { rules: [], transform: v => v, as: "statutPhase" },
};

/**
 * Ouvre le formulaire de création/modification d'une phase.
 * @param {string} projetId
 * @param {Function} onSuccess - callback appelé après succès (ex: rafraîchir le détail projet)
 * @param {object|null} [phase] - la phase à modifier, ou null pour une création
 */
export function openPhaseForm(projetId, onSuccess, phase = null) {
    let validator;

    openModal({
        title: phase ? "Modifier la phase" : "Nouvelle phase",
        icon: "fa-layer-group",
        confirmLabel: phase ? "Enregistrer" : "Créer",
        confirmClass: "bg-primary shadow-primary/20 hover:bg-secondary",
        body: `
      <div class="grid gap-4">
        <div>
          <label for="phaseLibelle" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
            Libellé <span class="text-bloque">*</span>
          </label>
          <input type="text" id="phaseLibelle" value="${escapeHtml(phase?.libelle ?? "")}"
            placeholder="ex: Fondations"
            class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label for="phaseOrdre" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
            Ordre <span class="text-bloque">*</span>
          </label>
          <input type="number" id="phaseOrdre" value="${phase?.ordre ?? 1}" min="1"
            class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="phaseDebut" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Début <span class="text-bloque">*</span></label>
            <input type="date" id="phaseDebut" value="${escapeHtml(phase?.dateDeDebut ?? "")}"
              class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label for="phaseFin" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Fin <span class="text-bloque">*</span></label>
            <input type="date" id="phaseFin" value="${escapeHtml(phase?.dateDeFinPrevue ?? "")}"
              class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        ${phase ? `
          <div>
            <label for="phaseStatut" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Statut</label>
            <select id="phaseStatut"
              class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="En attente" ${phase?.statutPhase === "En attente" ? "selected" : ""}>En attente</option>
              <option value="En cours"   ${phase?.statutPhase === "En cours" ? "selected" : ""}>En cours</option>
              <option value="Terminer"   ${phase?.statutPhase === "Terminer" ? "selected" : ""}>Terminer</option>
              <option value="Bloquer"    ${phase?.statutPhase === "Bloquer" ? "selected" : ""}>Bloquer</option>
            </select>
          </div>
        ` : `
          <input type="hidden" id="phaseStatut" value="En attente" />
        `}
      </div>
    `,
        onMount: modal => { validator = createFormValidator(modal, PHASE_SCHEMA); },
        onConfirm: async () => {
            const data = validator.validate();
            if (!data) return false;
            try {
                const { createPhase, updatePhase } = await import("../../Services/phaseService.js");
                if (phase) {
                    await updatePhase(phase.id, { ...data, projetId });
                    showToast("Phase modifiée.");
                } else {
                    await createPhase({ ...data, projetId });
                    showToast("Phase créée.");
                }
                await onSuccess();
                return true;
            } catch (err) {
                showToast(err.message, "error");
                return false;
            }
        },
    });
}