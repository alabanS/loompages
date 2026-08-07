// =====================================================================
//  МОДУЛЬ ФОРМЫ ОТЗЫВА
// =====================================================================
const Feedback = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbya0QpAufhPUmkgcgs1qHNGz61s_FpWTIZpj46cFYVNy1W92nVL8k5K52108z0zNrmrBA/exec', 

    init() {
        this._bindEvents();
    },

    _bindEvents() {
        // Кнопка открытия формы
        const feedbackBtn = document.getElementById('feedbackBtn');
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', () => this.openForm());
        }

        // Кнопка закрытия
        const feedbackCancel = document.getElementById('feedbackCancel');
        if (feedbackCancel) {
            feedbackCancel.addEventListener('click', () => this.closeForm());
        }

        // Закрытие по клику на оверлей
        const overlay = document.getElementById('feedbackFormOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === this) {
                    this.closeForm();
                }
            });
        }

        // Звёзды
        this._setupStars();

        // Отправка формы
        const form = document.getElementById('feedbackForm');
        if (form) {
            form.addEventListener('submit', (e) => this._handleSubmit(e));
        }

        // Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const overlay = document.getElementById('feedbackFormOverlay');
                if (overlay && overlay.classList.contains('active')) {
                    this.closeForm();
                }
            }
        });
    },

    openForm() {
        const overlay = document.getElementById('feedbackFormOverlay');
        if (overlay) {
            overlay.classList.add('active');
            document.getElementById('feedbackName')?.focus();
        }
    },

    closeForm() {
        const overlay = document.getElementById('feedbackFormOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.getElementById('feedbackForm')?.reset();
        this._resetStars();
    },

    _setupStars() {
        const stars = document.querySelectorAll('.rating-star');
        const ratingInput = document.getElementById('feedbackRating');

        stars.forEach(star => {
            star.addEventListener('mouseenter', function() {
                const value = parseInt(this.dataset.value);
                stars.forEach(s => {
                    const val = parseInt(s.dataset.value);
                    if (val <= value) {
                        s.textContent = '★';
                        s.style.color = '#ffd700';
                    } else {
                        s.textContent = '☆';
                        s.style.color = 'var(--text-muted)';
                    }
                });
            });

            star.addEventListener('mouseleave', function() {
                const currentRating = parseInt(ratingInput.value);
                stars.forEach(s => {
                    const val = parseInt(s.dataset.value);
                    if (currentRating > 0 && val <= currentRating) {
                        s.textContent = '★';
                        s.style.color = '#ffd700';
                    } else {
                        s.textContent = '☆';
                        s.style.color = 'var(--text-muted)';
                    }
                });
            });

            star.addEventListener('click', function() {
                const value = parseInt(this.dataset.value);
                ratingInput.value = value;
                
                stars.forEach(s => {
                    const val = parseInt(s.dataset.value);
                    if (val <= value) {
                        s.classList.add('active');
                        s.textContent = '★';
                        s.style.color = '#ffd700';
                    } else {
                        s.classList.remove('active');
                        s.textContent = '☆';
                        s.style.color = 'var(--text-muted)';
                    }
                });
            });
        });
    },

    _resetStars() {
        const stars = document.querySelectorAll('.rating-star');
        const ratingInput = document.getElementById('feedbackRating');
        if (ratingInput) ratingInput.value = '0';
        
        stars.forEach(star => {
            star.classList.remove('active');
            star.textContent = '☆';
            star.style.color = 'var(--text-muted)';
        });
    },

    _handleSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('feedbackName')?.value.trim();
        const email = document.getElementById('feedbackEmail')?.value.trim();
        const feedback = document.getElementById('feedbackText')?.value.trim();
        const recommendation = document.getElementById('feedbackRecommendation')?.value;
        const rating = parseInt(document.getElementById('feedbackRating')?.value || '0');

        // Валидация
        if (!name) {
            Toast.show('❌ Пожалуйста, введите ваше имя', 'warning');
            return;
        }

        if (!feedback) {
            Toast.show('❌ Пожалуйста, напишите ваш отзыв', 'warning');
            return;
        }

        if (rating === 0) {
            Toast.show('❌ Пожалуйста, поставьте оценку', 'warning');
            return;
        }

        // Отправка
        const data = { name, email, feedback, recommendation, rating };
        this._sendData(data);
    },

    _sendData(data) {
        const url = this.GOOGLE_SCRIPT_URL;
        
        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(() => {
            Toast.show('✅ Спасибо за ваш отзыв! ❤️', 'success');
            this.closeForm();
        })
        .catch(() => {
            // При no-cors мы не можем получить ответ, но данные отправляются
            Toast.show('✅ Спасибо за ваш отзыв! ❤️', 'success');
            this.closeForm();
        });
    }
};
