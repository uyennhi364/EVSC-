using EVCS.Application.Abstractions.Persistence;
using EVCS.Application.Abstractions.Services;
using EVCS.Application.Common;
using EVCS.Application.DTOs;
using EVCS.Domain.Entities;
using EVCS.Domain.Enums;

namespace EVCS.Application.Services;

public sealed class StationService : IStationService
{
    private readonly IStationRepository _stationRepository;
    private readonly IPoleRepository _poleRepository;
    private readonly IUnitOfWork _unitOfWork;

    public StationService(IStationRepository stationRepository, IPoleRepository poleRepository, IUnitOfWork unitOfWork)
    {
        _stationRepository = stationRepository;
        _poleRepository = poleRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyCollection<StationSummaryDto>> GetListAsync(StationListQuery query, CancellationToken cancellationToken)
    {
        var stations = await _stationRepository.GetListAsync(query.Keyword, query.Status, cancellationToken);
        return stations.Select(MapSummary).ToArray();
    }

    public async Task<StationDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var station = await _stationRepository.GetByIdAsync(id, includeChildren: true, cancellationToken)
            ?? throw new AppException("Station not found.", 404);
        return MapDetail(station);
    }

    public async Task<StationDetailDto> CreateAsync(CreateStationRequest request, CancellationToken cancellationToken)
    {
        ValidationGuard.AgainstNullOrWhiteSpace(request.Name, "Station name is required.");
        ValidationGuard.AgainstNullOrWhiteSpace(request.Code, "Station code is required.");
        ValidationGuard.AgainstNullOrWhiteSpace(request.Address, "Address is required.");

        var existed = await _stationRepository.ExistsByNameAsync(request.Name.Trim(), null, cancellationToken);
        ValidationGuard.Against(existed, "Station name already exists.");

        var station = new Station
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Address = request.Address.Trim(),
            Area = request.Area?.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Status = request.Status ?? StationStatus.Active,
            OperatingHours = request.OperatingHours?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _stationRepository.AddAsync(station, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(station.Id, cancellationToken);
    }

    public async Task<StationDetailDto> UpdateAsync(int id, UpdateStationRequest request, CancellationToken cancellationToken)
    {
        var station = await _stationRepository.GetByIdAsync(id, includeChildren: true, cancellationToken)
            ?? throw new AppException("Station not found.", 404);

        ValidationGuard.AgainstNullOrWhiteSpace(request.Name, "Station name is required.");
        ValidationGuard.AgainstNullOrWhiteSpace(request.Address, "Address is required.");

        var existed = await _stationRepository.ExistsByNameAsync(request.Name.Trim(), id, cancellationToken);
        ValidationGuard.Against(existed, "Station name already exists.");

        station.Name = request.Name.Trim();
        station.Address = request.Address.Trim();
        station.Area = request.Area?.Trim();
        station.Latitude = request.Latitude;
        station.Longitude = request.Longitude;
        station.Status = request.Status;
        station.OperatingHours = request.OperatingHours?.Trim();
        station.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var station = await _stationRepository.GetByIdAsync(id, includeChildren: false, cancellationToken)
            ?? throw new AppException("Station not found.", 404);

        if (station.Status == StationStatus.Active)
            throw new AppException("Cannot delete an active station. Please deactivate it first.", 400);

        var hasActivePole = await _poleRepository.ExistsActiveByStationIdAsync(id, cancellationToken);
        ValidationGuard.Against(hasActivePole, "Cannot delete a station that has active poles.");

        _stationRepository.Remove(station);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<StationDetailDto> DeactivateAsync(int id, CancellationToken cancellationToken)
    {
        var station = await _stationRepository.GetByIdAsync(id, includeChildren: false, cancellationToken)
            ?? throw new AppException("Station not found.", 404);

        station.Status = StationStatus.Inactive;
        station.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<StationDetailDto> ActivateAsync(int id, CancellationToken cancellationToken)
    {
        var station = await _stationRepository.GetByIdAsync(id, includeChildren: false, cancellationToken)
            ?? throw new AppException("Station not found.", 404);

        station.Status = StationStatus.Active;
        station.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<StationDashboardDto> GetDashboardAsync(CancellationToken cancellationToken)
    {
        var total = await _stationRepository.CountAsync(cancellationToken);
        var active = await _stationRepository.CountByStatusAsync(StationStatus.Active, cancellationToken);
        var inactive = await _stationRepository.CountByStatusAsync(StationStatus.Inactive, cancellationToken);
        var maintenance = await _stationRepository.CountByStatusAsync(StationStatus.Maintenance, cancellationToken);
        var error = await _stationRepository.CountByStatusAsync(StationStatus.Error, cancellationToken);
        return new StationDashboardDto(total, active, inactive, maintenance, error);
    }

    private static StationSummaryDto MapSummary(Station s) => new(
        s.Id, s.Code, s.Name, s.Address, s.Area, s.Latitude, s.Longitude,
        s.Status, s.OperatingHours, s.CreatedAt, s.Poles.Count);

    private static StationDetailDto MapDetail(Station s) => new(
        s.Id, s.Code, s.Name, s.Address, s.Area, s.Latitude, s.Longitude,
        s.Status, s.OperatingHours, s.CreatedAt, s.UpdatedAt,
        s.Poles.OrderBy(p => p.Id).Select(p => new PoleCompactDto(p.Id, p.Name, p.Code, p.Status)).ToArray());
}
