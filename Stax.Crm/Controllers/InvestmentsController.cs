using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Stax.Domain.Entities;
using Stax.Domain.Enums;
using Stax.Dto.Investments;
using Stax.Persistence;
using Stax.Persistence.Services;

namespace Stax.Crm.Controllers;

[ApiController]
[Route("api/investments")]
[Authorize]
public class InvestmentsController : ControllerBase
{
    private readonly StaxDbContext _db;
    private readonly InvestmentCalculator _calc;
    private readonly PayoutScheduleBuilder _builder;

    public InvestmentsController(StaxDbContext db, InvestmentCalculator calc, PayoutScheduleBuilder builder)
    {
        _db = db;
        _calc = calc;
        _builder = builder;
    }

    private static string BuildFullName(Investor? inv)
    {
        if (inv == null) return "";
        return inv.Patronymic == null
            ? $"{inv.LastName} {inv.FirstName}"
            : $"{inv.LastName} {inv.FirstName} {inv.Patronymic}";
    }

    private static PayoutType ParsePayoutTypeOrThrow(string? payoutType)
    {
        var s = (payoutType ?? "").Trim().ToUpperInvariant();
        if (s != "MONTHLY" && s != "QUARTERLY" && s != "END_OF_TERM")
            throw new Exception("Некорректный PayoutType (MONTHLY / QUARTERLY / END_OF_TERM)");
        return Enum.Parse<PayoutType>(s, ignoreCase: false);
    }

    private static InvestmentStatus ParseInvestmentStatusOrThrow(string? status)
    {
        var s = (status ?? "").Trim().ToUpperInvariant();
        if (s != "ACTIVE" && s != "CLOSED" && s != "CANCELED")
            throw new Exception("Некорректный Status (ACTIVE / CLOSED / CANCELED)");
        return Enum.Parse<InvestmentStatus>(s, ignoreCase: false);
    }

    [HttpGet]
    public async Task<ActionResult<List<InvestmentListItemDto>>> GetAll([FromQuery] string? q = null)
    {
        var query = _db.Investments
            .Include(x => x.Investor)
            .Include(x => x.Car)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var s = q.Trim().ToLowerInvariant();
            query = query.Where(x =>
                (x.Investor != null &&
                    (x.Investor.LastName.ToLower().Contains(s) ||
                     x.Investor.FirstName.ToLower().Contains(s) ||
                     (x.Investor.Patronymic != null && x.Investor.Patronymic.ToLower().Contains(s))
                    )
                )
                ||
                (x.Car != null && (x.Car.MakeModel.ToLower().Contains(s) || x.Car.PlateNumber.ToLower().Contains(s)))
            );
        }

        var list = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new InvestmentListItemDto
            {
                Id = x.Id,
                Investor = BuildFullName(x.Investor),
                Car = x.Car != null ? x.Car.MakeModel + " (" + x.Car.PlateNumber + ")" : "",
                PrincipalAmount = x.PrincipalAmount,
                Status = x.Status.ToString() // enum -> string
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<InvestmentViewDto>> Get(long id)
    {
        var inv = await _db.Investments
            .Include(x => x.Investor)
            .Include(x => x.Car)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (inv == null) return NotFound(new { message = "Инвестиция не найдена" });

        var sched = await _db.PayoutSchedules
            .Where(s => s.InvestmentId == id)
            .OrderBy(s => s.PeriodNo)
            .Select(s => new PayoutScheduleDto
            {
                Id = s.Id,
                PeriodNo = s.PeriodNo,
                DueDate = s.DueDate,
                PlannedAmount = s.PlannedAmount,
                Status = s.Status.ToString()
            })
            .ToListAsync();

        var totalPaid = await _db.Payments
            .Where(p => p.InvestmentId == id)
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        return Ok(new InvestmentViewDto
        {
            Id = inv.Id,
            InvestorId = inv.InvestorId,
            CarId = inv.CarId,
            Investor = BuildFullName(inv.Investor),
            Car = inv.Car != null ? inv.Car.MakeModel + " (" + inv.Car.PlateNumber + ")" : "",
            PrincipalAmount = inv.PrincipalAmount,
            InterestRatePercent = inv.InterestRatePercent,
            StartDate = inv.StartDate,
            TermMonths = inv.TermMonths,
            PayoutType = inv.PayoutType.ToString(),
            RegularPayoutAmount = inv.RegularPayoutAmount,
            TotalReturnAmount = inv.TotalReturnAmount,
            Status = inv.Status.ToString(),
            Schedule = sched,
            TotalPaid = totalPaid
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] InvestmentCreateDto dto)
    {
        var now = DateTimeOffset.UtcNow;

        try
        {
            if (dto.PrincipalAmount <= 0)
                return BadRequest(new { message = "Сумма должна быть больше 0" });
            if (dto.InterestRatePercent <= 0 || dto.InterestRatePercent > 100)
                return BadRequest(new { message = "Процент должен быть от 0 до 100" });
            if (dto.TermMonths <= 0)
                return BadRequest(new { message = "Срок должен быть больше 0" });

            if (!await _db.Investors.AnyAsync(x => x.Id == dto.InvestorId))
                return BadRequest(new { message = "Инвестор не найден" });

            if (!await _db.Cars.AnyAsync(x => x.Id == dto.CarId))
                return BadRequest(new { message = "Авто не найдено" });

            var payoutType = ParsePayoutTypeOrThrow(dto.PayoutType);

            var (regular, total) = _calc.Calculate(dto.PrincipalAmount, dto.InterestRatePercent, dto.TermMonths, payoutType.ToString());
            var count = _calc.GetPaymentsCount(dto.TermMonths, payoutType.ToString());

            var inv = new Investment
            {
                InvestorId = dto.InvestorId,
                CarId = dto.CarId,
                PrincipalAmount = dto.PrincipalAmount,
                InterestRatePercent = dto.InterestRatePercent,
                StartDate = dto.StartDate.Date,
                TermMonths = dto.TermMonths,

                // ✅ enum
                PayoutType = payoutType,

                RegularPayoutAmount = regular,
                TotalReturnAmount = total,

                // ✅ enum
                Status = InvestmentStatus.ACTIVE,

                CreatedAt = now,
                UpdatedAt = now
            };

            _db.Investments.Add(inv);
            await _db.SaveChangesAsync(); // триггер лимита по car_price

            var schedule = _builder.Build(inv, count);
            _db.PayoutSchedules.AddRange(schedule);
            await _db.SaveChangesAsync();

            return Ok(new { id = inv.Id });
        }
        catch (DbUpdateException dbEx)
        {
            var pg = dbEx.InnerException as PostgresException;
            if (pg?.SqlState == "23514")
                return BadRequest(new { message = "Нарушение ограничения (check/trigger). Возможно превышен лимит инвестиций по цене машины." });

            if (pg?.SqlState == "42804")
                return BadRequest(new { message = "Несовпадение типов enum/text. Проверь PayoutType/Status и маппинг enum в Program.cs." });

            return BadRequest(new { message = pg?.MessageText ?? dbEx.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] InvestmentUpdateDto dto)
    {
        try
        {
            var inv = await _db.Investments.FirstOrDefaultAsync(x => x.Id == id);
            if (inv == null) return NotFound(new { message = "Инвестиция не найдена" });

            // ✅ парсим строки из DTO
            var payoutType = ParsePayoutTypeOrThrow(dto.PayoutType);
            var status = ParseInvestmentStatusOrThrow(dto.Status);

            inv.InterestRatePercent = dto.InterestRatePercent;
            inv.TermMonths = dto.TermMonths;
            inv.PayoutType = payoutType;
            inv.Status = status;
            inv.UpdatedAt = DateTimeOffset.UtcNow;

            var (regular, total) = _calc.Calculate(inv.PrincipalAmount, inv.InterestRatePercent, inv.TermMonths, inv.PayoutType.ToString());
            inv.RegularPayoutAmount = regular;
            inv.TotalReturnAmount = total;

            await _db.SaveChangesAsync();
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (!this.IsAdmin()) return this.ForbidWithMessage();

        var inv = await _db.Investments.FirstOrDefaultAsync(x => x.Id == id);
        if (inv == null) return NotFound(new { message = "Инвестиция не найдена" });

        inv.DeletedAt = DateTimeOffset.UtcNow;
        inv.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return Ok();
    }
}