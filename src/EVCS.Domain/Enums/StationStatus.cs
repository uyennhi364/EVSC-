namespace EVCS.Domain.Enums;

/// <summary>
/// Trạng thái quản lý của Trạm sạc (Station).
/// Đây là trạng thái bật/tắt do Admin/Manager điều khiển thủ công,
/// KHÔNG phải trạng thái vận hành chi tiết (online/offline/charging).
/// UI hiện tại chỉ sử dụng Active và Inactive thông qua nút toggle.
/// </summary>
public enum StationStatus
{
    /// <summary>Trạm đang hoạt động, cho phép sạc</summary>
    Active,

    /// <summary>Trạm đã bị tắt, không cho phép sạc</summary>
    Inactive,

    // Các giá trị dưới đây được giữ lại cho tương thích dữ liệu cũ,
    // không được sử dụng trong UI hiện tại.
    Maintenance,
    Error
}
