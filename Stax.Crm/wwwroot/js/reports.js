requireAuth();
applyTopbar();

const elErr = document.getElementById("error");
const tb = document.getElementById("tbody");

function showError(msg) {
    elErr.style.display = msg ? "block" : "none";
    elErr.textContent = msg || "";
}

function getParams() {
    const dateFrom = document.getElementById("dateFrom").value;
    const dateTo = document.getElementById("dateTo").value;
    const investorId = document.getElementById("investorFilter").value;
    return { dateFrom, dateTo, investorId };
}

// Загрузка списка инвесторов
async function loadInvestors() {
    try {
        const list = await api("/api/investors");
        const sel = document.getElementById("investorFilter");
        for (const inv of (list || [])) {
            const opt = document.createElement("option");
            opt.value = String(inv.id);
            opt.textContent = inv.fullName;
            sel.appendChild(opt);
        }
    } catch { /* без подсказок */ }
}
loadInvestors();

let lastRows = [];

async function run() {
    showError("");
    tb.innerHTML = "";
    lastRows = [];

    const { dateFrom, dateTo, investorId } = getParams();
    if (!dateFrom || !dateTo) {
        showError("Укажи период (дата с / дата по)");
        return;
    }

    try {
        let reportUrl = `/api/reports/payments?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
        if (investorId) reportUrl += `&investorId=${encodeURIComponent(investorId)}`;
        const rows = await api(reportUrl);
        lastRows = Array.isArray(rows) ? rows : [];

        if (lastRows.length === 0) {
            tb.innerHTML = `<tr><td colspan="3" class="text-muted">Нет данных</td></tr>`;
            return;
        }

        for (const r of lastRows) {
            // ✅ API возвращает sumPayments и countPayments
            const sum = r.sumPayments ?? 0;
            const cnt = r.countPayments ?? 0;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${r.investor || "—"}</td>
                <td class="num">${fmtMoney(sum)} ₽</td>
                <td class="num">${cnt}</td>
            `;
            tb.appendChild(tr);
        }
    } catch (e) {
        showError(e.message || "Ошибка отчета");
    }
}

function downloadCsv() {
    if (!lastRows || lastRows.length === 0) {
        showError("Сначала сформируй отчет");
        return;
    }

    const lines = [];
    lines.push(["Инвестор", "Сумма выплат", "Количество выплат"].join(";"));

    for (const r of lastRows) {
        const investor = String(r.investor || "").replaceAll(";", ",");
        const sum = String(r.sumPayments ?? 0).replaceAll(";", ",");
        const cnt = String(r.countPayments ?? 0).replaceAll(";", ",");
        lines.push([investor, sum, cnt].join(";"));
    }

    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "report_payments.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

document.getElementById("btnRun").addEventListener("click", run);
document.getElementById("btnCsv").addEventListener("click", downloadCsv);

// дефолт период: текущий месяц
(function initDates() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    document.getElementById("dateFrom").value = `${y}-${m}-01`;
    document.getElementById("dateTo").value = `${y}-${m}-${String(now.getDate()).padStart(2, "0")}`;
})();

async function downloadPdf() {
    const { dateFrom, dateTo, investorId } = getParams();
    if (!dateFrom || !dateTo) {
        showError("Укажи период (дата с / дата по)");
        return;
    }

    try {
        const token = localStorage.getItem("stax_token") || "";
        let url = `/api/reports/payments.pdf?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
        if (investorId) url += `&investorId=${encodeURIComponent(investorId)}`;

        const res = await fetch(url, {
            headers: token ? { "Authorization": "Bearer " + token } : {}
        });

        if (!res.ok) {
            const t = await res.text();
            throw new Error(t || ("Ошибка PDF: " + res.status));
        }

        // имя файла из Content-Disposition (если есть)
        let filename = "payments_report.pdf";
        const cd = res.headers.get("content-disposition") || "";
        const m = cd.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
        if (m && m[1]) filename = decodeURIComponent(m[1].replace(/"/g, ""));

        const blob = await res.blob();
        const dl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = dl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(dl);
    } catch (e) {
        showError(e.message || "Ошибка скачивания PDF");
    }
}

document.getElementById("btnPdf").addEventListener("click", downloadPdf);

run();