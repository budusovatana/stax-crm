using Stax.Domain.Entities;
using Stax.Domain.Enums;

namespace Stax.Persistence.Services;

public class PayoutScheduleBuilder
{
    public List<PayoutSchedule> Build(Investment inv, int paymentsCount)
    {
        var list = new List<PayoutSchedule>();

        int stepMonths = inv.PayoutType switch
        {
            PayoutType.MONTHLY => 1,
            PayoutType.QUARTERLY => 3,
            PayoutType.END_OF_TERM => inv.TermMonths,
            _ => throw new ArgumentException("Invalid payout_type")
        };

        var start = inv.StartDate.Date;

        for (int i = 1; i <= paymentsCount; i++)
        {
            var due = start.AddMonths(stepMonths * i);

            var planned = inv.PayoutType == PayoutType.END_OF_TERM
                ? inv.TotalReturnAmount
                : inv.RegularPayoutAmount;

            list.Add(new PayoutSchedule
            {
                InvestmentId = inv.Id,
                PeriodNo = i,
                DueDate = due.Date,
                PlannedAmount = planned,
                Status = ScheduleStatus.PLANNED,
                Comment = null,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                DeletedAt = null
            });
        }

        return list;
    }
}