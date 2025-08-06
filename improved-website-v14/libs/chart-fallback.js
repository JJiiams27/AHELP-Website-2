/* Local fallback for Chart.js CDN */
window.Chart = function() { console.warn('Chart.js CDN failed to load; charts will not render.'); };
