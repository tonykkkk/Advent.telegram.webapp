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
let tg = null;
let promoModal = null;
let promoData = {};

// Проверяем, запущено ли в Telegram Web App
function isTelegramWebApp() {
    return window.Telegram && window.Telegram.WebApp;
}

// Инициализация Telegram Web App
function initTelegramWebApp() {
    if (isTelegramWebApp()) {
        tg = window.Telegram.WebApp;
        console.log('Telegram Web App обнаружен');
        return true;
    }
    return false;
}

// Улучшенная функция копирования для всех браузеров
function copyToClipboard(text) {
    return new Promise(function(resolve, reject) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(resolve)
                .catch(reject);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                resolve();
            } catch (err) {
                reject(err);
            } finally {
                textArea.remove();
            }
        }
    });
}

// Функция загрузки данных промокодов
async function loadPromoCodes() {
    try {
        const response = await fetch('promocodes.json');
        if (!response.ok) {
            throw new Error('Не удалось загрузить данные промокодов');
        }
        const data = await response.json();
        
        data.promocodes.forEach(promo => {
            promoData[promo.day] = {
                code: promo.code,
                description: promo.description,
                image: promo.image,
                productUrl: promo.productUrl
            };
        });
        
        console.log('Промокоды загружены:', Object.keys(promoData).length, 'дней');
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки промокодов:', error);
        showError('Не удалось загрузить промокоды. Используются демо-данные.');
        loadDemoData();
        return false;
    }
}

// Демо-данные на случай ошибки загрузки JSON
function loadDemoData() {
    for (let day = 1; day <= 31; day++) {
        promoData[day] = {
            code: `NY2025-DAY${day}`,
            description: `Эксклюзивный промокод на день ${day} декабря 2025 года. Скидка на праздничные товары!`,
            image: `images/gift${day}.jpg`,
            productUrl: `https://example.com/products/december-${day}`
        };
    }
}

// Функция для показа ошибки
function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-warning alert-dismissible fade show position-fixed top-0 start-0 m-3';
    alertDiv.style.zIndex = '1100';
    alertDiv.style.maxWidth = '300px';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Функция создания календаря
function createCalendar() {
    const calendarContainer = document.getElementById('calendar-container');
    calendarContainer.innerHTML = '';
    
    // Текущая дата
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const isDecember2025 = currentMonth === 11 && currentYear === 2025;
    
    // Обновляем текущую дату на странице
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('current-date').textContent = today.toLocaleDateString('ru-RU', options);
    
    // Загружаем состояние открытых окошек из localStorage
    const openedDays = JSON.parse(localStorage.getItem('adventOpenedDays2025')) || [];
    
    // Создаем карточки для каждого дня декабря
    for (let day = 1; day <= 31; day++) {
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        dayCard.dataset.day = day;
        
        // Определяем статус дня
        let status = '';
        let statusText = '';
        
        if (day === currentDay && isDecember2025) {
            // Сегодняшний день декабря 2025
            status = 'today';
            statusText = 'Сегодня';
        } else if (day < currentDay && isDecember2025) {
            // Прошедшие дни декабря 2025 - ПРОПУЩЕНЫ
            status = 'missed';
            statusText = 'Пропущено';
        } else if (day > currentDay && isDecember2025) {
            // Будущие дни декабря 2025
            status = 'future';
            statusText = 'Будущее';
        } else {
            // Не декабрь 2025 года - все дни будущие
            status = 'future';
            statusText = 'Будущее';
        }
        
        // Если день был открыт ранее (сохранен в localStorage), он становится "открытым"
        if (openedDays.includes(day)) {
            status = 'open';
            statusText = 'Открыто';
        }
        
        dayCard.classList.add(status);
        
        // Добавляем эффект снежинки для новогодних дней
        let snowflake = '';
        if (day === 24 || day === 25 || day === 31) {
            snowflake = '<i class="fas fa-snowflake position-absolute top-0 start-0 m-1 text-primary" style="font-size: 0.7rem;"></i>';
        }
        
        dayCard.innerHTML = `
            ${snowflake}
            <div class="day-number">${day}</div>
            <div class="day-month">Декабрь</div>
            <div class="day-status">${statusText}</div>
        `;
        
        // Добавляем обработчик клика только для открытых и сегодняшних карточек
        if (status === 'open' || status === 'today') {
            dayCard.addEventListener('click', function() {
                openPromoCard(day);
            });
        } else {
            dayCard.style.cursor = 'not-allowed';
        }
        
        calendarContainer.appendChild(dayCard);
    }
    
    console.log('Календарь создан:', {
        дней: 31,
        сегодня: currentDay,
        декабрь2025: isDecember2025
    });
}

// Функция открытия карточки с промокодом
function openPromoCard(day) {
    const dayCard = document.querySelector(`.day-card[data-day="${day}"]`);
    
    // Добавляем анимацию открытия
    if (dayCard) {
        dayCard.classList.add('card-opening');
        setTimeout(() => {
            dayCard.classList.remove('card-opening');
        }, 800);
    }
    
    // Получаем данные промокода
    const promo = promoData[day];
    if (!promo) {
        showError('Промокод для этого дня не найден');
        return;
    }
    
    // Заполняем модальное окно данными
    document.getElementById('modal-day').textContent = day;
    document.getElementById('promo-description').textContent = promo.description;
    document.getElementById('promo-code-text').textContent = promo.code;
    
    // Устанавливаем ссылку на товар
    const productBtn = document.getElementById('product-btn');
    if (promo.productUrl) {
        productBtn.href = promo.productUrl;
        productBtn.style.display = 'block';
    } else {
        productBtn.style.display = 'none';
    }
    
    // Устанавливаем изображение
    const promoImageElement = document.getElementById('promo-image');
    const img = new Image();
    img.onload = function() {
        promoImageElement.innerHTML = '';
        promoImageElement.appendChild(img);
        img.className = 'img-fluid rounded';
        img.style.maxHeight = '180px';
        img.style.objectFit = 'contain';
    };
    img.onerror = function() {
        promoImageElement.innerHTML = `
            <div class="text-center">
                <i class="fas fa-gift fa-5x text-primary mb-3"></i>
                <p class="text-muted small">Подарок дня ${day}</p>
            </div>
        `;
    };
    img.src = promo.image;
    img.alt = `Промокод для дня ${day} декабря`;
    
    // Загружаем состояние открытых окошек
    const openedDays = JSON.parse(localStorage.getItem('adventOpenedDays2025')) || [];
    
    // Если карточка еще не была открыта, добавляем в localStorage
    if (!openedDays.includes(day)) {
        openedDays.push(day);
        localStorage.setItem('adventOpenedDays2025', JSON.stringify(openedDays));
        
        // Обновляем статус карточки, если она была "сегодня"
        if (dayCard && dayCard.classList.contains('today')) {
            dayCard.classList.remove('today');
            dayCard.classList.add('open');
            
            // Обновляем текст на карточке
            const dayNumberElement = dayCard.querySelector('.day-number');
            const dayStatusElement = dayCard.querySelector('.day-status');
            
            if (dayStatusElement) {
                dayStatusElement.textContent = 'Открыто';
                dayStatusElement.style.backgroundColor = 'rgba(139, 195, 74, 0.2)';
                dayStatusElement.style.color = '#8bc34a';
            }
        }
    }
    
    // Показываем модальное окно
    if (promoModal) {
        promoModal.show();
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик клика для копирования промокода
    const promoCodeContainer = document.getElementById('promo-code-container');
    const copyAlert = document.getElementById('copy-alert');
    
    if (promoCodeContainer && copyAlert) {
        promoCodeContainer.addEventListener('click', async function() {
            const promoCode = document.getElementById('promo-code-text').textContent;
            
            try {
                await copyToClipboard(promoCode);
                
                // Показываем уведомление
                copyAlert.classList.remove('d-none');
                
                // Добавляем анимацию на промокод
                promoCodeContainer.style.transform = 'scale(0.95)';
                promoCodeContainer.style.backgroundColor = '#d4edda';
                promoCodeContainer.style.borderColor = '#28a745';
                
                setTimeout(() => {
                    copyAlert.classList.add('d-none');
                    promoCodeContainer.style.transform = 'scale(1)';
                    promoCodeContainer.style.backgroundColor = '';
                    promoCodeContainer.style.borderColor = '';
                }, 3000);
                
            } catch (err) {
                console.error('Ошибка копирования:', err);
                showError('Не удалось скопировать промокод');
            }
        });
    }
    
    // Обработчик для кнопки перехода к товару
    const productBtn = document.getElementById('product-btn');
    if (productBtn) {
        productBtn.addEventListener('click', function(e) {
            const day = document.getElementById('modal-day').textContent;
            console.log(`Переход по промокоду дня ${day}`);
        });
    }
}

// Основная функция инициализации
async function initApp() {
    console.log('Инициализация приложения...');
    
    // Инициализируем модальное окно Bootstrap
    const modalElement = document.getElementById('promoModal');
    if (modalElement) {
        promoModal = new bootstrap.Modal(modalElement);
    }
    
    // Загружаем промокоды
    await loadPromoCodes();
    
    // Создаем календарь
    createCalendar();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    console.log('Приложение инициализировано');
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initApp().catch(error => {
            console.error('Ошибка инициализации приложения:', error);
            showError('Произошла ошибка при загрузке приложения');
        });
    }, 100);
});