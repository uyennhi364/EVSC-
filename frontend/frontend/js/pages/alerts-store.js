const ALERTS_STORAGE_KEY = "evc-alerts-data-v1";
const ALERTS_PREVIOUS_PAGE_KEY = "previousPage";
const ALERTS_HOME_PAGE = "station.html";

const ALERTS_API_BASE =
  typeof window !== "undefined" && window.EVCS_API_BASE ? String(window.EVCS_API_BASE).replace(/\/$/, "") : "";

/** @type {any[] | null} */
let apiAlertsCache = null;
let alertsFromApi = false;

async function fetchAlertsFromApiRequest() {
  const url = `${ALERTS_API_BASE}/alerts`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

/**
 * Tải cảnh báo từ backend. Trả về true nếu thành công.
 * Gọi trước getAlerts / getAlertById khi mở trang Alerts.
 */
async function refreshAlertsFromApi() {
  if (!ALERTS_API_BASE) {
    alertsFromApi = false;
    apiAlertsCache = null;
    return false;
  }
  try {
    const data = await fetchAlertsFromApiRequest();
    apiAlertsCache = data;
    alertsFromApi = true;
    return true;
  } catch (err) {
    console.error(err);
    alertsFromApi = false;
    apiAlertsCache = null;
    return false;
  }
}
const ALERT_TYPE_MIGRATIONS = {
  "Mat ket noi tram": "Connection Lost",
  "Qua nhiet bo sac": "Charger Overheating",
  "Loi cong sac": "Charging Port Error",
  "Dong dien bat thuong": "Abnormal Current",
  "Canh bao bao tri dinh ky": "Scheduled Maintenance Reminder"
};
const ALERT_LOG_MESSAGE_MIGRATIONS = {
  "He thong ghi nhan mat ket noi tu tram.": "System detected station connection loss.",
  "Canh bao duoc gui toi trung tam van hanh.": "Alert sent to the operations center.",
  "Hệ thống ghi nhận mất kết nối từ trạm.": "System detected station connection loss.",
  "Cảnh báo được gửi tới trung tâm vận hành.": "Alert sent to the operations center.",
  "Nhiet do bo sac vuot nguong an toan.": "Charger temperature exceeded the safety threshold.",
  "Nhiệt độ bộ sạc vượt ngưỡng an toàn.": "Charger temperature exceeded the safety threshold.",
  "Cong sac #2 tra ve ma loi E-24.": "Charging port #2 returned error code E-24.",
  "Cổng sạc #2 trả về mã lỗi E-24.": "Charging port #2 returned error code E-24.",
  "Canh bao dong dien bat thuong duoc tao.": "Abnormal current alert was created.",
  "Cảnh báo dòng điện bất thường được tạo.": "Abnormal current alert was created.",
  "Nguon dien da on dinh va canh bao da duoc dong.": "Power stabilized and the alert was resolved.",
  "Nguồn điện đã ổn định và cảnh báo đã được đóng.": "Power stabilized and the alert was resolved.",
  "Canh bao bao tri dinh ky duoc tao.": "Scheduled maintenance alert was created.",
  "Cảnh báo bảo trì định kỳ được tạo.": "Scheduled maintenance alert was created.",
  "Ky thuat vien da hoan tat kiem tra va dong canh bao.": "Technician completed inspection and closed the alert.",
  "Kỹ thuật viên đã hoàn tất kiểm tra và đóng cảnh báo.": "Technician completed inspection and closed the alert."
};
const ALERT_DESCRIPTION_MIGRATIONS = {
  "Tram khong gui heartbeat trong 5 phut gan nhat. Co the do mat mang hoac bo dieu khien ngoai tuyen.": "The station has not sent a heartbeat for the last 5 minutes. This may be caused by a network outage or offline controller.",
  "Trạm không gửi heartbeat trong 5 phút gần nhất. Có thể do mất mạng hoặc bộ điều khiển ngoại tuyến.": "The station has not sent a heartbeat for the last 5 minutes. This may be caused by a network outage or offline controller.",
  "Nhiet do bo sac vuot nguong an toan 85°C trong 3 lan do lien tiep.": "The charger temperature exceeded the 85°C safety threshold across 3 consecutive readings.",
  "Nhiệt độ bộ sạc vượt ngưỡng an toàn 85°C trong 3 lần đo liên tiếp.": "The charger temperature exceeded the 85°C safety threshold across 3 consecutive readings.",
  "Cong sac #2 tra ve ma loi E-24 ngay khi bat dau phien sac moi.": "Charging port #2 returned error code E-24 at the start of a new charging session.",
  "Cổng sạc #2 trả về mã lỗi E-24 ngay khi bắt đầu phiên sạc mới.": "Charging port #2 returned error code E-24 at the start of a new charging session.",
  "Dong dien dau vao dao dong bat thuong trong 10 phut va tu phuc hoi sau khi nguon dien on dinh.": "Input current fluctuated abnormally for 10 minutes and recovered automatically after the power stabilized.",
  "Dòng điện đầu vào dao động bất thường trong 10 phút và tự phục hồi sau khi nguồn điện ổn định.": "Input current fluctuated abnormally for 10 minutes and recovered automatically after the power stabilized.",
  "Tram da dat moc bao tri dinh ky dua tren tong so gio van hanh duoc cau hinh.": "The station has reached its scheduled maintenance threshold based on configured operating hours.",
  "Trạm đã đạt mốc bảo trì định kỳ dựa trên tổng số giờ vận hành được cấu hình.": "The station has reached its scheduled maintenance threshold based on configured operating hours."
};
const ALERT_SUGGESTION_MIGRATIONS = {
  "Kiem tra ket noi internet cua tram, khoi dong lai bo gateway va xac minh heartbeat tren dashboard ky thuat.": "Check the station network connection, restart the gateway if needed, and verify heartbeat recovery from the operations dashboard.",
  "Kiểm tra kết nối internet của trạm, khởi động lại bộ gateway và xác minh heartbeat trên dashboard kỹ thuật.": "Check the station network connection, restart the gateway if needed, and verify heartbeat recovery from the operations dashboard.",
  "Tam dung tram, kiem tra quat tan nhiet, ve sinh luong gio va lien he bao tri neu nhiet do khong giam.": "Pause the station, inspect the cooling fan, clean the ventilation path, and contact maintenance if the temperature does not drop.",
  "Tạm dừng trạm, kiểm tra quạt tản nhiệt, vệ sinh luồng gió và liên hệ bảo trì nếu nhiệt độ không giảm.": "Pause the station, inspect the cooling fan, clean the ventilation path, and contact maintenance if the temperature does not drop.",
  "Kiem tra dau noi, tinh trang cap sac va reset cong sac truoc khi mo lai cho khach hang.": "Inspect the connector, cable condition, and reset the charging port before reopening it for customers.",
  "Kiểm tra đầu nối, tình trạng cáp sạc và reset cổng sạc trước khi mở lại cho khách hàng.": "Inspect the connector, cable condition, and reset the charging port before reopening it for customers.",
  "Tiep tuc theo doi nguon cap va kiem tra bo on ap neu tinh trang lap lai.": "Continue monitoring the incoming supply and inspect the stabilizer if the condition repeats.",
  "Tiếp tục theo dõi nguồn cấp và kiểm tra bộ ổn áp nếu tình trạng lặp lại.": "Continue monitoring the incoming supply and inspect the stabilizer if the condition repeats.",
  "Len lich kiem tra tong quat, ve sinh phan cung va cap nhat firmware neu can.": "Plan a general inspection, clean the hardware, and update firmware if required.",
  "Lên lịch kiểm tra tổng quát, vệ sinh phần cứng và cập nhật firmware nếu cần.": "Plan a general inspection, clean the hardware, and update firmware if required."
};

function normalizeVietnameseText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildNormalizedLookup(map) {
  return Object.fromEntries(
    Object.entries(map).map(([key, value]) => [normalizeVietnameseText(key), value])
  );
}

const NORMALIZED_ALERT_DESCRIPTION_MIGRATIONS = buildNormalizedLookup(ALERT_DESCRIPTION_MIGRATIONS);
const NORMALIZED_ALERT_SUGGESTION_MIGRATIONS = buildNormalizedLookup(ALERT_SUGGESTION_MIGRATIONS);
const NORMALIZED_ALERT_LOG_MESSAGE_MIGRATIONS = buildNormalizedLookup(ALERT_LOG_MESSAGE_MIGRATIONS);

function translateLegacyAlertText(value, directMap, normalizedMap) {
  if (!value) return value;
  return directMap[value] || normalizedMap[normalizeVietnameseText(value)] || value;
}

const DEFAULT_ALERTS = [
  {
    id: "ALT-1001",
    type: "Connection Lost",
    stationName: "Station 1",
    occurredAt: "2026-04-08T08:15:00",
    severity: "critical",
    status: "open",
    description: "The station has not sent a heartbeat for the last 5 minutes. This may be caused by a network outage or offline controller.",
    suggestion: "Check the station network connection, restart the gateway if needed, and verify heartbeat recovery from the operations dashboard.",
    logs: [
      { time: "2026-04-08T08:15:00", message: "System detected a lost connection from the station." },
      { time: "2026-04-08T08:19:00", message: "Alert was forwarded to the operations team." }
    ]
  },
  {
    id: "ALT-1002",
    type: "Charger Overheating",
    stationName: "Station 3",
    occurredAt: "2026-04-08T09:40:00",
    severity: "critical",
    status: "open",
    description: "The charger temperature exceeded the 85°C safety threshold across 3 consecutive readings.",
    suggestion: "Pause the station, inspect the cooling fan, clean the ventilation path, and contact maintenance if the temperature does not drop.",
    logs: [
      { time: "2026-04-08T09:40:00", message: "Temperature sensor reported a threshold breach." }
    ]
  },
  {
    id: "ALT-1003",
    type: "Charging Port Error",
    stationName: "Station 2",
    occurredAt: "2026-04-08T10:05:00",
    severity: "medium",
    status: "open",
    description: "Charging port #2 returned error code E-24 at the start of a new charging session.",
    suggestion: "Inspect the connector, cable condition, and reset the charging port before reopening it for customers.",
    logs: [
      { time: "2026-04-08T10:05:00", message: "Charging port #2 reported error E-24." }
    ]
  },
  {
    id: "ALT-1004",
    type: "Abnormal Current",
    stationName: "Station 4",
    occurredAt: "2026-04-07T15:20:00",
    severity: "medium",
    status: "resolved",
    description: "Input current fluctuated abnormally for 10 minutes and recovered automatically after the power stabilized.",
    suggestion: "Continue monitoring the incoming supply and inspect the stabilizer if the condition repeats.",
    logs: [
      { time: "2026-04-07T15:20:00", message: "Abnormal current alert was created." },
      { time: "2026-04-07T16:05:00", message: "Power stabilized and the alert was resolved." }
    ]
  },
  {
    id: "ALT-1005",
    type: "Scheduled Maintenance Reminder",
    stationName: "Station 5",
    occurredAt: "2026-04-06T11:30:00",
    severity: "low",
    status: "resolved",
    description: "The station has reached its scheduled maintenance threshold based on configured operating hours.",
    suggestion: "Plan a general inspection, clean the hardware, and update firmware if required.",
    logs: [
      { time: "2026-04-06T11:30:00", message: "Scheduled maintenance alert was created." },
      { time: "2026-04-06T14:10:00", message: "Technician completed inspection and closed the alert." }
    ]
  }
];

function seedAlertsIfNeeded() {
  const existing = localStorage.getItem(ALERTS_STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(DEFAULT_ALERTS));
    return;
  }

  try {
    const parsed = JSON.parse(existing);
    const migrated = migrateAlerts(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(migrated));
    }
  } catch (error) {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(DEFAULT_ALERTS));
  }
}

function getAlerts() {
  if (alertsFromApi && Array.isArray(apiAlertsCache)) {
    return migrateAlerts(apiAlertsCache);
  }

  seedAlertsIfNeeded();
  try {
    const alerts = JSON.parse(localStorage.getItem(ALERTS_STORAGE_KEY) || "[]");
    const migrated = migrateAlerts(alerts);
    if (JSON.stringify(alerts) !== JSON.stringify(migrated)) {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch (error) {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(DEFAULT_ALERTS));
    return [...DEFAULT_ALERTS];
  }
}

function migrateAlerts(alerts) {
  if (!Array.isArray(alerts)) return [...DEFAULT_ALERTS];
  return alerts.map((alert) => ({
    ...alert,
    type: ALERT_TYPE_MIGRATIONS[alert.type] || alert.type,
    description: translateLegacyAlertText(
      alert.description,
      ALERT_DESCRIPTION_MIGRATIONS,
      NORMALIZED_ALERT_DESCRIPTION_MIGRATIONS
    ),
    suggestion: translateLegacyAlertText(
      alert.suggestion,
      ALERT_SUGGESTION_MIGRATIONS,
      NORMALIZED_ALERT_SUGGESTION_MIGRATIONS
    ),
    logs: Array.isArray(alert.logs)
      ? alert.logs.map((log) => ({
          ...log,
          message: translateLegacyAlertText(
            log.message,
            ALERT_LOG_MESSAGE_MIGRATIONS,
            NORMALIZED_ALERT_LOG_MESSAGE_MIGRATIONS
          )
        }))
      : []
  }));
}

function saveAlerts(alerts) {
  if (alertsFromApi) return;
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

function getAlertById(alertId) {
  return getAlerts().find((alert) => alert.id === alertId) || null;
}

function updateAlert(alertId, updater) {
  if (alertsFromApi && Array.isArray(apiAlertsCache)) {
    const nextAlerts = apiAlertsCache.map((alert) => {
      if (alert.id !== alertId) return alert;
      return updater({ ...alert });
    });
    apiAlertsCache = nextAlerts;
    return nextAlerts.find((alert) => alert.id === alertId) || null;
  }

  const alerts = getAlerts();
  const nextAlerts = alerts.map((alert) => {
    if (alert.id !== alertId) return alert;
    return updater({ ...alert });
  });
  saveAlerts(nextAlerts);
  return nextAlerts.find((alert) => alert.id === alertId) || null;
}

function appendAlertLog(alertId, message) {
  return updateAlert(alertId, (alert) => {
    const nextLogs = Array.isArray(alert.logs) ? [...alert.logs] : [];
    nextLogs.unshift({
      time: new Date().toISOString(),
      message
    });
    alert.logs = nextLogs;
    return alert;
  });
}

function getSeverityMeta(severity) {
  switch (severity) {
    case "critical":
      return {
        label: "Critical",
        cardClass: "bg-rose-50 text-rose-700",
        tableClass: "bg-rose-100 text-rose-700"
      };
    case "high":
      return {
        label: "High",
        cardClass: "bg-rose-50 text-rose-700",
        tableClass: "bg-rose-100 text-rose-700"
      };
    case "medium":
      return {
        label: "Medium",
        cardClass: "bg-amber-50 text-amber-700",
        tableClass: "bg-amber-100 text-amber-700"
      };
    default:
      return {
        label: "Low",
        cardClass: "bg-slate-100 text-slate-700",
        tableClass: "bg-slate-100 text-slate-700"
      };
  }
}

function getStatusMeta(status) {
  return status === "resolved"
    ? {
        label: "Resolved",
        className: "bg-emerald-100 text-emerald-700"
      }
    : {
        label: "Unresolved",
        className: "bg-slate-200 text-slate-700"
      };
}

function formatAlertDateTime(value) {
  const date = new Date(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getOpenAlertsCount() {
  return getAlerts().filter((alert) => alert.status === "open").length;
}

function savePreviousPage(url = window.location.href) {
  try {
    sessionStorage.setItem(ALERTS_PREVIOUS_PAGE_KEY, url);
  } catch (error) {
    // Ignore storage errors and let the caller fall back.
  }
}

function isAlertPage(url) {
  const value = String(url || "");
  return value.includes("alerts.html") || value.includes("alert-detail.html");
}

function getCurrentPageName() {
  try {
    const pathname = new URL(window.location.href).pathname;
    const file = pathname.split("/").pop();
    return file || "station.html";
  } catch {
    return "station.html";
  }
}

function getPreviousPage(defaultPage = "poles.html") {
  try {
    const saved = sessionStorage.getItem(ALERTS_PREVIOUS_PAGE_KEY) || defaultPage;
    // Never route back to alert pages to avoid loops/detail bounce.
    if (isAlertPage(saved)) {
      return ALERTS_HOME_PAGE;
    }
    return saved;
  } catch (error) {
    return ALERTS_HOME_PAGE;
  }
}

function openAlertsPage() {
  // Keep last non-alert module page (station/poles/monitor/history).
  const currentPage = getCurrentPageName();
  if (!isAlertPage(currentPage)) {
    savePreviousPage(currentPage);
  }
  window.location.href = "alerts.html";
}
