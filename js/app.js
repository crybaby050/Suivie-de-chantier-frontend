import { renderSidebar, initSidebar } from "./Components/sidebar.js";
import { renderNavbar, initNavbar }   from "./Components/navbar.js";
import { navigate }                   from "./router.js";
import { requireAuth, isAdmin, isChef, isOuvrier, isClient } from "./Utils/auth.js";
import { logout }                     from "./Services/authService.js";
import { renderLoginPage }            from "./Pages/loginPage.js";
import { showToast }                  from "./Components/toast.js";

function mountLayout() {
    document.getElementById("sidebarRoot").innerHTML = renderSidebar();
    document.getElementById("navbarRoot").innerHTML = renderNavbar();
}

function initLogout() {
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        logout();
        showToast("Vous êtes déconnecté.");
        startApp();
    });
}

function initNavigation(sidebar) {
    document.querySelectorAll("[data-page]").forEach((button) => {
        button.addEventListener("click", async () => {
            await navigate(button.dataset.page);
            if (window.innerWidth < 1024) sidebar.close();
        });
    });
}

function getDefaultPage() {
    if (isAdmin()) return "dashboard";
    if (isChef()) return "dashboard";
    if (isOuvrier()) return "taches";
    if (isClient()) return "rapports";
    return "dashboard";
}

export function startApp() {
    if (!requireAuth()) {
        // Nettoyer le layout
        document.getElementById("sidebarRoot").innerHTML = "";
        document.getElementById("navbarRoot").innerHTML = "";
        document.getElementById("app").className = "flex min-h-screen items-center justify-center p-4";
        document.body.className = "min-h-screen bg-fond font-sans text-texte antialiased";
        renderLoginPage();
        return;
    }

    // Restaurer le layout
    document.getElementById("app").className = "flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-20";
    document.body.className = "min-h-screen bg-fond font-sans text-texte antialiased";

    mountLayout();

    const sidebar = initSidebar();
    initNavbar();
    initNavigation(sidebar);
    initLogout();

    navigate(getDefaultPage());
}

startApp();
window.addEventListener("app:login", () => startApp());