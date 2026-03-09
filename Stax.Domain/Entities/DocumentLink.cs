using Stax.Domain.Enums;

namespace Stax.Domain.Entities;

public class DocumentLink : BaseEntity
{
    public long DocumentId { get; set; }
    public long InvestorId { get; set; } // NOT NULL

    public DocType DocType { get; set; } = DocType.CONTRACT;
    public string? Title { get; set; }
    public string? ContractNo { get; set; }
    public DateTime? ContractDate { get; set; } // date

    public Document? Document { get; set; }
    public Investor? Investor { get; set; }
}