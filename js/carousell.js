const carousel = document.querySelector(".pro");
const projects = document.querySelectorAll(".project");

let snapTimeout;

carousel.addEventListener("wheel", (e) => {
    const atStart = carousel.scrollLeft <= 0;
    const atEnd = Math.ceil(carousel.scrollLeft + carousel.clientWidth) >= carousel.scrollWidth;

    if ((atStart && e.deltaY < 0) || (atEnd && e.deltaY > 0)) {
        clearTimeout(snapTimeout);
        snapTimeout = setTimeout(() => {
            carousel.style.scrollSnapType = "x mandatory";
        }, 150);
        return;
    }

    e.preventDefault();
    carousel.style.scrollSnapType = "none";

    let multiplier = 1;
    if (e.deltaMode === 1) multiplier = 125;
    if (e.deltaMode === 2) multiplier = window.innerHeight;

    const delta = e.deltaY * multiplier;
    carousel.scrollLeft += delta;

    clearTimeout(snapTimeout);
    snapTimeout = setTimeout(() => {
        carousel.style.scrollSnapType = "x mandatory";
    }, 150);
}, { passive: false });


