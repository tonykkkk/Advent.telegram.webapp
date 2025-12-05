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

// Функция для показа уведомления
function showAlert(message, type = 'info') {
    // Fallback для браузера
    alert(message);
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
}

// Функция создания карточки дня (ИСПРАВЛЕНО: фоновое изображение)
function createDayCard(item, isDecember2025, currentDay) {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';
    dayCard.dataset.type = 'day';
    dayCard.dataset.day = item.day;
    
    // Определяем статус дня
    let status = '';
    let statusText = '';
    
    if (isDecember2025) {
        if (item.day === currentDay) {
            status = 'today';
            statusText = 'Сегодня';
        } else if (item.day < currentDay) {
            status = 'missed';
            statusText = 'Закончился';
        } else {
            // Будущие дни стилизуем как открытые (с зеленым фоном)
            status = 'future';
            statusText = 'Ждем';
        }
    } else {
        // Если не декабрь 2025 - все дни будущие (с зеленым фоном)
        status = 'future';
        statusText = 'Ждем';
    }
    
    dayCard.classList.add(status);
    
    // Добавляем эффект снежинки для новогодних дней
    let snowflake = '';
    if (item.day === 24 || item.day === 25 || item.day === 31) {
        snowflake = '<i class="fas fa-snowflake position-absolute top-0 start-0 m-1 text-primary" style="font-size: 0.7rem;"></i>';
    }
    
    // Устанавливаем фоновое изображение через инлайновые стили
    if (item.backgroundImage) {
        // Используем инлайновый стиль для фонового изображения
        dayCard.style.backgroundImage = `url('${item.backgroundImage}')`;
        dayCard.style.backgroundSize = 'cover';
        dayCard.style.backgroundPosition = 'center';
        dayCard.style.backgroundRepeat = 'no-repeat';
    }
    
    // Вместо псевдоэлемента ::before, используем overlay для фонового изображения
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    overlay.style.zIndex = '0';
    
    dayCard.appendChild(overlay);
    
    // Создаем контейнер для контента
    const contentDiv = document.createElement('div');
    contentDiv.style.position = 'relative';
    contentDiv.style.zIndex = '1';
    contentDiv.style.textAlign = 'center';
    
    // Добавляем контент
    contentDiv.innerHTML = `
        ${snowflake}
        <div class="day-number">${item.day}</div>
        <div class="day-month">Декабрь</div>
        <div class="day-status">${statusText}</div>
    `;
    
    dayCard.appendChild(contentDiv);
    
    // Добавляем обработчик клика
    if (status === 'today') {
        dayCard.addEventListener('click', function() {
            openPromoCard(item);
        });
        dayCard.style.cursor = 'pointer';
    } else {
        dayCard.style.cursor = 'not-allowed';
        dayCard.style.opacity = '0.7';
    }
    
    return dayCard;
}

// Функция создания специальной карточки (ТОЛЬКО КАРТИНКА)
function createSpecialCard(item, index) {
    const specialCard = document.createElement('div');
    specialCard.className = 'special-card';
    specialCard.dataset.type = 'special';
    specialCard.dataset.index = index;
    
    // Создаем элемент img для картинки
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = 'Специальное предложение';
    img.className = 'special-card-image';
    
    // Добавляем обработчик ошибки загрузки изображения
    img.onerror = function() {
        // Если изображение не загрузилось, показываем placeholder
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5BQ0NJT048L3RleHQ+PC9zdmc+';
    };
    
    // Добавляем картинку в карточку
    specialCard.appendChild(img);
    
    // Добавляем обработчик клика для перехода по URL
    specialCard.addEventListener('click', function() {
        openSpecialCard(item);
    });
    specialCard.style.cursor = 'pointer';
    
    return specialCard;
}

// Функция открытия специальной карточки
function openSpecialCard(item) {
    if (!item) {
        showAlert('Данные карточки не найдены', 'error');
        return;
    }
    
    // Проверяем, есть ли URL для перехода
    if (!item.actionUrl || item.actionUrl.trim() === '') {
        showAlert('Ссылка для перехода не указана', 'error');
        return;
    }
    
    // Сразу переходим по ссылке
    window.open(item.actionUrl, '_blank');
}

// Функция открытия карточки с промокодом
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
    
    // Добавляем анимацию открытия
    if (dayCard) {
        dayCard.classList.add('card-opening');
        setTimeout(() => {
            dayCard.classList.remove('card-opening');
        }, 800);
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
    
    // Обновляем описание промокода (переносим под картинку)
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
        img.className = 'img-fluid rounded';
        img.style.maxHeight = '180px';
        img.style.objectFit = 'contain';
        img.alt = `Промокод для дня ${item.day} декабря`;
        imgContainer.appendChild(img);
        
        // Добавляем описание под картинкой
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'promo-description-block';
        descriptionDiv.innerHTML = `
            <p class="promo-description-text">${item.description}</p>
        `;
        
        promoImageElement.innerHTML = '';
        promoImageElement.appendChild(imgContainer);
        promoImageElement.appendChild(descriptionDiv);
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
    
    // Обновляем текст о действии промокода (действует только сегодня)
    const promoValidElement = document.querySelector('.modal-footer .text-muted');
    if (promoValidElement) {
        const today = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const todayFormatted = today.toLocaleDateString('ru-RU', options);
        promoValidElement.innerHTML = `
            <i class="fas fa-info-circle me-1"></i>Промокод действителен только сегодня, ${todayFormatted}
        `;
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
                showAlert(`✅ Промокод скопирован в буфер обмена!\n\n${promoCode}`, 'success');
                
                // Показываем уведомление на странице
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
}

// Основная функция инициализации
async function initApp() {
    console.log('Инициализация приложения...');
    
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
        
        console.log('Приложение инициализировано');
    }
    
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
            showAlert('Произошла ошибка при загрузке приложения', 'error');
            showErrorState();
        });
    }, 100);
});