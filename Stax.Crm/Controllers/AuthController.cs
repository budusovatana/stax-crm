using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stax.Domain.Entities;
using Stax.Domain.Enums;
using Stax.Dto.Auth;
using Stax.Persistence;
using Stax.Persistence.Services;

namespace Stax.Crm.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly StaxDbContext _db;
        private readonly PasswordHasher _hasher;
        private readonly JwtTokenService _jwt;

        public AuthController(StaxDbContext db, PasswordHasher hasher, JwtTokenService jwt)
        {
            _db = db;
            _hasher = hasher;
            _jwt = jwt;
        }

        // =========================
        // LOGIN
        // =========================
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            if (req == null)
                return BadRequest(new { message = "Некорректные данные" });

            var username = (req.Username ?? "").Trim();
            var password = req.Password ?? "";

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                return BadRequest(new { message = "Логин и пароль обязательны" });

            var user = await _db.Users
                .FirstOrDefaultAsync(x =>
                    x.Username == username &&
                    x.DeletedAt == null &&
                    x.IsActive);

            if (user == null)
                return Unauthorized(new { message = "Неверный логин или пароль" });

            var ok = _hasher.Verify(password, user.PasswordSalt, user.PasswordHash);
            if (!ok)
                return Unauthorized(new { message = "Неверный логин или пароль" });

            var token = _jwt.GenerateToken(user.Id, user.Username, user.Role);

            return Ok(new
            {
                token,
                username = user.Username,
                role = user.Role.ToString(),
                displayName = user.DisplayName
            });
        }

        // =========================
        // REGISTER (SELF) -> ASSISTANT ONLY
        // =========================
        // Саморегистрация всегда создаёт роль ASSISTANT.
        // Role в запросе игнорируем специально (чтобы не было дырки "зарегистрируйся админом").
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            if (req == null)
                return BadRequest(new { message = "Некорректные данные" });

            var username = (req.Username ?? "").Trim();
            var password = req.Password ?? "";

            if (username.Length < 3)
                return BadRequest(new { message = "Логин минимум 3 символа" });

            var pwErr = ValidatePassword(password);
            if (pwErr != null)
                return BadRequest(new { message = pwErr });

            var exists = await _db.Users.AnyAsync(x => x.Username == username && x.DeletedAt == null);
            if (exists)
                return BadRequest(new { message = "Такой логин уже существует" });

            _hasher.CreateHash(password, out var salt, out var hash);

            var now = DateTimeOffset.UtcNow;

            var user = new User
            {
                Username = username,
                PasswordSalt = salt,
                PasswordHash = hash,
                Role = UserRole.ASSISTANT, // ✅ всегда assistant
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                DeletedAt = null
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Пользователь создан" });
        }

        // =========================
        // REGISTER ADMIN (ONLY ADMIN) -> for Swagger/manual use
        // =========================
        // Создание администратора — только авторизованным ADMIN.
        [Authorize(Roles = "ADMIN")]
        [HttpPost("register-admin")]
        public async Task<IActionResult> RegisterAdmin([FromBody] RegisterRequest req)
        {
            if (req == null)
                return BadRequest(new { message = "Некорректные данные" });

            var username = (req.Username ?? "").Trim();
            var password = req.Password ?? "";

            if (username.Length < 3)
                return BadRequest(new { message = "Логин минимум 3 символа" });

            var pwErr = ValidatePassword(password);
            if (pwErr != null)
                return BadRequest(new { message = pwErr });

            var exists = await _db.Users.AnyAsync(x => x.Username == username && x.DeletedAt == null);
            if (exists)
                return BadRequest(new { message = "Такой логин уже существует" });

            _hasher.CreateHash(password, out var salt, out var hash);

            var now = DateTimeOffset.UtcNow;

            var user = new User
            {
                Username = username,
                PasswordSalt = salt,
                PasswordHash = hash,
                Role = UserRole.ADMIN,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                DeletedAt = null
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Администратор создан" });
        }

        // =========================
        // CHANGE PASSWORD (SELF)
        // =========================
        [Authorize]
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] Stax.Dto.Auth.ChangePasswordRequest req)
        {
            if (req == null)
                return BadRequest(new { message = "Некорректные данные" });

            var currentPassword = req.CurrentPassword ?? "";
            var newPassword = req.NewPassword ?? "";

            if (string.IsNullOrWhiteSpace(currentPassword))
                return BadRequest(new { message = "Введите текущий пароль" });

            var pwErr = ValidatePassword(newPassword);
            if (pwErr != null)
                return BadRequest(new { message = pwErr });

            var userId = this.GetUserId();
            var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId && x.DeletedAt == null);
            if (user == null)
                return NotFound(new { message = "Пользователь не найден" });

            if (!_hasher.Verify(currentPassword, user.PasswordSalt, user.PasswordHash))
                return BadRequest(new { message = "Текущий пароль неверный" });

            _hasher.CreateHash(newPassword, out var salt, out var hash);
            user.PasswordSalt = salt;
            user.PasswordHash = hash;
            user.UpdatedAt = DateTimeOffset.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new { message = "Пароль успешно изменён" });
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
}