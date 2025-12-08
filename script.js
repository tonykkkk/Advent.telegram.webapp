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
    // Fallback для браузера
    alert(message);
}

// Функция для склонения слова "день" в зависимости от числа
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

// Функция для расчета дней до Нового года
function calculateDaysToNewYear() {
    const today = new Date();
    
    // Устанавливаем время на 00:00:00 для точного расчета дней
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Новый год - 1 января следующего года в 00:00:00
    const nextYear = today.getFullYear() + 1;
    const newYear = new Date(nextYear, 0, 1); // 1 января следующего года
    
    // Разница в миллисекундах
    const diffTime = newYear - todayStart;
    
    // Конвертируем в дни (правильно, без округления вверх)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))-1;
    
    return diffDays;
}

// Функция для обновления отображения дней до Нового года
function updateDaysToNewYearDisplay() {
    const daysElement = document.getElementById('days-to-new-year');
    if (!daysElement) return;
    
    const days = calculateDaysToNewYear();
    const daysWord = getDaysWord(days);
    
    daysElement.textContent = `${days} ${daysWord}`;
    
    // Добавляем класс для стилизации
    daysElement.classList.add('days-to-new-year');
}

// Улучшенная функция копирования
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
            textArea.style.opacity = '0';
            textArea.style.pointerEvents = 'none';
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    resolve();
                } else {
                    reject(new Error('Не удалось скопировать текст'));
                }
            } catch (err) {
                reject(err);
            } finally {
                setTimeout(() => {
                    document.body.removeChild(textArea);
                }, 100);
            }
        }
    });
}

// Функция для остановки всех анимаций элемента
function stopAnimations(element) {
    if (!element) return;
    
    element.style.animation = 'none';
    element.style.webkitAnimation = 'none';
    
    // Принудительная перерисовка
    void element.offsetWidth;
}

// Функция создания снежинок
function createSnowflakes() {
    const snowContainer = document.createElement('div');
    snowContainer.className = 'snow-container';
    snowContainer.id = 'snow-container';
    document.body.appendChild(snowContainer);
    
    const snowflakeCount = window.innerWidth < 768 ? 40 : 80; // Меньше снежинок на мобильных
    
    for (let i = 0; i < snowflakeCount; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        
        // Случайный размер снежинки от 2px до 8px
        const size = Math.random() * 6 + 2;
        snowflake.style.width = `${size}px`;
        snowflake.style.height = `${size}px`;
        
        // Случайная позиция по горизонтали
        const startX = Math.random() * 100;
        snowflake.style.left = `${startX}%`;
        
        // Случайная задержка начала анимации
        const delay = Math.random() * 5;
        snowflake.style.animationDelay = `${delay}s`;
        
        // Случайная длительность анимации от 10 до 20 секунд
        const duration = Math.random() * 10 + 10;
        snowflake.style.animationDuration = `${duration}s`;
        
        // Случайная прозрачность
        const opacity = Math.random() * 0.6 + 0.4;
        snowflake.style.opacity = opacity;
        
        // Случайный цвет снежинки (белый с разными оттенками)
        const colorVariation = Math.random() * 40 + 200;
        snowflake.style.background = `rgba(${colorVariation}, ${colorVariation}, 255, ${opacity})`;
        
        // Случайное боковое движение
        const xMovement = Math.random() * 40 - 20;
        snowflake.style.setProperty('--x-movement', `${xMovement}px`);
        
        snowContainer.appendChild(snowflake);
    }
    
    // Обновляем снежинки при ресайзе
    window.addEventListener('resize', function() {
        const snowContainer = document.getElementById('snow-container');
        if (snowContainer) {
            snowContainer.remove();
            createSnowflakes();
        }
    });
}

// Функция загрузки данных календаря
async function loadCalendarData() {
    try {
        const response = await fetch('promocodes.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data.calendarItems || !Array.isArray(data.calendarItems)) {
            throw new Error('Неверный формат данных: calendarItems не найден или не является массивом');
        }
        
        calendarItems = data.calendarItems;
        console.log('Данные календаря загружены:', calendarItems.length, 'элементов');
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки данных календаря:', error);
        // Показываем сообщение об ошибке вместо загрузки демо-данных
        showErrorState();
        return false;
    }
}

// Функция отображения состояния ошибки
function showErrorState() {
    const calendarContainer = document.getElementById('calendar-container');
    calendarContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger text-center p-5">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <h3 class="alert-heading">Не удалось загрузить данные календаря</h3>
                <p class="mb-0">Пожалуйста, проверьте подключение к интернету и попробуйте обновить страницу.</p>
                <button class="btn btn-warning mt-3" onclick="location.reload()">
                    <i class="fas fa-redo me-2"></i>Обновить страницу
                </button>
            </div>
        </div>
    `;
}

// Функция создания календаря
function createCalendar() {
    const calendarContainer = document.getElementById('calendar-container');
    calendarContainer.innerHTML = '';
    
    // Если данные не загружены, показываем ошибку
    if (!calendarItems || calendarItems.length === 0) {
        showErrorState();
        return;
    }
    
    // Текущая дата
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Проверяем, декабрь ли сейчас 2025 года
    const isDecember2025 = currentMonth === 11 && currentYear === 2025;
    
    // Обновляем текущую дату на странице
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('current-date').textContent = today.toLocaleDateString('ru-RU', options);
    
    // Обновляем отображение дней до Нового года
    updateDaysToNewYearDisplay();
    
    // Создаем карточки для всех элементов календаря в порядке их следования в массиве
    calendarItems.forEach((item, index) => {
        if (item.type === 'day') {
            // Создаем карточку дня
            const dayCard = createDayCard(item, isDecember2025, currentDay);
            calendarContainer.appendChild(dayCard);
        } else if (item.type === 'special') {
            // Создаем специальную карточку
            const specialCard = createSpecialCard(item, index);
            calendarContainer.appendChild(specialCard);
        }
    });
    
    // Принудительно перерисовываем элементы после создания
    setTimeout(() => {
        forceRedraw(calendarContainer);
        
        // Добавляем мигание для сегодняшнего дня через 1 секунду после загрузки
        highlightTodayCard();
    }, 50);
}

// Функция для выделения сегодняшней карточки дополнительной анимацией
function highlightTodayCard() {
    const todayCard = document.querySelector('.day-card.today');
    if (todayCard) {
        // Добавляем дополнительную анимацию мигания при загрузке
        setTimeout(() => {
            todayCard.style.animation = 'bounceToday 1s ease-in-out 3';
            todayCard.addEventListener('animationend', function() {
                this.style.animation = 'bounceToday 2s infinite ease-in-out';
            }, { once: true });
        }, 1000);
    }
}

// Функция принудительной перерисовки элементов
function forceRedraw(element) {
    if (!element) return;
    
    // Временное изменение стиля для перерисовки
    const originalDisplay = element.style.display;
    element.style.display = 'none';
    
    // Используем requestAnimationFrame для плавной перерисовки
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            element.style.display = originalDisplay || '';
            
            // Принудительная перерисовка всех дочерних элементов
            const allElements = element.querySelectorAll('*');
            allElements.forEach(el => {
                el.style.transform = 'translateZ(0)';
            });
        });
    });
}

// Функция создания карточки дня (ИСПРАВЛЕНО: фоновое изображение)
function createDayCard(item, isDecember2025, currentDay) {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card fix-webview-resize';
    dayCard.dataset.type = 'day';
    dayCard.dataset.day = item.day;
    
    // Определяем статус дня
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
            // Будущие дни стилизуем как открытые (с зеленым фоном)
            status = 'future';
            statusText = 'Скоро';
        }
    } else {
        // Если не декабрь 2025 - все дни будущие (с зеленым фоном)
        status = 'future';
        statusText = 'Скоро';
    }
    
    dayCard.classList.add(status);
    
    // Добавляем эффект снежинки для новогодних дней
    let snowflake = '';
    if (item.day === 24 || item.day === 25 || item.day === 31) {
        snowflake = '<i class="fas fa-snowflake position-absolute top-0 start-0 m-1 text-primary" style="font-size: 0.7rem;"></i>';
    }
    
    // Для сегодняшнего дня используем градиент вместо фонового изображения
    if (status !== 'today' && item.backgroundImage) {
        // Используем инлайновый стиль для фонового изображения только для не-сегодняшних дней
        dayCard.style.backgroundImage = `url('${item.backgroundImage}')`;
        dayCard.style.backgroundSize = 'cover';
        dayCard.style.backgroundPosition = 'center';
        dayCard.style.backgroundRepeat = 'no-repeat';
    }
    
    // Для сегодняшнего дня не добавляем overlay
    if (status !== 'today') {
        // Вместо псевдоэлемента ::before, используем overlay для фонового изображения
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        overlay.style.zIndex = '0';
        overlay.classList.add('fix-webview-resize');
        
        dayCard.appendChild(overlay);
    }
    
    // Создаем контейнер для контента
    const contentDiv = document.createElement('div');
    contentDiv.style.position = 'relative';
    contentDiv.style.zIndex = '1';
    contentDiv.style.textAlign = 'center';
    contentDiv.classList.add('fix-webview-resize');
    
    // Добавляем контент
    contentDiv.innerHTML = `
        ${snowflake}
        <div class="day-number fix-webview-resize">${item.day}</div>
        <div class="day-month fix-webview-resize">Декабря</div>
        <div class="day-status fix-webview-resize">${statusText}</div>
    `;
    
    dayCard.appendChild(contentDiv);
    
    // Добавляем обработчик клика
    if (status === 'today') {
        dayCard.addEventListener('click', function() {
            openPromoCard(item);
        });
        dayCard.style.cursor = 'pointer';
        
        // Добавляем дополнительный эффект для сегодняшнего дня
        dayCard.title = 'Нажмите, чтобы открыть сегодняшний промокод!';
    } else {
        dayCard.style.cursor = 'not-allowed';
        dayCard.style.opacity = '0.7';
    }
    
    return dayCard;
}

// Функция создания специальной карточки (ТОЛЬКО КАРТИНКА)
function createSpecialCard(item, index) {
    const specialCard = document.createElement('div');
    specialCard.className = 'special-card fix-webview-resize';
    specialCard.dataset.type = 'special';
    specialCard.dataset.index = index;
    
    // Создаем элемент img для картинки
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = 'Специальное предложение';
    img.className = 'special-card-image fix-webview-resize';
    
    // Добавляем обработчик ошибки загрузки изображения
    img.onerror = function() {
        // Если изображение не загрузилось, показываем placeholder
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5BQ0NJT048L3RleHQ+PC9zdmc+';
    };
    
    // Добавляем картинку в карточку
    specialCard.appendChild(img);
    
    // ИСПРАВЛЕНИЕ: Проверяем, есть ли ссылка для перехода
    if (item.actionUrl && item.actionUrl.trim() !== '') {
        // Добавляем обработчик клика для перехода по URL
        specialCard.addEventListener('click', function() {
            openSpecialCard(item);
        });
        specialCard.style.cursor = 'pointer';
        specialCard.title = 'Нажмите для перехода к акции';
    } else {
        // ИСПРАВЛЕНИЕ: Если ссылки нет, просто не делаем карточку кликабельной
        specialCard.style.cursor = 'default';
        specialCard.title = 'Специальное предложение';
    }
    
    return specialCard;
}

// Функция открытия специальной карточки
function openSpecialCard(item) {
    if (!item) {
        // Не показываем ошибку пользователю, просто не делаем ничего
        console.log('Данные карточки не найдены');
        return;
    }
    
    // Проверяем, есть ли URL для перехода
    if (!item.actionUrl || item.actionUrl.trim() === '') {
        // ИСПРАВЛЕНИЕ: Не показываем ошибку пользователю
        console.log('Ссылка для перехода не указана');
        return;
    }
    
    // Сразу переходим по ссылке
    window.open(item.actionUrl, '_blank');
}

// Функция открытия карточки с промокодом (ИСПРАВЛЕННАЯ АНИМАЦИЯ)
function openPromoCard(item) {
    const dayCard = document.querySelector(`.day-card[data-day="${item.day}"]`);
    
    // Текущая дата для проверки
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const isDecember2025 = currentMonth === 11 && currentYear === 2025;
    
    // Проверяем, можно ли открыть этот день
    const isToday = (item.day === currentDay && isDecember2025);
    
    if (!isToday) {
        showAlert('Этот день еще не наступил или уже прошел', 'error');
        return;
    }
    
    // Добавляем плавную анимацию открытия
    if (dayCard) {
        // Останавливаем текущую анимацию
        stopAnimations(dayCard);
        
        // Добавляем класс для анимации открытия
        dayCard.classList.add('card-opening');
        
        // Применяем CSS-анимацию (более плавную)
        dayCard.style.animation = 'cardOpen 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        dayCard.style.webkitAnimation = 'cardOpen 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Убираем класс после завершения анимации
        setTimeout(() => {
            dayCard.classList.remove('card-opening');
            dayCard.style.animation = '';
            dayCard.style.webkitAnimation = '';
            
            // Через небольшую паузу возвращаем обычную анимацию
            setTimeout(() => {
                if (dayCard.classList.contains('today')) {
                    dayCard.style.animation = 'bounceToday 2s infinite ease-in-out';
                    dayCard.style.webkitAnimation = 'bounceToday 2s infinite ease-in-out';
                }
            }, 100);
        }, 600);
    }
    
    if (!item) {
        showAlert('Промокод для этого дня не найден', 'error');
        return;
    }
    
    // Сохраняем текущий промокод
    currentPromoItem = item;
    
    // Заполняем модальное окно данными
    document.getElementById('modal-day').textContent = item.day;
    document.getElementById('promo-code-text').textContent = item.code;
    
    // Обновляем описание промокода
    const descriptionElement = document.getElementById('promo-description');
    if (descriptionElement) {
        descriptionElement.textContent = item.description;
    }
    
    // Устанавливаем ссылку на товар
    const productBtn = document.getElementById('product-btn');
    if (item.productUrl) {
        productBtn.href = item.productUrl;
        productBtn.textContent = 'Купить на ecoplace.ru';
        productBtn.style.display = 'block';
    } else {
        productBtn.style.display = 'none';
    }
    
    // Устанавливаем изображение
    const promoImageElement = document.getElementById('promo-image');
    const img = new Image();
    img.onload = function() {
        promoImageElement.innerHTML = '';
        const imgContainer = document.createElement('div');
        imgContainer.className = 'text-center';
        
        // Добавляем изображение
        img.className = 'img-fluid rounded fix-webview-resize';
        img.style.maxHeight = '180px';
        img.style.objectFit = 'contain';
        img.alt = `Промокод для дня ${item.day} декабря`;
        imgContainer.appendChild(img);
        
        // Добавляем описание под картинкой
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'promo-description-block fix-webview-resize';
        descriptionDiv.innerHTML = `
            <p class="promo-description-text">${item.description}</p>
        `;
        
        promoImageElement.innerHTML = '';
        promoImageElement.appendChild(imgContainer);
        promoImageElement.appendChild(descriptionDiv);
        
        // Принудительная перерисовка после загрузки изображения
        forceRedraw(promoImageElement);
    };
    img.onerror = function() {
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
    
    // Обновляем текст о действии промокода
    const promoValidElement = document.querySelector('.modal-footer .text-muted');
    if (promoValidElement) {
        const today = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const todayFormatted = today.toLocaleDateString('ru-RU', options);
        promoValidElement.innerHTML = `
            <i class="fas fa-info-circle me-1"></i>Промокод действителен только сегодня, ${todayFormatted}
        `;
    }
    
    // Показываем модальное окно с небольшой задержкой для завершения анимации
    setTimeout(() => {
        if (promoModal) {
            promoModal.show();
        }
    }, 300);
}

// Функция для обработки ресайза окна
function handleResize() {
    if (isResizing) return;
    
    isResizing = true;
    
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    
    resizeTimeout = setTimeout(() => {
        // Принудительно перерисовываем календарь после ресайза
        const calendarContainer = document.getElementById('calendar-container');
        if (calendarContainer) {
            forceRedraw(calendarContainer);
        }
        
        isResizing = false;
    }, 250);
}

// Функция для принудительной перерисовки всех элементов
function forceFullRedraw() {
    // Перерисовываем основные контейнеры
    const containers = [
        document.getElementById('calendar-container'),
        document.querySelector('.calendar-container-wrapper'),
        document.querySelector('.header-bg'),
        document.querySelector('.footer-bg')
    ];
    
    containers.forEach(container => {
        if (container) {
            forceRedraw(container);
        }
    });
}

// Функция предзагрузки ресурсов
async function preloadResources() {
    // Предзагрузка часто используемых изображений
    const images = ['logo.png', 'images/gift.png'];
    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Функция оптимизации viewport
function optimizeViewport() {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
        // Оптимальные настройки для производительности
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no';
        
        // Для iOS добавляем дополнительные настройки
        if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
            viewportMeta.content += ', minimal-ui';
        }
    }
}

// Настройка обработчиков для touch устройств
function setupTouchHandlers() {
    const dayCards = document.querySelectorAll('.day-card');
    
    dayCards.forEach(card => {
        // Обработчик для touchstart
        card.addEventListener('touchstart', function(e) {
            if (this.classList.contains('today')) {
                this.style.transform = 'scale(0.95)';
                this.style.transition = 'transform 0.1s ease';
            }
        }, { passive: true });
        
        // Обработчик для touchend
        card.addEventListener('touchend', function(e) {
            if (this.classList.contains('today')) {
                this.style.transform = '';
                this.style.transition = '';
            }
        }, { passive: true });
        
        // Обработчик для touchcancel
        card.addEventListener('touchcancel', function(e) {
            if (this.classList.contains('today')) {
                this.style.transform = '';
                this.style.transition = '';
            }
        }, { passive: true });
        
        // Предотвращаем долгое нажатие
        card.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
    });
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
                showAlert(`✅ Промокод скопирован в буфер обмена!\n\n${promoCode}`, 'success');
                
                // Показываем уведомление на странице
                copyAlert.classList.remove('d-none');
                forceRedraw(copyAlert);
                
                // Добавляем анимацию на промокод
                promoCodeContainer.style.transform = 'scale(0.95)';
                promoCodeContainer.style.backgroundColor = '#d4edda';
                promoCodeContainer.style.borderColor = '#28a745';
                promoCodeContainer.style.transition = 'all 0.2s ease';
                
                setTimeout(() => {
                    copyAlert.classList.add('d-none');
                    promoCodeContainer.style.transform = 'scale(1)';
                    promoCodeContainer.style.backgroundColor = '';
                    promoCodeContainer.style.borderColor = '';
                }, 3000);
                
            } catch (err) {
                console.error('Ошибка копирования:', err);
                showAlert('Не удалось скопировать промокод', 'error');
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
    
    // Обработчик закрытия модального окна
    const modalElement = document.getElementById('promoModal');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', function() {
            // Сбрасываем состояние
            currentPromoItem = null;
        });
    }
    
    // Обработчик ресайза окна
    window.addEventListener('resize', handleResize);
    
    // Обработчик для скролла (для WebView Telegram)
    window.addEventListener('scroll', function() {
        // Принудительная перерисовка при скролле
        requestAnimationFrame(() => {
            forceFullRedraw();
        });
    }, { passive: true });
    
    // Обработчик для ориентации устройства
    window.addEventListener('orientationchange', function() {
        // Даем время на изменение ориентации
        setTimeout(() => {
            forceFullRedraw();
            // Пересоздаем снежинки при смене ориентации
            const snowContainer = document.getElementById('snow-container');
            if (snowContainer) {
                snowContainer.remove();
                createSnowflakes();
            }
        }, 500);
    });
    
    // Настраиваем обработчики для touch устройств
    setupTouchHandlers();
}

// Основная функция инициализации
async function initApp() {
    console.log('Инициализация приложения...');
    
    // Предварительная загрузка ресурсов
    await preloadResources();
    
    // Создаем снежинки
    createSnowflakes();
    
    // Оптимизация viewport
    optimizeViewport();
    
    // Инициализируем модальное окно Bootstrap
    const modalElement = document.getElementById('promoModal');
    if (modalElement) {
        promoModal = new bootstrap.Modal(modalElement);
    }
    
    // Загружаем данные календаря
    const loaded = await loadCalendarData();
    
    if (loaded) {
        // Создаем календарь
        createCalendar();
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        // Инициализация для Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            try {
                window.Telegram.WebApp.expand();
                console.log('Telegram WebApp инициализирован');
            } catch (error) {
                console.warn('Ошибка инициализации Telegram WebApp:', error);
            }
        }
        
        console.log('Приложение инициализировано');
        
        // Принудительная перерисовка после загрузки
        setTimeout(() => {
            forceFullRedraw();
        }, 100);
    }
    
    // Для отладки - выводим информацию о текущей дате
    const today = new Date();
    console.log('Текущая дата:', {
        день: today.getDate(),
        месяц: today.getMonth() + 1,
        год: today.getFullYear(),
        декабрь2025: (today.getMonth() === 11 && today.getFullYear() === 2025),
        днейДоНовогоГода: calculateDaysToNewYear()
    });
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Даем время на загрузку DOM
    setTimeout(() => {
        initApp().catch(error => {
            console.error('Ошибка инициализации приложения:', error);
            showAlert('Произошла ошибка при загрузке приложения', 'error');
            showErrorState();
        });
    }, 100);
});

// Запуск приложения также при полной загрузке страницы
window.addEventListener('load', function() {
    // Перерисовываем после полной загрузки всех ресурсов
    setTimeout(() => {
        forceFullRedraw();
    }, 500);
});