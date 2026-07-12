import { getSession, isAdmin, isChef, isOuvrier, isClient, canManage } from "../Utils/auth.js";
import { escapeHtml } from "../Utils/html.js";

export function renderSidebar() {
    const session = getSession();
    const role = session?.roleGlobal;

    const NAV_LINKS = [
        { page: "dashboard", label: "Dashboard", icon: "fa-gauge", always: true },
        { page: "projets", label: "Projets", icon: "fa-building", always: true },
        { page: "utilisateurs", label: "Utilisateurs", icon: "fa-users", admin: true },
        { page: "materiaux", label: "Matériaux", icon: "fa-cubes", manage: true },
        { page: "rapports", label: "Rapports", icon: "fa-file-lines", always: true },
        { page: "signalements", label: "Signalements", icon: "fa-triangle-exclamation", manage: true },
        { page: "taches", label: "Mes tâches", icon: "fa-list-check", ouvrier: true },
        { page: "validationTaches", label: "Validation des tâches", icon: "fa-clipboard-check", manage: true },
    ];

    const filteredLinks = NAV_LINKS.filter(link => {
        if (link.always) return true;
        if (link.admin) return isAdmin();
        if (link.manage) return canManage();
        if (link.ouvrier) return isOuvrier();
        return false;
    });

    const ROLE_BADGES = {
        "Admin": `<span class="rounded-full bg-role-admin/10 px-2 py-0.5 text-[11px] font-bold text-role-admin">Admin</span>`,
        "Chef de chantier": `<span class="rounded-full bg-role-chef/10 px-2 py-0.5 text-[11px] font-bold text-role-chef">Chef</span>`,
        "Ouvrier": `<span class="rounded-full bg-role-ouvrier/10 px-2 py-0.5 text-[11px] font-bold text-role-ouvrier">Ouvrier</span>`,
        "Client": `<span class="rounded-full bg-role-client/10 px-2 py-0.5 text-[11px] font-bold text-role-client">Client</span>`,
    };

    const roleBadge = ROLE_BADGES[role] ?? "";

    const items = filteredLinks.map(link => `
    <button
      class="nav-link group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted transition-all hover:bg-fond hover:text-primary"
      data-page="${link.page}"
    >
      <span class="nav-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-fond text-muted transition group-hover:bg-primary/10 group-hover:text-primary">
        <i class="fa-solid ${link.icon} text-xs"></i>
      </span>
      <span class="nav-label truncate">${link.label}</span>
    </button>
  `).join("");

    return `
    <aside
  id="sidebar"
  class="fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-bordure bg-carte transition-all duration-300 ease-in-out -translate-x-full lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
>
      <!-- Header -->
      <div class="flex flex-shrink-0 items-center gap-2 border-b border-bordure px-4 py-4">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary">
          <i class="fa-solid fa-helmet-safety text-accent text-sm"></i>
        </div>
        <div class="sidebar-text flex-1 min-w-0">
          <h1 class="truncate text-sm font-extrabold tracking-tight text-primary">Suivi Chantier</h1>
          <p class="text-[11px] text-muted">Gestion de chantier</p>
        </div>
        <!-- Fermer mobile -->
        <button id="sidebarClose" class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-fond hover:text-primary lg:hidden">
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
        <!-- Collapse desktop -->
        <button id="sidebarCollapseBtn" class="hidden h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-fond hover:text-primary lg:flex">
          <i id="collapseIcon" class="fa-solid fa-angles-left text-xs"></i>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto px-3 py-4">
        <p class="sidebar-text mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted/60">Menu</p>
        <div class="grid gap-1">
          ${items}
        </div>
      </nav>

      <!-- Profil + logout -->
      <div class="flex-shrink-0 border-t border-bordure p-3">
        <div class="sidebar-text mb-2 flex items-center gap-3 rounded-xl bg-fond px-3 py-2.5">
          <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <i class="fa-solid fa-user text-xs"></i>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-bold text-texte">
              ${escapeHtml(session?.nom ?? session?.email ?? "")}
            </p>
            <div class="mt-0.5">${roleBadge}</div>
          </div>
        </div>
        <button
          id="logoutBtn"
          class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-bloque transition hover:bg-bloque/10"
        >
          <i class="fa-solid fa-arrow-right-from-bracket text-xs flex-shrink-0"></i>
          <span class="sidebar-text">Se déconnecter</span>
        </button>
      </div>
    </aside>
  `;
}

export function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const toggleBtn = document.getElementById("sidebarToggle");
    const closeBtn = document.getElementById("sidebarClose");
    const collapseBtn = document.getElementById("sidebarCollapseBtn");
    const collapseIcon = document.getElementById("collapseIcon");
    const navbar = document.getElementById("navbar");

    let collapsed = false;

    const openSidebar = () => {
        sidebar.classList.remove("-translate-x-full");
        overlay.classList.remove("hidden");
    };

    const closeSidebar = () => {
        sidebar.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
    };

    const collapseSidebar = () => {
        collapsed = !collapsed;

        if (collapsed) {
            // Réduire sidebar
            sidebar.classList.remove("w-64");
            sidebar.classList.add("w-16");

            // Navbar suit
            navbar.classList.remove("lg:left-64");
            navbar.classList.add("lg:left-16");

            // Icône collapse
            collapseIcon.className = "fa-solid fa-angles-right text-xs";

            // Cacher textes
            sidebar.querySelectorAll(".sidebar-text, .nav-label").forEach(el => el.classList.add("hidden"));

            // Centrer icônes nav
            sidebar.querySelectorAll(".nav-link").forEach(el => {
                el.classList.add("justify-center");
                el.classList.remove("px-3");
                el.classList.add("px-0");
            });

        } else {
            // Étendre sidebar
            sidebar.classList.add("w-64");
            sidebar.classList.remove("w-16");

            // Navbar suit
            navbar.classList.add("lg:left-64");
            navbar.classList.remove("lg:left-16");

            // Icône collapse
            collapseIcon.className = "fa-solid fa-angles-left text-xs";

            // Afficher textes
            sidebar.querySelectorAll(".sidebar-text, .nav-label").forEach(el => el.classList.remove("hidden"));

            // Remettre icônes nav
            sidebar.querySelectorAll(".nav-link").forEach(el => {
                el.classList.remove("justify-center");
                el.classList.add("px-3");
                el.classList.remove("px-0");
            });
        }
    };

    toggleBtn?.addEventListener("click", openSidebar);
    closeBtn?.addEventListener("click", closeSidebar);
    overlay?.addEventListener("click", closeSidebar);
    collapseBtn?.addEventListener("click", collapseSidebar);

    return { close: closeSidebar };
}