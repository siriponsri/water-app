(function () {
  'use strict';

  const STORAGE_KEY = 'anf3Games.growthPromotion.best.v1';
  const ANSWERS = [
    { value: 'PASS', label: '1 — Pass' },
    { value: 'FAIL', label: '2 — Fail' },
    { value: 'REVIEW_REQUIRED', label: '3 — Review required' }
  ];

  // Synthetic, config-driven scenarios. Never copy production values into this file.
  const SCENARIOS = [
    { id: 'GPT-01', medium: 'Tryptic Soy Agar', organism: 'Staphylococcus aureus', inoculum: 82, recovered: 69, negativeControl: 0 },
    { id: 'GPT-02', medium: 'Tryptic Soy Agar', organism: 'Bacillus subtilis', inoculum: 76, recovered: 34, negativeControl: 0 },
    { id: 'GPT-03', medium: 'Sabouraud Dextrose Agar', organism: 'Candida albicans', inoculum: 64, recovered: 51, negativeControl: 0 },
    { id: 'GPT-04', medium: 'Sabouraud Dextrose Agar', organism: 'Aspergillus brasiliensis', inoculum: 58, recovered: 41, negativeControl: 1 },
    { id: 'GPT-05', medium: 'R2A Agar', organism: 'Pseudomonas aeruginosa', inoculum: 92, recovered: 50, negativeControl: 0 },
    { id: 'GPT-06', medium: 'R2A Agar', organism: 'Bacillus subtilis', inoculum: 70, recovered: 35, negativeControl: 0 },
    { id: 'GPT-07', medium: 'Tryptic Soy Broth', organism: 'Staphylococcus aureus', inoculum: 55, recovered: null, negativeControl: 0 },
    { id: 'GPT-08', medium: 'Sabouraud Dextrose Broth', organism: 'Candida albicans', inoculum: 48, recovered: 39, negativeControl: null },
    { id: 'GPT-09', medium: 'Tryptic Soy Agar', organism: 'Pseudomonas aeruginosa', inoculum: 100, recovered: 49, negativeControl: 0 },
    { id: 'GPT-10', medium: 'Tryptic Soy Agar', organism: 'Staphylococcus aureus', inoculum: 90, recovered: 81, negativeControl: 2 },
    { id: 'GPT-11', medium: 'Sabouraud Dextrose Agar', organism: 'Candida albicans', inoculum: 60, recovered: 30, negativeControl: 0 },
    { id: 'GPT-12', medium: 'R2A Agar', organism: 'Pseudomonas aeruginosa', inoculum: null, recovered: 42, negativeControl: 0 }
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

  function classify(scenario) {
    if (!Number.isFinite(scenario.inoculum) || !Number.isFinite(scenario.recovered) || !Number.isFinite(scenario.negativeControl)) {
      return 'REVIEW_REQUIRED';
    }
    const recovery = scenario.recovered / scenario.inoculum;
    return recovery >= 0.5 && scenario.negativeControl === 0 ? 'PASS' : 'FAIL';
  }

  function displayValue(value, suffix) {
    return Number.isFinite(value) ? `${value}${suffix || ''}` : 'ไม่ระบุ';
  }

  function renderScenario() {
    const scenario = state.queue[state.index];
    if (!scenario) return finishGame();
    state.answered = false;
    nodes.feedback.hidden = true;
    nodes.answerList.innerHTML = '';
    GameCommon.setText('progressText', `${state.index + 1}/${state.queue.length}`);
    GameCommon.setText('scoreText', state.score);
    nodes.scenarioMeta.innerHTML = [
      ['Scenario', scenario.id],
      ['Medium', scenario.medium],
      ['Challenge organism', scenario.organism],
      ['Inoculum', displayValue(scenario.inoculum, ' CFU')],
      ['Recovered', displayValue(scenario.recovered, ' CFU')],
      ['Negative control', displayValue(scenario.negativeControl, ' CFU')]
    ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');

    ANSWERS.forEach((answer) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer-button';
      button.textContent = answer.label;
      button.dataset.answer = answer.value;
      button.addEventListener('click', () => submitAnswer(answer.value, button));
      nodes.answerList.appendChild(button);
    });
    nodes.answerList.querySelector('button')?.focus();
  }

  function explanationFor(scenario, expected) {
    if (expected === 'REVIEW_REQUIRED') {
      return 'ข้อมูล inoculum, recovered CFU หรือ negative control ไม่ครบ จึงยังตัดสิน Pass/Fail ไม่ได้ ต้องตรวจ raw data และทวนเอกสารก่อน';
    }
    const recovery = ((scenario.recovered / scenario.inoculum) * 100).toFixed(1);
    if (expected === 'PASS') {
      return `Recovery = ${scenario.recovered} ÷ ${scenario.inoculum} = ${recovery}% และ negative control = 0 จึงผ่านกติกาฝึกของเกม`;
    }
    const reason = scenario.negativeControl > 0
      ? `negative control พบ ${scenario.negativeControl} CFU`
      : `recovery ${recovery}% ต่ำกว่า 50%`;
    return `ไม่ผ่านกติกาฝึก เพราะ ${reason}`;
  }

  function submitAnswer(value, selectedButton) {
    if (state.answered) return;
    state.answered = true;
    const scenario = state.queue[state.index];
    const expected = classify(scenario);
    const correct = value === expected;
    if (correct) state.score += 1;
    GameCommon.setText('scoreText', state.score);

    nodes.answerList.querySelectorAll('button').forEach((button) => {
      button.disabled = true;
      if (button.dataset.answer === expected) button.dataset.state = 'correct';
    });
    if (!correct) selectedButton.dataset.state = 'wrong';

    nodes.feedback.hidden = false;
    nodes.feedback.dataset.kind = correct ? 'correct' : 'wrong';
    GameCommon.setText('feedbackTitle', correct ? 'ถูกต้อง' : `คำตอบที่ถูก: ${expected}`);
    GameCommon.setText('feedbackText', explanationFor(scenario, expected));
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
    state.remaining = 90;
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
    state.queue = GameCommon.shuffle(SCENARIOS).slice(0, mode === 'timed' ? 10 : SCENARIOS.length);
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
      ? 'ทำได้ดี ทวนคำอธิบายของข้อที่พลาดก่อนกลับไปทำงาน'
      : 'ลองอีกครั้งในโหมดฝึก และใช้เกณฑ์ใน Knowledge panel ช่วยวิเคราะห์ทีละเงื่อนไข');
    nodes.restartButton.focus();
  }

  function bindKeyboard(event) {
    if (nodes.questionScreen.hidden || state.answered) return;
    const index = Number(event.key) - 1;
    if (index >= 0 && index < ANSWERS.length) {
      nodes.answerList.querySelectorAll('button')[index]?.click();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    ['modeScreen', 'questionScreen', 'resultScreen', 'scenarioMeta', 'answerList', 'feedback', 'nextButton', 'restartButton']
      .forEach((id) => { nodes[id] = document.getElementById(id); });
    document.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => startGame(button.dataset.mode));
    });
    nodes.nextButton.addEventListener('click', nextQuestion);
    nodes.restartButton.addEventListener('click', () => setScreen('mode'));
    document.addEventListener('keydown', bindKeyboard);
  });
})();

