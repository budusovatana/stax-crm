namespace Stax.Domain.Entities;

public class Document : BaseEntity
{
    public string FileName { get; set; } = "";
    public string StoredFileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public string Sha256 { get; set; } = "";

    public long UploadedByUserId { get; set; }
    public User UploadedByUser { get; set; } = null!;
}