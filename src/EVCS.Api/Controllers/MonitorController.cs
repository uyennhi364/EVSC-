using EVCS.Api.Contracts;
using EVCS.Application.Abstractions.Persistence;
using EVCS.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EVCS.Infrastructure.Persistence;

namespace EVCS.Api.Controllers;

/// <summary>
/// UC 3 - Theo dõi tình trạng trạm sạc (real-time overview)
/// Frontend monitor.js calls GET /api/monitor/overview
/// </summary>
[ApiController]
[Route("api/monitor")]
public class MonitorController : ControllerBase
{
    private readonly AppDbContext _db;

    public MonitorController(AppDbContext db) => _db = db;

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
    {
        var stations = await _db.Stations
            .Include(s => s.Poles)
            .OrderBy(s => s.Code)
            .ToListAsync(cancellationToken);

        var sessionCounts = await _db.ChargingSessions
            .Where(s => s.Status == SessionStatus.Completed)
            .GroupBy(s => s.StationId)
            .Select(g => new { StationId = g.Key, Count = g.Count(), Energy = g.Sum(x => x.EnergyKwh) })
            .ToListAsync(cancellationToken);

        var sessionMap = sessionCounts.ToDictionary(x => x.StationId);

        // Build distinct regions from area field
        var regions = stations
            .Where(s => !string.IsNullOrWhiteSpace(s.Area))
            .Select(s => s.Area!)
            .Distinct()
            .OrderBy(a => a)
            .Select(a => new { key = a.ToLower().Replace(" ", "_"), label = a })
            .ToArray();

        var stationDtos = stations.Select(s =>
        {
            var dbStatus = s.Status;
            var monitorStatus = dbStatus switch
            {
                StationStatus.Active => "online",
                StationStatus.Maintenance => "offline",
                StationStatus.Error => "error",
                _ => "offline"
            };

            sessionMap.TryGetValue(s.Id, out var sess);

            // Calculate uptime % based on non-fault poles
            var totalPoles = s.Poles.Count;
            var faultPoles = s.Poles.Count(p => p.Status == PoleStatus.Fault || p.Status == PoleStatus.Inactive);
            var uptime = totalPoles > 0 ? Math.Round((double)(totalPoles - faultPoles) / totalPoles * 100, 1) : 0.0;

            return new
            {
                id = s.Code,
                numericId = s.Id,
                name = s.Name,
                address = s.Address,
                area = s.Area?.ToLower().Replace(" ", "_") ?? "",
                areaLabel = s.Area ?? "",
                status = monitorStatus,
                operatingHours = s.OperatingHours ?? "24/7",
                totalSessions = sess?.Count ?? 0,
                totalEnergy = sess?.Energy ?? 0m,
                uptime,
                connectors = s.Poles.OrderBy(p => p.Code).Select(p => new
                {
                    id = p.Code,
                    type = p.Name,
                    status = p.Status switch
                    {
                        PoleStatus.Available => "available",
                        PoleStatus.InUse => "in-use",
                        PoleStatus.Fault => "fault",
                        _ => "fault"
                    }
                }).ToArray()
            };
        }).ToArray();

        var payload = new
        {
            stations = stationDtos,
            regions
        };

        return Ok(ApiResponse<object>.Ok(payload));
    }
}
