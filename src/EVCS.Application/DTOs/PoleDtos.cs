using EVCS.Domain.Enums;

namespace EVCS.Application.DTOs;

public record PoleListQuery(int? StationId, string? Keyword, PoleStatus? Status);

public record PoleSummaryDto(
    int Id,
    int StationId,
    string StationCode,
    string StationName,
    string Name,
    string Code,
    string? Model,
    string? Manufacturer,
    int NumberOfPorts,
    PoleStatus Status,
    DateTime? InstalledAt,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record CreatePoleRequest(
    int StationId,
    string Name,
    string Code,
    string? Model,
    string? Manufacturer,
    int NumberOfPorts,
    PoleStatus? Status,
    DateTime? InstalledAt);

public record UpdatePoleRequest(
    int StationId,
    string Name,
    string Code,
    string? Model,
    string? Manufacturer,
    int NumberOfPorts,
    PoleStatus Status,
    DateTime? InstalledAt);
