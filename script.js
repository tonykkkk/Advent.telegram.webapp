// Полифиллы для старых браузеров
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

document.addEventListener('DOMContentLoaded', function() {
    // Текущая дата - декабрь 2025
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth(); // 0 - январь, 11 - декабрь
    const currentYear = today.getFullYear();
    
    // Проверяем, декабрь ли сейчас 2025 года
    const isDecember2025 = currentMonth === 11 && currentYear === 2025;
    
    // Обновляем информацию о текущей дате
    const currentDateElement = document.getElementById('current-date');
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    currentDateElement.textContent = today.toLocaleDateString('ru-RU', options);
    
    // Загружаем данные промокодов из JSON файла
    let promoData = {};
    
    // Элементы модального окна
    const promoModal = new bootstrap.Modal(document.getElementById('promoModal'));
    const modalDayElement = document.getElementById('modal-day');
    const promoImageElement = document.getElementById('promo-image');
    const promoDescriptionElement = document.getElementById('promo-description');
    const promoCodeElement = document.getElementById('promo-code-text');
    const promoCodeContainer = document.getElementById('promo-code-container');
    const copyAlert = document.getElementById('copy-alert');
    const productBtn = document.getElementById('product-btn');
    
    // Функция загрузки данных промокодов
    async function loadPromoCodes() {
        try {
            const response = await fetch('promocodes.json');
            if (!response.ok) {
                throw new Error('Не удалось загрузить данные промокодов');
            }
            const data = await response.json();
            
            // Преобразуем массив в объект для быстрого доступа по дню
            data.promocodes.forEach(promo => {
                promoData[promo.day] = {
                    code: promo.code,
                    description: promo.description,
                    image: promo.image,
                    productUrl: promo.productUrl
                };
            });
            
            // После загрузки данных создаем календарь
            createCalendar();
            
        } catch (error) {
            console.error('Ошибка загрузки промокодов:', error);
            showErrorNotification('Не удалось загрузить промокоды. Используются демо-данные.');
            loadDemoData();
            createCalendar();
        }
    }
    
    // Демо-данные на случай ошибки загрузки JSON
    function loadDemoData() {
        for (let day = 1; day <= 31; day++) {
            promoData[day] = {
                code: `NEWYEAR2025-DAY${day}`,
                description: `Эксклюзивный промокод на день ${day} декабря. Скидка на праздничные товары!`,
                image: `images/gift${day}.jpg`,
                productUrl: `https://example.com/products/december-${day}`
            };
        }
    }
    
    // Функция для показа уведомления об ошибке
    function showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'alert alert-warning alert-dismissible fade show position-fixed top-0 end-0 m-3';
        notification.style.zIndex = '1100';
        notification.style.maxWidth = '300px';
        notification.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Внимание!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Функция создания календаря
    function createCalendar() {
        const calendarContainer = document.getElementById('calendar-container');
        calendarContainer.innerHTML = '';
        
        const calendarWrapper = document.createElement('div');
        calendarWrapper.className = 'row';
        calendarWrapper.id = 'calendar';
        
        let openedCount = 0;
        
        // Загружаем состояние открытых окошек из localStorage
        const openedDays = JSON.parse(localStorage.getItem('adventOpenedDays2025')) || [];
        
        // Создаем карточки для каждого дня декабря
        for (let day = 1; day <= 31; day++) {
            const dayCol = document.createElement('div');
            dayCol.className = 'calendar-col';
            
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            dayCard.dataset.day = day;
            
            // Определяем статус дня
            let status = '';
            let statusText = '';
            
            if (day < currentDay && isDecember2025) {
                // Прошедшие дни декабря 2025
                status = 'open';
                statusText = 'Открыто';
                if (openedDays.includes(day)) openedCount++;
            } else if (day === currentDay && isDecember2025) {
                // Сегодняшний день декабря 2025
                status = 'today';
                statusText = 'Сегодня';
                if (openedDays.includes(day)) openedCount++;
            } else {
                // Будущие дни или не декабрь 2025
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
            
            // Добавляем обработчик клика для открытых и сегодняшних карточек
            if (status !== 'closed') {
                dayCard.addEventListener('click', function() {
                    openPromoCard(day);
                });
                
                // Для демонстрации (если не декабрь 2025) также добавляем обработчик
                if (!isDecember2025) {
                    dayCard.addEventListener('click', function() {
                        openPromoCard(day);
                    });
                }
            }
            
            dayCol.appendChild(dayCard);
            calendarWrapper.appendChild(dayCol);
        }
        
        calendarContainer.appendChild(calendarWrapper);
        
        // Обновляем счетчик открытых окошек
        document.getElementById('opened-count').textContent = openedCount;
        document.getElementById('total-count').textContent = '31';
        
        // Если сейчас не декабрь 2025, показываем все карточки как открытые для демонстрации
        if (!isDecember2025) {
            document.querySelectorAll('.day-card.closed').forEach(card => {
                card.classList.remove('closed');
                card.classList.add('open');
                const statusElement = card.querySelector('.day-status');
                statusElement.textContent = 'Открыто';
                
                const day = parseInt(card.dataset.day);
                card.addEventListener('click', function() {
                    openPromoCard(day);
                });
            });
            
            // Обновляем счетчик
            openedCount = 31;
            document.getElementById('opened-count').textContent = openedCount;
            
            // Показываем сообщение
            const subtitle = document.querySelector('.lead');
            subtitle.innerHTML += '<br><small class="text-light">Так как сейчас не декабрь 2025 года, все окошки открыты для демонстрации.</small>';
        }
    }
    
    // Функция открытия карточки с промокодом
    function openPromoCard(day) {
        const dayCard = document.querySelector(`.day-card[data-day="${day}"]`);
        
        // Добавляем анимацию открытия
        dayCard.classList.add('card-opening');
        setTimeout(() => {
            dayCard.classList.remove('card-opening');
        }, 800);
        
        // Получаем данные промокода
        const promo = promoData[day];
        
        // Заполняем модальное окно данными
        modalDayElement.textContent = day;
        promoDescriptionElement.textContent = promo.description;
        promoCodeElement.textContent = promo.code;
        
        // Устанавливаем ссылку на товар
        if (promo.productUrl) {
            productBtn.href = promo.productUrl;
            productBtn.style.display = 'block';
        } else {
            productBtn.style.display = 'none';
        }
        
        // Устанавливаем изображение
        const img = new Image();
        img.onload = function() {
            promoImageElement.innerHTML = '';
            promoImageElement.appendChild(img);
            img.className = 'img-fluid rounded';
            img.style.maxHeight = '180px';
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
            if (dayCard.classList.contains('today')) {
                dayCard.classList.remove('today');
                dayCard.classList.add('open');
                const statusElement = dayCard.querySelector('.day-status');
                statusElement.textContent = 'Открыто';
            }
        }
        
        // Показываем модальное окно
        promoModal.show();
    }
    
    // Улучшенная функция копирования для всех браузеров
    function copyToClipboard(text) {
        // Метод для современных браузеров
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            // Старый метод для Safari и других браузеров
            return new Promise(function(resolve, reject) {
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
            });
        }
    }
    
    // Обработчик клика для копирования промокода
    promoCodeContainer.addEventListener('click', function() {
        const promoCode = promoCodeElement.textContent;
        
        copyToClipboard(promoCode).then(function() {
            // Показываем уведомление об успешном копировании
            copyAlert.classList.remove('d-none');
            
            // Скрываем уведомление через 3 секунды
            setTimeout(() => {
                copyAlert.classList.add('d-none');
            }, 3000);
            
            // Добавляем анимацию на промокод
            promoCodeContainer.style.transform = 'scale(0.95)';
            promoCodeContainer.style.backgroundColor = '#d4edda';
            promoCodeContainer.style.borderColor = '#28a745';
            
            setTimeout(() => {
                promoCodeContainer.style.transform = 'scale(1)';
                promoCodeContainer.style.backgroundColor = '';
                promoCodeContainer.style.borderColor = '';
            }, 300);
            
        }).catch(function(err) {
            console.error('Ошибка при копировании: ', err);
            
            // Показываем уведомление даже при ошибке
            copyAlert.classList.remove('d-none');
            copyAlert.classList.add('alert-success');
            
            setTimeout(() => {
                copyAlert.classList.add('d-none');
                copyAlert.classList.remove('alert-success');
            }, 3000);
        });
    });
    
    // Обработчик для кнопки перехода к товару
    productBtn.addEventListener('click', function(e) {
        const day = modalDayElement.textContent;
        console.log(`Пользователь перешел по промокоду дня ${day} декабря`);
        
        // Можно добавить отправку аналитики здесь
        const openedDays = JSON.parse(localStorage.getItem('adventOpenedDays2025')) || [];
        if (!openedDays.includes(parseInt(day))) {
            openedDays.push(parseInt(day));
            localStorage.setItem('adventOpenedDays2025', JSON.stringify(openedDays));
        }
    });
    
    // Загружаем данные промокодов при загрузке страницы
    loadPromoCodes();
});