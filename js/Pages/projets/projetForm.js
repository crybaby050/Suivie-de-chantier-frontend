import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openModal } from "../../Components/modal.js";
import { createFormValidator, Rules } from "../../Utils/formValidator.js";
import { createProjet, updateProjet } from "../../Services/projetService.js";

const PROJET_SCHEMA = {
    projetNom: { rules: [Rules.required("Le nom est obligatoire."), Rules.minLength(3, "Minimum 3 caractères.")], transform: v => v.trim(), as: "nom" },
    projetAdresse: { rules: [Rules.required("L'adresse est obligatoire.")], transform: v => v.trim(), as: "adresse" },
    projetDescription: { rules: [], transform: v => v.trim(), as: "description" },
    projetDebut: { rules: [Rules.required("La date de début est obligatoire.")], transform: v => v, as: "dateDeDebut" },
    projetFin: { rules: [Rules.required("La date de fin est obligatoire.")], transform: v => v, as: "dateDeFinPrevue" },
    projetStatut: { rules: [], transform: v => v, as: "statutProjet" },
};

function projetFormBody(projet = null) {
    return `
    <div class="grid gap-4">
      <div>
        <label for="projetNom" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Nom du projet <span class="text-bloque">*</span>
        </label>
        <input type="text" id="projetNom" value="${escapeHtml(projet?.nom ?? "")}"
          placeholder="ex: Construction villa Almadies"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label for="projetAdresse" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Adresse <span class="text-bloque">*</span>
        </label>
        <input type="text" id="projetAdresse" value="${escapeHtml(projet?.adresse ?? "")}"
          placeholder="ex: Almadies, Dakar"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label for="projetDescription" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Description
        </label>
        <textarea id="projetDescription" rows="3"
          placeholder="Décrivez brièvement le projet..."
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
        >${escapeHtml(projet?.description ?? "")}</textarea>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="projetDebut" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
            Date de début <span class="text-bloque">*</span>
          </label>
          <input type="date" id="projetDebut" value="${escapeHtml(projet?.dateDeDebut ?? "")}"
            class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label for="projetFin" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
            Date de fin <span class="text-bloque">*</span>
          </label>
          <input type="date" id="projetFin" value="${escapeHtml(projet?.dateDeFinPrevue ?? "")}"
            class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
      <div>
        <label for="projetStatut" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Statut
        </label>
        <select id="projetStatut"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="Planifier"  ${projet?.statutProjet === "Planifier" ? "selected" : ""}>Planifier</option>
          <option value="En cours"   ${projet?.statutProjet === "En cours" ? "selected" : ""}>En cours</option>
          <option value="Suspendu"   ${projet?.statutProjet === "Suspendu" ? "selected" : ""}>Suspendu</option>
          <option value="Terminer"   ${projet?.statutProjet === "Terminer" ? "selected" : ""}>Terminer</option>
        </select>
      </div>
    </div>
  `;
}

/**
 * Ouvre le formulaire de création/modification d'un projet.
 * @param {object|null} projet - le projet à modifier, ou null pour une création
 * @param {Function} [onSuccess] - callback appelé après succès. Si omis,
 *   recharge automatiquement la liste des projets.
 */
export function openProjetForm(projet = null, onSuccess) {
    let validator;
    openModal({
        title: projet ? "Modifier le projet" : "Nouveau projet",
        icon: "fa-building",
        confirmLabel: projet ? "Enregistrer" : "Créer",
        confirmIcon: "fa-floppy-disk",
        confirmClass: "bg-primary shadow-primary/20 hover:bg-secondary",
        body: projetFormBody(projet),
        onMount: modal => { validator = createFormValidator(modal, PROJET_SCHEMA); },
        onConfirm: async () => {
            const data = validator.validate();
            if (!data) return false;
            try {
                if (projet) {
                    await updateProjet(projet.id, data);
                    showToast("Projet modifié avec succès.");
                } else {
                    await createProjet(data);
                    showToast("Projet créé avec succès.");
                }
                if (onSuccess) {
                    await onSuccess();
                } else {
                    const { renderProjetsPage } = await import("./projetsPage.js");
                    await renderProjetsPage();
                }
                return true;
            } catch (err) {
                showToast(err.message, "error");
                return false;
            }
        },
    });
}