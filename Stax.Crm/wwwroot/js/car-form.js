// wwwroot/js/car-form.js
requireAuth();
applyTopbar();

const id = new URLSearchParams(location.search).get("id");
const errBox = document.getElementById("error");

function showError(msg) {
    errBox.textContent = msg || "";
    errBox.style.display = msg ? "block" : "none";
}

function val(id) { return document.getElementById(id).value; }
function setVal(id, v) { document.getElementById(id).value = (v ?? ""); }

function toIntOrNull(s) {
    s = (s ?? "").toString().trim();
    if (!s) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
}

function toIntOrZero(s) {
    const n = toIntOrNull(s);
    return n == null ? 0 : n;
}

function toDecimal(s) {
    s = (s ?? "").toString().replace(/\s/g, "").replace(",", ".").trim();
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
}

function toIntFromMasked(s) {
    s = (s ?? "").toString().replace(/\s/g, "").trim();
    if (!s) return 0;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
}

// Маппинг латинских букв на кириллические для госномера
const latinToCyr = { A:"А", B:"В", E:"Е", K:"К", M:"М", H:"Н", O:"О", P:"Р", C:"С", T:"Т", Y:"У", X:"Х" };

// Маска госномера: кириллица + цифры, auto-uppercase
function formatPlateNumber(input) {
    input.addEventListener("input", () => {
        let v = input.value.toUpperCase();
        v = v.split("").map(c => latinToCyr[c] || c).join("");
        v = v.replace(/[^АВЕКМНОРСТУХ0-9]/g, "").slice(0, 9);
        input.value = v;
    });
}

// Маска VIN: 17 символов, латиница+цифры, без I/O/Q
function formatVin(input) {
    input.addEventListener("input", () => {
        input.value = input.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
    });
}

// Маска СТС: цифры и буквы, max 10
function formatSts(input) {
    input.addEventListener("input", () => {
        input.value = input.value.toUpperCase().replace(/[^A-ZА-Я0-9]/g, "").slice(0, 10);
    });
}

// Маска числа с разделителями тысяч
function formatMoney(input) {
    input.addEventListener("input", () => {
        let digits = input.value.replace(/\D/g, "");
        input.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    });
}

// Маска года
function formatYear(input) {
    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 4);
    });
}

// Regex госномера
const plateRegex = /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/;

function toLongOrNull(s) {
    s = (s ?? "").toString().trim();
    if (!s) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
}

function validate(dto) {
    if (!dto.makeModel.trim()) return "Марка/модель обязательна";
    if (!dto.plateNumber.trim()) return "Госномер обязателен";
    if (!plateRegex.test(dto.plateNumber.trim())) return "Госномер в формате А123ВС77 (кириллица)";
    if (!["WHITE", "YELLOW", "WHITE_YELLOW"].includes(dto.color)) return "Некорректный цвет";

    if (dto.vin && dto.vin.length !== 17) return "VIN должен содержать ровно 17 символов";
    if (dto.stsNumber && dto.stsNumber.replace(/\s/g, "").length !== 10) return "СТС должен содержать 10 символов";

    if (dto.year != null && dto.year < 1900) return "Год должен быть >= 1900";
    if (dto.year != null && dto.year > new Date().getFullYear() + 1) return "Год не может быть больше " + (new Date().getFullYear() + 1);
    if (dto.mileageKm != null && dto.mileageKm < 0) return "Пробег не может быть отрицательным";
    if (!(dto.carPrice > 0)) return "Стоимость должна быть > 0";

    return null;
}

function formatOwnerOption(o) {
    // текст для option (в одну строку — так надежнее для <option>)
    let t = o.name || "";
    if (o.inn) t += ` (ИНН ${o.inn})`;
    return t;
}

function setOwnerHint(owner) {
    const hint = document.getElementById("ownerHint");
    if (!owner) { hint.style.display = "none"; hint.textContent = ""; return; }

    const parts = [];
    if (owner.inn) parts.push(`ИНН: ${owner.inn}`);
    if (owner.ogrn) parts.push(`ОГРН: ${owner.ogrn}`);

    if (parts.length === 0) {
        hint.style.display = "none";
        hint.textContent = "";
        return;
    }

    hint.style.display = "block";
    hint.textContent = parts.join(" • ");
}

async function loadOwners(selectIdToSet) {
    const sel = document.getElementById("ownerId");
    sel.innerHTML = `<option value="">— не выбрано —</option>`;

    const list = await api("/api/owners"); // OwnerListItemDto: id,name,inn,ogrn

    for (const o of list) {
        const opt = document.createElement("option");
        opt.value = String(o.id);
        opt.textContent = formatOwnerOption(o);
        // сохраним реквизиты прямо в option.dataset для хинта
        opt.dataset.inn = o.inn || "";
        opt.dataset.ogrn = o.ogrn || "";
        opt.dataset.name = o.name || "";
        sel.appendChild(opt);
    }

    if (selectIdToSet != null) {
        sel.value = String(selectIdToSet);
        // обновим хинт
        const opt = sel.selectedOptions?.[0];
        if (opt && opt.value) setOwnerHint({ inn: opt.dataset.inn, ogrn: opt.dataset.ogrn });
        else setOwnerHint(null);
    }
}

function bindOwnerHint() {
    const sel = document.getElementById("ownerId");
    sel.addEventListener("change", () => {
        const opt = sel.selectedOptions?.[0];
        if (!opt || !opt.value) { setOwnerHint(null); return; }
        setOwnerHint({ inn: opt.dataset.inn, ogrn: opt.dataset.ogrn });
    });
}

function openAddOwnerModal() {
    // В проекте у тебя уже подключен /js/modal.js.
    // Я не знаю точный API твоей модалки, поэтому даю реализацию "без зависимостей":
    // через window.prompt — но нормальная модалка ниже (в OwnersController + можно адаптировать).
    //
    // Если хочешь прямо красивую модалку — скажи, какой у тебя метод modal.js (openModal/Modal.open и т.п.)
    //
    // Здесь сделаем минимально рабочее решение: кастомный prompt-диалог.

    return new Promise((resolve) => {
        const name = prompt("Название лизинговой компании *");
        if (!name || !name.trim()) return resolve(null);

        const inn = prompt("ИНН (необязательно)") || "";
        const ogrn = prompt("ОГРН (необязательно)") || "";
        const phone = prompt("Телефон (необязательно)") || "";
        const email = prompt("Email (необязательно)") || "";

        resolve({
            name: name.trim(),
            inn: inn.trim() || null,
            ogrn: ogrn.trim() || null,
            phone: phone.trim() || null,
            email: email.trim() || null,
            comment: null
        });
    });
}

async function addOwnerFlow() {
    showError("");

    // showOwnerForm() теперь есть в modal.js
    const dto = await showOwnerForm({ title: "Добавить лизинговую компанию" });
    if (!dto) return; // отмена

    try {
        const res = await api("/api/owners", { method: "POST", body: dto });
        await loadOwners(res.id);
    } catch (e) {
        showError(e.message);
    }
}

async function load() {
    showError("");
    await loadMakeModelHints();

    try {
        bindOwnerHint();
        await loadOwners(null);

        if (!id) return;

        const x = await api("/api/cars/" + id);
        document.getElementById("title").textContent = "Редактирование";

        setVal("makeModel", x.makeModel);
        setVal("plateNumber", x.plateNumber);
        setVal("vin", x.vin);
        setVal("stsNumber", x.stsNumber);

        // новый ownerId
        await loadOwners(x.ownerId ?? null);

        setVal("color", x.color || "WHITE");
        setVal("year", x.year ?? "");
        setVal("mileageKm", String(x.mileageKm ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " "));
        setVal("hasAccident", String(!!x.hasAccident));
        setVal("carPrice", x.carPrice ? String(x.carPrice).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "");
        setVal("comment", x.comment ?? "");
    } catch (e) {
        showError(e.message);
    }
}

async function save() {
    showError("");

    const dto = {
        makeModel: val("makeModel").trim(),
        plateNumber: val("plateNumber").trim(),
        vin: val("vin").trim() || null,
        stsNumber: val("stsNumber").trim() || null,

        ownerId: toLongOrNull(val("ownerId")),

        color: val("color"),
        year: toIntOrNull(val("year")),
        mileageKm: toIntFromMasked(val("mileageKm")),
        hasAccident: val("hasAccident") === "true",
        carPrice: toDecimal(val("carPrice")),
        comment: val("comment")?.trim() || null
    };

    const v = validate(dto);
    if (v) { showError(v); return; }

    try {
        if (id) {
            await api("/api/cars/" + id, { method: "PUT", body: dto });
        } else {
            await api("/api/cars", { method: "POST", body: dto });
        }

        location.href = "/pages/cars.html";
    } catch (e) {
        showError(e.message);
    }
}

async function loadMakeModelHints() {
    try {
        const cars = await api("/api/cars");
        const uniq = Array.from(new Set((cars || [])
            .map(x => (x.makeModel || "").trim())
            .filter(Boolean)))
            .sort((a, b) => a.localeCompare(b, "ru"));

        const dl = document.getElementById("makeModelList");
        dl.innerHTML = uniq.map(m => `<option value="${m}"></option>`).join("");
    } catch {
        // если не загрузилось — просто без подсказок
    }
}

document.getElementById("btnSave").addEventListener("click", save);
document.getElementById("btnAddOwner").addEventListener("click", addOwnerFlow);

formatPlateNumber(document.getElementById("plateNumber"));
formatVin(document.getElementById("vin"));
formatSts(document.getElementById("stsNumber"));
formatMoney(document.getElementById("mileageKm"));
formatMoney(document.getElementById("carPrice"));
formatYear(document.getElementById("year"));

load();