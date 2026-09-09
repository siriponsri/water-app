(function () {
  'use strict';

  function shuffle(values) {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function readBestScore(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && Number.isFinite(value.score) ? value : { score: 0, total: 0, updatedAt: '' };
    } catch (error) {
      return { score: 0, total: 0, updatedAt: '' };
    }
  }

  function writeBestScore(key, score, total) {
    const previous = readBestScore(key);
    const previousRatio = previous.total ? previous.score / previous.total : 0;
    const nextRatio = total ? score / total : 0;
    if (nextRatio < previousRatio || (nextRatio === previousRatio && score <= previous.score)) return previous;
    const value = { score, total, updatedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value);
  }

  window.GameCommon = Object.freeze({ shuffle, readBestScore, writeBestScore, setText });
})();

