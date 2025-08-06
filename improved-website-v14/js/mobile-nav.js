"use strict";
document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('mobile-btn');
  const menu = document.getElementById('mobile-menu');
  if (!button || !menu) return;

  // Set initial accessibility states
  button.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-hidden', 'true');

  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const newState = !expanded;
    button.setAttribute('aria-expanded', String(newState));
    menu.classList.toggle('hidden');
    menu.setAttribute('aria-hidden', String(!newState));
  });
});
