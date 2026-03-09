requireAuth(); applyTopbar();

const qEl = document.getElementById("q");
const tb = document.getElementById("tbody");
const err = document.getElementById("error");

function debounce(fn, ms = 250) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

function ruColor(c) {
    switch ((c || "").toUpperCase()) {
        case "WHITE": return "Белый";
        case "YELLOW": return "Жёлтый";
        case "WHITE_YELLOW": return "Белый / Жёлтый";
        default: return c || "";
    }
}
function norm(s) {
    return (s || "").toString().toLowerCase();
}

function fmtMoney(v) {
    if (v === null || v === undefined) return "";
    try {
        return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(v);
    } catch {
        return v + " ₽";
    }
}

async function load() {
    err.textContent = "";
    const q = norm(qEl.value).trim();

    try {
        // берём все, фильтруем на клиенте (работает даже если бэк не поддерживает ?q=)
        const list = await api("/api/cars");

        const filtered = !q ? list : list.filter(x => {
            const hay = norm(x.makeModel) + " " + norm(x.plateNumber) + " " + norm(x.color);
            return hay.includes(q);
        });

        tb.innerHTML = "";

        for (const x of filtered) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${x.makeModel || ""}</td>
        <td>${x.plateNumber || ""}</td>
        <td>${ruColor(x.color)}</td>
        <td>${fmtMoney(x.carPrice)}</td>
        <td class="actions">
          <a class="btn btn-sm btn-warning" href="/pages/car-view.html?id=${x.id}"><i data-lucide="eye"></i> Открыть</a>
          <a class="btn btn-sm btn-outline-secondary" href="/pages/car-form.html?id=${x.id}"><i data-lucide="pencil"></i> Редактировать</a>
          <button data-admin-only class="btn btn-sm btn-danger" data-del="${x.id}"><i data-lucide="trash-2"></i> Удалить</button>
        </td>`;
            tb.appendChild(tr);
        }

        tb.querySelectorAll("[data-del]").forEach(btn => {
            btn.addEventListener("click", () => del(btn.getAttribute("data-del")));
        });

        applyTopbar();
        refreshIcons();
        animateNewRows();
    } catch (e) {
        err.textContent = e.message || "Ошибка загрузки машин";
    }
}

async function del(id) {
    try {
        const counts = await api("/api/cars/" + id + "/related-counts");
        const parts = [];
        if (counts.investments) parts.push(`инвестиций: ${counts.investments}`);
        if (counts.payments) parts.push(`выплат: ${counts.payments}`);
        if (counts.schedules) parts.push(`графиков: ${counts.schedules}`);

        let msg = "Удалить машину?";
        if (parts.length) msg += "\n\nСвязанные данные будут удалены:\n" + parts.join(", ");

        if (!await showConfirm(msg)) return;
        await api("/api/cars/" + id, { method: "DELETE" });
        await load();
    } catch (e) {
        await showAlert(e.message || "Ошибка удаления");
    }
}

qEl.addEventListener("input", debounce(load, 250));
qEl.addEventListener("keydown", (e) => { if (e.key === "Enter") load(); });

load();
