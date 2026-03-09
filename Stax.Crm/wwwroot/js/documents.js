requireAuth(); applyTopbar();

const qEl = document.getElementById("q");
const tb = document.getElementById("tbody");
const err = document.getElementById("error");

function debounce(fn, ms = 250) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

async function load() {
    err.textContent = "";

    try {
        let list = await api("/api/documents");

        // поиск по номеру договора (и по имени файла тоже удобно)
        const q = (qEl ? qEl.value : "").trim().toLowerCase();
        if (q) {
            list = (list || []).filter(x =>
                String(x.contractNo || "").toLowerCase().includes(q) ||
                String(x.fileName || "").toLowerCase().includes(q) ||
                String(x.investor || "").toLowerCase().includes(q)
            );
        }

        tb.innerHTML = "";
        for (const x of (list || [])) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${x.fileName || ""}</td>
        <td>${mapValue("docType", x.docType)}</td>
        <td>${x.investor || ""}</td>
        <td>${x.contractNo || ""}</td>
        <td>${x.contractDate ? fmtDate(x.contractDate) : ""}</td>
        <td class="actions">
          <button class="btn btn-sm btn-warning" data-dl="${x.documentId}"><i data-lucide="download"></i> Скачать</button>
          <button data-admin-only class="btn btn-sm btn-danger" data-del="${x.linkId}"><i data-lucide="trash-2"></i> Удалить</button>
        </td>`;
            tb.appendChild(tr);
        }

        tb.querySelectorAll("[data-del]").forEach(b => {
            b.addEventListener("click", () => del(b.getAttribute("data-del")));
        });

        tb.querySelectorAll("[data-dl]").forEach(b => {
            b.addEventListener("click", () => downloadPdf(b.getAttribute("data-dl")));
        });

        applyTopbar();
        refreshIcons();
        animateNewRows();
    } catch (e) {
        err.textContent = e.message || "Ошибка загрузки документов";
    }
}

async function del(id) {
    if (!await showConfirm("Удалить документ?")) return;
    await api("/api/documents/link/" + id, { method: "DELETE" });
    load();
}

// ✅ скачивание с JWT
async function downloadPdf(documentId) {
    try {
        const token = localStorage.getItem("stax_token") || "";
        const res = await fetch(`/api/documents/${documentId}/download`, {
            headers: token ? { "Authorization": "Bearer " + token } : {}
        });

        if (!res.ok) {
            const t = await res.text();
            throw new Error(t || ("Ошибка скачивания: " + res.status));
        }

        // имя файла берём из Content-Disposition, если есть
        let filename = "document.pdf";
        const cd = res.headers.get("content-disposition") || "";
        const m = cd.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
        if (m && m[1]) filename = decodeURIComponent(m[1].replace(/"/g, ""));

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(url);
    } catch (e) {
        await showAlert(e.message || "Ошибка скачивания");
    }
}

// поиск (если есть поле q)
if (qEl) qEl.addEventListener("input", debounce(load, 250));

load();
