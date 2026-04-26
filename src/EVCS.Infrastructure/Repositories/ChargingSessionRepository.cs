using EVCS.Application.Abstractions.Persistence;
using EVCS.Application.DTOs;
using EVCS.Domain.Entities;
using EVCS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EVCS.Infrastructure.Repositories;

public sealed class ChargingSessionRepository : IChargingSessionRepository
{
    private readonly AppDbContext _context;

    public ChargingSessionRepository(AppDbContext context) => _context = context;

    public Task<List<ChargingSession>> GetListAsync(UsageHistoryFilter filter, CancellationToken cancellationToken)
    {
        var query = _context.ChargingSessions
            .Include(x => x.Station)
            .Include(x => x.Pole)
            .AsQueryable();

        if (filter.FromDate.HasValue)
            query = query.Where(x => x.StartTime >= filter.FromDate.Value);

        if (filter.ToDate.HasValue)
            query = query.Where(x => x.StartTime <= filter.ToDate.Value);

        if (filter.StationId.HasValue)
            query = query.Where(x => x.StationId == filter.StationId.Value);

        if (filter.PoleId.HasValue)
            query = query.Where(x => x.PoleId == filter.PoleId.Value);

        if (filter.Status.HasValue)
            query = query.Where(x => x.Status == filter.Status.Value);

        return query.OrderByDescending(x => x.StartTime).ToListAsync(cancellationToken);
    }
}
