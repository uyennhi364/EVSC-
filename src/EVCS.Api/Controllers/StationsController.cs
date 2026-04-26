using EVCS.Api.Contracts;
using EVCS.Application.Abstractions.Persistence;
using EVCS.Application.Abstractions.Services;
using EVCS.Application.DTOs;
using EVCS.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace EVCS.Api.Controllers;

[ApiController]
[Route("api/stations")]
public class StationsController : ControllerBase
{
    private readonly IStationService _stationService;
    private readonly IStationRepository _stationRepo;

    public StationsController(IStationService stationService, IStationRepository stationRepo)
    {
        _stationService = stationService;
        _stationRepo = stationRepo;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? keyword,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        StationStatus? stationStatus = status?.ToLower() switch
        {
            "active" => StationStatus.Active,
            "inactive" => StationStatus.Inactive,
            "maintenance" => StationStatus.Maintenance,
            "error" => StationStatus.Error,
            _ => null
        };

        var data = await _stationService.GetListAsync(new StationListQuery(keyword, stationStatus), cancellationToken);
        return Ok(ApiResponse<object>.Ok(data.Select(ToFrontend).ToArray()));
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken)
    {
        var data = await _stationService.GetDashboardAsync(cancellationToken);
        return Ok(ApiResponse<StationDashboardDto>.Ok(data));
    }

    // GET by numeric id
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var data = await _stationService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontendDetail(data)));
    }

    // GET by string code e.g. "ST001"
    [HttpGet("{code}")]
    public async Task<IActionResult> GetByCode(string code, CancellationToken cancellationToken)
    {
        var station = await _stationRepo.GetByCodeAsync(code, cancellationToken);
        if (station is null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy trạm sạc."));
        var data = await _stationService.GetByIdAsync(station.Id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontendDetail(data)));
    }

    // Frontend sends: { name, address, latitude, longitude, status, operationTime, connectors }
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FrontendStationRequest request, CancellationToken cancellationToken)
    {
        // Validate GPS range
        if (decimal.TryParse(request.Latitude, out var latVal) && (latVal < -90 || latVal > 90))
            return BadRequest(ApiResponse<object>.Fail("Vĩ độ không hợp lệ. Phải trong khoảng -90 đến 90."));
        if (decimal.TryParse(request.Longitude, out var lonVal) && (lonVal < -180 || lonVal > 180))
            return BadRequest(ApiResponse<object>.Fail("Kinh độ không hợp lệ. Phải trong khoảng -180 đến 180."));
        var code = await _stationRepo.GetNextCodeAsync(cancellationToken);
        var req = new CreateStationRequest(
            Code: code,
            Name: request.Name ?? "",
            Address: request.Address ?? "",
            Area: null,
            Latitude: decimal.TryParse(request.Latitude, out var lat) ? lat : null,
            Longitude: decimal.TryParse(request.Longitude, out var lon) ? lon : null,
            Status: ParseStationStatus(request.Status),
            OperatingHours: request.OperationTime);

        var data = await _stationService.CreateAsync(req, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontendDetail(data), "Tạo trạm sạc thành công."));
    }

    // PUT by numeric id
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] FrontendStationRequest request, CancellationToken cancellationToken)
    {
        if (decimal.TryParse(request.Latitude, out var latVal) && (latVal < -90 || latVal > 90))
            return BadRequest(ApiResponse<object>.Fail("Vĩ độ không hợp lệ. Phải trong khoảng -90 đến 90."));
        if (decimal.TryParse(request.Longitude, out var lonVal) && (lonVal < -180 || lonVal > 180))
            return BadRequest(ApiResponse<object>.Fail("Kinh độ không hợp lệ. Phải trong khoảng -180 đến 180."));
        var req = BuildUpdateRequest(request);
        var data = await _stationService.UpdateAsync(id, req, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontendDetail(data), "Cập nhật trạm sạc thành công."));
    }

    // PUT by string code e.g. "ST001" — frontend uses this
    [HttpPut("{code}")]
    public async Task<IActionResult> UpdateByCode(string code, [FromBody] FrontendStationRequest request, CancellationToken cancellationToken)
    {
        var station = await _stationRepo.GetByCodeAsync(code, cancellationToken);
        if (station is null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy trạm sạc."));
        var req = BuildUpdateRequest(request);
        var data = await _stationService.UpdateAsync(station.Id, req, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontendDetail(data), "Cập nhật trạm sạc thành công."));
    }

    [HttpPatch("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id, CancellationToken cancellationToken)
    {
        var data = await _stationService.DeactivateAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontendDetail(data), "Ngừng hoạt động trạm sạc thành công."));
    }

    [HttpPatch("{id:int}/activate")]
    public async Task<IActionResult> Activate(int id, CancellationToken cancellationToken)
    {
        var data = await _stationService.ActivateAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(ToFrontendDetail(data), "Kích hoạt trạm sạc thành công."));
    }

    // PATCH /stations/{code}/status — frontend sends { status: "Active"|"Inactive" }
    [HttpPatch("{code}/status")]
    public async Task<IActionResult> SetStatus(string code, [FromBody] SetStatusRequest? request, CancellationToken cancellationToken)
    {
        var station = await _stationRepo.GetByCodeAsync(code, cancellationToken);
        if (station is null) return NotFound(ApiResponse<object>.Fail($"Không tìm thấy trạm sạc: {code}"));

        var statusStr = request?.Status?.ToLower();
        StationDetailDto data;
        string msg;

        if (statusStr is "active")
        {
            data = await _stationService.ActivateAsync(station.Id, cancellationToken);
            msg = "Kích hoạt thành công.";
        }
        else if (statusStr is "inactive")
        {
            data = await _stationService.DeactivateAsync(station.Id, cancellationToken);
            msg = "Ngừng hoạt động thành công.";
        }
        else
        {
            // Toggle: if currently active → deactivate, else → activate
            var isCurrentlyActive = station.Status == EVCS.Domain.Enums.StationStatus.Active;
            data = isCurrentlyActive
                ? await _stationService.DeactivateAsync(station.Id, cancellationToken)
                : await _stationService.ActivateAsync(station.Id, cancellationToken);
            msg = isCurrentlyActive ? "Ngừng hoạt động thành công." : "Kích hoạt thành công.";
        }

        return Ok(ApiResponse<object>.Ok(ToFrontendDetail(data), msg));
    }

    // DELETE by numeric id
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _stationService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }, "Xóa trạm sạc thành công."));
    }

    // DELETE by string code — frontend uses this
    [HttpDelete("{code}")]
    public async Task<IActionResult> DeleteByCode(string code, CancellationToken cancellationToken)
    {
        var station = await _stationRepo.GetByCodeAsync(code, cancellationToken);
        if (station is null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy trạm sạc."));
        await _stationService.DeleteAsync(station.Id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }, "Xóa trạm sạc thành công."));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static UpdateStationRequest BuildUpdateRequest(FrontendStationRequest r) => new(
        Name: r.Name ?? "",
        Address: r.Address ?? "",
        Area: null,
        Latitude: decimal.TryParse(r.Latitude, out var lat) ? lat : null,
        Longitude: decimal.TryParse(r.Longitude, out var lon) ? lon : null,
        Status: ParseStationStatus(r.Status),
        OperatingHours: r.OperationTime);

    private static StationStatus ParseStationStatus(string? s) => s?.ToLower() switch
    {
        "inactive" => StationStatus.Inactive,
        "maintenance" => StationStatus.Maintenance,
        "error" => StationStatus.Error,
        _ => StationStatus.Active
    };

    private static string GenerateCode()
        => $"ST{DateTime.UtcNow:yyyyMMddHHmmss}";

    private static object ToFrontend(StationSummaryDto s) => new
    {
        id = s.Code,
        numericId = s.Id,
        name = s.Name,
        address = s.Address,
        area = s.Area ?? "",
        latitude = s.Latitude?.ToString() ?? "",
        longitude = s.Longitude?.ToString() ?? "",
        status = MapStatus(s.Status),
        operationTime = s.OperatingHours ?? "24/7",
        createdAt = s.CreatedAt.ToString("o"),
        poleCount = s.PoleCount,
        connectors = Array.Empty<object>() // populated on detail view
    };

    private static object ToFrontendDetail(StationDetailDto s) => new
    {
        id = s.Code,
        numericId = s.Id,
        name = s.Name,
        address = s.Address,
        area = s.Area ?? "",
        latitude = s.Latitude?.ToString() ?? "",
        longitude = s.Longitude?.ToString() ?? "",
        status = MapStatus(s.Status),
        operationTime = s.OperatingHours ?? "24/7",
        createdAt = s.CreatedAt.ToString("o"),
        updatedAt = s.UpdatedAt?.ToString("o"),
        connectors = s.Poles.Select(p => new
        {
            name = $"{p.Name} - {p.Code}",
            status = p.Status switch
            {
                PoleStatus.Available => "Available",
                PoleStatus.InUse => "In Use",
                PoleStatus.Fault => "Maintenance",
                _ => "Inactive"
            }
        }).ToArray()
    };

    private static string MapStatus(StationStatus s) => s switch
    {
        StationStatus.Active => "Active",
        StationStatus.Inactive => "Inactive",
        StationStatus.Maintenance => "Maintenance",
        StationStatus.Error => "Error",
        _ => "Inactive"
    };
}
