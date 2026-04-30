namespace EVCS.Domain.Enums;

/// <summary>
/// Trạng thái quản lý của Trụ sạc (Pole).
/// Đây là trạng thái bật/tắt do Admin/Manager điều khiển thủ công,
/// KHÔNG phải trạng thái vận hành chi tiết (available/in-use/fault).
/// UI hiện tại map Available/InUse → "Active", Inactive/Fault → "Inactive"
/// và chỉ cho phép toggle giữa Active và Inactive.
/// </summary>
public enum PoleStatus
{
    /// <summary>Trụ đang hoạt động bình thường (sẵn sàng hoặc đang sạc)</summary>
    Available,

    /// <summary>Trụ đang có phiên sạc đang diễn ra</summary>
    InUse,

    /// <summary>Trụ gặp sự cố kỹ thuật</summary>
    Fault,

    /// <summary>Trụ đã bị tắt bởi quản trị viên</summary>
    Inactive
}
