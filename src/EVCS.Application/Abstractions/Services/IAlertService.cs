using EVCS.Application.DTOs;

namespace EVCS.Application.Abstractions.Services;

public interface IAlertService
{
    Task<IReadOnlyCollection<AlertSummaryDto>> GetListAsync(AlertFilter filter, CancellationToken cancellationToken);
    Task<AlertSummaryDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<AlertSummaryDto> CreateAsync(CreateAlertRequest request, CancellationToken cancellationToken);
    Task<AlertSummaryDto> ProcessAsync(long id, ProcessAlertRequest request, CancellationToken cancellationToken);
}
