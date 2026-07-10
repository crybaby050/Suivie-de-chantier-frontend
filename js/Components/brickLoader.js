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

export function brickLoaderHTML(rows = 3, cols = 6) {
    let rowsHTML = "";
    for (let r = rows - 1; r >= 0; r--) {
        const offsetClass = r % 2 === 0 ? "ml-[19px]" : "";
        rowsHTML += `<div class="flex gap-[3px] ${offsetClass}">` +
            Array.from({ length: cols }, () => `<div class="${BRICK_BASE}"></div>`).join("") +
            `</div>`;
    }
    return `
    <div class="flex flex-col items-center gap-3">
      <div class="w-[200px] grid gap-[3px]">${rowsHTML}</div>
      <p class="text-muted font-light tracking-[2px] text-sm">Chargement...</p>
    </div>`;
}

export function runBrickLoader({ container, delay = 55, loop = true, onComplete } = {}) {
    const bricks = [...container.querySelectorAll(".brick")];
    let i = 0;
    let stopped = false;

    function step() {
        if (stopped) return;
        if (i >= bricks.length) {
            if (!loop) { if (onComplete) onComplete(); return; }
            setTimeout(() => {
                bricks.forEach((b) => {
                    b.classList.remove(...BRICK_SHOWN);
                    b.classList.add(...BRICK_HIDDEN);
                });
                i = 0;
                setTimeout(step, 300);
            }, 700);
            return;
        }
        bricks[i].classList.remove(...BRICK_HIDDEN);
        bricks[i].classList.add(...BRICK_SHOWN);
        i++;
        setTimeout(step, delay);
    }
    step();

    return () => { stopped = true; };
}