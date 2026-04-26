using EVCS.Domain.Enums;

namespace EVCS.Application.DTOs;

public record StationListQuery(string? Keyword, StationStatus? Status);

public record StationSummaryDto(
    int Id,
    string Code,
    string Name,
    string Address,
    string? Area,
    decimal? Latitude,
    decimal? Longitude,
    StationStatus Status,
    string? OperatingHours,
    DateTime CreatedAt,
    int PoleCount);

public record StationDetailDto(
    int Id,
    string Code,
    string Name,
    string Address,
    string? Area,
    decimal? Latitude,
    decimal? Longitude,
    StationStatus Status,
    string? OperatingHours,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyCollection<PoleCompactDto> Poles);

public record PoleCompactDto(int Id, string Name, string Code, PoleStatus Status);

public record CreateStationRequest(
    string Code,
    string Name,
    string Address,
    string? Area,
    decimal? Latitude,
    decimal? Longitude,
    StationStatus? Status,
    string? OperatingHours);

public record UpdateStationRequest(
    string Name,
    string Address,
    string? Area,
    decimal? Latitude,
    decimal? Longitude,
    StationStatus Status,
    string? OperatingHours);

public record StationDashboardDto(int Total, int Active, int Inactive, int Maintenance, int Error);
