using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Stax.Persistence;

namespace Stax.Crm.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly StaxDbContext _db;
    private readonly IWebHostEnvironment _env;

    public ReportsController(StaxDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private static string BuildFullName(Stax.Domain.Entities.Investor inv)
        => inv.Patronymic == null
            ? $"{inv.LastName} {inv.FirstName}"
            : $"{inv.LastName} {inv.FirstName} {inv.Patronymic}";

    // GET /api/reports/payments?dateFrom=2026-01-01&dateTo=2026-01-31
    [HttpGet("payments")]
    public async Task<IActionResult> Payments([FromQuery] DateTime? dateFrom = null, [FromQuery] DateTime? dateTo = null, [FromQuery] long? investorId = null)
    {
        var q = _db.Payments
            .AsNoTracking()
            .Include(p => p.Investment).ThenInclude(i => i.Investor)
            .AsQueryable();

        if (dateFrom.HasValue)
            q = q.Where(p => p.PaidAt >= dateFrom.Value.Date);

        if (dateTo.HasValue)
            q = q.Where(p => p.PaidAt <= dateTo.Value.Date);

        if (investorId.HasValue)
            q = q.Where(p => p.Investment != null && p.Investment.InvestorId == investorId.Value);

        var rows = await q
            .Where(p => p.Investment != null && p.Investment.Investor != null)
            .Select(p => new
            {
                Investor = BuildFullName(p.Investment!.Investor!),
                Amount = p.Amount
            })
            .ToListAsync();

        var result = rows
            .GroupBy(x => x.Investor)
            .Select(g => new
            {
                investor = g.Key,
                sumPayments = g.Sum(x => x.Amount),
                countPayments = g.Count()
            })
            .OrderBy(x => x.investor)
            .ToList();

        return Ok(result);
    }

    // ✅ GET /api/reports/payments.pdf?dateFrom=2026-01-01&dateTo=2026-01-31
    [HttpGet("payments.pdf")]
    public async Task<IActionResult> PaymentsPdf([FromQuery] DateTime? dateFrom = null, [FromQuery] DateTime? dateTo = null, [FromQuery] long? investorId = null)
    {
        if (!dateFrom.HasValue || !dateTo.HasValue)
            return BadRequest(new { message = "Укажи dateFrom и dateTo" });

        var from = dateFrom.Value.Date;
        var to = dateTo.Value.Date;

        var q = _db.Payments
            .AsNoTracking()
            .Include(p => p.Investment).ThenInclude(i => i.Investor)
            .AsQueryable();

        q = q.Where(p => p.PaidAt >= from && p.PaidAt <= to);

        if (investorId.HasValue)
            q = q.Where(p => p.Investment != null && p.Investment.InvestorId == investorId.Value);

        var rows = await q
            .Where(p => p.Investment != null && p.Investment.Investor != null)
            .Select(p => new
            {
                Investor = BuildFullName(p.Investment!.Investor!),
                Amount = p.Amount
            })
            .ToListAsync();

        var result = rows
            .GroupBy(x => x.Investor)
            .Select(g => new
            {
                Investor = g.Key,
                SumPayments = g.Sum(x => x.Amount),
                CountPayments = g.Count()
            })
            .OrderBy(x => x.Investor)
            .ToList();

        // логотип
        byte[]? logoBytes = null;
        var logoPath = Path.Combine(_env.WebRootPath, "img", "logo.png");
        if (System.IO.File.Exists(logoPath))
            logoBytes = await System.IO.File.ReadAllBytesAsync(logoPath);

        QuestPDF.Settings.License = LicenseType.Community;

        // Заголовок PDF: если выбран конкретный инвестор
        string? investorName = null;
        if (investorId.HasValue)
        {
            var inv = await _db.Investors.AsNoTracking().FirstOrDefaultAsync(i => i.Id == investorId.Value);
            if (inv != null) investorName = BuildFullName(inv);
        }

        var fromStr = from.ToString("dd.MM.yyyy");
        var toStr = to.ToString("dd.MM.yyyy");

        var totalSum = result.Sum(x => x.SumPayments);
        var totalCount = result.Sum(x => x.CountPayments);

        var generatedAt = DateTime.Now.ToString("dd.MM.yyyy HH:mm");

        var pdfBytes = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(28);
                page.DefaultTextStyle(x => x.FontSize(11));

                // ===== HEADER =====
                page.Header().Column(col =>
                {
                    col.Item().Row(r =>
                    {
                        // ЛОГО: фиксируем коробку и включаем FitArea
                        if (logoBytes != null)
                        {
                            r.ConstantItem(90)
                             .Height(42)
                             .Width(90)
                             .AlignMiddle()
                             .AlignLeft()
                             .Image(logoBytes, ImageScaling.FitArea);
                        }
                        else
                        {
                            r.ConstantItem(90).Height(42);
                        }

                        r.RelativeItem().AlignCenter().Column(c =>
                        {
                            var title = investorName != null
                                ? $"ОТЧЕТ ПО ВЫПЛАТАМ ИНВЕСТОРУ {investorName}"
                                : "ОТЧЕТ ПО ВЫПЛАТАМ ИНВЕСТОРАМ";
                            c.Item().Text(title)
                                .Bold().FontSize(16).AlignCenter();

                            c.Item().Text($"за период с {fromStr} по {toStr}")
                                .FontSize(12).AlignCenter();
                        });
                    });

                    col.Item().PaddingTop(10).LineHorizontal(1);
                });

                // ===== CONTENT =====
                page.Content().PaddingTop(14).Column(col =>
                {
                    if (result.Count == 0)
                    {
                        col.Item().PaddingVertical(20).AlignCenter()
                            .Text("Нет данных за выбранный период").Italic().FontSize(12);
                        return;
                    }

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(28);    // №
                            columns.RelativeColumn(7);     // Инвестор
                            columns.RelativeColumn(3);     // Сумма
                            columns.RelativeColumn(2);     // Кол-во
                        });

                        // header row
                        table.Header(h =>
                        {
                            h.Cell().Element(CellHeader).AlignCenter().Text("№");
                            h.Cell().Element(CellHeader).Text("Инвестор");
                            h.Cell().Element(CellHeader).AlignRight().Text("Сумма, ₽");
                            h.Cell().Element(CellHeader).AlignRight().Text("Кол-во");

                            static IContainer CellHeader(IContainer c) =>
                                c.DefaultTextStyle(x => x.SemiBold())
                                 .PaddingVertical(6)
                                 .PaddingHorizontal(6)
                                 .Background(Colors.Grey.Lighten3)
                                 .Border(1)
                                 .BorderColor(Colors.Grey.Lighten1);
                        });

                        // body
                        for (int i = 0; i < result.Count; i++)
                        {
                            var r = result[i];

                            table.Cell().Element(CellBody).AlignCenter().Text((i + 1).ToString());
                            table.Cell().Element(CellBody).Text(r.Investor);
                            table.Cell().Element(CellBody).AlignRight().Text(r.SumPayments.ToString("0.00"));
                            table.Cell().Element(CellBody).AlignRight().Text(r.CountPayments.ToString());

                            static IContainer CellBody(IContainer c) =>
                                c.PaddingVertical(5)
                                 .PaddingHorizontal(6)
                                 .BorderBottom(1)
                                 .BorderColor(Colors.Grey.Lighten2);
                        }
                    });

                    // итоги
                    col.Item().PaddingTop(12).LineHorizontal(1);
                    col.Item().PaddingTop(8).Row(r =>
                    {
                        r.RelativeItem().Text("ИТОГО:").Bold();
                        r.ConstantItem(120).AlignRight().Text($"{totalSum:0.00} ₽").Bold();
                        r.ConstantItem(90).AlignRight().Text($"{totalCount} выплат").Bold();
                    });
                });

                // ===== FOOTER =====
                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("Сформировано: ").SemiBold();
                    t.Span(generatedAt);
                    t.Span(" • STAX CRM");
                });
            });
        }).GeneratePdf();

        var fileName = $"payments_report_{from:yyyyMMdd}_{to:yyyyMMdd}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }

    // (опционально оставить CSV, если надо)
    [HttpGet("payments.csv")]
    public async Task<IActionResult> PaymentsCsv([FromQuery] DateTime? dateFrom = null, [FromQuery] DateTime? dateTo = null, [FromQuery] long? investorId = null)
    {
        if (!dateFrom.HasValue || !dateTo.HasValue)
            return BadRequest(new { message = "Укажи dateFrom и dateTo" });

        var from = dateFrom.Value.Date;
        var to = dateTo.Value.Date;

        var q = _db.Payments
            .AsNoTracking()
            .Include(p => p.Investment).ThenInclude(i => i.Investor)
            .Where(p => p.PaidAt >= from && p.PaidAt <= to);

        if (investorId.HasValue)
            q = q.Where(p => p.Investment != null && p.Investment.InvestorId == investorId.Value);

        var rows = await q
            .Where(p => p.Investment != null && p.Investment.Investor != null)
            .Select(p => new
            {
                Investor = BuildFullName(p.Investment!.Investor!),
                Amount = p.Amount
            })
            .ToListAsync();

        var result = rows
            .GroupBy(x => x.Investor)
            .Select(g => new
            {
                Investor = g.Key,
                SumPayments = g.Sum(x => x.Amount),
                CountPayments = g.Count()
            })
            .OrderBy(x => x.Investor)
            .ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Investor,SumPayments,CountPayments");
        foreach (var r in result)
        {
            var investor = r.Investor.Replace("\"", "\"\"");
            sb.AppendLine($"\"{investor}\",{r.SumPayments},{r.CountPayments}");
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv; charset=utf-8", "payments_report.csv");
    }
}