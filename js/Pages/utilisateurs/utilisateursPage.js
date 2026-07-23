import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openConfirm } from "../../Components/modal.js";
import { isAdmin } from "../../Utils/auth.js";
import { getUtilisateurs, updateDisponibilite } from "../../Services/utilisateurService.js";
import { apiRequest } from "../../Services/apiClient.js";
import { ENDPOINTS } from "../../Config/api.js";
import { renderUserCard } from "./utilisateurCard.js";
import { openUserForm } from "./utilisateurForm.js";
import { showBrickLoader, brickCycleDelay } from "../../Utils/pageLoader.js";

// ─── État local ───────────────────────────────────────────────────────────────
let allUtilisateurs = [];
let currentFilter   = "Tout";
let searchQuery     = "";

// ─── Rendu principal ──────────────────────────────────────────────────────────
export async function renderUtilisateursPage() {
  const app = document.getElementById("app");

  const stopLoader = showBrickLoader(app);

  [allUtilisateurs] = await Promise.all([
    getUtilisateurs(),
    brickCycleDelay(),
  ]);

  stopLoader();
  renderPage();
}

// ─── Rendu page ───────────────────────────────────────────────────────────────
function renderPage() {
  const app = document.getElementById("app");

  const FILTERS = ["Tout", "Chef de chantier", "Ouvrier", "Client"];

  const filtered = allUtilisateurs
    .filter(u => u.roleGlobal !== "Admin")
    .filter(u => currentFilter === "Tout" || u.roleGlobal === currentFilter)
    .filter(u => !searchQuery ||
      u.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const stats = [
    { label: "Total",             value: allUtilisateurs.length,                                                      icon: "fa-users",          bg: "bg-primary/10",      color: "text-primary" },
    { label: "Chefs de chantier", value: allUtilisateurs.filter(u => u.roleGlobal === "Chef de chantier").length,     icon: "fa-hard-hat",       bg: "bg-role-chef/10",    color: "text-role-chef" },
    { label: "Ouvriers",          value: allUtilisateurs.filter(u => u.roleGlobal === "Ouvrier").length,               icon: "fa-person-digging", bg: "bg-role-ouvrier/10", color: "text-role-ouvrier" },
    { label: "Disponibles",       value: allUtilisateurs.filter(u => u.statutDisponibilite === "Disponible").length,   icon: "fa-circle-check",   bg: "bg-succes/10",       color: "text-succes" },
  ];

  app.innerHTML = `
    <div class="space-y-5">

      <!-- En-tête -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-black text-texte sm:text-3xl">Utilisateurs</h1>
          <p class="mt-1 text-sm text-muted">Gérer les comptes et les rôles des membres de la plateforme</p>
        </div>
        ${isAdmin() ? `
          <button id="btnNewUser" class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-secondary">
            <i class="fa-solid fa-plus text-xs"></i>
            Nouvel utilisateur
          </button>
        ` : ""}
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        ${stats.map(s => `
          <div class="rounded-2xl bg-carte p-4 shadow-card">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${s.bg}">
                <i class="fa-solid ${s.icon} text-sm ${s.color}"></i>
              </div>
              <div>
                <p class="text-xs text-muted">${s.label}</p>
                <p class="text-xl font-black text-texte">${s.value}</p>
              </div>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Filtres + recherche -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted"></i>
          <input
            id="searchUser"
            type="text"
            value="${escapeHtml(searchQuery)}"
            placeholder="Rechercher un utilisateur..."
            class="w-full rounded-xl border border-bordure bg-carte py-2 pl-8 pr-4 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-56"
          />
        </div>
      </div>

      <!-- Compteur -->
      <p class="text-xs text-muted">${filtered.length} utilisateur(s) affiché(s)</p>

      <!-- Liste -->
      <div class="space-y-3">
        ${filtered.length === 0
          ? `
            <div class="rounded-2xl border border-dashed border-bordure bg-carte py-16 text-center">
              <i class="fa-solid fa-users text-3xl text-muted/30"></i>
              <p class="mt-3 text-sm font-semibold text-muted">Aucun utilisateur trouvé.</p>
            </div>
          `
          : filtered.map(u => renderUserCard(u)).join("")
        }
      </div>

    </div>
  `;

  bindEvents();
}

// ─── Événements ───────────────────────────────────────────────────────────────
function bindEvents() {
  document.getElementById("btnNewUser")?.addEventListener("click", () => {
    openUserForm(null, async () => {
      allUtilisateurs = await getUtilisateurs();
      renderPage();
    });
  });

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      renderPage();
    });
  });

  document.getElementById("searchUser")?.addEventListener("input", e => {
    searchQuery = e.target.value;
    renderPage();
  });

  document.querySelectorAll(".btn-edit-user").forEach(btn => {
    btn.addEventListener("click", () => {
      const user = allUtilisateurs.find(u => u.id === btn.dataset.userId);
      if (!user) return;
      openUserForm(user, async () => {
        allUtilisateurs = await getUtilisateurs();
        renderPage();
      });
    });
  });

  document.querySelectorAll(".btn-toggle-dispo").forEach(btn => {
    btn.addEventListener("click", async () => {
      const user = allUtilisateurs.find(u => u.id === btn.dataset.userId);
      if (!user) return;

      const newDispo = user.statutDisponibilite === "Disponible" ? "Occuper" : "Disponible";

      try {
        await updateDisponibilite(user.id, newDispo);
        allUtilisateurs = await getUtilisateurs();
        showToast(`Disponibilité mise à jour : ${newDispo}.`);
        renderPage();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  document.querySelectorAll(".btn-delete-user").forEach(btn => {
    btn.addEventListener("click", () => {
      const user = allUtilisateurs.find(u => u.id === btn.dataset.userId);
      if (!user) return;

      openConfirm({
        message: `Supprimer l'utilisateur "${user.nom}" ? Cette action est irréversible.`,
        confirmLabel: "Supprimer",
        onConfirm: async () => {
          try {
            await apiRequest(
              `${ENDPOINTS.utilisateurs}/${user.id}`,
              { method: "DELETE" },
              "Impossible de supprimer l'utilisateur."
            );
            showToast("Utilisateur supprimé.");
            allUtilisateurs = await getUtilisateurs();
            renderPage();
          } catch (err) {
            showToast(err.message, "error");
          }
        },
      });
    });
  });
}