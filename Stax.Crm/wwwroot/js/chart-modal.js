// chart-modal.js — Fullscreen interactive chart modal
(function () {
    var animate = Motion.animate;

    var METRIC_LABELS = {
        investors: "Инвесторы",
        cars: "Автомобили",
        investments: "Активные инвестиции",
        payments: "Выплаты"
    };

    var METRIC_COLORS = {
        investors: "rgb(245, 158, 11)",
        cars: "rgb(59, 130, 246)",
        investments: "rgb(16, 185, 129)",
        payments: "rgb(168, 85, 247)"
    };

    var PERIOD_OPTIONS = [
        { label: "30 дн", days: 30 },
        { label: "90 дн", days: 90 },
        { label: "6 мес", days: 182 },
        { label: "1 год", days: 365 },
        { label: "Всё", days: 0 }
    ];

    // ── Utility ──

    function fmtDateShort(s) {
        var d = new Date(s);
        var dd = String(d.getDate()).padStart(2, "0");
        var mm = String(d.getMonth() + 1).padStart(2, "0");
        return dd + "." + mm;
    }

    function fmtDateFull(s) {
        var d = new Date(s);
        return d.toLocaleDateString("ru-RU");
    }

    function fmtValue(v, metric) {
        var n = Number(v);
        if (metric === "payments") {
            return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " \u20BD";
        }
        return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
    }

    function toISO(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, "0");
        var d = String(date.getDate()).padStart(2, "0");
        return y + "-" + m + "-" + d;
    }

    // ── Main chart drawing ──

    function drawChart(canvas, data, color, viewState) {
        if (!canvas || !data || !data.length) return;

        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.parentElement.getBoundingClientRect();
        var w = rect.width;
        var h = rect.height;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";

        var ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        // Visible range based on offset and zoom
        var totalPoints = data.length;
        var visibleCount = Math.min(Math.floor(totalPoints / viewState.zoom), totalPoints);
        if (visibleCount < 7) visibleCount = Math.min(7, totalPoints);

        var startIdx = Math.max(0, Math.min(viewState.offset, totalPoints - visibleCount));
        var endIdx = Math.min(startIdx + visibleCount, totalPoints);
        viewState.offset = startIdx;

        var visibleData = data.slice(startIdx, endIdx);
        if (!visibleData.length) return;

        // Padding
        var padLeft = 60;
        var padRight = 20;
        var padTop = 20;
        var padBottom = 40;
        var drawW = w - padLeft - padRight;
        var drawH = h - padTop - padBottom;

        // Find min/max
        var min = Infinity, max = -Infinity;
        for (var i = 0; i < visibleData.length; i++) {
            var v = Number(visibleData[i].value);
            if (v < min) min = v;
            if (v > max) max = v;
        }
        var range = max - min || 1;
        var yPad = range * 0.1;
        min = Math.max(0, min - yPad);
        max += yPad;
        range = max - min || 1;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Grid lines
        var gridLines = 5;
        ctx.strokeStyle = "rgba(128,128,128,0.15)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (var g = 0; g <= gridLines; g++) {
            var gy = padTop + drawH - (g / gridLines) * drawH;
            ctx.beginPath();
            ctx.moveTo(padLeft, gy);
            ctx.lineTo(w - padRight, gy);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Y-axis labels
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "rgba(128,128,128,0.8)";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (var g2 = 0; g2 <= gridLines; g2++) {
            var val = min + (g2 / gridLines) * range;
            var gy2 = padTop + drawH - (g2 / gridLines) * drawH;
            var label = val >= 1000 ? Math.round(val / 1000) + "k" : Math.round(val);
            ctx.fillText(label, padLeft - 8, gy2);
        }

        // X-axis labels
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        var labelInterval = Math.max(1, Math.floor(visibleData.length / 8));
        for (var xi = 0; xi < visibleData.length; xi += labelInterval) {
            var lx = padLeft + (xi / (visibleData.length - 1 || 1)) * drawW;
            ctx.fillText(fmtDateShort(visibleData[xi].date), lx, h - padBottom + 8);
        }
        // Always show last date
        if (visibleData.length > 1) {
            var lastX = padLeft + drawW;
            ctx.fillText(fmtDateShort(visibleData[visibleData.length - 1].date), lastX, h - padBottom + 8);
        }

        // Animated drawing progress
        var progress = viewState.animProgress !== undefined ? viewState.animProgress : 1;
        var drawCount = Math.floor(visibleData.length * progress);
        if (drawCount < 2) drawCount = Math.min(2, visibleData.length);

        // Line
        var step = drawW / (visibleData.length - 1 || 1);
        ctx.beginPath();
        for (var j = 0; j < drawCount; j++) {
            var px = padLeft + j * step;
            var py = padTop + drawH - ((Number(visibleData[j].value) - min) / range) * drawH;
            if (j === 0) {
                ctx.moveTo(px, py);
            } else {
                var prevX = padLeft + (j - 1) * step;
                var cpx = (prevX + px) / 2;
                var prevY = padTop + drawH - ((Number(visibleData[j - 1].value) - min) / range) * drawH;
                ctx.bezierCurveTo(cpx, prevY, cpx, py, px, py);
            }
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();

        // Fill under
        var lastDrawX = padLeft + (drawCount - 1) * step;
        ctx.lineTo(lastDrawX, padTop + drawH);
        ctx.lineTo(padLeft, padTop + drawH);
        ctx.closePath();

        var grad = ctx.createLinearGradient(0, padTop, 0, padTop + drawH);
        grad.addColorStop(0, color.replace("rgb", "rgba").replace(")", ", 0.2)"));
        grad.addColorStop(1, color.replace("rgb", "rgba").replace(")", ", 0.02)"));
        ctx.fillStyle = grad;
        ctx.fill();

        // Dots on data points (if not too many)
        if (visibleData.length <= 60) {
            for (var d = 0; d < drawCount; d++) {
                var dx = padLeft + d * step;
                var dy = padTop + drawH - ((Number(visibleData[d].value) - min) / range) * drawH;
                ctx.beginPath();
                ctx.arc(dx, dy, 3, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = "var(--bs-body-bg, #fff)";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        // Save geometry for tooltip hit-testing
        viewState._geo = {
            padLeft: padLeft, padRight: padRight, padTop: padTop,
            padBottom: padBottom, drawW: drawW, drawH: drawH,
            min: min, range: range, step: step,
            visibleData: visibleData, w: w, h: h
        };
    }

    // ── Tooltip on hover/touch ──

    function showTooltip(canvas, clientX, clientY, viewState, metric, tooltip, data, color) {
        var geo = viewState._geo;
        if (!geo) return;

        var rect = canvas.getBoundingClientRect();
        var mx = clientX - rect.left;

        // Find nearest point
        var idx = Math.round((mx - geo.padLeft) / geo.step);
        if (idx < 0 || idx >= geo.visibleData.length) {
            tooltip.style.display = "none";
            // Redraw to clear old highlight
            drawChart(canvas, data, color, viewState);
            return;
        }

        var point = geo.visibleData[idx];
        var px = geo.padLeft + idx * geo.step;
        var py = geo.padTop + geo.drawH - ((Number(point.value) - geo.min) / geo.range) * geo.drawH;

        tooltip.textContent = fmtDateFull(point.date) + ": " + fmtValue(point.value, metric);
        tooltip.style.display = "block";

        // Position tooltip
        var tw = tooltip.offsetWidth;
        var left = px - tw / 2;
        if (left < 4) left = 4;
        if (left + tw > geo.w - 4) left = geo.w - tw - 4;
        tooltip.style.left = left + "px";
        tooltip.style.top = (py - 32) + "px";

        // Redraw chart cleanly, then draw highlight on top
        drawChart(canvas, data, color, viewState);

        var dpr = window.devicePixelRatio || 1;
        var ctx = canvas.getContext("2d");
        ctx.save();
        ctx.scale(dpr, dpr);

        // Vertical crosshair line
        ctx.beginPath();
        ctx.moveTo(px, geo.padTop);
        ctx.lineTo(px, geo.padTop + geo.drawH);
        ctx.strokeStyle = "rgba(128,128,128,0.3)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Highlight dot
        var clr = METRIC_COLORS[metric];
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fillStyle = clr.replace("rgb", "rgba").replace(")", ", 0.25)");
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = clr;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    // ── Open chart modal ──

    window.openChartModal = function (metric) {
        var color = METRIC_COLORS[metric] || METRIC_COLORS.investors;
        var label = METRIC_LABELS[metric] || metric;

        // State
        var viewState = { offset: 0, zoom: 1, animProgress: 0 };
        var allData = [];
        var filteredData = [];
        var selectedPeriod = 4; // "Всё" by default

        // Overlay
        var overlay = document.createElement("div");
        overlay.className = "chart-modal-overlay";

        // Container
        var container = document.createElement("div");
        container.className = "chart-modal";

        // Header
        var header = document.createElement("div");
        header.className = "chart-modal-header";

        var swipeHandle = document.createElement("div");
        swipeHandle.className = "modal-swipe-handle";
        header.appendChild(swipeHandle);

        var titleEl = document.createElement("h3");
        titleEl.textContent = label;
        header.appendChild(titleEl);

        var closeBtn = document.createElement("button");
        closeBtn.className = "chart-modal-close";
        var closeIcon = document.createElement("i");
        closeIcon.setAttribute("data-lucide", "x");
        closeBtn.appendChild(closeIcon);
        header.appendChild(closeBtn);

        container.appendChild(header);

        // Period filter buttons
        var filterBar = document.createElement("div");
        filterBar.className = "chart-modal-filters";

        var periodBtns = [];
        for (var p = 0; p < PERIOD_OPTIONS.length; p++) {
            (function (idx) {
                var btn = document.createElement("button");
                btn.className = "chart-filter-btn" + (idx === selectedPeriod ? " active" : "");
                btn.textContent = PERIOD_OPTIONS[idx].label;
                btn.addEventListener("click", function () {
                    selectedPeriod = idx;
                    for (var k = 0; k < periodBtns.length; k++) {
                        periodBtns[k].classList.toggle("active", k === idx);
                    }
                    applyFilter();
                });
                periodBtns.push(btn);
                filterBar.appendChild(btn);
            })(p);
        }
        container.appendChild(filterBar);

        // Summary stats
        var statsBar = document.createElement("div");
        statsBar.className = "chart-modal-stats";
        container.appendChild(statsBar);

        // Chart wrapper
        var chartWrap = document.createElement("div");
        chartWrap.className = "chart-modal-canvas-wrap";

        var canvas = document.createElement("canvas");
        chartWrap.appendChild(canvas);

        var tooltip = document.createElement("div");
        tooltip.className = "chart-tooltip";
        chartWrap.appendChild(tooltip);

        // Loading
        var loader = document.createElement("div");
        loader.className = "chart-modal-loader";
        loader.textContent = "Загрузка данных...";
        chartWrap.appendChild(loader);

        container.appendChild(chartWrap);

        // Footer with date range info
        var navBar = document.createElement("div");
        navBar.className = "chart-modal-nav";

        var zoomInfo = document.createElement("span");
        zoomInfo.className = "chart-zoom-info";

        var hintEl = document.createElement("span");
        hintEl.className = "chart-zoom-hint";
        hintEl.textContent = "Перетаскивание — сдвиг по времени";

        navBar.appendChild(zoomInfo);
        navBar.appendChild(hintEl);
        container.appendChild(navBar);

        overlay.appendChild(container);
        document.body.appendChild(overlay);
        refreshIcons();

        // Entrance animation
        animate(overlay, { opacity: [0, 1] }, { duration: 0.2 });
        animate(container, { opacity: [0, 1], y: [40, 0], scale: [0.95, 1] }, { duration: 0.35, ease: "ease-out" });

        // ── Close logic ──
        function closeModal() {
            animate(container, { opacity: [1, 0], y: [0, 30], scale: [1, 0.97] }, { duration: 0.2, ease: "ease-in" })
                .then(function () {
                    overlay.remove();
                });
            animate(overlay, { opacity: [1, 0] }, { duration: 0.25 });
        }

        closeBtn.addEventListener("click", closeModal);
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) closeModal();
        });
        document.addEventListener("keydown", function onKey(e) {
            if (e.key === "Escape") {
                document.removeEventListener("keydown", onKey);
                closeModal();
            }
        });

        // Swipe down to dismiss (mobile)
        _addSwipeToDismiss(container, closeModal);

        // ── Apply filter & redraw ──
        function applyFilter() {
            var days = PERIOD_OPTIONS[selectedPeriod].days;
            if (days === 0 || days >= allData.length) {
                filteredData = allData.slice();
            } else {
                filteredData = allData.slice(allData.length - days);
            }
            viewState.offset = 0;
            viewState.zoom = 1;
            animateChart();
            updateStats();
            updateZoomInfo();
        }

        function updateStats() {
            statsBar.textContent = "";
            if (!filteredData.length) return;

            var vals = filteredData.map(function (d) { return Number(d.value); });
            var current = vals[vals.length - 1];
            var minV = Math.min.apply(null, vals);
            var maxV = Math.max.apply(null, vals);
            var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;

            var stats = [
                { label: "Текущее", value: fmtValue(current, metric) },
                { label: "Мин", value: fmtValue(minV, metric) },
                { label: "Макс", value: fmtValue(maxV, metric) },
                { label: "Среднее", value: fmtValue(avg, metric) }
            ];

            for (var s = 0; s < stats.length; s++) {
                var item = document.createElement("div");
                item.className = "chart-stat-item";
                var lbl = document.createElement("div");
                lbl.className = "chart-stat-label";
                lbl.textContent = stats[s].label;
                var val = document.createElement("div");
                val.className = "chart-stat-value";
                val.textContent = stats[s].value;
                item.appendChild(lbl);
                item.appendChild(val);
                statsBar.appendChild(item);
            }

            animate(statsBar, { opacity: [0, 1], y: [8, 0] }, { duration: 0.3 });
        }

        function updateZoomInfo() {
            var totalPoints = filteredData.length;
            var visibleCount = Math.min(Math.floor(totalPoints / viewState.zoom), totalPoints);
            if (visibleCount < 7) visibleCount = Math.min(7, totalPoints);
            var startIdx = Math.max(0, Math.min(viewState.offset, totalPoints - visibleCount));
            var endIdx = Math.min(startIdx + visibleCount, totalPoints);
            if (filteredData[startIdx] && filteredData[endIdx - 1]) {
                zoomInfo.textContent = fmtDateFull(filteredData[startIdx].date) + " — " + fmtDateFull(filteredData[endIdx - 1].date);
            }
        }

        function animateChart() {
            viewState.animProgress = 0;
            var start = performance.now();
            var duration = 600;

            function frame(now) {
                var elapsed = now - start;
                viewState.animProgress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                var t = viewState.animProgress;
                viewState.animProgress = 1 - Math.pow(1 - t, 3);
                drawChart(canvas, filteredData, color, viewState);
                if (t < 1) requestAnimationFrame(frame);
            }

            requestAnimationFrame(frame);
        }

        function redraw() {
            viewState.animProgress = 1;
            drawChart(canvas, filteredData, color, viewState);
            updateZoomInfo();
        }

        // ── Touch/mouse panning on canvas ──
        var dragStartX = 0;
        var dragOffsetStart = 0;
        var isDragging = false;

        canvas.addEventListener("mousedown", function (e) {
            isDragging = true;
            dragStartX = e.clientX;
            dragOffsetStart = viewState.offset;
            canvas.style.cursor = "grabbing";
        });

        window.addEventListener("mousemove", function onMM(e) {
            if (!isDragging) {
                // Tooltip on hover
                showTooltip(canvas, e.clientX, e.clientY, viewState, metric, tooltip, filteredData, color);
                return;
            }
            var dx = e.clientX - dragStartX;
            var totalPoints = filteredData.length;
            var visibleCount = Math.min(Math.floor(totalPoints / viewState.zoom), totalPoints);
            var geo = viewState._geo;
            if (!geo) return;
            var pxPerPoint = geo.drawW / (visibleCount - 1 || 1);
            var pointsDelta = Math.round(-dx / pxPerPoint);
            viewState.offset = Math.max(0, Math.min(totalPoints - visibleCount, dragOffsetStart + pointsDelta));
            redraw();
        });

        window.addEventListener("mouseup", function onMU() {
            if (isDragging) {
                isDragging = false;
                canvas.style.cursor = "crosshair";
            }
        });

        canvas.addEventListener("mouseleave", function () {
            tooltip.style.display = "none";
            redraw();
        });

        // Touch panning
        var touchStartX = 0;
        var touchOffsetStart = 0;

        canvas.addEventListener("touchstart", function (e) {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchOffsetStart = viewState.offset;
            }
        }, { passive: true });

        canvas.addEventListener("touchmove", function (e) {
            if (e.touches.length === 1) {
                var dx = e.touches[0].clientX - touchStartX;
                var totalPoints = filteredData.length;
                var visibleCount = Math.min(Math.floor(totalPoints / viewState.zoom), totalPoints);
                var geo = viewState._geo;
                if (!geo) return;
                var pxPerPoint = geo.drawW / (visibleCount - 1 || 1);
                var pointsDelta = Math.round(-dx / pxPerPoint);
                viewState.offset = Math.max(0, Math.min(totalPoints - visibleCount, touchOffsetStart + pointsDelta));
                redraw();
            }
        }, { passive: true });

        canvas.addEventListener("touchend", function (e) {
            // Show tooltip at last touch point
            if (e.changedTouches.length === 1) {
                showTooltip(canvas, e.changedTouches[0].clientX, e.changedTouches[0].clientY, viewState, metric, tooltip, filteredData, color);
            }
        });

        // Zoom removed — period filters are sufficient

        // ── Resize ──
        var resizeTimer;
        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(redraw, 100);
        });

        // ── Load data ──
        api("/api/dashboard/chart/" + metric)
            .then(function (data) {
                loader.style.display = "none";
                allData = data || [];
                applyFilter();
            })
            .catch(function (err) {
                loader.textContent = "Ошибка загрузки: " + (err.message || err);
                loader.style.color = "red";
            });
    };
})();
