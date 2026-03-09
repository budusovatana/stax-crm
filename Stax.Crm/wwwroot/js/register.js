// Анимация карточки регистрации
(function () {
    var card = document.querySelector(".auth-card");
    if (card && window.Motion) {
        card.style.opacity = "0";
        card.style.transform = "translateY(30px) scale(0.96)";
        Motion.animate(card, { opacity: 1, y: 0, scale: 1 }, { duration: 0.6, easing: "ease-out" });
    }

    var fields = document.querySelectorAll(".auth-field, .auth-pwd-strength, .auth-btn, .auth-divider");
    for (var i = 0; i < fields.length; i++) {
        (function (el, idx) {
            el.style.opacity = "0";
            el.style.transform = "translateY(16px)";
            setTimeout(function () {
                if (window.Motion) {
                    Motion.animate(el, { opacity: 1, y: 0 }, { duration: 0.4, easing: "ease-out" });
                } else {
                    el.style.opacity = "1";
                    el.style.transform = "none";
                }
            }, 300 + idx * 80);
        })(fields[i], i);
    }
})();

// Индикатор сложности пароля
var pwdInput = document.getElementById("password");
var pwdFill = document.getElementById("pwdFill");
var pwdLabel = document.getElementById("pwdLabel");

if (pwdInput && pwdFill) {
    pwdInput.addEventListener("input", function () {
        var pwd = pwdInput.value;
        var score = 0;
        if (pwd.length >= 4) score++;
        if (pwd.length >= 8) score++;
        if (/[A-Za-zА-Яа-я]/.test(pwd) && /\d/.test(pwd)) score++;
        if (/[^A-Za-zА-Яа-я0-9]/.test(pwd)) score++;

        var pct = (score / 4) * 100;
        var color = "#ef4444";
        var text = "Слабый";
        if (score >= 3) { color = "#f59e0b"; text = "Средний"; }
        if (score >= 4) { color = "#10b981"; text = "Надёжный"; }
        if (!pwd) { pct = 0; text = ""; }

        pwdFill.style.width = pct + "%";
        pwdFill.style.background = color;
        pwdLabel.textContent = text;
        pwdLabel.style.color = color;
    });
}

function restoreRegisterBtn(btn) {
    btn.textContent = "";
    var ico = document.createElement("i");
    ico.setAttribute("data-lucide", "user-plus");
    btn.appendChild(ico);
    btn.appendChild(document.createTextNode(" Зарегистрироваться"));
    refreshIcons();
}

document.getElementById("btnRegister").addEventListener("click", register);
document.getElementById("password2").addEventListener("keydown", function (e) { if (e.key === "Enter") register(); });

function isStrongPassword(pwd) {
    if (!pwd || pwd.length < 8) return false;
    var hasLetter = /[A-Za-zА-Яа-я]/.test(pwd);
    var hasDigit = /\d/.test(pwd);
    var hasSymbol = /[^A-Za-zА-Яа-я0-9]/.test(pwd);
    return hasLetter && hasDigit && hasSymbol;
}

function shakeCard() {
    var card = document.querySelector(".auth-card");
    if (card && window.Motion) {
        Motion.animate(card,
            { x: [0, -8, 8, -6, 6, -3, 3, 0] },
            { duration: 0.5, easing: "ease-out" }
        );
    }
}

async function register() {
    var err = document.getElementById("error");
    err.textContent = "";

    var username = (document.getElementById("username").value || "").trim();
    var password = document.getElementById("password").value || "";
    var password2 = document.getElementById("password2").value || "";

    if (username.length < 3) {
        err.textContent = "Логин минимум 3 символа";
        shakeCard();
        return;
    }
    if (password !== password2) {
        err.textContent = "Пароли не совпадают";
        shakeCard();
        return;
    }
    if (!isStrongPassword(password)) {
        err.textContent = "Пароль: минимум 8 символов, буквы + цифры + спецсимвол";
        shakeCard();
        return;
    }

    var btn = document.getElementById("btnRegister");
    btn.disabled = true;
    btn.textContent = "Регистрация...";

    try {
        await api("/api/auth/register", { method: "POST", body: { username: username, password: password } });

        var card = document.querySelector(".auth-card");
        if (card && window.Motion) {
            Motion.animate(card, { opacity: 0, y: -20, scale: 0.96 }, { duration: 0.3, easing: "ease-in" });
        }

        if (typeof showAlert === "function") {
            setTimeout(function () {
                showAlert("Аккаунт создан! Теперь войдите в систему.").then(function () {
                    location.href = "/pages/login.html";
                });
            }, 300);
        } else {
            setTimeout(function () { location.href = "/pages/login.html"; }, 400);
        }
    } catch (e) {
        btn.disabled = false;
        restoreRegisterBtn(btn);
        err.textContent = e.message || "Ошибка регистрации";
        shakeCard();
    }
}
