const API_BASE =
  typeof window !== "undefined" && window.EVCS_API_BASE ? String(window.EVCS_API_BASE).replace(/\/$/, "") : "";

const STORAGE_KEY = "evcStations.v1";

const DEFAULT_STATIONS = [
  { id: "ST001", name: "Station 1" },
  { id: "ST002", name: "Station 2" },
  { id: "ST003", name: "Station 3" },
];

function loadStationsFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_STATIONS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_STATIONS];
    return parsed;
  } catch {
    return [...DEFAULT_STATIONS];
  }
}

async function apiJson(path, options = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const json = await response.json();
      if (json?.message) message = json.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function dayKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

let stations = loadStationsFromStorage();
let allHistorySessions = [];
let filteredHistorySessions = [];
let currentHistorySession = null;

const historyDatePickerState = {
  view: new Date(),
  working: "",
  activeField: "",
};

const els = {
  notifToggle: document.getElementById("notifToggle"),
  notifBadge: document.querySelector("#notifToggle .bell-badge"),
  historyDateFrom: document.getElementById("historyDateFrom"),
  historyDateTo: document.getElementById("historyDateTo"),
  historyDateError: document.getElementById("historyDateError"),
  historyResetFilters: document.getElementById("historyResetFilters"),
  historyDateFromTrigger: document.getElementById("historyDateFromTrigger"),
  historyDateFromText: document.getElementById("historyDateFromText"),
  historyDateToTrigger: document.getElementById("historyDateToTrigger"),
  historyDateToText: document.getElementById("historyDateToText"),
  historyStationFilter: document.getElementById("historyStationFilter"),
  historyConnectorFilter: document.getElementById("historyConnectorFilter"),
  historyStatusFilter: document.getElementById("historyStatusFilter"),
  historyChartMode: document.getElementById("historyChartMode"),
  historyChart: document.getElementById("historyChart"),
  historyTableBody: document.getElementById("historyTableBody"),
  historyEmptyState: document.getElementById("historyEmptyState"),
  historyResultCount: document.getElementById("historyResultCount"),
  historyMetricSessions: document.getElementById("historyMetricSessions"),
  historyMetricEnergy: document.getElementById("historyMetricEnergy"),
  historyMetricDuration: document.getElementById("historyMetricDuration"),
  historyExportFeedback: document.getElementById("historyExportFeedback"),
  historyExportMenu: document.getElementById("historyExportMenu"),
  historyExportTrigger: document.getElementById("historyExportTrigger"),
  historyDatePopover: document.getElementById("historyDatePopover"),
  historyDateTitle: document.getElementById("historyDateTitle"),
  historyDateGrid: document.getElementById("historyDateGrid"),
  historyDatePrevMonth: document.getElementById("historyDatePrevMonth"),
  historyDateNextMonth: document.getElementById("historyDateNextMonth"),
  historyDateCancel: document.getElementById("historyDateCancel"),
  historyDateDone: document.getElementById("historyDateDone"),
  historyDetailOverlay: document.getElementById("historyDetailOverlay"),
  historyDetailCloseBtn: document.getElementById("historyDetailCloseBtn"),
  historyDetailSessionId: document.getElementById("historyDetailSessionId"),
  historyDetailStation: document.getElementById("historyDetailStation"),
  historyDetailConnector: document.getElementById("historyDetailConnector"),
  historyDetailStatus: document.getElementById("historyDetailStatus"),
  historyDetailStart: document.getElementById("historyDetailStart"),
  historyDetailEnd: document.getElementById("historyDetailEnd"),
  historyDetailEnergy: document.getElementById("historyDetailEnergy"),
  historyDetailDuration: document.getElementById("historyDetailDuration"),
};

const HISTORY_FILTER_DEFAULTS = {
  dateFrom: els.historyDateFrom?.value || "",
  dateTo: els.historyDateTo?.value || "",
  station: els.historyStationFilter?.value || "all",
  connector: els.historyConnectorFilter?.value || "all",
  status: els.historyStatusFilter?.value || "all",
  chartMode: els.historyChartMode?.value || "day",
};

function initNotifToggle() {
  if (!els.notifToggle) return;
  els.notifToggle.addEventListener("click", () => {
    if (typeof openAlertsPage === "function") {
      openAlertsPage();
      return;
    }
    window.location.href = "alerts.html";
  });
}

function updateNotificationBadge() {
  if (!els.notifBadge || typeof getOpenAlertsCount !== "function") return;
  const count = getOpenAlertsCount();
  els.notifBadge.textContent = String(count);
  els.notifBadge.classList.toggle("is-hidden", count === 0);
}

function formatHistoryFilterDate(value) {
  if (!value) return "Select date";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function syncHistoryDateTriggers() {
  if (els.historyDateFromText) els.historyDateFromText.textContent = formatHistoryFilterDate(els.historyDateFrom?.value || "");
  if (els.historyDateToText) els.historyDateToText.textContent = formatHistoryFilterDate(els.historyDateTo?.value || "");
}

function getTodayHistoryDateKey() {
  return dayKeyFromDate(new Date());
}

function validateHistoryDateRange() {
  const dateFrom = els.historyDateFrom?.value || "";
  const dateTo = els.historyDateTo?.value || "";
  const today = getTodayHistoryDateKey();

  const isInvalid =
    (dateFrom && dateFrom > today) ||
    (dateTo && dateTo > today) ||
    (dateFrom && dateTo && dateFrom > dateTo);

  if (els.historyDateError) {
    els.historyDateError.classList.toggle("is-visible", isInvalid);
  }

  return !isInvalid;
}

function isHistoryDatePopoverOpen() {
  return !!(els.historyDatePopover && els.historyDatePopover.classList.contains("is-open"));
}

function positionHistoryDatePopover(anchor) {
  if (!els.historyDatePopover || !anchor) return;
  const rect = anchor.getBoundingClientRect();
  const width = els.historyDatePopover.offsetWidth || 360;
  const height = els.historyDatePopover.offsetHeight || 320;
  let left = rect.left;
  let top = rect.bottom + 8;
  if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
  if (left < 8) left = 8;
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 8);
  els.historyDatePopover.style.left = `${left}px`;
  els.historyDatePopover.style.top = `${top}px`;
}

function renderHistoryDatePicker() {
  if (!els.historyDateGrid || !els.historyDateTitle) return;
  const view = historyDatePickerState.view;
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLast = new Date(year, month, 0).getDate();
  const cells = [];

  els.historyDateTitle.textContent = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  for (let i = 0; i < lead; i += 1) cells.push({ d: new Date(year, month - 1, prevMonthLast - lead + i + 1), inMonth: false });
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ d: new Date(year, month, day), inMonth: true });
  const tail = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= tail; day += 1) cells.push({ d: new Date(year, month + 1, day), inMonth: false });

  els.historyDateGrid.innerHTML = cells.map((cell) => {
    const key = dayKeyFromDate(cell.d);
    const outClass = cell.inMonth ? "" : " coord-cal__cell--out";
    const selectedClass = historyDatePickerState.working === key ? " coord-cal__cell--selected coord-cal__cell--solo" : "";
    const pill = historyDatePickerState.working === key ? '<span class="coord-cal__pill" aria-hidden="true"></span>' : "";
    return `<div class="coord-cal__cell${outClass}${selectedClass}">${pill}<button type="button" class="coord-cal__cell-btn" data-history-day="${key}">${cell.d.getDate()}</button></div>`;
  }).join("");
}

function openHistoryDatePopover(field) {
  if (!els.historyDatePopover) return;
  historyDatePickerState.activeField = field;
  historyDatePickerState.working = field === "from" ? (els.historyDateFrom?.value || "") : (els.historyDateTo?.value || "");
  const seed = historyDatePickerState.working ? new Date(`${historyDatePickerState.working}T00:00:00`) : new Date();
  historyDatePickerState.view = new Date(seed.getFullYear(), seed.getMonth(), 1);
  renderHistoryDatePicker();
  els.historyDatePopover.classList.add("is-open");
  els.historyDatePopover.setAttribute("aria-hidden", "false");
  if (els.historyDateFromTrigger) {
    els.historyDateFromTrigger.classList.toggle("is-active", field === "from");
    els.historyDateFromTrigger.setAttribute("aria-expanded", field === "from" ? "true" : "false");
  }
  if (els.historyDateToTrigger) {
    els.historyDateToTrigger.classList.toggle("is-active", field === "to");
    els.historyDateToTrigger.setAttribute("aria-expanded", field === "to" ? "true" : "false");
  }
  requestAnimationFrame(() => positionHistoryDatePopover(field === "from" ? els.historyDateFromTrigger : els.historyDateToTrigger));
}

function closeHistoryDatePopover() {
  if (!els.historyDatePopover) return;
  els.historyDatePopover.classList.remove("is-open");
  els.historyDatePopover.setAttribute("aria-hidden", "true");
  if (els.historyDateFromTrigger) {
    els.historyDateFromTrigger.classList.remove("is-active");
    els.historyDateFromTrigger.setAttribute("aria-expanded", "false");
  }
  if (els.historyDateToTrigger) {
    els.historyDateToTrigger.classList.remove("is-active");
    els.historyDateToTrigger.setAttribute("aria-expanded", "false");
  }
  historyDatePickerState.activeField = "";
}

function commitHistoryDatePopover() {
  if (!historyDatePickerState.working) {
    closeHistoryDatePopover();
    return;
  }
  if (historyDatePickerState.activeField === "from" && els.historyDateFrom) {
    els.historyDateFrom.value = historyDatePickerState.working;
  }
  if (historyDatePickerState.activeField === "to" && els.historyDateTo) {
    els.historyDateTo.value = historyDatePickerState.working;
  }
  syncHistoryDateTriggers();
  closeHistoryDatePopover();
  renderHistoryView();
}

function formatHistoryStatus(status) {
  if (status === "completed") return "Completed";
  if (status === "interrupted") return "Interrupted";
  if (status === "cancelled") return "Cancelled";
  if (status === "failed") return "Failed";
  if (status === "ongoing") return "Ongoing";
  return status;
}

function formatHistoryDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchStations() {
  if (!API_BASE) return;
  try {
    const json = await apiJson("/stations");
    stations = Array.isArray(json?.data) ? json.data : stations;
  } catch (error) {
    console.error(error);
  }
}

async function fetchHistorySessions() {
  if (!API_BASE) return;
  try {
    const json = await apiJson("/history");
    allHistorySessions = Array.isArray(json?.data) ? json.data : [];
  } catch (error) {
    console.error(error);
    allHistorySessions = [];
  }
}

function populateHistoryFilters() {
  if (els.historyStationFilter) {
    els.historyStationFilter.innerHTML = ['<option value="all">All Stations</option>']
      .concat(stations.map((station) => `<option value="${station.id}">${station.id} - ${station.name}</option>`))
      .join("");
    els.historyStationFilter.value = HISTORY_FILTER_DEFAULTS.station;
  }

  if (els.historyConnectorFilter) {
    const connectors = [...new Set(allHistorySessions.map((item) => item.connector))];
    els.historyConnectorFilter.innerHTML = ['<option value="all">All Connectors</option>']
      .concat(connectors.map((connector) => `<option value="${connector}">${connector}</option>`))
      .join("");
    els.historyConnectorFilter.value = HISTORY_FILTER_DEFAULTS.connector;
  }
}

function resetHistoryFilters() {
  if (els.historyDateFrom) els.historyDateFrom.value = HISTORY_FILTER_DEFAULTS.dateFrom;
  if (els.historyDateTo) els.historyDateTo.value = HISTORY_FILTER_DEFAULTS.dateTo;
  if (els.historyStationFilter) els.historyStationFilter.value = HISTORY_FILTER_DEFAULTS.station;
  if (els.historyConnectorFilter) els.historyConnectorFilter.value = HISTORY_FILTER_DEFAULTS.connector;
  if (els.historyStatusFilter) els.historyStatusFilter.value = HISTORY_FILTER_DEFAULTS.status;
  if (els.historyChartMode) els.historyChartMode.value = HISTORY_FILTER_DEFAULTS.chartMode;

  syncHistoryDateTriggers();
  closeHistoryDatePopover();
  renderHistoryView();
}

function getFilteredHistorySessions() {
  const dateFrom = els.historyDateFrom?.value || "";
  const dateTo = els.historyDateTo?.value || "";
  const stationId = els.historyStationFilter?.value || "all";
  const connector = els.historyConnectorFilter?.value || "all";
  const status = els.historyStatusFilter?.value || "all";

  return allHistorySessions.filter((session) => {
    const start = new Date(session.start);
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    const fromMatch = !fromDate || startDateOnly >= fromDate;
    const toMatch = !toDate || start <= toDate;
    const stationMatch = stationId === "all" || session.stationId === stationId;
    const connectorMatch = connector === "all" || session.connector === connector;
    const statusMatch = status === "all" || session.status === status;
    return fromMatch && toMatch && stationMatch && connectorMatch && statusMatch;
  }).sort((a, b) => new Date(b.start) - new Date(a.start));
}

function buildHistoryChartData(sessions) {
  const mode = els.historyChartMode?.value || "day";
  const grouped = new Map();
  sessions.forEach((session) => {
    const date = new Date(session.start);
    let key = "";
    if (mode === "week") {
      const temp = new Date(date);
      temp.setHours(0, 0, 0, 0);
      temp.setDate(temp.getDate() - ((temp.getDay() + 6) % 7));
      key = `${String(temp.getDate()).padStart(2, "0")}/${String(temp.getMonth() + 1).padStart(2, "0")}`;
    } else {
      key = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
    grouped.set(key, (grouped.get(key) || 0) + 1);
  });
  return [...grouped.entries()].slice(-7);
}

function renderHistoryChart(sessions) {
  if (!els.historyChart) return;
  const data = buildHistoryChartData(sessions);
  if (!data.length) {
    els.historyChart.innerHTML = '<div class="muted">No chart data available.</div>';
    return;
  }
  const maxValue = Math.max(...data.map((item) => item[1]), 1);
  els.historyChart.innerHTML = data.map(([label, value]) => {
    const height = Math.max(18, Math.round((value / maxValue) * 180));
    return `
      <div class="history-chart__bar">
        <span class="history-chart__value">${value}</span>
        <div class="history-chart__column" style="height:${height}px"></div>
        <span class="history-chart__label">${label}</span>
      </div>
    `;
  }).join("");
}

function renderHistorySummary(sessions) {
  const totalSessions = sessions.length;
  const totalEnergy = sessions.reduce((sum, item) => sum + item.kwh, 0);
  const totalDuration = sessions.reduce((sum, item) => sum + item.duration, 0);
  if (els.historyMetricSessions) els.historyMetricSessions.textContent = String(totalSessions);
  if (els.historyMetricEnergy) els.historyMetricEnergy.textContent = `${totalEnergy.toFixed(1)} kWh`;
  if (els.historyMetricDuration) els.historyMetricDuration.textContent = `${totalSessions ? Math.round(totalDuration / totalSessions) : 0} min`;
}

function renderHistoryTable(sessions) {
  if (!els.historyTableBody) return;
  if (els.historyResultCount) {
    els.historyResultCount.textContent = `${sessions.length} result${sessions.length === 1 ? "" : "s"}`;
  }
  if (els.historyEmptyState) {
    els.historyEmptyState.classList.toggle("is-visible", sessions.length === 0);
  }

  els.historyTableBody.innerHTML = sessions.map((session) => `
    <tr>
      <td>${session.id}</td>
      <td>${session.stationName}</td>
      <td>${session.connector}</td>
      <td>${formatHistoryDateTime(session.start)}</td>
      <td>${formatHistoryDateTime(session.end)}</td>
      <td>${session.kwh.toFixed(1)}</td>
      <td>${session.duration} min</td>
      <td><span class="history-session-status history-session-status--${session.status}">${formatHistoryStatus(session.status)}</span></td>
      <td><button type="button" class="history-detail-btn" data-session-id="${session.id}">View</button></td>
    </tr>
  `).join("");
}

function renderHistoryView() {
  const isValidDateRange = validateHistoryDateRange();
  filteredHistorySessions = isValidDateRange ? getFilteredHistorySessions() : [];
  renderHistorySummary(filteredHistorySessions);
  renderHistoryChart(filteredHistorySessions);
  renderHistoryTable(filteredHistorySessions);
}

function openHistoryDetail(sessionId) {
  currentHistorySession = filteredHistorySessions.find((item) => item.id === sessionId) || null;
  if (!currentHistorySession || !els.historyDetailOverlay) return;
  if (els.historyDetailSessionId) els.historyDetailSessionId.textContent = currentHistorySession.id;
  if (els.historyDetailStation) els.historyDetailStation.textContent = `${currentHistorySession.stationId} - ${currentHistorySession.stationName}`;
  if (els.historyDetailConnector) els.historyDetailConnector.textContent = currentHistorySession.connector;
  if (els.historyDetailStatus) els.historyDetailStatus.textContent = formatHistoryStatus(currentHistorySession.status);
  if (els.historyDetailStart) els.historyDetailStart.textContent = formatHistoryDateTime(currentHistorySession.start);
  if (els.historyDetailEnd) els.historyDetailEnd.textContent = formatHistoryDateTime(currentHistorySession.end);
  if (els.historyDetailEnergy) els.historyDetailEnergy.textContent = `${currentHistorySession.kwh.toFixed(1)} kWh`;
  if (els.historyDetailDuration) els.historyDetailDuration.textContent = `${currentHistorySession.duration} min`;
  els.historyDetailOverlay.classList.add("is-open");
  els.historyDetailOverlay.setAttribute("aria-hidden", "false");
}

function closeHistoryDetail() {
  if (!els.historyDetailOverlay) return;
  els.historyDetailOverlay.classList.remove("is-open");
  els.historyDetailOverlay.setAttribute("aria-hidden", "true");
}

function isHistoryExportMenuOpen() {
  return !!(els.historyExportMenu && els.historyExportMenu.classList.contains("is-open"));
}

function openHistoryExportMenu() {
  if (!els.historyExportMenu || !els.historyExportTrigger) return;
  els.historyExportMenu.classList.add("is-open");
  els.historyExportTrigger.setAttribute("aria-expanded", "true");
}

function closeHistoryExportMenu() {
  if (!els.historyExportMenu || !els.historyExportTrigger) return;
  els.historyExportMenu.classList.remove("is-open");
  els.historyExportTrigger.setAttribute("aria-expanded", "false");
}

function exportHistoryData(type) {
  try {
    const sessions = filteredHistorySessions.length ? filteredHistorySessions : getFilteredHistorySessions();
    const header = ["Session ID", "Station", "Connector", "Start", "End", "kWh", "Duration", "Cost", "Status"];
    const rows = sessions.map((item) => [
      item.id,
      `${item.stationId} - ${item.stationName}`,
      item.connector,
      formatHistoryDateTime(item.start),
      formatHistoryDateTime(item.end),
      item.kwh.toFixed(1),
      `${item.duration} min`,
      item.cost.toFixed(1),
      formatHistoryStatus(item.status),
    ]);
    const separator = type === "csv" ? "," : "\t";
    const content = [header, ...rows].map((row) => row.join(separator)).join("\n");
    const mime = type === "csv" ? "text/csv" : "text/plain";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `station-history.${type}`;
    link.click();

    if (els.historyExportFeedback) {
      els.historyExportFeedback.innerHTML = `Export completed successfully. <a href="${url}" download="station-history.${type}">Download file</a>`;
      els.historyExportFeedback.classList.add("is-visible");
    }
  } catch {
    if (els.historyExportFeedback) {
      els.historyExportFeedback.textContent = "Unable to export data. Please try again.";
      els.historyExportFeedback.classList.add("is-visible");
    }
  }
}

function bindHistoryEvents() {
  syncHistoryDateTriggers();
  [els.historyDateFrom, els.historyDateTo, els.historyStationFilter, els.historyConnectorFilter, els.historyStatusFilter, els.historyChartMode]
    .filter(Boolean)
    .forEach((element) => element.addEventListener("change", renderHistoryView));

  if (els.historyDateFromTrigger) {
    els.historyDateFromTrigger.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isHistoryDatePopoverOpen() && historyDatePickerState.activeField === "from") {
        closeHistoryDatePopover();
        return;
      }
      openHistoryDatePopover("from");
    });
  }

  if (els.historyDateToTrigger) {
    els.historyDateToTrigger.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isHistoryDatePopoverOpen() && historyDatePickerState.activeField === "to") {
        closeHistoryDatePopover();
        return;
      }
      openHistoryDatePopover("to");
    });
  }

  if (els.historyDateGrid) {
    els.historyDateGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-history-day]");
      if (!button) return;
      historyDatePickerState.working = button.dataset.historyDay;
      renderHistoryDatePicker();
    });
  }

  if (els.historyDatePrevMonth) {
    els.historyDatePrevMonth.addEventListener("click", () => {
      historyDatePickerState.view = new Date(historyDatePickerState.view.getFullYear(), historyDatePickerState.view.getMonth() - 1, 1);
      renderHistoryDatePicker();
    });
  }

  if (els.historyDateNextMonth) {
    els.historyDateNextMonth.addEventListener("click", () => {
      historyDatePickerState.view = new Date(historyDatePickerState.view.getFullYear(), historyDatePickerState.view.getMonth() + 1, 1);
      renderHistoryDatePicker();
    });
  }

  if (els.historyDateCancel) els.historyDateCancel.addEventListener("click", closeHistoryDatePopover);
  if (els.historyDateDone) els.historyDateDone.addEventListener("click", commitHistoryDatePopover);
  if (els.historyResetFilters) els.historyResetFilters.addEventListener("click", resetHistoryFilters);

  if (els.historyTableBody) {
    els.historyTableBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-session-id]");
      if (!button) return;
      openHistoryDetail(button.dataset.sessionId);
    });
  }

  if (els.historyExportTrigger) {
    els.historyExportTrigger.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isHistoryExportMenuOpen()) closeHistoryExportMenu();
      else openHistoryExportMenu();
    });
  }

  document.querySelectorAll("[data-export-type]").forEach((button) => {
    button.addEventListener("click", () => {
      exportHistoryData(button.dataset.exportType);
      closeHistoryExportMenu();
    });
  });

  if (els.historyDetailCloseBtn) els.historyDetailCloseBtn.addEventListener("click", closeHistoryDetail);
  if (els.historyDetailOverlay) {
    els.historyDetailOverlay.addEventListener("click", (event) => {
      if (event.target === els.historyDetailOverlay) closeHistoryDetail();
    });
  }

  document.addEventListener("pointerdown", (event) => {
    if (
      isHistoryDatePopoverOpen() &&
      els.historyDatePopover &&
      !els.historyDatePopover.contains(event.target) &&
      !(els.historyDateFromTrigger && els.historyDateFromTrigger.contains(event.target)) &&
      !(els.historyDateToTrigger && els.historyDateToTrigger.contains(event.target))
    ) {
      closeHistoryDatePopover();
    }

    if (isHistoryExportMenuOpen() && els.historyExportMenu && !els.historyExportMenu.contains(event.target)) {
      closeHistoryExportMenu();
    }
  });
}

async function init() {
  initNotifToggle();
  updateNotificationBadge();
  bindHistoryEvents();
  await Promise.all([fetchStations(), fetchHistorySessions()]);
  populateHistoryFilters();
  renderHistoryView();
}

void init().catch((error) => {
  console.error(error);
  populateHistoryFilters();
  renderHistoryView();
});
