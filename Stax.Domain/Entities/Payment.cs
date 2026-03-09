namespace Stax.Domain.Entities;

public class Payment : BaseEntity
{
    public long InvestmentId { get; set; }
    public long? ScheduleId { get; set; }           // nullable для внеплановых выплат

    public DateTime PaidAt { get; set; }            // paid_at (date)
    public decimal Amount { get; set; }
    public string? PaymentMethod { get; set; }      // payment_method
    public string? ReferenceNo { get; set; }        // reference_no
    public string? ContractNo { get; set; }         // contract_no
    public string? Comment { get; set; }

    public long CreatedByUserId { get; set; }       // created_by_user_id

    public Investment? Investment { get; set; }
    public PayoutSchedule? Schedule { get; set; }
    public User? CreatedByUser { get; set; }
}