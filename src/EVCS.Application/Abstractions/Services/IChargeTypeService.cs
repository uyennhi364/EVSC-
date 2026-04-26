using EVCS.Application.DTOs;

namespace EVCS.Application.Abstractions.Services;

public interface IChargeTypeService
{
    Task<IReadOnlyCollection<ChargeTypeSummaryDto>> GetListAsync(ChargeTypeListQuery query, CancellationToken cancellationToken);
    Task<ChargeTypeDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<ChargeTypeDetailDto> CreateAsync(CreateChargeTypeRequest request, CancellationToken cancellationToken);
    Task<ChargeTypeDetailDto> UpdateAsync(int id, UpdateChargeTypeRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}
