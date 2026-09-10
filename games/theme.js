(function () {
  'use strict';

  function readTheme() {
    try {
      var stored = JSON.parse(localStorage.getItem('waterapp_theme') || 'null');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (error) {
      /* Fall through to the legacy key. */
    }
    var legacy = localStorage.getItem('theme');
    if (legacy === 'dark' || legacy === 'light') return legacy;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('waterapp_theme', JSON.stringify(theme));
    localStorage.setItem('theme', theme);
    var button = document.querySelector('.game-theme-toggle');
    if (button) {
      button.innerHTML = theme === 'dark' ? '<span aria-hidden="true">○</span>' : '<span aria-hidden="true">◐</span>';
      button.setAttribute('aria-label', theme === 'dark' ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.createElement('button');
    button.className = 'game-theme-toggle';
    button.type = 'button';
    button.title = 'สลับธีม';
    button.addEventListener('click', function () {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    document.body.appendChild(button);
    applyTheme(readTheme());
  });
}());
