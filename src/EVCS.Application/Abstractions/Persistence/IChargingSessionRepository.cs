using EVCS.Application.DTOs;
using EVCS.Domain.Entities;

namespace EVCS.Application.Abstractions.Persistence;

public interface IChargingSessionRepository
{
    Task<List<ChargingSession>> GetListAsync(UsageHistoryFilter filter, CancellationToken cancellationToken);

    /// <summary>Returns true if the station has any charging session currently in progress.</summary>
    Task<bool> HasActiveSessionByStationIdAsync(int stationId, CancellationToken cancellationToken);
}
