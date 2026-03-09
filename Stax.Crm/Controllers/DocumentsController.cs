using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Stax.Domain.Entities;
using Stax.Domain.Enums;
using Stax.Dto.Documents;
using Stax.Persistence;

namespace Stax.Crm.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly StaxDbContext _db;
    private readonly IWebHostEnvironment _env;

    public DocumentsController(StaxDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private static string BuildFullName(Investor inv)
    {
        return inv.Patronymic == null
            ? $"{inv.LastName} {inv.FirstName}"
            : $"{inv.LastName} {inv.FirstName} {inv.Patronymic}";
    }

    private static DocType ParseDocTypeOrThrow(string? docType)
    {
        var s = (docType ?? "").Trim().ToUpperInvariant();
        if (s != "CONTRACT" && s != "ADD_AGREEMENT" && s != "OTHER")
            throw new Exception("Некорректный DocType (CONTRACT / ADD_AGREEMENT / OTHER)");

        return Enum.Parse<DocType>(s, ignoreCase: false);
    }

    // =========================
    // GET /api/documents
    // =========================
    [HttpGet]
    public async Task<ActionResult<List<DocumentListItemDto>>> GetAll()
    {
        var list = await (
            from l in _db.DocumentLinks.AsNoTracking()
            join d in _db.Documents.AsNoTracking() on l.DocumentId equals d.Id
            join inv in _db.Investors.AsNoTracking() on l.InvestorId equals inv.Id
            orderby l.CreatedAt descending
            select new DocumentListItemDto
            {
                LinkId = l.Id,
                DocumentId = d.Id,
                FileName = d.FileName,
                DocType = l.DocType.ToString(), // enum -> string
                Title = l.Title,
                ContractNo = l.ContractNo,
                ContractDate = l.ContractDate,
                Investor = BuildFullName(inv)
            }
        ).ToListAsync();

        return Ok(list);
    }

    // =========================
    // GET /api/documents/{documentId}/download
    // =========================
    [HttpGet("{documentId:long}/download")]
    public async Task<IActionResult> Download(long documentId, [FromQuery] long? linkId = null)
    {
        var doc = await _db.Documents.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == documentId);

        if (doc == null) return NotFound(new { message = "Файл не найден" });

        var path = Path.Combine(_env.WebRootPath, "uploads", doc.StoredFileName);
        if (!System.IO.File.Exists(path))
            return NotFound(new { message = "Файл не найден на диске" });

        var ct = string.IsNullOrWhiteSpace(doc.ContentType) ? "application/pdf" : doc.ContentType;

        // Формируем осмысленное имя файла если передан linkId
        var fileName = doc.FileName;
        if (linkId.HasValue)
        {
            var link = await _db.DocumentLinks.AsNoTracking()
                .Include(l => l.Investor)
                .FirstOrDefaultAsync(l => l.Id == linkId.Value);

            if (link != null)
            {
                var docTypeName = link.DocType.ToString();
                var contractNo = link.ContractNo ?? "";
                var investorName = link.Investor != null ? BuildFullName(link.Investor) : "";
                var parts = new[] { docTypeName, contractNo, investorName }
                    .Where(s => !string.IsNullOrWhiteSpace(s));
                fileName = string.Join("_", parts).Replace(" ", "_") + ".pdf";
            }
        }

        return PhysicalFile(path, ct, fileName);
    }

    // =========================
    // DELETE /api/documents/link/{linkId}
    // =========================
    [HttpDelete("link/{linkId:long}")]
    public async Task<IActionResult> DeleteLink(long linkId)
    {
        if (!this.IsAdmin()) return this.ForbidWithMessage();

        var now = DateTimeOffset.UtcNow;

        var link = await _db.DocumentLinks.FirstOrDefaultAsync(x => x.Id == linkId);
        if (link == null) return NotFound(new { message = "Связь не найдена" });

        link.DeletedAt = now;
        link.UpdatedAt = now;

        var doc = await _db.Documents.FirstOrDefaultAsync(x => x.Id == link.DocumentId);
        if (doc != null)
        {
            doc.DeletedAt = now;
            doc.UpdatedAt = now;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =========================
    // POST /api/documents/upload
    // =========================
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(30_000_000)]
    public async Task<IActionResult> Upload([FromForm] DocumentUploadRequest dto)
    {
        if (!this.IsAdmin()) return this.ForbidWithMessage();

        try
        {
            if (dto.File == null || dto.File.Length == 0)
                return BadRequest(new { message = "Файл не выбран" });

            if (!dto.File.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Разрешены только PDF" });

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { message = "Title обязателен" });

            var invExists = await _db.Investors.AnyAsync(x => x.Id == dto.InvestorId);
            if (!invExists)
                return BadRequest(new { message = "Инвестор не найден" });

            // ✅ DocType: string -> enum
            var parsedDocType = ParseDocTypeOrThrow(dto.DocType);

            var stored = Guid.NewGuid().ToString("N") + ".pdf";
            var uploads = Path.Combine(_env.WebRootPath, "uploads");
            Directory.CreateDirectory(uploads);
            var fullPath = Path.Combine(uploads, stored);

            await using (var fs = System.IO.File.Create(fullPath))
            {
                await dto.File.CopyToAsync(fs);
            }

            string sha256;
            await using (var stream = System.IO.File.OpenRead(fullPath))
            {
                using var sha = System.Security.Cryptography.SHA256.Create();
                var hash = await sha.ComputeHashAsync(stream);
                sha256 = Convert.ToHexString(hash).ToLowerInvariant();
            }

            var now = DateTimeOffset.UtcNow;

            var doc = new Document
            {
                FileName = dto.File.FileName,
                StoredFileName = stored,
                ContentType = "application/pdf",
                SizeBytes = dto.File.Length,
                Sha256 = sha256,
                UploadedByUserId = this.GetUserId(),
                CreatedAt = now,
                UpdatedAt = now,
                DeletedAt = null
            };

            _db.Documents.Add(doc);
            await _db.SaveChangesAsync();

            var link = new DocumentLink
            {
                DocumentId = doc.Id,
                InvestorId = dto.InvestorId,

                // ✅ enum в сущности
                DocType = parsedDocType,

                Title = dto.Title,
                ContractNo = dto.ContractNo,
                ContractDate = dto.ContractDate,

                CreatedAt = now,
                UpdatedAt = now,
                DeletedAt = null
            };

            _db.DocumentLinks.Add(link);
            await _db.SaveChangesAsync();

            return Ok(new { documentId = doc.Id, linkId = link.Id });
        }
        catch (DbUpdateException dbEx)
        {
            var pg = dbEx.InnerException as PostgresException;
            if (pg?.SqlState == "42804")
                return BadRequest(new { message = "Несовпадение типов enum/text. Проверь DocType и маппинг enum в Program.cs." });

            return BadRequest(new { message = pg?.MessageText ?? dbEx.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}