requireAuth();
applyTopbar();

function highlightSettings() {
    var theme = localStorage.getItem("stax_theme") || "light";
    var navMode = localStorage.getItem("stax_nav_mode") || "side";

    var btnLight = document.getElementById("themeLight");
    var btnDark = document.getElementById("themeDark");
    var btnTop = document.getElementById("navTop");
    var btnSide = document.getElementById("navSide");

    if (btnLight) {
        btnLight.classList.toggle("btn-warning", theme === "light");
        btnLight.classList.toggle("btn-outline-secondary", theme !== "light");
    }
    if (btnDark) {
        btnDark.classList.toggle("btn-warning", theme === "dark");
        btnDark.classList.toggle("btn-outline-secondary", theme !== "dark");
    }
    if (btnTop) {
        btnTop.classList.toggle("btn-warning", navMode === "top");
        btnTop.classList.toggle("btn-outline-secondary", navMode !== "top");
    }
    if (btnSide) {
        btnSide.classList.toggle("btn-warning", navMode === "side");
        btnSide.classList.toggle("btn-outline-secondary", navMode !== "side");
    }
}

window.setTheme = function (val) {
    document.documentElement.setAttribute("data-bs-theme", val);
    localStorage.setItem("stax_theme", val);
    applyTopbar(true);
    highlightSettings();
};

window.setNavMode = function (val) {
    localStorage.setItem("stax_nav_mode", val);
    applyTopbar(true);
    highlightSettings();
};

highlightSettings();
refreshIcons();

// Смена пароля
(function () {
    var btn = document.getElementById("btnChangePassword");
    if (!btn) return;

    btn.addEventListener("click", function () {
        var status = document.getElementById("pwdStatus");
        status.textContent = "";
        status.className = "mt-2";

        var curPwd = document.getElementById("curPassword").value;
        var newPwd = document.getElementById("newPassword").value;
        var newPwd2 = document.getElementById("newPassword2").value;

        if (!curPwd) {
            status.textContent = "Введите текущий пароль";
            status.className = "mt-2 text-danger";
            return;
        }
        if (newPwd !== newPwd2) {
            status.textContent = "Новые пароли не совпадают";
            status.className = "mt-2 text-danger";
            return;
        }
        if (newPwd.length < 8) {
            status.textContent = "Новый пароль минимум 8 символов";
            status.className = "mt-2 text-danger";
            return;
        }

        btn.disabled = true;
        status.textContent = "Сохранение...";
        status.className = "mt-2 text-info";

        api("/api/auth/change-password", {
            method: "PUT",
            body: { currentPassword: curPwd, newPassword: newPwd }
        })
        .then(function (res) {
            status.textContent = res.message || "Пароль изменён!";
            status.className = "mt-2 text-success fw-semibold";
            document.getElementById("curPassword").value = "";
            document.getElementById("newPassword").value = "";
            document.getElementById("newPassword2").value = "";
        })
        .catch(function (err) {
            status.textContent = err.message || "Ошибка";
            status.className = "mt-2 text-danger";
        })
        .finally(function () {
            btn.disabled = false;
        });
    });
})();

// Admin seed demo
if (typeof applyAdminOnly === "function") applyAdminOnly();

function seedRequest(method) {
    var token = localStorage.getItem("stax_token");
    return fetch("/api/seed-demo", {
        method: method,
        headers: { "Authorization": "Bearer " + token }
    }).then(function (res) {
        return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.message || "HTTP " + res.status);
            return data;
        });
    });
}

window.seedDemo = function () {
    var btn = document.getElementById("btnSeed");
    var status = document.getElementById("seedStatus");
    if (btn) btn.disabled = true;
    if (status) { status.textContent = "Генерация данных..."; status.className = "mt-2 text-info"; }

    seedRequest("POST")
        .then(function (data) {
            if (status) { status.textContent = data.message || "Готово!"; status.className = "mt-2 text-success fw-semibold"; }
        })
        .catch(function (err) {
            if (status) { status.textContent = err.message; status.className = "mt-2 text-danger"; }
        })
        .finally(function () {
            if (btn) btn.disabled = false;
        });
};

window.clearDemo = function () {
    showConfirm("Удалить все тестовые данные? Это действие необратимо.").then(function (ok) {
        if (!ok) return;
        var btn = document.getElementById("btnClearSeed");
        var status = document.getElementById("seedStatus");
        if (btn) btn.disabled = true;
        if (status) { status.textContent = "Удаление данных..."; status.className = "mt-2 text-info"; }

        seedRequest("DELETE")
            .then(function (data) {
                if (status) { status.textContent = data.message || "Готово!"; status.className = "mt-2 text-success fw-semibold"; }
            })
            .catch(function (err) {
                if (status) { status.textContent = err.message; status.className = "mt-2 text-danger"; }
            })
            .finally(function () {
                if (btn) btn.disabled = false;
            });
    });
};
