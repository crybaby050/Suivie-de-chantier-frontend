import { escapeHtml } from "../utils/html.js";

export function pageHeader({ kicker = "Application", title, subtitle, actionLabel = null, actionId = null, actionIcon = "fa-plus" }) {
  const action = actionLabel
    ? `
      <button id="${escapeHtml(actionId)}" class="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20">
        <i class="fa-solid ${escapeHtml(actionIcon)}"></i>
        <span>${escapeHtml(actionLabel)}</span>
      </button>
    `
    : "";

  return `
    <header class="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-800 p-7 text-white shadow-soft sm:p-8">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-3xl">
          <div class="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100 ring-1 ring-white/15">
            ${escapeHtml(kicker)}
          </div>
          <h1 class="text-3xl font-black tracking-tight sm:text-5xl">${escapeHtml(title)}</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">${escapeHtml(subtitle)}</p>
        </div>
        ${action}
      </div>
    </header>
  `;
}
