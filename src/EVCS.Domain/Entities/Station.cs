using EVCS.Domain.Common;
using EVCS.Domain.Enums;

namespace EVCS.Domain.Entities;

public class Station : AuditableEntity
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Area { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public StationStatus Status { get; set; } = StationStatus.Active;
    public string? OperatingHours { get; set; }

    public ICollection<Pole> Poles { get; set; } = new List<Pole>();
    public ICollection<ChargingSession> ChargingSessions { get; set; } = new List<ChargingSession>();
    public ICollection<Alert> Alerts { get; set; } = new List<Alert>();
}
