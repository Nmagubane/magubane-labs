// Runs before the page paints, so animated elements can start in their "before" state without a flash.
// Without JavaScript (or with reduced motion) nothing is ever hidden.
document.documentElement.classList.add('js');
