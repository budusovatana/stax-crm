requireAuth();
applyTopbar();

const qs = new URLSearchParams(location.search);
const idStr = qs.get("id");
const id = idStr ? Number(idStr) : 0;

const returnUrlRaw = qs.get("return");

const elErr = document.getElementById("error");
function showError(msg) {
    elErr.style.display = msg ? "block" : "none";
    elErr.textContent = msg || "";
}

function safeDecode(v) {
    if (!v) return "";
    try { return decodeURIComponent(v); }
    catch { return v; }
}

document.getElementById("btnBack").href = returnUrlRaw
    ? safeDecode(returnUrlRaw)
    : "/pages/investors.html";

function splitFullName(fullName) {
    const s = (fullName || "").trim().replace(/\s+/g, " ");
    if (!s) return { lastName: "", firstName: "", patronymic: "" };
    const parts = s.split(" ");
    return {
        lastName: parts[0] || "",
        firstName: parts[1] || "",
        patronymic: parts.slice(2).join(" ") || ""
    };
}

// Валидация email
function isValidEmail(email) {
    if (!email) return true; // необязательное поле
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Валидация паспорта (10 цифр)
function isValidPassport(passport) {
    if (!passport) return true;
    const digits = passport.replace(/\D/g, "");
    return digits.length === 10;
}

// Валидация ИНН (12 цифр)
function isValidInn(inn) {
    if (!inn) return true;
    const digits = inn.replace(/\D/g, "");
    return digits.length === 12;
}

async function load() {
    showError("");

    if (!id) {
        document.getElementById("h").textContent = "Добавление инвестора";
        document.getElementById("hint").textContent = "";
        return;
    }

    document.getElementById("h").textContent = "Редактирование инвестора";

    try {
        const data = await api(`/api/investors/${id}`);

        let lastName = data.lastName ?? "";
        let firstName = data.firstName ?? "";
        let patronymic = data.patronymic ?? "";

        if (!lastName && !firstName && (data.fullName || data.FullName)) {
            const x = splitFullName(data.fullName || data.FullName);
            lastName = x.lastName;
            firstName = x.firstName;
            patronymic = x.patronymic;
        }

        document.getElementById("lastName").value = lastName;
        document.getElementById("firstName").value = firstName;
        document.getElementById("patronymic").value = patronymic;

        document.getElementById("phone").value = data.phone || "";
        document.getElementById("email").value = data.email || "";
        document.getElementById("passport").value = data.passport || "";
        document.getElementById("inn").value = data.inn || "";
        document.getElementById("comment").value = data.comment || "";
    } catch (e) {
        showError(e.message || "Не удалось загрузить инвестора");
    }
}

async function save() {
    showError("");

    const rawPhone = (document.getElementById("phone").value || "").trim();
    const rawEmail = (document.getElementById("email").value || "").trim();
    const rawPassport = (document.getElementById("passport").value || "").trim();
    const rawInn = (document.getElementById("inn").value || "").trim();

    const payload = {
        lastName: (document.getElementById("lastName").value || "").trim(),
        firstName: (document.getElementById("firstName").value || "").trim(),
        patronymic: (document.getElementById("patronymic").value || "").trim() || null,

        phone: rawPhone || null,
        email: rawEmail || null,
        passport: rawPassport ? rawPassport.replace(/\D/g, "") : null,
        inn: rawInn ? rawInn.replace(/\D/g, "") : null,
        comment: (document.getElementById("comment").value || "").trim() || null
    };

    if (!payload.lastName) { showError("Фамилия обязательна"); return; }
    if (!payload.firstName) { showError("Имя обязательно"); return; }

    if (rawEmail && !isValidEmail(rawEmail)) {
        showError("Некорректный формат email"); return;
    }

    if (rawPassport && !isValidPassport(rawPassport)) {
        showError("Паспорт должен содержать ровно 10 цифр"); return;
    }

    if (rawInn && !isValidInn(rawInn)) {
        showError("ИНН должен содержать ровно 12 цифр"); return;
    }

    try {
        if (!id) {
            const res = await api("/api/investors", { method: "POST", body: payload });
            const newId = res.id;

            location.href = returnUrlRaw
                ? safeDecode(returnUrlRaw)
                : `/pages/investor-view.html?id=${newId}`;
        } else {
            await api(`/api/investors/${id}`, { method: "PUT", body: payload });

            location.href = returnUrlRaw
                ? safeDecode(returnUrlRaw)
                : `/pages/investor-view.html?id=${id}`;
        }
    } catch (e) {
        showError(e.message || "Ошибка сохранения");
    }
}

document.getElementById("btnSave").addEventListener("click", save);

// Маска телефона: +7 (XXX) XXX-XX-XX
function formatPhone(input) {
    input.addEventListener("input", () => {
        let digits = input.value.replace(/\D/g, "");
        if (digits.startsWith("8")) digits = "7" + digits.slice(1);
        if (!digits.startsWith("7")) digits = "7" + digits;
        digits = digits.slice(0, 11);

        let result = "+7";
        if (digits.length > 1) result += " (" + digits.slice(1, 4);
        if (digits.length >= 4) result += ")";
        if (digits.length > 4) result += " " + digits.slice(4, 7);
        if (digits.length > 7) result += "-" + digits.slice(7, 9);
        if (digits.length > 9) result += "-" + digits.slice(9, 11);

        input.value = result;
    });
}

// Маска паспорта: XXXX XXXXXX
function formatPassport(input) {
    input.addEventListener("input", () => {
        let digits = input.value.replace(/\D/g, "").slice(0, 10);
        if (digits.length > 4) {
            digits = digits.slice(0, 4) + " " + digits.slice(4);
        }
        input.value = digits;
    });
}

// Маска ИНН: 12 цифр
function formatInn(input) {
    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 12);
    });
}

formatPhone(document.getElementById("phone"));
formatPassport(document.getElementById("passport"));
formatInn(document.getElementById("inn"));

load();
