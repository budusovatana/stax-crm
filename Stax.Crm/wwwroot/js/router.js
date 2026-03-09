// router.js — SPA-роутер для бесшовных переходов между разделами
(function () {
    var animate = Motion.animate;

    // Скрипты-библиотеки, которые уже загружены и не нужно перезагружать
    var sharedScripts = [
        "bootstrap.bundle.min.js", "lucide.min.js", "motion.js",
        "animations.js", "auth.js", "api.js", "ui-maps.js",
        "modal.js", "topbar.js", "router.js"
    ];

    // Кэш загруженных скриптов
    var loadedScripts = {};

    // Помечаем все скрипты на текущей странице как загруженные
    document.querySelectorAll("script[src]").forEach(function (s) {
        loadedScripts[s.getAttribute("src")] = true;
    });

    function isInternalLink(href) {
        if (!href) return false;
        // Поддержка /pages/xxx.html и /pages/xxx.html?param=val
        var path = href.split("?")[0];
        if (path.startsWith("/pages/") && path.endsWith(".html")) return true;
        return false;
    }

    function getContentContainer() {
        return document.querySelector(".container-fluid.px-4.py-3");
    }

    // Парсинг HTML и извлечение контента и скриптов
    // Используем DOMParser — безопасный парсинг без выполнения скриптов
    function extractPageData(html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, "text/html");

        var content = doc.querySelector(".container-fluid.px-4.py-3");
        var title = doc.querySelector("title");
        var scripts = doc.querySelectorAll("script[src]");

        // Найти page-specific скрипты (не shared)
        var newScripts = [];
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].getAttribute("src");
            var fileName = src.split("/").pop();
            var isShared = false;
            for (var j = 0; j < sharedScripts.length; j++) {
                if (fileName === sharedScripts[j]) { isShared = true; break; }
            }
            if (!isShared) {
                newScripts.push(src);
            }
        }

        return {
            contentNode: content,
            title: title ? title.textContent : "",
            scripts: newScripts
        };
    }

    function loadScript(src) {
        // Загружаем текст скрипта и выполняем в изолированном scope через IIFE
        // Это предотвращает ошибку "has already been declared" при const/let
        return fetch(src + "?_=" + Date.now())
            .then(function (r) { return r.text(); })
            .then(function (code) {
                // Оборачиваем в IIFE для изоляции const/let
                var wrapped = "(function(){\n" + code + "\n})();";
                var script = document.createElement("script");
                script.textContent = wrapped;
                script.setAttribute("data-page-script", "true");

                // Удаляем старый page-скрипт
                var old = document.querySelector("script[data-page-script]");
                if (old) old.remove();

                document.body.appendChild(script);
            });
    }

    function navigateTo(href, pushState) {
        var container = getContentContainer();
        if (!container) {
            location.href = href;
            return;
        }

        // Анимация выхода
        animate(container, { opacity: [1, 0], y: [0, -12] }, { duration: 0.15, ease: "ease-in" })
            .then(function () {
                return fetch(href);
            })
            .then(function (res) {
                if (!res.ok) throw new Error(res.status);
                return res.text();
            })
            .then(function (html) {
                var data = extractPageData(html);

                // Безопасная замена контента: клонируем из распарсенного DOM
                container.textContent = "";
                if (data.contentNode) {
                    while (data.contentNode.firstChild) {
                        container.appendChild(
                            document.adoptNode(data.contentNode.firstChild)
                        );
                    }
                }

                // Обновляем заголовок
                if (data.title) document.title = data.title;

                // Обновляем URL
                if (pushState !== false) {
                    history.pushState({ href: href }, data.title, href);
                }

                // Обновляем активную ссылку в навбаре
                setActiveNavLink();

                // Обновляем иконки Lucide
                refreshIcons();

                // Загружаем page-specific скрипты
                var chain = Promise.resolve();
                for (var i = 0; i < data.scripts.length; i++) {
                    (function (src) {
                        var fileName = src.split("/").pop();
                        var isPageScript = true;
                        for (var j = 0; j < sharedScripts.length; j++) {
                            if (fileName === sharedScripts[j]) { isPageScript = false; break; }
                        }

                        if (!isPageScript && loadedScripts[src]) {
                            return;
                        }

                        chain = chain.then(function () {
                            if (!isPageScript) {
                                loadedScripts[src] = true;
                            }
                            return loadScript(src);
                        });
                    })(data.scripts[i]);
                }

                return chain;
            })
            .then(function () {
                // Прокрутка наверх при переходе
                window.scrollTo({ top: 0, behavior: "instant" });

                // Анимация входа
                container.style.opacity = "0";
                animate(container, { opacity: [0, 1], y: [18, 0] }, { duration: 0.3, ease: "ease-out" });

                // Анимация элементов внутри
                if (window.animateCards) window.animateCards();
                if (window.animateNewRows) window.animateNewRows();
                if (window.animateFormFields) window.animateFormFields();
                if (window.animateKvItems) window.animateKvItems();
                if (window.animateDashCards) window.animateDashCards();
            })
            .catch(function () {
                // При ошибке — обычный переход
                location.href = href;
            });
    }

    // Перехват кликов по внутренним ссылкам
    document.addEventListener("click", function (e) {
        var link = e.target.closest("a[href]");
        if (!link) return;

        var href = link.getAttribute("href");
        if (!isInternalLink(href)) return;

        // Не перехватываем Ctrl/Cmd клик (новая вкладка)
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;

        e.preventDefault();

        // Не переходим если уже на этой странице
        var currentFull = location.pathname + location.search;
        if (currentFull === href) return;

        // Close mobile sidebar on navigation
        if (window.closeMobileSidebar) window.closeMobileSidebar();

        navigateTo(href, true);
    });

    // Обработка кнопки "Назад" / "Вперёд"
    window.addEventListener("popstate", function () {
        var href = location.pathname + location.search;
        if (isInternalLink(location.pathname)) {
            navigateTo(href, false);
        }
    });

    // Сохраняем текущее состояние
    history.replaceState({ href: location.pathname + location.search }, document.title);
})();
