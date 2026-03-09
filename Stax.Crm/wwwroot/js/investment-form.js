requireAuth();
applyTopbar();

const qs = new URLSearchParams(location.search);
const id = qs.get("id");
const ret = qs.get("return");

// ✅ предвыбор из карточек
const preInvestorId = qs.get("investorId"); // например /investment-form.html?investorId=5
const preCarId = qs.get("carId");

if (id) title.textContent = "Редактирование инвестиции";

const backBtn = document.getElementById("backBtn");
if (backBtn && ret) backBtn.href = decodeURIComponent(ret);

document.getElementById("btnSave").addEventListener("click", save);

async function loadLists() {
    const investors = await api("/api/investors");
    investorId.innerHTML = (investors || [])
        .map(x => `<option value="${x.id}">${x.fullName}</option>`)
        .join("");

    const cars = await api("/api/cars");
    carId.innerHTML = (cars || [])
        .map(x => `<option value="${x.id}">${x.makeModel} (${x.plateNumber})</option>`)
        .join("");
}

async function load() {
    await loadLists();

    // дефолты для создания
    startDate.value = new Date().toISOString().slice(0, 10);
    status.value = "ACTIVE";

    // ✅ если создаём — применяем предвыбор из query string
    if (!id) {
        if (preInvestorId) investorId.value = String(preInvestorId);
        if (preCarId) carId.value = String(preCarId);
        return;
    }

    // edit
    const x = await api("/api/investments/" + id);

    investorId.value = x.investorId;
    carId.value = x.carId;
    principalAmount.value = String(x.principalAmount).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    interestRatePercent.value = x.interestRatePercent;
    startDate.value = fmtDate(x.startDate);
    termMonths.value = x.termMonths;
    payoutType.value = x.payoutType;

    status.value = x.status || "ACTIVE";

    // запрещаем менять базовые поля
    investorId.disabled = true;
    carId.disabled = true;
    principalAmount.disabled = true;
    startDate.disabled = true;
}

function readNumber(el, name) {
    const v = Number(el.value.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(v)) throw new Error(`Некорректное поле: ${name}`);
    return v;
}

// Маска суммы с разделителями тысяч
function formatMoney(input) {
    input.addEventListener("input", () => {
        let digits = input.value.replace(/\D/g, "");
        input.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    });
}

// Маска процента: только числа и точка/запятая
function formatPercent(input) {
    input.addEventListener("input", () => {
        input.value = input.value.replace(/[^0-9.,]/g, "");
    });
}

// Маска срока: только цифры
function formatTerm(input) {
    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "");
    });
}

async function save() {
    const errEl = document.getElementById("error");
    errEl.textContent = "";

    try {
        if (!investorId.value) throw new Error("Выбери инвестора");
        if (!carId.value) throw new Error("Выбери машину");
        if (!principalAmount.value) throw new Error("Укажи сумму");
        if (!interestRatePercent.value) throw new Error("Укажи процент");
        if (!startDate.value) throw new Error("Укажи дату начала");
        if (!termMonths.value) throw new Error("Укажи срок");

        const amt = readNumber(principalAmount, "Сумма");
        if (amt <= 0) throw new Error("Сумма должна быть больше 0");
        const rate = readNumber(interestRatePercent, "Процент");
        if (rate <= 0 || rate > 100) throw new Error("Процент от 0 до 100");
        const term = readNumber(termMonths, "Срок");
        if (term <= 0) throw new Error("Срок должен быть больше 0");

        if (!id) {
            // CREATE
            const body = {
                investorId: Number(investorId.value),
                carId: Number(carId.value),
                principalAmount: readNumber(principalAmount, "Сумма"),
                interestRatePercent: readNumber(interestRatePercent, "Процент"),
                startDate: startDate.value,
                termMonths: readNumber(termMonths, "Срок"),
                payoutType: payoutType.value
            };

            await api("/api/investments", { method: "POST", body });

        } else {
            // UPDATE
            const body = {
                interestRatePercent: readNumber(interestRatePercent, "Процент"),
                termMonths: readNumber(termMonths, "Срок"),
                payoutType: payoutType.value,
                status: status.value
            };

            await api("/api/investments/" + id, { method: "PUT", body });
        }

        if (ret) location.href = decodeURIComponent(ret);
        else location.href = "/pages/investments.html";

    } catch (e) {
        errEl.textContent = e.message || "Ошибка сохранения";
    }
}

formatMoney(document.getElementById("principalAmount"));
formatPercent(document.getElementById("interestRatePercent"));
formatTerm(document.getElementById("termMonths"));

load();