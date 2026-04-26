using EVCS.Api.Contracts;
using EVCS.Application.Abstractions.Services;
using EVCS.Application.DTOs;
using EVCS.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace EVCS.Api.Controllers;

[ApiController]
[Route("api")]
public class UsageHistoryController : ControllerBase
{
    private readonly IUsageHistoryService _usageHistoryService;

    public UsageHistoryController(IUsageHistoryService usageHistoryService)
        => _usageHistoryService = usageHistoryService;

    // Frontend calls /history (not /usage-history)
    [HttpGet("history")]
    [HttpGet("usage-history")]
    public async Task<IActionResult> GetList(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int? stationId,
        [FromQuery] int? poleId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        SessionStatus? sessionStatus = status?.ToLower() switch
        {
            "ongoing" => SessionStatus.Ongoing,
            "completed" => SessionStatus.Completed,
            "cancelled" => SessionStatus.Cancelled,
            "failed" => SessionStatus.Failed,
            _ => null
        };

        var filter = new UsageHistoryFilter(fromDate, toDate, stationId, poleId, sessionStatus);
        var data = await _usageHistoryService.GetListAsync(filter, cancellationToken);
        var result = data.Select(ToFrontend).ToArray();
        return Ok(ApiResponse<object>.Ok(result));
    }

    [HttpGet("usage-history/export-csv")]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int? stationId,
        [FromQuery] int? poleId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        SessionStatus? sessionStatus = status?.ToLower() switch
        {
            "ongoing" => SessionStatus.Ongoing,
            "completed" => SessionStatus.Completed,
            "cancelled" => SessionStatus.Cancelled,
            "failed" => SessionStatus.Failed,
            _ => null
        };

        var filter = new UsageHistoryFilter(fromDate, toDate, stationId, poleId, sessionStatus);
        var file = await _usageHistoryService.ExportCsvAsync(filter, cancellationToken);
        return File(file.Content, file.ContentType, file.FileName);
    }

    // Map to frontend-expected format
    private static object ToFrontend(UsageHistorySummaryDto s) => new
    {
        id = s.Id.ToString(),
        stationId = s.StationCode,            // frontend uses station code like "ST001"
        stationName = s.StationName,
        connector = s.PoleCode ?? $"Pole {s.PoleId}",
        start = s.StartTime.ToString("o"),
        end = s.EndTime?.ToString("o"),
        kwh = s.EnergyKwh,
        duration = s.DurationMinutes,
        cost = s.Cost,
        status = MapStatus(s.Status)
    };

    private static string MapStatus(SessionStatus s) => s switch
    {
        SessionStatus.Completed => "completed",
        SessionStatus.Cancelled => "cancelled",
        SessionStatus.Failed => "failed",
        _ => "ongoing"
    };
}
