namespace Stax.Domain.Entities;
using Stax.Domain.Enums;


public class Car : BaseEntity
{
    public string MakeModel { get; set; } = "";
    public string PlateNumber { get; set; } = "";
    public string? Vin { get; set; }
    public string? StsNumber { get; set; }

    public long? OwnerId { get; set; }      // NEW FK
    public Owner? Owner { get; set; }       // navigation

    public CarColor Color { get; set; }
    public int? Year { get; set; }
    public int MileageKm { get; set; }
    public bool HasAccident { get; set; }
    public decimal CarPrice { get; set; }

    public string? Comment { get; set; }
}