// auth.js
(function () {
    // Инициализация темы из localStorage
    const savedTheme = localStorage.getItem("stax_theme") || "light";
    document.documentElement.setAttribute("data-bs-theme", savedTheme);

    const LS_TOKEN = "stax_token";
    const LS_ROLE = "stax_role";
    const LS_USERNAME = "stax_username";

    window.logout = function () {
        localStorage.removeItem(LS_TOKEN);
        localStorage.removeItem(LS_ROLE);
        localStorage.removeItem(LS_USERNAME);
        location.href = "/pages/login.html";
    };

    window.requireAuth = function () {
        const token = localStorage.getItem(LS_TOKEN);
        if (!token) location.href = "/pages/login.html";
    };

    // Глобальный обработчик toggle-password
    document.addEventListener("click", function (e) {
        var toggle = e.target.closest(".toggle-password");
        if (!toggle) return;
        var wrap = toggle.closest(".password-wrap") || toggle.closest(".auth-field");
        if (!wrap) return;
        var input = wrap.querySelector("input");
        if (!input) return;
        input.type = input.type === "password" ? "text" : "password";
        var iconName = input.type === "password" ? "eye" : "eye-off";
        var icon = document.createElement("i");
        icon.setAttribute("data-lucide", iconName);
        toggle.textContent = "";
        toggle.appendChild(icon);
        refreshIcons();
    });
})();
