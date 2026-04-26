namespace EVCS.Infrastructure.Persistence;

public static class DbInitializer
{
    // Database is seeded via database/EVCS.sql script.
    // No auto-seed needed.
    public static Task SeedAsync(AppDbContext context, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
