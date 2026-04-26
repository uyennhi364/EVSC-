const alertsState = {
  query: "",
  severity: "all",
  status: "all",
  currentPage: 1
};

const ALERTS_PAGE_SIZE = 10;

const alertsEls = {
  tableBody: document.getElementById("alertsTableBody"),
  searchInput: document.getElementById("searchInput"),
  severityFilter: document.getElementById("severityFilter"),
  statusFilter: document.getElementById("statusFilter"),
  emptyState: document.getElementById("emptyState"),
  pagination: document.getElementById("alertsPagination"),
  notificationBadge: document.getElementById("notificationBadge"),
  summaryTotal: document.getElementById("summaryTotal"),
  summaryStatusTotal: document.getElementById("summaryStatusTotal"),
  summaryOpen: document.getElementById("summaryOpen"),
  summaryResolved: document.getElementById("summaryResolved"),
  summaryCritical: document.getElementById("summaryCritical"),
  summaryMedium: document.getElementById("summaryMedium"),
  summaryLow: document.getElementById("summaryLow")
};

function updateNotificationBadge() {
  if (!alertsEls.notificationBadge) return;
  const count = getOpenAlertsCount();
  alertsEls.notificationBadge.textContent = String(count);
  alertsEls.notificationBadge.classList.toggle("hidden", count === 0);
}

function getFilteredAlerts() {
  return getAlerts().filter((alert) => {
    const matchesQuery = !alertsState.query || [alert.type, alert.stationName, alert.description]
      .some((value) => String(value).toLowerCase().includes(alertsState.query));
    const matchesSeverity = alertsState.severity === "all" || alert.severity === alertsState.severity;
    const matchesStatus = alertsState.status === "all" || alert.status === alertsState.status;
    return matchesQuery && matchesSeverity && matchesStatus;
  });
}

function getTotalPages(alerts) {
  if (!alerts.length) return 0;
  return Math.ceil(alerts.length / ALERTS_PAGE_SIZE);
}

function clampCurrentPage(totalPages) {
  if (totalPages <= 0) {
    alertsState.currentPage = 1;
    return;
  }
  if (alertsState.currentPage > totalPages) alertsState.currentPage = totalPages;
  if (alertsState.currentPage < 1) alertsState.currentPage = 1;
}

function getPaginationItems(totalPages, page) {
  if (totalPages <= 1) return [1];
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, "...", totalPages];
  if (page >= totalPages - 2) return [1, "...", totalPages - 2, totalPages - 1, totalPages];
  return [1, "...", page, "...", totalPages];
}

function renderPagination(totalPages) {
  if (!alertsEls.pagination) return;
  const container = alertsEls.pagination.firstElementChild;
  if (!container) return;

  if (totalPages <= 1) {
    alertsEls.pagination.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  alertsEls.pagination.classList.remove("hidden");
  const prevDisabled = alertsState.currentPage === 1;
  const nextDisabled = alertsState.currentPage === totalPages;
  const items = getPaginationItems(totalPages, alertsState.currentPage);

  container.innerHTML = `
    <button
      type="button"
      class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-300 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-200 disabled:shadow-none"
      data-page-nav="prev"
      aria-label="Previous page"
      ${prevDisabled ? "disabled" : ""}
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 5L8 12L15 19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    ${items.map((item) => {
      if (item === "...") {
        return '<span class="inline-flex min-w-5 items-center justify-center text-xs font-medium text-slate-400">...</span>';
      }
      const isActive = item === alertsState.currentPage;
      return `
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold shadow-sm transition ${isActive ? "border-emerald-500 bg-emerald-500 text-white shadow-emerald-200/80" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"}"
          data-page="${item}"
          aria-label="Page ${item}"
          ${isActive ? 'aria-current="page"' : ""}
        >${item}</button>
      `;
    }).join("")}
    <button
      type="button"
      class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-300 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-200 disabled:shadow-none"
      data-page-nav="next"
      aria-label="Next page"
      ${nextDisabled ? "disabled" : ""}
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 5L16 12L9 19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;
}

function getAlertSummary(alerts) {
  return alerts.reduce((summary, alert) => {
    summary.total += 1;

    if (alert.severity === "critical") summary.high += 1;
    else if (alert.severity === "medium") summary.medium += 1;
    else summary.low += 1;

    if (alert.status === "resolved") summary.resolved += 1;
    else summary.unresolved += 1;

    return summary;
  }, {
    high: 0,
    medium: 0,
    low: 0,
    resolved: 0,
    unresolved: 0,
    total: 0
  });
}

function renderSummary(alerts) {
  const summary = getAlertSummary(alerts);

  if (alertsEls.summaryCritical) alertsEls.summaryCritical.textContent = String(summary.high);
  if (alertsEls.summaryMedium) alertsEls.summaryMedium.textContent = String(summary.medium);
  if (alertsEls.summaryLow) alertsEls.summaryLow.textContent = String(summary.low);
  if (alertsEls.summaryResolved) alertsEls.summaryResolved.textContent = String(summary.resolved);
  if (alertsEls.summaryOpen) alertsEls.summaryOpen.textContent = String(summary.unresolved);
  if (alertsEls.summaryTotal) alertsEls.summaryTotal.textContent = String(summary.total);
  if (alertsEls.summaryStatusTotal) alertsEls.summaryStatusTotal.textContent = String(summary.total);
}

function renderAlertsTable() {
  const alerts = getFilteredAlerts();
  const totalPages = getTotalPages(alerts);
  clampCurrentPage(totalPages);
  const start = (alertsState.currentPage - 1) * ALERTS_PAGE_SIZE;
  const pagedAlerts = alerts.slice(start, start + ALERTS_PAGE_SIZE);
  renderSummary(alerts);
  if (!alertsEls.tableBody || !alertsEls.emptyState) return;

  if (!alerts.length) {
    alertsEls.tableBody.innerHTML = "";
    alertsEls.emptyState.classList.remove("hidden");
    renderPagination(0);
    return;
  }

  alertsEls.emptyState.classList.add("hidden");
  alertsEls.tableBody.innerHTML = pagedAlerts.map((alert) => {
    const severityMeta = getSeverityMeta(alert.severity);
    const statusMeta = getStatusMeta(alert.status);

    return `
      <tr class="cursor-pointer transition hover:bg-slate-50" data-alert-id="${alert.id}">
        <td class="px-6 py-4">
          <div class="font-medium text-slate-900">${alert.type}</div>
          <div class="mt-1 text-xs text-slate-400">${alert.id}</div>
        </td>
        <td class="px-6 py-4 text-sm text-slate-600">${alert.stationName}</td>
        <td class="px-6 py-4 text-sm text-slate-600">${formatAlertDateTime(alert.occurredAt)}</td>
        <td class="px-6 py-4">
          <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${severityMeta.tableClass}">${severityMeta.label}</span>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}">${statusMeta.label}</span>
        </td>
      </tr>
    `;
  }).join("");
  renderPagination(totalPages);
}

function bindAlertsEvents() {
  if (alertsEls.searchInput) {
    alertsEls.searchInput.addEventListener("input", (event) => {
      alertsState.query = event.target.value.trim().toLowerCase();
      alertsState.currentPage = 1;
      renderAlertsTable();
    });
  }

  if (alertsEls.severityFilter) {
    alertsEls.severityFilter.addEventListener("change", (event) => {
      alertsState.severity = event.target.value;
      alertsState.currentPage = 1;
      renderAlertsTable();
    });
  }

  if (alertsEls.statusFilter) {
    alertsEls.statusFilter.addEventListener("change", (event) => {
      alertsState.status = event.target.value;
      alertsState.currentPage = 1;
      renderAlertsTable();
    });
  }

  if (alertsEls.tableBody) {
    alertsEls.tableBody.addEventListener("click", (event) => {
      const row = event.target.closest("[data-alert-id]");
      if (!row) return;
      window.location.href = `alert-detail.html?id=${encodeURIComponent(row.dataset.alertId)}`;
    });
  }

  if (alertsEls.pagination) {
    alertsEls.pagination.addEventListener("click", (event) => {
      const pageButton = event.target.closest("[data-page]");
      if (pageButton) {
        alertsState.currentPage = Number(pageButton.dataset.page);
        renderAlertsTable();
        return;
      }

      const navButton = event.target.closest("[data-page-nav]");
      if (!navButton || navButton.hasAttribute("disabled")) return;
      if (navButton.dataset.pageNav === "prev") alertsState.currentPage -= 1;
      if (navButton.dataset.pageNav === "next") alertsState.currentPage += 1;
      renderAlertsTable();
    });
  }
}

async function initAlertsPage() {
  await refreshAlertsFromApi();
  seedAlertsIfNeeded();
  bindAlertsEvents();
  updateNotificationBadge();
  renderAlertsTable();
}

void initAlertsPage().catch((err) => {
  console.error(err);
  seedAlertsIfNeeded();
  bindAlertsEvents();
  updateNotificationBadge();
  renderAlertsTable();
});
