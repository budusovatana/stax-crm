using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stax.Domain.Entities;
using Stax.Domain.Enums;
using Stax.Dto.Users;
using Stax.Persistence;
using Stax.Persistence.Services;

namespace Stax.Crm.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "ADMIN")]
public class UsersController : ControllerBase
{
    private readonly StaxDbContext _db;
    private readonly PasswordHasher _hasher;

    public UsersController(StaxDbContext db, PasswordHasher hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserListItemDto>>> GetAll([FromQuery] string? q = null)
    {
        var query = _db.Users.AsNoTracking().Where(x => x.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(q))
        {
            q = q.Trim().ToLowerInvariant();
            query = query.Where(x =>
                x.Username.ToLower().Contains(q) ||
                (x.DisplayName != null && x.DisplayName.ToLower().Contains(q)));
        }

        var list = await query
            .OrderBy(x => x.Username)
            .Select(x => new UserListItemDto
            {
                Id = x.Id,
                Username = x.Username,
                DisplayName = x.DisplayName,
                Role = x.Role.ToString(),
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var user = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);

        if (user == null) return NotFound(new { message = "Пользователь не найден" });

        return Ok(new UserListItemDto
        {
            Id = user.Id,
            Username = user.Username,
            DisplayName = user.DisplayName,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UserUpsertDto dto)
    {
        if (dto == null) return BadRequest(new { message = "Некорректные данные" });

        var username = (dto.Username ?? "").Trim();
        if (username.Length < 3)
            return BadRequest(new { message = "Логин минимум 3 символа" });

        if (string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Пароль обязателен" });

        var pwErr = ValidatePassword(dto.Password);
        if (pwErr != null) return BadRequest(new { message = pwErr });

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
            return BadRequest(new { message = "Некорректная роль" });

        var exists = await _db.Users.AnyAsync(x => x.Username == username && x.DeletedAt == null);
        if (exists) return BadRequest(new { message = "Такой логин уже существует" });

        _hasher.CreateHash(dto.Password, out var salt, out var hash);

        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Username = username,
            PasswordSalt = salt,
            PasswordHash = hash,
            Role = role,
            IsActive = dto.IsActive,
            DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? null : dto.DisplayName.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new { id = user.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UserUpsertDto dto)
    {
        if (dto == null) return BadRequest(new { message = "Некорректные данные" });

        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);
        if (user == null) return NotFound(new { message = "Пользователь не найден" });

        var currentUserId = this.GetUserId();

        // Нельзя деактивировать себя
        if (id == currentUserId && !dto.IsActive)
            return BadRequest(new { message = "Нельзя деактивировать самого себя" });

        // Нельзя снять ADMIN у себя
        if (id == currentUserId && !string.Equals(dto.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Нельзя снять роль администратора у самого себя" });

        var username = (dto.Username ?? "").Trim();
        if (username.Length < 3)
            return BadRequest(new { message = "Логин минимум 3 символа" });

        // Проверка уникальности логина (если сменили)
        if (!string.Equals(user.Username, username, StringComparison.Ordinal))
        {
            var exists = await _db.Users.AnyAsync(x => x.Username == username && x.DeletedAt == null && x.Id != id);
            if (exists) return BadRequest(new { message = "Такой логин уже существует" });
        }

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
            return BadRequest(new { message = "Некорректная роль" });

        // Пароль опционален при редактировании
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            var pwErr = ValidatePassword(dto.Password);
            if (pwErr != null) return BadRequest(new { message = pwErr });

            _hasher.CreateHash(dto.Password, out var salt, out var hash);
            user.PasswordSalt = salt;
            user.PasswordHash = hash;
        }

        user.Username = username;
        user.DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? null : dto.DisplayName.Trim();
        user.Role = role;
        user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var currentUserId = this.GetUserId();
        if (id == currentUserId)
            return BadRequest(new { message = "Нельзя удалить самого себя" });

        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null);
        if (user == null) return NotFound(new { message = "Пользователь не найден" });

        var now = DateTimeOffset.UtcNow;
        user.DeletedAt = now;
        user.UpdatedAt = now;

        await _db.SaveChangesAsync();
        return Ok();
    }

    private static string? ValidatePassword(string password)
    {
        if (password.Length < 8)
            return "Пароль минимум 8 символов";
        if (!password.Any(char.IsLetter))
            return "Пароль должен содержать хотя бы одну букву";
        if (!password.Any(char.IsDigit))
            return "Пароль должен содержать хотя бы одну цифру";
        if (!password.Any(c => !char.IsLetterOrDigit(c)))
            return "Пароль должен содержать хотя бы один спецсимвол";
        return null;
    }
}
