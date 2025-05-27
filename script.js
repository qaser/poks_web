// const API_URL = 'https://poeks.online/api/requests/';
const API_URL = 'http://127.0.0.1:8000//api/requests/';

const leftCol = document.getElementById('pending');
const centerCol = document.getElementById('approved');
const rightCol = document.getElementById('completed');

const header = document.getElementById('current-date-header');
const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
const today = new Date().toLocaleDateString('ru-RU', options);

header.textContent += ` на ${today}`;

let lastData = {
  pending: new Map(),
  approved: new Map(),
  completed: new Map()
};

function createCard(req) {
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.id = req.req_num || req._id;

  const gpaTypes = {
    'Стационарные ГПА (ГТК-10-4)': 'gtk.png',
    'Стационарные ГПА': 'stationary.png',
    'ГПА с авиа. приводом': 'avia.png',
    'ГПА с судовым приводом': 'ship.png'
  };

  // Проверка времени для pending и approved
  const now = new Date();
  const requestTime = new Date(req.request_datetime);
  const notificationTime = req.notification_datetime ? new Date(req.notification_datetime) : null;

  // 1. Для pending: красный фон если прошло время request_datetime - 1 час
  if (req.status === 'inwork' && req.req_type === 'with_approval') {
    const deadline = new Date(requestTime.getTime() - 60 * 60 * 1000); // минус 1 час
    if (now > deadline) {
      div.style.backgroundColor = '#fde8e8';
      div.style.border = '1px solid #f5c6cb';
    }
  }

  // 2. Для approved: красный фон если прошло время notification_datetime + 3 часа
  if (req.status === 'approved' && !req.is_complete && notificationTime) {
    const deadline = new Date(notificationTime.getTime() + 3 * 60 * 60 * 1000); // плюс 3 часа
    if (now > deadline) {
      div.style.backgroundColor = '#fde8e8';
      div.style.border = '1px solid #f5c6cb';
    }
  }

  // 3. Для completed: цвет в зависимости от is_fail и добавление fail_reason
  if (req.status === 'approved' && req.is_complete) {
    div.style.backgroundColor = req.is_fail ? '#fde8e8' : '#e9f7ee';
    div.style.border = '1px solid ' + (req.is_fail ? '#f5c6cb' : '#c3e6cb');
  }

  // Верстка карточки
  let descriptionContent = req.text || '<span class="request-description">Без описания</span>';

  // Добавляем fail_reason для завершенных неудачных заявок
  if (req.status === 'approved' && req.is_complete && req.is_fail && req.fail_reason) {
    descriptionContent += `<div class="fail-reason">${req.fail_reason}</div>`;
  }

  div.innerHTML = `
    <div class="request-container">
        <div class="request-left-column">
            <div class="request-title">${req.ks}</div>
            <div class="request-subtitle">ГПА ${req.num_gpa}</div>
            <div class="request-data">
                ${requestTime.toLocaleDateString('ru-RU')} ${requestTime.toLocaleTimeString('ru-RU').slice(0, 5)}
            </div>
        </div>
        <div class="request-center-column">
            ${descriptionContent}
        </div>
        <img class="request-logo" src="${gpaTypes[req.gpa_type]}">
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
