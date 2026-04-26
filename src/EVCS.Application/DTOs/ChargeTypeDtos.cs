using EVCS.Domain.Enums;

namespace EVCS.Application.DTOs;

public record ChargeTypeListQuery(string? Keyword, EquipmentStatus? Status);

public record ChargeTypeSummaryDto(
    int Id,
    string Code,
    string Name,
    decimal MaxVoltage,
    decimal MaxCurrent,
    string? SuitableCar,
    EquipmentStatus Status,
    DateTime CreatedAt);

public record ChargeTypeDetailDto(
    int Id,
    string Code,
    string Name,
    decimal MaxVoltage,
    decimal MaxCurrent,
    string? SuitableCar,
    EquipmentStatus Status,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record CreateChargeTypeRequest(
    string Code,
    string Name,
    decimal MaxVoltage,
    decimal MaxCurrent,
    string? SuitableCar,
    EquipmentStatus? Status);

public record UpdateChargeTypeRequest(
    string Name,
    decimal MaxVoltage,
    decimal MaxCurrent,
    string? SuitableCar,
    EquipmentStatus Status);
