// Kept for backward compatibility - use StationStatus or PoleStatus instead
namespace EVCS.Domain.Enums;

[Obsolete("Use StationStatus or PoleStatus instead")]
public enum EquipmentStatus
{
    Available = 1,
    Unavailable = 2,
    Disabled = 3
}
