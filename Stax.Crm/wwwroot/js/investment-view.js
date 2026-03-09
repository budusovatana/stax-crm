requireAuth(); applyTopbar();
const qs = new URLSearchParams(location.search);
const id = qs.get("id");
const ret = qs.get("return");

function goBack() {
    if (ret) location.href = decodeURIComponent(ret);
    else location.href = "/pages/investments.html";
}

document.getElementById("backBtn").addEventListener("click", (e) => {
    e.preventDefault();
    goBack();
});

async function load() {
    const err = document.getElementById("error");
    err.textContent = "";

    try {
        const x = await api("/api/investments/" + id);

        investor.textContent = x.investor;
        car.textContent = x.car;
        principal.textContent = fmtMoney(x.principalAmount) + " ₽";
        rate.textContent = (x.interestRatePercent ?? 0) + " %";
        startDate.textContent = fmtDate(x.startDate);
        term.textContent = x.termMonths + " мес.";
        ptype.textContent = mapValue("payoutType", x.payoutType);
        total.textContent = fmtMoney(x.totalReturnAmount) + " ₽";

        editBtn.href = "/pages/investment-form.html?id=" + id + (ret ? "&return=" + encodeURIComponent(ret) : "");

        sched.innerHTML = "";
        for (const s of (x.schedule || [])) {
            const tr = document.createElement("tr");
            const st = (s.status || "").toUpperCase();
            let actionCell = "";
            if (st === "PAID") {
                actionCell = `<span style="color:green;"><i data-lucide="check"></i> Оплачено</span> <button data-admin-only class="btn btn-sm btn-secondary btn-cancel-pay" data-sched-id="${s.id}" data-inv-id="${x.id}"><i data-lucide="x"></i> Отменить</button>`;
            } else if (st === "PLANNED" || st === "PARTIALLY_PAID") {
                actionCell = `<button data-admin-only class="btn btn-sm btn-success btn-pay" data-sched-id="${s.id}" data-inv-id="${x.id}" data-amount="${s.plannedAmount}" data-date="${fmtDate(s.dueDate)}"><i data-lucide="banknote"></i> Сделать выплату</button>`;
            }
            tr.innerHTML = `
        <td>${s.periodNo}</td>
        <td>${fmtDate(s.dueDate)}</td>
        <td>${fmtMoney(s.plannedAmount)} ₽</td>
        <td>${mapValue("schedStatus", s.status)}</td>
        <td>${actionCell}</td>`;
            sched.appendChild(tr);
        }

        sched.querySelectorAll(".btn-pay").forEach(btn => {
            btn.addEventListener("click", async () => {
                const amt = btn.getAttribute("data-amount");
                const date = btn.getAttribute("data-date");
                const schedId = Number(btn.getAttribute("data-sched-id"));
                const invId = Number(btn.getAttribute("data-inv-id"));

                if (!await showConfirm(`Сделать выплату ${fmtMoney(amt)} ₽ за ${date}?`)) return;

                try {
                    await api("/api/payments", {
                        method: "POST",
                        body: {
                            investmentId: invId,
                            scheduleId: schedId,
                            paidAt: new Date().toISOString().slice(0, 10),
                            amount: Number(amt)
                        }
                    });
                    load();
                } catch (ex) {
                    await showAlert(ex.message || "Ошибка создания выплаты");
                }
            });
        });

        // Обработчик отмены выплаты
        sched.querySelectorAll(".btn-cancel-pay").forEach(btn => {
            btn.addEventListener("click", async () => {
                const schedId = Number(btn.getAttribute("data-sched-id"));
                if (!await showConfirm("Отменить выплату? Все платежи по этому периоду будут удалены.")) return;
                try {
                    const payments = await api(`/api/payments/by-schedule/${schedId}`);
                    for (const p of (payments || [])) {
                        await api(`/api/payments/${p.id}`, { method: "DELETE" });
                    }
                    load();
                } catch (ex) {
                    await showAlert(ex.message || "Ошибка отмены выплаты");
                }
            });
        });

        applyTopbar();
        refreshIcons();
    } catch (e) { err.textContent = e.message; }
}
load();
