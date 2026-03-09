// modal.js — кастомные модальные окна вместо alert() / confirm()

// Swipe down to dismiss on mobile
function _addSwipeToDismiss(box, onClose) {
    var startY = 0;
    var currentY = 0;
    var dragging = false;

    box.addEventListener("touchstart", function (e) {
        // Only start swipe from the handle area or top of box
        var touch = e.touches[0];
        var rect = box.getBoundingClientRect();
        if (touch.clientY - rect.top > 40) return;
        startY = touch.clientY;
        currentY = startY;
        dragging = true;
        box.style.transition = "none";
    }, { passive: true });

    box.addEventListener("touchmove", function (e) {
        if (!dragging) return;
        currentY = e.touches[0].clientY;
        var dy = currentY - startY;
        if (dy > 0) {
            box.style.transform = "translateY(" + dy + "px)";
        }
    }, { passive: true });

    box.addEventListener("touchend", function () {
        if (!dragging) return;
        dragging = false;
        var dy = currentY - startY;
        box.style.transition = "transform .2s ease";
        if (dy > 80) {
            box.style.transform = "translateY(100%)";
            setTimeout(onClose, 200);
        } else {
            box.style.transform = "translateY(0)";
        }
    });
}

function _createModal(message, buttons) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";

        const box = document.createElement("div");
        box.className = "modal-box";

        // Swipe handle for mobile
        const handle = document.createElement("div");
        handle.className = "modal-swipe-handle";
        box.appendChild(handle);

        const msg = document.createElement("div");
        msg.className = "modal-message";
        msg.textContent = message;

        const btnRow = document.createElement("div");
        btnRow.className = "modal-buttons";

        function close(value) {
            document.removeEventListener("keydown", onKey);
            overlay.remove();
            resolve(value);
        }

        for (const b of buttons) {
            const btn = document.createElement("button");
            btn.className = "btn " + (b.cls || "");
            btn.textContent = b.label;
            btn.addEventListener("click", () => close(b.value));
            btnRow.appendChild(btn);
        }

        function onKey(e) {
            if (e.key === "Escape") close(buttons[0].value);
        }

        overlay.addEventListener("click", e => {
            if (e.target === overlay) close(buttons[0].value);
        });

        document.addEventListener("keydown", onKey);

        // Swipe down to close on mobile
        _addSwipeToDismiss(box, () => close(buttons[0].value));

        box.appendChild(msg);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // фокус на последней кнопке (основное действие)
        btnRow.lastElementChild.focus();
    });
}

function showAlert(message) {
    return _createModal(message, [
        { label: "ОК", value: undefined, cls: "" }
    ]);
}

function showConfirm(message) {
    return _createModal(message, [
        { label: "Отмена", value: false, cls: "btn-outline-secondary" },
        { label: "Подтвердить", value: true, cls: "btn-danger" }
    ]);
}

// === FORM MODAL: добавление/редактирование лизинговой компании ===
function showOwnerForm(initial) {
    initial = initial || {};

    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";

        const box = document.createElement("div");
        box.className = "modal-box";
        box.style.maxWidth = "520px";

        // Swipe handle for mobile
        const formHandle = document.createElement("div");
        formHandle.className = "modal-swipe-handle";
        box.appendChild(formHandle);

        const title = document.createElement("div");
        title.className = "modal-message";
        title.textContent = initial.title || "Лизинговая компания";

        const form = document.createElement("div");
        form.style.marginTop = "12px";
        form.style.display = "grid";
        form.style.gridTemplateColumns = "1fr 1fr";
        form.style.gap = "10px";

        function field(labelText, id, placeholder, colSpanAll = false) {
            const wrap = document.createElement("div");
            if (colSpanAll) wrap.style.gridColumn = "1 / -1";

            const label = document.createElement("div");
            label.className = "text-muted";
            label.style.fontSize = "12px";
            label.style.marginBottom = "6px";
            label.textContent = labelText;

            const input = document.createElement("input");
            input.id = id;
            input.placeholder = placeholder || "";
            input.value = (initial[id] ?? "");

            // чуть под стиль проекта
            input.style.width = "100%";

            wrap.appendChild(label);
            wrap.appendChild(input);
            return wrap;
        }

        const fName = field("Название компании *", "name", "ПАО «ЛК Европлан»", true);
        const fInn = field("ИНН", "inn", "10 или 12 цифр");
        const fOgrn = field("ОГРН", "ogrn", "13 или 15 цифр");
        const fPhone = field("Телефон", "phone", "+7...");
        const fEmail = field("Email", "email", "mail@example.com");

        // Маска телефона для модалки
        const phoneInput = fPhone.querySelector("input");
        if (phoneInput) {
            phoneInput.addEventListener("input", () => {
                let digits = phoneInput.value.replace(/\D/g, "");
                if (digits.startsWith("8")) digits = "7" + digits.slice(1);
                if (!digits.startsWith("7")) digits = "7" + digits;
                digits = digits.slice(0, 11);
                let result = "+7";
                if (digits.length > 1) result += " (" + digits.slice(1, 4);
                if (digits.length >= 4) result += ")";
                if (digits.length > 4) result += " " + digits.slice(4, 7);
                if (digits.length > 7) result += "-" + digits.slice(7, 9);
                if (digits.length > 9) result += "-" + digits.slice(9, 11);
                phoneInput.value = result;
            });
        }

        const cmtWrap = document.createElement("div");
        cmtWrap.style.gridColumn = "1 / -1";
        const cmtLabel = document.createElement("div");
        cmtLabel.className = "text-muted";
        cmtLabel.style.fontSize = "12px";
        cmtLabel.style.marginBottom = "6px";
        cmtLabel.textContent = "Комментарий";
        const cmt = document.createElement("textarea");
        cmt.id = "comment";
        cmt.rows = 3;
        cmt.value = (initial.comment ?? "");
        cmt.style.width = "100%";
        cmtWrap.appendChild(cmtLabel);
        cmtWrap.appendChild(cmt);

        const error = document.createElement("div");
        error.className = "alert alert-danger";
        error.style.display = "none";
        error.style.marginTop = "10px";
        error.style.gridColumn = "1 / -1";

        form.appendChild(fName);
        form.appendChild(fInn);
        form.appendChild(fOgrn);
        form.appendChild(fPhone);
        form.appendChild(fEmail);
        form.appendChild(cmtWrap);
        form.appendChild(error);

        const btnRow = document.createElement("div");
        btnRow.className = "modal-buttons";

        const btnCancel = document.createElement("button");
        btnCancel.className = "btn btn-outline-secondary";
        btnCancel.textContent = "Отмена";

        const btnSave = document.createElement("button");
        btnSave.className = "btn btn-warning";
        btnSave.textContent = "Сохранить";

        function setError(msg) {
            error.textContent = msg || "";
            error.style.display = msg ? "block" : "none";
        }

        function close(value) {
            document.removeEventListener("keydown", onKey);
            overlay.remove();
            resolve(value);
        }

        function onKey(e) {
            if (e.key === "Escape") close(null);
            // Enter -> сохранить (если фокус не в textarea)
            if (e.key === "Enter" && e.target && e.target.tagName !== "TEXTAREA") {
                e.preventDefault();
                btnSave.click();
            }
        }

        overlay.addEventListener("click", e => {
            if (e.target === overlay) close(null);
        });

        // Swipe down to close on mobile
        _addSwipeToDismiss(box, () => close(null));

        btnCancel.addEventListener("click", () => close(null));

        btnSave.addEventListener("click", () => {
            setError("");

            const dto = {
                name: (box.querySelector("#name").value || "").trim(),
                inn: (box.querySelector("#inn").value || "").trim() || null,
                ogrn: (box.querySelector("#ogrn").value || "").trim() || null,
                phone: (box.querySelector("#phone").value || "").trim() || null,
                email: (box.querySelector("#email").value || "").trim() || null,
                comment: (box.querySelector("#comment").value || "").trim() || null
            };

            if (!dto.name) {
                setError("Название компании обязательно");
                box.querySelector("#name").focus();
                return;
            }

            if (dto.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
                setError("Некорректный формат email");
                return;
            }

            close(dto);
        });

        document.addEventListener("keydown", onKey);

        btnRow.appendChild(btnCancel);
        btnRow.appendChild(btnSave);

        box.appendChild(title);
        box.appendChild(form);
        box.appendChild(btnRow);

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // фокус на названии
        box.querySelector("#name").focus();
    });
}