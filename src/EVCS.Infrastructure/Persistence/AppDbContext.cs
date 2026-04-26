using EVCS.Application.Abstractions.Persistence;
using EVCS.Domain.Entities;
using EVCS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace EVCS.Infrastructure.Persistence;

public class AppDbContext : DbContext, IUnitOfWork
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Station> Stations => Set<Station>();
    public DbSet<Pole> Poles => Set<Pole>();
    public DbSet<ChargingSession> ChargingSessions => Set<ChargingSession>();
    public DbSet<Alert> Alerts => Set<Alert>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Npgsql auto-converts PascalCase ? snake_case for columns
        // We only need to map table names and special column names

        ConfigureStation(modelBuilder);
        ConfigurePole(modelBuilder);
        ConfigureChargingSession(modelBuilder);
        ConfigureAlert(modelBuilder);
    }

    // DB stores lowercase: "active", "in_use", "new", etc.
    private static readonly ValueConverter<StationStatus, string> StationStatusConverter = new(
        v => v.ToString().ToLower(),
        v => Enum.Parse<StationStatus>(v, true));

    private static readonly ValueConverter<PoleStatus, string> PoleStatusConverter = new(
        v => PoleStatusToDb(v),
        v => PoleStatusFromDb(v));

    private static readonly ValueConverter<SessionStatus, string> SessionStatusConverter = new(
        v => v.ToString().ToLower(),
        v => Enum.Parse<SessionStatus>(v, true));

    private static readonly ValueConverter<AlertSeverity, string> AlertSeverityConverter = new(
        v => v.ToString().ToLower(),
        v => Enum.Parse<AlertSeverity>(v, true));

    private static readonly ValueConverter<AlertStatus, string> AlertStatusConverter = new(
        v => v.ToString().ToLower(),
        v => Enum.Parse<AlertStatus>(v, true));

    private static string PoleStatusToDb(PoleStatus v)
        => v == PoleStatus.InUse ? "in_use" : v.ToString().ToLower();

    private static PoleStatus PoleStatusFromDb(string v)
        => v == "in_use" ? PoleStatus.InUse : Enum.Parse<PoleStatus>(v, true);

    private static void ConfigureStation(ModelBuilder modelBuilder)
    {
        var e = modelBuilder.Entity<Station>();
        e.ToTable("stations");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("station_id");
        e.Property(x => x.Code).HasColumnName("station_code").HasMaxLength(50).IsRequired();
        e.Property(x => x.Name).HasColumnName("station_name").HasMaxLength(100).IsRequired();
        e.Property(x => x.Address).HasColumnName("address").HasMaxLength(255).IsRequired();
        e.Property(x => x.Area).HasColumnName("area").HasMaxLength(100);
        e.Property(x => x.Latitude).HasColumnName("latitude").HasPrecision(10, 7);
        e.Property(x => x.Longitude).HasColumnName("longitude").HasPrecision(10, 7);
        e.Property(x => x.Status).HasColumnName("status").HasConversion(StationStatusConverter).HasMaxLength(20).IsRequired();
        e.Property(x => x.OperatingHours).HasColumnName("operating_hours").HasMaxLength(100);
        e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
    }

    private static void ConfigurePole(ModelBuilder modelBuilder)
    {
        var e = modelBuilder.Entity<Pole>();
        e.ToTable("poles");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("pole_id");
        e.Property(x => x.StationId).HasColumnName("station_id");
        e.Property(x => x.Code).HasColumnName("pole_code").HasMaxLength(50).IsRequired();
        e.Property(x => x.Name).HasColumnName("pole_name").HasMaxLength(100).IsRequired();
        e.Property(x => x.Model).HasColumnName("model").HasMaxLength(100);
        e.Property(x => x.Manufacturer).HasColumnName("manufacturer").HasMaxLength(100);
        e.Property(x => x.InstalledAt).HasColumnName("install_date");
        e.Property(x => x.NumberOfPorts).HasColumnName("number_of_ports");
        e.Property(x => x.Status).HasColumnName("status").HasConversion(PoleStatusConverter).HasMaxLength(20).IsRequired();
        e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");

        e.HasOne(x => x.Station)
            .WithMany(x => x.Poles)
            .HasForeignKey(x => x.StationId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureChargingSession(ModelBuilder modelBuilder)
    {
        var e = modelBuilder.Entity<ChargingSession>();
        e.ToTable("charging_sessions");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("session_id");
        e.Property(x => x.StationId).HasColumnName("station_id");
        e.Property(x => x.PoleId).HasColumnName("pole_id");
        e.Property(x => x.StartTime).HasColumnName("start_time");
        e.Property(x => x.EndTime).HasColumnName("end_time");
        e.Property(x => x.EnergyKwh).HasColumnName("energy_kwh").HasPrecision(10, 2);
        e.Property(x => x.DurationMinutes).HasColumnName("duration_minutes");
        e.Property(x => x.Cost).HasColumnName("cost").HasPrecision(12, 2);
        e.Property(x => x.Status).HasColumnName("session_status").HasConversion(SessionStatusConverter).HasMaxLength(20).IsRequired();
        e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
        e.Ignore(x => x.UpdatedAt); // charging_sessions has no updated_at column

        e.HasOne(x => x.Station)
            .WithMany(x => x.ChargingSessions)
            .HasForeignKey(x => x.StationId)
            .OnDelete(DeleteBehavior.Restrict);

        e.HasOne(x => x.Pole)
            .WithMany(x => x.ChargingSessions)
            .HasForeignKey(x => x.PoleId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureAlert(ModelBuilder modelBuilder)
    {
        var e = modelBuilder.Entity<Alert>();
        e.ToTable("alerts");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("alert_id");
        e.Property(x => x.StationId).HasColumnName("station_id");
        e.Property(x => x.PoleId).HasColumnName("pole_id");
        e.Property(x => x.AlertType).HasColumnName("alert_type").HasMaxLength(100).IsRequired();
        e.Property(x => x.Severity).HasColumnName("severity").HasConversion(AlertSeverityConverter).HasMaxLength(20).IsRequired();
        e.Property(x => x.Message).HasColumnName("message").HasMaxLength(500).IsRequired();
        e.Property(x => x.OccurredAt).HasColumnName("occurred_at");
        e.Property(x => x.Status).HasColumnName("alert_status").HasConversion(AlertStatusConverter).HasMaxLength(20).IsRequired();
        e.Property(x => x.Note).HasColumnName("note").HasMaxLength(500);
        e.Ignore(x => x.CreatedAt);
        e.Ignore(x => x.UpdatedAt); // alerts has no updated_at column

        e.HasOne(x => x.Station)
            .WithMany(x => x.Alerts)
            .HasForeignKey(x => x.StationId)
            .OnDelete(DeleteBehavior.Restrict);

        e.HasOne(x => x.Pole)
            .WithMany(x => x.Alerts)
            .HasForeignKey(x => x.PoleId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
