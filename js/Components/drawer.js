let activeDrawer = null;

/**
 * Ouvre un drawer (panneau latéral) glissant depuis la droite.
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.icon] - classe FontAwesome (ex: "fa-box-archive")
 * @param {string} options.body - HTML du contenu
 * @param {Function} [options.onMount] - appelé avec l'élément panel une fois inséré dans le DOM
 * @param {Function} [options.onClose] - appelé à la fermeture
 */
export function openDrawer({ title, icon = "fa-box-archive", body, onMount, onClose }) {
    closeDrawer();

    const overlay = document.createElement("div");
    overlay.id = "drawer-overlay";
    overlay.className = "fixed inset-0 z-40 bg-black/40 opacity-0 transition-opacity duration-300";

    const panel = document.createElement("div");
    panel.id = "drawer-panel";
    panel.className = "fixed right-0 top-0 z-50 flex h-full w-full max-w-md translate-x-full flex-col bg-carte shadow-2xl transition-transform duration-300";

    panel.innerHTML = `
    <div class="flex items-center justify-between border-b border-bordure px-5 py-4">
      <div class="flex items-center gap-2">
        <i class="fa-solid ${icon} text-primary"></i>
        <h2 class="text-base font-black text-texte">${title}</h2>
      </div>
      <button id="drawer-close-btn" class="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-fond hover:text-texte">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>
    <div id="drawer-body" class="flex-1 overflow-y-auto p-5">
      ${body}
    </div>
  `;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
        overlay.classList.remove("opacity-0");
        panel.classList.remove("translate-x-full");
    });

    function close() {
        overlay.classList.add("opacity-0");
        panel.classList.add("translate-x-full");
        setTimeout(() => {
            overlay.remove();
            panel.remove();
            document.body.style.overflow = "";
        }, 300);
        if (onClose) onClose();
        activeDrawer = null;
    }

    overlay.addEventListener("click", close);
    panel.querySelector("#drawer-close-btn").addEventListener("click", close);

    activeDrawer = { close };

    if (onMount) onMount(panel);
}

export function closeDrawer() {
    if (activeDrawer) activeDrawer.close();
}