import { showToast } from "./Components/toast.js";
import { requireAuth, isAdmin, isChef, isOuvrier, isClient, canManage } from "./Utils/auth.js";
import { renderDashboardPage } from "./Pages/dashboardPage.js";
import { renderProjetsPage } from "./Pages/projets/projetsPage.js";
import { renderUtilisateursPage } from "./Pages/utilisateurs/utilisateursPage.js";
import { renderMateriauxPage } from "./Pages/materiauxPage.js";
import { renderRapportsPage } from "./Pages/rapports/rapportsPage.js";
import { renderSignalementsPage } from "./Pages/signalements/signalementsPage.js";
import { renderTachesPage } from "./Pages/tachesPage.js";
import {
    brickLoaderHTML,
    runBrickLoader,
    getBrickCycleDuration
} from "./Components/brickLoader.js";
import { renderValidationTachesPage } from "./Pages/validationTachesPage.js";


const routes = {
    dashboard: renderDashboardPage,
    projets: renderProjetsPage,
    utilisateurs: renderUtilisateursPage,
    materiaux: renderMateriauxPage,
    rapports: renderRapportsPage,
    signalements: renderSignalementsPage,
    taches: renderTachesPage,
    validationTaches: renderValidationTachesPage,
};

const titles = {
    dashboard: "Dashboard",
    projets: "Projets",
    utilisateurs: "Utilisateurs",
    materiaux: "Matériaux",
    rapports: "Rapports",
    signalements: "Signalements",
    taches: "Mes tâches",
    validationTaches: "Validation des tâches",
};

function canAccess(page) {
    if (isAdmin()) return true;
    if (isChef()) return ["dashboard", "projets", "materiaux", "rapports", "signalements", "validationTaches"].includes(page);
    if (isOuvrier()) return ["dashboard", "projets", "taches", "rapports", "signalements"].includes(page);
    if (isClient()) return ["dashboard", "projets", "rapports"].includes(page);
    return false;
}

export async function navigate(page = "dashboard") {
    console.log("1 - navigate() appelé avec :", page); // TEST

    if (!requireAuth()) return;

    if (!canAccess(page)) {
        showToast("Accès non autorisé.", "error");
        return;
    }

    const app = document.getElementById("app");
    const route = routes[page] ?? routes.dashboard;
    console.log("2 - route sélectionnée, sur le point d'appeler route()"); // TEST


    // Mettre à jour les liens actifs dans la sidebar
    document.querySelectorAll("[data-page]").forEach((button) => {
        const isActive = button.dataset.page === page;
        button.classList.toggle("bg-primary", isActive);
        button.classList.toggle("text-white", isActive);
        button.classList.toggle("shadow-soft", isActive);

        // Icône active
        const icon = button.querySelector("span:first-child");
        if (icon) {
            icon.classList.toggle("bg-white/20", isActive);
            icon.classList.toggle("text-white", isActive);
            icon.classList.toggle("bg-fond", !isActive);
            icon.classList.toggle("text-muted", !isActive);
        }

        button.classList.toggle("text-muted", !isActive);
        button.classList.toggle("hover:bg-fond", !isActive);
        button.classList.toggle("hover:text-primary", !isActive);
    });

    // Mettre à jour le titre navbar
    const navbarTitle = document.getElementById("navbarTitle");
    if (navbarTitle) navbarTitle.textContent = titles[page] ?? page;

    // Loader
    app.innerHTML = `
    <div class="grid min-h-[60vh] place-items-center">
      ${brickLoaderHTML(3, 6)}
    </div>`;

    const stopLoader = runBrickLoader({
        container: app,
        delay: 55,
    });

    try {
        console.log("3 - juste avant Promise.all"); // TEST

        const cycleDuration = getBrickCycleDuration(3, 6, 55);
        await Promise.all([
            route(),
            new Promise((resolve) => setTimeout(resolve, cycleDuration)),
        ]);
        console.log("4 - Promise.all terminé avec succès"); // TEST

        stopLoader();
    }
    catch (error) {
        console.log("5 - ERREUR attrapée :", error); // TEST

        stopLoader();

        app.innerHTML = `
      <div class="rounded-2xl border border-bloque/20 bg-carte p-6 shadow-card sm:p-8">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-bloque/10 text-bloque">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>

        <h1 class="text-xl font-black text-texte">
          Erreur de chargement
        </h1>

        <p class="mt-2 text-sm leading-6 text-muted">
          ${error.message}
        </p>

        <button
            onclick="window.dispatchEvent(new CustomEvent('app:login'))"
            class="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-secondary">
            Réessayer
        </button>
      </div>
    `;

        showToast(error.message, "error");
    }
}