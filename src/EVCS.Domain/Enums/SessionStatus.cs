namespace EVCS.Domain.Enums;

/// <summary>
/// Trạng thái phiên sạc (ChargingSession).
/// Đây là trạng thái vận hành của từng phiên sạc, không liên quan đến
/// trạng thái quản lý Active/Inactive của Station hay Pole.
/// </summary>
public enum SessionStatus
{
    /// <summary>Phiên đang sạc (đang diễn ra)</summary>
    Charging,

    /// <summary>Phiên hoàn thành bình thường</summary>
    Completed,

    /// <summary>Phiên bị hủy bởi người dùng hoặc hệ thống</summary>
    Cancelled,

    /// <summary>Phiên thất bại do lỗi kỹ thuật</summary>
    Failed
}
