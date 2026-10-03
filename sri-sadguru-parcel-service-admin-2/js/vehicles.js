/* =========================================================
   SRI SADGURU SIDDAROODA PARCEL SERVICE
   VEHICLES PAGE — SUPABASE VERSION
   ========================================================= */

"use strict";


/* =========================================================
   STATE
   ========================================================= */

let allVehicles = [];
let filteredVehicles = [];


/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (selector, parent = document) => {
    return parent.querySelector(selector);
};

const $$ = (selector, parent = document) => {
    return Array.from(parent.querySelectorAll(selector));
};


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const sidebar = $("#sidebar");
const menuToggle = $("#menuToggle");

const vehicleSearch = $("#vehicleSearch");
const statusFilter = $("#statusFilter");
const typeFilter = $("#typeFilter");

const refreshVehiclesBtn = $("#refreshVehiclesBtn");
const addVehicleBtn = $("#addVehicleBtn");

const vehiclesTableBody = $("#vehiclesTableBody");
const emptyVehiclesState = $("#emptyVehiclesState");
const emptyVehiclesTitle = $("#emptyVehiclesTitle");
const emptyVehiclesMessage = $("#emptyVehiclesMessage");

const totalVehicles = $("#totalVehicles");
const availableVehicles = $("#availableVehicles");
const assignedVehicles = $("#assignedVehicles");
const deliveryVehicles = $("#deliveryVehicles");
const offlineVehicles = $("#offlineVehicles");

const vehicleResultInfo = $("#vehicleResultInfo");


/* =========================================================
   SUPABASE
   ========================================================= */

function getSupabaseClient() {

    if (!window.supabaseClient) {

        console.error(
            "Supabase client is not available."
        );

        return null;
    }

    return window.supabaseClient;
}


/* =========================================================
   STRING / VALUE HELPERS
   ========================================================= */

function firstValue(...values) {

    for (const value of values) {

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {
            return value;
        }
    }

    return "";
}


function normalizeText(value) {

    return String(value || "")
        .trim()
        .toLowerCase();
}


/* =========================================================
   DATABASE STATUS → DISPLAY STATUS
   ========================================================= */

function normalizeStatus(status) {

    const value = normalizeText(status);

    switch (value) {

        case "available":
            return "Available";

        case "assigned":
            return "Assigned";

        case "on_delivery":
        case "on delivery":
            return "On Delivery";

        case "maintenance":
            return "Maintenance";

        case "inactive":
            return "Offline";

        default:
            return "Offline";
    }
}


/* =========================================================
   DATABASE STATUS → FILTER VALUE
   ========================================================= */

function statusToDatabaseValue(status) {

    const value = normalizeText(status);

    switch (value) {

        case "available":
            return "available";

        case "assigned":
            return "assigned";

        case "on delivery":
        case "on_delivery":
            return "on_delivery";

        case "maintenance":
            return "maintenance";

        case "offline":
        case "inactive":
            return "inactive";

        default:
            return "";
    }
}


/* =========================================================
   VEHICLE NORMALIZATION
   ========================================================= */

function normalizeVehicle(vehicle) {

    if (
        !vehicle ||
        typeof vehicle !== "object"
    ) {
        return null;
    }


    const driver = vehicle.drivers || null;


    return {

        /* Real database UUID */
        id: String(
            firstValue(vehicle.id)
        ),

        /* Human-readable vehicle ID */
        vehicleId: String(
            firstValue(
                vehicle.vehicle_id,
                "—"
            )
        ),

        vehicleAssigned: String(
            firstValue(
                vehicle.vehicle_assigned,
                vehicle.vehicle_id,
                "—"
            )
        ),

        vehicleNumber: String(
            firstValue(
                vehicle.vehicle_number,
                "—"
            )
        ),

        vehicleType: String(
            firstValue(
                vehicle.vehicle_type,
                "—"
            )
        ),

        customVehicleType: String(
            firstValue(
                vehicle.custom_vehicle_type,
                ""
            )
        ),

        currentLocation: String(
            firstValue(
                vehicle.current_location,
                ""
            )
        ),

        status: normalizeStatus(
            vehicle.vehicle_status
        ),

        databaseStatus: String(
            firstValue(
                vehicle.vehicle_status,
                "inactive"
            )
        ),

        assignedDriverId: firstValue(
            vehicle.assigned_driver_id,
            ""
        ),

        driver: driver
            ? {
                id: String(
                    firstValue(
                        driver.id,
                        ""
                    )
                ),

                driverId: String(
                    firstValue(
                        driver.driver_id,
                        ""
                    )
                ),

                name: String(
                    firstValue(
                        driver.name,
                        "Unassigned"
                    )
                )
            }
            : null,

        createdAt: vehicle.created_at || null,

        updatedAt: vehicle.updated_at || null
    };
}


/* =========================================================
   LOAD VEHICLES FROM SUPABASE
   ========================================================= */

async function loadVehicles() {

    const supabase = getSupabaseClient();

    if (!supabase) {

        showLoadError(
            "Supabase connection is not available."
        );

        return;
    }


    try {

        setLoadingState(true);


        const {
            data,
            error
        } = await supabase

            .from("vehicles")

            .select(`
                id,
                vehicle_id,
                vehicle_assigned,
                vehicle_number,
                vehicle_type,
                custom_vehicle_type,
                assigned_driver_id,
                vehicle_status,
                current_location,
                created_at,
                updated_at
            `)

            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "Unable to load vehicles:",
                error
            );

            showLoadError(
                "Unable to load vehicles from database."
            );

            return;
        }


        const vehicleRows =
            Array.isArray(data)
                ? data
                : [];

        const assignedDriverIds =
            Array.from(
                new Set(
                    vehicleRows
                        .map(vehicle => vehicle.assigned_driver_id)
                        .filter(Boolean)
                        .map(String)
                )
            );

        const driversById =
            new Map();

        if (assignedDriverIds.length > 0) {
            const {
                data: driverRows,
                error: driverError
            } = await supabase
                .from("drivers")
                .select("id,driver_id,name")
                .in("id", assignedDriverIds);

            if (driverError) {
                console.error(
                    "Unable to load vehicle driver details:",
                    driverError
                );
            } else {
                (driverRows || []).forEach(driver => {
                    driversById.set(
                        String(driver.id),
                        driver
                    );
                });
            }
        }

        allVehicles = vehicleRows
            .map(vehicle => {
                const assignedDriverId =
                    vehicle.assigned_driver_id;

                const driver =
                    assignedDriverId
                        ? (
                            driversById.get(
                                String(assignedDriverId)
                            ) || {
                                id: assignedDriverId,
                                driver_id: "",
                                name: "Driver details unavailable"
                            }
                        )
                        : null;

                return normalizeVehicle({
                    ...vehicle,
                    drivers: driver
                });
            })
            .filter(Boolean);


        filteredVehicles = [
            ...allVehicles
        ];


        updateTypeFilter();

        applyFilters();


    } catch (error) {

        console.error(
            "Unexpected vehicle loading error:",
            error
        );

        showLoadError(
            "An unexpected error occurred while loading vehicles."
        );

    } finally {

        setLoadingState(false);
    }
}


/* =========================================================
   UPDATE TYPE FILTER
   ========================================================= */

function updateTypeFilter() {

    if (!typeFilter) {
        return;
    }


    const currentValue =
        typeFilter.value;


    const types = new Set();


    allVehicles.forEach(
        vehicle => {

            const type =
                String(
                    vehicle.vehicleType || ""
                ).trim();


            if (
                type &&
                type !== "—"
            ) {
                types.add(type);
            }
        }
    );


    /*
     * Keep only the "All Types" option and
     * actual vehicle types from Supabase.
     */

    typeFilter.innerHTML = "";


    const allOption =
        document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "All Types";

    typeFilter.appendChild(
        allOption
    );


    Array.from(types)
        .sort(
            (a, b) =>
                a.localeCompare(b)
        )
        .forEach(type => {

            const option =
                document.createElement("option");

            option.value = type;
            option.textContent = type;

            typeFilter.appendChild(
                option
            );
        });


    const optionStillExists =
        Array.from(
            typeFilter.options
        ).some(
            option =>
                option.value === currentValue
        );


    typeFilter.value =
        optionStillExists
            ? currentValue
            : "all";
}


/* =========================================================
   FILTER VEHICLES
   ========================================================= */

function applyFilters() {

    const searchTerm =
        normalizeText(
            vehicleSearch
                ? vehicleSearch.value
                : ""
        );


    const selectedStatus =
        statusFilter
            ? statusFilter.value
            : "all";


    const selectedType =
        typeFilter
            ? typeFilter.value
            : "all";


    filteredVehicles =
        allVehicles.filter(
            vehicle => {


                const driverName =
                    vehicle.driver &&
                    vehicle.driver.name
                        ? vehicle.driver.name
                        : "";


                const driverId =
                    vehicle.driver &&
                    vehicle.driver.driverId
                        ? vehicle.driver.driverId
                        : "";


                const searchableText = [

                    vehicle.vehicleId,

                    vehicle.id,

                    vehicle.vehicleNumber,

                    vehicle.vehicleType,

                    vehicle.customVehicleType,

                    driverName,

                    driverId

                ]
                    .map(normalizeText)
                    .join(" ");


                const matchesSearch =
                    !searchTerm ||
                    searchableText.includes(
                        searchTerm
                    );


                const matchesStatus =
                    selectedStatus === "all" ||
                    normalizeText(
                        vehicle.status
                    ) ===
                    normalizeText(
                        selectedStatus
                    );


                const matchesType =
                    selectedType === "all" ||
                    normalizeText(
                        vehicle.vehicleType
                    ) ===
                    normalizeText(
                        selectedType
                    );


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesType
                );
            }
        );


    renderVehicles();

    updateSummary();
}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateSummary() {

    const vehicles =
        allVehicles;


    const total =
        vehicles.length;


    const available =
        vehicles.filter(
            vehicle =>
                vehicle.databaseStatus ===
                "available"
        ).length;


    const assigned =
        vehicles.filter(
            vehicle =>
                vehicle.databaseStatus ===
                "assigned"
        ).length;


    const delivery =
        vehicles.filter(
            vehicle =>
                vehicle.databaseStatus ===
                "on_delivery"
        ).length;


    const offline =
        vehicles.filter(
            vehicle =>
                vehicle.databaseStatus ===
                "inactive"
        ).length;


    if (totalVehicles) {
        totalVehicles.textContent =
            total;
    }


    if (availableVehicles) {
        availableVehicles.textContent =
            available;
    }


    if (assignedVehicles) {
        assignedVehicles.textContent =
            assigned;
    }


    if (deliveryVehicles) {
        deliveryVehicles.textContent =
            delivery;
    }


    if (offlineVehicles) {
        offlineVehicles.textContent =
            offline;
    }
}


/* =========================================================
   INITIALS
   ========================================================= */

function getInitials(name) {

    const text =
        String(name || "")
            .trim();


    if (!text) {
        return "—";
    }


    const parts =
        text
            .split(/\s+/)
            .filter(Boolean);


    if (parts.length === 1) {

        return parts[0]
            .slice(0, 2)
            .toUpperCase();
    }


    return (
        parts[0].charAt(0) +
        parts[
            parts.length - 1
        ].charAt(0)
    ).toUpperCase();
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   STATUS CLASS
   ========================================================= */

function getStatusClass(status) {

    switch (
        normalizeStatus(status)
    ) {

        case "Available":
            return "status-available";

        case "Assigned":
            return "status-assigned";

        case "On Delivery":
        case "Maintenance":
            return "status-delivery";

        case "Offline":
            return "status-offline";

        default:
            return "status-offline";
    }
}


/* =========================================================
   RENDER DRIVER
   ========================================================= */

function renderDriver(driver) {

    if (
        !driver ||
        !driver.name
    ) {

        return `
            <span class="no-driver">
                Unassigned
            </span>
        `;
    }


    const name =
        escapeHTML(
            driver.name
        );


    const initials =
        escapeHTML(
            getInitials(
                driver.name
            )
        );


    return `
        <div class="driver-cell">

            <div
                class="driver-avatar"
                aria-hidden="true"
            >
                ${initials}
            </div>

            <span
                class="driver-name"
                title="${name}"
            >
                ${name}
            </span>

        </div>
    `;
}


/* =========================================================
   RENDER VEHICLE ROW
   ========================================================= */

function renderVehicleRow(vehicle) {

    const databaseId =
        escapeHTML(
            vehicle.id || ""
        );


    const vehicleId =
        escapeHTML(
            vehicle.vehicleId || "—"
        );

    const vehicleAssigned =
        escapeHTML(
            vehicle.vehicleAssigned ||
            vehicle.vehicleId ||
            "Vehicle"
        );


    const vehicleNumber =
        escapeHTML(
            vehicle.vehicleNumber || "—"
        );


    const vehicleType =
        escapeHTML(
            vehicle.customVehicleType ||
            vehicle.vehicleType ||
            "—"
        );


    /*
     * The live vehicles table does not have
     * a separate vehicle name field.
     *
     * Therefore vehicle_id is used as the
     * displayed vehicle label.
     */

    const vehicleName =
        vehicleAssigned;


    const status =
        normalizeStatus(
            vehicle.databaseStatus
        );


    const statusClass =
        getStatusClass(
            status
        );


    /*
     * Current location is not present
     * in the live vehicles table.
     *
     * Keep the existing UI and show
     * "Not available" instead of fake data.
     */

    const location =
        vehicle.currentLocation ||
        "Not available";


    return `
        <tr data-vehicle-id="${databaseId}">

            <!-- Vehicle -->

            <td>

                <div class="vehicle-cell">

                    <div class="vehicle-icon">
                        <i class="fa-solid fa-truck"></i>
                    </div>

                    <div class="vehicle-main">

                        <span
                            class="vehicle-id"
                            title="${vehicleId}"
                        >
                            ${vehicleAssigned}
                        </span>

                        <span
                            class="vehicle-label"
                            title="${vehicleId}"
                        >
                            ${vehicleId}
                        </span>

                    </div>

                </div>

            </td>


            <!-- Vehicle Number -->

            <td>

                <span
                    class="vehicle-number"
                    title="${vehicleNumber}"
                >
                    ${vehicleNumber}
                </span>

            </td>


            <!-- Vehicle Type -->

            <td>

                <span
                    class="vehicle-type"
                    title="${vehicleType}"
                >
                    ${vehicleType}
                </span>

            </td>


            <!-- Assigned Driver -->

            <td>
                ${renderDriver(vehicle.driver)}
            </td>


            <!-- Status -->

            <td>

                <span
                    class="status-badge ${statusClass}"
                >
                    ${escapeHTML(status)}
                </span>

            </td>


            <!-- Current Location -->

            <td>

                <div
                    class="location-cell"
                    title="${escapeHTML(location)}"
                >

                    <i
                        class="fa-solid fa-location-dot"
                    ></i>

                    <span class="location-text">
                        ${escapeHTML(location)}
                    </span>

                </div>

            </td>


            <!-- Action -->

            <td>

                <button
                    type="button"
                    class="vehicle-action-btn"
                    data-action="view"
                    data-vehicle-id="${databaseId}"
                    title="View vehicle details"
                    aria-label="View ${vehicleName} details"
                >
                    <i class="fa-regular fa-eye"></i>
                </button>

            </td>

        </tr>
    `;
}


/* =========================================================
   RENDER VEHICLES
   ========================================================= */

function renderVehicles() {

    if (!vehiclesTableBody) {
        return;
    }


    vehiclesTableBody.innerHTML =
        "";


    if (
        filteredVehicles.length ===
        0
    ) {

        if (emptyVehiclesState) {

            emptyVehiclesState.hidden =
                false;
        }

        const hasVehicles =
            allVehicles.length > 0;

        if (emptyVehiclesTitle) {
            emptyVehiclesTitle.textContent =
                hasVehicles
                    ? "No Matching Vehicles"
                    : "No Vehicles Found";
        }

        if (emptyVehiclesMessage) {
            emptyVehiclesMessage.textContent =
                hasVehicles
                    ? "No vehicles match the selected search or filters. Clear them to see all vehicles."
                    : "No vehicles are registered yet.";
        }

        if (vehicleResultInfo) {

            vehicleResultInfo.textContent =
                hasVehicles
                    ? `No vehicles match (${allVehicles.length} total)`
                    : "No vehicles available";
        }


        return;
    }


    if (emptyVehiclesState) {

        emptyVehiclesState.hidden =
            true;
    }


    vehiclesTableBody.innerHTML =
        filteredVehicles
            .map(
                renderVehicleRow
            )
            .join("");


    if (vehicleResultInfo) {

        const count =
            filteredVehicles.length;


        const total =
            allVehicles.length;


        vehicleResultInfo.textContent =

            count === total

                ? `Showing ${count} vehicle${
                    count === 1
                        ? ""
                        : "s"
                }`

                : `Showing ${count} of ${total} vehicles`;
    }
}


/* =========================================================
   VIEW VEHICLE DETAILS
   ========================================================= */

function viewVehicleDetails(
    vehicleId
) {

    if (!vehicleId) {
        return;
    }


    const url =
        `vehicle-details.html?id=${encodeURIComponent(
            vehicleId
        )}`;


    window.location.href =
        url;
}


/* =========================================================
   ADD VEHICLE
   ========================================================= */

function openAddVehiclePage() {

    window.location.href =
        "add-vehicles.html";
}


/* =========================================================
   SIDEBAR TOGGLE
   ========================================================= */

function toggleSidebar() {

    if (!sidebar) {
        return;
    }


    /*
     * Desktop:
     * collapse / expand sidebar.
     *
     * Mobile:
     * open / close sidebar.
     */

    if (
        window.innerWidth <= 768
    ) {

        sidebar.classList.toggle(
            "mobile-open"
        );

        return;
    }


    sidebar.classList.toggle(
        "collapsed"
    );
}


/* =========================================================
   CLOSE MOBILE SIDEBAR
   ========================================================= */

function closeMobileSidebar() {

    if (!sidebar) {
        return;
    }


    if (
        window.innerWidth <= 768
    ) {

        sidebar.classList.remove(
            "mobile-open"
        );
    }
}


/* =========================================================
   LOADING STATE
   ========================================================= */

function setLoadingState(
    isLoading
) {

    if (!refreshVehiclesBtn) {
        return;
    }


    const icon =
        refreshVehiclesBtn.querySelector(
            "i"
        );


    if (isLoading) {

        refreshVehiclesBtn.disabled =
            true;


        icon?.classList.add(
            "fa-spin"
        );

        return;
    }


    refreshVehiclesBtn.disabled =
        false;


    icon?.classList.remove(
        "fa-spin"
    );
}


/* =========================================================
   DATABASE ERROR STATE
   ========================================================= */

function showLoadError(
    message
) {

    allVehicles = [];

    filteredVehicles = [];


    if (vehiclesTableBody) {

        vehiclesTableBody.innerHTML =
            "";
    }


    if (emptyVehiclesState) {

        emptyVehiclesState.hidden =
            false;
    }

    if (emptyVehiclesTitle) {
        emptyVehiclesTitle.textContent =
            "Unable to Load Vehicles";
    }

    if (emptyVehiclesMessage) {
        emptyVehiclesMessage.textContent =
            message;
    }


    if (vehicleResultInfo) {

        vehicleResultInfo.textContent =
            message;
    }


    updateSummary();
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */


/* Sidebar */

if (menuToggle) {

    menuToggle.addEventListener(
        "click",
        toggleSidebar
    );
}


/* Search */

if (vehicleSearch) {

    vehicleSearch.addEventListener(
        "input",
        applyFilters
    );
}


/* Status filter */

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        applyFilters
    );
}


/* Vehicle type filter */

if (typeFilter) {

    typeFilter.addEventListener(
        "change",
        applyFilters
    );
}


/* Refresh */

if (refreshVehiclesBtn) {

    refreshVehiclesBtn.addEventListener(
        "click",
        async () => {

            await loadVehicles();

        }
    );
}


/* Add vehicle */

if (addVehicleBtn) {

    addVehicleBtn.addEventListener(
        "click",
        openAddVehiclePage
    );
}


/* =========================================================
   TABLE ACTION DELEGATION
   ========================================================= */

if (vehiclesTableBody) {

    vehiclesTableBody.addEventListener(
        "click",
        event => {

            const actionButton =
                event.target.closest(
                    "[data-action]"
                );


            if (!actionButton) {
                return;
            }


            const action =
                actionButton.dataset.action;


            const vehicleId =
                actionButton.dataset.vehicleId;


            if (
                action === "view" &&
                vehicleId
            ) {

                viewVehicleDetails(
                    vehicleId
                );
            }
        }
    );
}


/* =========================================================
   SIDEBAR LINK HANDLING
   ========================================================= */

$$(
    ".sidebar-nav .nav-item"
).forEach(
    navItem => {

        navItem.addEventListener(
            "click",
            closeMobileSidebar
        );
    }
);


/* =========================================================
   WINDOW RESIZE
   ========================================================= */

window.addEventListener(
    "resize",
    () => {

        if (!sidebar) {
            return;
        }


        /*
         * Prevent a mobile-open state from
         * carrying into desktop.
         */

        if (
            window.innerWidth > 768
        ) {

            sidebar.classList.remove(
                "mobile-open"
            );
        }
    }
);


/* =========================================================
   INITIAL LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadVehicles();

    }
);