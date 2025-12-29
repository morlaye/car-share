using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using GMoP.API.Data;
using GMoP.API.Models;

namespace GMoP.API.Controllers;

/// <summary>
/// Authentication controller for login/register
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;
    private readonly GMoPDbContext _context;

    public AuthController(ILogger<AuthController> logger, IConfiguration configuration, GMoPDbContext context)
    {
        _logger = logger;
        _configuration = configuration;
        _context = context;
    }

    /// <summary>
    /// Register a new user
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        // 1. Validate input
        if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new AuthResponse { Success = false, Message = "Email and password are required" });
        }

        // 2. Check if email already exists
        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (existingUser != null)
        {
            return BadRequest(new AuthResponse { Success = false, Message = "Email already registered" });
        }

        // 3. Hash password
        var passwordHash = HashPassword(request.Password);

        // 4. Create user
        var user = new User
        {
            UserID = Guid.NewGuid(),
            Email = request.Email,
            Phone = request.Phone ?? "",
            PasswordHash = passwordHash,
            FullName = request.FullName,
            UserType = request.UserType ?? "Renter",
            IsVerified = false,
            IsActive = true,
            MalusPoints = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // 5. Generate JWT token
        var token = GenerateJwtToken(user);

        return Ok(new AuthResponse
        {
            Success = true,
            Message = "Registration successful",
            Token = token,
            User = new UserProfile
            {
                UserID = user.UserID,
                Email = user.Email,
                Phone = user.Phone,
                FullName = user.FullName,
                UserType = user.UserType,
                IsVerified = user.IsVerified,
                MalusPoints = user.MalusPoints
            }
        });
    }

    /// <summary>
    /// Login with email and password
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        // 1. Find user by email (or could support phone too)
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
        {
            return Unauthorized(new AuthResponse { Success = false, Message = "Invalid credentials" });
        }

        // 2. Verify password
        if (!VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized(new AuthResponse { Success = false, Message = "Invalid credentials" });
        }

        // 3. Check if user is active
        if (!user.IsActive)
        {
            return Unauthorized(new AuthResponse { Success = false, Message = "Account deactivated" });
        }

        // 4. Check malus points
        if (user.MalusPoints >= 20)
        {
            return Unauthorized(new AuthResponse { Success = false, Message = "Account suspended due to policy violations" });
        }

        // 5. Generate JWT
        var token = GenerateJwtToken(user);

        return Ok(new AuthResponse
        {
            Success = true,
            Message = "Login successful",
            Token = token,
            User = new UserProfile
            {
                UserID = user.UserID,
                Email = user.Email,
                Phone = user.Phone,
                FullName = user.FullName,
                UserType = user.UserType,
                IsVerified = user.IsVerified,
                MalusPoints = user.MalusPoints
            }
        });
    }

    /// <summary>
    /// Get current user profile
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserProfile>> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound();
        }

        return Ok(new UserProfile
        {
            UserID = user.UserID,
            Email = user.Email,
            Phone = user.Phone,
            FullName = user.FullName,
            UserType = user.UserType,
            IsVerified = user.IsVerified,
            MalusPoints = user.MalusPoints
        });
    }

    // --- Helper Methods ---

    private string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(password);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    private bool VerifyPassword(string password, string storedHash)
    {
        var hash = HashPassword(password);
        return hash == storedHash;
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret not configured");
        var issuer = jwtSettings["Issuer"];
        var audience = jwtSettings["Audience"];
        var expirationMinutes = int.Parse(jwtSettings["ExpirationMinutes"] ?? "60");

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim("userType", user.UserType)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

// Request DTOs
public record RegisterRequest
{
    public string Email { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public string Password { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? UserType { get; init; } = "Renter"; // Owner or Renter
}

public record LoginRequest
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}

// Response DTOs
public record AuthResponse
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public string? Token { get; init; }
    public UserProfile? User { get; init; }
}

public record UserProfile
{
    public Guid? UserID { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? FullName { get; init; }
    public string? UserType { get; init; }
    public bool? IsVerified { get; init; }
    public int? MalusPoints { get; init; }
    public string? Message { get; init; }
}
