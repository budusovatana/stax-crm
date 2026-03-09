namespace Stax.Dto.Documents;


public class DocumentListItemDto
{
    public long LinkId { get; set; }
    public long DocumentId { get; set; }
    public string FileName { get; set; } = "";
    public string DocType { get; set; } = "";
    public string? Title { get; set; }
    public string? ContractNo { get; set; }
    public DateTime? ContractDate { get; set; }
    public string? Investor { get; set; }
}

public class DocumentLinkCreateDto
{
    public long InvestorId { get; set; }
    public string DocType { get; set; } = "CONTRACT";
    public string? Title { get; set; }
    public string? ContractNo { get; set; }
    public DateTime? ContractDate { get; set; }
}