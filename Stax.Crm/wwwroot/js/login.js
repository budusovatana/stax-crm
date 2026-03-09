// Анимация карточки входа
(function () {
    var card = document.querySelector(".auth-card");
    if (card && window.Motion) {
        card.style.opacity = "0";
        card.style.transform = "translateY(30px) scale(0.96)";
        Motion.animate(card, { opacity: 1, y: 0, scale: 1 }, { duration: 0.6, easing: "ease-out" });
    }

    var fields = document.querySelectorAll(".auth-field, .auth-btn, .auth-divider");
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

function restoreLoginBtn(btn) {
    btn.textContent = "";
    var ico = document.createElement("i");
    ico.setAttribute("data-lucide", "log-in");
    btn.appendChild(ico);
    btn.appendChild(document.createTextNode(" Войти"));
    refreshIcons();
}

document.getElementById("btnLogin").addEventListener("click", login);
document.getElementById("password").addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });
document.getElementById("username").addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });

async function login() {
    var err = document.getElementById("error");
    err.textContent = "";

    var btn = document.getElementById("btnLogin");
    btn.disabled = true;
    btn.textContent = "Вход...";

    try {
        var username = document.getElementById("username").value.trim();
        var password = document.getElementById("password").value;
        var res = await api("/api/auth/login", { method: "POST", body: { username: username, password: password } });

        localStorage.setItem("stax_token", res.token);
        localStorage.setItem("stax_role", res.role);
        localStorage.setItem("stax_username", res.username);
        if (res.displayName) localStorage.setItem("stax_displayname", res.displayName);
        else localStorage.removeItem("stax_displayname");

        var card = document.querySelector(".auth-card");
        if (card && window.Motion) {
            Motion.animate(card, { opacity: 0, y: -20, scale: 0.96 }, { duration: 0.3, easing: "ease-in" });
            setTimeout(function () { location.href = "/pages/dashboard.html"; }, 300);
        } else {
            location.href = "/pages/dashboard.html";
        }
    } catch (e) {
        btn.disabled = false;
        restoreLoginBtn(btn);
        err.textContent = e.message || "Ошибка входа";

        var card = document.querySelector(".auth-card");
        if (card && window.Motion) {
            Motion.animate(card,
                { x: [0, -8, 8, -6, 6, -3, 3, 0] },
                { duration: 0.5, easing: "ease-out" }
            );
        }
    }
}
