using System.ComponentModel.DataAnnotations;

namespace GMoP.API.Models;

public class CreateBookingRequest
{
    [Required]
    public Guid VehicleID { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    public bool IncludesChauffeur { get; set; }

    public string? PickupAddress { get; set; }
    public string? DropoffAddress { get; set; }
}

public class BookingResponse
{
    public Guid BookingID { get; set; }
    public string BookingReference { get; set; } = string.Empty;
    public string VehicleName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalDays { get; set; }
    public decimal DailyRate { get; set; }
    public decimal ChauffeurFee { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PlatformFee { get; set; }
    public decimal SecurityDeposit { get; set; }
    public string Status { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = "GNF";
    public string OwnerName { get; set; } = string.Empty;
    public string RenterName { get; set; } = string.Empty;
}
