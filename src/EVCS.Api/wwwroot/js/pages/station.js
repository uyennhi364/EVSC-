const DEFAULT_STATIONS = [
  {
    id: "ST001",
    name: "Station 1",
    address: "123 Main Street, Anytown, CA 90210, USA",
    latitude: "10.762622",
    longitude: "106.660172",
    status: "Active",
    operationTime: "24/7",
    createdAt: "2025-07-29T10:45:00",
    connectors: [
      { name: "Connector 1 - CCS2", status: "Available" },
      { name: "Connector 2 - Type 2", status: "In Use" }
    ]
  },
  {
    id: "ST002",
    name: "Station 2",
    address: "456 Lake Road, District 7, Ho Chi Minh City",
    latitude: "10.729700",
    longitude: "106.721000",
    status: "Active",
    operationTime: "06:00 - 23:00",
    createdAt: "2025-07-29T10:45:00",
    connectors: [
      { name: "Connector 1 - CCS2", status: "Maintenance" },
      { name: "Connector 2 - CHAdeMO", status: "Available" },
      { name: "Connector 3 - Type 2", status: "Available" }
    ]
  },
  {
    id: "ST003",
    name: "Station 3",
    address: "12 Nguyen Hue, District 1, Ho Chi Minh City",
    latitude: "10.776530",
    longitude: "106.700981",
    status: "Inactive",
    operationTime: "08:00 - 20:00",
    createdAt: "2025-07-29T10:45:00",
    connectors: [{ name: "Connector 1 - CCS2", status: "Inactive" }]
  }
];

const POLE_PRESETS = {
  "pole-1": [{ name: "Connector 1 - Type 2", status: "Available" }],
  "pole-2": [
    { name: "Connector 1 - CCS2", status: "Available" },
    { name: "Connector 2 - Type 2", status: "Available" }
  ],
  "pole-3": [
    { name: "Connector 1 - CCS2", status: "Available" },
    { name: "Connector 2 - CHAdeMO", status: "Available" },
    { name: "Connector 3 - Type 2", status: "Available" }
  ]
};

const STORAGE_KEY = "evcStations.v1";

const STATION_API_BASE =
  typeof window !== "undefined" && window.EVCS_API_BASE ? String(window.EVCS_API_BASE).replace(/\/$/, "") : "";
let stationsUseApi = false;

async function stationsJson(path, options = {}) {
  const url = `${STATION_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j && j.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function refreshStationsFromApi() {
  if (!STATION_API_BASE) return false;
  try {
    const json = await stationsJson("/stations");
    stations = Array.isArray(json.data) ? json.data : [];
    filteredStations = [...stations];
    stationsUseApi = true;
    return true;
  } catch {
    stationsUseApi = false;
    return false;
  }
}

async function patchStationStatusRemote(stationId, status) {
  await stationsJson(`/stations/${encodeURIComponent(stationId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  await refreshStationsFromApi();
}

function loadStationsFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_STATIONS];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_STATIONS];

    return parsed;
  } catch (e) {
    return [...DEFAULT_STATIONS];
  }
}

function saveStationsToStorage() {
  if (stationsUseApi) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stations));
  } catch (e) {
    // ignore (no storage / quota exceeded)
  }
}

let stations = loadStationsFromStorage();

let filteredStations = [...stations];
let currentStation = null;
let currentAction = null;
let editMode = false;
let editingStationId = null;
let deactivatingStationId = null;
let stationToggleAction = "deactivate";
let currentStatusFilter = "all";
let currentPage = 1;
let selectedPoleValues = [];

/** Đồng bộ với Monitor và Poles: 10 mục mỗi trang */
const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

const els = {
  tableBody: document.getElementById("stationTableBody"),
  stationPagination: document.getElementById("stationPagination"),
  listView: document.getElementById("listView"),
  detailView: document.getElementById("detailView"),
  stationActionView: document.getElementById("stationActionView"),
  searchInput: document.getElementById("searchInput"),
  searchClearBtn: document.getElementById("searchClearBtn"),
  statusFilterBtn: document.getElementById("statusFilterBtn"),
  statusPopover: document.getElementById("statusPopover"),
  pageTitleSuffix: document.getElementById("pageTitleSuffix"),
  backToListBtn: document.getElementById("backToListBtn"),
  backIconBtn: document.getElementById("backIconBtn"),
  createBtn: document.getElementById("createBtn"),
  updateBtn: document.getElementById("updateBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  dName: document.getElementById("d-name"),
  dId: document.getElementById("d-id"),
  dAddress: document.getElementById("d-address"),
  dLocation: document.getElementById("d-location"),
  dStatus: document.getElementById("d-status"),
  dOperationTime: document.getElementById("d-operation-time"),
  dConnectors: document.getElementById("d-connectors"),
  detailDeleteBtn: document.getElementById("detailDeleteBtn"),
  actionViewTitle: document.getElementById("actionViewTitle"),
  actionViewDescription: document.getElementById("actionViewDescription"),
  actionStationMeta: document.getElementById("actionStationMeta"),
  actionConfirmBtn: document.getElementById("actionConfirmBtn"),
  actionCancelBtn: document.getElementById("actionCancelBtn"),
  backToDetailBtn: document.getElementById("backToDetailBtn"),
  createBackdrop: document.getElementById("createStationBackdrop"),
  createPanel: document.getElementById("createStationPanel"),
  createForm: document.getElementById("createStationForm"),
  createStationTitle: document.getElementById("createStationTitle"),
  createDraftId: document.getElementById("createStationDraftId"),
  createDraftDate: document.getElementById("createStationDraftDate"),
  createCloseBtn: document.getElementById("createStationCloseBtn"),
  createCancelBtn: document.getElementById("createStationCancelBtn"),
  createStationName: document.getElementById("createStationName"),
  createLatitude: document.getElementById("createLatitude"),
  createLongitude: document.getElementById("createLongitude"),
  createAddress: document.getElementById("createAddress"),
  createOperationTime: document.getElementById("createOperationTime"),
  createStatus: document.getElementById("createStatus"),
  createStatusToggle: document.getElementById("createStatusToggle"),
  createStatusToggleLabel: document.getElementById("createStatusToggleLabel"),
  createPoleList: document.getElementById("createPoleList"),
  createPoleChips: document.getElementById("createPoleChips"),
  createSaveBtn: document.getElementById("createStationSaveBtn"),
  createDeleteBtn: document.getElementById("createStationDeleteBtn"),
  createFormError: document.getElementById("createStationFormError"),
  deleteConfirmBackdrop: document.getElementById("deleteConfirmBackdrop"),
  deleteConfirmModal: document.getElementById("deleteConfirmModal"),
  deleteConfirmCloseBtn: document.getElementById("deleteConfirmCloseBtn"),
  deleteConfirmNoBtn: document.getElementById("deleteConfirmNoBtn"),
  deleteConfirmYesBtn: document.getElementById("deleteConfirmYesBtn"),
  deactivateStationOverlay: document.getElementById("deactivateStationOverlay"),
  deactivateStationTitle: document.getElementById("deactivateStationTitle"),
  deactivateStationMessage: document.getElementById("deactivateStationMessage"),
  deactivateStationCancelBtn: document.getElementById("deactivateStationCancelBtn"),
  deactivateStationConfirmBtn: document.getElementById("deactivateStationConfirmBtn")
};

if (els.statusPopover) {
  els.statusFilterItems = els.statusPopover.querySelectorAll(".status-popover__item");
}

function nextStationId() {
  let max = 0;
  for (const s of stations) {
    const m = /^ST(\d+)$/i.exec(s.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `ST${String(max + 1).padStart(3, "0")}`;
}

function formatDraftCreatedOn(date) {
  const s = date.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return `Create on: ${s}`;
}

function formatEditUpdatedOn(date) {
  const s = date.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return `Updating on: ${s}`;
}

function getStatusClass(status) {
  switch (status) {
    case "Active":
      return "status-badge--active";
    case "Inactive":
      return "status-badge--inactive";
    case "Maintenance":
      return "status-badge--warning";
    default:
      return "status-badge--default";
  }
}

function getStatusFilterValue(status) {
  if (status === "Active") return "active";
  if (status === "Inactive") return "inactive";
  return "other";
}

function getStatusBadgeLabel(status) {
  if (status === "Active") return "Active";
  if (status === "Inactive") return "Inactive";
  return status || "Unknown";
}

function createStatusBadgeHtml(status) {
  const label = getStatusBadgeLabel(status);
  return `<span class="status-badge ${getStatusClass(status)}">${label}</span>`;
}

function getConnectorStatusLabel(status) {
  switch (status) {
    case "Available":
      return "Available";
    case "In Use":
      return "In Use";
    case "Maintenance":
      return "Maintenance";
    case "Inactive":
      return "Inactive";
    default:
      return status || "Unknown";
  }
}

function getConnectorLabel(name) {
  return (name || "").replace(/^Connector/i, "Connector");
}

function updateCreateStatusToggleLegacy1() {
  if (!els.createStatusToggle || !els.createStatus || !els.createStatusToggleLabel) return;
  const isActive = els.createStatus.value !== "Inactive";
  els.createStatusToggle.classList.toggle("is-inactive", !isActive);
  els.createStatusToggle.setAttribute("aria-checked", String(isActive));
  els.createStatusToggleLabel.textContent = isActive ? "Active" : "Inactive";
}

function renderPoleChipsLegacy1() {
  if (!els.createPoleChips || !els.createPoleList) return;
  const options = [...els.createPoleList.options].filter((option) => option.value);
  els.createPoleChips.innerHTML = options
    .map(
      (option) =>
        `<span class="create-pole-chip${option.value === els.createPoleList.value ? " is-selected" : ""}">${option.text}<span class="create-pole-chip__remove" aria-hidden="true">×</span></span>`
    )
    .join("");
}

function openCreateStationDrawerLegacy1(station = null) {
  if (!els.createBackdrop || !els.createPanel || !els.createForm) return;

  currentAction = null;
  editMode = !!station;
  editingStationId = station ? station.id : null;
  syncPoleOptionLabels();

  const draftId = station ? station.id : nextStationId();
  if (els.createDraftId) els.createDraftId.textContent = `ID: ${draftId}`;
  if (els.createDraftDate) {
    els.createDraftDate.textContent = station
      ? formatEditUpdatedOn(new Date())
      : formatDraftCreatedOn(new Date());
  }
  if (els.createSaveBtn) els.createSaveBtn.textContent = station ? "Update" : "Save";
  if (els.createDeleteBtn) els.createDeleteBtn.classList.toggle("is-hidden", !station);
  if (els.createStationTitle) els.createStationTitle.textContent = station ? "Edit" : "Create new";
  if (els.createPanel) {
    els.createPanel.classList.toggle("edit-mode", !!station);
    els.createPanel.classList.toggle("legacy-create-mode", !station);
  }
  if (els.createStatusToggle) els.createStatusToggle.classList.toggle("is-hidden", !station);
  if (els.createPoleChips) els.createPoleChips.classList.toggle("is-hidden", !station);
  if (els.createPanel) {
    els.createPanel.classList.toggle("legacy-create-mode", !station);
    els.createPanel.classList.toggle("edit-mode", !!station);
  }
  if (els.createStatusToggle) els.createStatusToggle.classList.toggle("is-hidden", !station);
  if (els.createPoleChips) els.createPoleChips.classList.toggle("is-hidden", !station);
  if (els.createPanel) els.createPanel.classList.toggle("legacy-create-mode", !station);
  if (els.createStatusToggle) els.createStatusToggle.classList.toggle("is-hidden", !station);
  if (els.createPoleChips) els.createPoleChips.classList.toggle("is-hidden", !station);

  els.createForm.reset();
  hideCreateError();

  if (station) {
    selectedPoleValues = normalizeSelectedPoles(
      Array.from({ length: Math.min(3, (station.connectors || []).length) }, (_, index) => `pole-${index + 1}`)
    );
    if (els.createStationName) els.createStationName.value = station.name;
    if (els.createLatitude) els.createLatitude.value = station.latitude;
    if (els.createLongitude) els.createLongitude.value = station.longitude;
    if (els.createAddress) els.createAddress.value = station.address;
    if (els.createOperationTime) els.createOperationTime.value = station.operationTime || "24/7";
    if (els.createStatus) els.createStatus.value = station.status || "Active";
    if (els.createPoleList) {
      const presetKey = Object.keys(POLE_PRESETS).find((key) => {
        const preset = POLE_PRESETS[key];
        return preset.length === (station.connectors || []).length;
      });
      els.createPoleList.value = presetKey || "pole-1";
    }
  } else {
    selectedPoleValues = [];
    if (els.createOperationTime) els.createOperationTime.value = "24/7";
    if (els.createStatus) els.createStatus.value = "Active";
    if (els.createPoleList) els.createPoleList.value = "";
  }

  updateCreateStatusToggle();
  renderPoleChips();

  if (els.stationActionView) els.stationActionView.classList.add("is-hidden");
  els.createBackdrop.classList.add("is-open");
  els.createPanel.classList.add("is-open");
  els.createBackdrop.setAttribute("aria-hidden", "false");
  els.createPanel.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  requestAnimationFrame(() => {
    if (els.createStationName) els.createStationName.focus();
  });
}

function toggleCreateStatusLegacy1() {
  if (!els.createStatus) return;
  els.createStatus.value =
    getStatusFilterValue(els.createStatus.value) === "inactive" ? "Active" : "Inactive";
  updateCreateStatusToggle();
}

function stationHasActivePoles(station) {
  if (!station || !Array.isArray(station.connectors)) return false;
  return station.connectors.some((connector) => connector.status !== "Inactive");
}

function isDuplicateStationData({ name, address, latitude, longitude }, excludeId = null) {
  const normalizedName = name.trim().toLowerCase();
  const normalizedAddress = address.trim().toLowerCase();
  const normalizedLatitude = String(latitude).trim();
  const normalizedLongitude = String(longitude).trim();

  return stations.some((station) => {
    if (excludeId && station.id === excludeId) return false;
    return (
      (station.name.trim().toLowerCase() === normalizedName &&
        station.address.trim().toLowerCase() === normalizedAddress) ||
      (String(station.latitude).trim() === normalizedLatitude &&
        String(station.longitude).trim() === normalizedLongitude)
    );
  });
}

function findStationById(stationId) {
  return stations.find((station) => station.id === stationId) || null;
}

function applySearchFilter() {
  const keyword = els.searchInput ? els.searchInput.value.trim().toLowerCase() : "";
  filteredStations = stations.filter((station) => {
    const searchMatch =
      station.id.toLowerCase().includes(keyword) ||
      station.name.toLowerCase().includes(keyword) ||
      station.address.toLowerCase().includes(keyword);

    const statusFilterValue = getStatusFilterValue(station.status);
    const statusMatch =
      currentStatusFilter === "all" || statusFilterValue === currentStatusFilter;

    return searchMatch && statusMatch;
  });
  currentPage = 1;
  renderTable();
}

function setStatusFilter(value) {
  if (!STATUS_FILTERS.some((item) => item.value === value)) return;
  currentStatusFilter = value;
  if (els.statusFilterItems) {
    els.statusFilterItems.forEach((item) => {
      const selected = item.dataset.status === value;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
  }
  syncStatusFilterButtonState();
  applySearchFilter();
}

function syncStatusFilterButtonState(forceOpen = false) {
  if (!els.statusFilterBtn) return;
  els.statusFilterBtn.classList.toggle("active", forceOpen);
}

function isStatusPopoverOpen() {
  return !!(els.statusPopover && els.statusPopover.getAttribute("aria-hidden") === "false");
}

function positionStatusPopover() {
  if (!els.statusFilterBtn || !els.statusPopover) return;
  const btnRect = els.statusFilterBtn.getBoundingClientRect();
  const popoverWidth = els.statusPopover.offsetWidth || 200;
  let left = btnRect.right - popoverWidth;
  if (left < 8) left = 8;
  if (left + popoverWidth > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - popoverWidth - 8);
  }

  let top = btnRect.bottom + 8;
  const popoverHeight = els.statusPopover.offsetHeight || 160;
  if (top + popoverHeight > window.innerHeight - 8) {
    top = Math.max(8, btnRect.top - popoverHeight - 8);
  }

  els.statusPopover.style.left = `${left}px`;
  els.statusPopover.style.top = `${top}px`;
}

function openStatusPopover() {
  if (!els.statusPopover || !els.statusFilterBtn) return;
  positionStatusPopover();
  els.statusPopover.setAttribute("aria-hidden", "false");
  els.statusFilterBtn.setAttribute("aria-expanded", "true");
  syncStatusFilterButtonState(true);
}

function closeStatusPopover() {
  if (!els.statusPopover || !els.statusFilterBtn) return;
  els.statusPopover.setAttribute("aria-hidden", "true");
  els.statusFilterBtn.setAttribute("aria-expanded", "false");
  syncStatusFilterButtonState();
}

function updateSearchClearVisibility() {
  if (!els.searchClearBtn || !els.searchInput) return;
  const has = els.searchInput.value.trim().length > 0;
  els.searchClearBtn.classList.toggle("is-hidden", !has);
}

function hideCreateError() {
  if (!els.createFormError) return;
  els.createFormError.classList.add("is-hidden");
  els.createFormError.textContent = "";
}

function showCreateError(message) {
  if (!els.createFormError) return;
  els.createFormError.textContent = message;
  els.createFormError.classList.remove("is-hidden");
}

function openCreateStationDrawerLegacy2(station = null) {
  if (!els.createBackdrop || !els.createPanel || !els.createForm) return;

  currentAction = null;
  editMode = !!station;
  editingStationId = station ? station.id : null;

  const draftId = station ? station.id : nextStationId();
  if (els.createDraftId) els.createDraftId.textContent = `ID: ${draftId}`;
  if (els.createDraftDate) {
    els.createDraftDate.textContent = station
      ? formatEditUpdatedOn(new Date())
      : formatDraftCreatedOn(new Date());
  }
  if (els.createSaveBtn) els.createSaveBtn.textContent = station ? "Save Changes" : "Save";
  if (els.createDeleteBtn) els.createDeleteBtn.classList.toggle("is-hidden", !station);
  if (els.createStationTitle) els.createStationTitle.textContent = station ? "Edit" : "Create new";

  els.createForm.reset();
  hideCreateError();

  if (station) {
    if (els.createStationName) els.createStationName.value = station.name;
    if (els.createLatitude) els.createLatitude.value = station.latitude;
    if (els.createLongitude) els.createLongitude.value = station.longitude;
    if (els.createAddress) els.createAddress.value = station.address;
    if (els.createOperationTime) els.createOperationTime.value = station.operationTime || "24/7";
    if (els.createStatus) els.createStatus.value = station.status || "Active";
    if (els.createPoleList) {
      const presetKey = Object.keys(POLE_PRESETS).find((key) => {
        const preset = POLE_PRESETS[key];
        return preset.length === (station.connectors || []).length;
      });
      selectedPoleValues = presetKey ? [presetKey] : [];
      els.createPoleList.value = presetKey || "pole-1";
    }
  } else {
    selectedPoleValues = [];
    if (els.createOperationTime) els.createOperationTime.value = "24/7";
    if (els.createStatus) els.createStatus.value = "Active";
  }

  if (els.stationActionView) els.stationActionView.classList.add("is-hidden");
  els.createBackdrop.classList.add("is-open");
  els.createPanel.classList.add("is-open");
  els.createBackdrop.setAttribute("aria-hidden", "false");
  els.createPanel.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  requestAnimationFrame(() => {
    if (els.createStationName) els.createStationName.focus();
  });
}

function closeCreateStationDrawer() {
  if (!els.createBackdrop || !els.createPanel) return;

  closeDeactivateOverlay();
  els.createBackdrop.classList.remove("is-open");
  els.createPanel.classList.remove("is-open");
  els.createBackdrop.setAttribute("aria-hidden", "true");
  els.createPanel.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  hideCreateError();
  editMode = false;
  editingStationId = null;
}

function toggleCreateStatusLegacy2() {
  if (!els.createStatus) return;
  els.createStatus.value =
    els.createStatus.value === "Inactive" ? "Active" : "Inactive";
  updateCreateStatusToggle();
}

function isCreateDrawerOpen() {
  return els.createPanel && els.createPanel.classList.contains("is-open");
}

function isDeactivateOverlayOpen() {
  return !!(els.deactivateStationOverlay && els.deactivateStationOverlay.classList.contains("is-open"));
}

function openDeactivateOverlay() {
  if (!els.deactivateStationOverlay) return;
  els.deactivateStationOverlay.classList.add("is-open");
  els.deactivateStationOverlay.setAttribute("aria-hidden", "false");
}

function openDeactivateStationOverlay(stationId) {
  deactivatingStationId = stationId;
  stationToggleAction = "deactivate";
  if (els.deactivateStationTitle) {
    els.deactivateStationTitle.textContent = "Deactivate Charging Station?";
  }
  if (els.deactivateStationMessage) {
    els.deactivateStationMessage.textContent = "Are you sure you want to deactivate this charging station?";
  }
  openDeactivateOverlay();
}

function openActivateStationOverlay(stationId) {
  deactivatingStationId = stationId;
  stationToggleAction = "activate";
  if (els.deactivateStationTitle) {
    els.deactivateStationTitle.textContent = "Activate Charging Station?";
  }
  if (els.deactivateStationMessage) {
    els.deactivateStationMessage.textContent = "Are you sure you want to activate this charging station?";
  }
  openDeactivateOverlay();
}

function closeDeactivateOverlay() {
  if (!els.deactivateStationOverlay) return;
  els.deactivateStationOverlay.classList.remove("is-open");
  els.deactivateStationOverlay.setAttribute("aria-hidden", "true");
  deactivatingStationId = null;
  stationToggleAction = "deactivate";
}

async function applyDeactivatedStatus() {
  if (deactivatingStationId) {
    if (stationsUseApi) {
      try {
        const nextStatus = stationToggleAction === "activate" ? "Active" : "Inactive";
        await patchStationStatusRemote(deactivatingStationId, nextStatus);
        applySearchFilter();
        if (currentStation && currentStation.id === deactivatingStationId) {
          const updated = findStationById(deactivatingStationId);
          if (updated) showDetail(updated.id);
        }
      } catch (e) {
        window.alert(e.message || "Unable to update station status.");
      }
      closeDeactivateOverlay();
      return;
    }

    const station = findStationById(deactivatingStationId);
    if (station) {
      if (stationToggleAction === "activate") {
        station.status = "Active";
        station.connectors.forEach((connector) => {
          if (connector.status === "Inactive") {
            connector.status = "Available";
          }
        });
      } else {
        station.status = "Inactive";
        station.connectors.forEach((connector) => {
          connector.status = "Inactive";
        });
      }
      saveStationsToStorage();
      applySearchFilter();
      if (currentStation && currentStation.id === station.id) {
        showDetail(station.id);
      }
    }
    closeDeactivateOverlay();
  } else {
    // Deactivate in edit form
    if (!els.createStatus) return;
    els.createStatus.value = "Inactive";
    updateCreateStatusToggle();
    closeDeactivateOverlay();
  }
}

function updateCreateStatusToggle() {
  if (!els.createStatusToggle || !els.createStatus || !els.createStatusToggleLabel) return;
  const isActive = getStatusFilterValue(els.createStatus.value) !== "inactive";
  els.createStatusToggle.classList.toggle("is-inactive", !isActive);
  els.createStatusToggle.setAttribute("aria-checked", String(isActive));
  els.createStatusToggleLabel.textContent = isActive ? "Active" : "Inactive";
}

function renderPoleChipsLegacy2() {
  if (!els.createPoleChips || !els.createPoleList) return;
  const options = [...els.createPoleList.options].filter((option) => option.value);
  els.createPoleChips.innerHTML = options
    .map(
      (option) =>
        `<span class="create-pole-chip${option.value === els.createPoleList.value ? " is-selected" : ""}">${option.text}<span class="create-pole-chip__remove" aria-hidden="true">&times;</span></span>`
    )
    .join("");
}

function toggleCreateStatusLegacy3() {
  if (!els.createStatus) return;
  const currentValue = getStatusFilterValue(els.createStatus.value);
  els.createStatus.value = currentValue === "inactive" ? "Active" : "Inactive";
  updateCreateStatusToggle();
}

function renderPoleChipsLegacy3() {
  if (!els.createPoleChips || !els.createPoleList) return;
  const options = [...els.createPoleList.options].filter((option) => option.value);
  els.createPoleChips.innerHTML = options
    .map((option) => {
      const label = option.text.split(" - ")[0].split("â€”")[0].trim() || option.text.trim();
      return `<span class="create-pole-chip${option.value === els.createPoleList.value ? " is-selected" : ""}">${label}<span class="create-pole-chip__remove" aria-hidden="true">&times;</span></span>`;
    })
    .join("");
}

function syncPoleOptionLabels() {
  if (!els.createPoleList) return;
  const labelMap = {
    "pole-1": "Pole 1",
    "pole-2": "Pole 2",
    "pole-3": "Pole 3"
  };

  [...els.createPoleList.options].forEach((option) => {
    if (labelMap[option.value]) option.textContent = labelMap[option.value];
  });
}

function normalizeSelectedPoles(values) {
  const validValues = new Set(["pole-1", "pole-2", "pole-3"]);
  return [...new Set(values.filter((value) => validValues.has(value)))];
}

function getPoleChipLabel(value) {
  const option = els.createPoleList ? [...els.createPoleList.options].find((item) => item.value === value) : null;
  if (!option) return value;
  return option.text.split(" - ")[0].trim();
}

function renderPoleChips() {
  if (!els.createPoleChips) return;
  els.createPoleChips.innerHTML = selectedPoleValues
    .map((value) => {
      const label = getPoleChipLabel(value);
      return `<span class="create-pole-chip is-selected" data-pole-value="${value}">${label}<button type="button" class="create-pole-chip__remove" data-remove-pole="${value}" aria-label="Remove ${label}">&times;</button></span>`;
    })
    .join("");
  els.createPoleChips.classList.toggle("is-hidden", selectedPoleValues.length === 0);
}

function handleCreatePoleSelection() {
  if (!els.createPoleList) return;
  const { value } = els.createPoleList;
  if (!value) return;
  // Pole preset is single-choice (1/2/3 connectors), keep only one value.
  selectedPoleValues = normalizeSelectedPoles([value]);
  els.createPoleList.value = value;
  renderPoleChips();
}

function removeSelectedPole(value) {
  selectedPoleValues = selectedPoleValues.filter((item) => item !== value);
  if (els.createPoleList && els.createPoleList.value === value) {
    els.createPoleList.value = "";
  }
  renderPoleChips();
}

function renderTable() {
  if (!els.tableBody) return;

  const totalPages = Math.max(1, Math.ceil(filteredStations.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageStations = filteredStations.slice(startIndex, startIndex + PAGE_SIZE);

  if (!filteredStations.length) {
    els.tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="muted">No matching stations found.</td>
      </tr>
    `;
    renderPagination(totalPages);
    return;
  }

  els.tableBody.innerHTML = pageStations
    .map((station) => {
      const { dateLine, timeLine } = window.CommonUtils.formatCreatedAtParts(station.createdAt);
      return `
        <tr data-id="${station.id}">
          <td class="station-id">${station.id}</td>
          <td>${station.name}</td>
          <td>${station.address}</td>
          <td>${station.latitude}</td>
          <td>${station.longitude}</td>
          <td class="cell-created-at">
            <span class="cell-created-at__date">${dateLine}</span>
            <span class="cell-created-at__time">${timeLine}</span>
          </td>
          <td>${createStatusBadgeHtml(station.status)}</td>
          <td>
            <button
              type="button"
              class="station-toggle${station.status === "Active" ? " is-on" : ""}"
              data-action="deactivate"
              data-id="${station.id}"
              aria-label="${station.status === "Active" ? "Turn off" : "Turn on"} ${station.name}"
              title="${station.status === "Active" ? "ON" : "OFF"}"
            >
              <span class="station-toggle__text station-toggle__text--on">ON</span>
              <span class="station-toggle__thumb" aria-hidden="true"></span>
              <span class="station-toggle__text station-toggle__text--off">OFF</span>
            </button>
          </td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="edit-btn"
                data-action="edit"
                data-id="${station.id}"
                aria-label="Edit ${station.name}"
                title="Edit"
              >
                <span class="material-symbols-outlined" aria-hidden="true">edit_square</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  renderPagination(totalPages);
}

function getPaginationItems(totalPages, page) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 3) {
    return [1, 2, 3, "...", totalPages];
  }

  if (page >= totalPages - 2) {
    return [1, "...", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", page, "...", totalPages];
}

function renderPagination(totalPages) {
  if (!els.stationPagination) return;

  if (!filteredStations.length) {
    els.stationPagination.innerHTML = "";
    els.stationPagination.classList.add("is-hidden");
    return;
  }

  els.stationPagination.classList.remove("is-hidden");
  const items = getPaginationItems(totalPages, currentPage);
  const prevDisabled = currentPage === 1 ? "disabled" : "";
  const nextDisabled = currentPage === totalPages ? "disabled" : "";

  els.stationPagination.innerHTML = `
    <button type="button" class="pagination-btn" data-page-nav="prev" aria-label="Previous page" ${prevDisabled}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M15 5L8 12L15 19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="pagination-list" role="navigation" aria-label="Pages">
      ${items
        .map((item) => {
          if (item === "...") {
            return '<div class="pagination-ellipsis" aria-hidden="true">•••</div>';
          }

          const activeClass = item === currentPage ? " is-active" : "";
          const currentAttr = item === currentPage ? ' aria-current="page"' : "";
          return `<button type="button" class="pagination-page${activeClass}" data-page="${item}" aria-label="Page ${item}"${currentAttr}>${item}</button>`;
        })
        .join("")}
    </div>
    <button type="button" class="pagination-btn" data-page-nav="next" aria-label="Next page" ${nextDisabled}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 5L16 12L9 19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;
}

function showDetail(stationId) {
  const station = stations.find((item) => item.id === stationId);
  if (!station) return;

  currentStation = station;
  els.dName.textContent = station.name;
  els.dId.textContent = station.id;
  els.dAddress.textContent = station.address;
  els.dLocation.textContent = `${station.latitude}, ${station.longitude}`;
  if (els.dStatus) els.dStatus.innerHTML = createStatusBadgeHtml(station.status);
  els.dOperationTime.textContent = station.operationTime;
  els.dConnectors.innerHTML = (station.connectors || [])
    .map(
      (connector) =>
        `<li>${getConnectorLabel(connector.name)}: ${getConnectorStatusLabel(connector.status)}</li>`
    )
    .join("");

  // Fetch full detail with connectors from API
  if (stationsUseApi && STATION_API_BASE) {
    stationsJson(`/stations/${encodeURIComponent(stationId)}`).then((json) => {
      const detail = json?.data;
      if (!detail) return;
      currentStation = { ...station, ...detail };
      els.dConnectors.innerHTML = (detail.connectors || [])
        .map((c) => `<li>${getConnectorLabel(c.name)}: ${getConnectorStatusLabel(c.status)}</li>`)
        .join("");
    }).catch(() => {});
  }

  els.listView.classList.add("is-hidden");
  updateCreateStatusToggle();
  renderPoleChips();

  if (els.stationActionView) els.stationActionView.classList.add("is-hidden");
  els.detailView.classList.remove("is-hidden");
  if (els.pageTitleSuffix) {
    els.pageTitleSuffix.innerHTML = `<span class="page-title__sep" aria-hidden="true"> &gt; </span><span class="page-title__base">${station.id}</span>`;
    els.pageTitleSuffix.classList.remove("is-hidden");
  }
}

function showListLegacy1() {
  currentStation = null;
  if (els.stationActionView) els.stationActionView.classList.add("is-hidden");
  els.detailView.classList.add("is-hidden");
  els.listView.classList.remove("is-hidden");
  if (els.pageTitleSuffix) {
    els.pageTitleSuffix.textContent = "";
    els.pageTitleSuffix.classList.add("is-hidden");
  }
}

function showStationActionView(actionType) {
  if (!currentStation || !els.stationActionView) return;

  const actionMap = {
    update: {
      title: "Update Station",
      desc: "You can modify station information such as name, address, coordinates, status, and connector configuration."
    },
    delete: {
      title: "Delete Station",
      desc: "Confirm station deletion. The system will require verification before removing station data."
    },
    pause: {
      title: "Deactivate Station",
      desc: "Confirm changing the station status to inactive and updating all connector statuses."
    }
  };

  const conf = actionMap[actionType];
  if (!conf) return;

  els.detailView.classList.add("is-hidden");
  els.stationActionView.classList.remove("is-hidden");
  els.actionViewTitle.textContent = conf.title;
  els.actionViewDescription.textContent = conf.desc;
  els.actionStationMeta.textContent = `${currentStation.id} - ${currentStation.name}`;
  currentAction = actionType;
}

function openEditStation(stationId) {
  const station = findStationById(stationId);
  if (!station) return;
  openCreateStationDrawer(station);
}

async function pauseStation(stationId) {
  const station = findStationById(stationId);
  if (!station) return;
  if (stationsUseApi) {
    try {
      await patchStationStatusRemote(stationId, "Inactive");
      applySearchFilter();
      showDetail(stationId);
    } catch (e) {
      window.alert(e.message || "Unable to deactivate station.");
    }
    return;
  }
  station.status = "Inactive";
  station.connectors = station.connectors.map((connector) => ({
    ...connector,
    status: "Inactive"
  }));
  saveStationsToStorage();
  applySearchFilter();
  showDetail(station.id);
}

async function deleteStation(stationId) {
  const station = findStationById(stationId);
  if (!station) return false;

  if (stationHasActivePoles(station)) {
    window.alert("Cannot delete a station with active poles.");
    return false;
  }

  if (stationsUseApi) {
    try {
      await stationsJson(`/stations/${encodeURIComponent(stationId)}`, { method: "DELETE" });
      await refreshStationsFromApi();
      if (currentStation && currentStation.id === stationId) {
        currentStation = null;
      }
      applySearchFilter();
      showList();
      window.alert("Station deleted successfully.");
      return true;
    } catch (e) {
      window.alert(e.message || "Unable to delete station.");
      return false;
    }
  }

  stations = stations.filter((item) => item.id !== stationId);
  saveStationsToStorage();
  filteredStations = stations;
  if (currentStation && currentStation.id === stationId) {
    currentStation = null;
  }
  applySearchFilter();
  showList();
  window.alert("Station deleted successfully.");
  return true;
}

function isDeleteConfirmOpen() {
  return !!(els.deleteConfirmModal && els.deleteConfirmModal.classList.contains("is-open"));
}

function openDeleteConfirm() {
  if (!els.deleteConfirmBackdrop || !els.deleteConfirmModal || !currentStation) return;
  els.deleteConfirmBackdrop.classList.add("is-open");
  els.deleteConfirmModal.classList.add("is-open");
  els.deleteConfirmBackdrop.setAttribute("aria-hidden", "false");
  els.deleteConfirmModal.setAttribute("aria-hidden", "false");
}

function closeDeleteConfirm() {
  if (!els.deleteConfirmBackdrop || !els.deleteConfirmModal) return;
  els.deleteConfirmBackdrop.classList.remove("is-open");
  els.deleteConfirmModal.classList.remove("is-open");
  els.deleteConfirmBackdrop.setAttribute("aria-hidden", "true");
  els.deleteConfirmModal.setAttribute("aria-hidden", "true");
}

async function confirmAction() {
  if (!currentStation || !currentAction) return;

  switch (currentAction) {
    case "update":
      openCreateStationDrawer(currentStation);
      break;
    case "pause":
      await pauseStation(currentStation.id);
      break;
    case "delete":
      await deleteStation(currentStation.id);
      break;
    default:
      break;
  }

  if (currentAction !== "update") {
    currentAction = null;
    if (els.stationActionView) els.stationActionView.classList.add("is-hidden");
    if (els.detailView) els.detailView.classList.remove("is-hidden");
  }
}

function openCreateStationDrawer(station = null) {
  if (!els.createBackdrop || !els.createPanel || !els.createForm) return;

  currentAction = null;
  editMode = !!station;
  editingStationId = station ? station.id : null;

  const draftId = station ? station.id : nextStationId();
  if (els.createDraftId) els.createDraftId.textContent = `ID: ${draftId}`;
  if (els.createDraftDate) {
    els.createDraftDate.textContent = station
      ? formatEditUpdatedOn(new Date())
      : formatDraftCreatedOn(new Date());
  }
  if (els.createSaveBtn) els.createSaveBtn.textContent = station ? "Update" : "Save";
  if (els.createDeleteBtn) els.createDeleteBtn.classList.toggle("is-hidden", !station);
  if (els.createStationTitle) els.createStationTitle.textContent = station ? "Edit" : "Create new";
  els.createPanel.classList.toggle("edit-mode", !!station);
  els.createPanel.classList.toggle("legacy-create-mode", !station);
  if (els.createStatusToggle) els.createStatusToggle.classList.toggle("is-hidden", !station);

  els.createForm.reset();
  hideCreateError();

  if (station) {
    if (els.createStationName) els.createStationName.value = station.name;
    if (els.createLatitude) els.createLatitude.value = station.latitude;
    if (els.createLongitude) els.createLongitude.value = station.longitude;
    if (els.createAddress) els.createAddress.value = station.address;
    if (els.createOperationTime) els.createOperationTime.value = station.operationTime || "24/7";
    if (els.createStatus) els.createStatus.value = station.status || "Active";
    if (els.createPoleList) {
      const presetKey = Object.keys(POLE_PRESETS).find((key) => {
        const preset = POLE_PRESETS[key];
        return preset.length === (station.connectors || []).length;
      });
      selectedPoleValues = presetKey ? [presetKey] : [];
      els.createPoleList.value = presetKey || "pole-1";
    }
  } else {
    selectedPoleValues = [];
    if (els.createOperationTime) els.createOperationTime.value = "24/7";
    if (els.createStatus) els.createStatus.value = "Active";
    if (els.createPoleList) els.createPoleList.value = "";
  }

  updateCreateStatusToggle();
  renderPoleChips();

  if (els.stationActionView) els.stationActionView.classList.add("is-hidden");
  els.createBackdrop.classList.add("is-open");
  els.createPanel.classList.add("is-open");
  els.createBackdrop.setAttribute("aria-hidden", "false");
  els.createPanel.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  requestAnimationFrame(() => {
    if (els.createStationName) els.createStationName.focus();
  });
}

function toggleCreateStatus() {
  if (!els.createStatus) return;
  const currentValue = getStatusFilterValue(els.createStatus.value);
  if (currentValue === "active") {
    openDeactivateOverlay();
    return;
  }
  els.createStatus.value = "Active";
  updateCreateStatusToggle();
}

function bindEvents() {
  els.tableBody.addEventListener("click", (event) => {
    const editBtn = event.target.closest('button[data-action="edit"]');
    if (editBtn) {
      event.stopPropagation();
      openEditStation(editBtn.dataset.id);
      return;
    }

    const deactivateBtn = event.target.closest('button[data-action="deactivate"]');
    if (deactivateBtn) {
      event.stopPropagation();
      const station = findStationById(deactivateBtn.dataset.id);
      if (!station) return;

      if (station.status === "Active") {
        openDeactivateStationOverlay(deactivateBtn.dataset.id);
      } else {
        openActivateStationOverlay(deactivateBtn.dataset.id);
      }
      return;
    }

    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    showDetail(row.dataset.id);
  });

  if (els.stationPagination) {
    els.stationPagination.addEventListener("click", (event) => {
      const pageBtn = event.target.closest("[data-page]");
      if (pageBtn) {
        currentPage = Number(pageBtn.dataset.page);
        renderTable();
        return;
      }

      const navBtn = event.target.closest("[data-page-nav]");
      if (!navBtn || navBtn.disabled) return;

      if (navBtn.dataset.pageNav === "prev" && currentPage > 1) {
        currentPage -= 1;
      }

      if (navBtn.dataset.pageNav === "next") {
        const totalPages = Math.max(1, Math.ceil(filteredStations.length / PAGE_SIZE));
        if (currentPage < totalPages) currentPage += 1;
      }

      renderTable();
    });
  }

  els.searchInput.addEventListener("input", () => {
    updateSearchClearVisibility();
    applySearchFilter();
  });

  if (els.searchClearBtn) {
    els.searchClearBtn.addEventListener("click", () => {
      els.searchInput.value = "";
      updateSearchClearVisibility();
      applySearchFilter();
      els.searchInput.focus();
    });
  }

  if (els.statusFilterBtn) {
    els.statusFilterBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isStatusPopoverOpen()) {
        closeStatusPopover();
      } else {
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
    if (!els.statusPopover || !els.statusFilterBtn) return;
    if (!isStatusPopoverOpen()) return;
    if (els.statusPopover.contains(event.target)) return;
    if (els.statusFilterBtn.contains(event.target)) return;
    closeStatusPopover();
  });

  if (els.backToListBtn) {
    els.backToListBtn.addEventListener("click", showList);
  }
  if (els.backIconBtn) {
    els.backIconBtn.addEventListener("click", showList);
  }
  if (els.backToDetailBtn) {
    els.backToDetailBtn.addEventListener("click", () => {
      if (!currentStation) return;
      els.stationActionView.classList.add("is-hidden");
      els.detailView.classList.remove("is-hidden");
    });
  }

  els.createBtn.addEventListener("click", () => {
    openCreateStationDrawer();
  });

  if (els.createCloseBtn) {
    els.createCloseBtn.addEventListener("click", () => {
      const wasEditMode = editMode;
      closeCreateStationDrawer();
      if (wasEditMode) showList();
    });
  }
  if (els.createCancelBtn) {
    els.createCancelBtn.addEventListener("click", () => {
      const wasEditMode = editMode;
      closeCreateStationDrawer();
      if (wasEditMode) showList();
    });
  }
  if (els.createBackdrop) {
    els.createBackdrop.addEventListener("click", () => closeCreateStationDrawer());
  }
  if (els.createStatusToggle) {
    els.createStatusToggle.addEventListener("click", toggleCreateStatus);
    els.createStatusToggle.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        toggleCreateStatus();
      }
    });
  }
  if (els.createPoleList) {
    els.createPoleList.addEventListener("change", handleCreatePoleSelection);
  }
  if (els.createPoleChips) {
    els.createPoleChips.addEventListener("click", (event) => {
      const removeBtn = event.target.closest("[data-remove-pole]");
      if (!removeBtn) return;
      removeSelectedPole(removeBtn.dataset.removePole);
    });
  }
  if (els.createDeleteBtn) {
    els.createDeleteBtn.addEventListener("click", () => {
      currentStation = findStationById(editingStationId);
      closeCreateStationDrawer();
      openDeleteConfirm();
    });
  }

  if (els.detailDeleteBtn) {
    els.detailDeleteBtn.addEventListener("click", () => {
      if (!currentStation) return;
      openDeleteConfirm();
    });
  }

  if (els.deleteConfirmCloseBtn) {
    els.deleteConfirmCloseBtn.addEventListener("click", () => closeDeleteConfirm());
  }

  if (els.deleteConfirmNoBtn) {
    els.deleteConfirmNoBtn.addEventListener("click", () => {
      closeDeleteConfirm();
      showList();
    });
  }

  if (els.deleteConfirmYesBtn) {
    els.deleteConfirmYesBtn.addEventListener("click", async () => {
      const stationId = editingStationId || (currentStation ? currentStation.id : "");
      if (!stationId) return;
      closeDeleteConfirm();
      await deleteStation(stationId);
    });
  }

  if (els.deleteConfirmBackdrop) {
    els.deleteConfirmBackdrop.addEventListener("click", () => closeDeleteConfirm());
  }

  if (els.deactivateStationCancelBtn) {
    els.deactivateStationCancelBtn.addEventListener("click", () => closeDeactivateOverlay());
  }

  if (els.deactivateStationConfirmBtn) {
    els.deactivateStationConfirmBtn.addEventListener("click", () => void applyDeactivatedStatus());
  }

  if (els.deactivateStationOverlay) {
    els.deactivateStationOverlay.addEventListener("click", (event) => {
      if (event.target === els.deactivateStationOverlay) {
        closeDeactivateOverlay();
      }
    });
  }




  if (els.actionConfirmBtn) {
    els.actionConfirmBtn.addEventListener("click", () => void confirmAction());
  }
  if (els.actionCancelBtn) {
    els.actionCancelBtn.addEventListener("click", () => {
      currentAction = null;
      if (!currentStation) return;
      if (els.stationActionView) els.stationActionView.classList.add("is-hidden");
      if (els.detailView) els.detailView.classList.remove("is-hidden");
    });
  }

  if (els.createForm) {
    els.createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideCreateError();
      const wasEditMode = editMode;
      const editingId = editingStationId;

      const name = els.createStationName.value.trim();
      const latRaw = els.createLatitude.value.trim().replace(",", ".");
      const lonRaw = els.createLongitude.value.trim().replace(",", ".");
      const address = els.createAddress.value.trim();
      const operationTime = els.createOperationTime.value.trim() || "24/7";
      const status = els.createStatus.value;
      const selectedPolePreset = selectedPoleValues[0] || (els.createPoleList ? els.createPoleList.value : "");
      const poleCountFromPreset = /^pole-(\d+)$/i.exec(selectedPolePreset || "");
      const poleCount = poleCountFromPreset ? Number(poleCountFromPreset[1]) : 0;
      const polePresetKey = `pole-${Math.min(3, Math.max(1, poleCount))}`;

      if (!name || !latRaw || !lonRaw || !address || !poleCount || !status) {
        showCreateError("Please fill in all required information.");
        return;
      }

      const latNum = Number(latRaw);
      const lonNum = Number(lonRaw);
      if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
        showCreateError("Invalid latitude / longitude.");
        return;
      }
      if (latNum < -90 || latNum > 90) {
        showCreateError("Vĩ độ không hợp lệ. Phải trong khoảng -90 đến 90.");
        return;
      }
      if (lonNum < -180 || lonNum > 180) {
        showCreateError("Kinh độ không hợp lệ. Phải trong khoảng -180 đến 180.");
        return;
      }

      const connectors = POLE_PRESETS[polePresetKey] ? [...POLE_PRESETS[polePresetKey]] : [...POLE_PRESETS["pole-1"]];
      if (status === "Inactive") {
        connectors.forEach((connector) => {
          connector.status = "Inactive";
        });
      }

      if (stationsUseApi) {
        const payload = {
          name,
          address,
          latitude: String(latNum),
          longitude: String(lonNum),
          status,
          operationTime,
          connectors,
        };
        try {
          if (wasEditMode && editingId) {
            await stationsJson(`/stations/${encodeURIComponent(editingId)}`, {
              method: "PUT",
              body: JSON.stringify(payload),
            });
          } else {
            await stationsJson("/stations", { method: "POST", body: JSON.stringify(payload) });
          }
          await refreshStationsFromApi();
          applySearchFilter();
          closeCreateStationDrawer();
          if (wasEditMode && editingId && currentStation && currentStation.id === editingId) {
            const st = findStationById(editingId);
            if (st) showDetail(st.id);
          }
          window.alert(wasEditMode ? "Station updated successfully." : "Created successfully.");
        } catch (e) {
          showCreateError(e.message || "Unable to save station.");
        }
        return;
      }

      if (wasEditMode && editingId) {
        const station = findStationById(editingId);
        if (!station) {
          showCreateError("Station does not exist.");
          return;
        }

        const isUnchanged =
          station.name === name &&
          station.address === address &&
          station.latitude === String(latNum) &&
          station.longitude === String(lonNum) &&
          station.operationTime === operationTime &&
          station.status === status &&
          (station.connectors || []).length === connectors.length &&
          station.connectors.every((connector, index) =>
            connector.name === connectors[index].name && connector.status === connectors[index].status
          );

        if (isUnchanged) {
          showCreateError("Th�ng tin tr?m d� t?n t?i. Vui l�ng th? l?i.");
          return;
        }

        if (
          isDuplicateStationData(
            { name, address, latitude: String(latNum), longitude: String(lonNum) },
            editingId
          )
        ) {
          showCreateError("Th�ng tin tr?m d� t?n t?i. Vui l�ng th? l?i.");
          return;
        }

        station.name = name;
        station.address = address;
        station.latitude = String(latNum);
        station.longitude = String(lonNum);
        station.operationTime = operationTime;
        station.status = status;
        station.connectors = connectors;
        saveStationsToStorage();
        applySearchFilter();
        closeCreateStationDrawer();
        if (currentStation && currentStation.id === station.id) {
          showDetail(station.id);
        }
        window.alert("Station updated successfully.");
        return;
      }

      const id = nextStationId();
      if (stations.some((s) => s.id === id)) {
        showCreateError("Station ID already exists. Please try again.");
        return;
      }

      if (isDuplicateStationData({ name, address, latitude: String(latNum), longitude: String(lonNum) })) {
        showCreateError("Th�ng tin tr?m d� t?n t?i. Vui l�ng th? l?i.");
        return;
      }

      const newStation = {
        id,
        name,
        address,
        latitude: String(latNum),
        longitude: String(lonNum),
        status,
        operationTime,
        createdAt: new Date().toISOString(),
        connectors
      };

      stations.push(newStation);
      saveStationsToStorage();
      applySearchFilter();
      closeCreateStationDrawer();
      window.alert("Created successfully.");
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (isHistoryDatePopoverOpen()) {
      closeHistoryDatePopover();
      return;
    }
    if (isHistoryExportMenuOpen()) {
      closeHistoryExportMenu();
      return;
    }
    if (els.historyDetailOverlay && els.historyDetailOverlay.classList.contains("is-open")) {
      closeHistoryDetail();
      return;
    }
    if (isDeactivateOverlayOpen()) {
      closeDeactivateOverlay();
      return;
    }
    if (isDeleteConfirmOpen()) {
      closeDeleteConfirm();
      return;
    }
    if (isStatusPopoverOpen()) {
      closeStatusPopover();
      return;
    }
    if (isCoordCalendarOpen()) {
      closeCoordCalendar();
      return;
    }
    if (isCreateDrawerOpen()) {
      closeCreateStationDrawer();
    }
  });

  if (els.updateBtn) {
    els.updateBtn.addEventListener("click", () => {
      if (!currentStation) return;
      showStationActionView("update");
    });
  }

  if (els.pauseBtn) {
    els.pauseBtn.addEventListener("click", () => {
      if (!currentStation) return;
      showStationActionView("pause");
    });
  }

  if (els.deleteBtn) {
    els.deleteBtn.addEventListener("click", () => {
      if (!currentStation) return;
      showStationActionView("delete");
    });
  }
}

function initSidebarNavigation() {
  const sidebarEl = document.getElementById("appSidebar");
  if (!sidebarEl) return;
  if (sidebarEl.classList.contains("sidebar--merged")) return;

  const navButtons = sidebarEl.querySelectorAll(".menu-item[data-panel-target]");
  const panels = sidebarEl.querySelectorAll(".sb-secondary-panel");
  if (!navButtons.length || !panels.length) return;

  function showPanel(panelName, triggerBtn) {
    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === panelName);
    });

    navButtons.forEach((button) => {
      button.classList.toggle("active", button === triggerBtn);
    });

    sidebarEl.classList.remove("is-collapsed");
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const panelName = button.dataset.panelTarget;
      const isSameActive = button.classList.contains("active") && !sidebarEl.classList.contains("is-collapsed");

      if (isSameActive) {
        sidebarEl.classList.add("is-collapsed");
        return;
      }

      showPanel(panelName, button);
    });
  });
}

function initNotifToggle() {
  const btn = document.getElementById("notifToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (typeof openAlertsPage === "function") {
      openAlertsPage();
      return;
    }
    window.location.href = "alerts.html";
  });
}

function updateNotificationBadge() {
  const badge = document.querySelector("#notifToggle .bell-badge");
  if (!badge || typeof getOpenAlertsCount !== "function") return;

  const count = getOpenAlertsCount();
  badge.textContent = String(count);
  badge.classList.toggle("is-hidden", count === 0);
}

/* —— Lịch chọn nhiều ngày (Latitude / Longitude) —— */
const coordCalendarState = {
  view: new Date(2025, 1, 1),
  committed: new Set(),
  working: new Set(),
  anchor: null
};

function dayKeyFromDate(d) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isNextCalendarDay(a, b) {
  const t = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  t.setDate(t.getDate() + 1);
  return (
    t.getFullYear() === b.getFullYear() &&
    t.getMonth() === b.getMonth() &&
    t.getDate() === b.getDate()
  );
}

function getCoordCalendarEls() {
  return {
    pop: document.getElementById("coordCalendarPopover"),
    grid: document.getElementById("coordCalendarGrid"),
    title: document.getElementById("coordCalendarTitle"),
    prev: document.getElementById("coordCalPrevMonth"),
    next: document.getElementById("coordCalNextMonth"),
    cancel: document.getElementById("coordCalCancel"),
    done: document.getElementById("coordCalDone"),
    hidden: document.getElementById("createCalendarSelectedDates"),
    latBtn: document.getElementById("latCalendarBtn"),
    lonBtn: document.getElementById("lonCalendarBtn")
  };
}

function isCoordCalendarOpen() {
  const { pop } = getCoordCalendarEls();
  return !!(pop && pop.classList.contains("is-open"));
}

function positionCoordCalendar(anchor) {
  const c = getCoordCalendarEls();
  if (!c.pop || !anchor) return;
  const r = anchor.getBoundingClientRect();
  const w = c.pop.offsetWidth || 360;
  /* Popover nằm bên trái nút (cạnh phải popover gần cạnh trái nút) */
  let left = r.left - w - 10;
  if (left < 8) left = 8;
  if (left + w > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - w - 8);
  }
  let top = r.bottom + 8;
  const h = c.pop.offsetHeight || 320;
  if (top + h > window.innerHeight - 8) {
    top = Math.max(8, r.top - h - 8);
  }
  c.pop.style.left = `${left}px`;
  c.pop.style.top = `${top}px`;
}

function loadCommittedCalendarFromHidden() {
  const c = getCoordCalendarEls();
  if (!c.hidden || !c.hidden.value) return;
  try {
    const arr = JSON.parse(c.hidden.value);
    if (Array.isArray(arr)) {
      coordCalendarState.committed = new Set(arr.filter((x) => typeof x === "string"));
    }
  } catch (e) {
    // ignore
  }
}

function persistCommittedCalendarToHidden() {
  const c = getCoordCalendarEls();
  if (!c.hidden) return;
  const sorted = [...coordCalendarState.committed].sort();
  c.hidden.value = JSON.stringify(sorted);
}

function renderCoordCalendar() {
  const c = getCoordCalendarEls();
  if (!c.grid || !c.title) return;

  const view = coordCalendarState.view;
  const y = view.getFullYear();
  const m = view.getMonth();
  c.title.textContent = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const first = new Date(y, m, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevMonthLast = new Date(y, m, 0).getDate();

  const cells = [];
  for (let i = 0; i < lead; i++) {
    const day = prevMonthLast - lead + i + 1;
    cells.push({ d: new Date(y, m - 1, day), inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ d: new Date(y, m, day), inMonth: true });
  }
  /* Cuối lưới: hiện ngày tháng sau để đủ cả tuần (cùng hàng với cuối tháng đang xem) */
  const tail = (7 - (cells.length % 7)) % 7;
  for (let k = 1; k <= tail; k++) {
    cells.push({ d: new Date(y, m + 1, k), inMonth: false });
  }

  const working = coordCalendarState.working;
  const parts = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const { d, inMonth } = cell;
    const key = dayKeyFromDate(d);
    const sel = working.has(key);
    const prevCell = i > 0 ? cells[i - 1] : null;
    const nextCell = i < cells.length - 1 ? cells[i + 1] : null;
    const prev = prevCell ? prevCell.d : null;
    const next = nextCell ? nextCell.d : null;
    const prevKey = prev ? dayKeyFromDate(prev) : null;
    const nextKey = next ? dayKeyFromDate(next) : null;
    const prevSel = prev && working.has(prevKey) && isNextCalendarDay(prev, d);
    const nextSel = next && working.has(nextKey) && isNextCalendarDay(d, next);

    let rangeClass = "";
    if (sel) {
      if (!prevSel && !nextSel) rangeClass = "coord-cal__cell--solo";
      else if (!prevSel && nextSel) rangeClass = "coord-cal__cell--range-start";
      else if (prevSel && nextSel) rangeClass = "coord-cal__cell--range-mid";
      else rangeClass = "coord-cal__cell--range-end";
    }

    const outClass = inMonth ? "" : " coord-cal__cell--out";
    const selClass = sel ? " coord-cal__cell--selected" : "";
    const pill = sel ? '<span class="coord-cal__pill" aria-hidden="true"></span>' : "";

    const rangeAttr = rangeClass ? ` ${rangeClass}` : "";
    parts.push(
      `<div class="coord-cal__cell${outClass}${selClass}${rangeAttr}">${pill}<button type="button" class="coord-cal__cell-btn" data-day-key="${key}">${d.getDate()}</button></div>`
    );
  }

  c.grid.innerHTML = parts.join("");
}

function setCalendarTriggerActive(anchorEl) {
  const c = getCoordCalendarEls();
  if (c.latBtn) c.latBtn.classList.toggle("is-active", anchorEl === c.latBtn);
  if (c.lonBtn) c.lonBtn.classList.toggle("is-active", anchorEl === c.lonBtn);
}

function openCoordCalendar(anchor) {
  const c = getCoordCalendarEls();
  if (!c.pop || !anchor) return;

  loadCommittedCalendarFromHidden();
  coordCalendarState.working = new Set(coordCalendarState.committed);
  coordCalendarState.anchor = anchor;

  c.pop.classList.add("is-open");
  c.pop.setAttribute("aria-hidden", "false");
  if (c.latBtn) c.latBtn.setAttribute("aria-expanded", anchor === c.latBtn ? "true" : "false");
  if (c.lonBtn) c.lonBtn.setAttribute("aria-expanded", anchor === c.lonBtn ? "true" : "false");
  setCalendarTriggerActive(anchor);

  renderCoordCalendar();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      positionCoordCalendar(anchor);
    });
  });
}

function closeCoordCalendar() {
  const c = getCoordCalendarEls();
  if (!c.pop) return;

  c.pop.classList.remove("is-open");
  c.pop.setAttribute("aria-hidden", "true");
  if (c.latBtn) c.latBtn.setAttribute("aria-expanded", "false");
  if (c.lonBtn) c.lonBtn.setAttribute("aria-expanded", "false");
  setCalendarTriggerActive(null);
  coordCalendarState.anchor = null;
}

function commitCoordCalendar() {
  coordCalendarState.committed = new Set(coordCalendarState.working);
  persistCommittedCalendarToHidden();
  closeCoordCalendar();
}

function initCoordCalendar() {
  const c = getCoordCalendarEls();
  if (!c.pop || !c.grid) return;

  loadCommittedCalendarFromHidden();

  c.grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".coord-cal__cell-btn");
    if (!btn) return;
    const key = btn.getAttribute("data-day-key");
    if (!key) return;
    if (coordCalendarState.working.has(key)) coordCalendarState.working.delete(key);
    else coordCalendarState.working.add(key);
    renderCoordCalendar();
  });

  if (c.prev) {
    c.prev.addEventListener("click", () => {
      coordCalendarState.view.setMonth(coordCalendarState.view.getMonth() - 1);
      renderCoordCalendar();
    });
  }
  if (c.next) {
    c.next.addEventListener("click", () => {
      coordCalendarState.view.setMonth(coordCalendarState.view.getMonth() + 1);
      renderCoordCalendar();
    });
  }
  if (c.cancel) {
    c.cancel.addEventListener("click", () => {
      closeCoordCalendar();
    });
  }
  if (c.done) {
    c.done.addEventListener("click", () => {
      commitCoordCalendar();
    });
  }

  const openFrom = (btn) => {
    if (!btn) return;
    if (isCoordCalendarOpen()) {
      if (coordCalendarState.anchor === btn) {
        closeCoordCalendar();
        return;
      }
      coordCalendarState.anchor = btn;
      setCalendarTriggerActive(btn);
      if (c.latBtn) c.latBtn.setAttribute("aria-expanded", btn === c.latBtn ? "true" : "false");
      if (c.lonBtn) c.lonBtn.setAttribute("aria-expanded", btn === c.lonBtn ? "true" : "false");
      requestAnimationFrame(() => positionCoordCalendar(btn));
      return;
    }
    openCoordCalendar(btn);
  };

  if (c.latBtn) {
    c.latBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Keep the button visible, but do not open the hidden calendar.
    });
  }
  if (c.lonBtn) {
    c.lonBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Keep the button visible, but do not open the hidden calendar.
    });
  }

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!isCoordCalendarOpen()) return;
      const t = e.target;
      if (c.pop.contains(t)) return;
      if (c.latBtn && c.latBtn.contains(t)) return;
      if (c.lonBtn && c.lonBtn.contains(t)) return;
      closeCoordCalendar();
    },
    true
  );

  window.addEventListener("resize", () => {
    if (isCoordCalendarOpen() && coordCalendarState.anchor) {
      positionCoordCalendar(coordCalendarState.anchor);
    }
  });
}

const HISTORY_SESSIONS = [
  { id: "HS001", stationId: "ST001", stationName: "Station 1", connector: "Connector 1 - CCS2", status: "completed", start: "2026-03-29T08:10:00", end: "2026-03-29T09:05:00", kwh: 34.2, duration: 55, cost: 18.4, note: "Charging session completed normally." },
  { id: "HS002", stationId: "ST001", stationName: "Station 1", connector: "Connector 2 - Type 2", status: "interrupted", start: "2026-03-29T13:20:00", end: "2026-03-29T13:54:00", kwh: 12.6, duration: 34, cost: 6.8, note: "Interrupted because the user stopped the session." },
  { id: "HS003", stationId: "ST002", stationName: "Station 2", connector: "Connector 1 - CCS2", status: "failed", start: "2026-03-28T10:12:00", end: "2026-03-28T10:19:00", kwh: 1.3, duration: 7, cost: 0.7, note: "Handshake error between the station and the vehicle." },
  { id: "HS004", stationId: "ST002", stationName: "Station 2", connector: "Connector 2 - CHAdeMO", status: "completed", start: "2026-03-27T09:40:00", end: "2026-03-27T10:35:00", kwh: 29.8, duration: 55, cost: 16.1, note: "Charging session remained stable throughout." },
  { id: "HS005", stationId: "ST001", stationName: "Station 1", connector: "Connector 1 - CCS2", status: "completed", start: "2026-03-26T18:15:00", end: "2026-03-26T19:10:00", kwh: 31.5, duration: 55, cost: 17.3, note: "Consumption matched the average historical pattern." },
  { id: "HS006", stationId: "ST003", stationName: "Station 3", connector: "Connector 1 - CCS2", status: "interrupted", start: "2026-03-24T07:50:00", end: "2026-03-24T08:22:00", kwh: 10.1, duration: 32, cost: 5.5, note: "Maintenance detected a loose connector and requires reinspection." },
  { id: "HS007", stationId: "ST002", stationName: "Station 2", connector: "Connector 3 - Type 2", status: "completed", start: "2026-03-22T15:05:00", end: "2026-03-22T16:00:00", kwh: 28.4, duration: 55, cost: 15.2, note: "Charging session completed with no abnormalities recorded." },
  { id: "HS008", stationId: "ST001", stationName: "Station 1", connector: "Connector 2 - Type 2", status: "completed", start: "2026-03-20T11:25:00", end: "2026-03-20T12:08:00", kwh: 19.6, duration: 43, cost: 10.4, note: "Average load, with duration below the warning threshold." },
  { id: "HS009", stationId: "ST002", stationName: "Station 2", connector: "Connector 2 - CHAdeMO", status: "completed", start: "2026-03-17T20:10:00", end: "2026-03-17T21:12:00", kwh: 36.1, duration: 62, cost: 19.6, note: "A high load peak occurred near the end of the session." },
  { id: "HS010", stationId: "ST003", stationName: "Station 3", connector: "Connector 1 - CCS2", status: "failed", start: "2026-03-15T06:30:00", end: "2026-03-15T06:38:00", kwh: 0.8, duration: 8, cost: 0.4, note: "The equipment stopped due to a temperature sensor issue." }
];

let filteredHistorySessions = [];
let currentHistorySession = null;
const historyDatePickerState = {
  view: new Date(),
  working: "",
  activeField: ""
};

els.historyView = document.getElementById("historyView");
els.historyNavLink = document.getElementById("historyNavLink");
els.stationNavLink = document.getElementById("stationNavLink");
els.pageTitleCurrent = document.getElementById("pageTitleCurrent");
els.historyDateFrom = document.getElementById("historyDateFrom");
els.historyDateTo = document.getElementById("historyDateTo");
els.historyDateFromTrigger = document.getElementById("historyDateFromTrigger");
els.historyDateFromText = document.getElementById("historyDateFromText");
els.historyDateToTrigger = document.getElementById("historyDateToTrigger");
els.historyDateToText = document.getElementById("historyDateToText");
els.historyStationFilter = document.getElementById("historyStationFilter");
els.historyConnectorFilter = document.getElementById("historyConnectorFilter");
els.historyStatusFilter = document.getElementById("historyStatusFilter");
els.historyChartMode = document.getElementById("historyChartMode");
els.historyChart = document.getElementById("historyChart");
els.historyTableBody = document.getElementById("historyTableBody");
els.historyEmptyState = document.getElementById("historyEmptyState");
els.historyResultCount = document.getElementById("historyResultCount");
els.historyMetricSessions = document.getElementById("historyMetricSessions");
els.historyMetricEnergy = document.getElementById("historyMetricEnergy");
els.historyMetricDuration = document.getElementById("historyMetricDuration");
els.historyMetricRevenue = document.getElementById("historyMetricRevenue");
els.historyExportFeedback = document.getElementById("historyExportFeedback");
els.historyExportMenu = document.getElementById("historyExportMenu");
els.historyExportTrigger = document.getElementById("historyExportTrigger");
els.historyExportOptions = document.getElementById("historyExportOptions");
els.historyDatePopover = document.getElementById("historyDatePopover");
els.historyDateTitle = document.getElementById("historyDateTitle");
els.historyDateGrid = document.getElementById("historyDateGrid");
els.historyDatePrevMonth = document.getElementById("historyDatePrevMonth");
els.historyDateNextMonth = document.getElementById("historyDateNextMonth");
els.historyDateCancel = document.getElementById("historyDateCancel");
els.historyDateDone = document.getElementById("historyDateDone");
els.historyDetailOverlay = document.getElementById("historyDetailOverlay");
els.historyDetailCloseBtn = document.getElementById("historyDetailCloseBtn");
els.historyDetailSessionId = document.getElementById("historyDetailSessionId");
els.historyDetailStation = document.getElementById("historyDetailStation");
els.historyDetailConnector = document.getElementById("historyDetailConnector");
els.historyDetailStatus = document.getElementById("historyDetailStatus");
els.historyDetailStart = document.getElementById("historyDetailStart");
els.historyDetailEnd = document.getElementById("historyDetailEnd");
els.historyDetailEnergy = document.getElementById("historyDetailEnergy");
els.historyDetailDuration = document.getElementById("historyDetailDuration");
els.historyDetailCost = document.getElementById("historyDetailCost");

function syncStationSecondaryNav(mode) {
  if (els.stationNavLink) {
    const active = mode === "station";
    els.stationNavLink.classList.toggle("is-active", active);
    if (active) els.stationNavLink.setAttribute("aria-current", "page");
    else els.stationNavLink.removeAttribute("aria-current");
  }
  if (els.historyNavLink) {
    const active = mode === "history";
    els.historyNavLink.classList.toggle("is-active", active);
    if (active) els.historyNavLink.setAttribute("aria-current", "page");
    else els.historyNavLink.removeAttribute("aria-current");
  }
  if (els.pageTitleCurrent) {
    els.pageTitleCurrent.textContent = mode === "history" ? "History" : "Station";
  }
}

function formatHistoryFilterDate(value) {
  if (!value) return "Select date";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function syncHistoryDateTriggers() {
  if (els.historyDateFromText) els.historyDateFromText.textContent = formatHistoryFilterDate(els.historyDateFrom ? els.historyDateFrom.value : "");
  if (els.historyDateToText) els.historyDateToText.textContent = formatHistoryFilterDate(els.historyDateTo ? els.historyDateTo.value : "");
}

function isHistoryDatePopoverOpen() {
  return !!(els.historyDatePopover && els.historyDatePopover.classList.contains("is-open"));
}

function positionHistoryDatePopover(anchor) {
  if (!els.historyDatePopover || !anchor) return;
  const rect = anchor.getBoundingClientRect();
  const width = els.historyDatePopover.offsetWidth || 360;
  let left = rect.left;
  if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
  if (left < 8) left = 8;
  let top = rect.bottom + 8;
  const height = els.historyDatePopover.offsetHeight || 320;
  if (top + height > window.innerHeight - 8) {
    top = Math.max(8, rect.top - height - 8);
  }
  els.historyDatePopover.style.left = `${left}px`;
  els.historyDatePopover.style.top = `${top}px`;
}

function renderHistoryDatePicker() {
  if (!els.historyDateGrid || !els.historyDateTitle) return;
  const view = historyDatePickerState.view;
  const year = view.getFullYear();
  const month = view.getMonth();
  els.historyDateTitle.textContent = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const first = new Date(year, month, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLast = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = 0; i < lead; i++) {
    const day = prevMonthLast - lead + i + 1;
    cells.push({ d: new Date(year, month - 1, day), inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ d: new Date(year, month, day), inMonth: true });
  }
  const tail = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= tail; day++) {
    cells.push({ d: new Date(year, month + 1, day), inMonth: false });
  }

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
  historyDatePickerState.working = field === "from" ? (els.historyDateFrom ? els.historyDateFrom.value : "") : (els.historyDateTo ? els.historyDateTo.value : "");
  const seed = historyDatePickerState.working ? new Date(`${historyDatePickerState.working}T00:00:00`) : new Date();
  historyDatePickerState.view = new Date(seed.getFullYear(), seed.getMonth(), 1);
  renderHistoryDatePicker();
  els.historyDatePopover.classList.add("is-open");
  els.historyDatePopover.setAttribute("aria-hidden", "false");
  const anchor = field === "from" ? els.historyDateFromTrigger : els.historyDateToTrigger;
  if (els.historyDateFromTrigger) {
    els.historyDateFromTrigger.classList.toggle("is-active", field === "from");
    els.historyDateFromTrigger.setAttribute("aria-expanded", field === "from" ? "true" : "false");
  }
  if (els.historyDateToTrigger) {
    els.historyDateToTrigger.classList.toggle("is-active", field === "to");
    els.historyDateToTrigger.setAttribute("aria-expanded", field === "to" ? "true" : "false");
  }
  requestAnimationFrame(() => positionHistoryDatePopover(anchor));
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
    if (els.historyDateTo && els.historyDateTo.value && els.historyDateFrom.value > els.historyDateTo.value) {
      els.historyDateTo.value = els.historyDateFrom.value;
    }
  }
  if (historyDatePickerState.activeField === "to" && els.historyDateTo) {
    els.historyDateTo.value = historyDatePickerState.working;
    if (els.historyDateFrom && els.historyDateFrom.value && els.historyDateTo.value < els.historyDateFrom.value) {
      els.historyDateFrom.value = els.historyDateTo.value;
    }
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
    minute: "2-digit"
  });
}

function populateHistoryFilters() {
  if (els.historyStationFilter) {
    const stationOptions = ['<option value="all">All Stations</option>']
      .concat(stations.map((station) => `<option value="${station.id}">${station.id} - ${station.name}</option>`));
    els.historyStationFilter.innerHTML = stationOptions.join("");
  }

  if (els.historyConnectorFilter) {
    const connectors = [...new Set(HISTORY_SESSIONS.map((item) => item.connector))];
    els.historyConnectorFilter.innerHTML = ['<option value="all">All Connectors</option>']
      .concat(connectors.map((connector) => `<option value="${connector}">${connector}</option>`))
      .join("");
  }
}

function getFilteredHistorySessions() {
  const dateFrom = els.historyDateFrom ? els.historyDateFrom.value : "";
  const dateTo = els.historyDateTo ? els.historyDateTo.value : "";
  const stationId = els.historyStationFilter ? els.historyStationFilter.value : "all";
  const connector = els.historyConnectorFilter ? els.historyConnectorFilter.value : "all";
  const status = els.historyStatusFilter ? els.historyStatusFilter.value : "all";

  return HISTORY_SESSIONS.filter((session) => {
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
  const mode = els.historyChartMode ? els.historyChartMode.value : "day";
  const grouped = new Map();
  sessions.forEach((session) => {
    const date = new Date(session.start);
    let key = "";
    if (mode === "week") {
      const temp = new Date(date);
      temp.setHours(0, 0, 0, 0);
      temp.setDate(temp.getDate() - ((temp.getDay() + 6) % 7));
      key = `${temp.getDate()}/${temp.getMonth() + 1}`;
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
  els.historyChart.innerHTML = data
    .map(([label, value]) => {
      const height = Math.max(18, Math.round((value / maxValue) * 180));
      return `
        <div class="history-chart__bar">
          <span class="history-chart__value">${value}</span>
          <div class="history-chart__column" style="height:${height}px"></div>
          <span class="history-chart__label">${label}</span>
        </div>
      `;
    })
    .join("");
}

function renderHistorySummary(sessions) {
  const totalSessions = sessions.length;
  const totalEnergy = sessions.reduce((sum, item) => sum + item.kwh, 0);
  const totalDuration = sessions.reduce((sum, item) => sum + item.duration, 0);
  const totalRevenue = sessions.reduce((sum, item) => sum + item.cost, 0);
  if (els.historyMetricSessions) els.historyMetricSessions.textContent = String(totalSessions);
  if (els.historyMetricEnergy) els.historyMetricEnergy.textContent = `${totalEnergy.toFixed(1)} kWh`;
  if (els.historyMetricDuration) els.historyMetricDuration.textContent = `${totalSessions ? Math.round(totalDuration / totalSessions) : 0} min`;
  if (els.historyMetricRevenue) els.historyMetricRevenue.textContent = `$${totalRevenue.toFixed(1)}`;
}

function renderHistoryTable(sessions) {
  if (!els.historyTableBody) return;
  if (els.historyResultCount) {
    els.historyResultCount.textContent = `${sessions.length} result${sessions.length === 1 ? "" : "s"}`;
  }
  if (els.historyEmptyState) {
    els.historyEmptyState.classList.toggle("is-visible", sessions.length === 0);
  }

  els.historyTableBody.innerHTML = sessions
    .map((session) => `
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
    `)
    .join("");
}

function renderHistoryView() {
  filteredHistorySessions = getFilteredHistorySessions();
  renderHistorySummary(filteredHistorySessions);
  renderHistoryChart(filteredHistorySessions);
  renderHistoryTable(filteredHistorySessions);
}

function showHistoryView() {
  if (els.listView) els.listView.classList.add("is-hidden");
  if (els.detailView) els.detailView.classList.add("is-hidden");
  if (els.stationActionView) els.stationActionView.classList.add("is-hidden");
  if (els.historyView) els.historyView.classList.remove("is-hidden");
  if (els.pageTitleSuffix) {
    els.pageTitleSuffix.textContent = "";
    els.pageTitleSuffix.classList.add("is-hidden");
  }
  syncStationSecondaryNav("history");
  renderHistoryView();
}

function showList() {
  currentStation = null;
  if (els.stationActionView) els.stationActionView.classList.add("is-hidden");
  if (els.detailView) els.detailView.classList.add("is-hidden");
  if (els.historyView) els.historyView.classList.add("is-hidden");
  els.listView.classList.remove("is-hidden");
  if (els.pageTitleSuffix) {
    els.pageTitleSuffix.textContent = "";
    els.pageTitleSuffix.classList.add("is-hidden");
  }
  syncStationSecondaryNav("station");
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
  if (els.historyDetailCost) els.historyDetailCost.textContent = `$${currentHistorySession.cost.toFixed(1)} • ${currentHistorySession.note}`;
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
      formatHistoryStatus(item.status)
    ]);
    const separator = type === "csv" ? "," : "\t";
    const content = [header, ...rows].map((row) => row.join(separator)).join("\n");
    const mime = type === "csv" ? "text/csv" : "text/plain";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `station-history.${type}`;
    link.textContent = "Download file";
    link.click();

    if (els.historyExportFeedback) {
      els.historyExportFeedback.innerHTML = `Export completed successfully. <a href="${url}" download="station-history.${type}">Download file</a>`;
      els.historyExportFeedback.classList.add("is-visible");
    }
  } catch (error) {
    if (els.historyExportFeedback) {
      els.historyExportFeedback.textContent = "Unable to export data. Please try again.";
      els.historyExportFeedback.classList.add("is-visible");
    }
  }
}

function bindHistoryEvents() {
  populateHistoryFilters();
  syncHistoryDateTriggers();

  [els.historyDateFrom, els.historyDateTo, els.historyStationFilter, els.historyConnectorFilter, els.historyStatusFilter, els.historyChartMode]
    .filter(Boolean)
    .forEach((element) => {
      element.addEventListener("change", renderHistoryView);
    });

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
      historyDatePickerState.view = new Date(
        historyDatePickerState.view.getFullYear(),
        historyDatePickerState.view.getMonth() - 1,
        1
      );
      renderHistoryDatePicker();
    });
  }

  if (els.historyDateNextMonth) {
    els.historyDateNextMonth.addEventListener("click", () => {
      historyDatePickerState.view = new Date(
        historyDatePickerState.view.getFullYear(),
        historyDatePickerState.view.getMonth() + 1,
        1
      );
      renderHistoryDatePicker();
    });
  }

  if (els.historyDateCancel) {
    els.historyDateCancel.addEventListener("click", closeHistoryDatePopover);
  }

  if (els.historyDateDone) {
    els.historyDateDone.addEventListener("click", commitHistoryDatePopover);
  }

  if (els.historyNavLink) {
    els.historyNavLink.addEventListener("click", (event) => {
      event.preventDefault();
      showHistoryView();
    });
  }

  if (els.stationNavLink) {
    els.stationNavLink.addEventListener("click", (event) => {
      event.preventDefault();
      showList();
    });
  }

  if (els.historyTableBody) {
    els.historyTableBody.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-session-id]");
      if (!btn) return;
      openHistoryDetail(btn.dataset.sessionId);
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

    if (!isHistoryExportMenuOpen()) return;
    if (els.historyExportMenu && els.historyExportMenu.contains(event.target)) return;
    closeHistoryExportMenu();
  });

  if (els.historyDetailCloseBtn) {
    els.historyDetailCloseBtn.addEventListener("click", closeHistoryDetail);
  }

  if (els.historyDetailOverlay) {
    els.historyDetailOverlay.addEventListener("click", (event) => {
      if (event.target === els.historyDetailOverlay) closeHistoryDetail();
    });
  }

  window.addEventListener("resize", () => {
    if (!isHistoryDatePopoverOpen()) return;
    const anchor = historyDatePickerState.activeField === "from" ? els.historyDateFromTrigger : els.historyDateToTrigger;
    positionHistoryDatePopover(anchor);
  });
}

async function init() {
  const fromApi = await refreshStationsFromApi();
  if (!fromApi) {
    stations = loadStationsFromStorage();
    filteredStations = [...stations];
  }
  syncPoleOptionLabels();
  setStatusFilter(currentStatusFilter);
  bindEvents();
  initSidebarNavigation();
  initNotifToggle();
  updateNotificationBadge();
  initCoordCalendar();
  bindHistoryEvents();
  syncStationSecondaryNav("station");
  updateSearchClearVisibility();
  window.addEventListener("resize", () => {
    if (isStatusPopoverOpen()) {
      positionStatusPopover();
    }
  });
}

void init().catch((err) => {
  console.error(err);
  stations = loadStationsFromStorage();
  filteredStations = [...stations];
  syncPoleOptionLabels();
  setStatusFilter(currentStatusFilter);
  bindEvents();
  initSidebarNavigation();
  initNotifToggle();
  updateNotificationBadge();
  initCoordCalendar();
  bindHistoryEvents();
  syncStationSecondaryNav("station");
  updateSearchClearVisibility();
});

