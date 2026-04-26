using EVCS.Application.Abstractions.Persistence;
using EVCS.Domain.Entities;
using EVCS.Domain.Enums;
using EVCS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EVCS.Infrastructure.Repositories;

public sealed class StationRepository : IStationRepository
{
    private readonly AppDbContext _context;

    public StationRepository(AppDbContext context) => _context = context;

    public Task<List<Station>> GetListAsync(string? keyword, StationStatus? status, CancellationToken cancellationToken)
    {
        var query = _context.Stations.Include(x => x.Poles).AsQueryable();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            query = query.Where(x => x.Name.Contains(kw) || x.Address.Contains(kw) || x.Code.Contains(kw));
        }

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        return query.OrderBy(x => x.Code).ToListAsync(cancellationToken);
    }

    public Task<Station?> GetByIdAsync(int id, bool includeChildren, CancellationToken cancellationToken)
    {
        IQueryable<Station> query = _context.Stations;
        if (includeChildren)
            query = query.Include(x => x.Poles);
        return query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<Station?> GetByCodeAsync(string code, CancellationToken cancellationToken)
        => _context.Stations.FirstOrDefaultAsync(x => x.Code == code, cancellationToken);

    public async Task<string> GetNextCodeAsync(CancellationToken cancellationToken)
    {
        var codes = await _context.Stations
            .Select(s => s.Code)
            .ToListAsync(cancellationToken);

        var maxNum = codes
            .Select(c => { var m = System.Text.RegularExpressions.Regex.Match(c, @"^ST(\d+)$"); return m.Success ? int.Parse(m.Groups[1].Value) : 0; })
            .DefaultIfEmpty(0)
            .Max();

        return $"ST{(maxNum + 1):D3}";
    }

    public Task<bool> ExistsByNameAsync(string name, int? excludeId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLower();
        return _context.Stations.AnyAsync(
            x => x.Name.ToLower() == normalized && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }

    public Task AddAsync(Station station, CancellationToken cancellationToken)
        => _context.Stations.AddAsync(station, cancellationToken).AsTask();

    public void Remove(Station station) => _context.Stations.Remove(station);

    public Task<int> CountAsync(CancellationToken cancellationToken)
        => _context.Stations.CountAsync(cancellationToken);

    public Task<int> CountByStatusAsync(StationStatus status, CancellationToken cancellationToken)
        => _context.Stations.CountAsync(x => x.Status == status, cancellationToken);
}
