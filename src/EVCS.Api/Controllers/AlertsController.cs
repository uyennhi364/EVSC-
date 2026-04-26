using EVCS.Api.Contracts;
using EVCS.Application.Abstractions.Services;
using EVCS.Application.DTOs;
using EVCS.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace EVCS.Api.Controllers;

[ApiController]
[Route("api/alerts")]
public class AlertsController : ControllerBase
{
    private readonly IAlertService _alertService;

    public AlertsController(IAlertService alertService) => _alertService = alertService;

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] int? stationId,
        [FromQuery] string? status,
        [FromQuery] string? severity,
        CancellationToken cancellationToken)
    {
        AlertStatus? alertStatus = status?.ToLower() switch
        {
            "new" or "open" => AlertStatus.New,
            "acknowledged" => AlertStatus.Acknowledged,
            "resolved" => AlertStatus.Resolved,
            _ => null
        };

        AlertSeverity? alertSeverity = severity?.ToLower() switch
        {
            "low" => AlertSeverity.Low,
            "medium" => AlertSeverity.Medium,
            "high" => AlertSeverity.High,
            "critical" => AlertSeverity.Critical,
            _ => null
        };

        var data = await _alertService.GetListAsync(new AlertFilter(stationId, alertStatus, alertSeverity), cancellationToken);
        var result = data.Select(ToFrontend).ToArray();
        return Ok(ApiResponse<object>.Ok(result));
    }

    // alert-detail.js calls GET /alerts/{id} — id can be "ALT-0001" or numeric
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        // Parse "ALT-0001" → 1, or plain "1" → 1
        var numericId = 0;
        if (id.StartsWith("ALT-", StringComparison.OrdinalIgnoreCase))
            int.TryParse(id[4..], out numericId);
        else
            int.TryParse(id, out numericId);

        if (numericId <= 0)
            return NotFound(ApiResponse<object>.Fail("Không tìm thấy cảnh báo."));

        var data = await _alertService.GetByIdAsync(numericId, cancellationToken);
        if (data is null)
            return NotFound(ApiResponse<object>.Fail("Không tìm thấy cảnh báo."));

        return Ok(ApiResponse<object>.Ok(ToFrontend(data)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAlertRequest request, CancellationToken cancellationToken)
    {
        var data = await _alertService.CreateAsync(request, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data), "Ghi nhận cảnh báo thành công."));
    }

    [HttpPatch("{id:long}/process")]
    public async Task<IActionResult> Process(long id, [FromBody] ProcessAlertRequest request, CancellationToken cancellationToken)
    {
        var data = await _alertService.ProcessAsync(id, request, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data), "Cập nhật trạng thái cảnh báo thành công."));
    }

    // Map to frontend-expected format
    private static object ToFrontend(AlertSummaryDto a) => new
    {
        id = $"ALT-{a.Id:D4}",               // frontend expects string id like "ALT-0001"
        numericId = a.Id,
        type = a.AlertType,
        stationName = a.StationName,
        stationId = a.StationId,
        poleId = a.PoleId,
        poleCode = a.PoleCode,
        occurredAt = a.OccurredAt.ToString("o"),
        severity = MapSeverity(a.Severity),   // "critical" | "high" | "medium" | "low"
        status = MapStatus(a.Status),         // "open" | "resolved"
        description = a.Message,
        suggestion = a.Note ?? "",
        logs = Array.Empty<object>()
    };

    private static string MapSeverity(AlertSeverity s) => s switch
    {
        AlertSeverity.Critical => "critical",
        AlertSeverity.High => "high",
        AlertSeverity.Medium => "medium",
        AlertSeverity.Low => "low",
        _ => "low"
    };

    private static string MapStatus(AlertStatus s) => s switch
    {
        AlertStatus.Resolved => "resolved",
        _ => "open"   // New and Acknowledged both show as "open" in frontend
    };
}
