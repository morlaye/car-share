using System.Net;
using System.Net.Mail;

namespace GMoP.API.Services;

/// <summary>
/// Email notification service for booking events
/// </summary>
public interface IEmailService
{
    Task SendBookingRequestedAsync(string ownerEmail, string ownerName, string vehicleName, string renterName, DateTime startDate, DateTime endDate);
    Task SendBookingConfirmedAsync(string renterEmail, string renterName, string vehicleName, string ownerName, DateTime startDate, DateTime endDate);
    Task SendBookingCancelledAsync(string recipientEmail, string recipientName, string vehicleName, string bookingRef);
    Task SendPaymentConfirmedAsync(string renterEmail, string renterName, string vehicleName, string bookingRef, string paymentType);
    Task SendWelcomeEmailAsync(string email, string name, string verificationLink);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;
    private readonly string _fromEmail;
    private readonly string _fromName;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
        _fromEmail = config["Email:From"] ?? "noreply@gmop.gn";
        _fromName = config["Email:FromName"] ?? "G-MoP";
    }

    public async Task SendBookingRequestedAsync(string ownerEmail, string ownerName, string vehicleName, string renterName, DateTime startDate, DateTime endDate)
    {
        var subject = $"🚗 Nouvelle demande de réservation - {vehicleName}";
        var body = $@"
<html>
<body style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
    <h1 style='color: #1e1b4b;'>Nouvelle demande de réservation</h1>
    <p>Bonjour {ownerName},</p>
    <p><strong>{renterName}</strong> souhaite réserver votre véhicule:</p>
    <div style='background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;'>
        <p style='margin: 0;'><strong>Véhicule:</strong> {vehicleName}</p>
        <p style='margin: 0;'><strong>Dates:</strong> {startDate:dd MMM yyyy} → {endDate:dd MMM yyyy}</p>
    </div>
    <p>Connectez-vous à votre tableau de bord pour accepter ou refuser cette demande.</p>
    <a href='https://gmop.gn/dashboard' style='display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;'>Voir la demande</a>
    <p style='color: #64748b; font-size: 12px; margin-top: 32px;'>G-MoP - La plateforme de location de véhicules en Guinée</p>
</body>
</html>";

        await SendEmailAsync(ownerEmail, subject, body);
    }

    public async Task SendBookingConfirmedAsync(string renterEmail, string renterName, string vehicleName, string ownerName, DateTime startDate, DateTime endDate)
    {
        var subject = $"✅ Réservation confirmée - {vehicleName}";
        var body = $@"
<html>
<body style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
    <h1 style='color: #16a34a;'>Votre réservation est confirmée!</h1>
    <p>Bonjour {renterName},</p>
    <p>Bonne nouvelle! <strong>{ownerName}</strong> a accepté votre demande de réservation.</p>
    <div style='background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;'>
        <p style='margin: 0;'><strong>Véhicule:</strong> {vehicleName}</p>
        <p style='margin: 0;'><strong>Dates:</strong> {startDate:dd MMM yyyy} → {endDate:dd MMM yyyy}</p>
        <p style='margin: 0;'><strong>Propriétaire:</strong> {ownerName}</p>
    </div>
    <p>Vous serez contacté pour les détails de prise en charge du véhicule.</p>
    <a href='https://gmop.gn/dashboard' style='display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;'>Voir ma réservation</a>
    <p style='color: #64748b; font-size: 12px; margin-top: 32px;'>G-MoP - La plateforme de location de véhicules en Guinée</p>
</body>
</html>";

        await SendEmailAsync(renterEmail, subject, body);
    }

    public async Task SendBookingCancelledAsync(string recipientEmail, string recipientName, string vehicleName, string bookingRef)
    {
        var subject = $"❌ Réservation annulée - {bookingRef}";
        var body = $@"
<html>
<body style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
    <h1 style='color: #dc2626;'>Réservation annulée</h1>
    <p>Bonjour {recipientName},</p>
    <p>La réservation <strong>{bookingRef}</strong> pour le véhicule <strong>{vehicleName}</strong> a été annulée.</p>
    <p>Si vous avez des questions, contactez-nous.</p>
    <p style='color: #64748b; font-size: 12px; margin-top: 32px;'>G-MoP - La plateforme de location de véhicules en Guinée</p>
</body>
</html>";

        await SendEmailAsync(recipientEmail, subject, body);
    }

    public async Task SendPaymentConfirmedAsync(string renterEmail, string renterName, string vehicleName, string bookingRef, string paymentType)
    {
        var paymentLabel = paymentType == "Deposit" ? "Caution" : "Paiement complet";
        var subject = $"💳 {paymentLabel} confirmé - {bookingRef}";
        var body = $@"
<html>
<body style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
    <h1 style='color: #1e1b4b;'>{paymentLabel} confirmé</h1>
    <p>Bonjour {renterName},</p>
    <p>Nous confirmons la réception de votre <strong>{paymentLabel.ToLower()}</strong> pour la réservation <strong>{bookingRef}</strong>.</p>
    <div style='background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;'>
        <p style='margin: 0;'><strong>Véhicule:</strong> {vehicleName}</p>
        <p style='margin: 0;'><strong>Référence:</strong> {bookingRef}</p>
    </div>
    <a href='https://gmop.gn/dashboard' style='display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;'>Mon tableau de bord</a>
    <p style='color: #64748b; font-size: 12px; margin-top: 32px;'>G-MoP - La plateforme de location de véhicules en Guinée</p>
</body>
</html>";

        await SendEmailAsync(renterEmail, subject, body);
    }

    public async Task SendWelcomeEmailAsync(string email, string name, string verificationLink)
    {
        var subject = "👋 Bienvenue sur G-MoP - Vérifiez votre email";
        var body = $@"
<html>
<body style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
    <h1 style='color: #1e1b4b;'>Bienvenue sur G-MoP!</h1>
    <p>Bonjour {name},</p>
    <p>Merci de vous être inscrit sur la première plateforme d'autopartage en Guinée.</p>
    <p>Pour activer votre compte et commencer à louer des véhicules, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous:</p>
    <a href='{verificationLink}' style='display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;'>Confirmer mon email</a>
    <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:</p>
    <p style='color: #64748b; font-size: 12px;'>{verificationLink}</p>
    <p style='color: #64748b; font-size: 12px; margin-top: 32px;'>G-MoP - La plateforme de location de véhicules en Guinée</p>
</body>
</html>";

        _logger.LogInformation("📧 Sending Welcome Email to {Email}. Link: {Link}", email, verificationLink);

        await SendEmailAsync(email, subject, body);
    }

    private async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        try
        {
            var smtpHost = _config["Email:SmtpHost"] ?? "localhost";
            var smtpPort = int.Parse(_config["Email:SmtpPort"] ?? "25");
            var smtpUser = _config["Email:SmtpUser"];
            var smtpPass = _config["Email:SmtpPass"];

            using var client = new SmtpClient(smtpHost, smtpPort);
            
            if (!string.IsNullOrEmpty(smtpUser) && !string.IsNullOrEmpty(smtpPass))
            {
                client.Credentials = new NetworkCredential(smtpUser, smtpPass);
                client.EnableSsl = true;
            }

            var message = new MailMessage
            {
                From = new MailAddress(_fromEmail, _fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(to);

            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent to {To}: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            // Log but don't throw - email failures shouldn't break the app
            _logger.LogError(ex, "Failed to send email to {To}: {Subject}", to, subject);
        }
    }
}
