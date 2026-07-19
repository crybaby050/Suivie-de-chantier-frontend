import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openModal } from "../../Components/modal.js";
import { createFormValidator, Rules } from "../../Utils/formValidator.js";
import { apiRequest } from "../../Services/apiClient.js";
import { ENDPOINTS } from "../../Config/api.js";
import { createId } from "../../Utils/id.js";


const ROLES = ["Admin", "Chef de chantier", "Ouvrier", "Client"];

const SCHEMA_CREATE = {
  userNom:        { rules: [Rules.required("Le nom est obligatoire."), Rules.minLength(2, "Minimum 2 caractères.")], transform: v => v.trim(), as: "nom" },
  userEmail:      { rules: [Rules.required("L'email est obligatoire."), Rules.email()], transform: v => v.trim().toLowerCase(), as: "email" },
  userMotDePasse: { rules: [Rules.required("Le mot de passe est obligatoire."), Rules.minLength(6, "Minimum 6 caractères.")], transform: v => v, as: "motDePasse" },
  userRole:       { rules: [Rules.required("Le rôle est obligatoire.")], transform: v => v, as: "roleGlobal" },
};

const SCHEMA_EDIT = {
  userNom:   { rules: [Rules.required("Le nom est obligatoire."), Rules.minLength(2, "Minimum 2 caractères.")], transform: v => v.trim(), as: "nom" },
  userEmail: { rules: [Rules.required("L'email est obligatoire."), Rules.email()], transform: v => v.trim().toLowerCase(), as: "email" },
  userRole:  { rules: [Rules.required("Le rôle est obligatoire.")], transform: v => v, as: "roleGlobal" },
};

function userFormBody(user = null) {
  const isEdit = user !== null;

  return `
    <div class="grid gap-4">
      <div>
        <label for="userNom" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Nom complet <span class="text-bloque">*</span>
        </label>
        <input type="text" id="userNom" value="${escapeHtml(user?.nom ?? "")}"
          placeholder="ex: Moussa Diop"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label for="userEmail" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Email <span class="text-bloque">*</span>
        </label>
        <input type="email" id="userEmail" value="${escapeHtml(user?.email ?? "")}"
          placeholder="ex: moussa@chantier.sn"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      ${!isEdit ? `
        <div>
          <label for="userMotDePasse" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
            Mot de passe <span class="text-bloque">*</span>
          </label>
          <input type="password" id="userMotDePasse"
            placeholder="Minimum 6 caractères"
            class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      ` : ""}

      <div>
        <label for="userRole" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Rôle <span class="text-bloque">*</span>
        </label>
        <select id="userRole"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Sélectionner un rôle</option>
          ${ROLES.map(r => `
            <option value="${r}" ${user?.roleGlobal === r ? "selected" : ""}>${r}</option>
          `).join("")}
        </select>
      </div>
    </div>
  `;
}

export function openUserForm(user = null, onSuccess) {
  const isEdit = user !== null;
  const schema = isEdit ? SCHEMA_EDIT : SCHEMA_CREATE;
  let validator;

  openModal({
    title:        isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur",
    icon:         "fa-user",
    confirmLabel: isEdit ? "Enregistrer" : "Créer",
    confirmIcon:  "fa-floppy-disk",
    confirmClass: "bg-primary shadow-primary/20 hover:bg-secondary",
    body:         userFormBody(user),
    onMount: modal => { validator = createFormValidator(modal, schema); },
    onConfirm: async () => {
      const data = validator.validate();
      if (!data) return false;

      // Vérification de l'unicité de l'email (insensible à la casse)
      const tousLesUtilisateurs = await getUtilisateurs();
      const emailDejaUtilise = tousLesUtilisateurs.some(u =>
        u.email.toLowerCase() === data.email.toLowerCase() && u.id !== user?.id
      );

      if (emailDejaUtilise) {
        showToast("Cet email est déjà utilisé par un autre utilisateur.", "error");
        return false;
      }

      try {
        if (isEdit) {
          await apiRequest(
            `${ENDPOINTS.utilisateurs}/${user.id}`,
            { method: "PATCH", body: JSON.stringify(data) },
            "Impossible de modifier l'utilisateur."
          );
          showToast("Utilisateur modifié avec succès.");
        } else {
          await apiRequest(
            ENDPOINTS.utilisateurs,
            {
              method: "POST",
              body: JSON.stringify({
                id:                  createId("user"),
                statutUtilisateur:   "Actif",
                statutDisponibilite: "Disponible",
                dateDeCreation:      new Date().toISOString(),
                ...data,
              }),
            },
            "Impossible de créer l'utilisateur."
          );
          showToast("Utilisateur créé avec succès.");
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