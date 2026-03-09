requireAuth(); applyTopbar();

const qEl = document.getElementById("q");
const tb = document.getElementById("tbody");
const err = document.getElementById("error");
const investorFilter = document.getElementById("investorFilter");
const statusFilter = document.getElementById("statusFilter");

// Загрузка списка инвесторов для фильтра
async function loadInvestors() {
    try {
        const investors = await api("/api/investors");
        for (const inv of investors) {
            const opt = document.createElement("option");
            opt.value = inv.fullName || "";
            opt.textContent = inv.fullName || "";
            investorFilter.appendChild(opt);
        }
    } catch (e) { /* тихо */ }
}
loadInvestors();

investorFilter.addEventListener("change", () => load());
statusFilter.addEventListener("change", () => load());

function debounce(fn, ms = 250) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
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

// русификация статусов (на всякий случай прямо тут)
function ruStatus(s) {
    switch ((s || "").toUpperCase()) {
        case "ACTIVE": return "Активная";
        case "CLOSED": return "Закрыта";
        case "CANCELED": return "Отменена";
        default: return s || "";
    }
}

async function load() {
    err.textContent = "";
    const q = norm(qEl.value).trim();

    try {
        // берём все, фильтруем на клиенте (не зависит от поддержки ?q= бэком)
        const list = await api("/api/investments");

        const invFilter = investorFilter.value;
        const stFilter = statusFilter.value;

        const filtered = list.filter(x => {
            if (q) {
                const hay = norm(x.investor) + " " + norm(x.car);
                if (!hay.includes(q)) return false;
            }
            if (invFilter && (x.investor || "") !== invFilter) return false;
            if (stFilter && (x.status || "").toUpperCase() !== stFilter) return false;
            return true;
        });

        tb.innerHTML = "";

        for (const x of filtered) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${x.investor || ""}</td>
        <td>${x.car || ""}</td>
        <td>${fmtMoney(x.principalAmount)}</td>
        <td>${ruStatus(x.status)}</td>
        <td class="actions">
          <a class="btn btn-sm btn-warning" href="/pages/investment-view.html?id=${x.id}"><i data-lucide="eye"></i> Открыть</a>
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
        err.textContent = e.message || "Ошибка загрузки инвестиций";
    }
}

async function del(id) {
    if (!await showConfirm("Удалить инвестицию?")) return;
    try {
        await api("/api/investments/" + id, { method: "DELETE" });
        await load();
    } catch (e) {
        await showAlert(e.message || "Ошибка удаления");
    }
}

qEl.addEventListener("input", debounce(load, 250));
qEl.addEventListener("keydown", (e) => { if (e.key === "Enter") load(); });

load();
