using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stax.Domain.Entities;
using Stax.Domain.Enums;
using Stax.Dto.Payments;
using Stax.Persistence;

namespace Stax.Crm.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly StaxDbContext _db;
    public PaymentsController(StaxDbContext db) => _db = db;

    private static string BuildFullName(Investor? inv)
    {
        if (inv == null) return "";
        return inv.Patronymic == null
            ? $"{inv.LastName} {inv.FirstName}"
            : $"{inv.LastName} {inv.FirstName} {inv.Patronymic}";
    }

    [HttpGet]
    public async Task<ActionResult<List<PaymentListItemDto>>> GetAll([FromQuery] string? q = null)
    {
        var query = _db.Payments
            .Include(p => p.Investment).ThenInclude(i => i.Investor)
            .Include(p => p.Investment).ThenInclude(i => i.Car)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var s = q.Trim().ToLowerInvariant();

            query = query.Where(p =>
                (p.Investment != null && p.Investment.Investor != null &&
                    (p.Investment.Investor.LastName.ToLower().Contains(s) ||
                     p.Investment.Investor.FirstName.ToLower().Contains(s) ||
                     (p.Investment.Investor.Patronymic != null && p.Investment.Investor.Patronymic.ToLower().Contains(s))
                    )
                )
                ||
                (p.Investment != null && p.Investment.Car != null &&
                    (p.Investment.Car.MakeModel.ToLower().Contains(s) ||
                     p.Investment.Car.PlateNumber.ToLower().Contains(s))
                )
            );
        }

        var list = await query
            .OrderByDescending(p => p.PaidAt)
            .Select(p => new PaymentListItemDto
            {
                Id = p.Id,
                Investor = p.Investment != null ? BuildFullName(p.Investment.Investor) : "",
                Car = (p.Investment != null && p.Investment.Car != null)
                    ? p.Investment.Car.MakeModel + " (" + p.Investment.Car.PlateNumber + ")"
                    : "",
                PaidAt = p.PaidAt,
                Amount = p.Amount,
                ContractNo = p.ContractNo
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("by-schedule/{scheduleId:long}")]
    public async Task<IActionResult> GetBySchedule(long scheduleId)
    {
        var list = await _db.Payments
            .Where(p => p.ScheduleId == scheduleId)
            .Select(p => new { id = p.Id, amount = p.Amount, paidAt = p.PaidAt })
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PaymentCreateDto dto)
    {
        if (!this.IsAdmin()) return this.ForbidWithMessage();

        if (dto.Amount <= 0)
            return BadRequest(new { message = "Сумма должна быть больше 0" });

        var inv = await _db.Investments.FirstOrDefaultAsync(x => x.Id == dto.InvestmentId);
        if (inv == null) return BadRequest(new { message = "Инвестиция не найдена" });

        var now = DateTimeOffset.UtcNow;

        var payment = new Payment
        {
            InvestmentId = inv.Id,
            ScheduleId = dto.ScheduleId,
            PaidAt = dto.PaidAt.Date,
            Amount = dto.Amount,
            PaymentMethod = dto.PaymentMethod,
            ReferenceNo = dto.ReferenceNo,
            ContractNo = dto.ContractNo,
            Comment = dto.Comment,
            CreatedByUserId = this.GetUserId(),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        // ✅ если указали schedule_id — обновим enum-статус плана
        if (dto.ScheduleId.HasValue)
        {
            var sch = await _db.PayoutSchedules.FirstOrDefaultAsync(s => s.Id == dto.ScheduleId.Value);
            if (sch != null)
            {
                var paid = await _db.Payments
                    .Where(p => p.ScheduleId == sch.Id)
                    .SumAsync(p => (decimal?)p.Amount) ?? 0m;

                if (paid <= 0m) sch.Status = ScheduleStatus.PLANNED;
                else if (paid + 0.0001m < sch.PlannedAmount) sch.Status = ScheduleStatus.PARTIALLY_PAID;
                else sch.Status = ScheduleStatus.PAID;

                sch.UpdatedAt = DateTimeOffset.UtcNow;
                await _db.SaveChangesAsync();
            }
        }

        return Ok(new { id = payment.Id });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (!this.IsAdmin()) return this.ForbidWithMessage();

        var p = await _db.Payments.FirstOrDefaultAsync(x => x.Id == id);
        if (p == null) return NotFound(new { message = "Выплата не найдена" });

        p.DeletedAt = DateTimeOffset.UtcNow;
        p.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        // Пересчитываем статус schedule после soft-delete
        if (p.ScheduleId.HasValue)
        {
            var sch = await _db.PayoutSchedules.FirstOrDefaultAsync(s => s.Id == p.ScheduleId.Value);
            if (sch != null)
            {
                var paid = await _db.Payments
                    .Where(pp => pp.ScheduleId == sch.Id && pp.DeletedAt == null)
                    .SumAsync(pp => (decimal?)pp.Amount) ?? 0m;

                if (paid <= 0m) sch.Status = ScheduleStatus.PLANNED;
                else if (paid + 0.0001m < sch.PlannedAmount) sch.Status = ScheduleStatus.PARTIALLY_PAID;
                else sch.Status = ScheduleStatus.PAID;

                sch.UpdatedAt = DateTimeOffset.UtcNow;
                await _db.SaveChangesAsync();
            }
        }

        return Ok();
    }
}