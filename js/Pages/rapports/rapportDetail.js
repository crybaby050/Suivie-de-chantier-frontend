import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openConfirm } from "../../Components/modal.js";
import { isAdmin, isClient, isChef, isOuvrier, getSession } from "../../Utils/auth.js";
import {
    publierRapport,
    supprimerPhotoRapport,
} from "../../Services/rapportService.js";
import { uploadImageCloudinary } from "../../Services/cloudinaryService.js";
import { ajouterPhotoRapport } from "../../Services/rapportService.js";
import { getStatutBadge, formatDate, getInitials } from "./rapportsHelpers.js";
import { openRapportForm } from "./rapportForm.js";
import { openSignalementForm } from "../signalements/signalementForm.js";

export function renderRapportDetail(rapport, auteur, projet, projets, onBack, onSuccess) {
    const app = document.getElementById("app");

function render() {
        const session = getSession();
        // Seuls le chef et les ouvriers peuvent créer/modifier/publier — jamais l'admin ni le client
        const peutModifier = isChef() || isOuvrier();
        const peutPublier = peutModifier && rapport.statutRapport === "Brouillon";
        const peutSupprimer = isAdmin();
        const peutAjouterPhoto = session?.id === rapport.auteurId;
        const peutSignaler = !isAdmin() && session?.id !== rapport.auteurId;

        app.innerHTML = `
      <div class="space-y-5">

        <!-- En-tête -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button id="btnRetourRapports" class="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted transition hover:text-primary">
              <i class="fa-solid fa-arrow-left text-xs"></i> Retour aux rapports
            </button>
            <h1 class="text-2xl font-black text-texte sm:text-3xl">Rapport</h1>
            <p class="mt-1 text-sm text-muted">${escapeHtml(projet?.nom ?? "—")}</p>
          </div>

          <div class="flex flex-shrink-0 flex-wrap gap-2">
            ${peutPublier ? `
              <button id="btnPublier" class="flex items-center gap-2 rounded-xl bg-succes px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-succes/80">
                <i class="fa-solid fa-paper-plane text-xs"></i> Publier
              </button>
            ` : ""}
            ${peutModifier ? `
              <button id="btnModifierRapport" class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-secondary">
                <i class="fa-solid fa-pen text-xs"></i> Modifier
              </button>
            ` : ""}
            ${peutSupprimer ? `
              <button id="btnSupprimerRapport" class="flex items-center gap-2 rounded-xl border border-bordure bg-carte px-4 py-2.5 text-sm font-bold text-muted shadow-card transition hover:bg-bloque/10 hover:text-bloque">
                <i class="fa-solid fa-trash text-xs"></i> Supprimer
              </button>
            ` : ""}
            ${peutSignaler ? `
              <button id="btnSignalerRapport" class="flex items-center gap-2 rounded-xl border border-bloque/30 bg-bloque/5 px-4 py-2.5 text-sm font-bold text-bloque shadow-card transition hover:bg-bloque/10">
                <i class="fa-solid fa-triangle-exclamation text-xs"></i> Signaler
              </button>
            ` : ""}
          </div>
        </div>

        <!-- Carte principale -->
        <div class="rounded-2xl border border-bordure bg-carte p-5 shadow-card sm:p-6">

          <!-- Header rapport -->
          <div class="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-bordure pb-5">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary">
                ${getInitials(auteur?.nom ?? "?")}
              </div>
              <div>
                <p class="font-black text-texte">${escapeHtml(auteur?.nom ?? "Auteur inconnu")}</p>
                <p class="text-xs text-muted">${escapeHtml(auteur?.roleGlobal ?? "—")} · ${formatDate(rapport.date)}</p>
              </div>
            </div>
            ${getStatutBadge(rapport.statutRapport)}
          </div>

          <!-- Contenu -->
          <div class="mb-6">
            <p class="whitespace-pre-wrap text-sm leading-7 text-texte">${escapeHtml(rapport.contenu)}</p>
          </div>

          <!-- Photos -->
          <div class="border-t border-bordure pt-5">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-xs font-black uppercase tracking-wider text-muted">
                Photos (${(rapport.photos ?? []).length})
              </p>
              ${peutAjouterPhoto ? `
                <label for="addPhotoRapport" class="cursor-pointer text-xs font-bold text-primary transition hover:text-secondary">
                  <i class="fa-solid fa-plus text-[10px]"></i> Ajouter
                </label>
                <input type="file" id="addPhotoRapport" accept="image/*" multiple class="hidden" />
              ` : ""}
            </div>

            ${(rapport.photos ?? []).length === 0
                ? `<p class="text-xs italic text-muted">Aucune photo jointe.</p>`
                : `
                <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  ${(rapport.photos ?? []).map(url => `
                    <div class="group relative aspect-square overflow-hidden rounded-xl">
                      <a href="${escapeHtml(url)}" target="_blank" rel="noopener">
                        <img src="${escapeHtml(url)}" alt="Photo rapport" class="h-full w-full object-cover transition group-hover:scale-105" />
                      </a>
                      ${peutAjouterPhoto ? `
                        <button
                          class="btn-remove-photo-rapport absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-bloque text-white text-[10px] opacity-0 transition group-hover:opacity-100"
                          data-url="${escapeHtml(url)}"
                          title="Supprimer cette photo"
                        >
                          <i class="fa-solid fa-xmark"></i>
                        </button>
                      ` : ""}
                    </div>
                  `).join("")}
                </div>
              `
            }
          </div>

        </div>

      </div>
    `;

        bindDetailEvents();
    }

    function bindDetailEvents() {
        document.getElementById("btnRetourRapports")?.addEventListener("click", onBack);

        document.getElementById("btnPublier")?.addEventListener("click", async () => {
            openConfirm({
                message: "Publier ce rapport ? Il sera visible par le client.",
                confirmLabel: "Publier",
                onConfirm: async () => {
                    try {
                        await publierRapport(rapport.id);
                        rapport.statutRapport = "Publié";
                        showToast("Rapport publié.");
                        render();
                        await onSuccess();
                    } catch (err) {
                        showToast(err.message, "error");
                    }
                },
            });
        });

        document.getElementById("btnModifierRapport")?.addEventListener("click", () => {
            openRapportForm(rapport, projets, async () => {
                await onSuccess();
            });
        });

        document.getElementById("btnSupprimerRapport")?.addEventListener("click", () => {
            openConfirm({
                message: "Supprimer ce rapport ? Cette action est irréversible.",
                confirmLabel: "Supprimer",
                onConfirm: async () => {
                    try {
                        const { supprimerRapport } = await import("../../Services/rapportService.js");
                        await supprimerRapport(rapport.id);
                        showToast("Rapport supprimé.");
                        onBack();
                    } catch (err) {
                        showToast(err.message, "error");
                    }
                },
            });
        });

        document.getElementById("btnSignalerRapport")?.addEventListener("click", () => {
            openSignalementForm([], () => {}, {
                cibleType: "Rapport",
                cibleLabel: rapport.contenu.slice(0, 60) + (rapport.contenu.length > 60 ? "..." : ""),
                projetId: rapport.projetId,
                rapportId: rapport.id,
            });
        });

        // Supprimer une photo
        document.querySelectorAll(".btn-remove-photo-rapport").forEach(btn => {
            btn.addEventListener("click", () => {
                openConfirm({
                    message: "Supprimer cette photo ?",
                    confirmLabel: "Supprimer",
                    onConfirm: async () => {
                        try {
                            await supprimerPhotoRapport(rapport.id, btn.dataset.url, rapport);
                            rapport.photos = rapport.photos.filter(p => p !== btn.dataset.url);
                            showToast("Photo supprimée.");
                            render();
                        } catch (err) {
                            showToast(err.message, "error");
                        }
                    },
                });
            });
        });

        // Ajouter des photos
        document.getElementById("addPhotoRapport")?.addEventListener("change", async e => {
            const files = Array.from(e.target.files);
            if (!files.length) return;

            showToast("Upload en cours...");

            try {
                for (const file of files) {
                    const url = await uploadImageCloudinary(file);
                    await ajouterPhotoRapport(rapport.id, url, rapport);
                    rapport.photos = [...(rapport.photos ?? []), url];
                }
                showToast("Photos ajoutées.");
                render();
                await onSuccess();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }

    render();
}