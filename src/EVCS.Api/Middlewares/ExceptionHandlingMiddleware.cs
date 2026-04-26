using System.Text.Json;
using EVCS.Api.Contracts;
using EVCS.Application.Common;

namespace EVCS.Api.Middlewares;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            await WriteErrorAsync(context, ex.StatusCode, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi không mong muốn khi xử lý yêu cầu.");
            await WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex.Message);
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, int statusCode, string message)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var payload = JsonSerializer.Serialize(ApiResponse<object>.Fail(message));
        await context.Response.WriteAsync(payload);
    }
}
