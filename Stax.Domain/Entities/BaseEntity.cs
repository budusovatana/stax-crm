namespace Stax.Domain.Entities;

public abstract class BaseEntity
{
    public long Id { get; set; }                 // BIGSERIAL
    public DateTimeOffset CreatedAt { get; set; } // timestamptz
    public DateTimeOffset UpdatedAt { get; set; } // timestamptz
    public DateTimeOffset? DeletedAt { get; set; }// timestamptz nullable
}
