using EVCS.Api.Middlewares;
using EVCS.Application;
using EVCS.Infrastructure;
using System.Text.Json.Serialization;

// Fix: allow Npgsql to accept Local/Unspecified DateTime
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

app.UseCors();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseAuthorization();

// Serve frontend static files
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

// Fallback: serve station.html for root
app.MapGet("/", () => Results.Redirect("/station.html"));

app.Run();
