-- =============================================
-- G-MoP Database Schema v2.5
-- SQL Server 2025 Enterprise Edition
-- No Azure dependencies - uses native SQL Server features only
-- =============================================

SET NOCOUNT ON;
GO

-- =============================================
-- Create Database with TDE
-- =============================================
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'GMoPDB')
BEGIN
    CREATE DATABASE GMoPDB
    ON PRIMARY 
    (
        NAME = GMoPDB_Data,
        FILENAME = 'D:\SQLData\Data\GMoPDB.mdf',
        SIZE = 1GB,
        MAXSIZE = UNLIMITED,
        FILEGROWTH = 256MB
    )
    LOG ON 
    (
        NAME = GMoPDB_Log,
        FILENAME = 'E:\SQLLogs\Logs\GMoPDB.ldf',
        SIZE = 512MB,
        MAXSIZE = 10GB,
        FILEGROWTH = 128MB
    );
END
GO

USE GMoPDB;
GO

-- Set Compatibility Level to SQL 2025
ALTER DATABASE GMoPDB SET COMPATIBILITY_LEVEL = 170;
GO

-- Enable Advanced Features

-- Step 1: Enable Accelerated Database Recovery
ALTER DATABASE GMoPDB
SET ACCELERATED_DATABASE_RECOVERY = ON;
GO

-- Step 2: Now enable Optimized Locking
ALTER DATABASE GMoPDB
SET OPTIMIZED_LOCKING = ON;
GO

-- =============================================
-- Schema Creation Transaction
-- =============================================
BEGIN TRANSACTION InitialSchema;

BEGIN TRY
    PRINT 'Starting G-MoP Schema Deployment (SQL 2025)...';
    
    -- =============================================
    -- 1. Users Table
    -- =============================================
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
    BEGIN
        CREATE TABLE Users (
            UserID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
            CountryCode NVARCHAR(5) NOT NULL DEFAULT 'GN',
            Email NVARCHAR(255) NOT NULL,
            Phone NVARCHAR(20) NOT NULL,
            PasswordHash NVARCHAR(MAX) NOT NULL,
            FullName NVARCHAR(100) NOT NULL,
            UserType NVARCHAR(20) NOT NULL CHECK (UserType IN ('Owner', 'Renter', 'Manager')),
            PlanType NVARCHAR(20) NOT NULL DEFAULT 'Basic' CHECK (PlanType IN ('Basic', 'Pro', 'Fleet')),
            IsVerified BIT NOT NULL DEFAULT 0,
            IsActive BIT NOT NULL DEFAULT 1,
            MalusPoints INT NOT NULL DEFAULT 0 CHECK (MalusPoints >= 0),
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            
            INDEX IDX_Users_Email NONCLUSTERED (Email) INCLUDE (IsVerified, IsActive),
            INDEX IDX_Users_Phone NONCLUSTERED (Phone),
            INDEX IDX_Users_Malus NONCLUSTERED (MalusPoints) WHERE (MalusPoints > 0),
            
            CONSTRAINT UQ_Users_Email UNIQUE (Email),
            CONSTRAINT UQ_Users_Phone UNIQUE (Phone)
        );
        PRINT 'Created table: Users';
    END
    
    -- =============================================
    -- 2. Cities Table
    -- =============================================
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Cities')
    BEGIN
        CREATE TABLE Cities (
            CityID INT PRIMARY KEY IDENTITY(1,1),
            CountryCode NVARCHAR(5) NOT NULL,
            CityName NVARCHAR(100) NOT NULL,
            DailyRateMultiplier DECIMAL(5, 2) NOT NULL DEFAULT 1.0 CHECK (DailyRateMultiplier > 0),
            Latitude DECIMAL(10, 8) NULL,
            Longitude DECIMAL(11, 8) NULL,
            IsActive BIT NOT NULL DEFAULT 1,
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            
            CONSTRAINT UQ_Cities_CountryCity UNIQUE (CountryCode, CityName)
        );
        PRINT 'Created table: Cities';
        
        -- Insert default cities for Guinea
        INSERT INTO Cities (CountryCode, CityName, Latitude, Longitude) VALUES
            ('GN', 'Conakry', 9.6412, -13.5784),
            ('GN', 'Kindia', 10.0561, -12.8625),
            ('GN', 'Kankan', 10.3854, -9.3057),
            ('GN', 'Nzérékoré', 7.7562, -8.8179),
            ('GN', 'Labé', 11.3183, -12.2860);
        PRINT 'Inserted default Guinea cities';
    END
    
    -- =============================================
    -- 3. AgencyContracts
    -- =============================================
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AgencyContracts')
    BEGIN
        CREATE TABLE AgencyContracts (
            ContractID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
            ManagerID UNIQUEIDENTIFIER NOT NULL,
            OwnerID UNIQUEIDENTIFIER NULL,
            CompanyName NVARCHAR(150) NULL,
            ContractDocumentURL NVARCHAR(500) NOT NULL,
            ExpirationDate DATE NULL,
            IsVerified BIT NOT NULL DEFAULT 0,
            IsActive BIT NOT NULL DEFAULT 1,
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            
            CONSTRAINT FK_AgencyContracts_Manager FOREIGN KEY (ManagerID) 
                REFERENCES Users(UserID) ON DELETE NO ACTION,
            CONSTRAINT FK_AgencyContracts_Owner FOREIGN KEY (OwnerID) 
                REFERENCES Users(UserID) ON DELETE NO ACTION,
            CONSTRAINT CK_AgencyContracts_OwnerOrCompany 
                CHECK ((OwnerID IS NOT NULL AND CompanyName IS NULL) OR 
                       (OwnerID IS NULL AND CompanyName IS NOT NULL))
        );
        PRINT 'Created table: AgencyContracts';
    END
    
    -- =============================================
    -- 4. Vehicles Table (Full-Text Search, No Vector)
    -- =============================================
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Vehicles')
    BEGIN
        CREATE TABLE Vehicles (
            VehicleID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
            OwnerID UNIQUEIDENTIFIER NOT NULL,
            AgentContractID UNIQUEIDENTIFIER NULL,
            
            Make NVARCHAR(50) NOT NULL,
            Model NVARCHAR(50) NOT NULL,
            Year INT NOT NULL,
            LicensePlate NVARCHAR(20) NOT NULL,
            VIN NVARCHAR(17) NULL,
            
            -- Description for full-text search
            Description NVARCHAR(MAX) NULL,
            
            BaseDailyRate DECIMAL(10, 2) NOT NULL CHECK (BaseDailyRate > 0),
            CurrencyCode NVARCHAR(5) NOT NULL DEFAULT 'GNF',
            IsChauffeurAvailable BIT NOT NULL DEFAULT 0,
            ChauffeurDailyFee DECIMAL(10, 2) NULL CHECK (ChauffeurDailyFee >= 0),
            
            ListingStatus NVARCHAR(20) NOT NULL DEFAULT 'Draft' 
                CHECK (ListingStatus IN ('Draft', 'PendingReview', 'Active', 'Suspended', 'Archived')),
            IsVerified BIT NOT NULL DEFAULT 0,
            
            LocationCityID INT NOT NULL,
            
            -- Additional attributes as JSON (SQL 2025 native JSON type)
            VehicleAttributes JSON NULL,
            
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            
            INDEX IDX_Vehicles_Status NONCLUSTERED (ListingStatus, LocationCityID, IsVerified),
            INDEX IDX_Vehicles_Owner NONCLUSTERED (OwnerID, ListingStatus),
            INDEX IDX_Vehicles_Search NONCLUSTERED (Make, Model, Year),
            
            CONSTRAINT UQ_Vehicles_LicensePlate UNIQUE (LicensePlate),
            CONSTRAINT FK_Vehicles_Owner FOREIGN KEY (OwnerID) 
                REFERENCES Users(UserID) ON DELETE CASCADE,
            CONSTRAINT FK_Vehicles_AgentContract FOREIGN KEY (AgentContractID) 
                REFERENCES AgencyContracts(ContractID) ON DELETE SET NULL,
            CONSTRAINT FK_Vehicles_City FOREIGN KEY (LocationCityID) 
                REFERENCES Cities(CityID) ON DELETE NO ACTION
        );
        PRINT 'Created table: Vehicles';
    END
    
    -- =============================================
    -- 5. VehicleDocuments (4-Document Compliance Gate)
    -- =============================================
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VehicleDocuments')
    BEGIN
        CREATE TABLE VehicleDocuments (
            DocumentID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
            VehicleID UNIQUEIDENTIFIER NOT NULL,
            
            -- Les 4 documents obligatoires en Guinée
            DocumentType NVARCHAR(50) NOT NULL 
                CHECK (DocumentType IN ('INSURANCE', 'ROADWORTHINESS', 'TAX_STAMP', 'OWNERSHIP')),
            DocumentURL NVARCHAR(500) NOT NULL,
            DocumentNumber NVARCHAR(100) NULL,
            ExpiryDate DATE NOT NULL,
            
            IsVerified BIT NOT NULL DEFAULT 0,
            ReminderSent BIT NOT NULL DEFAULT 0,
            
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            
            INDEX IDX_VehicleDocs_Expiry NONCLUSTERED (ExpiryDate, DocumentType, IsVerified)
                INCLUDE (VehicleID, ReminderSent),
            
            CONSTRAINT FK_VehicleDocuments_Vehicle FOREIGN KEY (VehicleID) 
                REFERENCES Vehicles(VehicleID) ON DELETE CASCADE,
            CONSTRAINT UQ_VehicleDocuments_VehicleType UNIQUE (VehicleID, DocumentType)
        );
        PRINT 'Created table: VehicleDocuments';
    END
    
    -- =============================================
    -- 6. VehiclePhotos
    -- =============================================
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VehiclePhotos')
    BEGIN
        CREATE TABLE VehiclePhotos (
            PhotoID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
            VehicleID UNIQUEIDENTIFIER NOT NULL,
            PhotoURL NVARCHAR(500) NOT NULL,
            PhotoType NVARCHAR(50) NOT NULL DEFAULT 'Exterior'
                CHECK (PhotoType IN ('Exterior', 'Interior', 'Dashboard', 'Documents', 'Other')),
            DisplayOrder INT NOT NULL DEFAULT 0,
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            
            CONSTRAINT FK_VehiclePhotos_Vehicle FOREIGN KEY (VehicleID) 
                REFERENCES Vehicles(VehicleID) ON DELETE CASCADE
        );
        PRINT 'Created table: VehiclePhotos';
    END
    
    -- =============================================
    -- 7. Bookings Table (with Temporal/History)
    -- =============================================
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Bookings')
    BEGIN
        CREATE TABLE Bookings (
            BookingID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
            BookingReference NVARCHAR(20) NOT NULL,
            VehicleID UNIQUEIDENTIFIER NOT NULL,
            RenterID UNIQUEIDENTIFIER NOT NULL,
            
            TotalAmount DECIMAL(10, 2) NOT NULL CHECK (TotalAmount >= 0),
            PlatformFee DECIMAL(10, 2) NOT NULL CHECK (PlatformFee >= 0),
            SecurityDeposit DECIMAL(10, 2) NOT NULL CHECK (SecurityDeposit >= 0),
            HostPayoutAmount DECIMAL(10, 2) NOT NULL CHECK (HostPayoutAmount >= 0),
            CurrencyCode NVARCHAR(5) NOT NULL DEFAULT 'GNF',
            
            Status NVARCHAR(20) NOT NULL DEFAULT 'Requested' 
                CHECK (Status IN ('Requested', 'Confirmed', 'Active', 'Completed', 'Cancelled')),
            PaymentStatus NVARCHAR(20) NOT NULL DEFAULT 'PendingDeposit' 
                CHECK (PaymentStatus IN ('PendingDeposit', 'DepositPaid', 'FullyPaid', 'Refunded')),
            IsContractESigned BIT NOT NULL DEFAULT 0,
            
            IncludesChauffeur BIT NOT NULL DEFAULT 0,
            
            PickupCityID INT NOT NULL,
            DropoffCityID INT NOT NULL,
            PickupAddress NVARCHAR(500) NULL,
            DropoffAddress NVARCHAR(500) NULL,
            
            StartDate DATETIME2 NOT NULL,
            EndDate DATETIME2 NOT NULL,
            ActualReturnDate DATETIME2 NULL,
            
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            
            -- Temporal columns for history tracking
            ValidFrom DATETIME2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
            ValidTo DATETIME2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
            PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo),
            
            INDEX IDX_Bookings_Dates NONCLUSTERED (StartDate, EndDate, Status),
            INDEX IDX_Bookings_Vehicle NONCLUSTERED (VehicleID, Status) 
                INCLUDE (StartDate, EndDate),
            INDEX IDX_Bookings_Renter NONCLUSTERED (RenterID, Status),
            
            CONSTRAINT UQ_Bookings_Reference UNIQUE (BookingReference),
            CONSTRAINT FK_Bookings_Vehicle FOREIGN KEY (VehicleID) 
                REFERENCES Vehicles(VehicleID) ON DELETE NO ACTION,
            CONSTRAINT FK_Bookings_Renter FOREIGN KEY (RenterID) 
                REFERENCES Users(UserID) ON DELETE NO ACTION,
            CONSTRAINT FK_Bookings_PickupCity FOREIGN KEY (PickupCityID) 
                REFERENCES Cities(CityID) ON DELETE NO ACTION,
            CONSTRAINT FK_Bookings_DropoffCity FOREIGN KEY (DropoffCityID) 
                REFERENCES Cities(CityID) ON DELETE NO ACTION,
            CONSTRAINT CK_Bookings_Dates CHECK (EndDate > StartDate)
        )
        WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.BookingsHistory));
        PRINT 'Created table: Bookings (with temporal history)';
    END
    
    -- =============================================
    -- 8. Penalties Table (Malus System)
    -- =============================================
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Penalties')
    BEGIN
        CREATE TABLE Penalties (
            PenaltyID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
            UserID UNIQUEIDENTIFIER NOT NULL,
            BookingID UNIQUEIDENTIFIER NULL,
            
            Points INT NOT NULL CHECK (Points > 0),
            PenaltyType NVARCHAR(50) NOT NULL 
                CHECK (PenaltyType IN ('LateCancellation', 'OffPlatformAttempt', 'LateReturn', 
                                       'DamageReport', 'NoShow', 'PolicyViolation', 'Other')),
            Description NVARCHAR(MAX) NULL,
            
            ExpiresAt DATETIME2 NOT NULL,
            IsActive BIT NOT NULL DEFAULT 1,
            
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            
            -- Temporal columns
            ValidFrom DATETIME2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
            ValidTo DATETIME2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
            PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo),
            
            INDEX IDX_Penalties_UserExpiry NONCLUSTERED (UserID, ExpiresAt, IsActive),
            
            CONSTRAINT FK_Penalties_User FOREIGN KEY (UserID) 
                REFERENCES Users(UserID) ON DELETE CASCADE,
            CONSTRAINT FK_Penalties_Booking FOREIGN KEY (BookingID) 
                REFERENCES Bookings(BookingID) ON DELETE SET NULL
        )
        WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.PenaltiesHistory));
        PRINT 'Created table: Penalties (with temporal history)';
    END
    
    -- =============================================
    -- 9. Messages Table (Anti-Leakage Detection)
    -- =============================================
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Messages')
    BEGIN
        CREATE TABLE Messages (
            MessageID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
            ConversationID UNIQUEIDENTIFIER NOT NULL,
            SenderID UNIQUEIDENTIFIER NOT NULL,
            RecipientID UNIQUEIDENTIFIER NOT NULL,
            BookingID UNIQUEIDENTIFIER NULL,
            
            MessageContent NVARCHAR(MAX) NOT NULL,
            IsFlagged BIT NOT NULL DEFAULT 0,
            FlagReason NVARCHAR(200) NULL,
            
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            IsRead BIT NOT NULL DEFAULT 0,
            
            INDEX IDX_Messages_Conversation NONCLUSTERED (ConversationID, CreatedAt),
            INDEX IDX_Messages_Flagged NONCLUSTERED (IsFlagged) WHERE (IsFlagged = 1),
            
            CONSTRAINT FK_Messages_Sender FOREIGN KEY (SenderID) 
                REFERENCES Users(UserID) ON DELETE NO ACTION,
            CONSTRAINT FK_Messages_Recipient FOREIGN KEY (RecipientID) 
                REFERENCES Users(UserID) ON DELETE NO ACTION,
            CONSTRAINT FK_Messages_Booking FOREIGN KEY (BookingID) 
                REFERENCES Bookings(BookingID) ON DELETE SET NULL
        );
        PRINT 'Created table: Messages';
    END
    
    -- =============================================
    -- 10. Reviews Table
    -- =============================================
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Reviews')
    BEGIN
        CREATE TABLE Reviews (
            ReviewID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
            BookingID UNIQUEIDENTIFIER NOT NULL,
            ReviewerID UNIQUEIDENTIFIER NOT NULL,
            RevieweeID UNIQUEIDENTIFIER NOT NULL,
            
            Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
            Comment NVARCHAR(1000) NULL,
            
            ReviewType NVARCHAR(20) NOT NULL 
                CHECK (ReviewType IN ('OwnerToRenter', 'RenterToOwner')),
            
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            
            INDEX IDX_Reviews_Reviewee NONCLUSTERED (RevieweeID, Rating),
            
            CONSTRAINT FK_Reviews_Booking FOREIGN KEY (BookingID) 
                REFERENCES Bookings(BookingID) ON DELETE NO ACTION,
            CONSTRAINT FK_Reviews_Reviewer FOREIGN KEY (ReviewerID) 
                REFERENCES Users(UserID) ON DELETE NO ACTION,
            CONSTRAINT FK_Reviews_Reviewee FOREIGN KEY (RevieweeID) 
                REFERENCES Users(UserID) ON DELETE NO ACTION,
            CONSTRAINT UQ_Reviews_BookingReviewer UNIQUE (BookingID, ReviewerID)
        );
        PRINT 'Created table: Reviews';
    END
    
    -- =============================================
    -- 11. Payments Table
    -- =============================================
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Payments')
    BEGIN
        CREATE TABLE Payments (
            PaymentID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
            BookingID UNIQUEIDENTIFIER NOT NULL,
            
            Amount DECIMAL(10, 2) NOT NULL,
            CurrencyCode NVARCHAR(5) NOT NULL DEFAULT 'GNF',
            
            PaymentMethod NVARCHAR(50) NOT NULL 
                CHECK (PaymentMethod IN ('BankTransfer', 'MobileMoney', 'Stripe', 'Cash', 'Other')),
            PaymentProvider NVARCHAR(50) NULL, -- MTN, Orange, Stripe, etc.
            ExternalTransactionID NVARCHAR(100) NULL,
            
            PaymentType NVARCHAR(50) NOT NULL 
                CHECK (PaymentType IN ('Deposit', 'Balance', 'Refund', 'Payout')),
            Status NVARCHAR(20) NOT NULL DEFAULT 'Pending'
                CHECK (Status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
            
            ProofURL NVARCHAR(500) NULL, -- Screenshot proof for manual payments
            Notes NVARCHAR(500) NULL,
            
            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
            ProcessedAt DATETIME2 NULL,
            
            INDEX IDX_Payments_Booking NONCLUSTERED (BookingID, Status),
            INDEX IDX_Payments_Status NONCLUSTERED (Status, CreatedAt),
            
            CONSTRAINT FK_Payments_Booking FOREIGN KEY (BookingID) 
                REFERENCES Bookings(BookingID) ON DELETE NO ACTION
        );
        PRINT 'Created table: Payments';
    END
    
    COMMIT TRANSACTION InitialSchema;
    PRINT '';
    PRINT '========================================';
    PRINT 'Schema Deployment Completed Successfully!';
    PRINT '========================================';
    
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION InitialSchema;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    PRINT 'ERROR: Schema deployment failed!';
    PRINT 'Error Message: ' + @ErrorMessage;
    
    THROW;
END CATCH;
GO
