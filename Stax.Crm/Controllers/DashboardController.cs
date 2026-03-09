using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stax.Domain.Enums;
using Stax.Persistence;

namespace Stax.Crm.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly StaxDbContext _db;
    public DashboardController(StaxDbContext db) => _db = db;

    private static string BuildFullName(Stax.Domain.Entities.Investor? inv)
    {
        if (inv == null) return "";
        return inv.Patronymic == null
            ? $"{inv.LastName} {inv.FirstName}"
            : $"{inv.LastName} {inv.FirstName} {inv.Patronymic}";
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var investorsCount = await _db.Investors.CountAsync();
        var carsCount = await _db.Cars.CountAsync();

        var activeInvestments = await _db.Investments
            .Where(x => x.Status == InvestmentStatus.ACTIVE)
            .CountAsync();

        var now = DateTimeOffset.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var monthPayments = await _db.Payments
            .Where(p => p.PaidAt >= monthStart && p.PaidAt < monthEnd)
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var upcoming = await _db.PayoutSchedules
            .Include(s => s.Investment).ThenInclude(i => i.Investor)
            .Where(s => s.Status == ScheduleStatus.PLANNED && s.DueDate >= DateTime.Today)
            .OrderBy(s => s.DueDate)
            .Take(5)
            .Select(s => new
            {
                id = s.Id,
                dueDate = s.DueDate,
                amount = s.PlannedAmount,
                investor = s.Investment != null ? BuildFullName(s.Investment.Investor) : ""
            })
            .ToListAsync();

        return Ok(new
        {
            investorsCount,
            carsCount,
            activeInvestments,
            monthPayments,
            upcoming
        });
    }

    [HttpGet("sparklines")]
    public async Task<IActionResult> Sparklines()
    {
        var today = DateTime.Today;
        var from = today.AddDays(-29); // 30 days including today

        // Investors: cumulative count per day
        var investorDates = await _db.Investors
            .Select(x => x.CreatedAt.Date)
            .ToListAsync();

        // Cars: cumulative count per day
        var carDates = await _db.Cars
            .Select(x => x.CreatedAt.Date)
            .ToListAsync();

        // Investments: created dates of active ones
        var investmentDates = await _db.Investments
            .Where(x => x.Status == InvestmentStatus.ACTIVE)
            .Select(x => x.CreatedAt.Date)
            .ToListAsync();

        // Payments: amount per day in the last 30 days
        var paymentsByDay = await _db.Payments
            .Where(p => p.PaidAt >= from && p.PaidAt <= today)
            .GroupBy(p => p.PaidAt)
            .Select(g => new { day = g.Key, sum = g.Sum(p => p.Amount) })
            .ToListAsync();

        var paymentMap = paymentsByDay.ToDictionary(x => x.day, x => x.sum);

        var investors = new List<int>(30);
        var cars = new List<int>(30);
        var investments = new List<int>(30);
        var payments = new List<decimal>(30);

        for (var d = from; d <= today; d = d.AddDays(1))
        {
            investors.Add(investorDates.Count(dt => dt <= d));
            cars.Add(carDates.Count(dt => dt <= d));
            investments.Add(investmentDates.Count(dt => dt <= d));
            payments.Add(paymentMap.TryGetValue(d, out var amt) ? amt : 0m);
        }

        return Ok(new { investors, cars, investments, payments });
    }

    [HttpGet("chart/{metric}")]
    public async Task<IActionResult> Chart(string metric, [FromQuery] string? from, [FromQuery] string? to)
    {
        var dateFrom = DateTime.TryParse(from, out var df) ? df : DateTime.Today.AddYears(-1);
        var dateTo = DateTime.TryParse(to, out var dt) ? dt : DateTime.Today;

        if (dateTo < dateFrom) dateTo = dateFrom.AddMonths(1);
        if ((dateTo - dateFrom).TotalDays > 3650) dateFrom = dateTo.AddYears(-10);

        var result = new List<object>();

        switch (metric.ToLower())
        {
            case "investors":
            {
                var dates = await _db.Investors
                    .Select(x => x.CreatedAt.Date)
                    .ToListAsync();
                for (var d = dateFrom; d <= dateTo; d = d.AddDays(1))
                {
                    result.Add(new { date = d.ToString("yyyy-MM-dd"), value = dates.Count(x => x <= d) });
                }
                break;
            }
            case "cars":
            {
                var dates = await _db.Cars
                    .Select(x => x.CreatedAt.Date)
                    .ToListAsync();
                for (var d = dateFrom; d <= dateTo; d = d.AddDays(1))
                {
                    result.Add(new { date = d.ToString("yyyy-MM-dd"), value = dates.Count(x => x <= d) });
                }
                break;
            }
            case "investments":
            {
                var dates = await _db.Investments
                    .Where(x => x.Status == InvestmentStatus.ACTIVE)
                    .Select(x => x.CreatedAt.Date)
                    .ToListAsync();
                for (var d = dateFrom; d <= dateTo; d = d.AddDays(1))
                {
                    result.Add(new { date = d.ToString("yyyy-MM-dd"), value = dates.Count(x => x <= d) });
                }
                break;
            }
            case "payments":
            {
                var paymentsByDay = await _db.Payments
                    .Where(p => p.PaidAt >= dateFrom && p.PaidAt <= dateTo)
                    .GroupBy(p => p.PaidAt)
                    .Select(g => new { day = g.Key, sum = g.Sum(p => p.Amount) })
                    .ToListAsync();
                var map = paymentsByDay.ToDictionary(x => x.day, x => x.sum);
                for (var d = dateFrom; d <= dateTo; d = d.AddDays(1))
                {
                    result.Add(new { date = d.ToString("yyyy-MM-dd"), value = map.TryGetValue(d, out var amt) ? amt : 0m });
                }
                break;
            }
            default:
                return BadRequest(new { message = "Неизвестная метрика: " + metric });
        }

        return Ok(result);
    }
}
