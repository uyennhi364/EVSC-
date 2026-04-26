using EVCS.Domain.Common;
using EVCS.Domain.Enums;

namespace EVCS.Domain.Entities;

public class Alert : AuditableEntity
{
    public int Id { get; set; }
    public int StationId { get; set; }
    public int? PoleId { get; set; }
    public string AlertType { get; set; } = string.Empty;
    public AlertSeverity Severity { get; set; } = AlertSeverity.Medium;
    public string Message { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public AlertStatus Status { get; set; } = AlertStatus.New;
    public string? Note { get; set; }

    public Station? Station { get; set; }
    public Pole? Pole { get; set; }
}
