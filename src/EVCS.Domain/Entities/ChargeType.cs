using EVCS.Domain.Common;
using EVCS.Domain.Enums;

namespace EVCS.Domain.Entities;

public class ChargeType : AuditableEntity
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal MaxVoltage { get; set; }
    public decimal MaxCurrent { get; set; }
    public string? SuitableCar { get; set; }
    public EquipmentStatus Status { get; set; } = EquipmentStatus.Available;
}
