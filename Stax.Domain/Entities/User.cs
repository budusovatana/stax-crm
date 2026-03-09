using Stax.Domain.Enums;

namespace Stax.Domain.Entities;

public class User : BaseEntity
{
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string PasswordSalt { get; set; } = "";
    public UserRole Role { get; set; }          // ВОТ ЭТО КРИТИЧНО
    public bool IsActive { get; set; } = true;
    public string? DisplayName { get; set; }
}