// wwwroot/js/car-view.js
requireAuth();
applyTopbar();

const qs = new URLSearchParams(location.search);
const carId = qs.get("id");

const errBox = document.getElementById("error");

function showError(msg) {
    errBox.textContent = msg || "";
    errBox.style.display = msg ? "block" : "none";
}

function el(id) { return document.getElementById(id); }

function makeCopyable(node, val) {
    if (!node || !val) return;
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

const titleEl = el("title");
const plateEl = el("plate");
const vinEl = el("vin");
const stsEl = el("sts");
const ownerEl = el("owner");
const ownerRekEl = el("ownerRek"); // ✅ новое
const colorEl = el("color");
const yearEl = el("year");
const mileageEl = el("mileage");
const accEl = el("acc");
const priceEl = el("price");
const commentEl = el("comment");
const activeSumEl = el("activeSum");
const editBtn = el("editBtn");
const addInvBtn = el("addInvBtn");
const backBtn = el("backBtn");
const invBody = el("invBody");

if (!carId) {
    showError("Не указан id машины");
} else {
    if (backBtn) backBtn.href = "/pages/cars.html";

    editBtn.href = "/pages/car-form.html?id=" + carId;

    const ret = encodeURIComponent(`/pages/car-view.html?id=${carId}`);
    addInvBtn.href = `/pages/investment-form.html?carId=${carId}&return=${ret}`;

    load();
}

async function load() {
    showError("");

    try {
        const x = await api("/api/cars/" + carId);

        titleEl.textContent = x.makeModel || "Машина";
        plateEl.textContent = x.plateNumber || "";
        vinEl.textContent = x.vin || "";
        stsEl.textContent = x.stsNumber || "";

        // ✅ компания + реквизиты
        ownerEl.textContent = x.ownerName || "";

        const rek = [];
        if (x.ownerInn) rek.push(`ИНН: ${x.ownerInn}`);
        if (x.ownerOgrn) rek.push(`ОГРН: ${x.ownerOgrn}`);
        ownerRekEl.textContent = rek.join(" • ");
        ownerRekEl.style.display = rek.length ? "block" : "none";

        colorEl.textContent = mapValue("color", x.color);
        yearEl.textContent = (x.year ?? "");
        mileageEl.textContent = (x.mileageKm ?? 0) + " км";
        accEl.textContent = x.hasAccident ? "Да" : "Нет";

        priceEl.textContent = fmtMoney(x.carPrice) + " ₽";
        commentEl.textContent = x.comment || "";

        makeCopyable(plateEl, x.plateNumber);
        makeCopyable(vinEl, x.vin);
        makeCopyable(stsEl, x.stsNumber);

        activeSumEl.textContent = fmtMoney(x.activeInvestmentsSum ?? 0);

        invBody.innerHTML = "";

        const ret = encodeURIComponent(`/pages/car-view.html?id=${carId}`);

        for (const inv of (x.investments || [])) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${inv.investor || ""}</td>
                <td>${fmtMoney(inv.principalAmount)} ₽</td>
                <td>${mapValue("invStatus", inv.status)}</td>
                <td>
                    <a class="btn btn-sm btn-warning" href="/pages/investment-view.html?id=${inv.id}&return=${ret}"><i data-lucide="eye"></i> Открыть</a>
                </td>
            `;
            invBody.appendChild(tr);
        }

        refreshIcons();
    } catch (e) {
        showError(e.message || "Ошибка загрузки");
    }
}