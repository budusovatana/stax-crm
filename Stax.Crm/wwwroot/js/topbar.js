function setActiveNavLink() {
    var cur = location.pathname.toLowerCase();

    document.querySelectorAll("#topbar .nav-link, .sidebar .nav-link").forEach(function (a) {
        var href = (a.getAttribute("href") || "").toLowerCase();
        var isActive = href && (cur === href || cur.endsWith(href));
        a.classList.toggle("active", isActive);
    });
}

function applyTopbar(forceRebuild) {
    var top = document.getElementById("topbar");
    if (!top) return;

    var navMode = localStorage.getItem("stax_nav_mode") || "side";

    if (navMode === "side") {
        applySidebar(top, forceRebuild);
    } else {
        // Remove sidebar if switching back to top
        var oldSidebar = document.querySelector(".sidebar");
        if (oldSidebar) oldSidebar.remove();
        document.body.classList.remove("nav-side", "sidebar-collapsed");
        applyNavbar(top, forceRebuild);
    }
}

function applyNavbar(top, forceRebuild) {
    // If navbar already built and no rebuild needed — just update active link and admin-only
    if (!forceRebuild && top.querySelector(".navbar")) {
        setActiveNavLink();
        applyAdminOnly();
        return;
    }

    var role = localStorage.getItem("stax_role") || "";
    var username = localStorage.getItem("stax_username") || "";
    var theme = localStorage.getItem("stax_theme") || "light";
    var themeIcon = theme === "dark" ? "sun" : "moon";

    // Sanitize user data to prevent XSS
    var safeUsername = document.createElement("span");
    safeUsername.textContent = username || "";
    var safeRole = role ? "(" + mapValue("role", role) + ")" : "";

    // Build navbar using DOM methods
    var nav = document.createElement("nav");
    nav.className = "navbar navbar-expand-lg bg-body-tertiary border-bottom sticky-top";

    var containerDiv = document.createElement("div");
    containerDiv.className = "container-fluid";

    // Brand
    var brandLink = document.createElement("a");
    brandLink.className = "navbar-brand d-flex align-items-center gap-2";
    brandLink.href = "/pages/dashboard.html";

    var brandImg = document.createElement("img");
    brandImg.src = "/img/logo.png";
    brandImg.alt = "STAX";
    brandImg.style.cssText = "height:36px; width:auto;";
    brandLink.appendChild(brandImg);

    var brandInfo = document.createElement("div");
    brandInfo.className = "brand-info";
    var brandB = document.createElement("b");
    brandB.textContent = "Инвестиции";
    brandInfo.appendChild(brandB);
    var brandSmall = document.createElement("small");
    brandSmall.className = "d-block";
    brandSmall.textContent = (username || "") + " " + safeRole;
    brandInfo.appendChild(brandSmall);
    brandLink.appendChild(brandInfo);
    containerDiv.appendChild(brandLink);

    // Toggler
    var toggler = document.createElement("button");
    toggler.className = "navbar-toggler";
    toggler.type = "button";
    toggler.setAttribute("data-bs-toggle", "collapse");
    toggler.setAttribute("data-bs-target", "#navbarNav");
    var togglerSpan = document.createElement("span");
    togglerSpan.className = "navbar-toggler-icon";
    toggler.appendChild(togglerSpan);
    containerDiv.appendChild(toggler);

    // Collapse
    var collapse = document.createElement("div");
    collapse.className = "collapse navbar-collapse";
    collapse.id = "navbarNav";

    // Nav items
    var navItems = [
        { href: "/pages/dashboard.html", icon: "layout-dashboard", label: "Главная" },
        { href: "/pages/investors.html", icon: "users", label: "Инвесторы" },
        { href: "/pages/cars.html", icon: "car", label: "Машины" },
        { href: "/pages/investments.html", icon: "trending-up", label: "Инвестиции" },
        { href: "/pages/payments.html", icon: "banknote", label: "Выплаты" },
        { href: "/pages/documents.html", icon: "file-text", label: "Договора" },
        { href: "/pages/reports.html", icon: "bar-chart-3", label: "Отчеты" },
        { href: "/pages/users.html", icon: "shield-check", label: "Пользователи", adminOnly: true },
        { href: "/pages/settings.html", icon: "settings", label: "Настройки" }
    ];

    var ul = document.createElement("ul");
    ul.className = "navbar-nav me-auto mb-2 mb-lg-0 gap-1";
    for (var i = 0; i < navItems.length; i++) {
        if (navItems[i].adminOnly && localStorage.getItem("stax_role") !== "ADMIN") continue;
        var li = document.createElement("li");
        li.className = "nav-item";
        var a = document.createElement("a");
        a.className = "nav-link";
        a.href = navItems[i].href;
        var icon = document.createElement("i");
        icon.setAttribute("data-lucide", navItems[i].icon);
        a.appendChild(icon);
        a.appendChild(document.createTextNode(" " + navItems[i].label));
        li.appendChild(a);
        ul.appendChild(li);
    }
    collapse.appendChild(ul);

    // Right side buttons
    var rightDiv = document.createElement("div");
    rightDiv.className = "d-flex align-items-center gap-2";

    var themeBtn = document.createElement("button");
    themeBtn.className = "theme-toggle";
    themeBtn.setAttribute("onclick", "toggleTheme()");
    themeBtn.title = "Сменить тему";
    var themeI = document.createElement("i");
    themeI.setAttribute("data-lucide", themeIcon);
    themeBtn.appendChild(themeI);
    rightDiv.appendChild(themeBtn);

    var logoutBtn = document.createElement("button");
    logoutBtn.className = "btn btn-sm btn-outline-secondary";
    logoutBtn.setAttribute("onclick", "confirmLogout()");
    var logoutI = document.createElement("i");
    logoutI.setAttribute("data-lucide", "log-out");
    logoutBtn.appendChild(logoutI);
    logoutBtn.appendChild(document.createTextNode(" Выход"));
    rightDiv.appendChild(logoutBtn);

    collapse.appendChild(rightDiv);
    containerDiv.appendChild(collapse);
    nav.appendChild(containerDiv);

    top.textContent = "";
    top.appendChild(nav);

    setActiveNavLink();
    refreshIcons();
    applyAdminOnly();
}

function applySidebar(top, forceRebuild) {
    var existingSidebar = document.querySelector(".sidebar");

    // If sidebar already built and no rebuild needed
    if (!forceRebuild && existingSidebar) {
        setActiveNavLink();
        applyAdminOnly();
        return;
    }

    var role = localStorage.getItem("stax_role") || "";
    var username = localStorage.getItem("stax_username") || "";
    var theme = localStorage.getItem("stax_theme") || "light";
    var collapsed = localStorage.getItem("stax_sidebar_collapsed") === "true";
    var themeIconName = theme === "dark" ? "sun" : "moon";
    var themeLabel = theme === "dark" ? "Светлая тема" : "Тёмная тема";
    var toggleIconName = collapsed ? "chevron-right" : "chevron-left";
    var safeRole = role ? "(" + mapValue("role", role) + ")" : "";

    // Clear top bar content
    top.textContent = "";

    // Remove old sidebar
    if (existingSidebar) existingSidebar.remove();

    var navItems = [
        { href: "/pages/dashboard.html", icon: "layout-dashboard", label: "Главная" },
        { href: "/pages/investors.html", icon: "users", label: "Инвесторы" },
        { href: "/pages/cars.html", icon: "car", label: "Машины" },
        { href: "/pages/investments.html", icon: "trending-up", label: "Инвестиции" },
        { href: "/pages/payments.html", icon: "banknote", label: "Выплаты" },
        { href: "/pages/documents.html", icon: "file-text", label: "Договора" },
        { href: "/pages/reports.html", icon: "bar-chart-3", label: "Отчеты" },
        { href: "/pages/users.html", icon: "shield-check", label: "Пользователи", adminOnly: true },
        { href: "/pages/settings.html", icon: "settings", label: "Настройки" }
    ];

    // Build sidebar using DOM methods
    var sidebar = document.createElement("div");
    sidebar.className = "sidebar" + (collapsed ? " collapsed" : "");

    // Brand — logo + subtitle below
    var brandLink = document.createElement("a");
    brandLink.className = "sidebar-brand";
    brandLink.href = "/pages/dashboard.html";
    var brandImg = document.createElement("img");
    brandImg.src = "/img/logo.png";
    brandImg.alt = "STAX";
    brandLink.appendChild(brandImg);
    var brandText = document.createElement("span");
    brandText.className = "brand-text";
    brandText.textContent = "Инвестиции";
    brandLink.appendChild(brandText);
    sidebar.appendChild(brandLink);

    // Nav links
    var navDiv = document.createElement("div");
    navDiv.className = "sidebar-nav";
    for (var i = 0; i < navItems.length; i++) {
        if (navItems[i].adminOnly && localStorage.getItem("stax_role") !== "ADMIN") continue;
        var a = document.createElement("a");
        a.className = "nav-link";
        a.href = navItems[i].href;
        a.setAttribute("data-bs-toggle", "tooltip");
        a.setAttribute("data-bs-placement", "right");
        a.title = navItems[i].label;
        var ico = document.createElement("i");
        ico.setAttribute("data-lucide", navItems[i].icon);
        a.appendChild(ico);
        var span = document.createElement("span");
        span.textContent = navItems[i].label;
        a.appendChild(span);
        navDiv.appendChild(a);
    }
    sidebar.appendChild(navDiv);

    // Bottom section
    var bottomDiv = document.createElement("div");
    bottomDiv.className = "sidebar-bottom";

    // User info with avatar
    var userDiv = document.createElement("div");
    userDiv.className = "sidebar-user";
    var avatarLetter = (username || "?").charAt(0).toUpperCase();
    var avatar = document.createElement("div");
    avatar.className = "sidebar-avatar";
    avatar.textContent = avatarLetter;
    avatar.title = username || "";
    userDiv.appendChild(avatar);
    var userInfo = document.createElement("div");
    userInfo.className = "sidebar-user-info";
    var userStrong = document.createElement("strong");
    userStrong.textContent = username || "";
    userInfo.appendChild(userStrong);
    if (safeRole) {
        var roleSmall = document.createElement("small");
        roleSmall.textContent = safeRole;
        userInfo.appendChild(roleSmall);
    }
    userDiv.appendChild(userInfo);
    bottomDiv.appendChild(userDiv);

    // Theme toggle
    var themeBtn = document.createElement("button");
    themeBtn.className = "sidebar-toggle";
    themeBtn.setAttribute("onclick", "toggleTheme()");
    themeBtn.title = themeLabel;
    var themeI = document.createElement("i");
    themeI.setAttribute("data-lucide", themeIconName);
    themeBtn.appendChild(themeI);
    var themeSpan = document.createElement("span");
    themeSpan.textContent = themeLabel;
    themeBtn.appendChild(themeSpan);
    bottomDiv.appendChild(themeBtn);

    // Logout with confirm dialog
    var logoutBtn = document.createElement("button");
    logoutBtn.className = "sidebar-toggle";
    logoutBtn.setAttribute("onclick", "confirmLogout()");
    logoutBtn.title = "Выход";
    var logoutI = document.createElement("i");
    logoutI.setAttribute("data-lucide", "log-out");
    logoutBtn.appendChild(logoutI);
    var logoutSpan = document.createElement("span");
    logoutSpan.textContent = "Выход";
    logoutBtn.appendChild(logoutSpan);
    bottomDiv.appendChild(logoutBtn);

    // Collapse toggle with text
    var collapseLabel = collapsed ? "Развернуть" : "Свернуть";
    var collapseBtn = document.createElement("button");
    collapseBtn.className = "sidebar-toggle";
    collapseBtn.setAttribute("onclick", "toggleSidebar()");
    collapseBtn.title = collapseLabel;
    var collapseI = document.createElement("i");
    collapseI.setAttribute("data-lucide", toggleIconName);
    collapseBtn.appendChild(collapseI);
    var collapseSpan = document.createElement("span");
    collapseSpan.textContent = collapseLabel;
    collapseBtn.appendChild(collapseSpan);
    bottomDiv.appendChild(collapseBtn);

    sidebar.appendChild(bottomDiv);
    document.body.appendChild(sidebar);
    document.body.classList.add("nav-side");
    document.body.classList.toggle("sidebar-collapsed", collapsed);

    // Mobile header (hamburger + logo) — visible only on ≤768px via CSS
    var existingMobileHeader = document.querySelector(".mobile-header");
    if (!existingMobileHeader) {
        var mobileHeader = document.createElement("div");
        mobileHeader.className = "mobile-header";

        var hamburger = document.createElement("button");
        hamburger.className = "mobile-hamburger";
        hamburger.setAttribute("onclick", "toggleMobileSidebar()");
        var hamburgerIcon = document.createElement("i");
        hamburgerIcon.setAttribute("data-lucide", "menu");
        hamburger.appendChild(hamburgerIcon);
        mobileHeader.appendChild(hamburger);

        var mobileLogo = document.createElement("a");
        mobileLogo.href = "/pages/dashboard.html";
        var mobileLogoImg = document.createElement("img");
        mobileLogoImg.src = "/img/logo.png";
        mobileLogoImg.alt = "STAX";
        mobileLogoImg.style.height = "28px";
        mobileLogo.appendChild(mobileLogoImg);
        mobileHeader.appendChild(mobileLogo);

        var contentContainer = document.querySelector(".container-fluid.px-4.py-3");
        if (contentContainer && contentContainer.parentNode) {
            contentContainer.parentNode.insertBefore(mobileHeader, contentContainer);
        } else {
            document.body.insertBefore(mobileHeader, document.body.firstChild);
        }
    }

    // Auto-close sidebar on nav-link click (mobile)
    sidebar.querySelectorAll(".nav-link").forEach(function (link) {
        link.addEventListener("click", function () {
            closeMobileSidebar();
        });
    });

    setActiveNavLink();
    refreshIcons();
    applyAdminOnly();
    initSidebarTooltips();
}

function toggleSidebar() {
    var sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    var collapsed = sidebar.classList.toggle("collapsed");
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    localStorage.setItem("stax_sidebar_collapsed", collapsed ? "true" : "false");

    // Update toggle icon and text
    var toggleBtnEl = sidebar.querySelector(".sidebar-bottom .sidebar-toggle:last-child");
    if (toggleBtnEl) {
        var ico = toggleBtnEl.querySelector("i");
        if (ico) ico.setAttribute("data-lucide", collapsed ? "chevron-right" : "chevron-left");
        var txt = toggleBtnEl.querySelector("span");
        if (txt) txt.textContent = collapsed ? "Развернуть" : "Свернуть";
        toggleBtnEl.title = collapsed ? "Развернуть" : "Свернуть";
        refreshIcons();
    }

    initSidebarTooltips();
}

function confirmLogout() {
    // Close mobile sidebar first so confirm dialog is visible
    if (window.closeMobileSidebar) closeMobileSidebar();

    setTimeout(function () {
        showConfirm("Вы действительно хотите выйти из системы?").then(function (ok) {
            if (ok) logout();
        });
    }, 50);
}

function initSidebarTooltips() {
    var sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    // Dispose existing tooltips
    sidebar.querySelectorAll("[data-bs-toggle='tooltip']").forEach(function (el) {
        var tip = bootstrap.Tooltip.getInstance(el);
        if (tip) tip.dispose();
    });

    // Only init tooltips when collapsed
    if (sidebar.classList.contains("collapsed")) {
        sidebar.querySelectorAll("[data-bs-toggle='tooltip']").forEach(function (el) {
            new bootstrap.Tooltip(el);
        });
    }
}

function applyAdminOnly() {
    var userRole = (localStorage.getItem("stax_role") || "").toUpperCase();
    document.querySelectorAll("[data-admin-only]").forEach(function (el) {
        el.style.display = (userRole === "ADMIN") ? "" : "none";
    });
}

function toggleTheme() {
    var current = document.documentElement.getAttribute("data-bs-theme");
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-bs-theme", next);
    localStorage.setItem("stax_theme", next);
    applyTopbar(true);
}

/* ===== Mobile sidebar toggle ===== */
window.toggleMobileSidebar = function () {
    var sb = document.querySelector(".sidebar");
    if (!sb) return;
    var open = sb.classList.toggle("mobile-open");

    var ov = document.querySelector(".sidebar-overlay");
    if (open && !ov) {
        ov = document.createElement("div");
        ov.className = "sidebar-overlay";
        ov.onclick = function () { closeMobileSidebar(); };
        document.body.appendChild(ov);
    } else if (!open && ov) {
        ov.remove();
    }
};

window.closeMobileSidebar = function () {
    var sb = document.querySelector(".sidebar");
    if (sb) sb.classList.remove("mobile-open");
    var ov = document.querySelector(".sidebar-overlay");
    if (ov) ov.remove();
};
