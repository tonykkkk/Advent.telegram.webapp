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
let promoData = {};

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
    const currentMonth = today.getMonth(); // 0-январь, 11-декабрь
    const currentYear = today.getFullYear();
    
    // Проверяем, декабрь ли сейчас 2025 года
    const isDecember2025 = currentMonth === 11 && currentYear === 2025;
    
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
        
        if (isDecember2025) {
            // Если СЕЙЧАС ДЕКАБРЬ 2025
            if (day === currentDay) {
                // Сегодняшний день
                status = 'today';
                statusText = 'Сегодня';
            } else if (day < currentDay) {
                // Прошедшие дни - ПРОПУЩЕНЫ
                status = 'missed';
                statusText = 'Пропущено';
            } else {
                // Будущие дни - БУДУЩЕЕ
                status = 'future';
                statusText = 'Будущее';
            }
        } else {
            // Если НЕ ДЕКАБРЬ 2025 - ВСЕ ДНИ БУДУЩИЕ
            status = 'future';
            statusText = 'Будущее';
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
        
        // Добавляем обработчик клика
        if (status === 'today') {
            // Кликабелен только сегодняшний день
            dayCard.addEventListener('click', function() {
                openPromoCard(day);
            });
            dayCard.style.cursor = 'pointer';
        } else {
            // Не кликабельны: пропущенные и будущие дни
            dayCard.style.cursor = 'not-allowed';
            dayCard.style.opacity = '0.7';
        }
        
        calendarContainer.appendChild(dayCard);
    }
    
    console.log('Календарь создан:', {
        дней: 31,
        сегодня: currentDay,
        месяц: currentMonth + 1,
        год: currentYear,
        декабрь2025: isDecember2025
    });
}

// Функция открытия карточки с промокодом
function openPromoCard(day) {
    const dayCard = document.querySelector(`.day-card[data-day="${day}"]`);
    
    // Текущая дата для проверки
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const isDecember2025 = currentMonth === 11 && currentYear === 2025;
    
    // Проверяем, можно ли открыть этот день
    // Можно открыть только сегодняшний день
    const isToday = (day === currentDay && isDecember2025);
    
    if (!isToday) {
        // Нельзя открыть пропущенные или будущие дни
        showError('Этот день еще не наступил или уже прошел');
        return;
    }
    
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
    
    // После открытия сегодняшнего дня обновляем страницу через 2 секунды
    // чтобы показать, что день стал "пропущен"
    setTimeout(() => {
        // После показа промокода перезагружаем страницу
        location.reload();
    }, 2000);
    
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
    
    // Для отладки - выводим информацию о текущей дате
    const today = new Date();
    console.log('Текущая дата:', {
        день: today.getDate(),
        месяц: today.getMonth() + 1,
        год: today.getFullYear(),
        декабрь2025: (today.getMonth() === 11 && today.getFullYear() === 2025)
    });
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