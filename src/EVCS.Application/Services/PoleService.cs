using EVCS.Application.Abstractions.Persistence;
using EVCS.Application.Abstractions.Services;
using EVCS.Application.Common;
using EVCS.Application.DTOs;
using EVCS.Domain.Entities;
using EVCS.Domain.Enums;

namespace EVCS.Application.Services;

public sealed class PoleService : IPoleService
{
    private readonly IPoleRepository _poleRepository;
    private readonly IStationRepository _stationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public PoleService(IPoleRepository poleRepository, IStationRepository stationRepository, IUnitOfWork unitOfWork)
    {
        _poleRepository = poleRepository;
        _stationRepository = stationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyCollection<PoleSummaryDto>> GetListAsync(PoleListQuery query, CancellationToken cancellationToken)
    {
        var poles = await _poleRepository.GetListAsync(query.StationId, query.Keyword, query.Status, cancellationToken);
        return poles.Select(Map).ToArray();
    }

    public async Task<PoleSummaryDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var pole = await _poleRepository.GetByIdAsync(id, includeChildren: true, cancellationToken)
            ?? throw new AppException("Pole not found.", 404);
        return Map(pole);
    }

    public async Task<PoleSummaryDto> CreateAsync(CreatePoleRequest request, CancellationToken cancellationToken)
    {
        ValidationGuard.AgainstNullOrWhiteSpace(request.Name, "Pole name is required.");
        ValidationGuard.AgainstNullOrWhiteSpace(request.Code, "Pole code is required.");

        var station = await _stationRepository.GetByIdAsync(request.StationId, includeChildren: false, cancellationToken)
            ?? throw new AppException("Station not found.", 404);

        var existed = await _poleRepository.ExistsByCodeAsync(request.Code.Trim(), null, cancellationToken);
        ValidationGuard.Against(existed, "Pole code already exists.");

        var pole = new Pole
        {
            StationId = station.Id,
            Name = request.Name.Trim(),
            Code = request.Code.Trim(),
            Model = request.Model?.Trim(),
            Manufacturer = request.Manufacturer?.Trim(),
            NumberOfPorts = request.NumberOfPorts > 0 ? request.NumberOfPorts : 1,
            Status = request.Status ?? PoleStatus.Available,
            InstalledAt = request.InstalledAt,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _poleRepository.AddAsync(pole, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(pole.Id, cancellationToken);
    }

    public async Task<PoleSummaryDto> UpdateAsync(int id, UpdatePoleRequest request, CancellationToken cancellationToken)
    {
        var pole = await _poleRepository.GetByIdAsync(id, includeChildren: false, cancellationToken)
            ?? throw new AppException("Pole not found.", 404);

        ValidationGuard.AgainstNullOrWhiteSpace(request.Name, "Pole name is required.");
        ValidationGuard.AgainstNullOrWhiteSpace(request.Code, "Pole code is required.");

        var station = await _stationRepository.GetByIdAsync(request.StationId, includeChildren: false, cancellationToken)
            ?? throw new AppException("Station not found.", 404);

        var existed = await _poleRepository.ExistsByCodeAsync(request.Code.Trim(), id, cancellationToken);
        ValidationGuard.Against(existed, "Pole code already exists.");

        pole.Name = request.Name.Trim();
        pole.Code = request.Code.Trim();
        pole.Model = request.Model?.Trim();
        pole.Manufacturer = request.Manufacturer?.Trim();
        pole.NumberOfPorts = request.NumberOfPorts > 0 ? request.NumberOfPorts : 1;
        pole.StationId = station.Id;
        pole.Status = request.Status;
        pole.InstalledAt = request.InstalledAt;
        pole.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var pole = await _poleRepository.GetByIdAsync(id, includeChildren: false, cancellationToken)
            ?? throw new AppException("Pole not found.", 404);
        _poleRepository.Remove(pole);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<PoleSummaryDto> DeactivateAsync(int id, CancellationToken cancellationToken)
    {
        var pole = await _poleRepository.GetByIdAsync(id, includeChildren: false, cancellationToken)
            ?? throw new AppException("Pole not found.", 404);
        pole.Status = PoleStatus.Inactive;
        pole.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<PoleSummaryDto> ActivateAsync(int id, CancellationToken cancellationToken)
    {
        var pole = await _poleRepository.GetByIdAsync(id, includeChildren: false, cancellationToken)
            ?? throw new AppException("Pole not found.", 404);
        pole.Status = PoleStatus.Available;
        pole.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    private static PoleSummaryDto Map(Pole p) => new(
        p.Id, p.StationId,
        p.Station?.Code ?? string.Empty,
        p.Station?.Name ?? string.Empty,
        p.Name, p.Code, p.Model, p.Manufacturer,
        p.NumberOfPorts, p.Status, p.InstalledAt,
        p.CreatedAt, p.UpdatedAt);
}
