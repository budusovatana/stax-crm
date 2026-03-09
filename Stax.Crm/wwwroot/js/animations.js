// animations.js — анимации страниц через Motion
(function () {
    var animate = Motion.animate;

    // Анимация появления основного контента страницы
    function animatePageIn() {
        var page = document.querySelector(".container-fluid");
        if (!page) return;

        animate(page, { opacity: [0, 1], y: [18, 0] }, { duration: 0.35, ease: "ease-out" });
    }

    // Анимация карточек (.card) — каскадное появление
    function animateCards() {
        var cards = document.querySelectorAll(".card.shadow-sm");
        if (!cards.length) return;

        for (var i = 0; i < cards.length; i++) {
            (function (el, idx) {
                animate(el,
                    { opacity: [0, 1], y: [24, 0], scale: [0.97, 1] },
                    { duration: 0.35, delay: idx * 0.07, ease: "ease-out" }
                );
            })(cards[i], i);
        }
    }

    // Анимация dashboard-карточек метрик
    function animateDashCards() {
        var cards = document.querySelectorAll(".dash-card");
        if (!cards.length) return;

        for (var i = 0; i < cards.length; i++) {
            (function (el, idx) {
                animate(el,
                    { opacity: [0, 1], y: [30, 0], scale: [0.92, 1] },
                    { duration: 0.4, delay: 0.1 + idx * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }
                );
            })(cards[i], i);
        }
    }

    // Анимация строк таблицы — каскадное появление
    function animateTableRows() {
        var rows = document.querySelectorAll(".table tbody tr");
        if (!rows.length) return;

        var count = Math.min(rows.length, 20);
        for (var i = 0; i < count; i++) {
            (function (el, idx) {
                animate(el,
                    { opacity: [0, 1], x: [-16, 0] },
                    { duration: 0.3, delay: 0.1 + idx * 0.04, ease: "ease-out" }
                );
            })(rows[i], i);
        }
    }

    // Анимация navbar
    function animateNavbar() {
        var nav = document.querySelector(".navbar");
        if (!nav) return;

        animate(nav, { opacity: [0, 1], y: [-10, 0] }, { duration: 0.3, ease: "ease-out" });
    }

    // Анимация элементов формы
    function animateFormFields() {
        var fields = document.querySelectorAll(".form-control, .form-select");
        if (!fields.length) return;

        var count = Math.min(fields.length, 20);
        for (var i = 0; i < count; i++) {
            (function (el, idx) {
                animate(el,
                    { opacity: [0, 1], x: [-12, 0] },
                    { duration: 0.25, delay: 0.05 + idx * 0.03, ease: "ease-out" }
                );
            })(fields[i], i);
        }
    }

    // Анимация kv-grid (страницы просмотра)
    function animateKvItems() {
        var items = document.querySelectorAll(".kv-item");
        if (!items.length) return;

        for (var i = 0; i < items.length; i++) {
            (function (el, idx) {
                animate(el,
                    { opacity: [0, 1], y: [12, 0] },
                    { duration: 0.3, delay: 0.08 + idx * 0.04, ease: "ease-out" }
                );
            })(items[i], i);
        }
    }

    // Запускаем все анимации после загрузки DOM
    function runAnimations() {
        animateNavbar();
        animatePageIn();
        animateCards();
        animateDashCards();
        animateTableRows();
        animateFormFields();
        animateKvItems();
    }

    // Экспорт функций для вызова из роутера и page-скриптов
    window.animateNewRows = function () { animateTableRows(); };
    window.animateDashCards = function () { animateDashCards(); };
    window.animateCards = function () { animateCards(); };
    window.animateFormFields = function () { animateFormFields(); };
    window.animateKvItems = function () { animateKvItems(); };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            setTimeout(runAnimations, 10);
        });
    } else {
        setTimeout(runAnimations, 10);
    }
})();
