import { escapeHtml } from "../../Utils/html.js";
import { isAdmin } from "../../Utils/auth.js";
import {
  getInitials,
  getRoleBadge,
  getDisponibiliteBadge,
  getRoleAvatarBg,
  getRoleAvatarText,
  formatDate,
} from "./utilisateursHelpers.js";

export function renderUserCard(user) {
  const initiales  = getInitials(user.nom);
  const roleBadge  = getRoleBadge(user.roleGlobal);
  const dispoBadge = getDisponibiliteBadge(user.statutDisponibilite);

  return `
    <div class="rounded-2xl border border-bordure bg-carte p-4 shadow-card transition hover:shadow-soft sm:p-5">
      <div class="flex items-center gap-4">

        <!-- Avatar -->
        <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${getRoleAvatarBg(user.roleGlobal)} text-sm font-black ${getRoleAvatarText(user.roleGlobal)}">
          ${initiales}
        </div>

        <!-- Infos -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-black text-texte">${escapeHtml(user.nom)}</p>
            ${roleBadge}
            ${dispoBadge}
          </div>
          <p class="mt-0.5 truncate text-sm text-muted">${escapeHtml(user.email)}</p>
          <div class="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span class="flex items-center gap-1">
              <i class="fa-solid fa-calendar text-primary/40"></i>
              Inscrit le ${formatDate(user.dateDeCreation)}
            </span>
            <span class="flex items-center gap-1">
              <i class="fa-solid fa-circle ${user.statutUtilisateur === "Actif" ? "text-succes" : "text-inactif"} text-[8px]"></i>
              ${user.statutUtilisateur ?? "—"}
            </span>
          </div>
        </div>

        <!-- Actions -->
        ${isAdmin() ? `
          <div class="flex flex-shrink-0 items-center gap-2">
            <button
              class="btn-edit-user flex h-9 w-9 items-center justify-center rounded-xl border border-bordure bg-carte text-muted transition hover:bg-fond hover:text-primary"
              data-user-id="${escapeHtml(user.id)}"
              title="Modifier"
            >
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button
              class="btn-toggle-dispo flex h-9 w-9 items-center justify-center rounded-xl border border-bordure bg-carte text-muted transition hover:bg-fond hover:text-primary"
              data-user-id="${escapeHtml(user.id)}"
              data-dispo="${escapeHtml(user.statutDisponibilite)}"
              title="${user.statutDisponibilite === "Disponible" ? "Marquer comme occupé" : "Marquer comme disponible"}"
            >
              <i class="fa-solid ${user.statutDisponibilite === "Disponible" ? "fa-lock-open" : "fa-lock"} text-xs"></i>
            </button>
            <button
              class="btn-delete-user flex h-9 w-9 items-center justify-center rounded-xl border border-bordure bg-carte text-muted transition hover:bg-bloque/10 hover:text-bloque"
              data-user-id="${escapeHtml(user.id)}"
              title="Supprimer"
            >
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        ` : ""}

      </div>
    </div>
  `;
}