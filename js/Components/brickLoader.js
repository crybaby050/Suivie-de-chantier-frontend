export function brickLoaderHTML(rows = 3, cols = 6) {
    let rowsHTML = "";
    for (let r = rows - 1; r >= 0; r--) {
        const offsetClass = r % 2 === 0 ? " offset" : "";
        rowsHTML += `<div class="row${offsetClass}">` +
            Array.from({ length: cols }, () => `<div class="brick"></div>`).join("") +
            `</div>`;
    }
    return `
    <div class="brick-loader">
      <div class="wall">${rowsHTML}</div>
      <p class="brick-loader-label">Chargement...</p>
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
                bricks.forEach(b => b.classList.remove("show"));
                i = 0;
                setTimeout(step, 300);
            }, 700);
            return;
        }
        bricks[i].classList.add("show");
        i++;
        setTimeout(step, delay);
    }
    step();

    return () => { stopped = true; };
}