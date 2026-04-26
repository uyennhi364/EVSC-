const detailEls = {
  container: document.getElementById("detailContainer"),
  notFoundState: document.getElementById("notFoundState"),
  notificationBell: document.getElementById("notificationBell"),
  notificationBadge: document.getElementById("notificationBadge"),
  detailTitle: document.getElementById("detailTitle"),
  detailDescription: document.getElementById("detailDescription"),
  detailStation: document.getElementById("detailStation"),
  detailTime: document.getElementById("detailTime"),
  detailSuggestion: document.getElementById("detailSuggestion"),
  detailSeverityBadge: document.getElementById("detailSeverityBadge"),
  detailStatusBadge: document.getElementById("detailStatusBadge"),
  historyList: document.getElementById("historyList"),
  maintenanceBtn: document.getElementById("maintenanceBtn"),
  technicianBtn: document.getElementById("technicianBtn"),
  resolveBtn: document.getElementById("resolveBtn"),
  actionMessage: document.getElementById("actionMessage")
};

const ALERT_DETAIL_API_BASE =
  typeof window !== "undefined" && window.EVCS_API_BASE ? String(window.EVCS_API_BASE).replace(/\/$/, "") : "";

async function fetchAlertDetailFromApi(alertId) {
  if (!ALERT_DETAIL_API_BASE || !alertId) return null;
  const response = await fetch(`${ALERT_DETAIL_API_BASE}/alerts/${encodeURIComponent(alertId)}`, {
    headers: { Accept: "application/json" }
  });

  if (response.status === 404) return null;
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

  const json = await response.json();
  return json?.data || null;
}

function getAlertIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function updateDetailNotificationBadge() {
  if (!detailEls.notificationBadge) return;
  const count = getOpenAlertsCount();
  detailEls.notificationBadge.textContent = String(count);
  detailEls.notificationBadge.classList.toggle("hidden", count === 0);
}

function bindNotificationBell() {
  if (!detailEls.notificationBell) return;
  detailEls.notificationBell.addEventListener("click", (event) => {
    event.preventDefault();
    if (typeof openAlertsPage === "function") {
      openAlertsPage();
      return;
    }
    window.location.href = "alerts.html";
  });
}

function showActionMessage(message) {
  if (!detailEls.actionMessage) return;
  detailEls.actionMessage.textContent = message;
  detailEls.actionMessage.classList.remove("hidden");
}

function renderHistory(logs) {
  if (!detailEls.historyList) return;
  const entries = Array.isArray(logs) ? logs : [];
  detailEls.historyList.innerHTML = entries.map((log) => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="text-xs uppercase tracking-wide text-slate-400">${formatAlertDateTime(log.time)}</div>
      <div class="mt-2 text-sm leading-6 text-slate-600">${log.message}</div>
    </div>
  `).join("");
}

function renderAlertDetail(alert) {
  if (!detailEls.container || !detailEls.notFoundState) return;
  if (!alert) {
    detailEls.container.classList.add("hidden");
    detailEls.notFoundState.classList.remove("hidden");
    return;
  }

  detailEls.container.classList.remove("hidden");
  detailEls.notFoundState.classList.add("hidden");

  const severityMeta = getSeverityMeta(alert.severity);
  const statusMeta = getStatusMeta(alert.status);

  if (detailEls.detailTitle) detailEls.detailTitle.textContent = alert.type;
  if (detailEls.detailDescription) detailEls.detailDescription.textContent = alert.description;
  if (detailEls.detailStation) detailEls.detailStation.textContent = alert.stationName;
  if (detailEls.detailTime) detailEls.detailTime.textContent = formatAlertDateTime(alert.occurredAt);
  if (detailEls.detailSuggestion) detailEls.detailSuggestion.textContent = alert.suggestion;
  if (detailEls.detailSeverityBadge) {
    detailEls.detailSeverityBadge.className = `inline-flex rounded-full px-3 py-1 text-sm font-semibold ${severityMeta.cardClass}`;
    detailEls.detailSeverityBadge.textContent = severityMeta.label;
  }
  if (detailEls.detailStatusBadge) {
    detailEls.detailStatusBadge.className = `inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusMeta.className}`;
    detailEls.detailStatusBadge.textContent = statusMeta.label;
  }

  if (detailEls.resolveBtn) {
    detailEls.resolveBtn.disabled = alert.status === "resolved";
    detailEls.resolveBtn.classList.toggle("cursor-not-allowed", alert.status === "resolved");
    detailEls.resolveBtn.classList.toggle("opacity-60", alert.status === "resolved");
  }

  renderHistory(alert.logs);
}

function bindDetailEvents(alertId) {
  if (detailEls.maintenanceBtn) {
    detailEls.maintenanceBtn.addEventListener("click", () => {
      const updated = appendAlertLog(alertId, "Maintenance request created for this alert.");
      renderAlertDetail(updated);
      showActionMessage("Maintenance request has been logged.");
    });
  }

  if (detailEls.technicianBtn) {
    detailEls.technicianBtn.addEventListener("click", () => {
      const updated = appendAlertLog(alertId, "Technician on duty was notified.");
      renderAlertDetail(updated);
      showActionMessage("Technician call request has been recorded.");
    });
  }

  if (detailEls.resolveBtn) {
    detailEls.resolveBtn.addEventListener("click", () => {
      const updated = updateAlert(alertId, (alert) => {
        alert.status = "resolved";
        const nextLogs = Array.isArray(alert.logs) ? [...alert.logs] : [];
        nextLogs.unshift({
          time: new Date().toISOString(),
          message: "Alert was marked as resolved."
        });
        alert.logs = nextLogs;
        return alert;
      });
      renderAlertDetail(updated);
      updateDetailNotificationBadge();
      showActionMessage("Alert has been marked as resolved.");
    });
  }
}

async function initAlertDetailPage() {
  await refreshAlertsFromApi();
  seedAlertsIfNeeded();
  const alertId = getAlertIdFromUrl();
  const alert = (await fetchAlertDetailFromApi(alertId)) || getAlertById(alertId);
  bindNotificationBell();
  updateDetailNotificationBadge();
  renderAlertDetail(alert);
  if (alert) {
    bindDetailEvents(alertId);
  }
}

void initAlertDetailPage().catch((err) => {
  console.error(err);
  seedAlertsIfNeeded();
  const alertId = getAlertIdFromUrl();
  const alert = getAlertById(alertId);
  bindNotificationBell();
  updateDetailNotificationBadge();
  renderAlertDetail(alert);
  if (alert) {
    bindDetailEvents(alertId);
  }
});
