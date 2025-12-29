-- =============================================
-- G-MoP Stored Procedures
-- SQL Server 2025 - No Azure Dependencies
-- =============================================

USE GMoPDB;
GO

-- =============================================
-- SP: Vehicle Search (Full-Text/LIKE Search)
-- Recherche de véhicules sans AI/Vector
-- =============================================
CREATE OR ALTER PROCEDURE sp_SearchVehicles
    @SearchQuery NVARCHAR(500) = NULL,
    @CityID INT = NULL,
    @MinPrice DECIMAL(10,2) = NULL,
    @MaxPrice DECIMAL(10,2) = NULL,
    @ChauffeurRequired BIT = NULL,
    @MaxResults INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Rechercher les véhicules actifs et vérifiés
    SELECT TOP (@MaxResults)
        v.VehicleID,
        v.Make,
        v.Model,
        v.Year,
        v.BaseDailyRate,
        v.CurrencyCode,
        v.Description,
        v.IsChauffeurAvailable,
        v.ChauffeurDailyFee,
        v.LicensePlate,
        c.CityName,
        c.CountryCode,
        u.FullName AS OwnerName
    FROM Vehicles v
    INNER JOIN Cities c ON v.LocationCityID = c.CityID
    INNER JOIN Users u ON v.OwnerID = u.UserID
    WHERE v.ListingStatus = 'Active'
      AND v.IsVerified = 1
      AND (@CityID IS NULL OR v.LocationCityID = @CityID)
      AND (@MinPrice IS NULL OR v.BaseDailyRate >= @MinPrice)
      AND (@MaxPrice IS NULL OR v.BaseDailyRate <= @MaxPrice)
      AND (@ChauffeurRequired IS NULL OR v.IsChauffeurAvailable = @ChauffeurRequired)
      AND (@SearchQuery IS NULL OR @SearchQuery = '' OR 
           v.Make LIKE '%' + @SearchQuery + '%' OR
           v.Model LIKE '%' + @SearchQuery + '%' OR
           v.Description LIKE '%' + @SearchQuery + '%')
    ORDER BY v.CreatedAt DESC;
END;
GO

PRINT 'Created: sp_SearchVehicles';
GO

-- =============================================
-- SP: Check Vehicle Compliance (4-Document Gate)
-- Vérifie que les 4 documents obligatoires sont valides
-- =============================================
CREATE OR ALTER PROCEDURE sp_CheckVehicleCompliance
    @VehicleID UNIQUEIDENTIFIER,
    @IsCompliant BIT OUTPUT,
    @MissingDocuments NVARCHAR(MAX) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Les 4 documents requis pour la Guinée
    DECLARE @RequiredDocs TABLE (DocType NVARCHAR(50));
    INSERT INTO @RequiredDocs VALUES 
        ('INSURANCE'),        -- Assurance responsabilité civile
        ('ROADWORTHINESS'),   -- Visite Technique
        ('TAX_STAMP'),        -- Vignette
        ('OWNERSHIP');        -- Carte Grise ou Contrat de Mandat
    
    -- Documents valides (vérifiés ET non expirés)
    DECLARE @ValidDocs TABLE (DocType NVARCHAR(50));
    INSERT INTO @ValidDocs
    SELECT DocumentType
    FROM VehicleDocuments
    WHERE VehicleID = @VehicleID
      AND IsVerified = 1
      AND ExpiryDate > GETUTCDATE();
    
    -- Calculer les documents manquants
    SELECT @MissingDocuments = STRING_AGG(DocType, ', ')
    FROM @RequiredDocs
    WHERE DocType NOT IN (SELECT DocType FROM @ValidDocs);
    
    -- Déterminer la conformité
    SET @IsCompliant = CASE 
        WHEN @MissingDocuments IS NULL THEN 1
        ELSE 0
    END;
    
    -- Mettre à jour le statut de vérification du véhicule
    UPDATE Vehicles
    SET IsVerified = @IsCompliant,
        UpdatedAt = GETUTCDATE()
    WHERE VehicleID = @VehicleID;
END;
GO

PRINT 'Created: sp_CheckVehicleCompliance';
GO

-- =============================================
-- SP: Detect Off-Platform Contact Attempts
-- Détecte les tentatives de contact hors plateforme
-- =============================================
CREATE OR ALTER PROCEDURE sp_DetectOffPlatformContact
    @MessageContent NVARCHAR(MAX),
    @IsFlagged BIT OUTPUT,
    @FlagReason NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    SET @IsFlagged = 0;
    SET @FlagReason = NULL;
    
    -- Détection de numéros guinéens: +224 ou 6XX XXX XXX
    IF @MessageContent LIKE '%+224%' OR 
       @MessageContent LIKE '%224[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]%' OR
       @MessageContent LIKE '%6[0-9][0-9]%[0-9][0-9][0-9]%[0-9][0-9][0-9]%'
    BEGIN
        SET @IsFlagged = 1;
        SET @FlagReason = 'Guinea phone number detected';
        RETURN;
    END
    
    -- Détection d'emails
    IF @MessageContent LIKE '%@%.%'
    BEGIN
        SET @IsFlagged = 1;
        SET @FlagReason = 'Email address detected';
        RETURN;
    END
    
    -- Détection de WhatsApp/Telegram mentions
    IF LOWER(@MessageContent) LIKE '%whatsapp%' OR
       LOWER(@MessageContent) LIKE '%telegram%' OR
       LOWER(@MessageContent) LIKE '%viber%' OR
       LOWER(@MessageContent) LIKE '%signal%' OR
       LOWER(@MessageContent) LIKE '%contacte-moi%' OR
       LOWER(@MessageContent) LIKE '%appelle-moi%' OR
       LOWER(@MessageContent) LIKE '%mon numero%' OR
       LOWER(@MessageContent) LIKE '%mon numéro%'
    BEGIN
        SET @IsFlagged = 1;
        SET @FlagReason = 'External messaging app mentioned';
        RETURN;
    END
END;
GO

PRINT 'Created: sp_DetectOffPlatformContact';
GO

-- =============================================
-- SP: Calculate Active Malus Points
-- Calcule les points actifs (non expirés) d'un utilisateur
-- =============================================
CREATE OR ALTER PROCEDURE sp_CalculateActiveMalusPoints
    @UserID UNIQUEIDENTIFIER,
    @ActivePoints INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Somme des points actifs et non expirés
    SELECT @ActivePoints = ISNULL(SUM(Points), 0)
    FROM Penalties
    WHERE UserID = @UserID
      AND IsActive = 1
      AND ExpiresAt > GETUTCDATE();
    
    -- Mettre à jour le profil utilisateur
    UPDATE Users
    SET MalusPoints = @ActivePoints,
        UpdatedAt = GETUTCDATE()
    WHERE UserID = @UserID;
    
    -- Vérifier les seuils et désactiver le compte si nécessaire
    IF @ActivePoints >= 20
    BEGIN
        UPDATE Users
        SET IsActive = 0,
            UpdatedAt = GETUTCDATE()
        WHERE UserID = @UserID;
        
        PRINT 'User banned: 20+ malus points reached';
    END
END;
GO

PRINT 'Created: sp_CalculateActiveMalusPoints';
GO

-- =============================================
-- SP: Check Booking Availability
-- Vérifie la disponibilité d'un véhicule
-- =============================================
CREATE OR ALTER PROCEDURE sp_CheckBookingAvailability
    @VehicleID UNIQUEIDENTIFIER,
    @StartDate DATETIME2,
    @EndDate DATETIME2,
    @IsAvailable BIT OUTPUT,
    @ConflictingBookingID UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    SET @ConflictingBookingID = NULL;
    
    -- Chercher les réservations qui se chevauchent
    SELECT TOP 1 
        @ConflictingBookingID = BookingID
    FROM Bookings
    WHERE VehicleID = @VehicleID
      AND Status IN ('Confirmed', 'Active')
      AND (
          (@StartDate BETWEEN StartDate AND EndDate) OR
          (@EndDate BETWEEN StartDate AND EndDate) OR
          (StartDate BETWEEN @StartDate AND @EndDate)
      );
    
    SET @IsAvailable = CASE 
        WHEN @ConflictingBookingID IS NULL THEN 1
        ELSE 0
    END;
END;
GO

PRINT 'Created: sp_CheckBookingAvailability';
GO

-- =============================================
-- SP: Generate Booking Reference
-- Génère un numéro de réservation unique
-- =============================================
CREATE OR ALTER PROCEDURE sp_GenerateBookingReference
    @BookingReference NVARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Format: GM-YYMMDD-XXXX (ex: GM-251228-A1B2)
    DECLARE @DatePart NVARCHAR(6) = FORMAT(GETUTCDATE(), 'yyMMdd');
    DECLARE @RandomPart NVARCHAR(4);
    DECLARE @Attempts INT = 0;
    
    WHILE @Attempts < 10
    BEGIN
        -- Générer 4 caractères alphanumériques
        SET @RandomPart = SUBSTRING(REPLACE(NEWID(), '-', ''), 1, 4);
        SET @BookingReference = 'GM-' + @DatePart + '-' + UPPER(@RandomPart);
        
        -- Vérifier l'unicité
        IF NOT EXISTS (SELECT 1 FROM Bookings WHERE BookingReference = @BookingReference)
            RETURN;
        
        SET @Attempts = @Attempts + 1;
    END
    
    -- Fallback: utiliser un timestamp
    SET @BookingReference = 'GM-' + @DatePart + '-' + RIGHT(CAST(GETUTCDATE() AS BIGINT), 4);
END;
GO

PRINT 'Created: sp_GenerateBookingReference';
GO

-- =============================================
-- SP: Get Documents Expiring Soon
-- Récupère les documents qui expirent bientôt (pour rappels)
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetDocumentsExpiringSoon
    @DaysAhead INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        vd.DocumentID,
        vd.VehicleID,
        vd.DocumentType,
        vd.ExpiryDate,
        vd.ReminderSent,
        v.LicensePlate,
        v.Make,
        v.Model,
        u.UserID AS OwnerID,
        u.FullName AS OwnerName,
        u.Email AS OwnerEmail,
        u.Phone AS OwnerPhone,
        DATEDIFF(DAY, GETUTCDATE(), vd.ExpiryDate) AS DaysUntilExpiry
    FROM VehicleDocuments vd
    INNER JOIN Vehicles v ON vd.VehicleID = v.VehicleID
    INNER JOIN Users u ON v.OwnerID = u.UserID
    WHERE vd.ExpiryDate <= DATEADD(DAY, @DaysAhead, GETUTCDATE())
      AND vd.ExpiryDate > GETUTCDATE()
      AND v.ListingStatus IN ('Active', 'PendingReview')
    ORDER BY vd.ExpiryDate ASC;
END;
GO

PRINT 'Created: sp_GetDocumentsExpiringSoon';
GO

-- =============================================
-- SP: Expire Old Penalties (Scheduled Job)
-- Désactive automatiquement les pénalités expirées
-- =============================================
CREATE OR ALTER PROCEDURE sp_ExpireOldPenalties
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @AffectedUsers TABLE (UserID UNIQUEIDENTIFIER);
    
    -- Désactiver les pénalités expirées
    UPDATE Penalties
    SET IsActive = 0
    OUTPUT inserted.UserID INTO @AffectedUsers
    WHERE IsActive = 1
      AND ExpiresAt <= GETUTCDATE();
    
    -- Recalculer les points pour chaque utilisateur affecté
    DECLARE @UserID UNIQUEIDENTIFIER;
    DECLARE @ActivePoints INT;
    
    DECLARE user_cursor CURSOR FAST_FORWARD FOR 
    SELECT DISTINCT UserID FROM @AffectedUsers;
    
    OPEN user_cursor;
    FETCH NEXT FROM user_cursor INTO @UserID;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC sp_CalculateActiveMalusPoints @UserID, @ActivePoints OUTPUT;
        FETCH NEXT FROM user_cursor INTO @UserID;
    END;
    
    CLOSE user_cursor;
    DEALLOCATE user_cursor;
    
    SELECT @@ROWCOUNT AS ExpiredPenaltiesCount;
END;
GO

PRINT 'Created: sp_ExpireOldPenalties';
GO

-- =============================================
-- SP: Get User Dashboard Stats
-- Statistiques pour le tableau de bord utilisateur
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetUserDashboardStats
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Statistiques de base
    SELECT 
        u.UserID,
        u.FullName,
        u.UserType,
        u.MalusPoints,
        u.IsVerified,
        u.CreatedAt,
        
        -- Nombre de véhicules (si Owner)
        (SELECT COUNT(*) FROM Vehicles v WHERE v.OwnerID = @UserID) AS TotalVehicles,
        (SELECT COUNT(*) FROM Vehicles v WHERE v.OwnerID = @UserID AND v.ListingStatus = 'Active') AS ActiveVehicles,
        
        -- Nombre de réservations
        (SELECT COUNT(*) FROM Bookings b WHERE b.RenterID = @UserID) AS TotalRentals,
        (SELECT COUNT(*) FROM Bookings b WHERE b.RenterID = @UserID AND b.Status = 'Completed') AS CompletedRentals,
        
        -- Note moyenne reçue
        (SELECT AVG(CAST(r.Rating AS DECIMAL(3,2))) FROM Reviews r WHERE r.RevieweeID = @UserID) AS AverageRating,
        (SELECT COUNT(*) FROM Reviews r WHERE r.RevieweeID = @UserID) AS TotalReviews
        
    FROM Users u
    WHERE u.UserID = @UserID;
END;
GO

PRINT 'Created: sp_GetUserDashboardStats';
GO

PRINT '';
PRINT '========================================';
PRINT 'All stored procedures created successfully!';
PRINT '========================================';
GO
