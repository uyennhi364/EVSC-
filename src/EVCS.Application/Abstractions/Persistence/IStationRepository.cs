using EVCS.Domain.Entities;
using EVCS.Domain.Enums;

namespace EVCS.Application.Abstractions.Persistence;

public interface IStationRepository
{
    Task<List<Station>> GetListAsync(string? keyword, StationStatus? status, CancellationToken cancellationToken);
    Task<Station?> GetByIdAsync(int id, bool includeChildren, CancellationToken cancellationToken);
    Task<Station?> GetByCodeAsync(string code, CancellationToken cancellationToken);
    Task<string> GetNextCodeAsync(CancellationToken cancellationToken);
    Task<bool> ExistsByNameAsync(string name, int? excludeId, CancellationToken cancellationToken);
    Task AddAsync(Station station, CancellationToken cancellationToken);
    void Remove(Station station);
    Task<int> CountAsync(CancellationToken cancellationToken);
    Task<int> CountByStatusAsync(StationStatus status, CancellationToken cancellationToken);
}
