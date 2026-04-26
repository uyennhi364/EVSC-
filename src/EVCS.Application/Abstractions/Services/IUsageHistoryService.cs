using EVCS.Application.DTOs;

namespace EVCS.Application.Abstractions.Services;

public interface IUsageHistoryService
{
    Task<IReadOnlyCollection<UsageHistorySummaryDto>> GetListAsync(UsageHistoryFilter filter, CancellationToken cancellationToken);
    Task<ExportFileDto> ExportCsvAsync(UsageHistoryFilter filter, CancellationToken cancellationToken);
}
