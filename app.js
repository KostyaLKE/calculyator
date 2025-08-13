// ---------- DOM ----------
const modeEl = document.getElementById('mode');
const xEl = document.getElementById('xInput');
const yInputs = [
  document.getElementById('y1Input'),
  document.getElementById('y2Input'),
  document.getElementById('y3Input'),
  document.getElementById('y4Input'),
];
const addSInput = document.getElementById('addSInput');
const calcBtn = document.getElementById('calcBtn');
const res = document.getElementById('result');
const hist = document.getElementById('history');
const clearHistoryBtn = document.getElementById('clearHistory');
const toggleHistoryBtn = document.getElementById('toggleHistory');
const toggleThemeBtn = document.getElementById('toggleTheme');
const clearInputsBtn = document.getElementById('clearInputs');
const exportHistoryBtn = document.getElementById('exportHistory');
const openTinyBtn = document.getElementById('openTiny');
const toast = document.getElementById('toast');

// ---------- STATE ----------
let historyArr = JSON.parse(localStorage.getItem('calcHistory') || '[]');

// ---------- UTILS ----------
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1600);
}

function copyToClipboard(text) {
  (navigator.clipboard?.writeText(text) || Promise.reject())
    .then(() => showToast('Скопировано'))
    .catch(() => showToast('Не удалось скопировать'));
}

function exportHistory() {
  if (!historyArr.length) return showToast('История пуста');
  const text = historyArr.map(h => h.display).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'calc_history.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderHistory() {
  hist.innerHTML = historyArr.map((h, i) =>
    `<div class="history-item" data-index="${i}">${h.display}</div>`
  ).join('');
}

function addHistory(item, yValues) {
  historyArr.unshift({ display: item.replace(/<[^>]+>/g, ''), yValues });
  localStorage.setItem('calcHistory', JSON.stringify(historyArr));
  renderHistory();
}

function saveState() {
  const state = {
    mode: modeEl.value,
    x: xEl.value,
    y1: yInputs[0].value,
    y2: yInputs[1].value,
    y3: yInputs[2].value,
    y4: yInputs[3].value,
    s: addSInput.value,
    dark: document.body.classList.contains('dark'),
  };
  localStorage.setItem('calcState', JSON.stringify(state));
}

function restoreState() {
  try {
    const state = JSON.parse(localStorage.getItem('calcState') || '{}');
    if (state.mode) modeEl.value = state.mode;
    if (state.x != null) xEl.value = state.x;
    ['y1','y2','y3','y4'].forEach((k, i) => {
      if (state[k] != null) yInputs[i].value = state[k];
    });
    if (state.s != null) addSInput.value = state.s;
    if (state.dark) document.body.classList.add('dark');
  } catch {}
}

// ---------- INPUT SANITIZATION & LIMITS ----------
function onlyDigits(str) {
  return (str || '').replace(/[^\d]/g, '');
}

// X: проценты 0..100, не более 3 знаков
function sanitizeX() {
  let v = onlyDigits(xEl.value);
  if (v.length > 3) v = v.slice(0, 3);
  let num = parseInt(v || '0', 10);
  if (num > 100) num = 100;
  xEl.value = v ? String(num) : '';
}

// Y1: до 4 знаков
function sanitizeY1() {
  let v = onlyDigits(yInputs[0].value);
  if (v.length > 4) v = v.slice(0, 4);
  yInputs[0].value = v;
}

// Y2..Y4: до 5 знаков
function sanitizeYRest() {
  for (let i = 1; i < 4; i++) {
    let v = onlyDigits(yInputs[i].value);
    if (v.length > 5) v = v.slice(0, 5);
    yInputs[i].value = v;
  }
}

// S: допустим до 6 знаков (можно менять при желании)
function sanitizeS() {
  let v = onlyDigits(addSInput.value);
  if (v.length > 6) v = v.slice(0, 6);
  addSInput.value = v;
}

// ---------- PARSE ----------
function sumY() {
  return yInputs
    .map(inp => parseInt(onlyDigits(inp.value) || '0', 10))
    .filter(n => !isNaN(n))
    .reduce((a, b) => a + b, 0);
}

// ---------- CALC CORE ----------
function calcPercentOfNumber(x, y) {
  return `${x}% от ${y} = ${(x / 100 * y).toFixed(2)}`;
}
function calcNumberIsPercent(x, y) {
  return `${x} = ${(x / y * 100).toFixed(2)}% от ${y}`;
}
function calcNumberFromPercent(x, y, addS) {
  const base = y / (x / 100);
  let result = `${x}% от ${base.toFixed(2)} = ${y}`;
  if (addS !== '' && !isNaN(parseFloat(addS))) {
    const sum = base + parseFloat(addS);
    result += `<div class="sum-result">Сумма с S: ${sum.toFixed(2)}
      <button class="copy-btn" onclick="(${copyToClipboard.toString()})('${sum.toFixed(2)}')"><i class="fas fa-copy"></i></button>
    </div>`;
  }
  return result;
}
function calcIncreaseByPercent(x, y) {
  return `${y} + ${x}% = ${((y * (100 + x)) / 100).toFixed(2)}`;
}

// source: 'auto' | 'manual'
function calculate(source = 'auto') {
  // авто‑сумма Y
  const Y = sumY();

  const x = parseInt(onlyDigits(xEl.value) || 'NaN', 10);
  const s = addSInput.value.trim();

  // Валидации
  if (isNaN(x) || isNaN(Y) || (!Y && modeEl.value !== 'percentOfNumber' && modeEl.value !== 'increaseByPercent')) {
    // если авто‑режим — просто гасим результат, без тостов
    if (source === 'auto') {
      res.textContent = '';
      res.classList.remove('show');
      saveState();
      return;
    } else {
      showToast('Введите корректные значения');
      return;
    }
  }
  if (modeEl.value === 'numberFromPercent' && x === 0) {
    if (source === 'manual') showToast('Процент не может быть 0');
    return;
  }
  if (modeEl.value === 'numberIsPercent' && Y === 0) {
    if (source === 'manual') showToast('Деление на ноль');
    return;
  }

  let text = '';
  switch (modeEl.value) {
    case 'percentOfNumber': text = calcPercentOfNumber(x, Y); break;
    case 'numberIsPercent': text = calcNumberIsPercent(x, Y); break;
    case 'numberFromPercent': text = calcNumberFromPercent(x, Y, s); break;
    case 'increaseByPercent': text = calcIncreaseByPercent(x, Y); break;
  }
  res.innerHTML = text;
  res.classList.add('show');

  // историю пишем только при ручном действии
  if (source === 'manual') {
    addHistory(text, yInputs.map(inp => inp.value));
  }

  saveState();
}

// ---------- DEBOUNCE ----------
function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
const autoCalc = debounce(() => calculate('auto'), 150);

// ---------- EVENTS ----------
// Санитизация + авто‑расчёт
xEl.addEventListener('input', () => { sanitizeX(); autoCalc(); });
yInputs[0].addEventListener('input', () => { sanitizeY1(); autoCalc(); });
[yInputs[1], yInputs[2], yInputs[3]].forEach(inp =>
  inp.addEventListener('input', () => { sanitizeYRest(); autoCalc(); })
);
addSInput.addEventListener('input', () => { sanitizeS(); autoCalc(); });

// Режим
modeEl.addEventListener('change', () => {
  saveState();
  autoCalc();
});

// Кнопка/Enter = ручной расчёт + история
calcBtn.addEventListener('click', () => calculate('manual'));
[xEl, ...yInputs, addSInput].forEach(el =>
  el.addEventListener('keypress', e => {
    if (e.key === 'Enter') calculate('manual');
  })
);

// Хистори/тема/прочее
clearHistoryBtn.addEventListener('click', () => {
  historyArr = [];
  localStorage.setItem('calcHistory', '[]');
  renderHistory();
});
clearInputsBtn.addEventListener('click', () => {
  xEl.value = '';
  yInputs.forEach(inp => inp.value = '');
  addSInput.value = '';
  res.textContent = '';
  res.classList.remove('show');
  saveState();
});
exportHistoryBtn.addEventListener('click', exportHistory);
toggleHistoryBtn.addEventListener('click', () => hist.classList.toggle('hidden'));
toggleThemeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark'));
});
openTinyBtn.addEventListener('click', () => {
  window.open(window.location.href, 'tinyCalc', 'width=350,height=600');
});

// Клик по истории: подставляем прежние Y (и это не добавляет историю)
hist.addEventListener('click', e => {
  const itemEl = e.target.closest('.history-item');
  if (!itemEl) return;
  const item = historyArr[itemEl.dataset.index];
  if (item?.yValues) {
    yInputs.forEach((inp, idx) => inp.value = item.yValues[idx] || '');
  }
  showToast('Загружено из истории');
  autoCalc();
});

// ---------- INIT ----------
renderHistory();
restoreState();
calculate('auto'); // показать сохранённый результат (если был)
