using EVCS.Domain.Entities;
using EVCS.Domain.Enums;

namespace EVCS.Application.Abstractions.Persistence;

public interface IChargeTypeRepository
{
    Task<List<ChargeType>> GetListAsync(string? keyword, EquipmentStatus? status, CancellationToken cancellationToken);
    Task<ChargeType?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<bool> ExistsByCodeAsync(string code, int? excludeId, CancellationToken cancellationToken);
    Task<bool> ExistsByNameAsync(string name, int? excludeId, CancellationToken cancellationToken);
    Task<bool> IsInUseAsync(int id, CancellationToken cancellationToken);
    Task AddAsync(ChargeType chargeType, CancellationToken cancellationToken);
    void Remove(ChargeType chargeType);
}
