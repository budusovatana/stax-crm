// wwwroot/js/payment-form.js
requireAuth(); applyTopbar();

const _qs = new URLSearchParams(location.search);
const _returnUrl = _qs.get("return");

if (_returnUrl) {
    const backBtn = document.getElementById("btnBack");
    if (backBtn) backBtn.href = decodeURIComponent(_returnUrl);
}

document.getElementById("btnSave").addEventListener("click", save);

async function load() {
    const inv = await api("/api/investments");
    const sel = document.getElementById("investmentId");

    sel.innerHTML = (inv || [])
        .map(x => `<option value="${x.id}">${x.investor} — ${x.car}</option>`)
        .join("");

    document.getElementById("paidAt").value = new Date().toISOString().slice(0, 10);
}

// Маска суммы
(function() {
    const amountInput = document.getElementById("amount");
    amountInput.addEventListener("input", () => {
        let digits = amountInput.value.replace(/\D/g, "");
        amountInput.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    });
})();

load();

async function save() {
    const err = document.getElementById("error");
    err.textContent = "";

    try {
        const investmentIdEl = document.getElementById("investmentId");
        const paidAtEl = document.getElementById("paidAt");
        const amountEl = document.getElementById("amount");
        const contractNoEl = document.getElementById("contractNo");
        const commentEl = document.getElementById("comment");

        const invId = Number(investmentIdEl.value);
        const amt = Number(amountEl.value.replace(/\s/g, ""));

        if (!invId) throw new Error("Выбери инвестицию");
        if (!paidAtEl.value) throw new Error("Укажи дату");
        if (!amt || amt <= 0) throw new Error("Сумма должна быть больше 0");

        const body = {
            investmentId: invId,
            paidAt: paidAtEl.value,
            amount: amt,
            contractNo: contractNoEl.value.trim() || null,
            comment: commentEl.value.trim() || null
        };

        await api("/api/payments", { method: "POST", body });
        location.href = _returnUrl ? decodeURIComponent(_returnUrl) : "/pages/payments.html";
    } catch (e) {
        err.textContent = e.message || String(e);
    }
}