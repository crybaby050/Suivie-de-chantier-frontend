import { brickLoaderHTML, runBrickLoader, getBrickCycleDuration } from "../Components/brickLoader.js";

/**
 * Affiche le loader "briques" dans le container donné et lance l'animation.
 * Retourne une fonction stopLoader() à appeler une fois le rendu final prêt.
 *
 * Usage :
 *   const stopLoader = showBrickLoader(app);
 *   const [data] = await Promise.all([ chargerDonnees(), brickCycleDelay() ]);
 *   stopLoader();
 *   // ... renderPage() ...
 */
export function showBrickLoader(container, { rows = 3, cols = 6, delay = 55 } = {}) {
    container.innerHTML = `
    <div class="grid min-h-[60vh] place-items-center">
      ${brickLoaderHTML(rows, cols)}
    </div>`;

    return runBrickLoader({ container, delay });
}

/**
 * Promesse qui se résout après un cycle complet de l'animation,
 * pour éviter un flash trop court si les données arrivent très vite.
 */
export function brickCycleDelay(rows = 3, cols = 6, delay = 55) {
    return new Promise(resolve => setTimeout(resolve, getBrickCycleDuration(rows, cols, delay)));
}