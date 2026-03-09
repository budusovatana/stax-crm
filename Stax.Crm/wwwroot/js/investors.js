requireAuth(); applyTopbar();

const qEl = document.getElementById("q");
const tb = document.getElementById("tbody");
const err = document.getElementById("error");

// небольшой дебаунс, чтобы не дергать API на каждый символ
function debounce(fn, ms = 250) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

async function load() {
    err.textContent = "";
    const q = (qEl.value || "").trim();

    try {
        const list = await api("/api/investors" + (q ? ("?q=" + encodeURIComponent(q)) : ""));
        tb.innerHTML = "";

        for (const x of list) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${x.fullName || ""}</td>
                <td>${x.phone || ""}</td>
                <td>${x.email || ""}</td>
                <td class="actions">
                    <a class="btn btn-sm btn-warning" href="/pages/investor-view.html?id=${x.id}"><i data-lucide="eye"></i> Открыть</a>
                    <a class="btn btn-sm btn-outline-secondary" href="/pages/investor-form.html?id=${x.id}"><i data-lucide="pencil"></i> Редактировать</a>
                    <button data-admin-only class="btn btn-sm btn-danger" data-del="${x.id}"><i data-lucide="trash-2"></i> Удалить</button>
                </td>`;
            tb.appendChild(tr);
        }

        tb.querySelectorAll("[data-del]").forEach(btn => {
            btn.addEventListener("click", () => del(btn.getAttribute("data-del")));
        });

        applyTopbar();
        refreshIcons();
        animateNewRows();
    } catch (e) {
        err.textContent = e.message || "Ошибка загрузки";
    }
}

async function del(id) {
    try {
        const counts = await api("/api/investors/" + id + "/related-counts");
        const parts = [];
        if (counts.investments) parts.push(`инвестиций: ${counts.investments}`);
        if (counts.payments) parts.push(`выплат: ${counts.payments}`);
        if (counts.schedules) parts.push(`записей графика: ${counts.schedules}`);
        if (counts.documents) parts.push(`документов: ${counts.documents}`);

        let msg = "Удалить инвестора?";
        if (parts.length > 0) {
            msg += "\n\nБудут также удалены связанные данные:\n— " + parts.join("\n— ");
        }

        if (!await showConfirm(msg)) return;
        await api("/api/investors/" + id, { method: "DELETE" });
        await load();
    } catch (e) {
        await showAlert(e.message || "Ошибка удаления");
    }
}

// автопоиск при вводе
qEl.addEventListener("input", debounce(load, 250));

// при Enter — сразу (без ожидания)
qEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") load();
});

// начальная загрузка
load();
