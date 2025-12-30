using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using GMoP.API.Data;
using GMoP.API.Models;

namespace GMoP.API.Controllers;

/// <summary>
/// Reviews controller for vehicle ratings
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly GMoPDbContext _context;
    private readonly ILogger<ReviewsController> _logger;

    public ReviewsController(GMoPDbContext context, ILogger<ReviewsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Submit a review for a completed booking
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ReviewResponse>> CreateReview([FromBody] CreateReviewRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        // 1. Validate booking exists and is completed
        var booking = await _context.Bookings
            .Include(b => b.Vehicle)
            .ThenInclude(v => v.Owner)
            .FirstOrDefaultAsync(b => b.BookingID == request.BookingID);

        if (booking == null)
        {
            return NotFound("Booking not found");
        }

        // 2. Only the renter can review
        if (booking.RenterID != userId)
        {
            return BadRequest("Only the renter can review this booking");
        }

        // 3. Booking must be completed
        if (booking.Status != "Completed")
        {
            return BadRequest("Can only review completed bookings");
        }

        // 4. Check if already reviewed
        var existingReview = await _context.Reviews.AnyAsync(r => r.BookingID == request.BookingID);
        if (existingReview)
        {
            return BadRequest("You have already reviewed this booking");
        }

        // 5. Validate ratings (1-5)
        if (request.CleanlinessRating < 1 || request.CleanlinessRating > 5 ||
            request.MaintenanceRating < 1 || request.MaintenanceRating > 5 ||
            request.CommunicationRating < 1 || request.CommunicationRating > 5 ||
            request.ConvenienceRating < 1 || request.ConvenienceRating > 5 ||
            request.AccuracyRating < 1 || request.AccuracyRating > 5)
        {
            return BadRequest("All ratings must be between 1 and 5");
        }

        // 6. Calculate overall rating (average of categories)
        var overallRating = (request.CleanlinessRating + request.MaintenanceRating + 
                            request.CommunicationRating + request.ConvenienceRating + 
                            request.AccuracyRating) / 5.0m;

        // 7. Create review
        var review = new Review
        {
            ReviewID = Guid.NewGuid(),
            BookingID = booking.BookingID,
            VehicleID = booking.VehicleID,
            ReviewerID = userId,
            OwnerID = booking.Vehicle.OwnerID,
            OverallRating = Math.Round(overallRating, 1),
            CleanlinessRating = request.CleanlinessRating,
            MaintenanceRating = request.MaintenanceRating,
            CommunicationRating = request.CommunicationRating,
            ConvenienceRating = request.ConvenienceRating,
            AccuracyRating = request.AccuracyRating,
            Comment = request.Comment,
            IsPublished = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();

        var reviewer = await _context.Users.FindAsync(userId);

        return Ok(new ReviewResponse
        {
            ReviewID = review.ReviewID,
            OverallRating = review.OverallRating,
            CleanlinessRating = review.CleanlinessRating,
            MaintenanceRating = review.MaintenanceRating,
            CommunicationRating = review.CommunicationRating,
            ConvenienceRating = review.ConvenienceRating,
            AccuracyRating = review.AccuracyRating,
            Comment = review.Comment,
            ReviewerName = reviewer?.FullName ?? "Anonymous",
            CreatedAt = review.CreatedAt
        });
    }

    /// <summary>
    /// Get reviews for a vehicle
    /// </summary>
    [HttpGet("vehicle/{vehicleId}")]
    [AllowAnonymous]
    public async Task<ActionResult<VehicleReviewsResult>> GetVehicleReviews(Guid vehicleId)
    {
        var vehicle = await _context.Vehicles
            .Include(v => v.Owner)
            .FirstOrDefaultAsync(v => v.VehicleID == vehicleId);

        if (vehicle == null)
        {
            return NotFound("Vehicle not found");
        }

        var reviews = await _context.Reviews
            .Include(r => r.Reviewer)
            .Where(r => r.VehicleID == vehicleId && r.IsPublished)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReviewResponse
            {
                ReviewID = r.ReviewID,
                OverallRating = r.OverallRating,
                CleanlinessRating = r.CleanlinessRating,
                MaintenanceRating = r.MaintenanceRating,
                CommunicationRating = r.CommunicationRating,
                ConvenienceRating = r.ConvenienceRating,
                AccuracyRating = r.AccuracyRating,
                Comment = r.Comment,
                ReviewerName = r.Reviewer.FullName,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();

        // Calculate averages
        var avgOverall = reviews.Any() ? Math.Round(reviews.Average(r => r.OverallRating), 1) : 0;
        var avgCleanliness = reviews.Any() ? Math.Round(reviews.Average(r => (decimal)r.CleanlinessRating), 1) : 0;
        var avgMaintenance = reviews.Any() ? Math.Round(reviews.Average(r => (decimal)r.MaintenanceRating), 1) : 0;
        var avgCommunication = reviews.Any() ? Math.Round(reviews.Average(r => (decimal)r.CommunicationRating), 1) : 0;
        var avgConvenience = reviews.Any() ? Math.Round(reviews.Average(r => (decimal)r.ConvenienceRating), 1) : 0;
        var avgAccuracy = reviews.Any() ? Math.Round(reviews.Average(r => (decimal)r.AccuracyRating), 1) : 0;

        // Get owner stats
        var ownerCompletedTrips = await _context.Bookings
            .CountAsync(b => b.Vehicle.OwnerID == vehicle.OwnerID && b.Status == "Completed");

        var ownerReviews = await _context.Reviews
            .Where(r => r.OwnerID == vehicle.OwnerID)
            .ToListAsync();
        
        var ownerAvgRating = ownerReviews.Any() ? Math.Round(ownerReviews.Average(r => r.OverallRating), 1) : 0;

        return Ok(new VehicleReviewsResult
        {
            VehicleID = vehicleId,
            TotalReviews = reviews.Count,
            AverageRating = avgOverall,
            AverageCleanliness = avgCleanliness,
            AverageMaintenance = avgMaintenance,
            AverageCommunication = avgCommunication,
            AverageConvenience = avgConvenience,
            AverageAccuracy = avgAccuracy,
            OwnerName = vehicle.Owner.FullName,
            OwnerRating = ownerAvgRating,
            OwnerTotalTrips = ownerCompletedTrips,
            OwnerMemberSince = vehicle.Owner.CreatedAt,
            Reviews = reviews
        });
    }

    /// <summary>
    /// Get pending reviews for current user
    /// </summary>
    [HttpGet("pending")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<PendingReviewItem>>> GetPendingReviews()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        // Get completed bookings without reviews
        var pendingReviews = await _context.Bookings
            .Include(b => b.Vehicle)
            .Where(b => b.RenterID == userId 
                && b.Status == "Completed"
                && !_context.Reviews.Any(r => r.BookingID == b.BookingID))
            .Select(b => new PendingReviewItem
            {
                BookingID = b.BookingID,
                BookingReference = b.BookingReference,
                VehicleName = $"{b.Vehicle.Year} {b.Vehicle.Make} {b.Vehicle.Model}",
                EndDate = b.EndDate
            })
            .ToListAsync();

        return Ok(pendingReviews);
    }
}

// DTOs
public class CreateReviewRequest
{
    public Guid BookingID { get; set; }
    public int CleanlinessRating { get; set; }
    public int MaintenanceRating { get; set; }
    public int CommunicationRating { get; set; }
    public int ConvenienceRating { get; set; }
    public int AccuracyRating { get; set; }
    public string? Comment { get; set; }
}

public class ReviewResponse
{
    public Guid ReviewID { get; set; }
    public decimal OverallRating { get; set; }
    public int CleanlinessRating { get; set; }
    public int MaintenanceRating { get; set; }
    public int CommunicationRating { get; set; }
    public int ConvenienceRating { get; set; }
    public int AccuracyRating { get; set; }
    public string? Comment { get; set; }
    public string ReviewerName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class VehicleReviewsResult
{
    public Guid VehicleID { get; set; }
    public int TotalReviews { get; set; }
    public decimal AverageRating { get; set; }
    public decimal AverageCleanliness { get; set; }
    public decimal AverageMaintenance { get; set; }
    public decimal AverageCommunication { get; set; }
    public decimal AverageConvenience { get; set; }
    public decimal AverageAccuracy { get; set; }
    
    // Owner stats
    public string OwnerName { get; set; } = string.Empty;
    public decimal OwnerRating { get; set; }
    public int OwnerTotalTrips { get; set; }
    public DateTime OwnerMemberSince { get; set; }
    
    public List<ReviewResponse> Reviews { get; set; } = new();
}

public class PendingReviewItem
{
    public Guid BookingID { get; set; }
    public string BookingReference { get; set; } = string.Empty;
    public string VehicleName { get; set; } = string.Empty;
    public DateTime EndDate { get; set; }
}
