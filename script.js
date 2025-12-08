// Полифиллы для совместимости
if (!NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}

if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || 
                                Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        var el = this;
        if (!document.documentElement.contains(el)) return null;
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

// Функция для показа уведомления
function showAlert(message, type = 'info') {
    alert(message);
}

// Функция для склонения слова "день"
function getDaysWord(days) {
    const lastDigit = days % 10;
    const lastTwoDigits = days % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return 'дней';
    }
    
    if (lastDigit === 1) {
        return 'день';
    }
    
    if (lastDigit >= 2 && lastDigit <= 4) {
        return 'дня';
    }
    
    return 'дней';
}

// Расчёт дней до Нового года
function calculateDaysToNewYear() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const nextYear = today.getFullYear() + 1;
    const newYear = new Date(nextYear, 0, 1);
    const diffTime = newYear - todayStart;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) - 1;
    return diffDays;
}

function updateDaysToNewYearDisplay() {
    const daysElement = document.getElementById('days-to-new-year');
    if (!daysElement) return;
    
    const days = calculateDaysToNewYear();
    const daysWord = getDaysWord(days);
    daysElement.textContent = `${days} ${daysWord}`;
    daysElement.classList.add('days-to-new-year');
}

// Улучшенное копирование
async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.cssText = 'position:fixed; top:0; left:-9999px; opacity:0; pointer-events:none;';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
    } finally {
        document.body.removeChild(textArea);
    }
}

// Снежинки
function createSnowflakes() {
    const snowContainer = document.createElement('div');
    snowContainer.className = 'snow-container';
    snowContainer.id = 'snow-container';
    document.body.appendChild(snowContainer);
    
    const snowflakeCount = window.innerWidth < 768 ? 40 : 80;
    
    for (let i = 0; i < snowflakeCount; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        const size = Math.random() * 6 + 2;
        snowflake.style.width = `${size}px`;
        snowflake.style.height = `${size}px`;
        snowflake.style.left = `${Math.random() * 100}%`;
        snowflake.style.animationDelay = `${Math.random() * 5}s`;
        snowflake.style.animationDuration = `${Math.random() * 10 + 10}s`;
        snowflake.style.opacity = Math.random() * 0.6 + 0.4;
        snowflake.style.background = 'white';
        snowContainer.appendChild(snowflake);
    }

    window.addEventListener('resize', () => {
        const snowContainer = document.getElementById('snow-container');
        if (snowContainer) snowContainer.remove();
        createSnowflakes();
    });
}

// Загрузка промокодов
async function loadCalendarData() {
    try {
        const response = await fetch('promocodes.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!data.calendarItems || !Array.isArray(data.calendarItems)) {
            throw new Error('Invalid data format');
        }
        calendarItems = data.calendarItems;
        return true;
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showErrorState();
        return false;
    }
}

function showErrorState() {
    const calendarContainer = document.getElementById('calendar-container');
    calendarContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger text-center p-5">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <h3>Не удалось загрузить данные</h3>
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
    const calendarContainer = document.getElementById('calendar-container');
    calendarContainer.innerHTML = '';

    if (!calendarItems || calendarItems.length === 0) {
        showErrorState();
        return;
    }

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const isDecember2025 = currentMonth === 11 && currentYear === 2025;

    document.getElementById('current-date').textContent = today.toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    updateDaysToNewYearDisplay();

    calendarItems.forEach((item, index) => {
        if (item.type === 'day') {
            const dayCard = createDayCard(item, isDecember2025, currentDay);
            calendarContainer.appendChild(dayCard);
        } else if (item.type === 'special') {
            const specialCard = createSpecialCard(item, index);
            calendarContainer.appendChild(specialCard);
        }
    });

    setTimeout(() => highlightTodayCard(), 50);
}

function highlightTodayCard() {
    const todayCard = document.querySelector('.day-card.today');
    if (todayCard) {
        setTimeout(() => {
            todayCard.style.animation = 'bounceToday 1s ease-in-out 3';
            todayCard.addEventListener('animationend', () => {
                todayCard.style.animation = 'bounceToday 2s infinite ease-in-out';
            }, { once: true });
        }, 1000);
    }
}

// Создание карточки дня (без анимации cardOpen)
function createDayCard(item, isDecember2025, currentDay) {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card fix-webview-resize';
    dayCard.dataset.type = 'day';
    dayCard.dataset.day = item.day;

    let status = '';
    let statusText = '';

    if (isDecember2025) {
        if (item.day === currentDay) {
            status = 'today';
            statusText = 'Открыть';
        } else if (item.day < currentDay) {
            status = 'missed';
            statusText = 'Закончился';
        } else {
            status = 'future';
            statusText = 'Скоро';
        }
    } else {
        status = 'future';
        statusText = 'Скоро';
    }

    dayCard.classList.add(status);

    let snowflake = '';
    if (['24', '25', '31'].includes(String(item.day))) {
        snowflake = '<i class="fas fa-snowflake position-absolute top-0 start-0 m-1 text-white" style="font-size: 0.7rem;"></i>';
    }

    dayCard.style.backgroundImage = status !== 'today' && item.backgroundImage ? `url('${item.backgroundImage}')` : '';
    dayCard.style.backgroundSize = 'cover';
    dayCard.style.backgroundPosition = 'center';
    dayCard.style.backgroundRepeat = 'no-repeat';

    // Убираем ::before overlay, добавляем только для не-сегодня
    if (status !== 'today') {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.8);z-index:0;';
        dayCard.appendChild(overlay);
    }

    dayCard.innerHTML += `
        ${snowflake}
        <div class="day-number">${item.day}</div>
        <div class="day-month">Декабря</div>
        <div class="day-status">${statusText}</div>
    `;

    if (status === 'today') {
        dayCard.addEventListener('click', () => openPromoCard(item));
        dayCard.style.cursor = 'pointer';
        dayCard.title = 'Откройте сегодняшний подарок!';
    } else {
        dayCard.style.cursor = 'not-allowed';
        dayCard.style.opacity = '0.7';
    }

    return dayCard;
}

function createSpecialCard(item, index) {
    const specialCard = document.createElement('div');
    specialCard.className = 'special-card fix-webview-resize';
    specialCard.dataset.type = 'special';
    specialCard.dataset.index = index;

    const img = document.createElement('img');
    img.src = item.image;
    img.alt = 'Специальное предложение';
    img.className = 'special-card-image fix-webview-resize';
    img.onerror = () => img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5BQ0NJT048L3RleHQ+PC9zdmc+';

    specialCard.appendChild(img);

    if (item.actionUrl && item.actionUrl.trim() !== '') {
        specialCard.addEventListener('click', () => openSpecialCard(item));
        specialCard.style.cursor = 'pointer';
    } else {
        specialCard.style.cursor = 'default';
    }

    return specialCard;
}

// Открытие акции
function openSpecialCard(item) {
    if (item.actionUrl && item.actionUrl.trim() !== '') {
        window.open(item.actionUrl, '_blank');
    }
}

// Открытие промокода (без анимации cardOpen)
function openPromoCard(item) {
    const dayCard = document.querySelector(`.day-card[data-day="${item.day}"]`);

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const isDecember2025 = currentMonth === 11 && currentYear === 2025;

    if (item.day !== currentDay || !isDecember2025) {
        showAlert('День ещё не наступил или уже прошёл', 'error');
        return;
    }

    // Визуальная и тактильная обратная связь
    if (dayCard) {
        dayCard.style.transform = 'scale(0.96)';
        setTimeout(() => {
            dayCard.style.transform = '';
        }, 200);
    }

    // Вибрация при открытии
    if (navigator.vibrate) {
        navigator.vibrate([20, 10, 20]); // "щелчок"
    }

    currentPromoItem = item;

    document.getElementById('modal-day').textContent = item.day;
    document.getElementById('promo-code-text').textContent = item.code;

    const promoImageElement = document.getElementById('promo-image');
    const img = new Image();
    img.onload = () => {
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
        promoImageElement.innerHTML = `
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

    const productBtn = document.getElementById('product-btn');
    if (item.productUrl) {
        productBtn.href = item.productUrl;
        productBtn.textContent = 'Купить на ecoplace.ru';
        productBtn.style.display = 'block';
    } else {
        productBtn.style.display = 'none';
    }

    const promoValidElement = document.querySelector('.modal-footer .text-muted');
    if (promoValidElement) {
        const today = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const todayFormatted = today.toLocaleDateString('ru-RU', options);
        promoValidElement.innerHTML = `
            <i class="fas fa-info-circle me-1"></i>Промокод действителен только сегодня, ${todayFormatted}
        `;
    }

    if (promoModal) {
        promoModal.show();
    }
}

// Копирование
function setupEventListeners() {
    const promoCodeContainer = document.getElementById('promo-code-container');
    const copyAlert = document.getElementById('copy-alert');

    if (promoCodeContainer && copyAlert) {
        promoCodeContainer.addEventListener('click', async () => {
            const code = document.getElementById('promo-code-text').textContent;
            try {
                await copyToClipboard(code);
                showAlert(`✅ Скопировано: ${code}`, 'success');
                copyAlert.classList.remove('d-none');
                setTimeout(() => copyAlert.classList.add('d-none'), 3000);
            } catch (err) {
                showAlert('Ошибка копирования', 'error');
            }
        });
    }

    const modalElement = document.getElementById('promoModal');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', () => {
            currentPromoItem = null;
        });
    }

    window.addEventListener('resize', handleResize);
}

function handleResize() {
    if (isResizing) return;
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        isResizing = false;
    }, 250);
}

// Инициализация
async function initApp() {
    createSnowflakes();

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no';
    }

    const modalElement = document.getElementById('promoModal');
    if (modalElement) {
        promoModal = new bootstrap.Modal(modalElement);
    }

    const loaded = await loadCalendarData();
    if (loaded) {
        createCalendar();
        setupEventListeners();

        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.expand();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initApp, 100);
});
