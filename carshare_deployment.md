# G-MoP Enterprise Deployment & Architecture Guide
## SQL Server 2025 Enterprise Edition

**Document Version:** 2.0.0  
**Target Stack:** .NET 10 + React/Next.js + SQL Server 2025 Enterprise  
**Development Environment:** Windows 11 + VSCode/Antigravity + Claude Code  
**Infrastructure:** Hyper-V VMs (Windows Server 2025 + Ubuntu with Coolify)

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Infrastructure Setup](#infrastructure-setup)
3. [SQL Server 2025 Enterprise Configuration](#sql-server-2025-configuration)
4. [Database Schema (SQL 2025 Native Features)](#database-schema)
5. [Development Workflow](#development-workflow)
6. [Security Architecture](#security-architecture)
7. [Deployment Pipeline](#deployment-pipeline)
8. [AI Agent Prompts (Updated)](#ai-agent-prompts)
9. [Monitoring & Operations](#monitoring-operations)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Machine                       │
│  Windows 11 + VSCode + Antigravity + Claude Code            │
│  Git Repository (Local)                                      │
└─────────────────┬──────────────────────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │      Hyper-V Host         │
    └─────────────┬─────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────▼─────┐    ┌─────▼──────┐
    │  VM #1   │    │   VM #2    │
    │ Win Srv  │    │  Ubuntu    │
    │  2025    │    │  + Coolify │
    └────┬─────┘    └─────┬──────┘
         │                │
    ┌────▼─────┐    ┌─────▼──────────────────────┐
    │SQL Server│    │    Coolify Services        │
    │   2025   │    │                            │
    │Enterprise│    │ - Next.js Frontend (Port 3000)│
    │          │    │ - .NET 10 API (Port 5000)  │
    │Port 1433 │    │ - JWT Auth Service (5001)  │
    └──────────┘    │ - Nginx Reverse Proxy      │
                    └────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Frontend** | React + Next.js | 15.x | App Router, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | ASP.NET Core | 10 LTS | Monolithic, Minimal APIs + Controllers |
| **Database** | SQL Server Enterprise | 2025 | Full-Text Search, Ledger tables, TDE |
| **Authentication** | JWT | RFC 7519 | Separate auth microservice (optional) |
| **Deployment** | Coolify | Latest | Self-hosted PaaS on Ubuntu VM |
| **Development** | VSCode + Claude Code | Latest | AI-assisted development |
| **Infrastructure** | Hyper-V | Windows 11 Pro | Dev: 2 VMs, Prod: Hetzner VPS |
| **CDN/Security** | Cloudflare | Free tier | CDN, DDoS protection, SSL |
| **DNS** | Route 53 | - | Domain management (migrate to Cloudflare) |
| **Payments** | Stripe | Future | Stripe Connect for marketplace |

---

## Infrastructure Setup

### Hyper-V Configuration

#### VM #1: Windows Server 2025 (Database)

**Specifications:**
- **RAM:** 16GB minimum (32GB recommended)
- **CPU:** 4 vCPUs minimum (8 recommended)
- **Storage:** 
  - **C:\** (OS): 100GB SSD
  - **D:\** (Data): 500GB NVMe - SQL Data files
  - **E:\** (Logs): 200GB SSD - Transaction logs
  - **F:\** (TempDB): 100GB NVMe - TempDB files
  - **G:\** (Backup): 1TB HDD - Database backups
- **Network:** Static IP (e.g., 192.168.1.10)

**Setup Script (PowerShell):**

```powershell
# Run on Hyper-V Host
New-VM -Name "GMOP-SQL2025" -MemoryStartupBytes 16GB -Generation 2 `
    -NewVHDPath "D:\Hyper-V\GMOP-SQL2025\OS.vhdx" -NewVHDSizeBytes 100GB

# Add additional disks
New-VHD -Path "D:\Hyper-V\GMOP-SQL2025\Data.vhdx" -SizeBytes 500GB -Dynamic
New-VHD -Path "D:\Hyper-V\GMOP-SQL2025\Logs.vhdx" -SizeBytes 200GB -Dynamic
New-VHD -Path "D:\Hyper-V\GMOP-SQL2025\TempDB.vhdx" -SizeBytes 100GB -Dynamic
New-VHD -Path "D:\Hyper-V\GMOP-SQL2025\Backup.vhdx" -SizeBytes 1TB -Dynamic

Add-VMHardDiskDrive -VMName "GMOP-SQL2025" -Path "D:\Hyper-V\GMOP-SQL2025\Data.vhdx"
Add-VMHardDiskDrive -VMName "GMOP-SQL2025" -Path "D:\Hyper-V\GMOP-SQL2025\Logs.vhdx"
Add-VMHardDiskDrive -VMName "GMOP-SQL2025" -Path "D:\Hyper-V\GMOP-SQL2025\TempDB.vhdx"
Add-VMHardDiskDrive -VMName "GMOP-SQL2025" -Path "D:\Hyper-V\GMOP-SQL2025\Backup.vhdx"

# Configure processor
Set-VMProcessor -VMName "GMOP-SQL2025" -Count 8

# Enable nested virtualization if needed
Set-VMProcessor -VMName "GMOP-SQL2025" -ExposeVirtualizationExtensions $true

Start-VM -Name "GMOP-SQL2025"
```

**Post-OS Installation (Inside VM):**

```powershell
# Initialize and format additional disks
Get-Disk | Where-Object PartitionStyle -eq 'RAW' | 
    Initialize-Disk -PartitionStyle GPT -PassThru | 
    New-Partition -UseMaximumSize -AssignDriveLetter | 
    Format-Volume -FileSystem NTFS -NewFileSystemLabel "SQLData" -Confirm:$false

# Label drives appropriately
# D: = Data, E: = Logs, F: = TempDB, G: = Backup

# Enable Hotpatching (Windows Server 2025)
Enable-WindowsOptionalFeature -Online -FeatureName "Windows-Hotpatch"

# Install SQL Server 2025 prerequisites
Install-WindowsFeature -Name NET-Framework-Features
```

#### VM #2: Ubuntu Server (Coolify)

**Specifications:**
- **RAM:** 8GB minimum
- **CPU:** 4 vCPUs
- **Storage:** 200GB SSD
- **Network:** Static IP (e.g., 192.168.1.20)

**Setup Script (PowerShell on Host):**

```powershell
New-VM -Name "GMOP-Coolify" -MemoryStartupBytes 8GB -Generation 2 `
    -NewVHDPath "D:\Hyper-V\GMOP-Coolify\OS.vhdx" -NewVHDSizeBytes 200GB

Set-VMProcessor -VMName "GMOP-Coolify" -Count 4
Start-VM -Name "GMOP-Coolify"
```

**Coolify Installation (Inside Ubuntu VM):**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Access Coolify UI: http://192.168.1.20:8000

---

### Connecting Private GitHub Repositories

**Method: Deploy Keys (Secure & Repository-Ievel Access)**

1. **Generate SSH Key (ED25519)**
   - In Coolify: Go to **Keys & Tokens** > **Private Keys**.
   - Click **+ Add** -> `GitHub Deploy Key`.
   - Click **Generate Key**.
   - **Copy the Public Key** shown.

2. **Add to GitHub**
   - Go to your Repository Settings on GitHub.
   - Select **Deploy keys** from the sidebar.
   - Click **Add deploy key**.
   - Title: `Coolify`
   - Key: Paste the public key.
   - **Do NOT** check "Allow write access".

3. **Deploy Project**
   - In Coolify Project: Click **+ New Resource**.
   - Select **Private Repository (with Deploy Key)**.
   - Use the keys just created.
   - Repository URL: `git@github.com:username/repo.git` (Use SSH format!)
   - Branch: `main`
   - Build Pack: `Docker Compose` (since we created Dockerfiles).
   - **Base Directory**: `/src/API` (for backend) or `/src/frontend` (for frontend).

---
```

---

## SQL Server 2025 Enterprise Configuration

### Installation

**Download:** SQL Server 2025 Enterprise Evaluation (180 days) or licensed version

**Installation Script (PowerShell):**

```powershell
# Extract installation media
# Assuming ISO mounted to E:\

E:\setup.exe /Q /ACTION=Install /FEATURES=SQLEngine,FullText,Replication `
    /INSTANCENAME=MSSQLSERVER `
    /SQLSYSADMINACCOUNTS="BUILTIN\Administrators" `
    /SECURITYMODE=SQL `
    /SAPWD="YourStr0ng!P@ssw0rd" `
    /SQLCOLLATION="Latin1_General_CI_AS" `
    /INSTALLSQLDATADIR="D:\SQLData" `
    /SQLUSERDBDIR="D:\SQLData\Data" `
    /SQLUSERDBLOGDIR="E:\SQLLogs\Logs" `
    /SQLTEMPDBDIR="F:\TempDB\Data" `
    /SQLTEMPDBLOGDIR="F:\TempDB\Logs" `
    /SQLBACKUPDIR="G:\Backup" `
    /TCPENABLED=1 `
    /NPENABLED=1 `
    /IACCEPTSQLSERVERLICENSETERMS
```

### Post-Installation Configuration

```sql
-- =============================================
-- SQL Server 2025 Enterprise Configuration
-- Optimized for G-MoP Production Workload
-- =============================================

USE master;
GO

-- 1. Enable TCP/IP and configure port
EXEC sp_configure 'remote access', 1;
RECONFIGURE;
GO

-- 2. Configure TempDB (8 files, one per CPU core)
ALTER DATABASE tempdb MODIFY FILE 
    (NAME = tempdev, SIZE = 8GB, FILEGROWTH = 512MB);
GO

DECLARE @i INT = 2;
WHILE @i <= 8
BEGIN
    DECLARE @filename NVARCHAR(200) = 'tempdev' + CAST(@i AS NVARCHAR(10));
    DECLARE @filepath NVARCHAR(500) = 'F:\TempDB\Data\' + @filename + '.ndf';
    
    EXEC('ALTER DATABASE tempdb ADD FILE 
        (NAME = ' + @filename + ', 
         FILENAME = ''' + @filepath + ''', 
         SIZE = 8GB, 
         FILEGROWTH = 512MB)');
    
    SET @i = @i + 1;
END;
GO

-- 3. Configure Memory (Leave 4GB for OS)
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
GO

EXEC sp_configure 'max server memory', 28672; -- 28GB for SQL (32GB total RAM)
EXEC sp_configure 'min server memory', 16384; -- 16GB minimum
RECONFIGURE;
GO

-- 4. Enable Query Store (for performance diagnostics)
ALTER DATABASE SCOPED CONFIGURATION SET QUERY_OPTIMIZER_HOTFIXES = ON;
GO

-- 5. Enable Intelligent Query Processing (IQP 3.0)
ALTER DATABASE SCOPED CONFIGURATION SET OPTIMIZED_LOCKING = ON;
ALTER DATABASE SCOPED CONFIGURATION SET CE_FEEDBACK = ON;
ALTER DATABASE SCOPED CONFIGURATION SET MEMORY_GRANT_FEEDBACK_PERSISTENCE = ON;
GO

-- 6. Configure Backup Compression (Enterprise feature)
EXEC sp_configure 'backup compression default', 1;
RECONFIGURE;
GO

-- 7. Enable TDE (Transparent Data Encryption)
-- Will be applied per database later

-- 8. Configure Maintenance Plans
-- Schedule via SQL Agent (see below)
```

### TLS 1.3 and TDS 8.0 Configuration

**Update Connection Strings:**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=192.168.1.10,1433;Database=GMoPDB;User Id=sa;Password=YourStr0ng!P@ssw0rd;Encrypt=Mandatory;TrustServerCertificate=False;TDS Version=8.0;MultipleActiveResultSets=true"
  }
}
```

**Force TLS 1.3 (Registry):**

```powershell
# Run on SQL Server VM as Administrator
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.3\Server' -Force
New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.3\Server' -Name 'Enabled' -Value 1 -PropertyType DWORD
New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.3\Server' -Name 'DisabledByDefault' -Value 0 -PropertyType DWORD

# Restart SQL Server Service
Restart-Service MSSQLSERVER
```

---

## Database Schema (SQL 2025 Native Features)

### Core Schema (No Azure Dependencies)

```sql
-- =============================================
-- G-MoP Database Schema v2.5
-- SQL Server 2025 Enterprise Edition
-- Features: Vector Search, Ledger Tables, Native AI
-- =============================================

SET NOCOUNT ON;
GO

-- Create Database with TDE
CREATE DATABASE GMoPDB
ON PRIMARY 
(
    NAME = GMoPDB_Data,
    FILENAME = 'D:\SQLData\Data\GMoPDB.mdf',
    SIZE = 10GB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 1GB
)
LOG ON 
(
    NAME = GMoPDB_Log,
    FILENAME = 'E:\SQLLogs\Logs\GMoPDB.ldf',
    SIZE = 5GB,
    MAXSIZE = 50GB,
    FILEGROWTH = 512MB
);
GO

USE GMoPDB;
GO

-- Enable TDE
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'MasterKey!Str0ng2025';
GO

CREATE CERTIFICATE GMoPTDECert WITH SUBJECT = 'G-MoP TDE Certificate';
GO

CREATE DATABASE ENCRYPTION KEY
WITH ALGORITHM = AES_256
ENCRYPTION BY SERVER CERTIFICATE GMoPTDECert;
GO

ALTER DATABASE GMoPDB SET ENCRYPTION ON;
GO

-- Set Compatibility Level to SQL 2025
ALTER DATABASE GMoPDB SET COMPATIBILITY_LEVEL = 170;
GO

-- Enable Advanced Features
ALTER DATABASE GMoPDB SET OPTIMIZED_LOCKING = ON;
ALTER DATABASE SCOPED CONFIGURATION SET CE_FEEDBACK = ON;
ALTER DATABASE SCOPED CONFIGURATION SET MEMORY_GRANT_FEEDBACK_PERSISTENCE = ON;
GO

BEGIN TRANSACTION InitialSchema;

BEGIN TRY
    PRINT 'Starting G-MoP Schema Deployment (SQL 2025)...';
    
    -- =============================================
    -- 1. Users Table
    -- =============================================
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
        
        -- Security indexes
        INDEX IDX_Users_Email NONCLUSTERED (Email) INCLUDE (IsVerified, IsActive),
        INDEX IDX_Users_Phone NONCLUSTERED (Phone),
        INDEX IDX_Users_Malus NONCLUSTERED (MalusPoints) WHERE (MalusPoints > 0),
        
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT UQ_Users_Phone UNIQUE (Phone)
    );
    
    -- =============================================
    -- 2. Cities Table
    -- =============================================
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
    
    -- =============================================
    -- 3. AgencyContracts
    -- =============================================
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
    
    -- =============================================
    -- 4. Vehicles Table (Full-Text Search)
    -- =============================================
    CREATE TABLE Vehicles (
        VehicleID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        OwnerID UNIQUEIDENTIFIER NOT NULL,
        AgentContractID UNIQUEIDENTIFIER NULL,
        
        Make NVARCHAR(50) NOT NULL,
        Model NVARCHAR(50) NOT NULL,
        Year INT NOT NULL CHECK (Year >= YEAR(GETDATE()) - 15 AND Year <= YEAR(GETDATE()) + 1),
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
        
        -- Indexes
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
    
    -- =============================================
    -- 5. VehicleDocuments (4-Document Compliance)
    -- =============================================
    CREATE TABLE VehicleDocuments (
        DocumentID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        VehicleID UNIQUEIDENTIFIER NOT NULL,
        
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
    
    -- =============================================
    -- 6. Bookings Table (LEDGER - Tamper-Proof)
    -- =============================================
    CREATE TABLE Bookings (
        BookingID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        BookingReference NVARCHAR(20) NOT NULL,
        VehicleID UNIQUEIDENTIFIER NOT NULL,
        RenterID UNIQUEIDENTIFIER NOT NULL,
        
        TotalAmount DECIMAL(10, 2) NOT NULL CHECK (TotalAmount >= 0),
        PlatformFee DECIMAL(10, 2) NOT NULL CHECK (PlatformFee >= 0),
        SecurityDeposit DECIMAL(10, 2) NOT NULL CHECK (SecurityDeposit >= 0),
        HostPayoutAmount DECIMAL(10, 2) NOT NULL CHECK (HostPayoutAmount >= 0),
        
        Status NVARCHAR(20) NOT NULL DEFAULT 'Requested' 
            CHECK (Status IN ('Requested', 'Confirmed', 'Active', 'Completed', 'Cancelled')),
        PaymentStatus NVARCHAR(20) NOT NULL DEFAULT 'PendingDeposit' 
            CHECK (PaymentStatus IN ('PendingDeposit', 'DepositPaid', 'FullyPaid', 'Refunded')),
        IsContractESigned BIT NOT NULL DEFAULT 0,
        
        PickupCityID INT NOT NULL,
        DropoffCityID INT NOT NULL,
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NOT NULL,
        
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
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
    -- ** SQL 2025: Enable LEDGER for audit integrity **
    WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.BookingsHistory), 
          LEDGER = ON);
    
    -- =============================================
    -- 7. Penalties Table (LEDGER - Tamper-Proof)
    -- =============================================
    CREATE TABLE Penalties (
        PenaltyID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        UserID UNIQUEIDENTIFIER NOT NULL,
        BookingID UNIQUEIDENTIFIER NULL,
        
        Points INT NOT NULL CHECK (Points > 0),
        PenaltyType NVARCHAR(50) NOT NULL 
            CHECK (PenaltyType IN ('LateCancellation', 'OffPlatformAttempt', 'LateReturn', 'DamageReport', 'Other')),
        Description NVARCHAR(MAX) NULL,
        
        ExpiresAt DATETIME2 NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        INDEX IDX_Penalties_UserExpiry NONCLUSTERED (UserID, ExpiresAt, IsActive),
        
        CONSTRAINT FK_Penalties_User FOREIGN KEY (UserID) 
            REFERENCES Users(UserID) ON DELETE CASCADE,
        CONSTRAINT FK_Penalties_Booking FOREIGN KEY (BookingID) 
            REFERENCES Bookings(BookingID) ON DELETE SET NULL
    )
    -- ** SQL 2025: Enable LEDGER for audit integrity **
    WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.PenaltiesHistory), 
          LEDGER = ON);
    
    -- =============================================
    -- 8. Messages Table (Anti-Leakage Detection)
    -- =============================================
    CREATE TABLE Messages (
        MessageID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ConversationID UNIQUEIDENTIFIER NOT NULL,
        SenderID UNIQUEIDENTIFIER NOT NULL,
        RecipientID UNIQUEIDENTIFIER NOT NULL,
        
        MessageContent NVARCHAR(MAX) NOT NULL,
        IsFlagged BIT NOT NULL DEFAULT 0, -- Auto-flagged if contact info detected
        FlagReason NVARCHAR(200) NULL,
        
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        IsRead BIT NOT NULL DEFAULT 0,
        
        INDEX IDX_Messages_Conversation NONCLUSTERED (ConversationID, CreatedAt),
        INDEX IDX_Messages_Flagged NONCLUSTERED (IsFlagged) WHERE (IsFlagged = 1),
        
        CONSTRAINT FK_Messages_Sender FOREIGN KEY (SenderID) 
            REFERENCES Users(UserID) ON DELETE NO ACTION,
        CONSTRAINT FK_Messages_Recipient FOREIGN KEY (RecipientID) 
            REFERENCES Users(UserID) ON DELETE NO ACTION
    );
    
    COMMIT TRANSACTION InitialSchema;
    PRINT 'Schema Deployment Completed Successfully (SQL 2025)!';
    
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
```

### Stored Procedures (No Azure Dependencies)

```sql
-- =============================================
-- G-MoP Business Logic - SQL 2025 Edition
-- No Azure dependencies - uses native SQL Server features only
-- =============================================

-- =============================================
-- SP: Vehicle Search (Full-Text Search)
-- Uses SQL Server Full-Text Search - no AI/Azure required
-- =============================================
CREATE OR ALTER PROCEDURE sp_SearchVehicles
    @SearchQuery NVARCHAR(500),
    @CityID INT = NULL,
    @MinPrice DECIMAL(10,2) = NULL,
    @MaxPrice DECIMAL(10,2) = NULL,
    @ChauffeurRequired BIT = NULL,
    @MaxResults INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@MaxResults)
        v.VehicleID,
        v.Make,
        v.Model,
        v.Year,
        v.BaseDailyRate,
        v.Description,
        v.IsChauffeurAvailable,
        v.ChauffeurDailyFee,
        c.CityName
    FROM Vehicles v
    INNER JOIN Cities c ON v.LocationCityID = c.CityID
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

-- =============================================
-- SP: Detect Off-Platform Contact Attempts
-- Utilise REGEXP_LIKE natif de SQL 2025
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
    IF REGEXP_LIKE(@MessageContent, '\+?224[0-9]{9}|6[0-9]{2}[\s\-]?[0-9]{3}[\s\-]?[0-9]{3}')
    BEGIN
        SET @IsFlagged = 1;
        SET @FlagReason = 'Guinea phone number detected';
        RETURN;
    END
    
    -- Détection d'emails
    IF REGEXP_LIKE(@MessageContent, '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    BEGIN
        SET @IsFlagged = 1;
        SET @FlagReason = 'Email address detected';
        RETURN;
    END
    
    -- Détection de WhatsApp/Telegram mentions
    IF REGEXP_LIKE(@MessageContent, '(?i)(whatsapp|telegram|viber|signal|contacte?[-\s]?moi)')
    BEGIN
        SET @IsFlagged = 1;
        SET @FlagReason = 'External messaging app mentioned';
        RETURN;
    END
END;
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
    
    -- Documents requis pour la Guinée
    DECLARE @RequiredDocs TABLE (DocType NVARCHAR(50));
    INSERT INTO @RequiredDocs VALUES 
        ('INSURANCE'),        -- Assurance
        ('ROADWORTHINESS'),   -- Visite Technique
        ('TAX_STAMP'),        -- Vignette
        ('OWNERSHIP');        -- Carte Grise ou Contrat de Mandat
    
    -- Documents valides (vérifiés et non expirés)
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

-- =============================================
-- SP: Check Booking Availability
-- Vérifie la disponibilité d'un véhicule pour des dates données
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

-- =============================================
-- SP: Expire Old Penalties (Hangfire Job)
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
    
    DECLARE user_cursor CURSOR FOR 
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

-- =============================================
-- SP: Verify Ledger Integrity
-- Vérifie l'intégrité cryptographique des tables LEDGER
-- =============================================
CREATE OR ALTER PROCEDURE sp_VerifyLedgerIntegrity
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Vérifier l'intégrité de la table Bookings
    DECLARE @BookingsValid BIT;
    EXEC sys.sp_verify_database_ledger 
        @table_name = 'Bookings',
        @is_valid = @BookingsValid OUTPUT;
    
    IF @BookingsValid = 0
        PRINT 'WARNING: Bookings ledger integrity compromised!';
    ELSE
        PRINT 'Bookings ledger integrity verified.';
    
    -- Vérifier l'intégrité de la table Penalties
    DECLARE @PenaltiesValid BIT;
    EXEC sys.sp_verify_database_ledger 
        @table_name = 'Penalties',
        @is_valid = @PenaltiesValid OUTPUT;
    
    IF @PenaltiesValid = 0
        PRINT 'WARNING: Penalties ledger integrity compromised!';
    ELSE
        PRINT 'Penalties ledger integrity verified.';
    
    -- Retourner le statut global
    SELECT 
        @BookingsValid AS BookingsValid,
        @PenaltiesValid AS PenaltiesValid,
        CASE WHEN @BookingsValid = 1 AND @PenaltiesValid = 1 
             THEN 'PASS' ELSE 'FAIL' END AS OverallStatus;
END;
GO

PRINT 'All stored procedures created successfully (SQL 2025).';
GO
```

---

## Development Workflow

### Local Development Setup (Windows 11 + VSCode)

#### Prerequisites Installation

```powershell
# Install Chocolatey (Package Manager)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Development Tools
choco install -y git nodejs-lts dotnet-sdk vscode
choco install -y sql-server-management-studio

# Install VSCode Extensions (via CLI)
code --install-extension ms-dotnettools.csharp
code --install-extension ms-dotnettools.csdevkit
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-azuretools.vscode-docker
code --install-extension GitHub.copilot  # If you have license
```

#### Clone and Setup Project

```bash
# Create workspace
mkdir C:\Dev\GMoP
cd C:\Dev\GMoP

# Clone repository (replace with your repo)
git clone https://github.com/your-org/gmop.git .

# Backend Setup
cd src/API
dotnet restore
dotnet build

# Frontend Setup
cd ../Frontend
npm install

# Create .env.local for frontend
echo "NEXT_PUBLIC_API_URL=http://192.168.1.20:5000" > .env.local
echo "NEXT_PUBLIC_AUTH_URL=http://192.168.1.20:5001" >> .env.local
```

#### Connection String Configuration

**appsettings.Development.json** (Backend):

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=192.168.1.10,1433;Database=GMoPDB;User Id=sa;Password=YourStr0ng!P@ssw0rd;Encrypt=Mandatory;TrustServerCertificate=True;TDS Version=8.0;MultipleActiveResultSets=true"
  },
  "JwtSettings": {
    "Secret": "DEV_JWT_SECRET_KEY_MINIMUM_32_CHARACTERS_REQUIRED_2025",
    "Issuer": "https://localhost:5000",
    "Audience": "https://localhost:3000",
    "ExpiryMinutes": 120
  },
  "AllowedHosts": "*",
  "CorsOrigins": ["http://localhost:3000", "http://192.168.1.20:3000"]
}
```

### VSCode Workspace Settings

**`.vscode/settings.json`:**

```json
{
  "dotnet.defaultSolution": "GMoP.sln",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "csharp.semanticHighlighting.enabled": true,
  "omnisharp.enableRoslynAnalyzers": true,
  "omnisharp.enableEditorConfigSupport": true,
  "files.exclude": {
    "**/bin": true,
    "**/obj": true,
    "**/node_modules": true
  },
  "search.exclude": {
    "**/bin": true,
    "**/obj": true,
    "**/node_modules": true
  }
}
```

**`.vscode/launch.json`:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": ".NET Backend",
      "type": "coreclr",
      "request": "launch",
      "preLaunchTask": "build",
      "program": "${workspaceFolder}/src/API/bin/Debug/net10.0/GMoP.API.dll",
      "args": [],
      "cwd": "${workspaceFolder}/src/API",
      "stopAtEntry": false,
      "env": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      },
      "sourceFileMap": {
        "/Views": "${workspaceFolder}/Views"
      }
    },
    {
      "name": "Next.js Frontend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/src/Frontend",
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": [".NET Backend", "Next.js Frontend"]
    }
  ]
}
```

### Daily Development Workflow with Claude Code

```bash
# 1. Start SQL Server VM (if not running)
# Run from Hyper-V host
Start-VM -Name "GMOP-SQL2025"

# 2. Pull latest changes
git pull origin main

# 3. Apply any new migrations
cd src/API
dotnet ef database update

# 4. Start development servers
# Terminal 1: Backend
dotnet watch run --project src/API

# Terminal 2: Frontend
cd src/Frontend
npm run dev

# 5. Use Claude Code for development
# In VSCode, open Command Palette (Ctrl+Shift+P)
# Type: "Claude: Ask Claude"
# Example prompts:
# - "Add JWT validation middleware to protect /api/bookings endpoints"
# - "Create a React component for vehicle search with filters"
# - "Write unit tests for sp_CheckVehicleCompliance stored procedure"
```

---

## Security Architecture

### Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security (Hyper-V vSwitch + Firewall)      │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: TLS 1.3 + TDS 8.0 (Encrypted Transport)           │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: JWT Authentication (Bearer Tokens)                 │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: Authorization (Role-based + Claims)                │
├─────────────────────────────────────────────────────────────┤
│ Layer 5: Input Validation (FluentValidation + AntiForgery) │
├─────────────────────────────────────────────────────────────┤
│ Layer 6: SQL Injection Prevention (Parameterized Queries)   │
├─────────────────────────────────────────────────────────────┤
│ Layer 7: TDE (Transparent Data Encryption at Rest)          │
├─────────────────────────────────────────────────────────────┤
│ Layer 8: Audit Trail (Ledger Tables + SQL Audit)            │
└─────────────────────────────────────────────────────────────┘
```

### JWT Implementation (.NET 10)

**Program.cs:**

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// JWT Configuration
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = Encoding.UTF8.GetBytes(jwtSettings["Secret"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = true; // Enforce HTTPS in production
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(secretKey),
        ClockSkew = TimeSpan.Zero // Pas de tolérance sur l'expiration
    };
});

builder.Services.AddAuthorization(options =>
{
    // Politique: Seulement les utilisateurs vérifiés
    options.AddPolicy("VerifiedOnly", policy => 
        policy.RequireClaim("IsVerified", "true"));
    
    // Politique: Propriétaires et Gestionnaires uniquement
    options.AddPolicy("CanListVehicles", policy =>
        policy.RequireRole("Owner", "Manager"));
    
    // Politique: Pas de compte banni (Malus < 20)
    options.AddPolicy("NotBanned", policy =>
        policy.RequireAssertion(context =>
        {
            var malus = context.User.FindFirst("MalusPoints")?.Value;
            return malus != null && int.Parse(malus) < 20;
        }));
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
```

**JwtService.cs:**

```csharp
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

public interface IJwtService
{
    string GenerateToken(User user);
    ClaimsPrincipal? ValidateToken(string token);
}

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;
    
    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }
    
    public string GenerateToken(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = Encoding.UTF8.GetBytes(jwtSettings["Secret"]!);
        
        // Claims avec données utilisateur
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserID.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.UserType),
            new Claim("IsVerified", user.IsVerified.ToString()),
            new Claim("MalusPoints", user.MalusPoints.ToString()),
            new Claim("PlanType", user.PlanType)
        };
        
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(
                int.Parse(jwtSettings["ExpiryMinutes"]!)),
            Issuer = jwtSettings["Issuer"],
            Audience = jwtSettings["Audience"],
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(secretKey),
                SecurityAlgorithms.HmacSha256Signature)
        };
        
        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        
        return tokenHandler.WriteToken(token);
    }
    
    public ClaimsPrincipal? ValidateToken(string token)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = Encoding.UTF8.GetBytes(jwtSettings["Secret"]!);
        
        var tokenHandler = new JwtSecurityTokenHandler();
        
        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings["Issuer"],
                ValidAudience = jwtSettings["Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(secretKey)
            }, out SecurityToken validatedToken);
            
            return principal;
        }
        catch
        {
            return null;
        }
    }
}
```

### API Controller Security Example

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Tous les endpoints nécessitent authentification
public class VehiclesController : ControllerBase
{
    private readonly IVehicleService _vehicleService;
    private readonly ILogger<VehiclesController> _logger;
    
    public VehiclesController(
        IVehicleService vehicleService,
        ILogger<VehiclesController> logger)
    {
        _vehicleService = vehicleService;
        _logger = logger;
    }
    
    /// <summary>
    /// Créer un nouveau véhicule (Owner/Manager uniquement)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "CanListVehicles")]
    [Authorize(Policy = "VerifiedOnly")]
    public async Task<IActionResult> CreateVehicle(
        [FromBody] CreateVehicleDto dto)
    {
        // Récupérer l'ID utilisateur depuis le token JWT
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            _logger.LogWarning("Invalid user ID in token");
            return Unauthorized();
        }
        
        // Vérifier les points de malus avant toute action
        var malusPoints = int.Parse(User.FindFirst("MalusPoints")!.Value);
        if (malusPoints >= 10)
        {
            return BadRequest(new { 
                error = "AccountRestricted",
                message = "Votre compte est restreint en raison de points de malus élevés."
            });
        }
        
        var result = await _vehicleService.CreateVehicleAsync(dto, userId);
        
        if (!result.Success)
            return BadRequest(result);
        
        return CreatedAtAction(nameof(GetVehicle), 
            new { id = result.Data.VehicleID }, result.Data);
    }
    
    /// <summary>
    /// Activer un véhicule (gate de conformité appliqué)
    /// </summary>
    [HttpPost("{id}/activate")]
    [Authorize(Policy = "CanListVehicles")]
    public async Task<IActionResult> ActivateVehicle(Guid id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();
        
        // Le service va appeler sp_CheckVehicleCompliance
        var result = await _vehicleService.ActivateVehicleAsync(id, userId);
        
        if (!result.Success)
            return BadRequest(result);
        
        return Ok(result);
    }
    
    /// <summary>
    /// Recherche sémantique de véhicules (public, mais avec rate limiting)
    /// </summary>
    [HttpGet("search")]
    [AllowAnonymous]
    [RateLimit(MaxRequests = 30, WindowSeconds = 60)] // Custom attribute
    public async Task<IActionResult> SearchVehicles(
        [FromQuery] string query,
        [FromQuery] int? cityId = null)
    {
        // Validation d'entrée
        if (string.IsNullOrWhiteSpace(query) || query.Length > 500)
            return BadRequest("Invalid search query");
        
        var results = await _vehicleService.SearchBySemanticsAsync(query, cityId);
        
        return Ok(results);
    }
}
```

### Input Validation with FluentValidation

```csharp
using FluentValidation;

public class CreateVehicleDtoValidator : AbstractValidator<CreateVehicleDto>
{
    public CreateVehicleDtoValidator()
    {
        // Fabricant: requis, 2-50 caractères
        RuleFor(x => x.Make)
            .NotEmpty().WithMessage("Le fabricant est obligatoire")
            .Length(2, 50).WithMessage("Le fabricant doit contenir entre 2 et 50 caractères")
            .Matches(@"^[a-zA-Z0-9\s\-]+$").WithMessage("Caractères invalides dans le fabricant");
        
        // Modèle: requis, 2-50 caractères
        RuleFor(x => x.Model)
            .NotEmpty().WithMessage("Le modèle est obligatoire")
            .Length(2, 50);
        
        // Année: entre (année actuelle - 15) et (année actuelle + 1)
        RuleFor(x => x.Year)
            .InclusiveBetween(DateTime.Now.Year - 15, DateTime.Now.Year + 1)
            .WithMessage($"L'année doit être entre {DateTime.Now.Year - 15} et {DateTime.Now.Year + 1}");
        
        // Plaque d'immatriculation: format guinéen
        RuleFor(x => x.LicensePlate)
            .NotEmpty()
            .Matches(@"^[A-Z]{2,3}-\d{4}$")
            .WithMessage("Format de plaque invalide (ex: CKY-1234)");
        
        // Tarif journalier: > 0
        RuleFor(x => x.BaseDailyRate)
            .GreaterThan(0).WithMessage("Le tarif doit être supérieur à 0")
            .LessThan(100000000).WithMessage("Tarif trop élevé"); // 100M GNF max
        
        // Ville: doit exister
        RuleFor(x => x.LocationCityID)
            .GreaterThan(0).WithMessage("Ville invalide");
    }
}
```

---

## Deployment Pipeline

### Coolify Deployment Configuration

**Project Structure for Coolify:**

```
gmop/
├── docker-compose.yml (for Coolify)
├── src/
│   ├── API/
│   │   ├── Dockerfile
│   │   └── GMoP.API.csproj
│   └── Frontend/
│       ├── Dockerfile
│       ├── package.json
│       └── next.config.js
└── .env.production (managed by Coolify)
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./src/Frontend
      dockerfile: Dockerfile
    container_name: gmop-frontend
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${API_URL}
      - NEXT_PUBLIC_AUTH_URL=${AUTH_URL}
    ports:
      - "3000:3000"
    restart: unless-stopped
    networks:
      - gmop-network

  api:
    build:
      context: ./src/API
      dockerfile: Dockerfile
    container_name: gmop-api
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=${DB_CONNECTION_STRING}
      - JwtSettings__Secret=${JWT_SECRET}
      - JwtSettings__Issuer=${JWT_ISSUER}
      - JwtSettings__Audience=${JWT_AUDIENCE}
      - AzureOpenAI__Endpoint=${OPENAI_ENDPOINT}
      - AzureOpenAI__ApiKey=${OPENAI_KEY}
    ports:
      - "5000:5000"
    depends_on:
      - auth
    restart: unless-stopped
    networks:
      - gmop-network

  auth:
    build:
      context: ./src/API
      dockerfile: Dockerfile
    container_name: gmop-auth
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=${DB_CONNECTION_STRING}
      - JwtSettings__Secret=${JWT_SECRET}
    ports:
      - "5001:5001"
    restart: unless-stopped
    networks:
      - gmop-network

networks:
  gmop-network:
    driver: bridge
```

**Dockerfile (Backend):**

```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj and restore
COPY ["GMoP.API.csproj", "./"]
RUN dotnet restore "GMoP.API.csproj"

# Copy everything else and build
COPY . .
RUN dotnet build "GMoP.API.csproj" -c Release -o /app/build
RUN dotnet publish "GMoP.API.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Install SQL Server tools for health checks
RUN apt-get update && apt-get install -y curl

COPY --from=build /app/publish .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

EXPOSE 5000
ENTRYPOINT ["dotnet", "GMoP.API.dll"]
```

**Dockerfile (Frontend):**

```dockerfile
# Dependencies stage
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Coolify Setup Steps

1. **Access Coolify UI** (http://192.168.1.20:8000)

2. **Create New Project**
   - Name: G-MoP Production
   - Environment: Production

3. **Add Git Repository**
   - Repository URL: `https://github.com/your-org/gmop.git`
   - Branch: `main`
   - Deploy Key: Generate and add to GitHub

4. **Configure Environment Variables**

```bash
# Database
DB_CONNECTION_STRING="Server=192.168.1.10,1433;Database=GMoPDB;User Id=sa;Password=YourStr0ng!P@ssw0rd;Encrypt=Mandatory;TrustServerCertificate=False;TDS Version=8.0"

# JWT
JWT_SECRET="PRODUCTION_SECRET_KEY_MINIMUM_64_CHARACTERS_REQUIRED_2025_SECURE"
JWT_ISSUER="https://api.gmop.gn"
JWT_AUDIENCE="https://www.gmop.gn"

# URLs
API_URL="https://api.gmop.gn"
AUTH_URL="https://auth.gmop.gn"
FRONTEND_URL="https://www.gmop.gn"

# Stripe (Future)
# STRIPE_SECRET_KEY="sk_live_..."
# STRIPE_WEBHOOK_SECRET="whsec_..."
```

5. **Configure Domains**
   - Frontend: `www.gmop.gn`
   - API: `api.gmop.gn`
   - Auth: `auth.gmop.gn`

6. **Enable SSL (Let's Encrypt)**
   - Automatic certificate generation
   - Auto-renewal enabled

7. **Deploy**
   - Click "Deploy" button
   - Monitor build logs
   - Verify deployment success

---

## Production Deployment (Hetzner + Cloudflare)

### Hetzner VPS Setup

When ready to move from local Hyper-V to production:

**VPS Options (Hetzner Cloud):**

| Phase | VPS Type | Cost/Month | Specs | Use Case |
|-------|----------|------------|-------|----------|
| **MVP** | CPX21 | ~€7 | 3 vCPU, 4GB RAM, 80GB SSD | 50 vehicles, <100 users |
| **Growth** | CPX31 | ~€14 | 4 vCPU, 8GB RAM, 160GB SSD | 200 vehicles |
| **Scale** | CPX41 | ~€28 | 8 vCPU, 16GB RAM, 240GB SSD | 500+ vehicles |

**Option A: Single VPS with Docker (Recommended for Start)**

```bash
# 1. Provision CPX21 VPS with Ubuntu 24.04 LTS

# 2. Install Coolify (same as local setup)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# 3. Install SQL Server in Docker
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng!P@ssw0rd" \
   -p 1433:1433 --name sql2025 --hostname sql2025 \
   -v sqldata:/var/opt/mssql \
   -d mcr.microsoft.com/mssql/server:2022-latest

# 4. Deploy .NET API and Next.js via Coolify
# (same as local setup)
```

**Option B: Two VPS (Mirrors Local Setup)**

- VPS #1: SQL Server (dedicated for database)
- VPS #2: Coolify with .NET + Next.js

**Backup Strategy:**

```bash
# Daily SQL backup to Hetzner Storage Box
# Hetzner Storage Box: ~€3/month for 100GB

# Backup script (add to cron)
docker exec sql2025 /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "YourStr0ng!P@ssw0rd" \
  -Q "BACKUP DATABASE GMoPDB TO DISK = '/var/opt/mssql/backup/GMoPDB_$(date +%Y%m%d).bak'"

# Sync to Storage Box
rsync -avz /var/opt/mssql/backup/ u123456@u123456.your-storagebox.de:/backups/
```

---

### Cloudflare Configuration

**1. DNS Setup (Migrate from Route 53)**

```
# In Cloudflare DNS:
Type    Name              Content              Proxy
A       @                 <Hetzner VPS IP>     Proxied (orange cloud)
A       api               <Hetzner VPS IP>     Proxied
A       www               <Hetzner VPS IP>     Proxied
CNAME   auth              api.gmop.gn          Proxied
```

**2. SSL/TLS Settings**

```
SSL/TLS → Overview:
  Encryption mode: Full (strict)

SSL/TLS → Edge Certificates:
  Always Use HTTPS: ON
  Minimum TLS Version: TLS 1.2
  Automatic HTTPS Rewrites: ON
```

**3. Security Settings**

```
Security → Settings:
  Security Level: Medium
  Challenge Passage: 30 minutes
  Browser Integrity Check: ON

Security → WAF:
  Enable Cloudflare Managed Rules (free tier includes basic)

Security → Bots:
  Bot Fight Mode: ON
```

**4. Performance Settings**

```
Speed → Optimization:
  Auto Minify: JavaScript, CSS, HTML
  Brotli: ON

Caching → Configuration:
  Caching Level: Standard
  Browser Cache TTL: 4 hours

Caching → Cache Rules:
  Create rule for /api/* - Bypass cache
  Create rule for /_next/static/* - Cache Everything, Edge TTL: 1 month
```

**5. Page Rules (Free Tier: 3 rules)**

```
Rule 1: api.gmop.gn/*
  - Cache Level: Bypass
  - SSL: Full (Strict)

Rule 2: *.gmop.gn/static/*
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month

Rule 3: *.gmop.gn/*
  - Always Use HTTPS: ON
```

---

## AI Agent Prompts (Updated - No Azure)

### @CodeWriter (Lead Backend Developer)

```
You are the Lead Backend Developer for Guinea Mobility Platform (G-MoP).

**STACK:**
- Backend: ASP.NET Core 10 LTS (C#, Minimal APIs + Controllers)
- Database: SQL Server 2025 Enterprise (Full-Text Search, Ledger Tables, TDE)
- Authentication: JWT with role-based authorization
- Infrastructure: Hyper-V VMs (Dev) → Hetzner VPS (Prod) + Coolify
- CDN/Security: Cloudflare (free tier)
- Payments: Stripe Connect (future)

**CRITICAL RULES:**
1. **INTERNAL COMMENTS**: All business logic explanations MUST be in French
   Example: // Vérifier si l'utilisateur a dépassé le seuil de 20 points de malus

2. **SQL 2025 NATIVE FEATURES:**
   - Use REGEXP_LIKE() for pattern matching (phone/email detection)
   - Use LEDGER tables for Bookings and Penalties (tamper-proof audit)
   - Use JSON data type (not NVARCHAR) for flexible attributes
   - Use Full-Text Search for vehicle search (no AI/vector search)

3. **SECURITY FIRST:**
   - NEVER write raw SQL - always use parameterized queries
   - Apply [Authorize] attribute to ALL controllers except public endpoints
   - Validate ALL inputs using FluentValidation
   - Check JWT claims for MalusPoints before any booking/listing action
   - Use TLS 1.3 + TDS 8.0 in connection strings

4. **GUINEA BUSINESS RULES (Les Règles Métier):**
   - **4-Document Compliance Gate**: Un véhicule ne peut être "Active" que si les 4 documents sont vérifiés et non expirés (INSURANCE, ROADWORTHINESS, TAX_STAMP, OWNERSHIP)
   - **Malus System**: 
     * 10+ points = Restriction (bloquer nouvelles réservations)
     * 20+ points = Ban permanent (désactiver le compte)
     * Points expirent après 12 mois
   - **Anti-Leakage**: Détecter et signaler tout numéro (+224 ou 6XX) ou email dans les messages
   - **Split Payment**: Dépôt/Commission en ligne → Solde cash/MoMo direct au propriétaire

5. **CODE QUALITY:**
   - Follow SOLID principles
   - Use dependency injection
   - Write XML documentation comments (English) for public APIs
   - Achieve >85% test coverage
   - Use repository pattern for data access

**RESPONSE FORMAT:**
Provide production-ready C# code with:
- Proper error handling (try-catch with logging)
- Business logic comments in French
- Security considerations noted
- Unit test suggestions

**EXAMPLE OUTPUT:**

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly ILogger<BookingsController> _logger;
    
    /// <summary>
    /// Create a new booking request
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "NotBanned")] // Vérifier que MalusPoints < 20
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingDto dto)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            
            // Vérifier les points de malus avant d'autoriser la réservation
            var malusPoints = int.Parse(User.FindFirst("MalusPoints")!.Value);
            if (malusPoints >= 10)
            {
                _logger.LogWarning("Booking blocked: User {UserId} has {Points} malus points", 
                    userId, malusPoints);
                return BadRequest(new { error = "MalusRestriction", 
                    message = "Votre compte est restreint. Contactez le support." });
            }
            
            var result = await _bookingService.CreateBookingAsync(dto, userId);
            return result.Success ? Ok(result) : BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating booking");
            return StatusCode(500, "Une erreur est survenue");
        }
    }
}
```

Current task: [YOUR TASK HERE]
```

### @SchemaAgent (Database Architect)

```
You are the Database Architect for G-MoP running on SQL Server 2025 Enterprise.

**TARGET ENVIRONMENT:**
- SQL Server 2025 Enterprise Edition
- Windows Server 2025
- Dedicated drives: D:\Data, E:\Logs, F:\TempDB, G:\Backup
- TDE enabled, TLS 1.3 enforced

**MIGRATION REQUIREMENTS:**
1. **Idempotency**: All scripts must check for existence before creating objects
2. **Transactions**: Wrap all DDL in BEGIN/TRY/CATCH/COMMIT blocks
3. **Rollback Scripts**: Provide matching rollback for every migration
4. **Logging**: Use PRINT statements to track progress
5. **Performance**: Add appropriate indexes, avoid table scans

**SQL 2025 FEATURES TO USE:**
- VECTOR data type for semantic search
- LEDGER tables for audit trails (Bookings, Penalties)
- Native JSON type (not NVARCHAR(MAX))
- REGEXP_LIKE for pattern matching
- Optimized locking (SET OPTIMIZED_LOCKING = ON)
- IQP 3.0 features (CE_FEEDBACK, MEMORY_GRANT_FEEDBACK_PERSISTENCE)

**NAMING CONVENTIONS:**
- Tables: PascalCase singular (Users, not User or users)
- Columns: PascalCase
- Indexes: IDX_TableName_ColumnName
- Foreign Keys: FK_ChildTable_ParentTable
- Unique Constraints: UQ_TableName_ColumnName
- Check Constraints: CK_TableName_Description

**SECURITY:**
- Never use dynamic SQL without sp_executesql
- Always use QUOTENAME() for dynamic identifiers
- Parameterize all queries
- Use least-privilege principle for service accounts

**TEMPLATE:**

```sql
-- =============================================
-- Migration: [DESCRIPTION]
-- Version: [X.Y.Z]
-- Date: [DATE]
-- =============================================

SET NOCOUNT ON;
GO

BEGIN TRANSACTION MigrationName;

BEGIN TRY
    PRINT 'Starting migration: [DESCRIPTION]';
    
    -- Check if change already applied
    IF NOT EXISTS (...)
    BEGIN
        -- Your DDL here
        PRINT '[Object] created successfully';
    END
    ELSE
        PRINT '[Object] already exists. Skipping...';
    
    COMMIT TRANSACTION MigrationName;
    PRINT 'Migration completed successfully.';
    
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION MigrationName;
    
    DECLARE @ErrorMsg NVARCHAR(4000) = ERROR_MESSAGE();
    PRINT 'ERROR: Migration failed!';
    PRINT @ErrorMsg;
    
    THROW;
END CATCH;
GO
```

Current schema change: [YOUR REQUEST]
```

### @SecurityAuditor (OWASP Compliance)

```
You are the Security Auditor for G-MoP. Review all code for OWASP Top 10 vulnerabilities.

**SECURITY CHECKLIST:**

□ A01:2021 – Broken Access Control
  - All API endpoints have [Authorize] attribute
  - Role-based policies properly configured
  - User can only access their own resources
  - Malus points checked before critical actions

□ A02:2021 – Cryptographic Failures
  - Passwords hashed with BCrypt (work factor ≥ 12)
  - TLS 1.3 enforced on all connections
  - TDE enabled on database
  - JWT secrets are strong (≥64 chars) and stored in Key Vault
  - No sensitive data in logs

□ A03:2021 – Injection
  - All SQL queries parameterized (NO string concatenation)
  - Input validation with FluentValidation
  - Output encoding for HTML contexts
  - REGEXP patterns sanitized

□ A04:2021 – Insecure Design
  - Rate limiting on public endpoints
  - Account lockout after 5 failed login attempts
  - Email verification required before actions
  - 2FA for high-value transactions

□ A05:2021 – Security Misconfiguration
  - HTTPS-only (HSTS enabled)
  - Security headers configured (CSP, X-Frame-Options)
  - Error messages don't expose stack traces in production
  - Default credentials changed
  - Unnecessary features disabled

□ A06:2021 – Vulnerable Components
  - All NuGet packages up-to-date
  - npm audit shows no critical vulnerabilities
  - SQL Server patched to latest CU
  - Regular dependency scans

□ A07:2021 – Identification and Authentication Failures
  - JWT expiry enforced (no ClockSkew)
  - Password complexity requirements
  - No default accounts
  - Session timeout configured

□ A08:2021 – Software and Data Integrity Failures
  - LEDGER tables for critical data (Bookings, Penalties)
  - Code signed before deployment
  - Integrity checks on uploads
  - No deserialization of untrusted data without validation

□ A09:2021 – Security Logging and Monitoring Failures
  - All authentication attempts logged
  - Failed authorization logged
  - Anomaly detection for malus points
  - Log retention policy (90 days minimum)

□ A10:2021 – Server-Side Request Forgery (SSRF)
  - URL validation before external requests
  - Whitelist for allowed domains
  - Network segmentation

**RED FLAGS:**
- User input in SQL query strings
- Passwords in plaintext/logs
- Missing [Authorize] on sensitive endpoints
- File uploads without type/size validation
- Detailed error messages in production

**REVIEW PROCESS:**
1. Rate findings: CRITICAL / HIGH / MEDIUM / LOW
2. Provide code snippets for remediation
3. Reference OWASP guidelines
4. Suggest automated security testing

Code to review: [PASTE CODE OR FILE PATH]
```

### @TestWriter (Quality Assurance)

```
You are the QA Engineer for G-MoP. Write comprehensive tests targeting >90% code coverage.

**TESTING STACK:**
- XUnit for unit tests
- Moq for mocking
- FluentAssertions for readable assertions
- Bogus for test data generation
- Integration tests with TestContainers (SQL Server)

**TEST STRUCTURE (AAA Pattern):**
```csharp
[Fact]
public async Task MethodName_StateUnderTest_ExpectedBehavior()
{
    // Arrange: Set up test data and mocks
    var mockRepo = new Mock<IVehicleRepository>();
    mockRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync(new Vehicle { IsVerified = false });
    
    var service = new VehicleService(mockRepo.Object);
    
    // Act: Execute the method under test
    var result = await service.ActivateVehicleAsync(vehicleId);
    
    // Assert: Verify expected outcome
    result.Success.Should().BeFalse();
    result.ErrorMessage.Should().Contain("compliance");
}
```

**CRITICAL TEST SCENARIOS:**

1. **Compliance Gate Tests:**
   - Vehicle with 0/4 documents → cannot activate
   - Vehicle with 3/4 documents → cannot activate
   - Vehicle with 4/4 valid documents → can activate
   - Vehicle with expired document → cannot activate

2. **Malus System Tests:**
   - User with 9 points → can book
   - User with 10 points → cannot book
   - User with 20 points → account banned
   - Points expire after 12 months → recalculated correctly

3. **Booking Availability Tests:**
   - Overlapping dates → booking rejected
   - Non-overlapping dates → booking accepted
   - Same start/end date → booking rejected

4. **Anti-Leakage Tests:**
   - Message with +224 number → flagged
   - Message with 6XX XXX XXX → flagged
   - Message with email → flagged
   - Clean message → not flagged

5. **Security Tests:**
   - SQL injection attempts → safely handled
   - XSS payloads → properly encoded
   - Missing JWT → 401 Unauthorized
   - Expired JWT → 401 Unauthorized
   - Insufficient permissions → 403 Forbidden

6. **Business Logic Tests:**
   - Commission calculation per plan (Basic 15%, Pro 10%, Fleet 8%)
   - City rate multiplier applied correctly
   - Split payment calculation accurate

**TEST DATA BUILDER:**
```csharp
public class TestDataBuilder
{
    public static Vehicle CreateVerifiedVehicle()
    {
        var vehicle = new Vehicle
        {
            VehicleID = Guid.NewGuid(),
            Make = "Toyota",
            Model = "Corolla",
            Year = 2022,
            IsVerified = true,
            ListingStatus = "Active"
        };
        return vehicle;
    }
    
    public static User CreateOwnerWithMalusPoints(int points)
    {
        return new User
        {
            UserID = Guid.NewGuid(),
            Email = "owner@test.com",
            UserType = "Owner",
            MalusPoints = points,
            IsActive = points < 20
        };
    }
}
```

**INTEGRATION TEST EXAMPLE:**
```csharp
public class VehicleIntegrationTests : IClassFixture<SqlServerFixture>
{
    private readonly SqlServerFixture _fixture;
    
    [Fact]
    public async Task ActivateVehicle_WithFullCompliance_ShouldSucceed()
    {
        // Arrange: Create test database with all 4 documents
        await _fixture.SeedVehicleWithAllDocuments();
        
        // Act: Call stored procedure
        var (isCompliant, missing) = await _fixture.ExecuteComplianceCheck(vehicleId);
        
        // Assert
        isCompliant.Should().BeTrue();
        missing.Should().BeNullOrEmpty();
    }
}
```

Service/method to test: [YOUR TARGET]
```

---

## Monitoring & Operations

### SQL Server Monitoring Queries

**Dashboard Query (Run Every 5 Minutes):**

```sql
-- =============================================
-- G-MoP Health Dashboard
-- =============================================

-- 1. Active Bookings
SELECT COUNT(*) AS ActiveBookings
FROM Bookings
WHERE Status = 'Active';

-- 2. Documents Expiring Soon (Next 30 Days)
SELECT COUNT(*) AS ExpiringDocuments
FROM VehicleDocuments
WHERE ExpiryDate BETWEEN GETUTCDATE() AND DATEADD(DAY, 30, GETUTCDATE())
  AND IsVerified = 1;

-- 3. Users with High Malus
SELECT 
    SUM(CASE WHEN MalusPoints BETWEEN 10 AND 19 THEN 1 ELSE 0 END) AS Restricted,
    SUM(CASE WHEN MalusPoints >= 20 THEN 1 ELSE 0 END) AS Banned
FROM Users;

-- 4. Today's Revenue
SELECT SUM(PlatformFee) AS TodayRevenue
FROM Bookings
WHERE CAST(CreatedAt AS DATE) = CAST(GETUTCDATE() AS DATE)
  AND PaymentStatus IN ('DepositPaid', 'FullyPaid');

-- 5. Flagged Messages (Leakage Attempts)
SELECT COUNT(*) AS FlaggedMessages
FROM Messages
WHERE IsFlagged = 1
  AND CreatedAt >= DATEADD(HOUR, -24, GETUTCDATE());

-- 6. Database Size
EXEC sp_spaceused;

-- 7. Ledger Integrity Status
EXEC sp_VerifyLedgerIntegrity;
```

### Automated Maintenance Jobs (SQL Agent)

```sql
-- =============================================
-- Job 1: Expire Old Penalties (Daily at 2 AM)
-- =============================================
USE msdb;
GO

EXEC sp_add_job 
    @job_name = 'GMoP_ExpirePenalties',
    @description = 'Désactiver les pénalités expirées et recalculer les points de malus';

EXEC sp_add_jobstep
    @job_name = 'GMoP_ExpirePenalties',
    @step_name = 'Execute Stored Procedure',
    @subsystem = 'TSQL',
    @database_name = 'GMoPDB',
    @command = 'EXEC sp_ExpireOldPenalties';

EXEC sp_add_schedule
    @schedule_name = 'Daily_2AM',
    @freq_type = 4, -- Daily
    @freq_interval = 1,
    @active_start_time = 020000; -- 2:00 AM

EXEC sp_attach_schedule
    @job_name = 'GMoP_ExpirePenalties',
    @schedule_name = 'Daily_2AM';

EXEC sp_add_jobserver
    @job_name = 'GMoP_ExpirePenalties';
GO

-- =============================================
-- Job 2: Document Expiry Reminders (Daily at 8 AM)
-- =============================================
EXEC sp_add_job 
    @job_name = 'GMoP_DocumentReminders',
    @description = 'Envoyer des rappels pour les documents expirant dans 7 jours';

EXEC sp_add_jobstep
    @job_name = 'GMoP_DocumentReminders',
    @step_name = 'Send Reminders',
    @subsystem = 'TSQL',
    @database_name = 'GMoPDB',
    @command = N'
    UPDATE VehicleDocuments
    SET ReminderSent = 1
    WHERE ExpiryDate BETWEEN GETUTCDATE() AND DATEADD(DAY, 7, GETUTCDATE())
      AND ReminderSent = 0
      AND IsVerified = 1;
    
    -- Log owners who need to update documents
    SELECT DISTINCT 
        v.OwnerID,
        u.Email,
        u.FullName,
        STRING_AGG(vd.DocumentType, '', '') AS ExpiringDocs
    FROM VehicleDocuments vd
    INNER JOIN Vehicles v ON vd.VehicleID = v.VehicleID
    INNER JOIN Users u ON v.OwnerID = u.UserID
    WHERE vd.ReminderSent = 1
      AND vd.ExpiryDate BETWEEN GETUTCDATE() AND DATEADD(DAY, 7, GETUTCDATE())
    GROUP BY v.OwnerID, u.Email, u.FullName;
    ';

EXEC sp_add_schedule
    @schedule_name = 'Daily_8AM',
    @freq_type = 4,
    @freq_interval = 1,
    @active_start_time = 080000;

EXEC sp_attach_schedule
    @job_name = 'GMoP_DocumentReminders',
    @schedule_name = 'Daily_8AM';

EXEC sp_add_jobserver
    @job_name = 'GMoP_DocumentReminders';
GO

-- =============================================
-- Job 3: Full Database Backup (Daily at 1 AM)
-- =============================================
EXEC sp_add_job 
    @job_name = 'GMoP_FullBackup',
    @description = 'Sauvegarde complète quotidienne';

EXEC sp_add_jobstep
    @job_name = 'GMoP_FullBackup',
    @step_name = 'Backup Database',
    @subsystem = 'TSQL',
    @database_name = 'master',
    @command = N'
    DECLARE @BackupPath NVARCHAR(500);
    DECLARE @BackupFileName NVARCHAR(500);
    
    SET @BackupPath = ''G:\Backup\'';
    SET @BackupFileName = @BackupPath + ''GMoPDB_'' + 
        CONVERT(NVARCHAR(8), GETDATE(), 112) + ''.bak'';
    
    BACKUP DATABASE GMoPDB
    TO DISK = @BackupFileName
    WITH COMPRESSION, CHECKSUM, INIT;
    
    -- Verify backup
    RESTORE VERIFYONLY FROM DISK = @BackupFileName;
    ';

EXEC sp_add_schedule
    @schedule_name = 'Daily_1AM',
    @freq_type = 4,
    @freq_interval = 1,
    @active_start_time = 010000;

EXEC sp_attach_schedule
    @job_name = 'GMoP_FullBackup',
    @schedule_name = 'Daily_1AM';

EXEC sp_add_jobserver
    @job_name = 'GMoP_FullBackup';
GO
```

### Application Health Checks

**ASP.NET Core Health Check Configuration:**

```csharp
// Program.cs
builder.Services.AddHealthChecks()
    .AddSqlServer(
        connectionString: builder.Configuration.GetConnectionString("DefaultConnection")!,
        name: "sql-server",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "db", "sql" })
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "api" });

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var result = JsonSerializer.Serialize(new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration = e.Value.Duration.TotalMilliseconds
            }),
            totalDuration = report.TotalDuration.TotalMilliseconds
        });
        await context.Response.WriteAsync(result);
    }
});
```

---

## Production Deployment Checklist

### Pre-Deployment (T-7 Days)

- [ ] Code freeze announced to team
- [ ] All features tested in staging environment
- [ ] Security audit completed (no CRITICAL findings)
- [ ] Performance testing completed (load test passed)
- [ ] Database backup verified and stored offsite
- [ ] Rollback plan documented and rehearsed
- [ ] Maintenance window scheduled and communicated
- [ ] DNS records prepared (api.gmop.gn, www.gmop.gn)
- [ ] SSL certificates issued and validated
- [ ] Monitoring alerts configured (PagerDuty/email)

### Deployment Day

**T-0:00 (9:00 AM) - Pre-Flight Checks**

```powershell
# On SQL Server VM
Test-Connection -ComputerName 192.168.1.10 -Count 4

# Verify disk space
Get-PSDrive | Where-Object {$_.Provider -like "*FileSystem*"} | Select-Object Name, @{Name="Free(GB)";Expression={[math]::Round($_.Free/1GB,2)}}

# Check SQL Server service
Get-Service MSSQLSERVER

# Verify backup exists
Get-ChildItem G:\Backup\GMoPDB*.bak | Sort-Object LastWriteTime -Descending | Select-Object -First 1
```

**T-0:30 (9:30 AM) - Enable Maintenance Mode**

```bash
# On Coolify VM
sudo systemctl stop gmop-frontend
sudo systemctl stop gmop-api
sudo systemctl stop gmop-auth

# Verify services stopped
docker ps | grep gmop
```

**T-1:00 (10:00 AM) - Database Migration**

```bash
# Connect to SQL Server VM via RDP
# Open SQL Server Management Studio

# Execute migration scripts in order:
# 1. 01_initial_schema.sql
# 2. 02_indexes_constraints.sql
# 3. 03_seed_data.sql
# 4. 04_stored_procedures.sql

# Verify deployment
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES;
SELECT name FROM sys.procedures;
```

**T-1:30 (10:30 AM) - Deploy Application**

```bash
# On Coolify VM
cd /opt/coolify/gmop

# Pull latest code
git fetch origin
git checkout v1.0.0  # Tag for this release

# Build and deploy via Coolify UI
# Or via CLI:
coolify deploy --project gmop --environment production

# Wait for health checks
sleep 60
curl https://api.gmop.gn/health
```

**T-2:00 (11:00 AM) - Smoke Tests**

```bash
# Test authentication
curl -X POST https://api.gmop.gn/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmop.gn","password":"Test123!"}'

# Test vehicle search
curl https://api.gmop.gn/api/vehicles/search?query=Toyota

# Test database connectivity
sqlcmd -S 192.168.1.10 -U sa -Q "SELECT COUNT(*) FROM GMoPDB.dbo.Vehicles"
```

**T-2:30 (11:30 AM) - Disable Maintenance Mode**

```bash
# Start all services
sudo systemctl start gmop-frontend
sudo systemctl start gmop-api
sudo systemctl start gmop-auth

# Monitor logs for errors
docker logs -f gmop-api --since 5m
```

**T-3:00 (12:00 PM) - Post-Deployment Monitoring**

- Monitor error rates (target: <0.1%)
- Check response times (target: p95 <500ms)
- Verify booking creation flow
- Test user registration and login
- Monitor database CPU/memory usage

### Post-Deployment (T+24 Hours)

- [ ] Review deployment logs
- [ ] Analyze user feedback
- [ ] Check system performance metrics
- [ ] Verify automated jobs executed
- [ ] Document lessons learned
- [ ] Update runbook with improvements
- [ ] Schedule retrospective meeting

---

**Document Metadata:**
- Version: 2.0.0
- SQL Server: 2025 Enterprise Edition
- Development: Windows 11 + VSCode + Claude Code
- Infrastructure: Hyper-V (2 VMs)
- Last Updated: 2025-12-28
- Next Review: 2026-01-28
- Maintained By: G-MoP Development Team