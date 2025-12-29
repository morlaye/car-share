using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

    public AuthController(ILogger<AuthController> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Register a new user
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        // TODO: Implement user registration
        // 1. Validate input
        // 2. Check if email/phone already exists
        // 3. Hash password
        // 4. Create user in database
        // 5. Send verification SMS/email
        // 6. Return JWT token
        
        return Ok(new AuthResponse 
        { 
            Message = "Registration endpoint - implementation pending",
            Success = false 
        });
    }

    /// <summary>
    /// Login with email/phone and password
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        // TODO: Implement login
        // 1. Find user by email or phone
        // 2. Verify password hash
        // 3. Check if user is active and not banned (MalusPoints < 20)
        // 4. Generate JWT token
        // 5. Return token and user info
        
        return Ok(new AuthResponse 
        { 
            Message = "Login endpoint - implementation pending",
            Success = false 
        });
    }

    /// <summary>
    /// Get current user profile
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserProfile>> GetCurrentUser()
    {
        // TODO: Get user from JWT claims and return profile
        return Ok(new UserProfile 
        { 
            Message = "Profile endpoint - implementation pending" 
        });
    }
}

// Request DTOs
public record RegisterRequest
{
    public string Email { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string UserType { get; init; } = "Renter"; // Owner or Renter
}

public record LoginRequest
{
    public string EmailOrPhone { get; init; } = string.Empty;
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
