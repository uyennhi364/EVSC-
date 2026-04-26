const FALLBACK_POLES = [];

/** Cố định 10 dòng mỗi trang — đồng bộ với Monitor */
const POLE_PAGE_SIZE = 10;

const state = {
  poles: [...FALLBACK_POLES],
  stations: [],
  query: "",
  statusFilter: "all",
  sortKey: "",
  sortDirection: "asc",
  pendingSortKey: "",
  activePoleId: "",
  editingPoleId: "",
  isEditMode: false,
  pendingToggleAction: "deactivate",
  useApi: false,
  poleListPage: 1,
};

const API_BASE =
  typeof window !== "undefined" && window.EVCS_API_BASE ? String(window.EVCS_API_BASE).replace(/\/$/, "") : "";

const els = {
  searchInput: document.getElementById("poleSearchInput"),
  tableBody: document.getElementById("poleTableBody"),
  emptyState: document.getElementById("poleEmptyState"),
  sortButtons: document.querySelectorAll(".pole-sort-btn[data-sort-key]"),
  statusFilterBtn: document.getElementById("statusFilterBtn"),
  statusPopover: document.getElementById("statusPopover"),
  sortPopover: document.getElementById("poleSortPopover"),
  sortPopoverList: document.getElementById("poleSortPopoverList"),
  listView: document.getElementById("listView"),
  detailView: document.getElementById("detailView"),
  pageTitleSuffix: document.getElementById("pageTitleSuffix"),
  backToListBtn: document.getElementById("backToListBtn"),
  deactivateOverlay: document.getElementById("deactivatePoleOverlay"),
  deactivateTitle: document.getElementById("deactivatePoleTitle"),
  cancelDeactivateBtn: document.getElementById("cancelDeactivatePoleBtn"),
  confirmDeactivateBtn: document.getElementById("confirmDeactivatePoleBtn"),
  deactivateMessage: document.getElementById("deactivatePoleMessage"),
  notifToggle: document.getElementById("notifToggle"),
  notifBadge: document.getElementById("notifBadge"),
  createPoleBtn: document.getElementById("createPoleBtn"),
  formOverlay: document.getElementById("poleFormOverlay"),
  formDrawer: document.getElementById("poleFormDrawer"),
  poleForm: document.getElementById("poleForm"),
  closePoleFormBtn: document.getElementById("closePoleFormBtn"),
  cancelPoleFormBtn: document.getElementById("cancelPoleFormBtn"),
  savePoleFormBtn: document.getElementById("savePoleFormBtn"),
  poleFormTitle: document.getElementById("poleFormTitle"),
  poleFormMetaId: document.getElementById("poleFormMetaId"),
  poleFormMetaDate: document.getElementById("poleFormMetaDate"),
  poleFormError: document.getElementById("poleFormError"),
  poleFormId: document.getElementById("poleFormId"),
  poleFormName: document.getElementById("poleFormName"),
  poleFormActiveCode: document.getElementById("poleFormActiveCode"),
  poleFormCreateQrBtn: document.getElementById("poleFormCreateQrBtn"),
  poleFormManufacturer: document.getElementById("poleFormManufacturer"),
  poleFormModel: document.getElementById("poleFormModel"),
  poleFormStation: document.getElementById("poleFormStation"),
  poleFormConnectorList: document.getElementById("poleFormConnectorList"),
  poleFormConnectorChips: document.getElementById("poleFormConnectorChips"),
  poleFormInstalledAt: document.getElementById("poleFormInstalledAt"),
  poleFormStatus: document.getElementById("poleFormStatus"),
  detailPoleId: document.getElementById("detailPoleId"),
  detailPoleName: document.getElementById("detailPoleName"),
  detailPoleManufacturer: document.getElementById("detailPoleManufacturer"),
  detailPoleModel: document.getElementById("detailPoleModel"),
  detailPoleInstalledAt: document.getElementById("detailPoleInstalledAt"),
  detailPoleStation: document.getElementById("detailPoleStation"),
  detailPoleStatus: document.getElementById("detailPoleStatus"),
  detailPoleDescription: document.getElementById("detailPoleDescription"),
  detailPoleConnectors: document.getElementById("detailPoleConnectors"),
  pagination: document.getElementById("polePagination"),
  pagePrev: document.getElementById("polePagePrev"),
  pageNext: document.getElementById("polePageNext"),
  pageNumbers: document.getElementById("polePageNumbers"),
};

if (els.statusPopover) {
  els.statusFilterItems = els.statusPopover.querySelectorAll(".status-popover__item");
}

const SORT_OPTIONS = {
  activeCode: [
    { direction: "default", label: "Default order" },
    { direction: "asc", label: "Sort A to Z" },
    { direction: "desc", label: "Sort Z to A" },
  ],
  manufacturer: [
    { direction: "default", label: "Default order" },
    { direction: "asc", label: "Sort A to Z" },
    { direction: "desc", label: "Sort Z to A" },
  ],
  installedAt: [
    { direction: "default", label: "Default order" },
    { direction: "desc", label: "Newest first" },
    { direction: "asc", label: "Oldest first" },
  ],
};

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

async function refreshStations() {
  if (!API_BASE || !els.poleFormStation) return;
  try {
    const json = await apiJson("/stations");
    state.stations = Array.isArray(json?.data) ? json.data : [];
  } catch {
    state.stations = [];
  }

  const options = ['<option value="">Select station</option>']
    .concat(
      state.stations.map((station) => `<option value="${station.id}">${station.id} - ${station.name}</option>`)
    )
    .join("");
  els.poleFormStation.innerHTML = options;
}

async function refreshPolesFromApi() {
  if (!API_BASE) return false;
  try {
    const json = await apiJson("/poles");
    state.poles = Array.isArray(json?.data) ? json.data : [];
    state.useApi = true;
    return true;
  } catch {
    state.useApi = false;
    state.poles = [...FALLBACK_POLES];
    return false;
  }
}

function formatDateParts(value) {
  const date = new Date(value);
  return {
    dateLine: date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }),
    timeLine: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
  };
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDrawerMetaDate(date) {
  const timeText = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const dateText = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Create on: ${timeText} ${dateText}`;
}

function renderConnectorChips(value) {
  if (!els.poleFormConnectorChips) return;
  const items = String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split("/")[0].trim());

  els.poleFormConnectorChips.innerHTML = items
    .map(
      (item) => `
        <span class="pole-form-chip">
          <span>${item}</span>
          <span class="pole-form-chip__remove" aria-hidden="true">x</span>
        </span>
      `,
    )
    .join("");
}

function normalizeConnectorPresetValue(pole) {
  const connectors = Array.isArray(pole?.connectors) ? pole.connectors : [];
  const connectorCount = Math.max(1, connectors.length || 1);
  const hasInactive = connectors.some((item) => String(item || "").toLowerCase().includes("inactive"));
  if (hasInactive) return "Connector 1 / Inactive";
  if (connectorCount >= 3) return "Connector 1 / Available|Connector 2 / Available|Connector 3 / Available";
  if (connectorCount === 2) return "Connector 1 / Available|Connector 2 / Available";
  return "Connector 1 / Inactive";
}

function getStatusBadgeClass(status) {
  return status === "Active" ? "status-badge--active" : "status-badge--inactive";
}

function createStatusBadgeHtml(status) {
  return `<span class="status-badge ${getStatusBadgeClass(status)}">${status === "Inactive" ? "Inactive" : "Active"}</span>`;
}

function getPoleById(poleId) {
  return state.poles.find((pole) => pole.id === poleId) || null;
}

function nextPoleId() {
  let max = 0;
  state.poles.forEach((pole) => {
    const match = /^PL(\d+)$/i.exec(pole.id);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return `PL${String(max + 1).padStart(3, "0")}`;
}

function getFilteredPoles() {
  const keyword = state.query.trim().toLowerCase();
  let filtered = state.poles.filter((pole) => {
    if (!keyword) return true;
    return [pole.id, pole.name, pole.activeCode, pole.manufacturer, pole.status, pole.station]
      .some((value) => String(value || "").toLowerCase().includes(keyword));
  });

  if (state.statusFilter !== "all") {
    filtered = filtered.filter((pole) => pole.status.toLowerCase() === state.statusFilter);
  }

  if (!state.sortKey) return filtered;

  return [...filtered].sort((leftPole, rightPole) => {
    const leftValue = state.sortKey === "installedAt" ? new Date(leftPole.installedAt).getTime() : String(leftPole[state.sortKey] || "").toLowerCase();
    const rightValue = state.sortKey === "installedAt" ? new Date(rightPole.installedAt).getTime() : String(rightPole[state.sortKey] || "").toLowerCase();
    if (state.sortKey === "installedAt") {
      return state.sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
    }
    const compared = leftValue.localeCompare(rightValue, undefined, { numeric: true });
    return state.sortDirection === "asc" ? compared : -compared;
  });
}

function getPoleTotalPagesForCount(n) {
  if (n === 0) return 0;
  return Math.ceil(n / POLE_PAGE_SIZE);
}

function clampPoleListPageForCount(n) {
  const total = getPoleTotalPagesForCount(n);
  if (total === 0) {
    state.poleListPage = 1;
    return;
  }
  if (state.poleListPage > total) state.poleListPage = total;
  if (state.poleListPage < 1) state.poleListPage = 1;
}

/**
 * @param {number} total
 * @param {number} current
 * @returns {(number | null)[]}
 */
function getPolePageWindow(total, current) {
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

function renderPolePagination(n) {
  const bar = els.pagination;
  const prevBtn = els.pagePrev;
  const nextBtn = els.pageNext;
  const numbersEl = els.pageNumbers;

  if (!bar) return;

  if (n === 0) {
    bar.classList.add("is-hidden");
    if (numbersEl) numbersEl.innerHTML = "";
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  bar.classList.remove("is-hidden");
  clampPoleListPageForCount(n);
  const totalPages = getPoleTotalPagesForCount(n);

  if (prevBtn) prevBtn.disabled = state.poleListPage <= 1;
  if (nextBtn) nextBtn.disabled = state.poleListPage >= totalPages;

  if (numbersEl) {
    const window = getPolePageWindow(totalPages, state.poleListPage);
    numbersEl.innerHTML = window
      .map((p) => {
        if (p === null) {
          return `<span class="pole-pagination__ellipsis" aria-hidden="true">…</span>`;
        }
        const active = p === state.poleListPage ? " is-active" : "";
        return `<button type="button" class="pole-pager-page${active}" data-pole-page="${p}" aria-label="Page ${p}"${active ? ' aria-current="page"' : ""}>${p}</button>`;
      })
      .join("");

    numbersEl.querySelectorAll("[data-pole-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = Number(btn.getAttribute("data-pole-page"));
        if (!Number.isFinite(page)) return;
        state.poleListPage = page;
        renderTable();
      });
    });
  }
}

function renderSortState() {
  els.sortButtons.forEach((button) => {
    const isActive = button.dataset.sortKey === state.sortKey;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    if (button.dataset.sortKey !== state.pendingSortKey) button.setAttribute("aria-expanded", "false");
  });
}

function updateStatusFilterUi() {
  if (els.statusFilterBtn) {
    const isActive = state.statusFilter !== "all";
    els.statusFilterBtn.classList.toggle("is-active", isActive);
    els.statusFilterBtn.setAttribute("aria-expanded", String(els.statusPopover?.getAttribute("aria-hidden") === "false"));
  }
  if (els.statusFilterItems) {
    els.statusFilterItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.status === state.statusFilter);
    });
  }
}

function positionStatusPopover() {
  if (!els.statusPopover || !els.statusFilterBtn) return;
  const rect = els.statusFilterBtn.getBoundingClientRect();
  const top = rect.bottom + 8;
  const left = Math.min(rect.right - 200, window.innerWidth - 220);
  els.statusPopover.style.top = `${top}px`;
  els.statusPopover.style.left = `${Math.max(8, left)}px`;
}

function renderSortPopover() {
  if (!els.sortPopoverList) return;
  const options = SORT_OPTIONS[state.pendingSortKey] || [];
  els.sortPopoverList.innerHTML = options
    .map((option) => {
      const isActive =
        option.direction === "default"
          ? state.sortKey !== state.pendingSortKey
          : state.sortKey === state.pendingSortKey && state.sortDirection === option.direction;
      return `<li class="status-popover__item${isActive ? " active" : ""}" data-sort-direction="${option.direction}">${option.label}</li>`;
    })
    .join("");
}

function positionSortPopover(anchorButton) {
  if (!els.sortPopover || !anchorButton) return;
  const rect = anchorButton.getBoundingClientRect();
  const top = rect.bottom + 8;
  const left = Math.min(rect.right - 200, window.innerWidth - 220);
  els.sortPopover.style.top = `${top}px`;
  els.sortPopover.style.left = `${Math.max(8, left)}px`;
}

function isSortPopoverOpen() {
  return !!(els.sortPopover && els.sortPopover.getAttribute("aria-hidden") === "false");
}

function openSortPopover(sortKey, anchorButton) {
  if (!els.sortPopover || !anchorButton) return;
  state.pendingSortKey = sortKey;
  renderSortPopover();
  positionSortPopover(anchorButton);
  els.sortPopover.setAttribute("aria-hidden", "false");
  anchorButton.setAttribute("aria-expanded", "true");
}

function closeSortPopover() {
  if (!els.sortPopover) return;
  els.sortPopover.setAttribute("aria-hidden", "true");
  state.pendingSortKey = "";
  els.sortButtons.forEach((button) => button.setAttribute("aria-expanded", "false"));
}

function openStatusPopover() {
  if (!els.statusPopover || !els.statusFilterBtn) return;
  positionStatusPopover();
  els.statusPopover.setAttribute("aria-hidden", "false");
  els.statusFilterBtn.setAttribute("aria-expanded", "true");
}

function closeStatusPopover() {
  if (!els.statusPopover || !els.statusFilterBtn) return;
  els.statusPopover.setAttribute("aria-hidden", "true");
  els.statusFilterBtn.setAttribute("aria-expanded", "false");
}

function isStatusPopoverOpen() {
  return !!(els.statusPopover && els.statusPopover.getAttribute("aria-hidden") === "false");
}

function setStatusFilter(value) {
  state.statusFilter = value;
  updateStatusFilterUi();
  renderTable(true);
}

function updateNotificationBadge() {
  if (!els.notifBadge || typeof getOpenAlertsCount !== "function") return;
  const count = getOpenAlertsCount();
  els.notifBadge.textContent = String(count);
  els.notifBadge.classList.toggle("is-hidden", count === 0);
}

function bindTableActionButtons() {
  if (!els.tableBody) return;

  els.tableBody.querySelectorAll('button[data-action="toggle"]').forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openDeactivateModal(button.dataset.poleId);
    };
  });

  els.tableBody.querySelectorAll('button[data-action="edit"]').forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPoleForm(getPoleById(button.dataset.poleId));
    };
  });
}

function renderTable(resetPage = false) {
  if (resetPage) state.poleListPage = 1;
  const poles = getFilteredPoles();
  const n = poles.length;
  clampPoleListPageForCount(n);

  if (!n) {
    els.tableBody.innerHTML = "";
    if (els.emptyState) {
      els.emptyState.hidden = false;
      els.emptyState.classList.add("is-visible");
    }
    renderSortState();
    renderPolePagination(0);
    return;
  }

  if (els.emptyState) {
    els.emptyState.hidden = true;
    els.emptyState.classList.remove("is-visible");
  }

  const start = (state.poleListPage - 1) * POLE_PAGE_SIZE;
  const pagePoles = poles.slice(start, start + POLE_PAGE_SIZE);

  els.tableBody.innerHTML = pagePoles
    .map((pole) => {
      const installedAt = formatDateParts(pole.installedAt);
      const selectedClass = state.activePoleId === pole.id ? " is-selected" : "";
      return `
        <tr class="${selectedClass.trim()}" data-pole-row="${pole.id}">
          <td><a href="#" class="pole-id-link station-id" data-action="view" data-pole-id="${pole.id}">${pole.id}</a></td>
          <td>${pole.name}</td>
          <td>${pole.activeCode}</td>
          <td>${pole.manufacturer}</td>
          <td class="pole-installed-at">
            <span class="pole-installed-at__date">${installedAt.dateLine}</span>
            <span class="pole-installed-at__time">${installedAt.timeLine}</span>
          </td>
          <td>${createStatusBadgeHtml(pole.status)}</td>
          <td>
            <div class="row-actions pole-row-actions">
              <button
                type="button"
                class="pole-toggle${pole.status === "Active" ? " is-on" : ""}"
                data-action="toggle"
                data-pole-id="${pole.id}"
                aria-label="${pole.status === "Active" ? "Turn off" : "Turn on"} pole"
                title="${pole.status === "Active" ? "ON" : "OFF"}"
              >
                <span class="pole-toggle__text pole-toggle__text--on">ON</span>
                <span class="pole-toggle__thumb" aria-hidden="true"></span>
                <span class="pole-toggle__text pole-toggle__text--off">OFF</span>
              </button>
              <button type="button" class="edit-btn" data-action="edit" data-pole-id="${pole.id}" aria-label="Edit pole" title="Edit">
                <span class="material-symbols-outlined" aria-hidden="true">edit_square</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  renderSortState();
  updateStatusFilterUi();
  bindTableActionButtons();
  renderPolePagination(n);
}

function fillDetailModal(pole) {
  els.detailPoleId.textContent = pole.id;
  els.detailPoleName.textContent = pole.name;
  els.detailPoleManufacturer.textContent = pole.manufacturer;
  if (els.detailPoleModel) els.detailPoleModel.textContent = pole.model || "-";
  if (els.detailPoleStation) els.detailPoleStation.textContent = pole.station ? `${pole.stationId} - ${pole.station}` : "-";
  els.detailPoleInstalledAt.textContent = new Date(pole.installedAt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  els.detailPoleStatus.innerHTML = createStatusBadgeHtml(pole.status);
  els.detailPoleDescription.textContent = pole.activeCode;
  if (els.detailPoleConnectors) {
    els.detailPoleConnectors.innerHTML = `<ul>${(pole.connectors || []).map((connector) => `<li>${connector}</li>`).join("")}</ul>`;
  }
}

function openDetailView(poleId) {
  const pole = getPoleById(poleId);
  if (!pole) return;

  state.activePoleId = poleId;
  fillDetailModal(pole);
  renderTable();
  if (els.listView) els.listView.classList.add("is-hidden");
  if (els.detailView) els.detailView.classList.remove("is-hidden");
  if (els.pageTitleSuffix) {
    els.pageTitleSuffix.innerHTML = `<span class="page-title__sep" aria-hidden="true"> &gt; </span><span class="page-title__base">${pole.id}</span>`;
    els.pageTitleSuffix.classList.remove("is-hidden");
  }
}

function closeDetailView() {
  state.activePoleId = "";
  if (els.detailView) els.detailView.classList.add("is-hidden");
  if (els.listView) els.listView.classList.remove("is-hidden");
  if (els.pageTitleSuffix) {
    els.pageTitleSuffix.textContent = "";
    els.pageTitleSuffix.classList.add("is-hidden");
  }
  renderTable();
}

function openDeactivateModal(poleId) {
  const pole = getPoleById(poleId);
  if (!pole) return;

  state.activePoleId = poleId;
  state.pendingToggleAction = pole.status === "Active" ? "deactivate" : "activate";
  if (els.deactivateTitle) {
    els.deactivateTitle.textContent = state.pendingToggleAction === "activate" ? "Activate Pole?" : "Deactivate Pole?";
  }
  if (els.deactivateMessage) {
    els.deactivateMessage.textContent =
      state.pendingToggleAction === "activate"
        ? `Are you sure you want to activate ${pole.id}?`
        : `Are you sure you want to deactivate ${pole.id}?`;
  }
  if (els.deactivateOverlay) {
    els.deactivateOverlay.classList.add("is-open");
    els.deactivateOverlay.setAttribute("aria-hidden", "false");
  }
}

function closeDeactivateModal() {
  if (els.deactivateOverlay) {
    els.deactivateOverlay.classList.remove("is-open");
    els.deactivateOverlay.setAttribute("aria-hidden", "true");
  }
  state.pendingToggleAction = "deactivate";
}

function showFormError(message = "") {
  if (!els.poleFormError) return;
  els.poleFormError.textContent = message;
}

function setStationOptions(selectedValue = "") {
  if (!els.poleFormStation) return;
  const options = ['<option value="">Select station</option>']
    .concat(
      state.stations.map((station) => `<option value="${station.id}"${station.id === selectedValue ? " selected" : ""}>${station.id} - ${station.name}</option>`)
    )
    .join("");
  els.poleFormStation.innerHTML = options;
}

function openPoleForm(pole = null) {
  state.isEditMode = !!pole;
  state.editingPoleId = pole ? pole.id : "";
  showFormError("");
  const draftId = pole ? pole.id : nextPoleId();

  if (els.poleFormTitle) els.poleFormTitle.textContent = pole ? "Edit" : "Create new";
  if (els.savePoleFormBtn) els.savePoleFormBtn.textContent = pole ? "Update" : "Save";
  if (els.poleFormMetaId) els.poleFormMetaId.textContent = `ID: ${draftId}`;
  if (els.poleFormMetaDate) els.poleFormMetaDate.textContent = formatDrawerMetaDate(new Date());
  if (els.poleFormId) els.poleFormId.value = draftId;
  if (els.poleFormName) els.poleFormName.value = pole ? pole.name : "";
  if (els.poleFormActiveCode) els.poleFormActiveCode.value = pole ? pole.activeCode : draftId;
  if (els.poleFormCreateQrBtn) els.poleFormCreateQrBtn.textContent = pole ? "See Code" : "Generate Code";
  if (els.poleFormManufacturer) els.poleFormManufacturer.value = pole ? pole.manufacturer : "";
  if (els.poleFormModel) els.poleFormModel.value = pole ? pole.model : "";
  setStationOptions(pole ? pole.stationId : "");
  if (els.poleFormConnectorList) {
    els.poleFormConnectorList.value = pole ? normalizeConnectorPresetValue(pole) : "";
    renderConnectorChips(els.poleFormConnectorList.value);
  }
  if (els.poleFormInstalledAt) {
    const raw = pole ? pole.installedAt : new Date().toISOString();
    els.poleFormInstalledAt.value = raw.slice(0, 16);
  }
  if (els.poleFormStatus) els.poleFormStatus.value = pole ? pole.status : "Active";

  if (els.formOverlay) {
    els.formOverlay.classList.add("is-open");
    els.formOverlay.setAttribute("aria-hidden", "false");
  }
  if (els.formDrawer) {
    els.formDrawer.classList.add("is-open");
    els.formDrawer.setAttribute("aria-hidden", "false");
  }
}

function closePoleForm() {
  if (els.formOverlay) {
    els.formOverlay.classList.remove("is-open");
    els.formOverlay.setAttribute("aria-hidden", "true");
  }
  if (els.formDrawer) {
    els.formDrawer.classList.remove("is-open");
    els.formDrawer.setAttribute("aria-hidden", "true");
  }
  state.isEditMode = false;
  state.editingPoleId = "";
  showFormError("");
  if (els.poleFormConnectorChips) els.poleFormConnectorChips.innerHTML = "";
}

async function savePoleForm(event) {
  event.preventDefault();
  const wasEditMode = state.isEditMode;
  const editingPoleId = state.editingPoleId;

  const payload = {
    id: els.poleFormId ? els.poleFormId.value : nextPoleId(),
    name: els.poleFormName ? els.poleFormName.value.trim() : "",
    activeCode: els.poleFormActiveCode ? els.poleFormActiveCode.value.trim() : "",
    manufacturer: els.poleFormManufacturer ? els.poleFormManufacturer.value.trim() : "",
    model: els.poleFormModel ? els.poleFormModel.value.trim() : "",
    stationId: els.poleFormStation ? els.poleFormStation.value.trim() : "",
    installedAt: els.poleFormInstalledAt ? els.poleFormInstalledAt.value.trim() : "",
    status: els.poleFormStatus ? els.poleFormStatus.value : "Active",
    connectors: (els.poleFormConnectorList ? els.poleFormConnectorList.value : "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
  };

  if (!payload.connectors.length && state.isEditMode && state.editingPoleId) {
    const existing = getPoleById(state.editingPoleId);
    if (existing?.connectors?.length) payload.connectors = [...existing.connectors];
  }

  if (!payload.name || !payload.manufacturer || !payload.model || !payload.stationId || !payload.installedAt || !payload.connectors.length) {
    showFormError("Please fill in all required fields.");
    return;
  }

  if (state.useApi) {
    try {
      if (wasEditMode && editingPoleId) {
        await apiJson(`/poles/${encodeURIComponent(editingPoleId)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiJson("/poles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await refreshPolesFromApi();
      closePoleForm();
      renderTable();
      if (state.activePoleId && getPoleById(state.activePoleId)) fillDetailModal(getPoleById(state.activePoleId));
      if (wasEditMode && editingPoleId && state.activePoleId === editingPoleId) {
        const updatedPole = getPoleById(editingPoleId);
        if (updatedPole) fillDetailModal(updatedPole);
      }
      window.alert(wasEditMode ? "Pole updated successfully." : "Pole created successfully.");
      return;
    } catch (error) {
      showFormError(error.message || "Unable to save pole.");
      return;
    }
  }

  const localPole = {
    ...payload,
    station: state.stations.find((station) => station.id === payload.stationId)?.name || payload.stationId,
    description: payload.activeCode,
  };

  if (wasEditMode && editingPoleId) {
    state.poles = state.poles.map((pole) => (pole.id === editingPoleId ? localPole : pole));
  } else {
    state.poles = [localPole, ...state.poles];
  }

  closePoleForm();
  renderTable();
  if (wasEditMode && editingPoleId && state.activePoleId === editingPoleId) {
    const updatedPole = getPoleById(editingPoleId);
    if (updatedPole) fillDetailModal(updatedPole);
  }
  window.alert(wasEditMode ? "Pole updated successfully." : "Pole created successfully.");
}

async function toggleActivePoleStatus() {
  const pole = getPoleById(state.activePoleId);
  if (!pole) return;

  const nextStatus = state.pendingToggleAction === "activate" ? "Active" : "Inactive";

  if (state.useApi) {
    try {
      await apiJson(`/poles/${encodeURIComponent(pole.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await refreshPolesFromApi();
    } catch (error) {
      window.alert(error.message || "Unable to update pole status.");
      return;
    }
  } else {
    pole.status = nextStatus;
    pole.connectors = pole.connectors.map((connector, index) => `Connector ${index + 1} / ${nextStatus === "Inactive" ? "Inactive" : "Available"}`);
  }

  closeDeactivateModal();
  const updatedPole = getPoleById(state.activePoleId);
  if (updatedPole && els.detailView && !els.detailView.classList.contains("is-hidden")) {
    fillDetailModal(updatedPole);
  }
  renderTable();
}

function bindEvents() {
  if (els.searchInput) {
    els.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderTable(true);
    });
  }

  els.sortButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const key = button.dataset.sortKey;
      if (isSortPopoverOpen() && state.pendingSortKey === key) closeSortPopover();
      else {
        closeStatusPopover();
        openSortPopover(key, button);
      }
    });
  });

  if (els.statusFilterBtn) {
    els.statusFilterBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isStatusPopoverOpen()) closeStatusPopover();
      else {
        closeSortPopover();
        openStatusPopover();
      }
    });
  }

  if (els.statusPopover) {
    els.statusPopover.addEventListener("click", (event) => {
      const item = event.target.closest(".status-popover__item");
      if (!item) return;
      setStatusFilter(item.dataset.status);
      closeStatusPopover();
    });
  }

  document.addEventListener("pointerdown", (event) => {
    if (isStatusPopoverOpen() && !els.statusPopover.contains(event.target) && !els.statusFilterBtn.contains(event.target)) {
      closeStatusPopover();
    }
    if (isSortPopoverOpen() && !els.sortPopover.contains(event.target) && !event.target.closest(".pole-sort-btn[data-sort-key]")) {
      closeSortPopover();
    }
  });

  window.addEventListener("resize", () => {
    if (isStatusPopoverOpen()) positionStatusPopover();
    if (isSortPopoverOpen()) {
      const activeButton = document.querySelector(`.pole-sort-btn[data-sort-key="${state.pendingSortKey}"]`);
      if (activeButton) positionSortPopover(activeButton);
    }
  });

  if (els.sortPopover) {
    els.sortPopover.addEventListener("click", (event) => {
      const item = event.target.closest("[data-sort-direction]");
      if (!item || !state.pendingSortKey) return;
      if (item.dataset.sortDirection === "default") {
        state.sortKey = "";
        state.sortDirection = "asc";
      } else {
        state.sortKey = state.pendingSortKey;
        state.sortDirection = item.dataset.sortDirection;
      }
      closeSortPopover();
      renderTable(true);
    });
  }

  if (els.pagePrev) {
    els.pagePrev.addEventListener("click", () => {
      if (state.poleListPage > 1) {
        state.poleListPage -= 1;
        renderTable();
      }
    });
  }

  if (els.pageNext) {
    els.pageNext.addEventListener("click", () => {
      const total = getPoleTotalPagesForCount(getFilteredPoles().length);
      if (state.poleListPage < total) {
        state.poleListPage += 1;
        renderTable();
      }
    });
  }

  if (els.tableBody) {
    els.tableBody.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-action]");
      if (trigger) {
        event.preventDefault();
        const { action, poleId } = trigger.dataset;
        if (action === "view") {
          openDetailView(poleId);
          return;
        }
      }

      const row = event.target.closest("[data-pole-row]");
      if (row) openDetailView(row.dataset.poleRow);
    });
  }

  if (els.backToListBtn) els.backToListBtn.addEventListener("click", closeDetailView);
  if (els.cancelDeactivateBtn) els.cancelDeactivateBtn.addEventListener("click", closeDeactivateModal);
  if (els.confirmDeactivateBtn) els.confirmDeactivateBtn.addEventListener("click", () => void toggleActivePoleStatus());

  if (els.deactivateOverlay) {
    els.deactivateOverlay.addEventListener("click", (event) => {
      if (event.target === els.deactivateOverlay) closeDeactivateModal();
    });
  }

  if (els.notifToggle) {
    els.notifToggle.addEventListener("click", () => {
      if (typeof openAlertsPage === "function") openAlertsPage();
      else window.location.href = "alerts.html";
    });
  }

  if (els.createPoleBtn) els.createPoleBtn.addEventListener("click", () => openPoleForm());
  if (els.closePoleFormBtn) els.closePoleFormBtn.addEventListener("click", closePoleForm);
  if (els.cancelPoleFormBtn) els.cancelPoleFormBtn.addEventListener("click", closePoleForm);

  if (els.formOverlay) {
    els.formOverlay.addEventListener("click", (event) => {
      if (event.target === els.formOverlay) closePoleForm();
    });
  }

  if (els.poleFormCreateQrBtn) {
    els.poleFormCreateQrBtn.addEventListener("click", () => {
      if (!els.poleFormActiveCode) return;
      // Generate random 5-digit code
      const randomCode = String(Math.floor(10000 + Math.random() * 90000));
      els.poleFormActiveCode.value = randomCode;
    });
  }

  if (els.poleFormConnectorList) {
    els.poleFormConnectorList.addEventListener("change", (event) => {
      renderConnectorChips(event.target.value);
    });
  }

  if (els.poleForm) {
    els.poleForm.addEventListener("submit", (event) => void savePoleForm(event));
  }
}

async function init() {
  if (typeof seedAlertsIfNeeded === "function") seedAlertsIfNeeded();
  await refreshStations();
  await refreshPolesFromApi();
  bindEvents();
  updateNotificationBadge();
  renderTable();
}

void init().catch((error) => {
  console.error(error);
  bindEvents();
  updateNotificationBadge();
  renderTable();
});
