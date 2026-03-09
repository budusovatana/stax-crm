// wwwroot/js/api.js
(function () {
    const LS_TOKEN = "stax_token";

    function getToken() {
        return localStorage.getItem(LS_TOKEN) || "";
    }

    // Маппинг HTTP-кодов на понятные сообщения
    function friendlyHttpMessage(status) {
        switch (status) {
            case 401: return "Сессия истекла. Войдите заново.";
            case 403: return "У вас недостаточно прав";
            case 404: return "Не найдено";
            case 500: return "Внутренняя ошибка сервера";
            default: return null;
        }
    }

    window.api = async function (url, opts = {}) {
        const method = (opts.method || "GET").toUpperCase();
        const headers = opts.headers ? { ...opts.headers } : {};

        const token = getToken();
        if (token) headers["Authorization"] = "Bearer " + token;

        let body = opts.body;

        // multipart/form-data: Content-Type НЕ ставим вручную
        if (opts.isForm) {
            // body должен быть FormData
        } else if (body !== undefined && body !== null) {
            if (typeof body === "object" && !(body instanceof FormData)) {
                if (!headers["Content-Type"]) {
                    headers["Content-Type"] = "application/json; charset=utf-8";
                }
                body = JSON.stringify(body);
            }
        }

        const res = await fetch(url, { method, headers, body });

        // No Content
        if (res.status === 204) return null;

        // Редирект на логин при 401
        if (res.status === 401) {
            localStorage.removeItem(LS_TOKEN);
            location.href = "/pages/login.html";
            throw new Error(friendlyHttpMessage(401));
        }

        // Пытаемся прочитать ответ
        let data = null;
        const ct = (res.headers.get("content-type") || "").toLowerCase();

        if (ct.includes("application/json")) {
            try { data = await res.json(); } catch { data = null; }
        } else {
            const text = await res.text();
            data = { message: text };
        }

        if (!res.ok) {
            // Сначала пробуем сообщение из ответа
            let msg = (data && data.message) ? data.message : null;

            if (data && data.errors) {
                const parts = [];
                for (const k of Object.keys(data.errors)) {
                    const arr = data.errors[k];
                    if (Array.isArray(arr)) parts.push(`${k}: ${arr.join(", ")}`);
                }
                if (parts.length) msg = parts.join(" | ");
            }

            // Если нет сообщения из ответа — используем дружественное
            if (!msg) msg = friendlyHttpMessage(res.status) || ("Ошибка " + res.status);

            throw new Error(msg);
        }

        return data;
    };

    window.fmtMoney = function (v) {
        if (v === null || v === undefined || isNaN(Number(v))) return "0.00";
        return Number(v).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    window.fmtDate = function (v) {
        if (!v) return "";
        const s = String(v);
        return s.length >= 10 ? s.substring(0, 10) : s;
    };
    window.refreshIcons = function () {
        if (window.lucide) lucide.createIcons();
    };
})();
