namespace EVCS.Application.Common;

public static class ValidationGuard
{
    public static void AgainstNullOrWhiteSpace(string? value, string message)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new AppException(message);
        }
    }

    public static void AgainstOutOfRange(decimal value, decimal min, decimal max, string message)
    {
        if (value < min || value > max)
        {
            throw new AppException(message);
        }
    }

    public static void Against(bool condition, string message)
    {
        if (condition)
        {
            throw new AppException(message);
        }
    }
}
