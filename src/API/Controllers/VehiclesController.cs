using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GMoP.API.Data;
using GMoP.API.Models;

namespace GMoP.API.Controllers;

/// <summary>
/// Controller for vehicle listings
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class VehiclesController : ControllerBase
{
    private readonly GMoPDbContext _context;
    private readonly ILogger<VehiclesController> _logger;

    public VehiclesController(GMoPDbContext context, ILogger<VehiclesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Search vehicles (public endpoint)
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<VehicleSearchResult>>> SearchVehicles(
        [FromQuery] string? query = null,
        [FromQuery] int? cityId = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] bool? chauffeurRequired = null,
        [FromQuery] int limit = 20)
    {
        // Rechercher les véhicules actifs (demo: skip verification check)
        var vehiclesQuery = _context.Vehicles
            .Include(v => v.LocationCity)
            .Include(v => v.Owner)
            .Where(v => v.ListingStatus == "Active");

        // Filtrer par ville si spécifié
        if (cityId.HasValue)
            vehiclesQuery = vehiclesQuery.Where(v => v.LocationCityID == cityId.Value);

        // Filtrer par prix
        if (minPrice.HasValue)
            vehiclesQuery = vehiclesQuery.Where(v => v.BaseDailyRate >= minPrice.Value);
        if (maxPrice.HasValue)
            vehiclesQuery = vehiclesQuery.Where(v => v.BaseDailyRate <= maxPrice.Value);

        // Filtrer par chauffeur disponible
        if (chauffeurRequired.HasValue)
            vehiclesQuery = vehiclesQuery.Where(v => v.IsChauffeurAvailable == chauffeurRequired.Value);

        // Recherche textuelle
        if (!string.IsNullOrWhiteSpace(query))
        {
            var searchTerm = query.ToLower();
            vehiclesQuery = vehiclesQuery.Where(v =>
                v.Make.ToLower().Contains(searchTerm) ||
                v.Model.ToLower().Contains(searchTerm) ||
                (v.Description != null && v.Description.ToLower().Contains(searchTerm)));
        }

        var vehicles = await vehiclesQuery
            .OrderByDescending(v => v.CreatedAt)
            .Take(limit)
            .Select(v => new VehicleSearchResult
            {
                VehicleID = v.VehicleID,
                Make = v.Make,
                Model = v.Model,
                Year = v.Year,
                BaseDailyRate = v.BaseDailyRate,
                CurrencyCode = v.CurrencyCode,
                IsChauffeurAvailable = v.IsChauffeurAvailable,
                ChauffeurDailyFee = v.ChauffeurDailyFee,
                CityName = v.LocationCity.CityName,
                OwnerName = v.Owner.FullName
            })
            .ToListAsync();

        return Ok(vehicles);
    }

    /// <summary>
    /// Get vehicle details by ID
    /// </summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<VehicleDetailResult>> GetVehicle(Guid id)
    {
        var vehicle = await _context.Vehicles
            .Include(v => v.LocationCity)
            .Include(v => v.Owner)
            .Include(v => v.Photos)
            .Include(v => v.Documents)
            .FirstOrDefaultAsync(v => v.VehicleID == id);

        if (vehicle == null)
            return NotFound(new { message = "Vehicle not found" });

        // Vérifier que le véhicule est actif et public
        if (vehicle.ListingStatus != "Active")
            return NotFound(new { message = "Vehicle not available" });

        return Ok(new VehicleDetailResult
        {
            VehicleID = vehicle.VehicleID,
            Make = vehicle.Make,
            Model = vehicle.Model,
            Year = vehicle.Year,
            Description = vehicle.Description,
            BaseDailyRate = vehicle.BaseDailyRate,
            CurrencyCode = vehicle.CurrencyCode,
            IsChauffeurAvailable = vehicle.IsChauffeurAvailable,
            ChauffeurDailyFee = vehicle.ChauffeurDailyFee,
            CityName = vehicle.LocationCity.CityName,
            OwnerName = vehicle.Owner.FullName,
            IsVerified = vehicle.IsVerified,
            PhotoURLs = vehicle.Photos.OrderBy(p => p.DisplayOrder).Select(p => p.PhotoURL).ToList()
        });
    }

    /// <summary>
    /// Get list of cities (public)
    /// </summary>
    [HttpGet("cities")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<CityResult>>> GetCities()
    {
        var cities = await _context.Cities
            .Where(c => c.IsActive)
            .Select(c => new CityResult
            {
                CityID = c.CityID,
                CityName = c.CityName,
                CountryCode = c.CountryCode
            })
            .ToListAsync();

        return Ok(cities);
    }

    /// <summary>
    /// Get vehicles owned by current user
    /// </summary>
    [HttpGet("my-vehicles")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<MyVehicleResult>>> GetMyVehicles()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        var vehicles = await _context.Vehicles
            .Include(v => v.LocationCity)
            .Where(v => v.OwnerID == userId)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new MyVehicleResult
            {
                VehicleID = v.VehicleID,
                Make = v.Make,
                Model = v.Model,
                Year = v.Year,
                BaseDailyRate = v.BaseDailyRate,
                CurrencyCode = v.CurrencyCode,
                ListingStatus = v.ListingStatus,
                CityName = v.LocationCity.CityName
            })
            .ToListAsync();

        return Ok(vehicles);
    }

    /// <summary>
    /// List a new vehicle (Owner)
    /// </summary>
    [HttpPost]
    [Authorize] // Requires authentication
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<VehicleDetailResult>> CreateVehicle([FromForm] CreateVehicleRequest request)
    {
        // 1. Validate Owner (User must be logged in)
        // For simplicity in this demo, we assume the token provides a generic NameIdentifier.
        // In a real app, we'd look up the User entity to ensure they are an "Owner".
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        // 2. Handle Image Uploads (up to 5, max 5MB each)
        var uploadedPhotos = new List<VehiclePhoto>();
        const long maxFileSize = 5 * 1024 * 1024; // 5MB
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        
        if (request.Photos != null && request.Photos.Count > 0)
        {
            if (request.Photos.Count > 5)
            {
                return BadRequest("Maximum 5 photos allowed");
            }

            var uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "vehicles");
            if (!Directory.Exists(uploadPath))
            {
                Directory.CreateDirectory(uploadPath);
            }

            int displayOrder = 1;
            foreach (var photo in request.Photos)
            {
                // Size validation
                if (photo.Length > maxFileSize)
                {
                    return BadRequest($"File '{photo.FileName}' exceeds 5MB limit");
                }

                // Extension validation
                var extension = Path.GetExtension(photo.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(extension))
                {
                    return BadRequest($"Invalid format for '{photo.FileName}'. Allowed: jpg, jpeg, png, webp");
                }

                // Save file
                var fileName = $"{Guid.NewGuid()}{extension}";
                var filePath = Path.Combine(uploadPath, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await photo.CopyToAsync(stream);
                }

                uploadedPhotos.Add(new VehiclePhoto
                {
                    PhotoID = Guid.NewGuid(),
                    PhotoURL = $"/uploads/vehicles/{fileName}",
                    PhotoType = displayOrder == 1 ? "Exterior" : "Other",
                    DisplayOrder = displayOrder++,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        // 3. Create Entity
        var vehicle = new Vehicle
        {
            VehicleID = Guid.NewGuid(),
            OwnerID = userId,
            Make = request.Make,
            Model = request.Model,
            Year = request.Year,
            LicensePlate = request.LicensePlate,
            VIN = request.VIN,
            BaseDailyRate = request.BaseDailyRate,
            CurrencyCode = "GNF", // Default
            LocationCityID = request.CityID,
            IsChauffeurAvailable = request.IsChauffeurAvailable,
            ChauffeurDailyFee = request.ChauffeurDailyFee,
            Description = request.Description,
            ListingStatus = "Active", // Auto-active for demo
            IsVerified = false, // verification flow separate
            CreatedAt = DateTime.UtcNow,
            Photos = uploadedPhotos
        };

        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();

        // 4. Return Result
        // Reload including relations for accurate response
        var createdVehicle = await _context.Vehicles
            .Include(v => v.LocationCity)
            .Include(v => v.Owner)
            .Include(v => v.Photos)
            .FirstOrDefaultAsync(v => v.VehicleID == vehicle.VehicleID);

        if (createdVehicle == null) return StatusCode(500, "Failed to retrieve created vehicle");

        return CreatedAtAction(nameof(GetVehicle), new { id = createdVehicle.VehicleID }, new VehicleDetailResult
        {
            VehicleID = createdVehicle.VehicleID,
            Make = createdVehicle.Make,
            Model = createdVehicle.Model,
            Year = createdVehicle.Year,
            Description = createdVehicle.Description,
            BaseDailyRate = createdVehicle.BaseDailyRate,
            CurrencyCode = createdVehicle.CurrencyCode,
            IsChauffeurAvailable = createdVehicle.IsChauffeurAvailable,
            ChauffeurDailyFee = createdVehicle.ChauffeurDailyFee,
            CityName = createdVehicle.LocationCity.CityName,
            OwnerName = createdVehicle.Owner.FullName,
            IsVerified = createdVehicle.IsVerified,
            PhotoURLs = createdVehicle.Photos.Select(p => p.PhotoURL).ToList()
        });
    }
}

// DTOs
public record VehicleSearchResult
{
    public Guid VehicleID { get; init; }
    public string Make { get; init; } = string.Empty;
    public string Model { get; init; } = string.Empty;
    public int Year { get; init; }
    public decimal BaseDailyRate { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
    public bool IsChauffeurAvailable { get; init; }
    public decimal? ChauffeurDailyFee { get; init; }
    public string CityName { get; init; } = string.Empty;
    public string OwnerName { get; init; } = string.Empty;
}

public record VehicleDetailResult : VehicleSearchResult
{
    public string? Description { get; init; }
    public bool IsVerified { get; init; }
    public List<string> PhotoURLs { get; init; } = new();
}

public record CityResult
{
    public int CityID { get; init; }
    public string CityName { get; init; } = string.Empty;
    public string CountryCode { get; init; } = string.Empty;
}

public record MyVehicleResult
{
    public Guid VehicleID { get; init; }
    public string Make { get; init; } = string.Empty;
    public string Model { get; init; } = string.Empty;
    public int Year { get; init; }
    public decimal BaseDailyRate { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
    public string ListingStatus { get; init; } = string.Empty;
    public string CityName { get; init; } = string.Empty;
}
