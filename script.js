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
let telegramWebApp = null;

// Инициализация Telegram WebApp
function initTelegramWebApp() {
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        telegramWebApp = window.Telegram.WebApp;
        
        // Расширяем на весь экран
        telegramWebApp.expand();
        
        // Скрываем кнопку "Назад"
        telegramWebApp.BackButton.hide();
        
        // Инициализируем кнопку для отправки промокода
        initShareButton();
        
        console.log('Telegram WebApp инициализирован:', {
            платформа: telegramWebApp.platform,
            версия: telegramWebApp.version,
            user: telegramWebApp.initDataUnsafe.user
        });
        
        return telegramWebApp;
    }
    return null;
}

// Функция для показа уведомления
function showAlert(message, type = 'info') {
    if (telegramWebApp) {
        if (type === 'success') {
            telegramWebApp.showPopup({
                title: '🎉 Успех!',
                message: message,
                buttons: [{ type: 'ok' }]
            });
        } else if (type === 'error') {
            telegramWebApp.showPopup({
                title: '⚠️ Ошибка',
                message: message,
                buttons: [{ type: 'ok' }]
            });
        } else {
            telegramWebApp.showAlert(message);
        }
    } else {
        // Fallback для браузера
        alert(message);
    }
}

// Инициализация кнопки для отправки промокода
function initShareButton() {
    // Добавляем кнопку "Отправить боту" в модальное окно
    const modalFooter = document.querySelector('.modal-footer');
    if (modalFooter) {
        const shareButton = document.createElement('button');
        shareButton.className = 'btn btn-primary btn-sm d-none';
        shareButton.id = 'share-to-bot-btn';
        shareButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Отправить промокод боту';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'text-center mt-2';
        buttonContainer.appendChild(shareButton);
        
        modalFooter.appendChild(buttonContainer);
    }
}

// Функция отправки промокода в диалог с ботом
function sendPromoCodeToBot(promoCode, description, day) {
    if (!telegramWebApp) {
        showAlert('Функция отправки доступна только в Telegram Mini App', 'error');
        return false;
    }
    
    // Формируем сообщение с промокодом
    const message = `🎁 *Промокод дня ${day} декабря* 🎁\n\n` +
                   `📝 *Описание:* ${description}\n\n` +
                   `🎫 *Промокод:* \`${promoCode}\`\n\n` +
                   `✨ *Скопируйте и используйте на сайте!*`;
    
    // Пытаемся отправить сообщение через WebApp
    try {
        // Метод 1: Используем telegram.sendData (для передачи данных родительскому приложению)
        if (telegramWebApp.sendData) {
            const data = {
                action: 'share_promo',
                promoCode: promoCode,
                description: description,
                day: day,
                message: message
            };
            
            telegramWebApp.sendData(JSON.stringify(data));
            console.log('Данные отправлены через sendData:', data);
            return true;
        }
        
        // Метод 2: Используем открытие ссылки с deep linking
        // Создаем ссылку для открытия диалога с ботом
        const botUsername = 'ecoplace_bot'; // Замените на имя вашего бота
        const encodedMessage = encodeURIComponent(message);
        const shareUrl = `https://t.me/${botUsername}?start=promo_${day}&text=${encodedMessage}`;
        
        // Открываем ссылку в WebView
        telegramWebApp.openTelegramLink(shareUrl);
        console.log('Открыта ссылка для отправки:', shareUrl);
        return true;
        
    } catch (error) {
        console.error('Ошибка отправки промокода:', error);
        
        // Метод 3: Fallback - показываем инструкцию
        showAlert(
            `Скопируйте промокод и отправьте его в диалог с нашим ботом:\n\n` +
            `Промокод: ${promoCode}\n\n` +
            `Для быстрого перехода к боту используйте: @ecoplace_bot`,
            'info'
        );
        return false;
    }
}

// Улучшенная функция копирования с опцией отправки боту
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
        console.log('Используются демо-данные');
        loadDemoData();
        return true; // Возвращаем true, чтобы приложение продолжило работу с демо-данными
    }
}

// Демо-данные на случай ошибки загрузки JSON
function loadDemoData() {
    calendarItems = [];
    
    // Создаем демо-данные: 31 день + 5 специальных карточек
    for (let i = 1; i <= 31; i++) {
        calendarItems.push({
            type: "day",
            day: i,
            code: `NY2025-DAY${i}`,
            description: `Эксклюзивный промокод на день ${i} декабря 2025 года. Скидка на праздничные товары!`,
            image: `images/gift${Math.min(i, 31)}.jpg`,
            backgroundImage: `images/day${Math.min(i, 31)}-bg.jpg`,
            productUrl: `https://ecoplace.ru/products/december-${i}`
        });
        
        // Добавляем специальные карточки после определенных дней
        if (i === 3 || i === 8 || i === 15 || i === 22 || i === 28) {
            const specialIndex = i === 3 ? 1 : i === 8 ? 2 : i === 15 ? 3 : i === 22 ? 4 : 5;
            calendarItems.push({
                type: "special",
                title: ["Флеш-акция", "Сюрприз", "Розыгрыш", "Подарок", "Супер-акция"][specialIndex - 1],
                image: `images/special${specialIndex}.jpg`,
                backgroundImage: `images/special-bg${specialIndex}.png`,
                description: ["Специальное предложение недели!", "Новогодний сюрприз!", "Участвуйте в розыгрыше!", "Каждому покупателю подарок!", "Супер-акция перед Новым годом!"][specialIndex - 1],
                actionUrl: `https://ecoplace.ru/special-${specialIndex}`
            });
        }
    }
    
    console.log('Демо-данные загружены:', calendarItems.length, 'элементов');
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

// Функция создания карточки дня
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
            statusText = 'Пропущено';
        } else {
            // Будущие дни стилизуем как открытые (с зеленым фоном)
            status = 'future';
            statusText = 'Будущее';
        }
    } else {
        // Если не декабрь 2025 - все дни будущие (с зеленым фоном)
        status = 'future';
        statusText = 'Будущее';
    }
    
    dayCard.classList.add(status);
    
    // Добавляем эффект снежинки для новогодних дней
    let snowflake = '';
    if (item.day === 24 || item.day === 25 || item.day === 31) {
        snowflake = '<i class="fas fa-snowflake position-absolute top-0 start-0 m-1 text-primary" style="font-size: 0.7rem;"></i>';
    }
    
    // Устанавливаем фоновое изображение
    let backgroundImageStyle = '';
    if (item.backgroundImage) {
        backgroundImageStyle = `background-image: url('${item.backgroundImage}');`;
    }
    
    dayCard.innerHTML = `
        <style>
            .day-card[data-day="${item.day}"]::before {
                ${backgroundImageStyle}
            }
        </style>
        ${snowflake}
        <div class="day-number">${item.day}</div>
        <div class="day-month">Декабрь</div>
        <div class="day-status">${statusText}</div>
    `;
    
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

// Функция создания специальной карточки
function createSpecialCard(item, index) {
    const specialCard = document.createElement('div');
    specialCard.className = 'special-card';
    specialCard.dataset.type = 'special';
    specialCard.dataset.index = index;
    
    // Устанавливаем фоновое изображение
    let backgroundImageStyle = '';
    if (item.backgroundImage) {
        backgroundImageStyle = `background-image: url('${item.backgroundImage}');`;
    }
    
    specialCard.innerHTML = `
        <style>
            .special-card[data-index="${index}"]::before {
                ${backgroundImageStyle}
            }
        </style>
        <div class="special-card-badge">АКЦИЯ</div>
        <img src="${item.image}" alt="${item.title}" class="special-card-image">
        <div class="special-card-type">${item.title}</div>
    `;
    
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
    
    // Сохраняем текущий промокод для отправки боту
    window.currentPromoCode = item.code;
    window.currentPromoDescription = item.description;
    window.currentPromoDay = item.day;
    
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
    
    // Показываем кнопку "Отправить боту" только в Telegram Mini App
    const shareButton = document.getElementById('share-to-bot-btn');
    if (shareButton) {
        if (telegramWebApp) {
            shareButton.classList.remove('d-none');
        } else {
            shareButton.classList.add('d-none');
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
            const day = document.getElementById('modal-day').textContent;
            const description = window.currentPromoDescription || 'Промокод дня';
            
            try {
                await copyToClipboard(promoCode);
                
                // Показываем уведомление
                showAlert(`✅ Промокод дня ${day} скопирован!\n\n${promoCode}`, 'success');
                
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
    
    // Обработчик для кнопки отправки промокода боту
    const shareButton = document.getElementById('share-to-bot-btn');
    if (shareButton) {
        shareButton.addEventListener('click', function() {
            const promoCode = document.getElementById('promo-code-text').textContent;
            const day = document.getElementById('modal-day').textContent;
            const description = window.currentPromoDescription || 'Промокод дня';
            
            // Отправляем промокод боту
            const success = sendPromoCodeToBot(promoCode, description, day);
            
            if (success) {
                // Меняем внешний вид кнопки при успешной отправке
                shareButton.innerHTML = '<i class="fas fa-check me-2"></i>Отправлено!';
                shareButton.classList.remove('btn-primary');
                shareButton.classList.add('btn-success');
                shareButton.disabled = true;
                
                // Восстанавливаем кнопку через 3 секунды
                setTimeout(() => {
                    shareButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Отправить промокод боту';
                    shareButton.classList.remove('btn-success');
                    shareButton.classList.add('btn-primary');
                    shareButton.disabled = false;
                }, 3000);
            }
        });
    }
    
    // Обработчик закрытия модального окна
    const modalElement = document.getElementById('promoModal');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', function() {
            // Сбрасываем состояние кнопки отправки при закрытии модального окна
            const shareButton = document.getElementById('share-to-bot-btn');
            if (shareButton) {
                shareButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Отправить промокод боту';
                shareButton.classList.remove('btn-success');
                shareButton.classList.add('btn-primary');
                shareButton.disabled = false;
            }
        });
    }
}

// Основная функция инициализации
async function initApp() {
    console.log('Инициализация приложения...');
    
    // Инициализируем Telegram WebApp
    telegramWebApp = initTelegramWebApp();
    
    // Инициализируем модальное окно Bootstrap
    const modalElement = document.getElementById('promoModal');
    if (modalElement) {
        promoModal = new bootstrap.Modal(modalElement);
    }
    
    // Загружаем данные календаря
    await loadCalendarData();
    
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
            showAlert('Произошла ошибка при загрузке приложения', 'error');
        });
    }, 100);
});