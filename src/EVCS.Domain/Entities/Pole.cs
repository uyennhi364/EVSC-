using EVCS.Domain.Common;
using EVCS.Domain.Enums;

namespace EVCS.Domain.Entities;

public class Pole : AuditableEntity
{
    public int Id { get; set; }
    public int StationId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Model { get; set; }
    public string? Manufacturer { get; set; }
    public DateTime? InstalledAt { get; set; }
    public int NumberOfPorts { get; set; } = 1;
    public PoleStatus Status { get; set; } = PoleStatus.Available;

    public Station? Station { get; set; }
    public ICollection<ChargingSession> ChargingSessions { get; set; } = new List<ChargingSession>();
    public ICollection<Alert> Alerts { get; set; } = new List<Alert>();
}
