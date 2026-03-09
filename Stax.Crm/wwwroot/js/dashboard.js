(function () {
    requireAuth();
    applyTopbar();

    // ── Greeting based on time of day ──
    (function setGreeting() {
        var h = new Date().getHours();
        var greet;
        if (h >= 5 && h < 12) greet = "Доброе утро";
        else if (h >= 12 && h < 17) greet = "Добрый день";
        else if (h >= 17 && h < 22) greet = "Добрый вечер";
        else greet = "Доброй ночи";

        var displayName = localStorage.getItem("stax_displayname") || "";
        if (!displayName) displayName = localStorage.getItem("stax_username") || "";

        var el = document.getElementById("greeting");
        if (el) el.textContent = greet + (displayName ? ", " + displayName : "") + "!";
    })();

    function fmt(n) {
        return Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 0 });
    }

    function fmtDate(s) {
        if (!s) return "";
        var d = new Date(s);
        return d.toLocaleDateString("ru-RU");
    }

    // ── Sparkline drawing ──

    function drawSparkline(canvas, points, color) {
        if (!canvas || !points || !points.length) return;

        var dpr = window.devicePixelRatio || 1;
        // Use the CSS-computed width (accounts for negative margins)
        var w = canvas.getBoundingClientRect().width;
        var h = 48;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.height = h + "px";

        var ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        var min = Infinity, max = -Infinity;
        for (var i = 0; i < points.length; i++) {
            if (points[i] < min) min = points[i];
            if (points[i] > max) max = points[i];
        }
        var range = max - min || 1;
        var padTop = 6;
        var drawH = h - padTop - 2;
        var step = w / (points.length - 1);

        // Smooth line
        ctx.beginPath();
        for (var j = 0; j < points.length; j++) {
            var x = j * step;
            var y = padTop + drawH - ((points[j] - min) / range) * drawH;
            if (j === 0) {
                ctx.moveTo(x, y);
            } else {
                // Cubic bezier for smoothness
                var prevX = (j - 1) * step;
                var cpx = (prevX + x) / 2;
                var prevY = padTop + drawH - ((points[j - 1] - min) / range) * drawH;
                ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
            }
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();

        // Fill area under
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();

        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, color.replace("rgb", "rgba").replace(")", ", 0.15)"));
        grad.addColorStop(1, color.replace("rgb", "rgba").replace(")", ", 0.01)"));
        ctx.fillStyle = grad;
        ctx.fill();
    }

    var sparkColors = {
        investors:   "rgb(245, 158, 11)",
        cars:        "rgb(59, 130, 246)",
        investments: "rgb(16, 185, 129)",
        payments:    "rgb(168, 85, 247)"
    };

    // ── Load main dashboard data ──

    api("/api/dashboard")
        .then(function (data) {
            document.getElementById("investorsCount").textContent = fmt(data.investorsCount);
            document.getElementById("carsCount").textContent = fmt(data.carsCount);
            document.getElementById("activeInvestments").textContent = fmt(data.activeInvestments);
            document.getElementById("monthPayments").textContent = fmt(data.monthPayments) + " \u20BD";
            refreshIcons();
            animateDashCards();

            var tbody = document.getElementById("upcomingBody");
            tbody.textContent = "";

            if (!data.upcoming || data.upcoming.length === 0) {
                var emptyRow = document.createElement("tr");
                var emptyTd = document.createElement("td");
                emptyTd.colSpan = 3;
                emptyTd.style.textAlign = "center";
                emptyTd.textContent = "Нет запланированных выплат";
                emptyRow.appendChild(emptyTd);
                tbody.appendChild(emptyRow);
                return;
            }

            for (var i = 0; i < data.upcoming.length; i++) {
                var u = data.upcoming[i];
                var tr = document.createElement("tr");

                var tdDate = document.createElement("td");
                tdDate.textContent = fmtDate(u.dueDate);
                tr.appendChild(tdDate);

                var tdInv = document.createElement("td");
                tdInv.textContent = u.investor;
                tr.appendChild(tdInv);

                var tdAmt = document.createElement("td");
                tdAmt.style.textAlign = "right";
                tdAmt.textContent = fmt(u.amount);
                tr.appendChild(tdAmt);

                tbody.appendChild(tr);
            }
        })
        .catch(function () {
            var tbody = document.getElementById("upcomingBody");
            tbody.textContent = "";
            var errRow = document.createElement("tr");
            var errTd = document.createElement("td");
            errTd.colSpan = 3;
            errTd.style.textAlign = "center";
            errTd.style.color = "red";
            errTd.textContent = "Ошибка загрузки";
            errRow.appendChild(errTd);
            tbody.appendChild(errRow);
        });

    // ── Click on dash cards to open chart modal ──
    document.querySelectorAll(".dash-sparkline[data-spark]").forEach(function (canvas) {
        var card = canvas.closest(".dash-card");
        if (card) {
            card.addEventListener("click", function () {
                var metric = canvas.getAttribute("data-spark");
                if (window.openChartModal) openChartModal(metric);
            });
        }
    });

    // ── Load sparkline data + auto-resize ──

    var sparklineCache = {};

    api("/api/dashboard/sparklines")
        .then(function (data) {
            var keys = ["investors", "cars", "investments", "payments"];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var canvas = document.querySelector('.dash-sparkline[data-spark="' + key + '"]');
                sparklineCache[key] = { canvas: canvas, points: data[key], color: sparkColors[key] };
                drawSparkline(canvas, data[key], sparkColors[key]);
            }
            // Redraw sparklines when cards resize (e.g. sidebar collapse/expand)
            if (window.ResizeObserver) {
                var ro = new ResizeObserver(function () {
                    for (var k in sparklineCache) {
                        var c = sparklineCache[k];
                        drawSparkline(c.canvas, c.points, c.color);
                    }
                });
                for (var j = 0; j < keys.length; j++) {
                    var cv = sparklineCache[keys[j]].canvas;
                    if (cv && cv.parentElement) ro.observe(cv.parentElement);
                }
            }
        })
        .catch(function () {
            // Sparklines are decorative — fail silently
        });
})();
