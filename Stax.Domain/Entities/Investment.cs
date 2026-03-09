using Stax.Domain.Enums;

namespace Stax.Domain.Entities;

public class Investment : BaseEntity
{
    public long InvestorId { get; set; }
    public long CarId { get; set; }

    public decimal PrincipalAmount { get; set; }
    public decimal InterestRatePercent { get; set; }
    public DateTime StartDate { get; set; }         // date (start_date)
    public int TermMonths { get; set; }

    public decimal RegularPayoutAmount { get; set; }
    public decimal TotalReturnAmount { get; set; }

    public InvestmentStatus Status { get; set; } = InvestmentStatus.ACTIVE;
    public PayoutType PayoutType { get; set; } = PayoutType.MONTHLY;

    public Investor? Investor { get; set; }
    public Car? Car { get; set; }
}
