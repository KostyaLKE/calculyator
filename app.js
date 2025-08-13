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
const sumChip = document.getElementById('sumChip');
const roundToggle = document.getElementById('roundToggle');

// ---------- STATE ----------
let historyArr = JSON.parse(localStorage.getItem('calcHistory') || '[]');
let roundingEnabled = JSON.parse(localStorage.getItem('roundingEnabled') || 'false');

// ---------- HELPERS ----------
const fmt = n => Number(n).toLocaleString('ru-RU');

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

function htmlToPlainText(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

function addHistory(htmlItem, yValues) {
  const display = htmlToPlainText(htmlItem);
  historyArr.unshift({ display, yValues });
  localStorage.setItem('calcHistory', JSON.stringify(historyArr));
  renderHistory();
}

function saveState() {
  const state = {
    mode: modeEl?.value,
    x: xEl?.value,
    y1: yInputs[0]?.value,
    y2: yInputs[1]?.value,
    y3: yInputs[2]?.value,
    y4: yInputs[3]?.value,
    s: addSInput?.value,
    dark: document.body.classList.contains('dark'),
    rounding: roundingEnabled
  };
  localStorage.setItem('calcState', JSON.stringify(state));
  localStorage.setItem('roundingEnabled', JSON.stringify(roundingEnabled));
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
    roundingEnabled = !!state.rounding;
  } catch {}

  roundToggle.classList.toggle('active', roundingEnabled);
  roundToggle.setAttribute('aria-pressed', String(roundingEnabled));
  const span = roundToggle.querySelector('.btn-text');
  if (span) span.textContent = roundingEnabled ? 'Округление' : 'Округлить';

  roundToggle.addEventListener('click', () => {
    roundingEnabled = !roundingEnabled;
    roundToggle.classList.toggle('active', roundingEnabled);
    roundToggle.setAttribute('aria-pressed', String(roundingEnabled));
    const span = roundToggle.querySelector('.btn-text');
    if (span) span.textContent = roundingEnabled ? 'Округление' : 'Округлить';
    saveState();
    calculate('auto');
  });
}

// ---------- INPUT LIMITS ----------
const onlyDigits = s => (s || '').replace(/[^\d]/g, '');

function sanitizeX() {
  let v = onlyDigits(xEl.value);
  if (v.length > 3) v = v.slice(0, 3);
  let num = parseInt(v || '0', 10);
  if (num > 100) num = 100;
  xEl.value = v ? String(num) : '';
}
function sanitizeY1() {
  let v = onlyDigits(yInputs[0].value);
  if (v.length > 4) v = v.slice(0, 4);
  yInputs[0].value = v;
}
function sanitizeYRest() {
  for (let i = 1; i < 4; i++) {
    let v = onlyDigits(yInputs[i].value);
    if (v.length > 5) v = v.slice(0, 5);
    yInputs[i].value = v;
  }
}
function sanitizeS() {
  let v = onlyDigits(addSInput.value);
  if (v.length > 6) v = v.slice(0, 6);
  addSInput.value = v;
}

// ---------- ΣY ----------
function sumY() {
  return yInputs
    .map(inp => parseInt(onlyDigits(inp.value) || '0', 10))
    .filter(n => !isNaN(n))
    .reduce((a, b) => a + b, 0);
}
function updateSumChip() {
  sumChip.textContent = `ΣY: ${fmt(sumY())}`;
}

// ---------- ROUNDING ----------
function roundUp5(n) {
  return Math.ceil((Number(n) || 0) / 5) * 5;
}
function formatOut(n, { useRounding = true } = {}) {
  const num = Number(n);
  if (!isFinite(num)) return '—';
  if (roundingEnabled && useRounding) {
    const r = roundUp5(num);
    return Number.isInteger(r) ? r.toLocaleString('ru-RU') : r.toFixed(2);
  }
  const v = Number(num.toFixed(2));
  return Number.isInteger(v) ? v.toLocaleString('ru-RU') : v.toFixed(2);
}

// ---------- CALC CORE ----------
function calcPercentOfNumber(x, Y) {
  const result = (x / 100) * Y;
  return `${x}% от ${fmt(Y)} = ${formatOut(result)}`;
}
function calcNumberIsPercent(x, Y) {
  const pct = (x / Y) * 100;
  return `${x} = ${pct.toFixed(2)}% от ${fmt(Y)}`;
}
function calcNumberFromPercent(x, Y, s) {
  const base = Y / (x / 100);
  let text = `${x}% от ${base.toFixed(2)} = ${fmt(Y)}`;
  if (s !== '' && !isNaN(parseFloat(s))) {
    const sum = base + parseFloat(s);
    text += `<div class="sum-result">Сумма с S: ${formatOut(sum)}
      <button class="copy-btn" data-copy="${Number(sum).toFixed(2)}"><i class="fas fa-copy"></i></button>
    </div>`;
  }
  return text;
}
function calcIncreaseByPercent(x, Y) {
  const result = (Y * (100 + x)) / 100;
  return `${fmt(Y)} + ${x}% = ${formatOut(result)}`;
}

function calculate(source = 'auto') {
  const Y = sumY();
  const x = parseInt(onlyDigits(xEl.value) || 'NaN', 10);
  const s = addSInput.value.trim();

  if (isNaN(x) || isNaN(Y) || (!Y && modeEl.value !== 'percentOfNumber' && modeEl.value !== 'increaseByPercent')) {
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

  let html = '';
  switch (modeEl.value) {
    case 'percentOfNumber': html = calcPercentOfNumber(x, Y); break;
    case 'numberIsPercent': html = calcNumberIsPercent(x, Y); break;
    case 'numberFromPercent': html = calcNumberFromPercent(x, Y, s); break;
    case 'increaseByPercent': html = calcIncreaseByPercent(x, Y); break;
  }
  res.innerHTML = html;
  res.classList.add('show');

  if (source === 'manual') addHistory(html, yInputs.map(inp => inp.value));
  saveState();
}

// ---------- DEBOUNCE ----------
function debounce(fn, ms) {
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const autoCalc = debounce(() => { updateSumChip(); calculate('auto'); }, 150);

// ---------- EVENTS ----------
xEl.addEventListener('input', () => { sanitizeX(); autoCalc(); });
yInputs[0].addEventListener('input', () => { sanitizeY1(); autoCalc(); });
[yInputs[1], yInputs[2], yInputs[3]].forEach(inp =>
  inp.addEventListener('input', () => { sanitizeYRest(); autoCalc(); })
);
addSInput.addEventListener('input', () => { sanitizeS(); autoCalc(); });

modeEl.addEventListener('change', () => { saveState(); autoCalc(); });

calcBtn.addEventListener('click', () => calculate('manual'));
[xEl, ...yInputs, addSInput].forEach(el =>
  el.addEventListener('keypress', e => { if (e.key === 'Enter') calculate('manual'); })
);

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
  updateSumChip();
  saveState();
});
exportHistoryBtn.addEventListener('click', exportHistory);
toggleHistoryBtn.addEventListener('click', () => hist.classList.toggle('hidden'));
toggleThemeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  saveState();
});
openTinyBtn.addEventListener('click', () => {
  window.open(window.location.href, 'tinyCalc', 'width=350,height=600');
});

document.addEventListener('click', e => {
  const btn = e.target.closest('.copy-btn');
  if (btn) {
    const val = btn.getAttribute('data-copy') || '';
    if (val) copyToClipboard(val);
  }
});

hist.addEventListener('click', e => {
  const itemEl = e.target.closest('.history-item');
  if (!itemEl) return;
  const item = historyArr[itemEl.dataset.index];
  if (item?.yValues) yInputs.forEach((inp, idx) => inp.value = item.yValues[idx] || '');
  showToast('Загружено из истории');
  autoCalc();
});

// ---------- INIT ----------
renderHistory();
restoreState();
updateSumChip();
calculate('auto');
