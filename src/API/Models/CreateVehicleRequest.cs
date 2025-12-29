using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace GMoP.API.Models;

public class CreateVehicleRequest
{
    [Required]
    public string Make { get; set; } = string.Empty;

    [Required]
    public string Model { get; set; } = string.Empty;

    [Required]
    public int Year { get; set; }

    [Required]
    public string LicensePlate { get; set; } = string.Empty;

    [Required]
    public string VIN { get; set; } = string.Empty;

    [Required]
    public decimal BaseDailyRate { get; set; }

    [Required]
    public int CityID { get; set; }

    public bool IsChauffeurAvailable { get; set; }
    public decimal? ChauffeurDailyFee { get; set; }

    public string? Description { get; set; }

    // Multiple photos (up to 5, max 5MB each)
    public List<IFormFile>? Photos { get; set; }
}
