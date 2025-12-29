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
        // Rechercher les véhicules actifs et vérifiés
        var vehiclesQuery = _context.Vehicles
            .Include(v => v.LocationCity)
            .Include(v => v.Owner)
            .Where(v => v.ListingStatus == "Active" && v.IsVerified);

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
