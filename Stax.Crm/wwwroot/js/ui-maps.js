const MAPS = {
    role: { ADMIN: "Администратор", ASSISTANT: "Ассистент" },
    color: { WHITE: "Белый", YELLOW: "Жёлтый", WHITE_YELLOW: "Белый/Жёлтый" },
    payoutType: { MONTHLY: "Ежемесячно", QUARTERLY: "Ежеквартально", END_OF_TERM: "В конце срока" },
    invStatus: { ACTIVE: "Активна", CLOSED: "Закрыта", CANCELED: "Отменена" },
    schedStatus: { PLANNED: "План", PARTIALLY_PAID: "Частично", PAID: "Оплачено", SKIPPED: "Пропущено" },
    docType: { CONTRACT: "Договор", ADD_AGREEMENT: "Доп. соглашение", OTHER: "Другое" }
};

function mapValue(mapName, code) {
    return (MAPS[mapName] && MAPS[mapName][code]) ? MAPS[mapName][code] : (code ?? "");
}

function fmtMoney(v) {
    if (v === null || v === undefined) return "";
    return Number(v).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
    if (!d) return "";
    return String(d).slice(0, 10);
}
