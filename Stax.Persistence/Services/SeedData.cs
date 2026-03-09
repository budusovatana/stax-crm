using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Stax.Domain.Entities;
using Stax.Domain.Enums;

namespace Stax.Persistence.Services
{
    public class SeedData
    {
        private readonly StaxDbContext _db;
        private readonly IConfiguration _cfg;
        private readonly PasswordHasher _hasher;

        public SeedData(StaxDbContext db, IConfiguration cfg, PasswordHasher hasher)
        {
            _db = db;
            _cfg = cfg;
            _hasher = hasher;
        }

        public async Task SeedAdminIfNeededAsync()
        {
            var enabled = _cfg.GetValue<bool>("SeedAdmin:Enabled");
            if (!enabled) return;

            if (await _db.Users.AnyAsync(x => x.DeletedAt == null))
                return;

            var username = _cfg["SeedAdmin:Username"] ?? "admin";
            var password = _cfg["SeedAdmin:Password"] ?? "admin123";

            _hasher.CreateHash(password, out var salt, out var hash);

            var now = DateTimeOffset.UtcNow;

            _db.Users.Add(new User
            {
                Username = username.Trim(),
                PasswordHash = hash,
                PasswordSalt = salt,
                Role = UserRole.ADMIN,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                DeletedAt = null
            });

            await _db.SaveChangesAsync();
        }
    }
}