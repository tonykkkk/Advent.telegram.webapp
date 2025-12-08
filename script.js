// Полифиллы
if (!NodeList.prototype.forEach) NodeList.prototype.forEach = Array.prototype.forEach;
if (!Element.prototype.matches) Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        let el = this;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };
}

// Глобальные переменные
let promoModal = null;
let calendarItems = [];
let currentPromoItem = null;
let resizeTimeout = null;
let isResizing = false;
let scrollPosition = 0;

// Показ уведомления
function showAlert(message) {
    alert(message);
}

// Склонение "день"
function getDaysWord(days) {
    const lastTwo = days % 100;
    const last = days % 10;
    if (lastTwo >= 11 && lastTwo <= 19) return 'дней';
    if (last === 1) return 'день';
    if (last >= 2 && last <= 4) return 'дня';
    return 'дней';
}

// Дней до Нового года
function calculateDaysToNewYear() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const nextYear = today.getFullYear() + 1;
    const newYear = new Date(nextYear, 0, 1);
    const diff = Math.floor((newYear - todayStart) / (1000 * 60 * 60 * 24)) - 1;
    return diff;
}

function updateDaysToNewYearDisplay() {
    const el = document.getElementById('days-to-new-year');
    if (!el) return;
    const days = calculateDaysToNewYear();
    el.textContent = `${days} ${getDaysWord(days)}`;
    el.classList.add('days-to-new-year');
}

// Копирование
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    } catch (e) {
        console.error('Copy failed', e);
    }
}

// Снежинки (оптимизация)
function createSnowflakes() {
    const isLowEnd = navigator.deviceMemory && navigator.deviceMemory < 2;
    const count = window.innerWidth < 768 ? (isLowEnd ? 15 : 40) : (isLowEnd ? 25 : 80);

    const container = document.createElement('div');
    container.className = 'snow-container';
    container.id = 'snow-container';
    document.body.appendChild(container);

    for (let i = 0; i < count; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        const size = Math.random() * 6 + 2;
        flake.style.cssText = `
            width: ${size}px; height: ${size}px;
            left: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 5}s;
            animation-duration: ${Math.random() * 10 + 10}s;
            opacity: ${Math.random() * 0.6 + 0.4};
            background: white;
        `;
        container.appendChild(flake);
    }

    window.addEventListener('resize', () => {
        const c = document.getElementById('snow-container');
        if (c) c.remove();
        createSnowflakes();
    });
}

// Загрузка данных с кэшированием
async function loadCalendarData() {
    const cacheKey = 'advent-calendar-data-v2';
    const cache = localStorage.getItem(cacheKey);
    const cacheTime = 60 * 60 * 1000; // 1 час

    if (cache) {
        const { items, timestamp } = JSON.parse(cache);
        if (Date.now() - timestamp < cacheTime) {
            calendarItems = items;
            return true;
        }
    }

    try {
        const res = await fetch('promocodes.json?' + Date.now());
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        if (!data.calendarItems) throw new Error('Invalid format');

        calendarItems = data.calendarItems;
        localStorage.setItem(cacheKey, JSON.stringify({
            items: calendarItems,
            timestamp: Date.now()
        }));
        return true;
    } catch (err) {
        console.error('Load failed:', err);
        if (cache) {
            const { items } = JSON.parse(cache);
            calendarItems = items;
            return true;
        }
        showErrorState();
        return false;
    }
}

function showErrorState() {
    const container = document.getElementById('calendar-container');
    container.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger text-center p-5">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <h3>Ошибка загрузки</h3>
                <p>Проверьте интернет и обновите страницу.</p>
                <button class="btn btn-warning mt-3" onclick="location.reload()">
                    <i class="fas fa-redo me-2"></i>Обновить
                </button>
            </div>
        </div>
    `;
}

// Создание календаря
function createCalendar() {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '';

    if (!calendarItems.length) {
        showErrorState();
        return;
    }

    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    const isDec2025 = month === 11 && year === 2025;

    document.getElementById('current-date').textContent = today.toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    updateDaysToNewYearDisplay();

    calendarItems.forEach(item => {
        if (item.type === 'day') {
            const card = createDayCard(item, isDec2025, day);
            container.appendChild(card);
        } else if (item.type === 'special') {
            const card = createSpecialCard(item);
            container.appendChild(card);
        }
    });

    setTimeout(() => highlightTodayCard(), 50);
}

function highlightTodayCard() {
    const card = document.querySelector('.day-card.today');
    if (card) {
        setTimeout(() => {
            card.style.animation = 'bounceToday 1s ease-in-out 3';
            card.addEventListener('animationend', () => {
                card.style.animation = 'bounceToday 2s infinite ease-in-out';
            }, { once: true });
        }, 1000);
    }
}

// Карточка дня (ленивая загрузка фона)
function createDayCard(item, isDec2025, currentDay) {
    const card = document.createElement('div');
    card.className = 'day-card fix-webview-resize';
    card.dataset.type = 'day';
    card.dataset.day = item.day;
    if (item.backgroundImage) card.dataset.bg = item.backgroundImage;

    let status = '';
    let statusText = '';

    if (isDec2025) {
        if (item.day === currentDay) status = 'today', statusText = 'Открыть';
        else if (item.day < currentDay) status = 'missed', statusText = 'Закончился';
        else status = 'future', statusText = 'Скоро';
    } else {
        status = 'future'; statusText = 'Скоро';
    }

    card.classList.add(status);

    let snowflake = '';
    if ([24, 25, 31].includes(item.day)) {
        snowflake = '<i class="fas fa-snowflake position-absolute top-0 start-0 m-1 text-white" style="font-size:0.7rem;"></i>';
    }

    // Фон загружается при наведении
    if (status !== 'today' && item.backgroundImage) {
        card.addEventListener('mouseenter', function () {
            if (this.style.backgroundImage) return;
            this.style.backgroundImage = `url('${this.dataset.bg}')`;
        }, { once: true });
    }

    card.innerHTML += `
        ${snowflake}
        <div class="day-number">${item.day}</div>
        <div class="day-month">Декабря</div>
        <div class="day-status">${statusText}</div>
    `;

    if (status === 'today') {
        card.addEventListener('click', () => openPromoCard(item));
        card.style.cursor = 'pointer';
        card.title = 'Откройте подарок!';
    } else {
        card.style.cursor = 'not-allowed';
        card.style.opacity = '0.7';
    }

    return card;
}

function createSpecialCard(item) {
    const card = document.createElement('div');
    card.className = 'special-card fix-webview-resize';

    const img = document.createElement('img');
    img.src = item.image;
    img.alt = 'Акция';
    img.className = 'special-card-image';
    img.onerror = () => img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5BQ0NJT048L3RleHQ+PC9zdmc+';

    card.appendChild(img);

    if (item.actionUrl) {
        card.addEventListener('click', () => openSpecialCard(item));
        card.style.cursor = 'pointer';
    }

    return card;
}

function openSpecialCard(item) {
    if (item.actionUrl) window.open(item.actionUrl, '_blank');
}

// Открытие промокода (без скачка скролла)
function openPromoCard(item) {
    const card = document.querySelector(`.day-card[data-day="${item.day}"]`);
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const isDecember2025 = currentMonth === 11 && currentYear === 2025;

    if (item.day !== currentDay || !isDecember2025) {
        showAlert('День недоступен');
        return;
    }

    // Вибрация
    if (navigator.vibrate) navigator.vibrate([20, 10, 20]);

    // Визуальный эффект
    if (card) {
        card.style.transform = 'scale(0.96)';
        setTimeout(() => card.style.transform = '', 200);
    }

    currentPromoItem = item;

    document.getElementById('modal-day').textContent = item.day;
    document.getElementById('promo-code-text').textContent = item.code;

    const img = new Image();
    img.onload = () => {
        const promoImageElement = document.getElementById('promo-image');
        promoImageElement.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'text-center';
        img.className = 'img-fluid rounded';
        img.style.maxHeight = '180px';
        img.style.objectFit = 'contain';
        container.appendChild(img);
        const desc = document.createElement('div');
        desc.className = 'promo-description-block';
        desc.innerHTML = `<p class="promo-description-text">${item.description}</p>`;
        container.appendChild(desc);
        promoImageElement.appendChild(container);
    };
    img.onerror = () => {
        document.getElementById('promo-image').innerHTML = `
            <div class="text-center">
                <i class="fas fa-gift fa-5x text-primary mb-3"></i>
                <p class="text-muted small mb-3">Подарок дня ${item.day}</p>
                <div class="promo-description-block">
                    <p class="promo-description-text">${item.description}</p>
                </div>
            </div>
        `;
    };
    img.src = item.image;

    const btn = document.getElementById('product-btn');
    if (item.productUrl) {
        btn.href = item.productUrl;
        btn.textContent = 'Купить на ecoplace.ru';
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }

    const validEl = document.querySelector('.modal-footer .text-muted');
    if (validEl) {
        const dateStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        validEl.innerHTML = `<i class="fas fa-info-circle me-1"></i>Действует только сегодня, ${dateStr}`;
    }

    if (promoModal) promoModal.show();
}

// Копирование промокода
function setupEventListeners() {
    const codeContainer = document.getElementById('promo-code-container');
    const alert = document.getElementById('copy-alert');

    if (codeContainer && alert) {
        codeContainer.addEventListener('click', async () => {
            const code = document.getElementById('promo-code-text').textContent;
            try {
                await copyToClipboard(code);
                showAlert(`✅ Скопировано: ${code}`);
                alert.classList.remove('d-none');
                setTimeout(() => alert.classList.add('d-none'), 3000);
            } catch (e) {
                showAlert('Ошибка копирования');
            }
        });
    }

    const modalEl = document.getElementById('promoModal');

    // Фикс скролла
    modalEl.addEventListener('show.bs.modal', () => {
        scrollPosition = window.pageYOffset;
        document.body.style.cssText = `position:fixed; top:-${scrollPosition}px; width:100%; overflow-y:scroll;`;
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
        document.body.style.cssText = '';
        window.scrollTo(0, scrollPosition);
    });

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => isResizing = false, 250);
    });
}

// Инициализация
async function initApp() {
    createSnowflakes();

    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }

    const modalEl = document.getElementById('promoModal');
    if (modalEl) {
        promoModal = new bootstrap.Modal(modalEl);
    }

    const loaded = await loadCalendarData();
    if (loaded) {
        createCalendar();
        setupEventListeners();

        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.expand();
            window.Telegram.WebApp.setHeaderColor('#310005');
            window.Telegram.WebApp.setBackgroundColor('#ffffff');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initApp, 100);
});
