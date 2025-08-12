// ======= Элементы =======
const modeEl = document.getElementById('mode');
const xEl = document.getElementById('xInput');
const yInputs = [
  document.getElementById('y1Input'),
  document.getElementById('y2Input'),
  document.getElementById('y3Input'),
  document.getElementById('y4Input')
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

// ======= Локальные переменные =======
let historyArr = JSON.parse(localStorage.getItem('calcHistory') || '[]');

// ======= Уведомление =======
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ======= Копирование в буфер =======
function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).then(() => {
    showToast('Скопировано');
  }).catch(() => {
    showToast('Не удалось скопировать');
  });
}

// ======= Экспорт истории =======
function exportHistory() {
  if (historyArr.length === 0) {
    showToast('История пуста');
    return;
  }
  const text = historyArr.map(h => h.display).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'calc_history.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('История экспортирована');
}

// ======= Обновление отображения истории =======
function renderHistory() {
  hist.innerHTML = historyArr.map((h, i) =>
    `<div class="history-item" data-index="${i}">${h.display}</div>`
  ).join('');
}

// ======= Добавление в историю =======
function addHistory(item, yValues) {
  historyArr.unshift({ display: item.replace(/<[^>]+>/g, ''), yValues });
  localStorage.setItem('calcHistory', JSON.stringify(historyArr));
  renderHistory();
}

// ======= Логика расчётов =======
function parseYInput() {
  return yInputs
    .map(inp => parseFloat(inp.value.trim()))
    .filter(v => !isNaN(v))
    .reduce((sum, v) => sum + v, 0);
}

function calcPercentOfNumber(x, y) {
  return `${x}% от ${y} = ${(x / 100 * y).toFixed(2)}`;
}
function calcNumberIsPercent(x, y) {
  return `${x} = ${(x / y * 100).toFixed(2)}% от ${y}`;
}
function calcNumberFromPercent(x, y, addS) {
  const base = y / (x / 100);
  let result = `${x}% от ${base.toFixed(2)} = ${y}`;
  if (!isNaN(addS) && addS !== '') {
    const sum = base + parseFloat(addS);
    result += `<div class="sum-result">Сумма с S: ${sum.toFixed(2)}
      <button class="copy-btn" onclick="copyToClipboard('${sum.toFixed(2)}')">
      <i class="fas fa-copy"></i></button></div>`;
  }
  return result;
}
function calcIncreaseByPercent(x, y) {
  return `${y} + ${x}% = ${((y * (100 + x)) / 100).toFixed(2)}`;
}

function calculate() {
  const x = parseFloat(xEl.value);
  const y = parseYInput();
  const addS = addSInput.value.trim();

  if (isNaN(x) || isNaN(y)) {
    showToast('Введите корректные значения');
    return;
  }
  if (modeEl.value === 'numberFromPercent' && x === 0) {
    showToast('Процент не может быть 0');
    return;
  }
  if (modeEl.value === 'numberIsPercent' && y === 0) {
    showToast('Деление на ноль');
    return;
  }

  let text = '';
  switch (modeEl.value) {
    case 'percentOfNumber': text = calcPercentOfNumber(x, y); break;
    case 'numberIsPercent': text = calcNumberIsPercent(x, y); break;
    case 'numberFromPercent': text = calcNumberFromPercent(x, y, addS); break;
    case 'increaseByPercent': text = calcIncreaseByPercent(x, y); break;
  }
  res.innerHTML = text;
  res.classList.add('show');
  addHistory(text, yInputs.map(inp => inp.value).filter(v => v.trim() !== ''));
}

// ======= Обновление плейсхолдеров =======
function updatePlaceholders() {
  addSInput.style.display = modeEl.value === 'numberFromPercent' ? 'block' : 'none';
  res.textContent = '';
}

// ======= События =======
calcBtn.addEventListener('click', calculate);
[xEl, ...yInputs, addSInput].forEach(el =>
  el.addEventListener('keypress', e => e.key === 'Enter' && calculate())
);
modeEl.addEventListener('change', updatePlaceholders);

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
});
exportHistoryBtn.addEventListener('click', exportHistory);

toggleHistoryBtn.addEventListener('click', () => {
  hist.classList.toggle('hidden');
});
toggleThemeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark'));
});
openTinyBtn.addEventListener('click', () => {
  window.open(window.location.href, 'tinyCalc', 'width=350,height=600');
});

// Клик по истории
hist.addEventListener('click', e => {
  if (e.target.classList.contains('history-item')) {
    const item = historyArr[e.target.dataset.index];
    showToast(`Загружено из истории`);
    // можно сюда добавить логику восстановления значений
  }
});

// ======= Инициализация =======
renderHistory();
updatePlaceholders();
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark');
}
