using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Stax.Domain.Entities;
using Stax.Persistence;

namespace Stax.Crm.Controllers;

public class OwnerListItemDto
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public string? Inn { get; set; }
    public string? Ogrn { get; set; }
}

public class OwnerCreateDto
{
    public string Name { get; set; } = "";
    public string? Inn { get; set; }
    public string? Ogrn { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Comment { get; set; }
}

[ApiController]
[Route("api/owners")]
[Authorize]
public class OwnersController : ControllerBase
{
    private readonly StaxDbContext _db;
    public OwnersController(StaxDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<OwnerListItemDto>>> GetAll()
    {
        var list = await _db.Owners
            .OrderBy(x => x.Name)
            .Select(x => new OwnerListItemDto
            {
                Id = x.Id,
                Name = x.Name,
                Inn = x.Inn,
                Ogrn = x.Ogrn
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] OwnerCreateDto dto)
    {
        try
        {
            if (dto == null) throw new Exception("Пустой запрос");
            if (string.IsNullOrWhiteSpace(dto.Name)) throw new Exception("Название компании обязательно");

            if (!string.IsNullOrWhiteSpace(dto.Phone))
            {
                var digits = System.Text.RegularExpressions.Regex.Replace(dto.Phone, @"\D", "");
                if (digits.Length != 11 || !digits.StartsWith("7"))
                    throw new Exception("Телефон должен содержать 11 цифр и начинаться с 7");
            }

            if (!string.IsNullOrWhiteSpace(dto.Email) &&
                !System.Text.RegularExpressions.Regex.IsMatch(dto.Email.Trim(), @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
                throw new Exception("Некорректный формат email");

            // нормализуем
            dto.Name = dto.Name.Trim();
            dto.Inn = string.IsNullOrWhiteSpace(dto.Inn) ? null : dto.Inn.Trim();
            dto.Ogrn = string.IsNullOrWhiteSpace(dto.Ogrn) ? null : dto.Ogrn.Trim();
            dto.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();
            dto.Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
            dto.Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();

            var now = DateTimeOffset.UtcNow;

            var owner = new Owner
            {
                Name = dto.Name,
                Inn = dto.Inn,
                Ogrn = dto.Ogrn,
                Phone = dto.Phone,
                Email = dto.Email,
                Comment = dto.Comment,
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.Owners.Add(owner);
            await _db.SaveChangesAsync();

            return Ok(new { id = owner.Id });
        }
        catch (Exception ex)
        {
            return MapDbExceptionToBadRequest(ex);
        }
    }

    private IActionResult MapDbExceptionToBadRequest(Exception ex)
    {
        if (ex is DbUpdateException dbEx)
        {
            var pg = dbEx.InnerException as PostgresException;

            if (pg != null)
            {
                if (pg.SqlState == "23505")
                    return BadRequest(new { message = "Нарушение уникальности: возможно, такая компания уже существует." });

                return BadRequest(new { message = $"Ошибка БД: {pg.MessageText}" });
            }

            return BadRequest(new { message = "Ошибка сохранения в БД. Проверь значения полей." });
        }

        return BadRequest(new { message = ex.Message });
    }
}