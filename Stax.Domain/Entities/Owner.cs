namespace Stax.Domain.Entities;

public class Owner : BaseEntity
{
    // Лизинговая компания
    public string Name { get; set; } = "";

    // Реквизиты
    public string? Inn { get; set; }
    public string? Ogrn { get; set; }

    // Контакты
    public string? Phone { get; set; }
    public string? Email { get; set; }

    public string? Comment { get; set; }
}