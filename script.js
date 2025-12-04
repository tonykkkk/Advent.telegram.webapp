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
let specialCardsData = {};
let telegramWebApp = null;

// Карта расположения специальных карточек между днями
// Формат: {position: 'after', day: X} - означает карточка идет ПОСЛЕ дня X
const specialCardsPositions = [
    { day: 3, position: 'after', specialData: { day: 's3.1' } }, // После 3 дня
    { day: 8, position: 'after', specialData: { day: 's8.1' } }, // После 8 дня
    { day: 15, position: 'after', specialData: { day: 's15.1' } }, // После 15 дня
    { day: 22, position: 'after', specialData: { day: 's22.1' } }, // После 22 дня
    { day: 28, position: 'after', specialData: { day: 's28.1' } }  // После 28 дня
];

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

// Функция загрузки данных промокодов
async function loadPromoCodes() {
    try {
        const response = await fetch('promocodes.json');
        if (!response.ok) {
            throw new Error('Не удалось загрузить данные промокодов');
        }
        const data = await response.json();
        
        // Загружаем данные о промокодах
        data.promocodes.forEach(promo => {
            promoData[promo.day] = {
                code: promo.code,
                description: promo.description,
                image: promo.image,
                backgroundImage: promo.backgroundImage,
                productUrl: promo.productUrl
            };
        });
        
        // Загружаем данные о специальных карточках
        specialCardsData = {};
        if (data.specialCards) {
            data.specialCards.forEach(card => {
                // Используем специальный ключ для специальных карточек
                const specialKey = card.day;
                specialCardsData[specialKey] = {
                    type: card.type,
                    image: card.image,
                    backgroundImage: card.backgroundImage,
                    description: card.description,
                    actionUrl: card.actionUrl
                };
            });
            
            // Обновляем позиции специальных карточек из JSON
            if (data.specialCardsPositions) {
                data.specialCardsPositions.forEach(pos => {
                    const index = specialCardsPositions.findIndex(p => p.specialData.day === pos.specialData.day);
                    if (index !== -1) {
                        specialCardsPositions[index] = pos;
                    }
                });
            }
        }
        
        console.log('Промокоды загружены:', Object.keys(promoData).length, 'дней');
        console.log('Специальные карточки:', Object.keys(specialCardsData).length, 'карточек');
        console.log('Позиции специальных карточек:', specialCardsPositions);
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки промокодов:', error);
        showAlert('Не удалось загрузить промокоды. Используются демо-данные.', 'error');
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
            backgroundImage: `images/day${day}-bg.jpg`,
            productUrl: `https://example.com/products/december-${day}`
        };
    }
    
    // Демо данные для специальных карточек
    specialCardsData = {
        's3.1': {
            type: "Флеш-акция",
            image: "images/special1.jpg",
            backgroundImage: "images/special-bg1.png",
            description: "Специальное предложение недели - скидка 40% на новогодние украшения!",
            actionUrl: "https://ecoplace.ru/special-offer"
        },
        's8.1': {
            type: "Сюрприз",
            image: "images/special2.jpg",
            backgroundImage: "images/special-bg2.png",
            description: "Новогодний сюрприз от Деда Мороза - получите бесплатную доставку!",
            actionUrl: "https://ecoplace.ru/surprise"
        },
        's15.1': {
            type: "Розыгрыш",
            image: "images/special3.jpg",
            backgroundImage: "images/special-bg3.png",
            description: "Участвуйте в розыгрыше новогодних подарков!",
            actionUrl: "https://ecoplace.ru/contest"
        },
        's22.1': {
            type: "Подарок",
            image: "images/special4.jpg",
            backgroundImage: "images/special-bg4.png",
            description: "Каждому покупателю - новогодний подарок!",
            actionUrl: "https://ecoplace.ru/gift"
        },
        's28.1': {
            type: "Супер-акция",
            image: "images/special5.jpg",
            backgroundImage: "images/special-bg5.png",
            description: "Супер-акция перед Новым годом - скидки до 70%!",
            actionUrl: "https://ecoplace.ru/super-sale"
        }
    };
}

// Функция создания календаря с фоновыми изображениями и специальными карточками МЕЖДУ днями
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
    
    // Создаем массив всех карточек (дни + специальные карточки между ними)
    const allCards = [];
    
    // Проходим по всем дням декабря и добавляем специальные карточки между ними
    for (let day = 1; day <= 31; day++) {
        // Сначала добавляем карточку дня
        allCards.push({
            type: 'day',
            day: day,
            data: promoData[day]
        });
        
        // Проверяем, нужно ли добавить специальную карточку ПОСЛЕ этого дня
        const specialCardPosition = specialCardsPositions.find(pos => pos.day === day && pos.position === 'after');
        if (specialCardPosition) {
            const specialKey = specialCardPosition.specialData.day;
            const specialData = specialCardsData[specialKey];
            
            if (specialData) {
                allCards.push({
                    type: 'special',
                    specialKey: specialKey,
                    data: specialData,
                    position: specialCardPosition
                });
            }
        }
    }
    
    // Теперь создаем DOM-элементы для всех карточек
    allCards.forEach(card => {
        if (card.type === 'day') {
            // Создаем обычную карточку дня
            const dayCard = createDayCard(card.day, isDecember2025, currentDay);
            calendarContainer.appendChild(dayCard);
        } else if (card.type === 'special') {
            // Создаем специальную карточку
            const specialCard = createSpecialCard(card.specialKey, card.data);
            calendarContainer.appendChild(specialCard);
        }
    });
}

// Функция создания карточки дня
function createDayCard(day, isDecember2025, currentDay) {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';
    dayCard.dataset.day = day;
    dayCard.dataset.type = 'day';
    
    // Определяем статус дня
    let status = '';
    let statusText = '';
    
    if (isDecember2025) {
        if (day === currentDay) {
            status = 'today';
            statusText = 'Сегодня';
        } else if (day < currentDay) {
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
    if (day === 24 || day === 25 || day === 31) {
        snowflake = '<i class="fas fa-snowflake position-absolute top-0 start-0 m-1 text-primary" style="font-size: 0.7rem;"></i>';
    }
    
    // Получаем данные промокода для фонового изображения
    const promo = promoData[day];
    let backgroundImageStyle = '';
    
    if (promo && promo.backgroundImage) {
        // Устанавливаем фоновое изображение
        backgroundImageStyle = `background-image: url('${promo.backgroundImage}');`;
    }
    
    dayCard.innerHTML = `
        <style>
            .day-card[data-day="${day}"]::before {
                ${backgroundImageStyle}
            }
        </style>
        ${snowflake}
        <div class="day-number">${day}</div>
        <div class="day-month">Декабрь</div>
        <div class="day-status">${statusText}</div>
    `;
    
    // Добавляем обработчик клика
    if (status === 'today') {
        dayCard.addEventListener('click', function() {
            openPromoCard(day);
        });
        dayCard.style.cursor = 'pointer';
    } else {
        dayCard.style.cursor = 'not-allowed';
        dayCard.style.opacity = '0.7';
    }
    
    return dayCard;
}

// Функция создания специальной карточки
function createSpecialCard(specialKey, specialData) {
    const specialCard = document.createElement('div');
    specialCard.className = 'special-card';
    specialCard.dataset.specialKey = specialKey;
    specialCard.dataset.type = 'special';
    
    // Устанавливаем фоновое изображение
    let backgroundImageStyle = '';
    if (specialData.backgroundImage) {
        backgroundImageStyle = `background-image: url('${specialData.backgroundImage}');`;
    }
    
    specialCard.innerHTML = `
        <style>
            .special-card[data-special-key="${specialKey}"]::before {
                ${backgroundImageStyle}
            }
        </style>
        <div class="special-card-badge">АКЦИЯ</div>
        <img src="${specialData.image}" alt="${specialData.type}" class="special-card-image">
        <div class="special-card-type">${specialData.type}</div>
    `;
    
    // Добавляем обработчик клика для перехода по URL
    specialCard.addEventListener('click', function() {
        openSpecialCard(specialData);
    });
    specialCard.style.cursor = 'pointer';
    
    return specialCard;
}

// Функция открытия специальной карточки
function openSpecialCard(specialData) {
    if (!specialData) {
        showAlert('Данные карточки не найдены', 'error');
        return;
    }
    
    // Проверяем, есть ли URL для перехода
    if (!specialData.actionUrl || specialData.actionUrl.trim() === '') {
        showAlert('Ссылка для перехода не указана', 'error');
        return;
    }
    
    // Сразу переходим по ссылке
    window.open(specialData.actionUrl, '_blank');
    
    // Показываем краткое уведомление
    showAlert(`Вы переходите по специальному предложению: ${specialData.type}`, 'info');
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
    const isToday = (day === currentDay && isDecember2025);
    
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
    
    // Получаем данные промокода
    const promo = promoData[day];
    if (!promo) {
        showAlert('Промокод для этого дня не найден', 'error');
        return;
    }
    
    // Сохраняем текущий промокод для отправки боту
    window.currentPromoCode = promo.code;
    window.currentPromoDescription = promo.description;
    window.currentPromoDay = day;
    
    // Заполняем модальное окно данными
    document.getElementById('modal-day').textContent = day;
    document.getElementById('promo-code-text').textContent = promo.code;
    
    // Обновляем описание промокода (переносим под картинку)
    const descriptionElement = document.getElementById('promo-description');
    if (descriptionElement) {
        descriptionElement.textContent = promo.description;
    }
    
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
        const imgContainer = document.createElement('div');
        imgContainer.className = 'text-center';
        
        // Добавляем изображение
        img.className = 'img-fluid rounded';
        img.style.maxHeight = '180px';
        img.style.objectFit = 'contain';
        img.alt = `Промокод для дня ${day} декабря`;
        imgContainer.appendChild(img);
        
        // Добавляем описание под картинкой
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'promo-description-block';
        descriptionDiv.innerHTML = `
            <p class="promo-description-text">${promo.description}</p>
        `;
        
        promoImageElement.innerHTML = '';
        promoImageElement.appendChild(imgContainer);
        promoImageElement.appendChild(descriptionDiv);
    };
    img.onerror = function() {
        promoImageElement.innerHTML = `
            <div class="text-center">
                <i class="fas fa-gift fa-5x text-primary mb-3"></i>
                <p class="text-muted small mb-3">Подарок дня ${day}</p>
                <div class="promo-description-block">
                    <p class="promo-description-text">${promo.description}</p>
                </div>
            </div>
        `;
    };
    img.src = promo.image;
    
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
            showAlert('Произошла ошибка при загрузке приложения', 'error');
        });
    }, 100);
});