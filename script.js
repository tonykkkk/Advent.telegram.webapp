document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const isDecember = currentMonth === 11;
    
    const currentDateElement = document.getElementById('current-date');
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    currentDateElement.textContent = today.toLocaleDateString('ru-RU', options);
    
    let promoData = {};
    
    const modal = document.getElementById('promo-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const promoDayElement = document.getElementById('modal-day');
    const promoImageElement = document.getElementById('promo-image');
    const promoDescriptionElement = document.getElementById('promo-description');
    const promoCodeElement = document.getElementById('promo-code-text');
    const copyBtn = document.getElementById('copy-btn');
    const productBtn = document.getElementById('product-btn');
    
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
            
            createCalendar();
            
        } catch (error) {
            console.error('Ошибка загрузки промокодов:', error);
            showErrorNotification('Не удалось загрузить промокоды. Используются демо-данные.');
            loadDemoData();
            createCalendar();
        }
    }
    
    function loadDemoData() {
        for (let day = 1; day <= 31; day++) {
            promoData[day] = {
                code: `NEWYEAR${day}-${10 + day}`,
                description: `Специальный промокод на день ${day} декабря. Этот промокод дает скидку на праздничные товары.`,
                image: `images/gift${day}.jpg`,
                productUrl: `https://example.com/products/day-${day}`
            };
        }
    }
    
    function showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    function createCalendar() {
        const calendarElement = document.getElementById('calendar');
        let openedCount = 0;
        
        const openedDays = JSON.parse(localStorage.getItem('adventOpenedDays')) || [];
        
        for (let day = 1; day <= 31; day++) {
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            dayCard.dataset.day = day;
            
            let status = '';
            let statusText = '';
            
            if (day < currentDay && isDecember && currentYear === 2023) {
                status = 'open';
                statusText = 'Открыто';
                if (openedDays.includes(day)) openedCount++;
            } else if (day === currentDay && isDecember && currentYear === 2023) {
                status = 'today';
                statusText = 'Сегодня';
                if (openedDays.includes(day)) openedCount++;
            } else {
                status = 'closed';
                statusText = 'Закрыто';
            }
            
            dayCard.classList.add(status);
            
            dayCard.innerHTML = `
                <div class="day-number">${day}</div>
                <div class="day-status">${statusText}</div>
            `;
            
            if (status !== 'closed') {
                dayCard.addEventListener('click', function() {
                    openPromoCard(day);
                });
            }
            
            calendarElement.appendChild(dayCard);
        }
        
        document.getElementById('opened-count').textContent = openedCount;
        document.getElementById('total-count').textContent = '31';
        
        if (!isDecember || currentYear !== 2023) {
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
            
            openedCount = 31;
            document.getElementById('opened-count').textContent = openedCount;
            
            const subtitle = document.querySelector('.subtitle');
            subtitle.innerHTML += '<br><em>Так как сейчас не декабрь 2023 года, все окошки открыты для демонстрации.</em>';
        }
    }
    
    function openPromoCard(day) {
        const dayCard = document.querySelector(`.day-card[data-day="${day}"]`);
        
        dayCard.classList.add('card-opening');
        setTimeout(() => {
            dayCard.classList.remove('card-opening');
        }, 800);
        
        const promo = promoData[day];
        
        promoDayElement.textContent = `День ${day}`;
        promoDescriptionElement.textContent = promo.description;
        promoCodeElement.textContent = promo.code;
        
        if (promo.productUrl) {
            productBtn.href = promo.productUrl;
            productBtn.style.display = 'flex';
            productBtn.classList.add('pulse');
        } else {
            productBtn.style.display = 'none';
            productBtn.classList.remove('pulse');
        }
        
        const img = new Image();
        img.onload = function() {
            promoImageElement.innerHTML = '';
            promoImageElement.appendChild(img);
        };
        img.onerror = function() {
            promoImageElement.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                    <i class="fas fa-gift" style="font-size: 4rem; color: #FFD700; margin-bottom: 15px;"></i>
                    <p style="color: #b0d7ff; text-align: center;">Подарок дня ${day}</p>
                    <p style="color: #8a9ba8; font-size: 0.9rem; margin-top: 10px;">Изображение: ${promo.image}</p>
                </div>
            `;
        };
        img.src = promo.image;
        img.alt = `Промокод для дня ${day}`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        
        const openedDays = JSON.parse(localStorage.getItem('adventOpenedDays')) || [];
        
        if (!openedDays.includes(day)) {
            openedDays.push(day);
            localStorage.setItem('adventOpenedDays', JSON.stringify(openedDays));
            
            const openedCount = openedDays.length;
            document.getElementById('opened-count').textContent = openedCount;
            
            if (dayCard.classList.contains('today')) {
                dayCard.classList.remove('today');
                dayCard.classList.add('open');
                const statusElement = dayCard.querySelector('.day-status');
                statusElement.textContent = 'Открыто';
            }
        }
        
        modal.style.display = 'flex';
    }
    
    closeModalBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    copyBtn.addEventListener('click', function() {
        const promoCode = promoCodeElement.textContent;
        
        navigator.clipboard.writeText(promoCode).then(function() {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
            copyBtn.style.background = '#2E7D32';
            
            setTimeout(function() {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '';
            }, 2000);
        }).catch(function(err) {
            console.error('Ошибка при копировании: ', err);
            
            const textArea = document.createElement('textarea');
            textArea.value = promoCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
            copyBtn.style.background = '#2E7D32';
            
            setTimeout(function() {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '';
            }, 2000);
        });
    });
    
    productBtn.addEventListener('click', function(e) {
        const day = promoDayElement.textContent.replace('День ', '');
        console.log(`Пользователь перешел по промокоду дня ${day}`);
        
        const openedDays = JSON.parse(localStorage.getItem('adventOpenedDays')) || [];
        if (!openedDays.includes(parseInt(day))) {
            openedDays.push(parseInt(day));
            localStorage.setItem('adventOpenedDays', JSON.stringify(openedDays));
        }
    });
    
    loadPromoCodes();
});
