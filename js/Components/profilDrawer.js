import { escapeHtml } from "../Utils/html.js";
import { showToast } from "../Components/toast.js";
import { openDrawer, closeDrawer } from "../Components/drawer.js";
import { getSession, setSession } from "../Utils/auth.js";
import { apiRequest } from "../Services/apiClient.js";
import { ENDPOINTS } from "../Config/api.js";
import { uploadImageCloudinary } from "../Services/cloudinaryService.js";
import { createFormValidator, Rules } from "../Utils/formValidator.js";

const SCHEMA_PROFIL = {
    profilNom: { rules: [Rules.required("Le nom est obligatoire."), Rules.minLength(2, "Minimum 2 caractères.")], transform: v => v.trim(), as: "nom" },
    profilEmail: { rules: [Rules.required("L'email est obligatoire."), Rules.email()], transform: v => v.trim().toLowerCase(), as: "email" },
};

const SCHEMA_MDP = {
    profilAncienMdp: { rules: [Rules.required("L'ancien mot de passe est obligatoire.")], transform: v => v, as: "ancienMotDePasse" },
    profilNouveauMdp: { rules: [Rules.required("Le nouveau mot de passe est obligatoire."), Rules.minLength(6, "Minimum 6 caractères.")], transform: v => v, as: "nouveauMotDePasse" },
    profilConfirmMdp: { rules: [Rules.required("La confirmation est obligatoire.")], transform: v => v, as: "confirmMotDePasse" },
};

export function openProfilDrawer(onSuccess) {
    const session = getSession();
    let photoUrl = session?.photoUrl ?? null;
    let activeTab = "infos";

    function bodyHTML() {
        return `
      <div class="space-y-5">

        <!-- Photo de profil -->
        <div class="flex flex-col items-center gap-3">
          <div class="relative">
            ${photoUrl
                ? `<img src="${escapeHtml(photoUrl)}" alt="Photo de profil" class="h-24 w-24 rounded-full object-cover border-4 border-fond shadow-card" />`
                : `<div class="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-black text-primary border-4 border-fond shadow-card">
                   ${getInitials(session?.nom ?? "")}
                 </div>`
            }
            <label
              for="profilPhotoInput"
              class="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-soft transition hover:bg-secondary"
              title="Changer la photo"
            >
              <i class="fa-solid fa-camera text-xs"></i>
            </label>
          </div>
          <input type="file" id="profilPhotoInput" accept="image/*" class="hidden" />
          <div id="profilPhotoLoader" class="hidden text-xs font-semibold text-muted">
            <i class="fa-solid fa-spinner animate-spin mr-1"></i> Upload en cours...
          </div>
          <div>
            <p class="text-center text-base font-black text-texte">${escapeHtml(session?.nom ?? "")}</p>
            <p class="text-center text-xs text-muted">${escapeHtml(session?.email ?? "")}</p>
            <p class="mt-1 text-center">
              ${getRoleBadge(session?.roleGlobal)}
            </p>
          </div>
        </div>

        <!-- Onglets -->
        <div class="flex rounded-xl border border-bordure overflow-hidden">
          <button
            class="profil-tab flex-1 py-2 text-sm font-bold transition
              ${activeTab === "infos" ? "bg-primary text-white" : "bg-carte text-muted hover:bg-fond"}"
            data-tab="infos"
          >
            Informations
          </button>
          <button
            class="profil-tab flex-1 py-2 text-sm font-bold transition
              ${activeTab === "mdp" ? "bg-primary text-white" : "bg-carte text-muted hover:bg-fond"}"
            data-tab="mdp"
          >
            Mot de passe
          </button>
        </div>

        <!-- Contenu onglet -->
        <div id="profilTabContent">
          ${activeTab === "infos" ? renderInfosTab(session) : renderMdpTab()}
        </div>

      </div>
    `;
    }

    openDrawer({
        title: "Mon profil",
        icon: "fa-user-circle",
        body: bodyHTML(),
        onMount: panel => {
            bindEvents(panel);
        },
    });

    function rerender(panel) {
        const body = panel.querySelector("#drawer-body");
        if (body) body.innerHTML = bodyHTML();
        bindEvents(panel);
    }

    function bindEvents(panel) {
        // Onglets
        panel.querySelectorAll(".profil-tab").forEach(btn => {
            btn.addEventListener("click", () => {
                activeTab = btn.dataset.tab;
                rerender(panel);
            });
        });

        // Upload photo
        const photoInput = panel.querySelector("#profilPhotoInput");
        const photoLoader = panel.querySelector("#profilPhotoLoader");

        photoInput?.addEventListener("change", async () => {
            const file = photoInput.files?.[0];
            if (!file) return;

            photoLoader?.classList.remove("hidden");
            try {
                const url = await uploadImageCloudinary(file);
                photoUrl = url;

                // Sauvegarder en base
                await apiRequest(
                    `${ENDPOINTS.utilisateurs}/${session.id}`,
                    { method: "PATCH", body: JSON.stringify({ photoUrl: url }) },
                    "Impossible de sauvegarder la photo."
                );

                // Mettre à jour la session
                setSession({ ...session, photoUrl: url });
                showToast("Photo de profil mise à jour.");
                rerender(panel);
                if (onSuccess) await onSuccess();
            } catch (err) {
                showToast(err.message, "error");
            } finally {
                photoLoader?.classList.add("hidden");
            }
        });

        // Formulaire infos
        if (activeTab === "infos") {
            let validator;
            const form = panel.querySelector("#profilInfosForm");
            validator = createFormValidator(panel, SCHEMA_PROFIL);

            form?.addEventListener("submit", async e => {
                e.preventDefault();
                const data = validator.validate();
                if (!data) return;

                const btn = form.querySelector("#btnSauvegarderProfil");
                const btnText = form.querySelector("#btnSauvegarderProfilText");
                btn.disabled = true;
                btnText.textContent = "Enregistrement...";

                try {
                    const updated = await apiRequest(
                        `${ENDPOINTS.utilisateurs}/${session.id}`,
                        { method: "PATCH", body: JSON.stringify(data) },
                        "Impossible de modifier le profil."
                    );

                    setSession({ ...session, ...data });
                    showToast("Profil mis à jour avec succès.");
                    rerender(panel);
                    if (onSuccess) await onSuccess();
                } catch (err) {
                    showToast(err.message, "error");
                    btn.disabled = false;
                    btnText.textContent = "Enregistrer";
                }
            });
        }

        // Formulaire mot de passe
        if (activeTab === "mdp") {
            let validator;
            const form = panel.querySelector("#profilMdpForm");
            validator = createFormValidator(panel, SCHEMA_MDP);

            form?.addEventListener("submit", async e => {
                e.preventDefault();
                const data = validator.validate();
                if (!data) return;

                // Vérifier correspondance
                if (data.nouveauMotDePasse !== data.confirmMotDePasse) {
                    showToast("Les mots de passe ne correspondent pas.", "error");
                    return;
                }

                const btn = form.querySelector("#btnSauvegarderMdp");
                const btnText = form.querySelector("#btnSauvegarderMdpText");
                btn.disabled = true;
                btnText.textContent = "Modification...";

                try {
                    // Vérifier l'ancien mot de passe
                    const user = await apiRequest(
                        `${ENDPOINTS.utilisateurs}/${session.id}`,
                        {},
                        "Impossible de charger le profil."
                    );

                    if (user.motDePasse !== data.ancienMotDePasse) {
                        throw new Error("L'ancien mot de passe est incorrect.");
                    }

                    await apiRequest(
                        `${ENDPOINTS.utilisateurs}/${session.id}`,
                        { method: "PATCH", body: JSON.stringify({ motDePasse: data.nouveauMotDePasse }) },
                        "Impossible de modifier le mot de passe."
                    );

                    showToast("Mot de passe modifié avec succès.");
                    activeTab = "infos";
                    rerender(panel);
                } catch (err) {
                    showToast(err.message, "error");
                    btn.disabled = false;
                    btnText.textContent = "Modifier le mot de passe";
                }
            });
        }
    }
}

// ─── Onglet infos ─────────────────────────────────────────────────────────────
function renderInfosTab(session) {
    return `
    <form id="profilInfosForm" class="space-y-4">
      <div>
        <label for="profilNom" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Nom complet <span class="text-bloque">*</span>
        </label>
        <input
          type="text" id="profilNom"
          value="${escapeHtml(session?.nom ?? "")}"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label for="profilEmail" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Email <span class="text-bloque">*</span>
        </label>
        <input
          type="email" id="profilEmail"
          value="${escapeHtml(session?.email ?? "")}"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Rôle</label>
        <div class="rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-muted">
          ${escapeHtml(session?.roleGlobal ?? "—")}
        </div>
      </div>
      <button
        type="submit"
        id="btnSauvegarderProfil"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-secondary disabled:opacity-60"
      >
        <i class="fa-solid fa-floppy-disk text-xs"></i>
        <span id="btnSauvegarderProfilText">Enregistrer</span>
      </button>
    </form>
  `;
}

// ─── Onglet mot de passe ──────────────────────────────────────────────────────
function renderMdpTab() {
    return `
    <form id="profilMdpForm" class="space-y-4">
      <div>
        <label for="profilAncienMdp" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Ancien mot de passe <span class="text-bloque">*</span>
        </label>
        <input
          type="password" id="profilAncienMdp"
          placeholder="••••••••"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label for="profilNouveauMdp" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Nouveau mot de passe <span class="text-bloque">*</span>
        </label>
        <input
          type="password" id="profilNouveauMdp"
          placeholder="Minimum 6 caractères"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label for="profilConfirmMdp" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Confirmer le mot de passe <span class="text-bloque">*</span>
        </label>
        <input
          type="password" id="profilConfirmMdp"
          placeholder="Répétez le nouveau mot de passe"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <button
        type="submit"
        id="btnSauvegarderMdp"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-secondary disabled:opacity-60"
      >
        <i class="fa-solid fa-lock text-xs"></i>
        <span id="btnSauvegarderMdpText">Modifier le mot de passe</span>
      </button>
    </form>
  `;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(nom) {
    return String(nom ?? "")
        .split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function getRoleBadge(role) {
    const MAP = {
        "Admin": "bg-role-admin/10 text-role-admin",
        "Chef de chantier": "bg-role-chef/10 text-role-chef",
        "Ouvrier": "bg-role-ouvrier/10 text-role-ouvrier",
        "Client": "bg-role-client/10 text-role-client",
    };
    const cls = MAP[role] ?? "bg-muted/10 text-muted";
    return `<span class="rounded-full px-2.5 py-1 text-xs font-bold ${cls}">${escapeHtml(role ?? "—")}</span>`;
}