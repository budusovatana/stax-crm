namespace Stax.Dto.Payments;

public class PaymentListItemDto
{
    public long Id { get; set; }
    public string Investor { get; set; } = "";
    public string Car { get; set; } = "";
    public DateTime PaidAt { get; set; }
    public decimal Amount { get; set; }
    public string? ContractNo { get; set; }
}

public class PaymentCreateDto
{
    public long InvestmentId { get; set; }
    public long? ScheduleId { get; set; }
    public DateTime PaidAt { get; set; } // "YYYY-MM-DD"
    public decimal Amount { get; set; }
    public string? PaymentMethod { get; set; }
    public string? ReferenceNo { get; set; }
    public string? ContractNo { get; set; }
    public string? Comment { get; set; }
}
