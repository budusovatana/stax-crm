using Stax.Domain.Enums;

namespace Stax.Domain.Entities;

public class PayoutSchedule : BaseEntity
{
    public long InvestmentId { get; set; }
    public int PeriodNo { get; set; }               // period_no
    public DateTime DueDate { get; set; }           // due_date (date)
    public decimal PlannedAmount { get; set; }      // planned_amount
    public ScheduleStatus Status { get; set; } = ScheduleStatus.PLANNED;
    public string? Comment { get; set; }

    public Investment? Investment { get; set; }
}
