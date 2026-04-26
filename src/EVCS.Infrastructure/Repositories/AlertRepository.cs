using EVCS.Application.Abstractions.Persistence;
using EVCS.Application.DTOs;
using EVCS.Domain.Entities;
using EVCS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EVCS.Infrastructure.Repositories;

public sealed class AlertRepository : IAlertRepository
{
    private readonly AppDbContext _context;

    public AlertRepository(AppDbContext context) => _context = context;

    public Task<List<Alert>> GetListAsync(AlertFilter filter, CancellationToken cancellationToken)
    {
        var query = _context.Alerts
            .Include(x => x.Station)
            .Include(x => x.Pole)
            .AsQueryable();

        if (filter.StationId.HasValue)
            query = query.Where(x => x.StationId == filter.StationId.Value);

        if (filter.Status.HasValue)
            query = query.Where(x => x.Status == filter.Status.Value);

        if (filter.Severity.HasValue)
            query = query.Where(x => x.Severity == filter.Severity.Value);

        return query.OrderByDescending(x => x.OccurredAt).ToListAsync(cancellationToken);
    }

    public Task<Alert?> GetByIdAsync(int id, CancellationToken cancellationToken)
        => _context.Alerts
            .Include(x => x.Station)
            .Include(x => x.Pole)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task AddAsync(Alert alert, CancellationToken cancellationToken)
        => _context.Alerts.AddAsync(alert, cancellationToken).AsTask();
}
