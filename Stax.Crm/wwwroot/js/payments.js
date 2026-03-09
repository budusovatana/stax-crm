// wwwroot/js/payments.js
requireAuth(); applyTopbar();

const investorFilter = document.getElementById("investorFilter");

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

async function del(id) {
    if (!await showConfirm("Удалить выплату?")) return;
    await api("/api/payments/" + id, { method: "DELETE" });
    load();
}

async function load() {
    const err = document.getElementById("error");
    const tbody = document.getElementById("tbody");
    err.textContent = "";

    try {
        const q = investorFilter.value;
        const all = await api("/api/payments");
        const list = !q ? all : all.filter(x => (x.investor || "") === q);
        tbody.innerHTML = "";

        for (const x of list) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${x.investor || ""}</td>
        <td>${x.car || ""}</td>
        <td>${fmtDate(x.paidAt)}</td>
        <td>${fmtMoney(x.amount)} ₽</td>
        <td class="actions">
          <button data-admin-only class="btn btn-sm btn-danger" data-del="${x.id}"><i data-lucide="trash-2"></i> Удалить</button>
        </td>`;
            tbody.appendChild(tr);
        }

        tbody.querySelectorAll("[data-del]").forEach(b => {
            b.addEventListener("click", () => del(b.getAttribute("data-del")));
        });

        applyTopbar();
        refreshIcons();
        animateNewRows();
    } catch (e) {
        err.textContent = e.message || String(e);
    }
}

load();