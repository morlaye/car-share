using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using GMoP.API.Data;
using GMoP.API.Models;

namespace GMoP.API.Controllers;

/// <summary>
/// Admin controller for platform management
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize] // All admin actions require authentication
public class AdminController : ControllerBase
{
    private readonly GMoPDbContext _context;
    private readonly ILogger<AdminController> _logger;

    // For demo: hardcoded admin emails (in production, use roles in DB)
    private static readonly string[] AdminEmails = { "admin@gmop.gn", "morlaye@gmail.com" };

    public AdminController(GMoPDbContext context, ILogger<AdminController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private async Task<bool> IsAdmin()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            return false;

        var user = await _context.Users.FindAsync(userId);
        return user != null && (AdminEmails.Contains(user.Email.ToLower()) || user.UserType == "Admin");
    }

    /// <summary>
    /// Get dashboard stats
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<AdminStats>> GetStats()
    {
        if (!await IsAdmin()) return Forbid();

        var stats = new AdminStats
        {
            TotalUsers = await _context.Users.CountAsync(),
            TotalVehicles = await _context.Vehicles.CountAsync(),
            ActiveVehicles = await _context.Vehicles.CountAsync(v => v.ListingStatus == "Active"),
            TotalBookings = await _context.Bookings.CountAsync(),
            PendingBookings = await _context.Bookings.CountAsync(b => b.Status == "Requested"),
            ConfirmedBookings = await _context.Bookings.CountAsync(b => b.Status == "Confirmed"),
            PendingPayments = await _context.Bookings.CountAsync(b => b.PaymentStatus == "PendingDeposit")
        };

        return Ok(stats);
    }

    /// <summary>
    /// Get all bookings (admin view)
    /// </summary>
    [HttpGet("bookings")]
    public async Task<ActionResult<IEnumerable<AdminBookingView>>> GetAllBookings()
    {
        if (!await IsAdmin()) return Forbid();

        var bookings = await _context.Bookings
            .Include(b => b.Vehicle)
            .Include(b => b.Renter)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new AdminBookingView
            {
                BookingID = b.BookingID,
                BookingReference = b.BookingReference,
                VehicleName = $"{b.Vehicle.Year} {b.Vehicle.Make} {b.Vehicle.Model}",
                RenterName = b.Renter.FullName,
                RenterEmail = b.Renter.Email,
                StartDate = b.StartDate,
                EndDate = b.EndDate,
                TotalAmount = b.TotalAmount,
                SecurityDeposit = b.SecurityDeposit,
                CurrencyCode = b.CurrencyCode,
                Status = b.Status,
                PaymentStatus = b.PaymentStatus,
                CreatedAt = b.CreatedAt
            })
            .ToListAsync();

        return Ok(bookings);
    }

    /// <summary>
    /// Admin confirms payment was collected manually
    /// </summary>
    [HttpPut("bookings/{id}/confirm-payment")]
    public async Task<ActionResult> ConfirmPayment(Guid id, [FromBody] ConfirmPaymentRequest request)
    {
        if (!await IsAdmin()) return Forbid();

        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null)
        {
            return NotFound("Booking not found");
        }

        // Update payment status
        booking.PaymentStatus = request.PaymentType switch
        {
            "Deposit" => "DepositPaid",
            "Full" => "FullyPaid",
            _ => booking.PaymentStatus
        };

        // If deposit is paid and booking is confirmed, mark as Active
        if (booking.PaymentStatus == "DepositPaid" && booking.Status == "Confirmed")
        {
            booking.Status = "Active";
        }

        booking.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Admin confirmed {PaymentType} payment for booking {BookingRef}", 
            request.PaymentType, booking.BookingReference);

        return Ok(new { message = $"Payment confirmed: {request.PaymentType}" });
    }

    /// <summary>
    /// Admin marks booking as completed
    /// </summary>
    [HttpPut("bookings/{id}/complete")]
    public async Task<ActionResult> CompleteBooking(Guid id)
    {
        if (!await IsAdmin()) return Forbid();

        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null)
        {
            return NotFound("Booking not found");
        }

        booking.Status = "Completed";
        booking.ActualReturnDate = DateTime.UtcNow;
        booking.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Booking completed" });
    }

    /// <summary>
    /// Get all users (admin view)
    /// </summary>
    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<AdminUserView>>> GetAllUsers()
    {
        if (!await IsAdmin()) return Forbid();

        var users = await _context.Users
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new AdminUserView
            {
                UserID = u.UserID,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.Phone,
                UserType = u.UserType,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    /// <summary>
    /// Get all vehicles (admin view)
    /// </summary>
    [HttpGet("vehicles")]
    public async Task<ActionResult<IEnumerable<AdminVehicleView>>> GetAllVehicles()
    {
        if (!await IsAdmin()) return Forbid();

        var vehicles = await _context.Vehicles
            .Include(v => v.Owner)
            .Include(v => v.LocationCity)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new AdminVehicleView
            {
                VehicleID = v.VehicleID,
                Make = v.Make,
                Model = v.Model,
                Year = v.Year,
                OwnerName = v.Owner.FullName,
                CityName = v.LocationCity.CityName,
                ListingStatus = v.ListingStatus,
                IsVerified = v.IsVerified,
                CreatedAt = v.CreatedAt
            })
            .ToListAsync();

        return Ok(vehicles);
    }

    /// <summary>
    /// Verify/unverify a vehicle
    /// </summary>
    [HttpPut("vehicles/{id}/verify")]
    public async Task<ActionResult> VerifyVehicle(Guid id, [FromBody] VerifyVehicleRequest request)
    {
        if (!await IsAdmin()) return Forbid();

        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null)
        {
            return NotFound("Vehicle not found");
        }

        vehicle.IsVerified = request.IsVerified;
        vehicle.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = vehicle.IsVerified ? "Vehicle verified" : "Vehicle unverified" });
    }
}

// DTOs
public record AdminStats
{
    public int TotalUsers { get; init; }
    public int TotalVehicles { get; init; }
    public int ActiveVehicles { get; init; }
    public int TotalBookings { get; init; }
    public int PendingBookings { get; init; }
    public int ConfirmedBookings { get; init; }
    public int PendingPayments { get; init; }
}

public record AdminBookingView
{
    public Guid BookingID { get; init; }
    public string BookingReference { get; init; } = string.Empty;
    public string VehicleName { get; init; } = string.Empty;
    public string RenterName { get; init; } = string.Empty;
    public string RenterEmail { get; init; } = string.Empty;
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public decimal TotalAmount { get; init; }
    public decimal SecurityDeposit { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string PaymentStatus { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
}

public record AdminUserView
{
    public Guid UserID { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public string UserType { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record AdminVehicleView
{
    public Guid VehicleID { get; init; }
    public string Make { get; init; } = string.Empty;
    public string Model { get; init; } = string.Empty;
    public int Year { get; init; }
    public string OwnerName { get; init; } = string.Empty;
    public string CityName { get; init; } = string.Empty;
    public string ListingStatus { get; init; } = string.Empty;
    public bool IsVerified { get; init; }
    public DateTime CreatedAt { get; init; }
}

public class ConfirmPaymentRequest
{
    public string PaymentType { get; set; } = "Deposit"; // Deposit or Full
}

public class VerifyVehicleRequest
{
    public bool IsVerified { get; set; }
}
