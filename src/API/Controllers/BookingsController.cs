using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using GMoP.API.Data;
using GMoP.API.Models;
using GMoP.API.Services;

namespace GMoP.API.Controllers;

/// <summary>
/// Bookings controller for reservation management
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly GMoPDbContext _context;
    private readonly ILogger<BookingsController> _logger;
    private readonly IEmailService _emailService;

    public BookingsController(GMoPDbContext context, ILogger<BookingsController> logger, IEmailService emailService)
    {
        _context = context;
        _logger = logger;
        _emailService = emailService;
    }

    /// <summary>
    /// Create a new booking request
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<BookingResponse>> CreateBooking([FromBody] CreateBookingRequest request)
    {
        // 1. Get current user
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var renterId))
        {
            return Unauthorized();
        }

        // 2. Validate vehicle exists and is available
        var vehicle = await _context.Vehicles
            .Include(v => v.Owner)
            .Include(v => v.LocationCity)
            .FirstOrDefaultAsync(v => v.VehicleID == request.VehicleID && v.ListingStatus == "Active");

        if (vehicle == null)
        {
            return NotFound("Vehicle not found or not available");
        }

        // 3. Can't book your own vehicle
        if (vehicle.OwnerID == renterId)
        {
            return BadRequest("You cannot book your own vehicle");
        }

        // 4. Validate dates
        if (request.StartDate < DateTime.UtcNow.Date)
        {
            return BadRequest("Start date cannot be in the past");
        }

        if (request.EndDate <= request.StartDate)
        {
            return BadRequest("End date must be after start date");
        }

        // 5. Check for overlapping bookings
        var hasConflict = await _context.Bookings
            .AnyAsync(b => b.VehicleID == request.VehicleID
                && b.Status != "Cancelled"
                && ((request.StartDate >= b.StartDate && request.StartDate < b.EndDate)
                    || (request.EndDate > b.StartDate && request.EndDate <= b.EndDate)
                    || (request.StartDate <= b.StartDate && request.EndDate >= b.EndDate)));

        if (hasConflict)
        {
            return BadRequest("Vehicle is not available for the selected dates");
        }

        // 6. Calculate pricing
        var totalDays = (request.EndDate - request.StartDate).Days;
        var dailyRate = vehicle.BaseDailyRate;
        var chauffeurFee = request.IncludesChauffeur && vehicle.IsChauffeurAvailable 
            ? (vehicle.ChauffeurDailyFee ?? 0) * totalDays 
            : 0;
        var subtotal = (dailyRate * totalDays) + chauffeurFee;
        var platformFee = subtotal * 0.12m; // 12% platform fee
        var securityDeposit = dailyRate * 2; // 2 days as deposit
        var totalAmount = subtotal + platformFee;
        var hostPayout = subtotal - (subtotal * 0.12m); // Owner gets 88%

        // 7. Generate booking reference
        var bookingRef = $"GMoP-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";

        // 8. Create booking
        var booking = new Booking
        {
            BookingID = Guid.NewGuid(),
            BookingReference = bookingRef,
            VehicleID = vehicle.VehicleID,
            RenterID = renterId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IncludesChauffeur = request.IncludesChauffeur,
            PickupCityID = vehicle.LocationCityID,
            DropoffCityID = vehicle.LocationCityID,
            PickupAddress = request.PickupAddress,
            DropoffAddress = request.DropoffAddress,
            TotalAmount = totalAmount,
            PlatformFee = platformFee,
            SecurityDeposit = securityDeposit,
            HostPayoutAmount = hostPayout,
            CurrencyCode = vehicle.CurrencyCode,
            Status = "Requested",
            PaymentStatus = "PendingDeposit",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        // 9. Get renter info for response
        var renter = await _context.Users.FindAsync(renterId);

        // 10. Send email notification to owner
        _ = _emailService.SendBookingRequestedAsync(
            vehicle.Owner.Email,
            vehicle.Owner.FullName,
            $"{vehicle.Year} {vehicle.Make} {vehicle.Model}",
            renter?.FullName ?? "Unknown",
            booking.StartDate,
            booking.EndDate
        );

        return Ok(new BookingResponse
        {
            BookingID = booking.BookingID,
            BookingReference = booking.BookingReference,
            VehicleName = $"{vehicle.Year} {vehicle.Make} {vehicle.Model}",
            StartDate = booking.StartDate,
            EndDate = booking.EndDate,
            TotalDays = totalDays,
            DailyRate = dailyRate,
            ChauffeurFee = chauffeurFee,
            TotalAmount = totalAmount,
            PlatformFee = platformFee,
            SecurityDeposit = securityDeposit,
            Status = booking.Status,
            CurrencyCode = booking.CurrencyCode,
            OwnerName = vehicle.Owner.FullName,
            RenterName = renter?.FullName ?? "Unknown"
        });
    }

    /// <summary>
    /// Get bookings for current user (as renter)
    /// </summary>
    [HttpGet("my-bookings")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<BookingResponse>>> GetMyBookings()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        var bookings = await _context.Bookings
            .Include(b => b.Vehicle)
            .ThenInclude(v => v.Owner)
            .Include(b => b.Renter)
            .Where(b => b.RenterID == userId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new BookingResponse
            {
                BookingID = b.BookingID,
                BookingReference = b.BookingReference,
                VehicleName = $"{b.Vehicle.Year} {b.Vehicle.Make} {b.Vehicle.Model}",
                StartDate = b.StartDate,
                EndDate = b.EndDate,
                TotalDays = (b.EndDate - b.StartDate).Days,
                DailyRate = b.Vehicle.BaseDailyRate,
                TotalAmount = b.TotalAmount,
                PlatformFee = b.PlatformFee,
                SecurityDeposit = b.SecurityDeposit,
                Status = b.Status,
                CurrencyCode = b.CurrencyCode,
                OwnerName = b.Vehicle.Owner.FullName,
                RenterName = b.Renter.FullName
            })
            .ToListAsync();

        return Ok(bookings);
    }

    /// <summary>
    /// Get booking requests for vehicles owned by current user
    /// </summary>
    [HttpGet("owner-requests")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<BookingResponse>>> GetOwnerBookingRequests()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        var bookings = await _context.Bookings
            .Include(b => b.Vehicle)
            .ThenInclude(v => v.Owner)
            .Include(b => b.Renter)
            .Where(b => b.Vehicle.OwnerID == userId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new BookingResponse
            {
                BookingID = b.BookingID,
                BookingReference = b.BookingReference,
                VehicleName = $"{b.Vehicle.Year} {b.Vehicle.Make} {b.Vehicle.Model}",
                StartDate = b.StartDate,
                EndDate = b.EndDate,
                TotalDays = (b.EndDate - b.StartDate).Days,
                DailyRate = b.Vehicle.BaseDailyRate,
                TotalAmount = b.TotalAmount,
                PlatformFee = b.PlatformFee,
                SecurityDeposit = b.SecurityDeposit,
                Status = b.Status,
                CurrencyCode = b.CurrencyCode,
                OwnerName = b.Vehicle.Owner.FullName,
                RenterName = b.Renter.FullName
            })
            .ToListAsync();

        return Ok(bookings);
    }

    /// <summary>
    /// Owner confirms or rejects a booking
    /// </summary>
    [HttpPut("{id}/status")]
    [Authorize]
    public async Task<ActionResult> UpdateBookingStatus(Guid id, [FromBody] UpdateBookingStatusRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        var booking = await _context.Bookings
            .Include(b => b.Vehicle)
            .FirstOrDefaultAsync(b => b.BookingID == id);

        if (booking == null)
        {
            return NotFound("Booking not found");
        }

        // Only vehicle owner can update status
        if (booking.Vehicle.OwnerID != userId)
        {
            return Forbid();
        }

        // Validate status transition
        var allowedStatuses = new[] { "Confirmed", "Cancelled" };
        if (!allowedStatuses.Contains(request.Status))
        {
            return BadRequest("Invalid status. Allowed: Confirmed, Cancelled");
        }

        booking.Status = request.Status;
        booking.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Send email notification to renter
        var renter = await _context.Users.FindAsync(booking.RenterID);
        var vehicle = booking.Vehicle;
        
        if (request.Status == "Confirmed" && renter != null)
        {
            _ = _emailService.SendBookingConfirmedAsync(
                renter.Email,
                renter.FullName,
                $"{vehicle.Year} {vehicle.Make} {vehicle.Model}",
                vehicle.Owner?.FullName ?? "Owner",
                booking.StartDate,
                booking.EndDate
            );
        }
        else if (request.Status == "Cancelled" && renter != null)
        {
            _ = _emailService.SendBookingCancelledAsync(
                renter.Email,
                renter.FullName,
                $"{vehicle.Year} {vehicle.Make} {vehicle.Model}",
                booking.BookingReference
            );
        }

        return Ok(new { message = $"Booking {request.Status.ToLower()}" });
    }

    /// <summary>
    /// Renter cancels their own booking
    /// </summary>
    [HttpPut("{id}/cancel")]
    [Authorize]
    public async Task<ActionResult> CancelBooking(Guid id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null)
        {
            return NotFound("Booking not found");
        }

        // Only the renter can cancel their booking
        if (booking.RenterID != userId)
        {
            return Forbid();
        }

        // Can only cancel if Requested or Confirmed
        if (booking.Status != "Requested" && booking.Status != "Confirmed")
        {
            return BadRequest("Cannot cancel a booking that is already active, completed, or cancelled");
        }

        booking.Status = "Cancelled";
        booking.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Booking cancelled" });
    }

    /// <summary>
    /// Get booked dates for a vehicle (for availability calendar)
    /// </summary>
    [HttpGet("booked-dates/{vehicleId}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<BookedDateRange>>> GetBookedDates(Guid vehicleId)
    {
        var bookings = await _context.Bookings
            .Where(b => b.VehicleID == vehicleId 
                && b.Status != "Cancelled"
                && b.EndDate >= DateTime.UtcNow.Date)
            .Select(b => new BookedDateRange
            {
                StartDate = b.StartDate,
                EndDate = b.EndDate,
                Status = b.Status
            })
            .ToListAsync();

        return Ok(bookings);
    }
}

public class UpdateBookingStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

public class BookedDateRange
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
}
