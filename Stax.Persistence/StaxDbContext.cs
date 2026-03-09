using Microsoft.EntityFrameworkCore;
using Stax.Domain.Entities;

namespace Stax.Persistence;

public class StaxDbContext : DbContext
{
    public StaxDbContext(DbContextOptions<StaxDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Investor> Investors => Set<Investor>();
    public DbSet<Owner> Owners => Set<Owner>();
    public DbSet<Car> Cars => Set<Car>();
    public DbSet<Investment> Investments => Set<Investment>();
    public DbSet<PayoutSchedule> PayoutSchedules => Set<PayoutSchedule>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentLink> DocumentLinks => Set<DocumentLink>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("stax1");

        // =====================
        // users
        // =====================
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasQueryFilter(x => x.DeletedAt == null);

            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Username).HasColumnName("username");
            e.Property(x => x.PasswordHash).HasColumnName("password_hash");
            e.Property(x => x.PasswordSalt).HasColumnName("password_salt");
            e.Property(x => x.Role).HasColumnName("role").HasColumnType("stax1.user_role");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.DisplayName).HasColumnName("display_name");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");
        });

        // =====================
        // investors
        // =====================
        modelBuilder.Entity<Investor>(e =>
        {
            e.ToTable("investors");
            e.HasKey(x => x.Id);

            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.LastName).HasColumnName("last_name");
            e.Property(x => x.FirstName).HasColumnName("first_name");
            e.Property(x => x.Patronymic).HasColumnName("patronymic");

            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.Passport).HasColumnName("passport");
            e.Property(x => x.Inn).HasColumnName("inn");
            e.Property(x => x.Comment).HasColumnName("comment");

            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");
        });

        // =====================
        // owners (Leasing companies)
        // =====================
        modelBuilder.Entity<Owner>(e =>
        {
            e.ToTable("owners");
            e.HasKey(x => x.Id);

            e.Property(x => x.Id).HasColumnName("id");

            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Inn).HasColumnName("inn");
            e.Property(x => x.Ogrn).HasColumnName("ogrn");

            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.Comment).HasColumnName("comment");

            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");
        });

        // =====================
        // cars
        // =====================
        modelBuilder.Entity<Car>(e =>
        {
            e.ToTable("cars");
            e.HasKey(x => x.Id);

            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.MakeModel).HasColumnName("make_model");
            e.Property(x => x.PlateNumber).HasColumnName("plate_number");
            e.Property(x => x.Vin).HasColumnName("vin");
            e.Property(x => x.StsNumber).HasColumnName("sts_number");

            e.Property(x => x.OwnerId).HasColumnName("owner_id");

            e.Property(x => x.Color)
                .HasColumnName("color")
                .HasColumnType("stax1.car_color");

            e.Property(x => x.Year).HasColumnName("year");
            e.Property(x => x.MileageKm).HasColumnName("mileage_km");
            e.Property(x => x.HasAccident).HasColumnName("has_accident");
            e.Property(x => x.CarPrice).HasColumnName("car_price");
            e.Property(x => x.Comment).HasColumnName("comment");

            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");

            e.HasOne(x => x.Owner)
                .WithMany()
                .HasForeignKey(x => x.OwnerId);
        });

        // =====================
        // investments
        // =====================
        modelBuilder.Entity<Investment>(e =>
        {
            e.ToTable("investments");
            e.HasKey(x => x.Id);

            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.InvestorId).HasColumnName("investor_id");
            e.Property(x => x.CarId).HasColumnName("car_id");

            e.Property(x => x.PrincipalAmount).HasColumnName("principal_amount");
            e.Property(x => x.InterestRatePercent).HasColumnName("interest_rate_percent");

            e.Property(x => x.StartDate)
                .HasColumnName("start_date")
                .HasColumnType("date");

            e.Property(x => x.TermMonths).HasColumnName("term_months");

            e.Property(x => x.PayoutType)
                .HasColumnName("payout_type")
                .HasColumnType("stax1.payout_type");

            e.Property(x => x.RegularPayoutAmount).HasColumnName("regular_payout_amount");
            e.Property(x => x.TotalReturnAmount).HasColumnName("total_return_amount");

            e.Property(x => x.Status)
                .HasColumnName("status")
                .HasColumnType("stax1.investment_status");

            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");

            e.HasOne(x => x.Investor).WithMany().HasForeignKey(x => x.InvestorId);
            e.HasOne(x => x.Car).WithMany().HasForeignKey(x => x.CarId);
        });

        // =====================
        // payout_schedules
        // =====================
        modelBuilder.Entity<PayoutSchedule>(e =>
        {
            e.ToTable("payout_schedules");
            e.HasKey(x => x.Id);

            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.InvestmentId).HasColumnName("investment_id");
            e.Property(x => x.PeriodNo).HasColumnName("period_no");

            e.Property(x => x.DueDate)
                .HasColumnName("due_date")
                .HasColumnType("date");

            e.Property(x => x.PlannedAmount).HasColumnName("planned_amount");

            e.Property(x => x.Status)
                .HasColumnName("status")
                .HasColumnType("stax1.schedule_status");

            e.Property(x => x.Comment).HasColumnName("comment");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");

            e.HasIndex(x => new { x.InvestmentId, x.PeriodNo }).IsUnique();

            e.HasOne(x => x.Investment).WithMany().HasForeignKey(x => x.InvestmentId);
        });

        // =====================
        // payments
        // =====================
        modelBuilder.Entity<Payment>(e =>
        {
            e.ToTable("payments");
            e.HasKey(x => x.Id);

            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.InvestmentId).HasColumnName("investment_id");
            e.Property(x => x.ScheduleId).HasColumnName("schedule_id");

            e.Property(x => x.PaidAt)
                .HasColumnName("paid_at")
                .HasColumnType("date");

            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.PaymentMethod).HasColumnName("payment_method");
            e.Property(x => x.ReferenceNo).HasColumnName("reference_no");
            e.Property(x => x.ContractNo).HasColumnName("contract_no");
            e.Property(x => x.Comment).HasColumnName("comment");

            e.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id");

            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");

            e.HasOne(x => x.Investment).WithMany().HasForeignKey(x => x.InvestmentId);
            e.HasOne(x => x.Schedule).WithMany().HasForeignKey(x => x.ScheduleId);
            e.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId);
        });

        // =====================
        // documents
        // =====================
        modelBuilder.Entity<Document>(e =>
        {
            e.ToTable("documents");
            e.HasKey(x => x.Id);

            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.FileName).HasColumnName("file_name");
            e.Property(x => x.StoredFileName).HasColumnName("stored_file_name");
            e.Property(x => x.ContentType).HasColumnName("content_type");
            e.Property(x => x.SizeBytes).HasColumnName("size_bytes");
            e.Property(x => x.Sha256).HasColumnName("sha256");
            e.Property(x => x.UploadedByUserId).HasColumnName("uploaded_by_user_id");

            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");

            e.HasOne(x => x.UploadedByUser).WithMany().HasForeignKey(x => x.UploadedByUserId);
        });

        // =====================
        // document_links
        // =====================
        modelBuilder.Entity<DocumentLink>(e =>
        {
            e.ToTable("document_links");
            e.HasKey(x => x.Id);

            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.InvestorId).HasColumnName("investor_id");

            e.Property(x => x.DocType)
                .HasColumnName("doc_type")
                .HasColumnType("stax1.doc_type");

            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.ContractNo).HasColumnName("contract_no");

            e.Property(x => x.ContractDate)
                .HasColumnName("contract_date")
                .HasColumnType("date");

            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");

            e.HasOne(x => x.Document).WithMany().HasForeignKey(x => x.DocumentId);
            e.HasOne(x => x.Investor).WithMany().HasForeignKey(x => x.InvestorId);
        });

        // =====================
        // Soft delete filters
        // =====================
        modelBuilder.Entity<User>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Investor>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Owner>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Car>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Investment>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<PayoutSchedule>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Payment>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Document>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<DocumentLink>().HasQueryFilter(x => x.DeletedAt == null);

        base.OnModelCreating(modelBuilder);
    }
}