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
    
    let openedCount = 0;
    
    // Текущая дата
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const isDecember2025 = currentMonth === 11 && currentYear === 2025;
    
    // В Telegram Web App открываем все карточки для демонстрации
    const isTelegram = isTelegramWebApp();
    const forceOpen = isTelegram;
    
    // Загружаем состояние открытых окошек из localStorage
    const openedDays = JSON.parse(localStorage.getItem('adventOpenedDays2025')) || [];
    
    // Обновляем текущую дату на странице
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('current-date').textContent = today.toLocaleDateString('ru-RU', options);
    
    // Создаем карточки для каждого дня декабря
    for (let day = 1; day <= 31; day++) {
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        dayCard.dataset.day = day;
        
        // Определяем статус дня
        let status = '';
        let statusText = '';
        
        if (forceOpen || day < currentDay && isDecember2025) {
            status = 'open';
            statusText = 'Открыто';
            if (openedDays.includes(day)) openedCount++;
        } else if (day === currentDay && isDecember2025) {
            status = 'today';
            statusText = 'Сегодня';
            if (openedDays.includes(day)) openedCount++;
        } else {
            status = 'closed';
            statusText = 'Закрыто';
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
            <div class="day-status">${statusText}</div>
        `;
        
        // Добавляем обработчик клика
        if (forceOpen || status !== 'closed') {
            dayCard.addEventListener('click', function() {
                openPromoCard(day);
            });
        } else {
            dayCard.style.cursor = 'not-allowed';
        }
        
        calendarContainer.appendChild(dayCard);
    }
    
    // Обновляем счетчик
    const finalOpenedCount = forceOpen ? 31 : openedCount;
    document.getElementById('opened-count').textContent = finalOpenedCount;
    document.getElementById('total-count').textContent = '31';
    
    // Для Telegram показываем инструкцию
    if (isTelegram) {
        const instruction = document.getElementById('telegram-instruction');
        if (instruction) {
            instruction.classList.remove('d-none');
        }
        
        if (!isDecember2025) {
            const subtitle = document.querySelector('.lead');
            if (subtitle) {
                subtitle.innerHTML += '<br><small class="text-light">В Telegram Web App все окошки открыты для демонстрации.</small>';
            }
        }
    }
    
    console.log('Календарь создан:', {
        дней: 31,
        открыто: finalOpenedCount,
        telegram: isTelegram,
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
        
        // Обновляем счетчик
        const openedCount = openedDays.length;
        document.getElementById('opened-count').textContent = openedCount;
        
        // Обновляем статус карточки, если она была "сегодня"
        if (dayCard && dayCard.classList.contains('today')) {
            dayCard.classList.remove('today');
            dayCard.classList.add('open');
            const statusElement = dayCard.querySelector('.day-status');
            if (statusElement) {
                statusElement.textContent = 'Открыто';
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
                
                // В Telegram показываем всплывающее уведомление
                if (tg) {
                    tg.showAlert('Промокод скопирован!');
                }
                
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
            
            // Можно добавить аналитику здесь
            if (tg) {
                tg.sendData(JSON.stringify({
                    action: 'product_click',
                    day: day
                }));
            }
        });
    }
}

// Основная функция инициализации
async function initApp() {
    console.log('Инициализация приложения...');
    
    // Инициализируем Telegram Web App
    initTelegramWebApp();
    
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
    
    // Сообщаем Telegram о готовности
    if (tg) {
        tg.ready();
        console.log('Приложение готово для Telegram Web App');
    }
    
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

// Обработка изменения размера окна
window.addEventListener('resize', function() {
    if (tg) {
        tg.viewportHeight = window.innerHeight;
    }
});