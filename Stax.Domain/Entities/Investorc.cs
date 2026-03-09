namespace Stax.Domain.Entities;

public class Investor : BaseEntity
{
    public string LastName { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string? Patronymic { get; set; }

    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Passport { get; set; }
    public string? Inn { get; set; }
    public string? Comment { get; set; }
}