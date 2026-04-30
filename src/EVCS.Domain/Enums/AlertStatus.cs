namespace EVCS.Domain.Enums;

/// <summary>
/// Trạng thái xử lý cảnh báo (Alert).
/// Phản ánh quy trình xử lý sự cố từ khi phát sinh đến khi giải quyết xong.
/// </summary>
public enum AlertStatus
{
    /// <summary>Cảnh báo mới, chưa có ai xử lý</summary>
    Open,

    /// <summary>Đang được xử lý bởi kỹ thuật viên</summary>
    InProgress,

    /// <summary>Đã xử lý xong, đóng cảnh báo</summary>
    Resolved
}
