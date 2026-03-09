namespace Stax.Persistence.Services;

public class InvestmentCalculator
{
    public (decimal regular, decimal total) Calculate(decimal principal, decimal ratePercent, int termMonths, string payoutType)
    {
        var profit = principal * (ratePercent / 100m) * (termMonths / 12m);
        var total = principal + profit;

        int paymentsCount = payoutType switch
        {
            "MONTHLY" => termMonths,
            "QUARTERLY" => (int)Math.Ceiling(termMonths / 3m),
            "END_OF_TERM" => 1,
            _ => throw new ArgumentException("Invalid payout_type")
        };

        var regular = payoutType == "END_OF_TERM" ? 0m : Math.Round(total / paymentsCount, 2);
        total = Math.Round(total, 2);

        return (regular, total);
    }

    public int GetPaymentsCount(int termMonths, string payoutType) => payoutType switch
    {
        "MONTHLY" => termMonths,
        "QUARTERLY" => (int)Math.Ceiling(termMonths / 3m),
        "END_OF_TERM" => 1,
        _ => throw new ArgumentException("Invalid payout_type")
    };
}
