const BRICK_BASE = [
    "brick",
    "w-9", "h-[18px]", "rounded-[2px]", "relative",
    "opacity-0", "-translate-y-10",
    "transition-all", "duration-[400ms]", "ease-[cubic-bezier(.22,1,.36,1)]",
    "bg-[linear-gradient(180deg,#d97d4b_0%,#c76a3f_45%,#aa5532_100%)]",
    "border", "border-[#864328]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,.18),inset_-1px_-1px_0_rgba(0,0,0,.18),0_2px_4px_rgba(0,0,0,.35)]",
    "before:content-['']", "before:absolute", "before:inset-0",
    "before:bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,.15)_1px,transparent_2px),radial-gradient(circle_at_70%_50%,rgba(0,0,0,.10)_1px,transparent_2px)]",
    "before:mix-blend-overlay",
].join(" ");

const BRICK_HIDDEN = ["opacity-0", "-translate-y-10"];
const BRICK_SHOWN = ["opacity-100", "translate-y-0"];

export function getBrickCycleDuration(rows, cols, delay = 55) {
    const constructionTime = rows * cols * delay;
    const pauseBeforeReset = 700;
    const delayBeforeRebuild = 300;
    return constructionTime + pauseBeforeReset + delayBeforeRebuild;
}

export function brickLoaderHTML(rows = 3, cols = 6) {
    let rowsHTML = "";
    // r = rows-1 (rangée du haut) → r = 0 (rangée du bas), ordre d'AFFICHAGE (correct, ne pas toucher)
    for (let r = rows - 1; r >= 0; r--) {
        const offsetClass = r % 2 === 0 ? "ml-[19px]" : "";
        rowsHTML += `<div class="flex gap-[3px] ${offsetClass}">` +
            Array.from({ length: cols }, () => `<div class="${BRICK_BASE}" data-row="${r}"></div>`).join("") +
            `</div>`;
    }
    return `
    <div class="flex flex-col items-center gap-3">
      <div class="w-[200px] grid gap-[3px]">${rowsHTML}</div>
      <p class="text-muted font-light tracking-[2px] text-sm">Chargement...</p>
    </div>`;
}

export function runBrickLoader({
    container,
    delay = 55,
} = {}) {

    const bricks = [...container.querySelectorAll(".brick")]
        .sort((a, b) => Number(a.dataset.row) - Number(b.dataset.row))
        .reverse();

    let stopRequested = false;
    let resolveStop;

    const stopPromise = new Promise(resolve => {
        resolveStop = resolve;
    });

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    (async () => {

        while (!stopRequested) {

            // Construction du mur
            for (const brick of bricks) {

                brick.classList.remove(...BRICK_HIDDEN);
                brick.classList.add(...BRICK_SHOWN);

                await sleep(delay);
            }

            // Pause
            await sleep(700);

            if (stopRequested) break;

            // On cache toutes les briques
            bricks.forEach(brick => {
                brick.classList.remove(...BRICK_SHOWN);
                brick.classList.add(...BRICK_HIDDEN);
            });

            await sleep(300);
        }

        resolveStop();

    })();
    

    return () => {
        stopRequested = true;
        return stopPromise;
    };
}