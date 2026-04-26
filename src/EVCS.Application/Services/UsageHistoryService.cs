using System.Globalization;
using System.Text;
using EVCS.Application.Abstractions.Persistence;
using EVCS.Application.Abstractions.Services;
using EVCS.Application.DTOs;

namespace EVCS.Application.Services;

public sealed class UsageHistoryService : IUsageHistoryService
{
    private readonly IChargingSessionRepository _repo;

    public UsageHistoryService(IChargingSessionRepository repo) => _repo = repo;

    public async Task<IReadOnlyCollection<UsageHistorySummaryDto>> GetListAsync(UsageHistoryFilter filter, CancellationToken cancellationToken)
    {
        var sessions = await _repo.GetListAsync(filter, cancellationToken);
        return sessions.Select(s => new UsageHistorySummaryDto(
            s.Id,
            s.StationId,
            s.Station?.Code ?? string.Empty,
            s.Station?.Name ?? string.Empty,
            s.PoleId,
            s.Pole?.Code,
            s.StartTime,
            s.EndTime,
            s.EnergyKwh,
            s.DurationMinutes,
            s.Cost,
            s.Status)).ToArray();
    }

    public async Task<ExportFileDto> ExportCsvAsync(UsageHistoryFilter filter, CancellationToken cancellationToken)
    {
        var rows = await GetListAsync(filter, cancellationToken);
        var sb = new StringBuilder();
        sb.AppendLine("SessionId;Station;Pole;StartTime;EndTime;EnergyKwh;DurationMinutes;Cost;Status");
        foreach (var r in rows)
        {
            sb.Append(r.Id).Append(';')
              .Append(r.StationName.Replace(';', ',')).Append(';')
              .Append(r.PoleCode?.Replace(';', ',')).Append(';')
              .Append(r.StartTime.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)).Append(';')
              .Append(r.EndTime?.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)).Append(';')
              .Append(r.EnergyKwh.ToString(CultureInfo.InvariantCulture)).Append(';')
              .Append(r.DurationMinutes).Append(';')
              .Append(r.Cost.ToString(CultureInfo.InvariantCulture)).Append(';')
              .Append(r.Status).AppendLine();
        }
        var utf8Bom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        return new ExportFileDto($"lich-su-sac-{DateTime.Now:yyyyMMddHHmmss}.csv", "text/csv", utf8Bom.GetBytes(sb.ToString()));
    }
}
