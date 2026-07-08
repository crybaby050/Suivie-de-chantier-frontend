let timer = null;

export function showToast(message, type = "success") {
  const toast = document.getElementById("toast");

  if (!toast) return;

  clearTimeout(timer);

  const icon = type === "error" ? "fa-circle-exclamation" : "fa-circle-check";

  toast.innerHTML = `<span class="inline-flex items-center gap-2"><i class="fa-solid ${icon}"></i>${message}</span>`;

  const typeClasses = type === "error"
    ? "bg-rose-600 text-white shadow-rose-200"
    : "bg-slate-950 text-white shadow-slate-300";

  toast.className = `pointer-events-auto fixed right-5 top-20 z-50 block max-w-sm rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl ${typeClasses}`;

  timer = setTimeout(() => {
    toast.className = "pointer-events-none fixed right-5 top-20 z-50 hidden max-w-sm rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl";
  }, 2800);
}
