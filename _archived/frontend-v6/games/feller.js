(function () {
  'use strict';

  const STORAGE_KEY = 'anf3Games.feller.best.v1';
  const FIXTURES = [
    { id: 'F-400-001', holes: 400, positives: 1, corrected: 1, volumeLiters: 1000, questionType: 'corrected' },
    { id: 'F-400-021', holes: 400, positives: 21, corrected: 22, volumeLiters: 1000, questionType: 'cfu' },
    { id: 'F-400-050', holes: 400, positives: 50, corrected: 53, volumeLiters: 500, questionType: 'corrected' },
    { id: 'F-400-100', holes: 400, positives: 100, corrected: 115, volumeLiters: 1000, questionType: 'cfu' },
    { id: 'F-400-200', holes: 400, positives: 200, corrected: 277, volumeLiters: 500, questionType: 'corrected' },
    { id: 'F-400-300', holes: 400, positives: 300, corrected: 553, volumeLiters: 1000, questionType: 'cfu' },
    { id: 'F-400-399', holes: 400, positives: 399, corrected: 2228, volumeLiters: 1000, questionType: 'corrected' },
    { id: 'F-400-400', holes: 400, positives: 400, corrected: 2628, volumeLiters: 500, questionType: 'cfu' },
    { id: 'F-300-050', holes: 300, positives: 50, corrected: 55, volumeLiters: 1000, questionType: 'corrected' },
    { id: 'F-300-100', holes: 300, positives: 100, corrected: 121, volumeLiters: 500, questionType: 'cfu' },
    { id: 'F-300-149', holes: 300, positives: 149, corrected: 205, volumeLiters: 1000, questionType: 'corrected' },
    { id: 'F-300-200', holes: 300, positives: 200, corrected: 329, volumeLiters: 1000, questionType: 'cfu' },
    { id: 'F-300-250', holes: 300, positives: 250, corrected: 535, volumeLiters: 500, questionType: 'corrected' },
    { id: 'F-300-299', holes: 300, positives: 299, corrected: 1585, volumeLiters: 1000, questionType: 'cfu' },
    { id: 'F-300-300', holes: 300, positives: 300, corrected: 1885, volumeLiters: 1000, questionType: 'corrected' },
    { id: 'F-300-075', holes: 300, positives: 75, corrected: null, volumeLiters: 250, questionType: 'cfu' }
  ];

  const state = {
    mode: 'practice',
    queue: [],
    index: 0,
    score: 0,
    answered: false,
    remaining: 0,
    timerId: null
  };

  const nodes = {};

  function fellerCorrection(holes, positives) {
    if (!Number.isInteger(holes) || holes <= 0) throw new Error('holes must be a positive integer');
    if (!Number.isInteger(positives) || positives < 0 || positives > holes) throw new Error('positives out of range');
    let corrected = 0;
    for (let index = 0; index < positives; index += 1) corrected += holes / (holes - index);
    return Math.round(corrected);
  }

  function expectedFor(scenario) {
    const corrected = fellerCorrection(scenario.holes, scenario.positives);
    if (scenario.questionType === 'corrected') return corrected;
    return Math.round((corrected * 1000) / scenario.volumeLiters);
  }

  function validateFixtures() {
    const failures = FIXTURES.filter((fixture) => fixture.corrected !== null)
      .filter((fixture) => fellerCorrection(fixture.holes, fixture.positives) !== fixture.corrected);
    if (failures.length) throw new Error(`Feller fixture mismatch: ${failures.map((item) => item.id).join(', ')}`);
  }

  function renderScenario() {
    const scenario = state.queue[state.index];
    if (!scenario) return finishGame();
    state.answered = false;
    nodes.feedback.hidden = true;
    nodes.numericInput.disabled = false;
    nodes.numericInput.value = '';
    GameCommon.setText('progressText', `${state.index + 1}/${state.queue.length}`);
    GameCommon.setText('scoreText', state.score);
    nodes.scenarioMeta.innerHTML = [
      ['Fixture', scenario.id],
      ['จำนวนรูทั้งหมด (N)', scenario.holes],
      ['Positive holes (r)', scenario.positives],
      ['Sample volume', `${scenario.volumeLiters} L`]
    ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
    nodes.questionTitle.textContent = scenario.questionType === 'corrected'
      ? 'ค่า positive-hole corrected count (Pr) เท่ากับเท่าไร?'
      : 'ผลลัพธ์ CFU/m³ เท่ากับเท่าไร?';
    nodes.numericInput.focus();
  }

  function submitAnswer(event) {
    event.preventDefault();
    if (state.answered) return;
    const value = Number(nodes.numericInput.value);
    if (!Number.isInteger(value) || value < 0) {
      nodes.numericInput.setCustomValidity('กรุณากรอกจำนวนเต็มตั้งแต่ 0 ขึ้นไป');
      nodes.numericInput.reportValidity();
      return;
    }
    nodes.numericInput.setCustomValidity('');
    state.answered = true;
    nodes.numericInput.disabled = true;
    const scenario = state.queue[state.index];
    const expected = expectedFor(scenario);
    const corrected = fellerCorrection(scenario.holes, scenario.positives);
    const correct = value === expected;
    if (correct) state.score += 1;
    GameCommon.setText('scoreText', state.score);

    nodes.feedback.hidden = false;
    nodes.feedback.dataset.kind = correct ? 'correct' : 'wrong';
    GameCommon.setText('feedbackTitle', correct ? 'ถูกต้อง' : `คำตอบที่ถูก: ${expected}`);
    GameCommon.setText('feedbackText', scenario.questionType === 'corrected'
      ? `คำนวณ Pr = Σ ${scenario.holes}/(${scenario.holes}−i) สำหรับ i = 0 ถึง ${scenario.positives - 1} แล้วปัดเป็น ${corrected}`
      : `Pr = ${corrected}; CFU/m³ = ${corrected} × 1000 ÷ ${scenario.volumeLiters} = ${expected}`);
    nodes.nextButton.textContent = state.index + 1 >= state.queue.length ? 'ดูสรุป' : 'ข้อต่อไป';
    nodes.nextButton.focus();
  }

  function nextQuestion() {
    if (!state.answered) return;
    state.index += 1;
    renderScenario();
  }

  function setScreen(name) {
    nodes.modeScreen.hidden = name !== 'mode';
    nodes.questionScreen.hidden = name !== 'question';
    nodes.resultScreen.hidden = name !== 'result';
  }

  function startTimer() {
    window.clearInterval(state.timerId);
    if (state.mode !== 'timed') {
      GameCommon.setText('timerText', 'ไม่จำกัด');
      return;
    }
    state.remaining = 120;
    GameCommon.setText('timerText', `${state.remaining}s`);
    state.timerId = window.setInterval(() => {
      state.remaining -= 1;
      GameCommon.setText('timerText', `${Math.max(0, state.remaining)}s`);
      if (state.remaining <= 0) finishGame();
    }, 1000);
  }

  function startGame(mode) {
    state.mode = mode;
    state.index = 0;
    state.score = 0;
    state.queue = GameCommon.shuffle(FIXTURES).slice(0, mode === 'timed' ? 10 : FIXTURES.length);
    setScreen('question');
    startTimer();
    renderScenario();
  }

  function finishGame() {
    window.clearInterval(state.timerId);
    state.timerId = null;
    setScreen('result');
    const total = state.queue.length;
    const percent = total ? Math.round((state.score / total) * 100) : 0;
    const best = GameCommon.writeBestScore(STORAGE_KEY, state.score, total);
    GameCommon.setText('resultScore', `${state.score}/${total}`);
    GameCommon.setText('resultPercent', `${percent}%`);
    GameCommon.setText('bestScore', `${best.score}/${best.total}`);
    GameCommon.setText('resultMessage', percent >= 80
      ? 'คำนวณได้แม่น ลองจับเวลาเพื่อฝึกความคล่องต่อได้'
      : 'กลับไปดูสูตรด้านขวา แล้วลองโหมดฝึกอีกครั้งโดยคำนวณ Pr ก่อน CFU/m³');
    nodes.restartButton.focus();
  }

  document.addEventListener('DOMContentLoaded', () => {
    validateFixtures();
    ['modeScreen', 'questionScreen', 'resultScreen', 'scenarioMeta', 'questionTitle', 'numericForm', 'numericInput', 'feedback', 'nextButton', 'restartButton']
      .forEach((id) => { nodes[id] = document.getElementById(id); });
    document.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => startGame(button.dataset.mode));
    });
    nodes.numericForm.addEventListener('submit', submitAnswer);
    nodes.nextButton.addEventListener('click', nextQuestion);
    nodes.restartButton.addEventListener('click', () => setScreen('mode'));
  });

  window.FellerGame = Object.freeze({ fellerCorrection, validateFixtures });
})();

