using EVCS.Application.Abstractions.Persistence;
using EVCS.Domain.Entities;
using EVCS.Domain.Enums;
using EVCS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EVCS.Infrastructure.Repositories;

public sealed class PoleRepository : IPoleRepository
{
    private readonly AppDbContext _context;

    public PoleRepository(AppDbContext context) => _context = context;

    public Task<List<Pole>> GetListAsync(int? stationId, string? keyword, PoleStatus? status, CancellationToken cancellationToken)
    {
        var query = _context.Poles.Include(x => x.Station).AsQueryable();

        if (stationId.HasValue)
            query = query.Where(x => x.StationId == stationId.Value);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            query = query.Where(x => x.Name.Contains(kw) || x.Code.Contains(kw));
        }

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        return query.OrderBy(x => x.Code).ToListAsync(cancellationToken);
    }

    public Task<Pole?> GetByIdAsync(int id, bool includeChildren, CancellationToken cancellationToken)
    {
        IQueryable<Pole> query = _context.Poles;
        if (includeChildren)
            query = query.Include(x => x.Station);
        return query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<Pole?> GetByCodeAsync(string code, CancellationToken cancellationToken)
        => _context.Poles.FirstOrDefaultAsync(x => x.Code == code, cancellationToken);

    public async Task<string> GetNextCodeAsync(CancellationToken cancellationToken)
    {
        var codes = await _context.Poles.Select(p => p.Code).ToListAsync(cancellationToken);
        var maxNum = codes
            .Select(c => { var m = System.Text.RegularExpressions.Regex.Match(c, @"^PL(\d+)$"); return m.Success ? int.Parse(m.Groups[1].Value) : 0; })
            .DefaultIfEmpty(0)
            .Max();
        return $"PL{(maxNum + 1):D3}";
    }

    public Task<bool> ExistsByCodeAsync(string code, int? excludeId, CancellationToken cancellationToken)
    {
        var normalized = code.Trim().ToLower();
        return _context.Poles.AnyAsync(
            x => x.Code.ToLower() == normalized && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }

    public Task<bool> ExistsActiveByStationIdAsync(int stationId, CancellationToken cancellationToken)
        => _context.Poles.AnyAsync(
            x => x.StationId == stationId && x.Status != PoleStatus.Inactive,
            cancellationToken);

    public Task AddAsync(Pole pole, CancellationToken cancellationToken)
        => _context.Poles.AddAsync(pole, cancellationToken).AsTask();

    public void Remove(Pole pole) => _context.Poles.Remove(pole);
}
