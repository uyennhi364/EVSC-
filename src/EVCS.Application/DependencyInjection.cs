using EVCS.Application.Abstractions.Services;
using EVCS.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace EVCS.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IStationService, StationService>();
        services.AddScoped<IPoleService, PoleService>();
        services.AddScoped<IUsageHistoryService, UsageHistoryService>();
        services.AddScoped<IAlertService, AlertService>();
        return services;
    }
}
