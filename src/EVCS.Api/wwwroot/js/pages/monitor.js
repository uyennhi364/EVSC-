const API_BASE =
  typeof window !== "undefined" && window.EVCS_API_BASE ? String(window.EVCS_API_BASE).replace(/\/$/, "") : "";

const REFRESH_MS = 15000;
/** Cố định 10 trạm mỗi trang */
const MONITOR_PAGE_SIZE = 10;

/** @type {any[]} */
let monitorStations = [];
/** @type {{ key: string, label: string }[]} */
let monitorRegions = [];
let filteredStations = [];
let currentMonitorStation = null;

let monitorCurrentPage = 1;

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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const monitorEls = {
  notifToggle: document.getElementById("notifToggle"),
  notifBadge: document.querySelector("#notifToggle .bell-badge"),
  grid: document.getElementById("monitorGrid"),
  emptyState: document.getElementById("monitorEmpty"),
  onlineCount: document.getElementById("monitorOnlineCount"),
  offlineCount: document.getElementById("monitorOfflineCount"),
  idleCount: document.getElementById("monitorIdleCount"),
  chargingCount: document.getElementById("monitorChargingCount"),
  errorCount: document.getElementById("monitorErrorCount"),
  stationFilter: document.getElementById("stationFilter"),
  areaFilter: document.getElementById("areaFilter"),
  statusFilter: document.getElementById("statusFilter"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  detailDrawer: document.getElementById("monitorDetailDrawer"),
  detailStationName: document.getElementById("detailStationName"),
  detailStationId: document.getElementById("detailStationId"),
  detailStationAddress: document.getElementById("detailStationAddress"),
  detailStationArea: document.getElementById("detailStationArea"),
  detailStationStatus: document.getElementById("detailStationStatus"),
  detailConnectorsList: document.getElementById("detailConnectorsList"),
  detailTotalSessions: document.getElementById("detailTotalSessions"),
  detailTotalEnergy: document.getElementById("detailTotalEnergy"),
  detailUptimePercentage: document.getElementById("detailUptimePercentage"),
  detailClose: document.getElementById("monitorDetailClose"),
  detailCloseBtn: document.getElementById("monitorDetailCloseBtn"),
  overlay: document.getElementById("monitorDetailOverlay"),
  pagination: document.getElementById("monitorPagination"),
  pagePrev: document.getElementById("monitorPagePrev"),
  pageNext: document.getElementById("monitorPageNext"),
  pageNumbers: document.getElementById("monitorPageNumbers"),
};

function initNotifToggle() {
  if (!monitorEls.notifToggle) return;
  monitorEls.notifToggle.addEventListener("click", () => {
    if (typeof openAlertsPage === "function") {
      openAlertsPage();
      return;
    }
    window.location.href = "alerts.html";
  });
}

function initBackToSourceButton() {
  const backBtn = document.getElementById("backToSourceBtn");
  if (!backBtn) return;

  backBtn.addEventListener("click", (event) => {
    event.preventDefault();
    if (typeof getPreviousPage === "function") {
      window.location.href = getPreviousPage("poles.html");
      return;
    }
    window.location.href = "poles.html";
  });
}

function updateNotificationBadge() {
  if (!monitorEls.notifBadge || typeof getOpenAlertsCount !== "function") return;
  const count = getOpenAlertsCount();
  monitorEls.notifBadge.textContent = String(count);
  monitorEls.notifBadge.classList.toggle("is-hidden", count === 0);
}

function getConnectorStatusText(status) {
  const statusMap = {
    available: "Available",
    "in-use": "In Use",
    fault: "Fault",
  };
  return statusMap[status] || status;
}

function getStationStatusText(status) {
  const statusMap = {
    online: "Online",
    offline: "Offline",
    error: "Error",
  };
  return statusMap[status] || status;
}

function getAreaText(station) {
  if (station.areaLabel) return station.areaLabel;
  const areaMap = {
    north: "North",
    central: "Central",
    south: "South",
  };
  return areaMap[station.area] || station.area || "—";
}

function populateAreaFilter() {
  if (!monitorEls.areaFilter) return;
  const previous = monitorEls.areaFilter.value;
  const options = ['<option value="">All</option>'].concat(
    monitorRegions.map((r) => `<option value="${escapeHtml(r.key)}">${escapeHtml(r.label)}</option>`)
  );
  monitorEls.areaFilter.innerHTML = options.join("");
  const hasPrev = [...monitorEls.areaFilter.options].some((o) => o.value === previous);
  if (hasPrev) monitorEls.areaFilter.value = previous;
}

function stationMatchesStatusFilter(station, statusValue) {
  if (!statusValue) return true;
  if (statusValue === "online") return station.status === "online";
  if (statusValue === "offline") return station.status === "offline" || station.status === "error";
  return station.status === statusValue;
}

function updateFilteredStations() {
  const stationValue = monitorEls.stationFilter ? monitorEls.stationFilter.value.toLowerCase() : "";
  const areaValue = monitorEls.areaFilter ? monitorEls.areaFilter.value : "";
  const statusValue = monitorEls.statusFilter ? monitorEls.statusFilter.value : "";

  filteredStations = monitorStations.filter((station) => {
    const matchStation = !stationValue || String(station.name || "").toLowerCase().includes(stationValue);
    const matchArea = !areaValue || station.area === areaValue;
    const matchStatus = stationMatchesStatusFilter(station, statusValue);
    return matchStation && matchArea && matchStatus;
  });
}

function getMonitorTotalPages() {
  if (filteredStations.length === 0) return 0;
  return Math.ceil(filteredStations.length / MONITOR_PAGE_SIZE);
}

function clampMonitorPage() {
  const total = getMonitorTotalPages();
  if (total === 0) {
    monitorCurrentPage = 1;
    return;
  }
  if (monitorCurrentPage > total) monitorCurrentPage = total;
  if (monitorCurrentPage < 1) monitorCurrentPage = 1;
}

function getMonitorPagedStations() {
  const start = (monitorCurrentPage - 1) * MONITOR_PAGE_SIZE;
  return filteredStations.slice(start, start + MONITOR_PAGE_SIZE);
}

/**
 * @param {number} total
 * @param {number} current
 * @returns {(number | null)[]}
 */
function getMonitorPageWindow(total, current) {
  if (total <= 0) return [];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  /** @type {(number | null)[]} */
  const out = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push(null);
  for (let p = left; p <= right; p += 1) {
    if (!out.includes(p)) out.push(p);
  }
  if (right < total - 1) out.push(null);
  if (!out.includes(total)) out.push(total);
  return out;
}

function renderMonitorPagination() {
  const bar = monitorEls.pagination;
  const prevBtn = monitorEls.pagePrev;
  const nextBtn = monitorEls.pageNext;
  const numbersEl = monitorEls.pageNumbers;

  const n = filteredStations.length;

  if (!bar) return;

  if (n === 0) {
    bar.classList.add("is-hidden");
    if (numbersEl) numbersEl.innerHTML = "";
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  bar.classList.remove("is-hidden");
  clampMonitorPage();
  const totalAgain = getMonitorTotalPages();

  if (prevBtn) prevBtn.disabled = monitorCurrentPage <= 1;
  if (nextBtn) nextBtn.disabled = monitorCurrentPage >= totalAgain;

  if (numbersEl) {
    const window = getMonitorPageWindow(totalAgain, monitorCurrentPage);
    numbersEl.innerHTML = window
      .map((p) => {
        if (p === null) {
          return `<span class="monitor-pagination__ellipsis" aria-hidden="true">…</span>`;
        }
        const active = p === monitorCurrentPage ? " is-active" : "";
        return `<button type="button" class="monitor-pager-page${active}" data-monitor-page="${p}" aria-label="Page ${p}"${active ? ' aria-current="page"' : ""}>${p}</button>`;
      })
      .join("");

    numbersEl.querySelectorAll("[data-monitor-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = Number(btn.getAttribute("data-monitor-page"));
        if (!Number.isFinite(page)) return;
        monitorCurrentPage = page;
        renderMonitorGrid();
        renderMonitorPagination();
      });
    });
  }
}

function refreshMonitorListView() {
  updateFilteredStations();
  clampMonitorPage();
  calculateKPIs();
  renderMonitorGrid();
  renderMonitorPagination();
}

async function fetchMonitorOverview() {
  if (!API_BASE) {
    monitorStations = [];
    monitorRegions = [];
    populateAreaFilter();
    refreshMonitorListView();
    return;
  }

  try {
    const json = await apiJson("/monitor/overview");
    const payload = json?.data;
    monitorStations = Array.isArray(payload?.stations) ? payload.stations : [];
    monitorRegions = Array.isArray(payload?.regions) ? payload.regions : [];
  } catch (err) {
    console.error(err);
    monitorStations = [];
    monitorRegions = [];
  }

  populateAreaFilter();

  const openId = currentMonitorStation?.id;
  refreshMonitorListView();
  if (openId) {
    const still = monitorStations.find((s) => s.id === openId);
    if (still && monitorEls.detailDrawer?.classList.contains("is-open")) {
      openMonitorDetail(openId);
    } else if (!still) {
      closeMonitorDetail();
    }
  }
}

function calculateKPIs() {
  const onlineStations = filteredStations.filter((s) => s.status === "online").length;
  const offlineStations = filteredStations.filter((s) => s.status === "offline" || s.status === "error").length;

  let idleConnectors = 0;
  let chargingConnectors = 0;
  let errorConnectors = 0;

  filteredStations.forEach((station) => {
    (station.connectors || []).forEach((connector) => {
      if (connector.status === "available") idleConnectors += 1;
      else if (connector.status === "in-use") chargingConnectors += 1;
      else if (connector.status === "fault") errorConnectors += 1;
    });
  });

  if (monitorEls.onlineCount) monitorEls.onlineCount.textContent = String(onlineStations);
  if (monitorEls.offlineCount) monitorEls.offlineCount.textContent = String(offlineStations);
  if (monitorEls.idleCount) monitorEls.idleCount.textContent = String(idleConnectors);
  if (monitorEls.chargingCount) monitorEls.chargingCount.textContent = String(chargingConnectors);
  if (monitorEls.errorCount) monitorEls.errorCount.textContent = String(errorConnectors);
}

function renderMonitorGrid() {
  if (!monitorEls.grid) return;

  if (filteredStations.length === 0) {
    monitorEls.grid.innerHTML = "";
    if (monitorEls.emptyState) monitorEls.emptyState.classList.remove("is-hidden");
    return;
  }

  if (monitorEls.emptyState) monitorEls.emptyState.classList.add("is-hidden");

  const pageRows = getMonitorPagedStations();

  monitorEls.grid.innerHTML = pageRows
    .map((station) => {
      const connectors = station.connectors || [];
      const chargingCount = connectors.filter((c) => c.status === "in-use").length;
      const totalCount = connectors.length;

      return `
      <div class="monitor-station-card" data-station-id="${escapeHtml(station.id)}">
        <div class="monitor-station-card__header">
          <h3 class="monitor-station-card__name">${escapeHtml(station.name)}</h3>
          <span class="monitor-status-badge monitor-status-badge--${escapeHtml(station.status)}">
            ${getStationStatusText(station.status)}
          </span>
        </div>

        <div class="monitor-station-info">
          <div class="monitor-info-item">
            <span class="monitor-info-label">Address:</span>
            <span class="monitor-info-value">${escapeHtml(station.address)}</span>
          </div>
          <div class="monitor-info-item">
            <span class="monitor-info-label">Region:</span>
            <span class="monitor-info-value">${escapeHtml(getAreaText(station))}</span>
          </div>
          <div class="monitor-info-item">
            <span class="monitor-info-label">Connectors:</span>
            <span class="monitor-info-value">${chargingCount}/${totalCount} charging</span>
          </div>
        </div>

        <div class="monitor-connectors">
          ${connectors
            .map(
              (connector) => `
            <div class="monitor-connector-item">
              <span class="monitor-connector-name">${escapeHtml(connector.type)}</span>
              <span class="monitor-connector-status monitor-connector-status--${escapeHtml(connector.status)}">
                ${getConnectorStatusText(connector.status)}
              </span>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="monitor-station-actions">
          <button class="monitor-action-btn monitor-action-btn--view" data-action="view">View details</button>
        </div>
      </div>
    `;
    })
    .join("");

  attachCardEventListeners();
}

function attachCardEventListeners() {
  const cards = document.querySelectorAll(".monitor-station-card");
  cards.forEach((card) => {
    const stationId = card.getAttribute("data-station-id");
    const viewBtn = card.querySelector('[data-action="view"]');
    if (viewBtn) {
      viewBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openMonitorDetail(stationId);
      });
    }

    card.addEventListener("click", () => {
      openMonitorDetail(stationId);
    });
  });
}

function openMonitorDetail(stationId) {
  currentMonitorStation = monitorStations.find((s) => s.id === stationId);
  if (!currentMonitorStation) return;

  if (monitorEls.detailStationName) {
    monitorEls.detailStationName.textContent = currentMonitorStation.name;
  }
  if (monitorEls.detailStationId) {
    monitorEls.detailStationId.textContent = currentMonitorStation.id;
  }
  if (monitorEls.detailStationAddress) {
    monitorEls.detailStationAddress.textContent = currentMonitorStation.address;
  }
  if (monitorEls.detailStationArea) {
    monitorEls.detailStationArea.textContent = getAreaText(currentMonitorStation);
  }
  if (monitorEls.detailStationStatus) {
    monitorEls.detailStationStatus.textContent = getStationStatusText(currentMonitorStation.status);
  }

  const connectors = currentMonitorStation.connectors || [];
  if (monitorEls.detailConnectorsList) {
    monitorEls.detailConnectorsList.innerHTML = connectors
      .map(
        (connector) => `
        <div class="monitor-detail-info-item">
          <span class="monitor-detail-info-label">${escapeHtml(connector.type)} (${escapeHtml(connector.id)})</span>
          <span class="monitor-detail-info-value">${getConnectorStatusText(connector.status)}</span>
        </div>
      `
      )
      .join("");
  }

  const sessions = Number(currentMonitorStation.totalSessions) || 0;
  const energy = Number(currentMonitorStation.totalEnergy) || 0;
  const uptime = Number(currentMonitorStation.uptime) || 0;

  if (monitorEls.detailTotalSessions) {
    monitorEls.detailTotalSessions.textContent = String(sessions);
  }
  if (monitorEls.detailTotalEnergy) {
    monitorEls.detailTotalEnergy.textContent = `${energy.toFixed(1)} kWh`;
  }
  if (monitorEls.detailUptimePercentage) {
    monitorEls.detailUptimePercentage.textContent = `${uptime.toFixed(1)}%`;
  }

  if (monitorEls.detailDrawer) {
    monitorEls.detailDrawer.classList.add("is-open");
  }
  if (monitorEls.overlay) {
    monitorEls.overlay.classList.add("is-open");
  }
}

function closeMonitorDetail() {
  if (monitorEls.detailDrawer) {
    monitorEls.detailDrawer.classList.remove("is-open");
  }
  if (monitorEls.overlay) {
    monitorEls.overlay.classList.remove("is-open");
  }
  currentMonitorStation = null;
}

function applyFilters() {
  monitorCurrentPage = 1;
  refreshMonitorListView();
}

function resetFilters() {
  if (monitorEls.stationFilter) monitorEls.stationFilter.value = "";
  if (monitorEls.areaFilter) monitorEls.areaFilter.value = "";
  if (monitorEls.statusFilter) monitorEls.statusFilter.value = "";
  applyFilters();
}

function bindEvents() {
  if (monitorEls.stationFilter) {
    monitorEls.stationFilter.addEventListener("input", applyFilters);
  }
  if (monitorEls.areaFilter) {
    monitorEls.areaFilter.addEventListener("change", applyFilters);
  }
  if (monitorEls.statusFilter) {
    monitorEls.statusFilter.addEventListener("change", applyFilters);
  }
  if (monitorEls.resetFiltersBtn) {
    monitorEls.resetFiltersBtn.addEventListener("click", resetFilters);
  }

  if (monitorEls.pagePrev) {
    monitorEls.pagePrev.addEventListener("click", () => {
      if (monitorCurrentPage > 1) {
        monitorCurrentPage -= 1;
        renderMonitorGrid();
        renderMonitorPagination();
      }
    });
  }

  if (monitorEls.pageNext) {
    monitorEls.pageNext.addEventListener("click", () => {
      const total = getMonitorTotalPages();
      if (monitorCurrentPage < total) {
        monitorCurrentPage += 1;
        renderMonitorGrid();
        renderMonitorPagination();
      }
    });
  }

  if (monitorEls.detailClose) {
    monitorEls.detailClose.addEventListener("click", closeMonitorDetail);
  }
  if (monitorEls.detailCloseBtn) {
    monitorEls.detailCloseBtn.addEventListener("click", closeMonitorDetail);
  }
  if (monitorEls.overlay) {
    monitorEls.overlay.addEventListener("click", closeMonitorDetail);
  }
}

async function initMonitor() {
  initNotifToggle();
  initBackToSourceButton();
  updateNotificationBadge();
  bindEvents();
  await fetchMonitorOverview();
  window.setInterval(() => {
    void fetchMonitorOverview();
  }, REFRESH_MS);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void initMonitor().catch((err) => {
      console.error(err);
      bindEvents();
      updateNotificationBadge();
      refreshMonitorListView();
    });
  });
} else {
  void initMonitor().catch((err) => {
    console.error(err);
    bindEvents();
    updateNotificationBadge();
    refreshMonitorListView();
  });
}
