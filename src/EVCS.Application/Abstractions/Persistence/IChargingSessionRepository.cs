using EVCS.Application.DTOs;
using EVCS.Domain.Entities;

namespace EVCS.Application.Abstractions.Persistence;

public interface IChargingSessionRepository
{
    Task<List<ChargingSession>> GetListAsync(UsageHistoryFilter filter, CancellationToken cancellationToken);
}
