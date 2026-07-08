/**
 * Règles de validation prédéfinies.
 * Chaque règle est un objet { test: fn, message: string }
 */
export const Rules = {
  required: (msg = "Ce champ est obligatoire.") =>
    ({ test: (v) => String(v).trim() !== "", message: msg }),

  min: (n, msg) =>
    ({ test: (v) => Number(v) >= n, message: msg ?? `Valeur minimale : ${n}.` }),

  positive: (msg = "La valeur doit être positive.") =>
    ({ test: (v) => Number(v) > 0, message: msg }),

  numeric: (msg = "Ce champ doit être un nombre.") =>
    ({ test: (v) => !isNaN(Number(v)) && String(v).trim() !== "", message: msg }),

  minLength: (n, msg) =>
    ({ test: (v) => String(v).trim().length >= n, message: msg ?? `Minimum ${n} caractère(s).` }),

  maxLength: (n, msg) =>
    ({ test: (v) => String(v).trim().length <= n, message: msg ?? `Maximum ${n} caractère(s).` }),

  email: (msg = "Adresse e-mail invalide.") =>
    ({ test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), message: msg }),
};


export function createFormValidator(container, schema) {
  // Injecte un <p> d'erreur sous chaque champ au montage
  for (const fieldId of Object.keys(schema)) {
    const field = container.querySelector(`#${fieldId}`);
    if (!field) continue;

    const p = document.createElement("p");
    p.className = "hidden mt-1 text-xs text-rose-600";
    p.dataset.errorFor = fieldId;
    field.after(p);

    // Validation live : efface l'erreur dès que l'utilisateur modifie le champ
    field.addEventListener(field.tagName === "SELECT" ? "change" : "input", () => {
      _clearError(field, container);
    });
  }

  function validate() {
    let valid = true;
    const data = {};

    for (const [fieldId, config] of Object.entries(schema)) {
      const field = container.querySelector(`#${fieldId}`);
      if (!field) continue;

      const value = field.value;
      let fieldValid = true;

      for (const rule of config.rules ?? []) {
        if (!rule.test(value)) {
          _showError(field, container, rule.message);
          fieldValid = false;
          valid = false;
          break;
        }
      }

      if (fieldValid) {
        const key = config.as ?? fieldId;
        data[key] = config.transform ? config.transform(value) : value;
      }
    }

    if (!valid) {
      container.querySelector("[data-error-for]")?.previousElementSibling?.focus();
      return null;
    }

    return data;
  }

  return { validate };
}


function _showError(field, container, message) {
  field.classList.add("!border-rose-400", "focus:!ring-rose-200");
  const p = container.querySelector(`[data-error-for="${field.id}"]`);
  if (p) { p.textContent = message; p.classList.remove("hidden"); }
}

function _clearError(field, container) {
  field.classList.remove("!border-rose-400", "focus:!ring-rose-200");
  const p = container.querySelector(`[data-error-for="${field.id}"]`);
  if (p) { p.textContent = ""; p.classList.add("hidden"); }
}