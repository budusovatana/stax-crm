requireAuth();
applyTopbar();

// Проверка роли — только ADMIN
if (localStorage.getItem("stax_role") !== "ADMIN") {
    location.href = "/pages/dashboard.html";
}

const qs = new URLSearchParams(location.search);
const idStr = qs.get("id");
const id = idStr ? Number(idStr) : 0;

const elErr = document.getElementById("error");
function showError(msg) {
    elErr.style.display = msg ? "block" : "none";
    elErr.textContent = msg || "";
}

async function load() {
    showError("");

    if (!id) {
        document.getElementById("h").textContent = "Добавление пользователя";
        document.getElementById("hint").textContent = "";
        return;
    }

    document.getElementById("h").textContent = "Редактирование пользователя";
    document.getElementById("password").placeholder = "Оставьте пустым, чтобы не менять";

    try {
        const data = await api(`/api/users/${id}`);

        document.getElementById("username").value = data.username || "";
        document.getElementById("displayName").value = data.displayName || "";
        document.getElementById("role").value = data.role || "ASSISTANT";
        document.getElementById("isActive").checked = data.isActive !== false;
    } catch (e) {
        showError(e.message || "Не удалось загрузить пользователя");
    }
}

async function save() {
    showError("");

    const username = (document.getElementById("username").value || "").trim();
    const displayName = (document.getElementById("displayName").value || "").trim() || null;
    const password = (document.getElementById("password").value || "");
    const role = document.getElementById("role").value;
    const isActive = document.getElementById("isActive").checked;

    if (username.length < 3) {
        showError("Логин минимум 3 символа");
        return;
    }

    if (!id && !password) {
        showError("Пароль обязателен");
        return;
    }

    const payload = {
        username: username,
        displayName: displayName,
        password: password || null,
        role: role,
        isActive: isActive
    };

    try {
        if (!id) {
            const res = await api("/api/users", { method: "POST", body: payload });
            location.href = "/pages/users.html";
        } else {
            await api(`/api/users/${id}`, { method: "PUT", body: payload });
            location.href = "/pages/users.html";
        }
    } catch (e) {
        showError(e.message || "Ошибка сохранения");
    }
}

document.getElementById("btnSave").addEventListener("click", save);

load();
