import { getSession } from "../Utils/auth.js";
import { escapeHtml } from "../Utils/html.js";

export function renderNavbar() {
  const session = getSession();

  const ROLE_BADGES = {
    "Admin":            `<span class="rounded-full bg-role-admin/20 px-2.5 py-1 text-xs font-bold text-role-admin">Admin</span>`,
    "Chef de chantier": `<span class="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white">Chef</span>`,
    "Ouvrier":          `<span class="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white">Ouvrier</span>`,
    "Client":           `<span class="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white">Client</span>`,
  };

  const roleBadge = ROLE_BADGES[session?.roleGlobal] ?? "";

  return `
    <header id="navbar" class="fixed top-0 right-0 left-0 z-20 h-16 bg-primary shadow-soft transition-all duration-300 lg:left-64">
      <div class="flex h-full items-center px-4 sm:px-6">

        <!-- Bouton menu mobile -->
        <button
          id="sidebarToggle"
          class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <i class="fa-solid fa-bars text-sm"></i>
        </button>

        <!-- Titre page — fixe à gauche -->
        <div class="ml-3 lg:ml-0">
          <span id="navbarTitle" class="text-sm font-bold text-white sm:text-base">Dashboard</span>
        </div>

        <!-- Spacer — pousse les éléments de droite -->
        <div class="flex-1"></div>

        <!-- Éléments de droite — toujours fixes -->
        <div class="flex items-center gap-2 sm:gap-3">

          <!-- Recherche desktop -->
          <div class="hidden lg:block">
            <div class="relative">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/50"></i>
              <input
                type="text"
                placeholder="Recherche globale..."
                class="w-48 xl:w-64 rounded-xl bg-white/10 py-2 pl-8 pr-4 text-sm text-white placeholder:text-white/50 outline-none transition focus:bg-white/20 focus:ring-2 focus:ring-white/30"
              />
            </div>
          </div>

          <!-- Recherche mobile -->
          <button
            id="mobileSearchToggle"
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
          >
            <i class="fa-solid fa-magnifying-glass text-sm"></i>
          </button>

          <!-- Séparateur -->
          <div class="hidden h-5 w-px bg-white/20 sm:block"></div>

          <!-- Badge rôle -->
          <div class="hidden sm:block">${roleBadge}</div>

          <!-- Avatar + nom + dropdown -->
<div class="relative">
  <button
    id="navbarAvatarBtn"
    class="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1 transition hover:bg-white/10"
  >
    <div id="navbarAvatar" class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white overflow-hidden">
      ${session?.photoUrl
        ? `<img src="${escapeHtml(session.photoUrl)}" class="h-full w-full object-cover" />`
        : `<i class="fa-solid fa-user text-xs"></i>`
      }
    </div>
    <span class="hidden text-sm font-semibold text-white md:block truncate max-w-[120px]">
      ${session?.nom ?? ""}
    </span>
    <i class="fa-solid fa-chevron-down text-xs text-white/60 hidden md:block" id="navbarChevron"></i>
  </button>

  <!-- Dropdown -->
  <div
    id="navbarDropdown"
    class="absolute right-0 top-full mt-2 hidden w-64 rounded-2xl border border-bordure bg-carte shadow-soft z-50"
  >
    <!-- Infos utilisateur -->
    <div class="flex items-center gap-3 border-b border-bordure p-4">
      <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
        ${session?.photoUrl
          ? `<img src="${escapeHtml(session.photoUrl)}" class="h-full w-full object-cover" />`
          : `<i class="fa-solid fa-user text-sm"></i>`
        }
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-black text-texte">${escapeHtml(session?.nom ?? "")}</p>
        <p class="truncate text-xs text-muted">${escapeHtml(session?.email ?? "")}</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="p-2">
      <button
        id="btnOuvrirProfil"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-texte transition hover:bg-fond"
      >
        <i class="fa-solid fa-user-pen text-muted text-xs"></i>
        Mon profil
      </button>
      <button
        id="logoutBtnDropdown"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-bloque transition hover:bg-bloque/10"
      >
        <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
        Se déconnecter
      </button>
    </div>
  </div>
</div>

        </div>
      </div>

      <!-- Barre recherche mobile -->
      <div id="mobileSearchBar" class="hidden border-t border-white/10 bg-primary px-4 py-2 lg:hidden">
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/50"></i>
          <input
            type="text"
            placeholder="Recherche globale..."
            class="w-full rounded-xl bg-white/10 py-2 pl-8 pr-4 text-sm text-white placeholder:text-white/50 outline-none focus:bg-white/20"
          />
        </div>
      </div>
    </header>
  `;
}

export function initNavbar(onLogout, onProfilOpen) {
  const toggle    = document.getElementById("mobileSearchToggle");
  const bar       = document.getElementById("mobileSearchBar");
  const avatarBtn = document.getElementById("navbarAvatarBtn");
  const dropdown  = document.getElementById("navbarDropdown");
  const chevron   = document.getElementById("navbarChevron");

  toggle?.addEventListener("click", () => bar.classList.toggle("hidden"));

  // Toggle dropdown
  avatarBtn?.addEventListener("click", e => {
    e.stopPropagation();
    const isOpen = !dropdown.classList.contains("hidden");
    dropdown.classList.toggle("hidden", isOpen);
    chevron?.classList.toggle("rotate-180", !isOpen);
  });

  // Fermer en cliquant ailleurs — mais PAS sur les boutons du dropdown
  document.addEventListener("click", e => {
    if (dropdown && !dropdown.contains(e.target) && e.target !== avatarBtn && !avatarBtn?.contains(e.target)) {
      dropdown.classList.add("hidden");
      chevron?.classList.remove("rotate-180");
    }
  });

  // Ouvrir profil
  document.getElementById("btnOuvrirProfil")?.addEventListener("click", e => {
    e.stopPropagation();
    dropdown?.classList.add("hidden");
    chevron?.classList.remove("rotate-180");
    if (onProfilOpen) onProfilOpen();
  });

  // Déconnexion depuis dropdown
  document.getElementById("logoutBtnDropdown")?.addEventListener("click", e => {
    e.stopPropagation();
    if (onLogout) onLogout();
  });
}