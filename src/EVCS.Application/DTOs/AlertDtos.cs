using EVCS.Domain.Enums;

namespace EVCS.Application.DTOs;

public record AlertFilter(int? StationId, AlertStatus? Status, AlertSeverity? Severity);

public record AlertSummaryDto(
    int Id,
    int StationId,
    string StationName,
    int? PoleId,
    string? PoleCode,
    string AlertType,
    AlertSeverity Severity,
    string Message,
    DateTime OccurredAt,
    AlertStatus Status,
    string? Note);

public record CreateAlertRequest(
    int StationId,
    int? PoleId,
    string AlertType,
    AlertSeverity Severity,
    string Message,
    DateTime? OccurredAt);

public record ProcessAlertRequest(AlertStatus Status, string? Note);
