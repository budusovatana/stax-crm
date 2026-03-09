using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stax.Domain.Entities;
using Stax.Dto.Investors;
using Stax.Persistence;

namespace Stax.Crm.Controllers;

[ApiController]
[Route("api/investors")]
[Authorize]
public class InvestorsController : ControllerBase
{
    private readonly StaxDbContext _db;
    public InvestorsController(StaxDbContext db) => _db = db;

    private static string BuildFullName(string lastName, string firstName, string? patronymic)
    {
        patronymic = string.IsNullOrWhiteSpace(patronymic) ? null : patronymic.Trim();
        return patronymic == null
            ? $"{lastName} {firstName}"
            : $"{lastName} {firstName} {patronymic}";
    }

    [HttpGet]
    public async Task<ActionResult<List<InvestorListItemDto>>> GetAll([FromQuery] string? q = null)
    {
        var query = _db.Investors.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q))
        {
            q = q.Trim().ToLowerInvariant();

            query = query.Where(x =>
                x.LastName.ToLower().Contains(q) ||
                x.FirstName.ToLower().Contains(q) ||
                (x.Patronymic != null && x.Patronymic.ToLower().Contains(q)) ||
                (x.Phone != null && x.Phone.ToLower().Contains(q)) ||
                (x.Email != null && x.Email.ToLower().Contains(q)));
        }

        var list = await query
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .ThenBy(x => x.Patronymic)
            .Select(x => new InvestorListItemDto
            {
                Id = x.Id,
                FullName = x.LastName + " " + x.FirstName + (x.Patronymic != null ? " " + x.Patronymic : ""),
                Phone = x.Phone,
                Email = x.Email
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<InvestorViewDto>> Get(long id)
    {
        var inv = await _db.Investors.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        if (inv == null) return NotFound(new { message = "Инвестор не найден" });

        var investments = await _db.Investments.AsNoTracking()
            .Include(x => x.Car)
            .Where(x => x.InvestorId == id)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new InvestorInvestmentDto
            {
                Id = x.Id,
                Car = x.Car != null ? (x.Car.MakeModel + " (" + x.Car.PlateNumber + ")") : "",
                PrincipalAmount = x.PrincipalAmount,
                TotalReturnAmount = x.TotalReturnAmount,

                // ✅ было: Status = x.Status (enum не лезет в string)
                Status = x.Status.ToString()
            })
            .ToListAsync();

        // payments больше не имеют InvestorId — считаем через payments -> investments
        var totalPaid = await (
            from p in _db.Payments.AsNoTracking()
            join i in _db.Investments.AsNoTracking() on p.InvestmentId equals i.Id
            where i.InvestorId == id
            select (decimal?)p.Amount
        ).SumAsync() ?? 0m;

        var docs = await (
            from l in _db.DocumentLinks.AsNoTracking()
            join d in _db.Documents.AsNoTracking() on l.DocumentId equals d.Id
            where l.InvestorId == id
            orderby l.CreatedAt descending
            select new InvestorDocumentDto
            {
                LinkId = l.Id,
                DocumentId = d.Id,
                FileName = d.FileName,

                // ✅ было: DocType = l.DocType (enum не лезет в string)
                DocType = l.DocType.ToString(),

                ContractNo = l.ContractNo,
                ContractDate = l.ContractDate
            }
        ).ToListAsync();

        return Ok(new InvestorViewDto
        {
            Id = inv.Id,

            FullName = BuildFullName(inv.LastName, inv.FirstName, inv.Patronymic),

            // ✅ эти поля должны быть в InvestorViewDto (см. ниже)
            LastName = inv.LastName,
            FirstName = inv.FirstName,
            Patronymic = inv.Patronymic,

            Phone = inv.Phone,
            Email = inv.Email,
            Passport = inv.Passport,
            Inn = inv.Inn,
            Comment = inv.Comment,

            Investments = investments,
            TotalPaid = totalPaid,
            Documents = docs
        });
    }

    private static string? ValidateInvestorFields(InvestorUpsertDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.LastName)) return "Фамилия обязательна";
        if (string.IsNullOrWhiteSpace(dto.FirstName)) return "Имя обязательно";

        if (!string.IsNullOrWhiteSpace(dto.Phone))
        {
            var digits = System.Text.RegularExpressions.Regex.Replace(dto.Phone, @"\D", "");
            if (digits.Length != 11 || !digits.StartsWith("7"))
                return "Телефон должен содержать 11 цифр и начинаться с 7";
        }

        if (!string.IsNullOrWhiteSpace(dto.Email) &&
            !System.Text.RegularExpressions.Regex.IsMatch(dto.Email.Trim(), @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
            return "Некорректный формат email";

        if (!string.IsNullOrWhiteSpace(dto.Passport))
        {
            var digits = System.Text.RegularExpressions.Regex.Replace(dto.Passport, @"\D", "");
            if (digits.Length != 10) return "Паспорт должен содержать ровно 10 цифр";
        }

        if (!string.IsNullOrWhiteSpace(dto.Inn))
        {
            var digits = System.Text.RegularExpressions.Regex.Replace(dto.Inn, @"\D", "");
            if (digits.Length != 12) return "ИНН должен содержать ровно 12 цифр";
        }

        return null;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] InvestorUpsertDto dto)
    {
        if (dto == null) return BadRequest(new { message = "Некорректные данные" });

        var validationError = ValidateInvestorFields(dto);
        if (validationError != null) return BadRequest(new { message = validationError });

        var now = DateTimeOffset.UtcNow;

        var inv = new Investor
        {
            LastName = dto.LastName.Trim(),
            FirstName = dto.FirstName.Trim(),
            Patronymic = string.IsNullOrWhiteSpace(dto.Patronymic) ? null : dto.Patronymic.Trim(),

            Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
            Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim(),
            Passport = string.IsNullOrWhiteSpace(dto.Passport) ? null : dto.Passport.Trim(),
            Inn = string.IsNullOrWhiteSpace(dto.Inn) ? null : dto.Inn.Trim(),
            Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),

            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Investors.Add(inv);
        await _db.SaveChangesAsync();

        return Ok(new { id = inv.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] InvestorUpsertDto dto)
    {
        var inv = await _db.Investors.FirstOrDefaultAsync(x => x.Id == id);
        if (inv == null) return NotFound(new { message = "Инвестор не найден" });

        var validationError = ValidateInvestorFields(dto);
        if (validationError != null) return BadRequest(new { message = validationError });

        inv.LastName = dto.LastName.Trim();
        inv.FirstName = dto.FirstName.Trim();
        inv.Patronymic = string.IsNullOrWhiteSpace(dto.Patronymic) ? null : dto.Patronymic.Trim();

        inv.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();
        inv.Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
        inv.Passport = string.IsNullOrWhiteSpace(dto.Passport) ? null : dto.Passport.Trim();
        inv.Inn = string.IsNullOrWhiteSpace(dto.Inn) ? null : dto.Inn.Trim();
        inv.Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();
        inv.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("{id:long}/related-counts")]
    public async Task<IActionResult> GetRelatedCounts(long id)
    {
        var inv = await _db.Investors.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (inv == null) return NotFound(new { message = "Инвестор не найден" });

        var investmentIds = await _db.Investments.AsNoTracking()
            .Where(x => x.InvestorId == id && x.DeletedAt == null)
            .Select(x => x.Id)
            .ToListAsync();

        var investmentsCount = investmentIds.Count;

        var paymentsCount = investmentIds.Count > 0
            ? await _db.Payments.AsNoTracking()
                .Where(p => investmentIds.Contains(p.InvestmentId) && p.DeletedAt == null)
                .CountAsync()
            : 0;

        var schedulesCount = investmentIds.Count > 0
            ? await _db.PayoutSchedules.AsNoTracking()
                .Where(s => investmentIds.Contains(s.InvestmentId) && s.DeletedAt == null)
                .CountAsync()
            : 0;

        var documentsCount = await _db.DocumentLinks.AsNoTracking()
            .Where(d => d.InvestorId == id && d.DeletedAt == null)
            .CountAsync();

        return Ok(new
        {
            investments = investmentsCount,
            payments = paymentsCount,
            schedules = schedulesCount,
            documents = documentsCount
        });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (!this.IsAdmin()) return this.ForbidWithMessage();

        var inv = await _db.Investors.FirstOrDefaultAsync(x => x.Id == id);
        if (inv == null) return NotFound(new { message = "Инвестор не найден" });

        var now = DateTimeOffset.UtcNow;

        // Каскадное soft-delete: payments → schedules → investments → document_links → investor
        var investmentIds = await _db.Investments
            .Where(x => x.InvestorId == id && x.DeletedAt == null)
            .Select(x => x.Id)
            .ToListAsync();

        if (investmentIds.Count > 0)
        {
            // Soft-delete payments
            var payments = await _db.Payments
                .Where(p => investmentIds.Contains(p.InvestmentId) && p.DeletedAt == null)
                .ToListAsync();
            foreach (var p in payments) { p.DeletedAt = now; p.UpdatedAt = now; }

            // Soft-delete schedules
            var schedules = await _db.PayoutSchedules
                .Where(s => investmentIds.Contains(s.InvestmentId) && s.DeletedAt == null)
                .ToListAsync();
            foreach (var s in schedules) { s.DeletedAt = now; s.UpdatedAt = now; }

            // Soft-delete investments
            var investments = await _db.Investments
                .Where(x => x.InvestorId == id && x.DeletedAt == null)
                .ToListAsync();
            foreach (var i in investments) { i.DeletedAt = now; i.UpdatedAt = now; }
        }

        // Soft-delete document links
        var docLinks = await _db.DocumentLinks
            .Where(d => d.InvestorId == id && d.DeletedAt == null)
            .ToListAsync();
        foreach (var d in docLinks) { d.DeletedAt = now; d.UpdatedAt = now; }

        // Soft-delete investor
        inv.DeletedAt = now;
        inv.UpdatedAt = now;
        await _db.SaveChangesAsync();

        return Ok();
    }

    // ✅ Инвестиции конкретного инвестора (для /pages/investor-view.html)
    [HttpGet("{id:long}/investments")]
    public async Task<IActionResult> GetInvestorInvestments(long id)
    {
        var exists = await _db.Investors.AsNoTracking().AnyAsync(x => x.Id == id);
        if (!exists) return NotFound(new { message = "Инвестор не найден" });

        var list = await _db.Investments.AsNoTracking()
            .Include(x => x.Car)
            .Where(x => x.InvestorId == id)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                id = x.Id,
                car = x.Car != null ? (x.Car.MakeModel + " (" + x.Car.PlateNumber + ")") : "",
                principalAmount = x.PrincipalAmount,
                status = x.Status.ToString()
            })
            .ToListAsync();

        return Ok(list);
    }

    // ✅ Документы конкретного инвестора (для /pages/investor-view.html)
    [HttpGet("{id:long}/documents")]
    public async Task<IActionResult> GetInvestorDocuments(long id)
    {
        var exists = await _db.Investors.AsNoTracking().AnyAsync(x => x.Id == id);
        if (!exists) return NotFound(new { message = "Инвестор не найден" });

        var list = await _db.DocumentLinks.AsNoTracking()
            .Include(x => x.Document)
            .Where(x => x.InvestorId == id)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                id = x.Id,                 // linkId
                documentId = x.DocumentId,
                fileName = x.Document != null ? x.Document.FileName : "",
                docType = x.DocType.ToString(),
                contractNo = x.ContractNo,
                contractDate = x.ContractDate
            })
            .ToListAsync();

        return Ok(list);
    }
}