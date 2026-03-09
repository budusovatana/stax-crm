using Microsoft.AspNetCore.Http;
using System;

namespace Stax.Dto.Documents
{
    public class DocumentUploadRequest
    {
        public IFormFile File { get; set; } = default!;

        public long InvestorId { get; set; }

        public string DocType { get; set; } = "CONTRACT";
        public string Title { get; set; } = default!;

        public string? ContractNo { get; set; }
        public DateTime? ContractDate { get; set; }
    }
}