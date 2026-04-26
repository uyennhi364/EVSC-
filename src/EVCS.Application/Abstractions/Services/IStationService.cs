using EVCS.Application.DTOs;

namespace EVCS.Application.Abstractions.Services;

public interface IStationService
{
    Task<IReadOnlyCollection<StationSummaryDto>> GetListAsync(StationListQuery query, CancellationToken cancellationToken);
    Task<StationDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<StationDetailDto> CreateAsync(CreateStationRequest request, CancellationToken cancellationToken);
    Task<StationDetailDto> UpdateAsync(int id, UpdateStationRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(int id, CancellationToken cancellationToken);
    Task<StationDetailDto> DeactivateAsync(int id, CancellationToken cancellationToken);
    Task<StationDetailDto> ActivateAsync(int id, CancellationToken cancellationToken);
    Task<StationDashboardDto> GetDashboardAsync(CancellationToken cancellationToken);
}
