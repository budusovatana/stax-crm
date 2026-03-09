namespace Stax.Dto.Cars;

public class CarListItemDto
{
    public long Id { get; set; }
    public string MakeModel { get; set; } = "";
    public string PlateNumber { get; set; } = "";
    public string Color { get; set; } = "";
    public decimal CarPrice { get; set; }
}

public class CarUpsertDto
{
    public string MakeModel { get; set; } = "";
    public string PlateNumber { get; set; } = "";
    public string? Vin { get; set; }
    public string? StsNumber { get; set; }

    public long? OwnerId { get; set; }   // FK на owners

    public string Color { get; set; } = "WHITE";
    public int? Year { get; set; }
    public int MileageKm { get; set; }
    public bool HasAccident { get; set; }
    public decimal CarPrice { get; set; }
    public string? Comment { get; set; }
}
public class CarViewDto
{
    public long Id { get; set; }
    public string MakeModel { get; set; } = "";
    public string PlateNumber { get; set; } = "";
    public string? Vin { get; set; }
    public string? StsNumber { get; set; }

    public long? OwnerId { get; set; }        // удобно для редактирования
    public string? OwnerName { get; set; }    // отображение
    public string? OwnerInn { get; set; }     // мелко
    public string? OwnerOgrn { get; set; }    // мелко

    public string Color { get; set; } = "";
    public int? Year { get; set; }
    public int MileageKm { get; set; }
    public bool HasAccident { get; set; }
    public decimal CarPrice { get; set; }
    public string? Comment { get; set; }

    public decimal ActiveInvestmentsSum { get; set; }
    public List<CarInvestmentDto> Investments { get; set; } = new();
}

public class CarInvestmentDto
{
    public long Id { get; set; }
    public string Investor { get; set; } = "";
    public decimal PrincipalAmount { get; set; }
    public string Status { get; set; } = "";
}
