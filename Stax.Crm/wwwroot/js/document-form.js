requireAuth();
applyTopbar();

const qs = new URLSearchParams(location.search);

// сценарий возврата:
// - если есть investorId в URL -> считаем, что пришли из карточки инвестора
// - иначе returnUrl может быть documents/investor
const investorFromUrl = qs.get("investorId");        // например "12"
const returnUrl = (qs.get("returnUrl") || "").toLowerCase(); // "investor" | "documents" | ""

document.getElementById("btnSave").addEventListener("click", save);

async function load() {
    const inv = await api("/api/investors");

    investorId.innerHTML = inv.map(x => `<option value="${x.id}">${x.fullName}</option>`).join("");

    // Если форма открыта с investorId=..., то выбираем инвестора и (по желанию) блокируем select
    if (investorFromUrl) {
        investorId.value = investorFromUrl;
        investorId.disabled = true; // чтобы случайно не поменять
    }

    // Сделаем "Назад" умным
    const back = document.querySelector('a[href="/pages/documents.html"]');
    if (back) {
        if (investorFromUrl || returnUrl === "investor") {
            back.href = `/pages/investor-view.html?id=${investorFromUrl || investorId.value}`;
        } else {
            back.href = "/pages/documents.html";
        }
    }
}
load();

async function save() {
    const err = document.getElementById("error");
    err.textContent = "";

    try {
        if (!file.files || file.files.length === 0) throw new Error("Выберите PDF файл");

        const f = file.files[0];

        const fd = new FormData();
        fd.append("File", f);
        fd.append("InvestorId", investorId.value);
        fd.append("DocType", docType.value);

        // Title обязателен на бэке — формируем автоматически
        const t = (contractNo.value || "").trim();
        const d = (contractDate.value || "").trim();
        const autoTitle = `Договор${t ? " №" + t : ""}${d ? " от " + d : ""}`;
        fd.append("Title", autoTitle);

        if (t) fd.append("ContractNo", t);
        if (contractDate.value) fd.append("ContractDate", contractDate.value);

        await api("/api/documents/upload", { method: "POST", isForm: true, body: fd });

        // ===== редирект: 2 сценария =====
        // приоритет: если пришли из карточки инвестора (есть investorId в URL) — вернуть туда
        if (investorFromUrl || returnUrl === "investor") {
            location.href = `/pages/investor-view.html?id=${investorId.value}`;
        } else {
            location.href = "/pages/documents.html";
        }
    } catch (e) {
        err.textContent = e.message || "Ошибка загрузки договора";
    }
}
