using System.ComponentModel.DataAnnotations;

namespace GMoP.API.Models;

/// <summary>
/// User entity - Owners, Renters, and Managers
/// </summary>
public class User
{
    [Key]
    public Guid UserID { get; set; }
    public string CountryCode { get; set; } = "GN";
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string UserType { get; set; } = "Renter"; // Owner, Renter, Manager
    public string PlanType { get; set; } = "Basic"; // Basic, Pro, Fleet
    public bool IsVerified { get; set; }
    public string? VerificationToken { get; set; }
    public bool IsActive { get; set; } = true;
    public int MalusPoints { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
    public ICollection<Booking> Rentals { get; set; } = new List<Booking>();
    public ICollection<Penalty> Penalties { get; set; } = new List<Penalty>();
}

/// <summary>
/// City entity for Guinea locations
/// </summary>
public class City
{
    [Key]
    public int CityID { get; set; }
    public string CountryCode { get; set; } = "GN";
    public string CityName { get; set; } = string.Empty;
    public decimal DailyRateMultiplier { get; set; } = 1.0m;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Vehicle listing entity
/// </summary>
public class Vehicle
{
    [Key]
    public Guid VehicleID { get; set; }
    public Guid OwnerID { get; set; }
    public Guid? AgentContractID { get; set; }
    
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string LicensePlate { get; set; } = string.Empty;
    public string? VIN { get; set; }
    public string? Description { get; set; }
    
    public decimal BaseDailyRate { get; set; }
    public string CurrencyCode { get; set; } = "GNF";
    public bool IsChauffeurAvailable { get; set; }
    public decimal? ChauffeurDailyFee { get; set; }
    
    public string ListingStatus { get; set; } = "Draft"; // Draft, PendingReview, Active, Suspended, Archived
    public bool IsVerified { get; set; }
    
    public int LocationCityID { get; set; }
    public string? VehicleAttributes { get; set; } // JSON
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User Owner { get; set; } = null!;
    public City LocationCity { get; set; } = null!;
    public ICollection<VehicleDocument> Documents { get; set; } = new List<VehicleDocument>();
    public ICollection<VehiclePhoto> Photos { get; set; } = new List<VehiclePhoto>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}

/// <summary>
/// Vehicle document for 4-document compliance gate
/// </summary>
public class VehicleDocument
{
    [Key]
    public Guid DocumentID { get; set; }
    public Guid VehicleID { get; set; }
    
    public string DocumentType { get; set; } = string.Empty; // INSURANCE, ROADWORTHINESS, TAX_STAMP, OWNERSHIP
    public string DocumentURL { get; set; } = string.Empty;
    public string? DocumentNumber { get; set; }
    public DateTime ExpiryDate { get; set; }
    
    public bool IsVerified { get; set; }
    public bool ReminderSent { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Vehicle Vehicle { get; set; } = null!;
}

/// <summary>
/// Vehicle photo
/// </summary>
public class VehiclePhoto
{
    [Key]
    public Guid PhotoID { get; set; }
    public Guid VehicleID { get; set; }
    public string PhotoURL { get; set; } = string.Empty;
    public string PhotoType { get; set; } = "Exterior"; // Exterior, Interior, Dashboard, Documents, Other
    public int DisplayOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Vehicle Vehicle { get; set; } = null!;
}

/// <summary>
/// Booking/Reservation entity
/// </summary>
public class Booking
{
    [Key]
    public Guid BookingID { get; set; }
    public string BookingReference { get; set; } = string.Empty;
    public Guid VehicleID { get; set; }
    public Guid RenterID { get; set; }
    
    public decimal TotalAmount { get; set; }
    public decimal PlatformFee { get; set; }
    public decimal SecurityDeposit { get; set; }
    public decimal HostPayoutAmount { get; set; }
    public string CurrencyCode { get; set; } = "GNF";
    
    public string Status { get; set; } = "Requested"; // Requested, Confirmed, Active, Completed, Cancelled
    public string PaymentStatus { get; set; } = "PendingDeposit"; // PendingDeposit, DepositPaid, FullyPaid, Refunded
    public bool IsContractESigned { get; set; }
    public bool IncludesChauffeur { get; set; }
    
    public int PickupCityID { get; set; }
    public int DropoffCityID { get; set; }
    public string? PickupAddress { get; set; }
    public string? DropoffAddress { get; set; }
    
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public DateTime? ActualReturnDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Vehicle Vehicle { get; set; } = null!;
    public User Renter { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

/// <summary>
/// Penalty/Malus point entity
/// </summary>
public class Penalty
{
    [Key]
    public Guid PenaltyID { get; set; }
    public Guid UserID { get; set; }
    public Guid? BookingID { get; set; }
    
    public int Points { get; set; }
    public string PenaltyType { get; set; } = string.Empty; // LateCancellation, OffPlatformAttempt, LateReturn, etc.
    public string? Description { get; set; }
    
    public DateTime ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}

/// <summary>
/// Message entity with off-platform detection
/// </summary>
public class Message
{
    [Key]
    public Guid MessageID { get; set; }
    public Guid ConversationID { get; set; }
    public Guid SenderID { get; set; }
    public Guid RecipientID { get; set; }
    public Guid? BookingID { get; set; }
    
    public string MessageContent { get; set; } = string.Empty;
    public bool IsFlagged { get; set; }
    public string? FlagReason { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; }

    // Navigation
    public User Sender { get; set; } = null!;
    public User Recipient { get; set; } = null!;
}

/// <summary>
/// Review entity for vehicle ratings after completed bookings
/// </summary>
public class Review
{
    [Key]
    public Guid ReviewID { get; set; }
    public Guid BookingID { get; set; }
    public Guid VehicleID { get; set; }
    public Guid ReviewerID { get; set; }  // Renter who wrote the review
    public Guid OwnerID { get; set; }     // Owner of the vehicle
    
    // Overall rating (calculated average of categories)
    public decimal OverallRating { get; set; } // 1.0-5.0
    
    // Category ratings (1-5 stars each)
    public int CleanlinessRating { get; set; }   // Propreté
    public int MaintenanceRating { get; set; }   // Entretien
    public int CommunicationRating { get; set; } // Communication
    public int ConvenienceRating { get; set; }   // Commodité
    public int AccuracyRating { get; set; }      // Exactitude
    
    public string? Comment { get; set; }
    public bool IsPublished { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Booking Booking { get; set; } = null!;
    public Vehicle Vehicle { get; set; } = null!;
    public User Reviewer { get; set; } = null!;
}

/// <summary>
/// Payment transaction entity
/// </summary>
public class Payment
{
    [Key]
    public Guid PaymentID { get; set; }
    public Guid BookingID { get; set; }
    
    public decimal Amount { get; set; }
    public string CurrencyCode { get; set; } = "GNF";
    
    public string PaymentMethod { get; set; } = string.Empty; // BankTransfer, MobileMoney, Stripe, Cash
    public string? PaymentProvider { get; set; } // MTN, Orange, Stripe
    public string? ExternalTransactionID { get; set; }
    
    public string PaymentType { get; set; } = string.Empty; // Deposit, Balance, Refund, Payout
    public string Status { get; set; } = "Pending"; // Pending, Completed, Failed, Refunded
    
    public string? ProofURL { get; set; } // Screenshot for manual payments
    public string? Notes { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }

    // Navigation
    public Booking Booking { get; set; } = null!;
}

/// <summary>
/// Agency contract for manager-owner relationships
/// </summary>
public class AgencyContract
{
    [Key]
    public Guid ContractID { get; set; }
    public Guid ManagerID { get; set; }
    public Guid? OwnerID { get; set; }
    public string? CompanyName { get; set; }
    public string ContractDocumentURL { get; set; } = string.Empty;
    public DateTime? ExpirationDate { get; set; }
    public bool IsVerified { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
