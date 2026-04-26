namespace EVCS.Api.Contracts;

public record ApiResponse<T>(bool Success, string Message, T? Data, object? Errors)
{
    public static ApiResponse<T> Ok(T data, string message = "Thành công.")
        => new(true, message, data, null);

    public static ApiResponse<T> Fail(string message, object? errors = null)
        => new(false, message, default, errors);
}
