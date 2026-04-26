using EVCS.Application.DTOs;

namespace EVCS.Application.Abstractions.Services;

public interface IPoleService
{
    Task<IReadOnlyCollection<PoleSummaryDto>> GetListAsync(PoleListQuery query, CancellationToken cancellationToken);
    Task<PoleSummaryDto> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<PoleSummaryDto> CreateAsync(CreatePoleRequest request, CancellationToken cancellationToken);
    Task<PoleSummaryDto> UpdateAsync(int id, UpdatePoleRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(int id, CancellationToken cancellationToken);
    Task<PoleSummaryDto> DeactivateAsync(int id, CancellationToken cancellationToken);
    Task<PoleSummaryDto> ActivateAsync(int id, CancellationToken cancellationToken);
}
