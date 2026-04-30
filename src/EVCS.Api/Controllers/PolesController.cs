using EVCS.Api.Contracts;
using EVCS.Application.Abstractions.Persistence;
using EVCS.Application.Abstractions.Services;
using EVCS.Application.DTOs;
using EVCS.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace EVCS.Api.Controllers;

[ApiController]
[Route("api/poles")]
public class PolesController : ControllerBase
{
    private readonly IPoleService _poleService;
    private readonly IStationRepository _stationRepo;
    private readonly IPoleRepository _poleRepo;

    public PolesController(IPoleService poleService, IStationRepository stationRepo, IPoleRepository poleRepo)
    {
        _poleService = poleService;
        _stationRepo = stationRepo;
        _poleRepo = poleRepo;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] int? stationId,
        [FromQuery] string? keyword,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        PoleStatus? poleStatus = status?.ToLower() switch
        {
            "active" or "available" => PoleStatus.Available,
            "inactive" => PoleStatus.Inactive,
            "fault" => PoleStatus.Fault,
            "in_use" or "inuse" => PoleStatus.InUse,
            _ => null
        };

        var data = await _poleService.GetListAsync(new PoleListQuery(stationId, keyword, poleStatus), cancellationToken);
        return Ok(ApiResponse<object>.Ok(data.Select(ToFrontend).ToArray()));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var data = await _poleService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FrontendPoleRequest request, CancellationToken cancellationToken)
    {
        var stationNumericId = await ResolveStationId(request.StationId, cancellationToken);
        if (stationNumericId is null)
            return BadRequest(ApiResponse<object>.Fail("Station not found."));

        var code = await _poleRepo.GetNextCodeAsync(cancellationToken);
        var poleStatus = request.Status?.ToLower() is "inactive" ? PoleStatus.Inactive : PoleStatus.Available;
        var req = new CreatePoleRequest(
            stationNumericId.Value,
            request.Name ?? "",
            code,
            request.Model,
            request.Manufacturer,
            request.Connectors?.Length ?? 1,
            poleStatus,
            string.IsNullOrEmpty(request.InstalledAt) ? null
                : DateTime.TryParse(request.InstalledAt, out var dt) ? dt.ToUniversalTime() : (DateTime?)null);

        var data = await _poleService.CreateAsync(req, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data), "Pole created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] FrontendPoleRequest request, CancellationToken cancellationToken)
    {
        var stationNumericId = await ResolveStationId(request.StationId, cancellationToken);
        if (stationNumericId is null)
            return BadRequest(ApiResponse<object>.Fail("Station not found."));

        var poleStatus = request.Status?.ToLower() is "inactive" ? PoleStatus.Inactive : PoleStatus.Available;
        var req = new UpdatePoleRequest(
            stationNumericId.Value,
            request.Name ?? "",
            request.ActiveCode ?? request.Id ?? "",
            request.Model,
            request.Manufacturer,
            request.Connectors?.Length ?? 1,
            poleStatus,
            string.IsNullOrEmpty(request.InstalledAt) ? null
                : DateTime.TryParse(request.InstalledAt, out var dt) ? dt.ToUniversalTime() : (DateTime?)null);

        var data = await _poleService.UpdateAsync(id, req, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data), "Pole updated successfully."));
    }

    [HttpPut("{code}")]
    public async Task<IActionResult> UpdateByCode(string code, [FromBody] FrontendPoleRequest request, CancellationToken cancellationToken)
    {
        var pole = await _poleRepo.GetByCodeAsync(code, cancellationToken);
        if (pole is null) return NotFound(ApiResponse<object>.Fail($"Pole not found: {code}"));

        var stationNumericId = await ResolveStationId(request.StationId, cancellationToken);
        if (stationNumericId is null)
            return BadRequest(ApiResponse<object>.Fail("Station not found."));

        var poleStatus = request.Status?.ToLower() is "inactive" ? PoleStatus.Inactive : PoleStatus.Available;
        var req = new UpdatePoleRequest(
            stationNumericId.Value,
            request.Name ?? "",
            request.ActiveCode ?? request.Id ?? code,
            request.Model,
            request.Manufacturer,
            request.Connectors?.Length ?? 1,
            poleStatus,
            string.IsNullOrEmpty(request.InstalledAt) ? null
                : DateTime.TryParse(request.InstalledAt, out var dt) ? dt.ToUniversalTime() : (DateTime?)null);

        var data = await _poleService.UpdateAsync(pole.Id, req, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data), "Pole updated successfully."));
    }

    [HttpPatch("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id, CancellationToken cancellationToken)
    {
        var data = await _poleService.DeactivateAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data), "Pole deactivated successfully."));
    }

    [HttpPatch("{id:int}/activate")]
    public async Task<IActionResult> Activate(int id, CancellationToken cancellationToken)
    {
        var data = await _poleService.ActivateAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data), "Pole activated successfully."));
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] SetStatusRequest request, CancellationToken cancellationToken)
    {
        var isActive = request.Status?.ToLower() is "active";
        var data = isActive
            ? await _poleService.ActivateAsync(id, cancellationToken)
            : await _poleService.DeactivateAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data), isActive ? "Pole activated successfully." : "Pole deactivated successfully."));
    }

    [HttpPatch("{code}/status")]
    public async Task<IActionResult> SetStatusByCode(string code, [FromBody] SetStatusRequest request, CancellationToken cancellationToken)
    {
        var pole = await _poleRepo.GetByCodeAsync(code, cancellationToken);
        if (pole is null) return NotFound(ApiResponse<object>.Fail($"Pole not found: {code}"));

        var isActive = request.Status?.ToLower() is "active";
        var data = isActive
            ? await _poleService.ActivateAsync(pole.Id, cancellationToken)
            : await _poleService.DeactivateAsync(pole.Id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data), isActive ? "Pole activated successfully." : "Pole deactivated successfully."));
    }

    [HttpPatch("{code}/deactivate")]
    public async Task<IActionResult> DeactivateByCode(string code, CancellationToken cancellationToken)
    {
        var pole = await _poleRepo.GetByCodeAsync(code, cancellationToken);
        if (pole is null) return NotFound(ApiResponse<object>.Fail($"Pole not found: {code}"));
        var data = await _poleService.DeactivateAsync(pole.Id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data), "Pole deactivated successfully."));
    }

    [HttpPatch("{code}/activate")]
    public async Task<IActionResult> ActivateByCode(string code, CancellationToken cancellationToken)
    {
        var pole = await _poleRepo.GetByCodeAsync(code, cancellationToken);
        if (pole is null) return NotFound(ApiResponse<object>.Fail($"Pole not found: {code}"));
        var data = await _poleService.ActivateAsync(pole.Id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontend(data), "Pole activated successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _poleService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }, "Pole deleted successfully."));
    }

    [HttpDelete("{code}")]
    public async Task<IActionResult> DeleteByCode(string code, CancellationToken cancellationToken)
    {
        var pole = await _poleRepo.GetByCodeAsync(code, cancellationToken);
        if (pole is null) return NotFound(ApiResponse<object>.Fail($"Pole not found: {code}"));
        await _poleService.DeleteAsync(pole.Id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }, "Pole deleted successfully."));
    }

    private async Task<int?> ResolveStationId(string? stationId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(stationId)) return null;
        if (int.TryParse(stationId, out var numId)) return numId;

        var code = stationId.Contains(" - ")
            ? stationId.Split(" - ")[0].Trim()
            : stationId.Trim();

        var station = await _stationRepo.GetByCodeAsync(code, ct);
        return station?.Id;
    }

    private static object ToFrontend(PoleSummaryDto p) => new
    {
        id = p.Code,
        numericId = p.Id,
        name = p.Name,
        activeCode = p.Code,
        manufacturer = p.Manufacturer ?? "",
        model = p.Model ?? "",
        station = p.StationName,
        stationId = p.StationCode,
        stationNumericId = p.StationId,
        status = p.Status is PoleStatus.Available or PoleStatus.InUse ? "Active" : "Inactive",
        installedAt = p.InstalledAt?.ToString("o") ?? DateTime.UtcNow.ToString("o"),
        connectors = BuildConnectors(p.NumberOfPorts, p.Status),
        createdAt = p.CreatedAt.ToString("o"),
        updatedAt = p.UpdatedAt?.ToString("o")
    };

    private static string[] BuildConnectors(int count, PoleStatus status)
    {
        var s = status is PoleStatus.Inactive or PoleStatus.Fault ? "Inactive" : "Available";
        return Enumerable.Range(1, Math.Max(1, count)).Select(i => $"Connector {i} / {s}").ToArray();
    }
}
