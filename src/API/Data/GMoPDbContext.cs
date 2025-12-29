using Microsoft.EntityFrameworkCore;
using GMoP.API.Models;

namespace GMoP.API.Data;

/// <summary>
/// Entity Framework Core DbContext for G-MoP database
/// </summary>
public class GMoPDbContext : DbContext
{
    public GMoPDbContext(DbContextOptions<GMoPDbContext> options) : base(options)
    {
    }

    // Core entities
    public DbSet<User> Users => Set<User>();
    public DbSet<City> Cities => Set<City>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<VehicleDocument> VehicleDocuments => Set<VehicleDocument>();
    public DbSet<VehiclePhoto> VehiclePhotos => Set<VehiclePhoto>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Penalty> Penalties => Set<Penalty>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<AgencyContract> AgencyContracts => Set<AgencyContract>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserID);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Phone).IsUnique();
            entity.Property(e => e.UserType).HasMaxLength(20);
            entity.Property(e => e.PlanType).HasMaxLength(20).HasDefaultValue("Basic");
        });

        // City configuration
        modelBuilder.Entity<City>(entity =>
        {
            entity.HasKey(e => e.CityID);
            entity.HasIndex(e => new { e.CountryCode, e.CityName }).IsUnique();
        });

        // Vehicle configuration
        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.HasKey(e => e.VehicleID);
            entity.HasIndex(e => e.LicensePlate).IsUnique();
            entity.HasOne(e => e.Owner)
                  .WithMany(u => u.Vehicles)
                  .HasForeignKey(e => e.OwnerID)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.LocationCity)
                  .WithMany()
                  .HasForeignKey(e => e.LocationCityID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // VehicleDocument configuration
        modelBuilder.Entity<VehicleDocument>(entity =>
        {
            entity.HasKey(e => e.DocumentID);
            entity.HasIndex(e => new { e.VehicleID, e.DocumentType }).IsUnique();
            entity.HasOne(e => e.Vehicle)
                  .WithMany(v => v.Documents)
                  .HasForeignKey(e => e.VehicleID)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Booking configuration
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(e => e.BookingID);
            entity.HasIndex(e => e.BookingReference).IsUnique();
            entity.HasOne(e => e.Vehicle)
                  .WithMany(v => v.Bookings)
                  .HasForeignKey(e => e.VehicleID)
                  .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(e => e.Renter)
                  .WithMany(u => u.Rentals)
                  .HasForeignKey(e => e.RenterID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // Penalty configuration
        modelBuilder.Entity<Penalty>(entity =>
        {
            entity.HasKey(e => e.PenaltyID);
            entity.HasOne(e => e.User)
                  .WithMany(u => u.Penalties)
                  .HasForeignKey(e => e.UserID)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Message configuration
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.MessageID);
            entity.HasOne(e => e.Sender)
                  .WithMany()
                  .HasForeignKey(e => e.SenderID)
                  .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(e => e.Recipient)
                  .WithMany()
                  .HasForeignKey(e => e.RecipientID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // Review configuration
        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(e => e.ReviewID);
            entity.HasIndex(e => new { e.BookingID, e.ReviewerID }).IsUnique();
        });

        // Payment configuration
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.PaymentID);
            entity.HasOne(e => e.Booking)
                  .WithMany(b => b.Payments)
                  .HasForeignKey(e => e.BookingID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // AgencyContract configuration
        modelBuilder.Entity<AgencyContract>(entity =>
        {
            entity.HasKey(e => e.ContractID);
            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(e => e.ManagerID)
                  .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(e => e.OwnerID)
                  .OnDelete(DeleteBehavior.NoAction);
        });
    }
}
