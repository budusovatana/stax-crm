using System;
using System.Collections.Generic;

namespace Stax.Dto.Investors
{
    public class InvestorListItemDto
    {
        public long Id { get; set; }
        public string FullName { get; set; } = "";

        public string? Phone { get; set; }
        public string? Email { get; set; }
    }

    public class InvestorUpsertDto
    {
        public string LastName { get; set; } = "";
        public string FirstName { get; set; } = "";
        public string? Patronymic { get; set; }

        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Passport { get; set; }
        public string? Inn { get; set; }
        public string? Comment { get; set; }
    }

    public class InvestorInvestmentDto
    {
        public long Id { get; set; }
        public string Car { get; set; } = "";
        public decimal PrincipalAmount { get; set; }
        public decimal TotalReturnAmount { get; set; }
        public string Status { get; set; } = "";
    }

    public class InvestorViewDto
    {
        public long Id { get; set; }

        public string FullName { get; set; }

        // ✅ ДОБАВЬ ВОТ ЭТО:
        public string LastName { get; set; }
        public string FirstName { get; set; }
        public string Patronymic { get; set; }

        public string Phone { get; set; }
        public string Email { get; set; }
        public string Passport { get; set; }
        public string Inn { get; set; }
        public string Comment { get; set; }

        public decimal TotalPaid { get; set; }

        public List<InvestorInvestmentDto> Investments { get; set; } = new List<InvestorInvestmentDto>();
        public List<InvestorDocumentDto> Documents { get; set; } = new List<InvestorDocumentDto>();
    }
}