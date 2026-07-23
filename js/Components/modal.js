let activeModal = null;

function getRoot() {
  let root = document.getElementById("modalRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "modalRoot";
    document.body.appendChild(root);
  }
  return root;
}

export function openModal({
  title,
  icon = "fa-circle-info",
  iconClass = "bg-indigo-100 text-indigo-600",
  body = "",
  confirmLabel = "Enregistrer",
  confirmIcon = "fa-floppy-disk",
  confirmClass = "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700",
  cancelLabel = "Annuler",
  onConfirm = null,
  onMount = null,
}) {
  closeModal();

  const lastFocused = document.activeElement;

  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  overlay.innerHTML = `
    <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <div class="mb-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}">
            <i class="fa-solid ${icon}"></i>
          </div>
          <h2 class="text-xl font-black tracking-tight text-slate-950">${title}</h2>
        </div>
        <button type="button" data-modal-close class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Fermer">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form data-modal-form class="grid gap-4">
        ${body}
        <div class="mt-2 flex justify-end gap-3">
          <button type="button" data-modal-cancel class="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">${cancelLabel}</button>
          <button type="submit" class="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold text-white shadow-lg transition ${confirmClass}">
            <i class="fa-solid ${confirmIcon}"></i>
            <span>${confirmLabel}</span>
          </button>
        </div>
      </form>
    </div>
  `;

  getRoot().appendChild(overlay);

  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKeydown);
    activeModal = null;
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
    }
  }

  function onKeydown(event) {
    if (event.key === "Escape") close();
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  overlay.querySelector("[data-modal-close]").addEventListener("click", close);
  overlay.querySelector("[data-modal-cancel]").addEventListener("click", close);

  overlay.querySelector("[data-modal-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (typeof onConfirm === "function") {
      const result = await onConfirm(overlay);
      if (result === false) return;
    }
    close();
  });

  document.addEventListener("keydown", onKeydown);
  activeModal = { close };

  if (typeof onMount === "function") {
    onMount(overlay);
  } else {
    const target = overlay.querySelector("input, select, textarea") || overlay.querySelector("[type=submit]");
    if (target) target.focus();
  }

  return { close };
}

export function openConfirm({ message, confirmLabel = "Confirmer", onConfirm }) {
  return openModal({
    title: "Confirmation",
    icon: "fa-triangle-exclamation",
    iconClass: "bg-rose-100 text-rose-600",
    body: `<p class="text-sm leading-6 text-slate-600">${message}</p>`,
    confirmLabel,
    confirmIcon: "fa-check",
    confirmClass: "bg-rose-600 shadow-rose-200 hover:bg-rose-700",
    onConfirm,
  });
}

export function closeModal() {
  if (activeModal) activeModal.close();
}