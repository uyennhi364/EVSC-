namespace EVCS.Api.Contracts;

/// <summary>Shared request models to avoid Swagger schema conflicts</summary>
public record SetStatusRequest(string? Status);
public record FrontendStationRequest(
    string? Name, string? Address, string? Latitude, string? Longitude,
    string? Status, string? OperationTime, object[]? Connectors);
public record FrontendPoleRequest(
    string? Id, string? Name, string? ActiveCode, string? Manufacturer,
    string? Model, string? StationId, string? InstalledAt, string? Status,
    string[]? Connectors);
