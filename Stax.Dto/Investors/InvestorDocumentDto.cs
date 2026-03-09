using System;

namespace Stax.Dto.Investors
{
    public class InvestorDocumentDto
    {
        public long LinkId { get; set; }
        public long DocumentId { get; set; }
        public string FileName { get; set; }
        public string DocType { get; set; }          // CONTRACT / ADD_AGREEMENT / OTHER
        public string ContractNo { get; set; }
        public DateTime? ContractDate { get; set; }  // DATE -> DateTime? (EF Core 3.1)
    }
}