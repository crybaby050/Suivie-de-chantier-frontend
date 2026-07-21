import { login }     from "../Services/authService.js";
import { showToast } from "../Components/toast.js";

export function renderLoginPage() {
  const app = document.getElementById("app");

  // Supprimer le layout pour la page de login
  document.getElementById("sidebarRoot").innerHTML = "";
  document.getElementById("navbarRoot").innerHTML  = "";

  app.className = "flex min-h-screen w-full";

  app.innerHTML = `
    <div class="flex min-h-screen w-full">

      <!-- Colonne gauche — visuel -->
      <div class="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-10 lg:flex">

        <!-- Motif décoratif -->
        <div class="absolute inset-0 opacity-10">
          <div class="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-accent"></div>
          <div class="absolute -bottom-32 -right-20 h-[500px] w-[500px] rounded-full bg-secondary"></div>
          <div class="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"></div>
        </div>

        <!-- Logo -->
        <div class="relative flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-soft">
            <i class="fa-solid fa-helmet-safety text-primary text-sm"></i>
          </div>
          <span class="text-lg font-extrabold tracking-tight text-white">Suivi Chantier</span>
        </div>

        <!-- Texte central -->
        <div class="relative space-y-6">
          <div>
            <h2 class="text-4xl font-black leading-tight text-white">
              Pilotez vos chantiers<br/>
              <span class="text-accent">en temps réel.</span>
            </h2>
            <p class="mt-4 text-sm leading-7 text-white/70">
              Suivez l'avancement de vos projets, gérez vos équipes et anticipez les blocages depuis une seule plateforme. Une solution pensée pour les professionnels du BTP.
            </p>
          </div>
        </div>

        <!-- Footer gauche -->
        <div class="relative">
          <p class="text-xs text-white/40">&copy; 2024 Suivi Chantier. Tous droits réservés.</p>
        </div>
      </div>

      <!-- Colonne droite — formulaire -->
      <div class="flex w-full flex-col items-center justify-center bg-carte p-6 sm:p-10 lg:w-1/2">
        <div class="w-full max-w-md">

          <!-- Logo mobile -->
          <div class="mb-8 flex items-center gap-3 lg:hidden">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-soft">
              <i class="fa-solid fa-helmet-safety text-accent text-sm"></i>
            </div>
            <span class="text-lg font-extrabold tracking-tight text-primary">Suivi Chantier</span>
          </div>

          <!-- Titre -->
          <div class="mb-8">
            <h1 class="text-3xl font-black tracking-tight text-texte sm:text-4xl">
              Welcome back
            </h1>
            <p class="mt-2 text-sm text-muted">Connectez-vous pour accéder à votre espace</p>
          </div>

          <!-- Formulaire -->
          <form id="loginForm" novalidate class="space-y-5">

            <!-- Email -->
            <div>
              <label for="loginEmail" class="mb-1.5 block text-sm font-bold text-texte">
                Email
              </label>
              <input
                type="email"
                id="loginEmail"
                autocomplete="email"
                placeholder="Enter your email"
                class="w-full rounded-xl border border-bordure bg-fond px-4 py-3 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p id="loginEmailError" class="mt-1 hidden text-xs text-bloque"></p>
            </div>

            <!-- Password -->
            <div>
              <label for="loginPassword" class="mb-1.5 block text-sm font-bold text-texte">
                Password
              </label>
              <div class="relative">
                <input
                  type="password"
                  id="loginPassword"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  class="w-full rounded-xl border border-bordure bg-fond px-4 py-3 pr-11 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  id="togglePassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-primary"
                  aria-label="Afficher / masquer"
                >
                  <i class="fa-solid fa-eye text-sm" id="togglePasswordIcon"></i>
                </button>
              </div>
              <p id="loginPasswordError" class="mt-1 hidden text-xs text-bloque"></p>
            </div>

            <!-- Bouton -->
            <button
              type="submit"
              id="loginBtn"
              class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i id="loginBtnIcon" class="fa-solid fa-arrow-right-to-bracket"></i>
              <span id="loginBtnText">Login</span>
            </button>

          </form>

          <!-- Aide -->
          <p class="mt-6 text-center text-xs text-muted">
            Contactez votre administrateur si vous avez perdu vos identifiants.
          </p>

        </div>
      </div>
    </div>
  `;

  bindLoginEvents();
}

function bindLoginEvents() {
  const form       = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const passInput  = document.getElementById("loginPassword");
  const btn        = document.getElementById("loginBtn");
  const btnText    = document.getElementById("loginBtnText");
  const toggleBtn  = document.getElementById("togglePassword");
  const toggleIcon = document.getElementById("togglePasswordIcon");

  toggleBtn.addEventListener("click", () => {
    const isHidden = passInput.type === "password";
    passInput.type = isHidden ? "text" : "password";
    toggleIcon.className = isHidden ? "fa-solid fa-eye-slash text-sm" : "fa-solid fa-eye text-sm";
  });

  emailInput.addEventListener("input", () => clearError("loginEmail", "loginEmailError"));
  passInput.addEventListener("input",  () => clearError("loginPassword", "loginPasswordError"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = emailInput.value.trim();
    const password = passInput.value;
    let valid = true;

    if (!email) {
      showFieldError("loginEmail", "loginEmailError", "L'email est obligatoire.");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError("loginEmail", "loginEmailError", "Adresse e-mail invalide.");
      valid = false;
    }

    if (!password) {
      showFieldError("loginPassword", "loginPasswordError", "Le mot de passe est obligatoire.");
      valid = false;
    }

    if (!valid) return;

    btn.disabled = true;
    btnText.textContent = "Connexion...";

    try {
      await login(email, password);
      showToast("Bienvenue !");
      window.dispatchEvent(new CustomEvent("app:login"));
    } catch (error) {
      showToast(error.message, "error");
      btn.disabled = false;
      btnText.textContent = "Login";
    }
  });
}

function showFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  input.classList.add("!border-bloque", "focus:!ring-bloque/20");
  error.textContent = message;
  error.classList.remove("hidden");
}

function clearError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  input.classList.remove("!border-bloque", "focus:!ring-bloque/20");
  error.classList.add("hidden");
}