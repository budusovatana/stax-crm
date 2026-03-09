requireAuth();
applyTopbar();

const qs = new URLSearchParams(location.search);
const investorId = Number(qs.get("id"));
const returnUrl = qs.get("return");

// Назад
const backBtn = el("btnBack");
if (backBtn) {
    backBtn.href = returnUrl ? decodeURIComponent(returnUrl) : "/pages/investors.html";
}

function el(id) { return document.getElementById(id); }
function showError(msg) {
    const e = el("error");
    if (!e) return;
    if (!msg) { e.style.display = "none"; e.textContent = ""; return; }
    e.style.display = "block";
    e.textContent = msg;
}

function pick(obj, ...keys) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return null;
}

function fmtMoney(v) {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(n);
}

function fmtDateSafe(v) {
    if (!v) return "—";
    if (typeof fmtDate === "function") return fmtDate(v);
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return new Intl.DateTimeFormat("ru-RU").format(d);
}

function investmentStatusRu(s) {
    const x = (s || "").toUpperCase();
    if (x === "ACTIVE") return "Активная";
    if (x === "CLOSED") return "Закрыта";
    if (x === "CANCELED") return "Отменена";
    return s || "—";
}

function makeReturnUrl() {
    let url = `/pages/investor-view.html?id=${investorId}`;
    if (returnUrl) url += `&return=${returnUrl}`;
    return encodeURIComponent(url);
}

function setText(id, value) {
    const node = el(id);
    if (!node) return;
    node.textContent = (value === null || value === undefined || value === "") ? "—" : String(value);
}

function displayPhone(raw) {
    if (!raw) return null;
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("8")) digits = "7" + digits.slice(1);
    if (digits.length === 11 && digits.startsWith("7")) {
        return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
    }
    return raw;
}

function displayPassport(raw) {
    if (!raw) return null;
    let digits = raw.replace(/\D/g, "");
    if (digits.length === 10) {
        return digits.slice(0, 4) + " " + digits.slice(4);
    }
    return raw;
}

function setCopyable(id, val) {
    const node = el(id);
    if (!node || !val) return;
    node.textContent = val;
    node.classList.add("copyable");
    node.style.position = "relative";
    node.addEventListener("click", () => {
        navigator.clipboard.writeText(val).then(() => {
            let toast = node.querySelector(".copy-toast");
            if (!toast) {
                toast = document.createElement("span");
                toast.className = "copy-toast";
                toast.textContent = "Скопировано!";
                node.appendChild(toast);
            }
            toast.classList.add("show");
            setTimeout(() => toast.classList.remove("show"), 1200);
        });
    });
}

function renderInvestor(inv) {
    const fullName = pick(inv, "fullName", "FullName", "name", "Name") || "Инвестор";
    const phone = pick(inv, "phone", "Phone");
    const email = pick(inv, "email", "Email");

    setText("title", fullName);

    const sub = [];
    if (email) sub.push(email);
    if (phone) sub.push(phone);
    setText("subtitle", sub.join(" • "));

    const fmtPhone = displayPhone(phone) || phone;
    if (fmtPhone) setCopyable("phone", fmtPhone); else setText("phone", fmtPhone);
    if (email) setCopyable("email", email); else setText("email", email);

    const passport = pick(inv, "passport", "Passport");
    const fmtPassport = displayPassport(passport) || passport;
    if (fmtPassport) setCopyable("passport", fmtPassport); else setText("passport", fmtPassport);

    const inn = pick(inv, "inn", "Inn");
    if (inn) setCopyable("inn", inn); else setText("inn", inn);

    setText("comment", pick(inv, "comment", "Comment"));

    const btnEdit = el("btnEdit");
    if (btnEdit) btnEdit.href = `/pages/investor-form.html?id=${investorId}&return=${makeReturnUrl()}`;

    // ✅ ВАЖНО: теперь investment-form умеет читать ?investorId=
    const btnAddInvestment = el("btnAddInvestment");
    if (btnAddInvestment) btnAddInvestment.href = `/pages/investment-form.html?investorId=${investorId}&return=${makeReturnUrl()}`;

    const btnAddDoc = el("btnAddDoc");
    if (btnAddDoc) btnAddDoc.href = `/pages/document-form.html?investorId=${investorId}&return=${makeReturnUrl()}`;
}

function renderInvestments(list) {
    const tb = el("invTbody");
    if (!tb) return;

    tb.innerHTML = "";
    const arr = Array.isArray(list) ? list : (list?.items || list?.data || []);

    for (const x of arr) {
        const id = pick(x, "id", "Id");
        const amount = pick(x, "principalAmount", "PrincipalAmount", "amount", "Amount");
        const status = pick(x, "status", "Status");

        const carText =
            pick(x, "car", "Car") ||
            pick(x, "carTitle", "CarTitle") ||
            pick(x, "carModel", "CarModel") ||
            pick(x, "carNumber", "CarNumber") ||
            pick(x, "carId", "CarId") ||
            "—";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${carText}</td>
          <td class="num">${fmtMoney(amount)}</td>
          <td>${investmentStatusRu(status)}</td>
          <td class="actions">
            ${id ? `<a class="btn btn-sm btn-warning" href="/pages/investment-view.html?id=${id}&return=${makeReturnUrl()}"><i data-lucide="eye"></i> Открыть</a>` : ""}
          </td>
        `;
        tb.appendChild(tr);
    }

    if (tb.children.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="4" class="text-muted">Инвестиций нет</td>`;
        tb.appendChild(tr);
    }
}

function renderPaidTotal(total) {
    const v =
        (typeof total === "object" && total !== null)
            ? (pick(total, "total", "Total", "sum", "Sum"))
            : total;

    setText("paidTotal", v === null || v === undefined ? "—" : fmtMoney(v));
}

function renderDocuments(list) {
    const tb = el("docTbody");
    if (!tb) return;

    tb.innerHTML = "";
    const arr = Array.isArray(list) ? list : (list?.items || list?.data || []);

    for (const x of arr) {
        const linkId = pick(x, "linkId", "LinkId", "id", "Id");
        const documentId = pick(x, "documentId", "DocumentId");

        const fileName = pick(x, "fileName", "FileName", "name", "Name") || "—";
        const docType = pick(x, "docType", "DocType") || "—";
        const contractNo = pick(x, "contractNo", "ContractNo", "number", "Number") || "—";
        const contractDate = pick(x, "contractDate", "ContractDate", "date", "Date");

        const docTypeText = (typeof mapValue === "function") ? mapValue("docType", docType) : docType;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${fileName}</td>
          <td>${docTypeText}</td>
          <td>${contractNo}</td>
          <td>${fmtDateSafe(contractDate)}</td>
          <td class="actions">
            ${documentId ? `<a class="btn btn-sm btn-warning" target="_blank" href="/api/documents/${documentId}/download?linkId=${linkId}"><i data-lucide="download"></i> PDF</a>` : ""}
            ${linkId ? `<button data-admin-only class="btn btn-sm btn-danger" data-del="${linkId}"><i data-lucide="trash-2"></i> Удалить</button>` : ""}
          </td>
        `;
        tb.appendChild(tr);
    }

    if (tb.children.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="5" class="text-muted">Документов нет</td>`;
        tb.appendChild(tr);
    }

    tb.querySelectorAll("[data-del]").forEach(btn => {
        btn.addEventListener("click", async () => {
            const delId = btn.getAttribute("data-del");
            if (!await showConfirm("Удалить документ?")) return;
            await api("/api/documents/link/" + delId, { method: "DELETE" });
            await loadDocumentsOnly();
        });
    });

    applyTopbar();
    refreshIcons();
}

async function loadDocumentsOnly() {
    try {
        // ✅ Только правильный endpoint (чтобы не было “покажи все документы”)
        const docs = await api(`/api/investors/${investorId}/documents`);
        renderDocuments(docs);
    } catch (e) {
        // очищаем таблицу и показываем понятную ошибку
        renderDocuments([]);
        showError("Не найден endpoint документов инвестора. Нужен: GET /api/investors/{id}/documents");
    }
}

async function load() {
    if (!investorId) {
        showError("Не передан id инвестора");
        return;
    }
    showError("");

    try {
        const inv = await api(`/api/investors/${investorId}`);
        renderInvestor(inv);

        // ✅ Только правильный endpoint (иначе нельзя гарантировать фильтрацию)
        let investments = [];
        try {
            investments = await api(`/api/investors/${investorId}/investments`);
        } catch (e) {
            investments = [];
            showError("Не найден endpoint инвестиций инвестора. Нужен: GET /api/investors/{id}/investments");
        }
        renderInvestments(investments);

        // totalPaid из карточки инвестора
        renderPaidTotal(pick(inv, "totalPaid", "TotalPaid"));

        // документы
        await loadDocumentsOnly();

        applyTopbar();
    } catch (e) {
        showError(e?.message || "Ошибка загрузки карточки инвестора");
    }
}

load();