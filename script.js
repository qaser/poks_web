const API_URL = 'https://poeks.online/api/requests/'; // Замените на актуальный

const leftCol = document.getElementById('pending');
const centerCol = document.getElementById('approved');
const rightCol = document.getElementById('completed');

let lastData = {
  pending: new Map(),
  approved: new Map(),
  completed: new Map()
};

function createCard(req) {
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.id = req.req_num || req._id;

  // Определяем путь к иконке по типу ГПА
  const gpaIcons = {
    'Стационарные ГПА (ГТК-10-4)': 'gtk.png',
    'Стационарные ГПА': 'stationary.png',
    'ГПА с авиа. приводом': 'avia.png',
    'ГПА с судовым приводом': 'ship.png',
  };

  const iconSrc = gpaIcons[req.gpa_type] || 'default.png';

  // Цвет фона для completed
  if (req.status === 'approved' && req.is_complete === true) {
    div.style.backgroundColor = req.is_fail ? '#f8d7da' : '#d4edda'; // мягкий красный / зелёный
    div.style.border = '1px solid ' + (req.is_fail ? '#f5c6cb' : '#c3e6cb');
  }

  // Верстка карточки: две колонки — 1/3 слева, 2/3 справа
    div.innerHTML = `
    <div class="request-container">
        <div class="request-left-column">
        <div class="request-title">${req.ks} ГПА №${req.num_gpa}</div>
        <div class="request-row">
            <div class="request-meta">
                Время запуска:<br>${new Date(req.request_datetime).toLocaleDateString('ru-RU')} ${new Date(req.request_datetime).toLocaleTimeString('ru-RU').slice(0, 5)}
            </div>
        </div>
        </div>
        <div class="request-right-column">
        ${req.text || '<span class="request-description">Без описания</span>'}
        </div>
    </div>
    `;

  return div;
}

function mapRequests(data) {
  const map = new Map();
  data.forEach(req => map.set(req.req_num || req._id, req));
  return map;
}

function updateColumn(columnElem, newMap, oldMap, status) {
  const inner = columnElem.querySelector('.requests-list');
  const newIds = new Set(newMap.keys());

  // Удаление исчезнувших карточек
  oldMap.forEach((_, id) => {
    if (!newIds.has(id)) {
      const card = inner.querySelector(`.card[data-id="${id}"]`);
      if (card) {
        card.classList.add('fade-out');
        setTimeout(() => card.remove(), 500);
      }
    }
  });

  // Добавление новых карточек
  newMap.forEach((req, id) => {
    const existing = inner.querySelector(`.card[data-id="${id}"]`);
    if (!existing) {
      const card = createCard(req);
      card.classList.add('highlight');
      inner.appendChild(card);
      setTimeout(() => card.classList.remove('highlight'), 1000);
    }
  });
}

async function fetchDataAndUpdate() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    const maps = {
      pending: mapRequests(data.pending || []),
      approved: mapRequests(data.approved || []),
      completed: mapRequests(data.completed || [])
    };

    updateColumn(leftCol, maps.pending, lastData.pending, 'pending');
    updateColumn(centerCol, maps.approved, lastData.approved, 'approved');
    updateColumn(rightCol, maps.completed, lastData.completed, 'completed');

    lastData = maps;
  } catch (e) {
    console.error('Ошибка при загрузке данных:', e);
  }
}

function setupAutoScroll(columnId, interval = 100, step = 1) {
  const container = document.getElementById(columnId);
  const inner = container.querySelector('.requests-list');

  let direction = 1;
  let scrollY = 0;

  setInterval(() => {
    const containerHeight = container.querySelector('.scroll-inner').clientHeight;
    const innerHeight = inner.scrollHeight;

    if (innerHeight <= containerHeight) return;

    scrollY += step * direction;

    if (scrollY + containerHeight >= innerHeight) {
      direction = -1;
    } else if (scrollY <= 0) {
      direction = 1;
    }

    inner.style.transform = `translateY(${-scrollY}px)`;
  }, interval);
}

// Первая загрузка и интервал
setupAutoScroll('pending');
setupAutoScroll('approved');
setupAutoScroll('completed');
fetchDataAndUpdate();
setInterval(fetchDataAndUpdate, 15000);
