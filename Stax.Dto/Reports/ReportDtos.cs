namespace Stax.Dto.Reports;

public class PaymentsReportRowDto
{
    public string Investor { get; set; } = "";
    public decimal SumPayments { get; set; }
    public int CountPayments { get; set; }
}
