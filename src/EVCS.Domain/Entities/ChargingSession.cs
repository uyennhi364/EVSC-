using EVCS.Domain.Common;
using EVCS.Domain.Enums;

namespace EVCS.Domain.Entities;

public class ChargingSession : AuditableEntity
{
    public int Id { get; set; }
    public int StationId { get; set; }
    public int PoleId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public decimal EnergyKwh { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Cost { get; set; }
    public SessionStatus Status { get; set; } = SessionStatus.Ongoing;

    public Station? Station { get; set; }
    public Pole? Pole { get; set; }
}
