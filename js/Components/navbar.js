import { getSession } from "../Utils/auth.js";

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
    <header class="fixed left-0 right-0 top-0 z-20 h-16 bg-primary shadow-soft lg:left-64" id="navbar">
      <div class="flex h-full items-center gap-3 px-4 sm:px-6">

        <!-- Bouton menu mobile -->
        <button
          id="sidebarToggle"
          class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <i class="fa-solid fa-bars text-sm"></i>
        </button>

        <!-- Titre page -->
        <div class="flex items-center gap-2 min-w-0">
          <span id="navbarTitle" class="truncate text-sm font-bold text-white sm:text-base">Dashboard</span>
        </div>

        <!-- Recherche desktop -->
        <div class="mx-4 hidden flex-1 max-w-md lg:block">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/50"></i>
            <input
              type="text"
              placeholder="Recherche globale..."
              class="w-full rounded-xl bg-white/10 py-2 pl-8 pr-4 text-sm text-white placeholder:text-white/50 outline-none transition focus:bg-white/20 focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        <!-- Spacer -->
        <div class="flex-1 lg:hidden"></div>

        <!-- Droite -->
        <div class="flex items-center gap-2 sm:gap-3">

          <!-- Recherche mobile -->
          <button
            id="mobileSearchToggle"
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
          >
            <i class="fa-solid fa-magnifying-glass text-sm"></i>
          </button>

          <!-- Badge rôle -->
          <div class="hidden sm:block">${roleBadge}</div>

          <!-- Avatar + nom -->
          <div class="flex items-center gap-2 cursor-pointer">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white sm:h-9 sm:w-9">
              <i class="fa-solid fa-user text-xs sm:text-sm"></i>
            </div>
            <span class="hidden text-sm font-semibold text-white md:block truncate max-w-[120px]">
              ${session?.nom ?? ""}
            </span>
            <i class="fa-solid fa-chevron-down text-xs text-white/60 hidden md:block"></i>
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

export function initNavbar() {
  const toggle = document.getElementById("mobileSearchToggle");
  const bar    = document.getElementById("mobileSearchBar");

  toggle?.addEventListener("click", () => {
    bar.classList.toggle("hidden");
  });
}