using EVCS.Domain.Enums;

namespace EVCS.Application.DTOs;

public record UsageHistoryFilter(
    DateTime? FromDate,
    DateTime? ToDate,
    int? StationId,
    int? PoleId,
    SessionStatus? Status);

public record UsageHistorySummaryDto(
    int Id,
    int StationId,
    string StationCode,
    string StationName,
    int PoleId,
    string? PoleCode,
    DateTime StartTime,
    DateTime? EndTime,
    decimal EnergyKwh,
    int DurationMinutes,
    decimal Cost,
    SessionStatus Status);
