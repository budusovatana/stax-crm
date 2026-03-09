namespace Stax.Dto.Users;

public class UserUpsertDto
{
    public string Username { get; set; } = "";
    public string? Password { get; set; }
    public string? DisplayName { get; set; }
    public string Role { get; set; } = "";
    public bool IsActive { get; set; }
}
