using EVCS.Application.DTOs;
using EVCS.Domain.Entities;

namespace EVCS.Application.Abstractions.Persistence;

public interface IAlertRepository
{
    Task<List<Alert>> GetListAsync(AlertFilter filter, CancellationToken cancellationToken);
    Task<Alert?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task AddAsync(Alert alert, CancellationToken cancellationToken);
}
