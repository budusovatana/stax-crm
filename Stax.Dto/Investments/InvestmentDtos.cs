namespace Stax.Dto.Investments;

public class InvestmentListItemDto
{
    public long Id { get; set; }
    public string Investor { get; set; } = "";
    public string Car { get; set; } = "";
    public decimal PrincipalAmount { get; set; }
    public string Status { get; set; } = "";
}

public class InvestmentCreateDto
{
    public long InvestorId { get; set; }
    public long CarId { get; set; }
    public decimal PrincipalAmount { get; set; }
    public decimal InterestRatePercent { get; set; }
    public DateTime StartDate { get; set; } // "YYYY-MM-DD"
    public int TermMonths { get; set; }
    public string PayoutType { get; set; } = "MONTHLY";
}

public class InvestmentUpdateDto
{
    public decimal InterestRatePercent { get; set; }
    public int TermMonths { get; set; }
    public string PayoutType { get; set; } = "MONTHLY";
    public string Status { get; set; } = "ACTIVE";
}

public class InvestmentViewDto
{
    public long Id { get; set; }
    public long InvestorId { get; set; }
    public long CarId { get; set; }

    public string Investor { get; set; } = "";
    public string Car { get; set; } = "";

    public decimal PrincipalAmount { get; set; }
    public decimal InterestRatePercent { get; set; }
    public DateTime StartDate { get; set; }
    public int TermMonths { get; set; }
    public string PayoutType { get; set; } = "";
    public decimal RegularPayoutAmount { get; set; }
    public decimal TotalReturnAmount { get; set; }
    public string Status { get; set; } = "";

    public List<PayoutScheduleDto> Schedule { get; set; } = new();
    public decimal TotalPaid { get; set; }
}

public class PayoutScheduleDto
{
    public long Id { get; set; }
    public int PeriodNo { get; set; }
    public DateTime DueDate { get; set; }
    public decimal PlannedAmount { get; set; }
    public string Status { get; set; } = "";
}
