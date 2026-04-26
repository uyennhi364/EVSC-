window.CommonUtils = {
  formatDateTime(isoDate) {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleString("vi-VN", {
      hour12: false
    });
  },

  /** Ngày DD/MM/YYYY + giờ HH:MM AM/PM (hai dòng) */
  formatCreatedAtParts(isoDate) {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return { dateLine: "N/A", timeLine: "" };
    }

    const dateLine = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    const timeLine = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    return { dateLine, timeLine };
  },

  createStatusBadge(status) {
    if (!status) return "Không xác định";
    return status;
  }
};
