using EVCS.Application.Abstractions.Persistence;
using EVCS.Domain.Entities;
using EVCS.Domain.Enums;

namespace EVCS.Infrastructure.Repositories;

// ChargeType table does not exist in the database schema.
// This stub keeps the interface contract satisfied.
public sealed class ChargeTypeRepository : IChargeTypeRepository
{
    public Task<List<ChargeType>> GetListAsync(string? keyword, EquipmentStatus? status, CancellationToken cancellationToken)
        => Task.FromResult(new List<ChargeType>());

    public Task<ChargeType?> GetByIdAsync(int id, CancellationToken cancellationToken)
        => Task.FromResult<ChargeType?>(null);

    public Task<bool> ExistsByCodeAsync(string code, int? excludeId, CancellationToken cancellationToken)
        => Task.FromResult(false);

    public Task<bool> ExistsByNameAsync(string name, int? excludeId, CancellationToken cancellationToken)
        => Task.FromResult(false);

    public Task<bool> IsInUseAsync(int id, CancellationToken cancellationToken)
        => Task.FromResult(false);

    public Task AddAsync(ChargeType chargeType, CancellationToken cancellationToken)
        => Task.CompletedTask;

    public void Remove(ChargeType chargeType) { }
}
