using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Stax.Domain.Entities;
using Stax.Domain.Enums;
using Stax.Dto.Cars;
using Stax.Persistence;

namespace Stax.Crm.Controllers;

[ApiController]
[Route("api/cars")]
[Authorize]
public class CarsController : ControllerBase
{
    private readonly StaxDbContext _db;
    public CarsController(StaxDbContext db) => _db = db;

    private static string BuildFullName(Investor? inv)
    {
        if (inv == null) return "";
        return inv.Patronymic == null
            ? $"{inv.LastName} {inv.FirstName}"
            : $"{inv.LastName} {inv.FirstName} {inv.Patronymic}";
    }

    private static CarColor ParseColorOrThrow(string? color)
    {
        var c = (color ?? "").Trim().ToUpperInvariant();
        if (c != "WHITE" && c != "YELLOW" && c != "WHITE_YELLOW")
            throw new Exception("Некорректный цвет (WHITE / YELLOW / WHITE_YELLOW)");

        return Enum.Parse<CarColor>(c, ignoreCase: false);
    }

    private async Task ValidateOwnerIdOrThrow(long? ownerId)
    {
        if (ownerId == null) return;

        // Учитывает soft-delete filter (DeletedAt == null) автоматически
        var exists = await _db.Owners.AnyAsync(o => o.Id == ownerId);
        if (!exists) throw new Exception("Лизинговая компания не найдена");
    }

    [HttpGet]
    public async Task<ActionResult<List<CarListItemDto>>> GetAll([FromQuery] string? q = null)
    {
        var query = _db.Cars.AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            q = q.Trim().ToLower();
            query = query.Where(x =>
                x.MakeModel.ToLower().Contains(q) ||
                x.PlateNumber.ToLower().Contains(q));
        }

        var list = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new CarListItemDto
            {
                Id = x.Id,
                MakeModel = x.MakeModel,
                PlateNumber = x.PlateNumber,
                Color = x.Color.ToString(),
                CarPrice = x.CarPrice
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<CarViewDto>> Get(long id)
    {
        var car = await _db.Cars
            .Include(x => x.Owner)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (car == null) return NotFound(new { message = "Авто не найдено" });

        var investments = await _db.Investments
            .Include(x => x.Investor)
            .Where(x => x.CarId == id)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new CarInvestmentDto
            {
                Id = x.Id,
                Investor = BuildFullName(x.Investor),
                PrincipalAmount = x.PrincipalAmount,
                Status = x.Status.ToString()
            })
            .ToListAsync();

        var activeSum = await _db.Investments
            .Where(x => x.CarId == id && x.Status == InvestmentStatus.ACTIVE)
            .SumAsync(x => (decimal?)x.PrincipalAmount) ?? 0m;

        return Ok(new CarViewDto
        {
            Id = car.Id,
            MakeModel = car.MakeModel,
            PlateNumber = car.PlateNumber,
            Vin = car.Vin,
            StsNumber = car.StsNumber,

            OwnerId = car.OwnerId,
            OwnerName = car.Owner != null ? car.Owner.Name : null,
            OwnerInn = car.Owner != null ? car.Owner.Inn : null,
            OwnerOgrn = car.Owner != null ? car.Owner.Ogrn : null,

            Color = car.Color.ToString(),
            Year = car.Year,
            MileageKm = car.MileageKm,
            HasAccident = car.HasAccident,
            CarPrice = car.CarPrice,
            Comment = car.Comment,

            ActiveInvestmentsSum = activeSum,
            Investments = investments
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CarUpsertDto dto)
    {
        try
        {
            ValidateCar(dto);
            await ValidateOwnerIdOrThrow(dto.OwnerId);

            var now = DateTimeOffset.UtcNow;

            var car = new Car
            {
                MakeModel = dto.MakeModel.Trim(),
                PlateNumber = dto.PlateNumber.Trim(),
                Vin = string.IsNullOrWhiteSpace(dto.Vin) ? null : dto.Vin.Trim(),
                StsNumber = string.IsNullOrWhiteSpace(dto.StsNumber) ? null : dto.StsNumber.Trim(),

                OwnerId = dto.OwnerId,

                Color = ParseColorOrThrow(dto.Color),

                Year = dto.Year,
                MileageKm = dto.MileageKm,
                HasAccident = dto.HasAccident,
                CarPrice = dto.CarPrice,
                Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.Cars.Add(car);
            await _db.SaveChangesAsync();

            return Ok(new { id = car.Id });
        }
        catch (Exception ex)
        {
            return MapDbExceptionToBadRequest(ex);
        }
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] CarUpsertDto dto)
    {
        try
        {
            ValidateCar(dto);
            await ValidateOwnerIdOrThrow(dto.OwnerId);

            var car = await _db.Cars.FirstOrDefaultAsync(x => x.Id == id);
            if (car == null) return NotFound(new { message = "Авто не найдено" });

            car.MakeModel = dto.MakeModel.Trim();
            car.PlateNumber = dto.PlateNumber.Trim();
            car.Vin = string.IsNullOrWhiteSpace(dto.Vin) ? null : dto.Vin.Trim();
            car.StsNumber = string.IsNullOrWhiteSpace(dto.StsNumber) ? null : dto.StsNumber.Trim();

            car.OwnerId = dto.OwnerId;

            car.Color = ParseColorOrThrow(dto.Color);

            car.Year = dto.Year;
            car.MileageKm = dto.MileageKm;
            car.HasAccident = dto.HasAccident;
            car.CarPrice = dto.CarPrice;
            car.Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();
            car.UpdatedAt = DateTimeOffset.UtcNow;

            await _db.SaveChangesAsync();
            return Ok();
        }
        catch (Exception ex)
        {
            return MapDbExceptionToBadRequest(ex);
        }
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (!this.IsAdmin()) return this.ForbidWithMessage();

        var car = await _db.Cars.FirstOrDefaultAsync(x => x.Id == id);
        if (car == null) return NotFound(new { message = "Авто не найдено" });

        var now = DateTimeOffset.UtcNow;

        var invs = await _db.Investments.Where(x => x.CarId == id && x.DeletedAt == null).ToListAsync();
        foreach (var inv in invs)
        {
            inv.DeletedAt = now;
            inv.UpdatedAt = now;
        }

        car.DeletedAt = now;
        car.UpdatedAt = now;

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Машина удалена. Связанных инвестиций: {invs.Count}." });
    }

    private static readonly System.Text.RegularExpressions.Regex PlateRegex =
        new(@"^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$");

    private static void ValidateCar(CarUpsertDto dto)
    {
        if (dto == null) throw new Exception("Пустой запрос");
        if (string.IsNullOrWhiteSpace(dto.MakeModel)) throw new Exception("Марка/модель обязательна");
        if (string.IsNullOrWhiteSpace(dto.PlateNumber)) throw new Exception("Госномер обязателен");

        if (!PlateRegex.IsMatch(dto.PlateNumber.Trim()))
            throw new Exception("Госномер в формате А123ВС77 (кириллица)");

        if (!string.IsNullOrWhiteSpace(dto.Vin) && dto.Vin.Trim().Length != 17)
            throw new Exception("VIN должен содержать ровно 17 символов");

        if (!string.IsNullOrWhiteSpace(dto.StsNumber))
        {
            var clean = System.Text.RegularExpressions.Regex.Replace(dto.StsNumber.Trim(), @"\s", "");
            if (clean.Length != 10) throw new Exception("СТС должен содержать 10 символов");
        }

        if (dto.Year.HasValue && dto.Year.Value < 1900)
            throw new Exception("Год должен быть >= 1900");

        if (dto.Year.HasValue && dto.Year.Value > DateTime.Now.Year + 1)
            throw new Exception($"Год не может быть больше {DateTime.Now.Year + 1}");

        if (dto.MileageKm < 0)
            throw new Exception("Пробег не может быть отрицательным");

        if (dto.CarPrice <= 0)
            throw new Exception("Стоимость должна быть больше 0");

        _ = ParseColorOrThrow(dto.Color);
    }

    [HttpGet("{id:long}/related-counts")]
    public async Task<IActionResult> GetRelatedCounts(long id)
    {
        var car = await _db.Cars.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (car == null) return NotFound(new { message = "Авто не найдено" });

        var investmentIds = await _db.Investments.AsNoTracking()
            .Where(x => x.CarId == id && x.DeletedAt == null)
            .Select(x => x.Id)
            .ToListAsync();

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

        return Ok(new
        {
            investments = investmentIds.Count,
            payments = paymentsCount,
            schedules = schedulesCount
        });
    }

    private IActionResult MapDbExceptionToBadRequest(Exception ex)
    {
        if (ex is DbUpdateException dbEx)
        {
            var pg = dbEx.InnerException as PostgresException;

            if (pg != null)
            {
                if (pg.SqlState == "23505")
                    return BadRequest(new { message = "Нарушение уникальности: возможно, уже существует такой госномер/VIN/СТС." });

                if (pg.SqlState == "23514")
                    return BadRequest(new { message = "Нарушение ограничения (check). Проверь год (>=1900), цену (>0), пробег (>=0), цвет." });

                if (pg.SqlState == "42804")
                    return BadRequest(new { message = "Несовпадение типов (enum/text). Проверь Color/Status/DocType и маппинг enum." });

                return BadRequest(new { message = $"Ошибка БД: {pg.MessageText}" });
            }

            return BadRequest(new { message = "Ошибка сохранения в БД. Проверь значения полей." });
        }

        return BadRequest(new { message = ex.Message });
    }
}