import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openModal } from "../../Components/modal.js";
import { createFormValidator, Rules } from "../../Utils/formValidator.js";
import { uploadImageCloudinary } from "../../Services/cloudinaryService.js";
import {
  createRapport,
  updateRapport,
  ajouterPhotoRapport,
} from "../../Services/rapportService.js";

const RAPPORT_SCHEMA = {
  rapportProjet: {
    rules: [Rules.required("Le projet est obligatoire.")],
    transform: v => v,
    as: "projetId",
  },
  rapportContenu: {
    rules: [
      Rules.required("Le contenu est obligatoire."),
      Rules.minLength(10, "Minimum 10 caractères."),
    ],
    transform: v => v.trim(),
    as: "contenu",
  },
  rapportStatut: {
    rules: [],
    transform: v => v,
    as: "statutRapport",
  },
};

function rapportFormBody(rapport = null, projets = []) {
  const isEdit = rapport !== null;

  return `
    <div class="grid gap-4">

      <!-- Projet -->
      <div>
        <label for="rapportProjet" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Projet <span class="text-bloque">*</span>
        </label>
        <select id="rapportProjet"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          ${isEdit ? "disabled" : ""}
        >
          <option value="">Sélectionner un projet</option>
          ${projets.map(p => `
            <option value="${escapeHtml(p.id)}" ${rapport?.projetId === p.id ? "selected" : ""}>
              ${escapeHtml(p.nom)}
            </option>
          `).join("")}
        </select>
      </div>

      <!-- Contenu -->
      <div>
        <label for="rapportContenu" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Contenu <span class="text-bloque">*</span>
        </label>
        <textarea
          id="rapportContenu"
          rows="6"
          placeholder="Décrivez l'avancement du chantier, les problèmes rencontrés, les décisions prises..."
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
        >${escapeHtml(rapport?.contenu ?? "")}</textarea>
      </div>

      <!-- Statut -->
      <div>
        <label for="rapportStatut" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Statut
        </label>
        <select id="rapportStatut"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="Brouillon" ${rapport?.statutRapport === "Brouillon" || !rapport ? "selected" : ""}>Brouillon</option>
          <option value="Publié"    ${rapport?.statutRapport === "Publié" ? "selected" : ""}>Publié</option>
        </select>
      </div>

      <!-- Photos -->
      <div>
        <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Photos (optionnel)
        </label>
        <label
          for="rapportPhotos"
          class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-bordure bg-fond px-4 py-5 text-center transition hover:border-primary hover:bg-primary/5"
        >
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <i class="fa-solid fa-cloud-arrow-up text-base"></i>
          </div>
          <p class="text-xs font-bold text-texte">Cliquez pour ajouter des photos</p>
          <p class="text-[10px] text-muted">JPG, PNG — plusieurs fichiers acceptés</p>
        </label>
        <input type="file" id="rapportPhotos" accept="image/*" multiple class="hidden" />
        <div id="rapportPhotosPreview" class="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6"></div>
      </div>

    </div>
  `;
}

export function openRapportForm(rapport = null, projets = [], onSuccess) {
  const isEdit = rapport !== null;
  let validator;
  let photosFiles = [];

  openModal({
    title:        isEdit ? "Modifier le rapport" : "Nouveau rapport",
    icon:         "fa-file-lines",
    confirmLabel: isEdit ? "Enregistrer" : "Créer",
    confirmIcon:  "fa-floppy-disk",
    confirmClass: "bg-primary shadow-primary/20 hover:bg-secondary",
    body:         rapportFormBody(rapport, projets),

    onMount: modal => {
      validator = createFormValidator(modal, RAPPORT_SCHEMA);

      // Gestion des photos
      const input   = modal.querySelector("#rapportPhotos");
      const preview = modal.querySelector("#rapportPhotosPreview");

      input?.addEventListener("change", () => {
        photosFiles = Array.from(input.files);
        preview.innerHTML = photosFiles.map((f, i) => `
          <div class="relative aspect-square overflow-hidden rounded-lg">
            <img src="${URL.createObjectURL(f)}" class="h-full w-full object-cover" />
            <button type="button" class="btn-remove-photo absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bloque text-white text-[10px]" data-index="${i}">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        `).join("");

        preview.querySelectorAll(".btn-remove-photo").forEach(btn => {
          btn.addEventListener("click", () => {
            photosFiles.splice(Number(btn.dataset.index), 1);
            const dt = new DataTransfer();
            photosFiles.forEach(f => dt.items.add(f));
            input.files = dt.files;
            input.dispatchEvent(new Event("change"));
          });
        });
      });
    },

    onConfirm: async () => {
      const data = validator.validate();
      if (!data) return false;

      // Si le projet est disabled (mode edit), récupérer la valeur originale
      if (isEdit) data.projetId = rapport.projetId;

      try {
        let savedRapport;

        if (isEdit) {
          savedRapport = await updateRapport(rapport.id, {
            ...rapport,
            contenu:      data.contenu,
            statutRapport: data.statutRapport,
          });
          showToast("Rapport modifié avec succès.");
        } else {
          savedRapport = await createRapport(data);
          showToast("Rapport créé avec succès.");
        }

        // Upload des photos sur Cloudinary
        if (photosFiles.length > 0) {
          const rapportActuel = savedRapport ?? rapport;

          for (const file of photosFiles) {
            const url = await uploadImageCloudinary(file);
            await ajouterPhotoRapport(
              rapportActuel.id,
              url,
              rapportActuel
            );
            rapportActuel.photos = [...(rapportActuel.photos ?? []), url];
          }
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