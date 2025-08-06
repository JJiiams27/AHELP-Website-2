document.addEventListener('DOMContentLoaded', () => {
  const mobileBtn = document.getElementById('mobile-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
});
