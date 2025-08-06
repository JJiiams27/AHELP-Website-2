(function() {
  function applyDarkMode() {
    const enabled = localStorage.getItem('darkMode') === 'true';
    document.documentElement.classList.toggle('dark-mode', enabled);
    if (document.body) {
      document.body.classList.toggle('dark-mode', enabled);
    }
  }

  window.applyDarkMode = applyDarkMode;
  window.toggleDarkMode = function() {
    const enabled = localStorage.getItem('darkMode') === 'true';
    localStorage.setItem('darkMode', (!enabled).toString());
    applyDarkMode();
  };

  applyDarkMode();
  document.addEventListener('DOMContentLoaded', applyDarkMode);
})();
