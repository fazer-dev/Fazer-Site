const carousel = document.querySelector(".pro");
const projects = document.querySelectorAll(".project");

let snapTimeout;

carousel.addEventListener("wheel", (e) => {
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


