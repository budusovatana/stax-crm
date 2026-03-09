requireAuth(); applyTopbar();

// Проверка роли — только ADMIN
if (localStorage.getItem("stax_role") !== "ADMIN") {
    location.href = "/pages/dashboard.html";
}

const qEl = document.getElementById("q");
const tb = document.getElementById("tbody");
const err = document.getElementById("error");
const currentUsername = localStorage.getItem("stax_username") || "";

function debounce(fn, ms) {
    ms = ms || 250;
    var t = null;
    return function () {
        var args = arguments;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
}

function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.toLocaleDateString("ru-RU");
}

function createBadge(text, cls) {
    var span = document.createElement("span");
    span.className = "badge " + cls;
    span.textContent = text;
    return span;
}

function createBtn(text, cls, iconName) {
    var btn = document.createElement("button");
    btn.className = cls;
    if (iconName) {
        var ico = document.createElement("i");
        ico.setAttribute("data-lucide", iconName);
        btn.appendChild(ico);
    }
    btn.appendChild(document.createTextNode(" " + text));
    return btn;
}

function createLink(text, href, cls, iconName) {
    var a = document.createElement("a");
    a.className = cls;
    a.href = href;
    if (iconName) {
        var ico = document.createElement("i");
        ico.setAttribute("data-lucide", iconName);
        a.appendChild(ico);
    }
    a.appendChild(document.createTextNode(" " + text));
    return a;
}

async function load() {
    err.textContent = "";
    var q = (qEl.value || "").trim();

    try {
        var list = await api("/api/users" + (q ? ("?q=" + encodeURIComponent(q)) : ""));
        tb.textContent = "";

        for (var idx = 0; idx < list.length; idx++) {
            var x = list[idx];
            var isAdmin = x.role === "ADMIN";
            var isSelf = (x.username || "") === currentUsername;

            var tr = document.createElement("tr");

            // Логин
            var tdLogin = document.createElement("td");
            tdLogin.textContent = x.username || "";
            tr.appendChild(tdLogin);

            // Имя
            var tdName = document.createElement("td");
            tdName.textContent = x.displayName || "—";
            tr.appendChild(tdName);

            // Роль
            var tdRole = document.createElement("td");
            tdRole.appendChild(createBadge(
                isAdmin ? "Администратор" : "Ассистент",
                isAdmin ? "badge-role-admin" : "badge-role-assistant"
            ));
            tr.appendChild(tdRole);

            // Статус
            var tdStatus = document.createElement("td");
            tdStatus.appendChild(createBadge(
                x.isActive ? "Активен" : "Заблокирован",
                x.isActive ? "badge-active" : "badge-inactive"
            ));
            tr.appendChild(tdStatus);

            // Дата создания
            var tdDate = document.createElement("td");
            tdDate.textContent = formatDate(x.createdAt);
            tr.appendChild(tdDate);

            // Действия
            var tdActions = document.createElement("td");
            tdActions.className = "actions";

            tdActions.appendChild(createLink("Редактировать", "/pages/user-form.html?id=" + x.id, "btn btn-sm btn-outline-secondary", "pencil"));

            if (!isSelf) {
                var delBtn = createBtn("Удалить", "btn btn-sm btn-danger", "trash-2");
                delBtn.setAttribute("data-del", x.id);
                tdActions.appendChild(delBtn);
            }

            tr.appendChild(tdActions);
            tb.appendChild(tr);
        }

        tb.querySelectorAll("[data-del]").forEach(function (btn) {
            btn.addEventListener("click", function () { del(btn.getAttribute("data-del")); });
        });

        refreshIcons();
        animateNewRows();
    } catch (e) {
        err.textContent = e.message || "Ошибка загрузки";
    }
}

async function del(id) {
    if (!await showConfirm("Удалить пользователя?")) return;
    try {
        await api("/api/users/" + id, { method: "DELETE" });
        await load();
    } catch (e) {
        await showAlert(e.message || "Ошибка удаления");
    }
}

qEl.addEventListener("input", debounce(load, 250));
qEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") load();
});

load();
