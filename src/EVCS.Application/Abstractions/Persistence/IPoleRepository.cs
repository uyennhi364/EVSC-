using EVCS.Domain.Entities;
using EVCS.Domain.Enums;

namespace EVCS.Application.Abstractions.Persistence;

public interface IPoleRepository
{
    Task<List<Pole>> GetListAsync(int? stationId, string? keyword, PoleStatus? status, CancellationToken cancellationToken);
    Task<Pole?> GetByIdAsync(int id, bool includeChildren, CancellationToken cancellationToken);
    Task<Pole?> GetByCodeAsync(string code, CancellationToken cancellationToken);
    Task<string> GetNextCodeAsync(CancellationToken cancellationToken);
    Task<bool> ExistsByCodeAsync(string code, int? excludeId, CancellationToken cancellationToken);
    Task<bool> ExistsActiveByStationIdAsync(int stationId, CancellationToken cancellationToken);
    Task AddAsync(Pole pole, CancellationToken cancellationToken);
    void Remove(Pole pole);
}
