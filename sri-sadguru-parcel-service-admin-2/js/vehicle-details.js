"use strict";

/*
===========================================================
SRI SADGURU PARCEL SERVICE
VEHICLE DETAILS — SUPABASE VERSION

DATABASE:
    public.vehicles
    public.drivers

RELATION:
    vehicles.assigned_driver_id
        ↓
    drivers.id

IMPORTANT:
- No localStorage vehicle data.
- No demo vehicles.
- No demo drivers.
- No fake GPS movement.
- Vehicle information comes from Supabase.
- Driver information comes from Supabase.
- Existing HTML/CSS/UI is preserved.
===========================================================
*/


/* =========================================================
   SETTINGS
========================================================= */

const VEHICLES_PAGE = "vehicles.html";

/* =========================================================
   SUPABASE
========================================================= */

const supabaseClient =
    window.supabaseClient;


/* =========================================================
   URL
========================================================= */

const params =
    new URLSearchParams(
        window.location.search
    );


const requestedVehicleId =
    params.get("id");


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = id =>
    document.getElementById(id);


function setText(
    id,
    value
) {

    const element =
        $(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined ||
        String(value).trim() === ""
            ? "—"
            : value;

}


function safeValue(
    value,
    fallback = "—"
) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {

        return fallback;

    }

    return value;

}


function escapeHTML(
    value
) {

    return String(
        value ?? ""
    ).replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]
    );

}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(
    value
) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return safeValue(
            value
        );

    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* =========================================================
   VEHICLE STATUS
========================================================= */

function formatVehicleStatus(
    status
) {

    if (!status) {
        return "—";
    }

    const value =
        String(status)
            .trim()
            .toLowerCase()
            .replace(/_/g, " ");

    return value
        .replace(
            /\b\w/g,
            character =>
                character.toUpperCase()
        );

}


/* =========================================================
   VEHICLE STATUS HELPERS
========================================================= */

function isVehicleMoving(
    vehicle
) {

    const status =
        String(
            vehicle.vehicle_status || ""
        )
            .toLowerCase()
            .replace(/_/g, " ");

    return [
        "on delivery",
        "out for delivery",
        "in transit"
    ].includes(
        status
    );

}


/* =========================================================
   SUPABASE AUTH
========================================================= */

async function verifyAdminAccess() {

    if (!supabaseClient) {

        throw new Error(
            "Supabase client was not found. Make sure js/supabase-client.js is loaded before vehicle-details.js."
        );

    }


    /*
    Use the existing SSP admin authentication
    when it is available.
    */

    if (
        typeof window.requireAdminAuth ===
        "function"
    ) {

        await window.requireAdminAuth();

        return;

    }


    /*
    Fallback authentication check.
    */

    const {
        data,
        error
    } =
        await supabaseClient.auth.getSession();


    if (error) {
        throw error;
    }


    if (
        !data ||
        !data.session
    ) {

        window.location.href =
            "../index.html";

        throw new Error(
            "Admin session not found."
        );

    }


    const user =
        data.session.user;


    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "id,email,role,status"
            )
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


    if (profileError) {
        throw profileError;
    }


    if (
        !profile ||
        profile.role !== "admin" ||
        profile.status !== "active"
    ) {

        await supabaseClient.auth.signOut();

        window.location.href =
            "../index.html";

        throw new Error(
            "Admin access required."
        );

    }

}


/* =========================================================
   LOAD VEHICLE
========================================================= */

async function loadVehicle() {

    if (!requestedVehicleId) {

        throw new Error(
            "Vehicle ID is missing from the page URL."
        );

    }


    /*
    Vehicle primary key is UUID.
    Vehicle ID is the human-readable vehicle_id.
    
    Support both:
        ?id=<uuid>
    and:
        ?id=VEH-0001
    */

    let query =
        supabaseClient
            .from("vehicles")
            .select("*");


    /*
    UUID detection.
    */

    const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


    if (
        uuidPattern.test(
            requestedVehicleId
        )
    ) {

        query =
            query.eq(
                "id",
                requestedVehicleId
            );

    } else {

        query =
            query.eq(
                "vehicle_id",
                requestedVehicleId
            );

    }


    const {
        data,
        error
    } =
        await query.maybeSingle();


    if (error) {
        throw error;
    }


    if (!data) {

        throw new Error(
            "Vehicle was not found in the Supabase database."
        );

    }


    /*
    Load assigned driver separately.
    
    This keeps the code compatible with
    the existing foreign-key structure.
    */

    let driver = null;


    if (
        data.assigned_driver_id
    ) {

        const {
            data: driverData,
            error: driverError
        } =
            await supabaseClient
                .from("drivers")
                .select(`
                    id,
                    driver_id,
                    name,
                    phone,
                    status,
                    vehicle_assigned
                `)
                .eq(
                    "id",
                    data.assigned_driver_id
                )
                .maybeSingle();


        if (driverError) {
            throw driverError;
        }


        driver =
            driverData || null;

    }


    return normalizeVehicle(
        data,
        driver
    );

}


/* =========================================================
   NORMALIZE DATABASE VEHICLE
========================================================= */

function normalizeVehicle(
    row,
    driver
) {

    const vehicleType =
        row.custom_vehicle_type ||
        row.vehicle_type;


    return {

        id:
            row.id,

        vehicleId:
            safeValue(
                row.vehicle_id
            ),

        assignedName:
            safeValue(
                row.vehicle_assigned,
                row.vehicle_id
            ),

        vehicleAssignedRaw:
            row.vehicle_assigned || "",

        number:
            safeValue(
                row.vehicle_number
            ),

        type:
            safeValue(
                vehicleType
            ),

        standardType:
            safeValue(
                row.vehicle_type
            ),

        customType:
            safeValue(
                row.custom_vehicle_type
            ),

        status:
            safeValue(
                row.vehicle_status,
                "available"
            ),

        assignedDriverId:
            row.assigned_driver_id,

        vehicleModel:
            safeValue(row.vehicle_model, ""),

        manufacturer:
            safeValue(row.manufacturer, ""),

        manufacturingYear:
            safeValue(row.manufacturing_year, ""),

        fuelType:
            safeValue(row.fuel_type, ""),

        rcNumber:
            safeValue(row.rc_number, ""),

        rcExpiry:
            row.rc_expiry || null,

        insuranceNumber:
            safeValue(row.insurance_number, ""),

        insuranceExpiry:
            row.insurance_expiry || null,

        permitNumber:
            safeValue(row.permit_number, ""),

        permitExpiry:
            row.permit_expiry || null,

        pollutionNumber:
            safeValue(row.pollution_number, ""),

        pollutionExpiry:
            row.pollution_expiry || null,

        currentLocation:
            safeValue(row.current_location, ""),

        gpsTracking:
            safeValue(row.gps_tracking, ""),

        gpsDeviceId:
            safeValue(row.gps_device_id, ""),

        loadCapacity:
            safeValue(row.load_capacity, ""),

        seatingCapacity:
            safeValue(row.seating_capacity, ""),

        currentOdometer:
            safeValue(row.current_odometer, ""),

        lastServiceDate:
            row.last_service_date || null,

        nextServiceDate:
            row.next_service_date || null,

        nextServiceAt:
            safeValue(row.next_service_at, ""),

        maintenanceStatus:
            safeValue(row.maintenance_status, ""),

        notes:
            safeValue(row.notes, ""),

        driver: driver
            ? {
                id:
                    safeValue(
                        driver.id
                    ),

                driverId:
                    safeValue(
                        driver.driver_id
                    ),

                name:
                    safeValue(
                        driver.name
                    ),

                phone:
                    safeValue(
                        driver.phone
                    ),

                status:
                    safeValue(
                        driver.status
                    )
            }
            : null,

        createdAt:
            row.created_at,

        updatedAt:
            row.updated_at

    };

}


/* =========================================================
   STATE
========================================================= */

let currentVehicle =
    null;

let map =
    null;

let vehicleMarker =
    null;


/* =========================================================
   RENDER VEHICLE PROFILE
========================================================= */

function renderVehicleProfile(
    vehicle
) {

    setText(
        "sspId",
        vehicle.vehicleId
    );


    setText(
        "vehicleNumber",
        vehicle.number
    );


    setText(
        "vehicleTypeModel",
        vehicle.type
    );


    setText(
        "driverName",
        vehicle.driver
            ? vehicle.driver.name
            : "Not Assigned"
    );


    const driverPhone =
        $("driverPhone");


    if (driverPhone) {

        const phone =
            vehicle.driver
                ? safeValue(
                    vehicle.driver.phone,
                    ""
                )
                : "";


        driverPhone.href =
            phone
                ? `tel:${phone.replace(/\s+/g, "")}`
                : "#";


        const span =
            driverPhone.querySelector(
                "span"
            );


        if (span) {

            span.textContent =
                phone ||
                "No phone";

        }

    }


    const onlineText =
        $("vehicleOnlineText");


    if (onlineText) {

        /*
        The current vehicles table does not
        contain GPS/online fields.

        Therefore do not falsely display
        Connected / Online.
        */

        onlineText.textContent =
            "Not Tracked";

    }


    setText(
        "movementStatus",
        isVehicleMoving(vehicle)
            ? "Moving"
            : formatVehicleStatus(
                vehicle.status
            )
    );


    /*
    No GPS speed exists in the
    current vehicles table.
    */

    setText(
        "currentSpeed",
        "—"
    );


    setText(
        "direction",
        "—"
    );


    setText(
        "gpsStatus",
        "Not Available"
    );


    setText(
        "lastUpdated",
        formatDate(
            vehicle.updatedAt
        )
    );

}


/* =========================================================
   RENDER TRIP
========================================================= */

function renderTrip(
    vehicle
) {

    /*
    The current vehicles table does not
    contain trip/odometer/fuel/ETA data.
    
    Do not display fake values.
    */

    setText(
        "distanceTravelled",
        "—"
    );


    setText(
        "totalDuration",
        "—"
    );


    setText(
        "averageSpeed",
        "—"
    );


    setText(
        "fuelLevel",
        "—"
    );


    setText(
        "eta",
        "—"
    );


    setText(
        "startLocation",
        "—"
    );


    setText(
        "startTime",
        "—"
    );


    setText(
        "currentLocation",
        vehicle.currentLocation ||
        "Location tracking not configured"
    );


    setText(
        "destinationLocation",
        "—"
    );


    setText(
        "etaMap",
        "ETA: —"
    );


    setText(
        "mapSpeed",
        "—"
    );


    setText(
        "tripProgressPercent",
        "0% Completed"
    );


    const progressBar =
        $("tripProgressBar");


    if (progressBar) {

        progressBar.style.width =
            "0%";

    }


    setText(
        "tripStart",
        "—"
    );


    setText(
        "tripStartTime",
        "—"
    );


    setText(
        "tripDistance",
        "—"
    );


    setText(
        "tripDestination",
        "—"
    );


    setText(
        "tripEta",
        "— (ETA)"
    );

}


/* =========================================================
   RENDER CURRENT STATUS
========================================================= */

function renderCurrentStatus(
    vehicle
) {

    const moving =
        isVehicleMoving(
            vehicle
        );


    setText(
        "ignitionStatus",
        "—"
    );


    setText(
        "engineStatus",
        "—"
    );


    setText(
        "acStatus",
        "—"
    );


    setText(
        "odometer",
        vehicle.currentOdometer
            ? `${vehicle.currentOdometer} km`
            : "—"
    );


    setText(
        "todayDistance",
        "—"
    );


    setText(
        "lastStop",
        moving
            ? "Location tracking not configured"
            : "—"
    );


    /*
    Mobile.
    */

    setText(
        "mobileIgnition",
        "—"
    );


    setText(
        "mobileEngine",
        "—"
    );


    setText(
        "mobileAc",
        "—"
    );


    setText(
        "mobileOdometer",
        vehicle.currentOdometer
            ? `${vehicle.currentOdometer} km`
            : "—"
    );

}


/* =========================================================
   RENDER VEHICLE INFORMATION
========================================================= */

function renderVehicleInformation(
    vehicle
) {

    setText(
        "infoVehicleId",
        vehicle.vehicleId
    );


    setText(
        "infoVehicleNumber",
        vehicle.number
    );


    setText(
        "infoVehicleType",
        vehicle.type
    );


    setText(
        "infoMakeModel",
        [vehicle.manufacturer, vehicle.vehicleModel]
            .filter(Boolean)
            .join(" ")
    );


    setText(
        "infoModelYear",
        vehicle.manufacturingYear
    );


    setText(
        "infoFuelType",
        vehicle.fuelType
    );

    setText(
        "infoLoadCapacity",
        vehicle.loadCapacity
    );

    setText(
        "infoSeatingCapacity",
        vehicle.seatingCapacity
    );


    setText(
        "infoRcNumber",
        vehicle.rcNumber
    );


    setText(
        "infoInsurance",
        vehicle.insuranceExpiry
            ? formatDate(vehicle.insuranceExpiry)
            : vehicle.insuranceNumber
    );


    setText(
        "infoPollution",
        vehicle.pollutionExpiry
            ? formatDate(vehicle.pollutionExpiry)
            : vehicle.pollutionNumber
    );


    /*
    Mobile.
    */

    setText(
        "mobileVehicleId",
        vehicle.vehicleId
    );


    setText(
        "mobileVehicleNumber",
        vehicle.number
    );


    setText(
        "mobileVehicleType",
        vehicle.type
    );


    setText(
        "mobileVehicleModel",
        vehicle.vehicleModel
    );


    setText(
        "mobileVehicleYear",
        vehicle.manufacturingYear
    );


    setText(
        "mobileVehicleFuel",
        vehicle.fuelType
    );

    setText(
        "mobileLoadCapacity",
        vehicle.loadCapacity
    );

    setText(
        "mobileSeatingCapacity",
        vehicle.seatingCapacity
    );

}


/* =========================================================
   RENDER DRIVER
========================================================= */

function renderMobileDriver(
    vehicle
) {

    const driver =
        vehicle.driver;


    setText(
        "mobileDriverName",
        driver
            ? driver.name
            : "Not Assigned"
    );


    setText(
        "mobileDriverId",
        driver
            ? driver.driverId
            : "—"
    );


    setText(
        "mobileDriverStatus",
        driver
            ? formatVehicleStatus(
                driver.status
            )
            : "Not Assigned"
    );


    const phone =
        $("mobileDriverPhone");


    if (phone) {

        phone.textContent =
            "";


        const icon =
            document.createElement(
                "i"
            );


        icon.className =
            "fa-solid fa-phone";


        phone.appendChild(
            icon
        );


        phone.appendChild(
            document.createTextNode(
                " " +
                (
                    driver
                        ? safeValue(
                            driver.phone
                        )
                        : "No phone"
                )
            )
        );


        phone.href =
            driver &&
            driver.phone &&
            driver.phone !== "—"
                ? `tel:${driver.phone.replace(/\s+/g, "")}`
                : "#";

    }

}


/* =========================================================
   RENDER DOCUMENTS
========================================================= */

function renderDocuments(
    vehicle
) {

    setText(
        "mobileRcNumber",
        vehicle.rcNumber
    );


    setText(
        "mobileRcExpiry",
        vehicle.rcExpiry
            ? formatDate(vehicle.rcExpiry)
            : "—"
    );


    setText(
        "mobileInsurance",
        vehicle.insuranceNumber
    );


    setText(
        "mobileInsuranceExpiry",
        vehicle.insuranceExpiry
            ? formatDate(vehicle.insuranceExpiry)
            : "—"
    );


    setText(
        "mobilePollution",
        vehicle.pollutionNumber
    );


    setText(
        "mobilePermit",
        vehicle.permitExpiry
            ? `${vehicle.permitNumber || "Permit"} · ${formatDate(vehicle.permitExpiry)}`
            : vehicle.permitNumber
    );

}


/* =========================================================
   RENDER MAINTENANCE
========================================================= */

function renderMaintenance(
    vehicle
) {

    setText(
        "mobileLastService",
        vehicle.lastServiceDate
            ? formatDate(vehicle.lastServiceDate)
            : "—"
    );


    setText(
        "mobileNextService",
        vehicle.nextServiceDate
            ? formatDate(vehicle.nextServiceDate)
            : "—"
    );


    setText(
        "mobileNextServiceKm",
        vehicle.nextServiceAt
            ? `${vehicle.nextServiceAt} km`
            : "—"
    );


    setText(
        "mobileMaintenanceStatus",
        vehicle.maintenanceStatus || "Not Available"
    );

}


/* =========================================================
   RENDER TRACKING
========================================================= */

function renderTrackingInfo(
    vehicle
) {

    setText(
        "mobileGpsTracking",
        vehicle.gpsTracking || "Not Configured"
    );


    setText(
        "mobileGpsDevice",
        vehicle.gpsDeviceId
    );


    setText(
        "mobileTrackingLocation",
        vehicle.currentLocation
    );


    setText(
        "mobileTrackingUpdated",
        formatDate(
            vehicle.updatedAt
        )
    );

}


/* =========================================================
   ALERTS
========================================================= */

function renderAlerts(
    vehicle
) {

    const container =
        $("alertsList");


    if (!container) {
        return;
    }


    /*
    There is currently no vehicle
    alerts table in the database.
    */

    container.innerHTML = `
        <div class="alert-item">

            <div class="alert-icon">
                <i class="fa-solid fa-circle-check"></i>
            </div>

            <div>
                <strong>
                    No Recent Alerts
                </strong>

                <span>
                    Vehicle alert tracking is not configured.
                </span>
            </div>

            <small>
                —
            </small>

        </div>
    `;

}


/* =========================================================
   MAP
========================================================= */

function initializeMap(
    vehicle
) {

    if (
        typeof L ===
        "undefined"
    ) {

        console.warn(
            "Leaflet was not loaded."
        );

        return;

    }


    const mapElement =
        $("vehicleMap");


    if (!mapElement) {
        return;
    }


    /*
    IMPORTANT:
    Current vehicles table does not
    contain latitude/longitude.

    Therefore we do not create fake
    coordinates or fake movement.
    */


    map =
        L.map(
            mapElement,
            {
                zoomControl:
                    false,

                attributionControl:
                    true
            }
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(
        map
    );


    /*
    Default Hubballi view only provides
    a map background.

    It is NOT presented as the vehicle
    location.
    */

    map.setView(
        [
            15.3647,
            75.1240
        ],
        12
    );


    /*
    Show an informational message
    on the map.
    */

    const mapNotice =
        L.control({
            position:
                "topright"
        });


    mapNotice.onAdd =
        function () {

            const div =
                L.DomUtil.create(
                    "div",
                    "vehicle-map-notice"
                );


            div.innerHTML = `
                <div style="
                    background:#ffffff;
                    padding:10px 12px;
                    border-radius:8px;
                    box-shadow:0 2px 8px rgba(0,0,0,.18);
                    font-size:12px;
                    line-height:1.4;
                ">
                    <strong>
                        Live location
                    </strong>
                    <br>
                    GPS tracking is not configured for this vehicle.
                </div>
            `;


            return div;

        };


    mapNotice.addTo(
        map
    );

}


/* =========================================================
   MAP CONTROLS
========================================================= */

function setupMapControls() {

    const zoomIn =
        $("zoomIn");


    const zoomOut =
        $("zoomOut");


    const centerVehicle =
        $("centerVehicle");


    const fullscreenMap =
        $("fullscreenMap");


    const refreshLocation =
        $("refreshLocation");


    if (zoomIn) {

        zoomIn.addEventListener(
            "click",
            () => {

                if (map) {
                    map.zoomIn();
                }

            }
        );

    }


    if (zoomOut) {

        zoomOut.addEventListener(
            "click",
            () => {

                if (map) {
                    map.zoomOut();
                }

            }
        );

    }


    if (centerVehicle) {

        centerVehicle.addEventListener(
            "click",
            () => {

                if (
                    map &&
                    vehicleMarker
                ) {

                    map.setView(
                        vehicleMarker.getLatLng(),
                        Math.max(
                            map.getZoom(),
                            14
                        )
                    );

                } else if (map) {

                    map.setView(
                        [
                            15.3647,
                            75.1240
                        ],
                        12
                    );

                }

            }
        );

    }


    if (fullscreenMap) {

        fullscreenMap.addEventListener(
            "click",
            () => {

                const mapContainer =
                    document.querySelector(
                        ".map-container"
                    );


                if (!mapContainer) {
                    return;
                }


                if (
                    !document.fullscreenElement
                ) {

                    if (
                        mapContainer.requestFullscreen
                    ) {

                        mapContainer.requestFullscreen();

                    }

                } else {

                    document.exitFullscreen();

                }

            }
        );

    }


    if (refreshLocation) {

        refreshLocation.addEventListener(
            "click",
            refreshVehicleLocation
        );

    }

}


/* =========================================================
   REFRESH
========================================================= */

async function refreshVehicleLocation() {

    const button =
        $("refreshLocation");


    if (button) {

        button.disabled =
            true;


        button.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i>`;

    }


    try {

        currentVehicle =
            await loadVehicle();


        renderVehiclePage(
            currentVehicle
        );

    } catch (error) {

        console.error(
            "Unable to refresh vehicle:",
            error
        );


        showError(
            "Unable to refresh vehicle details."
        );

    } finally {

        if (button) {

            button.disabled =
                false;


            button.innerHTML =
                `<i class="fa-solid fa-rotate"></i>`;

        }

    }

}


/* =========================================================
   COPY SSP / VEHICLE ID
========================================================= */

function setupCopyButton() {

    const button =
        $("copySspId");


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async () => {

            if (!currentVehicle) {
                return;
            }


            const id =
                currentVehicle.vehicleId;


            try {

                await navigator.clipboard.writeText(
                    id
                );


                button.innerHTML =
                    `<i class="fa-solid fa-check"></i>`;


                setTimeout(
                    () => {

                        button.innerHTML =
                            `<i class="fa-regular fa-copy"></i>`;

                    },
                    1200
                );

            } catch (error) {

                console.warn(
                    "Copy unavailable:",
                    error
                );

            }

        }
    );

}


/* =========================================================
   ACCORDIONS
========================================================= */

function setupAccordions() {

    document
        .querySelectorAll(
            ".accordion-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const card =
                            button.closest(
                                ".mobile-accordion-card"
                            );


                        if (!card) {
                            return;
                        }


                        card.classList.toggle(
                            "open"
                        );

                    }
                );

            }
        );

}


/* =========================================================
   SIDEBAR
========================================================= */

function setupSidebar() {

    const menuButton =
        $("menuButton");


    const sidebar =
        $("sidebar");


    const sidebarOverlay =
        $("sidebarOverlay");


    const sidebarCollapse =
        $("sidebarCollapse");


    if (
        !menuButton ||
        !sidebar
    ) {

        return;

    }


    menuButton.addEventListener(
        "click",
        () => {

            if (
                window.innerWidth <=
                900
            ) {

                sidebar.classList.add(
                    "mobile-open"
                );


                if (
                    sidebarOverlay
                ) {

                    sidebarOverlay.classList.add(
                        "show"
                    );

                }


                document.body.style.overflow =
                    "hidden";


                return;

            }


            document.body.classList.toggle(
                "sidebar-collapsed"
            );

        }
    );


    if (
        sidebarCollapse
    ) {

        sidebarCollapse.addEventListener(
            "click",
            () => {

                document.body.classList.toggle(
                    "sidebar-collapsed"
                );

            }
        );

    }


    function closeMobileSidebar() {

        sidebar.classList.remove(
            "mobile-open"
        );


        if (
            sidebarOverlay
        ) {

            sidebarOverlay.classList.remove(
                "show"
            );

        }


        document.body.style.overflow =
            "";

    }


    if (
        sidebarOverlay
    ) {

        sidebarOverlay.addEventListener(
            "click",
            closeMobileSidebar
        );

    }


    sidebar
        .querySelectorAll(
            "a"
        )
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    () => {

                        if (
                            window.innerWidth <=
                            900
                        ) {

                            closeMobileSidebar();

                        }

                    }
                );

            }
        );

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const back =
        $("backToVehicles");


    if (back) {

        back.addEventListener(
            "click",
            () => {

                window.location.href =
                    VEHICLES_PAGE;

            }
        );

    }


    const editButton =
        $("editVehicleBtn");


    if (editButton) {

        editButton.addEventListener(
            "click",
            openVehicleEditModal
        );

    }


    const changeDriver =
        $("changeDriverBtn");


    if (changeDriver) {

        changeDriver.addEventListener(
            "click",
            openDriverModal
        );

    }

}


/* =========================================================
   EDIT VEHICLE DETAILS
========================================================= */

function openVehicleEditModal() {

    if (!currentVehicle) {
        return;
    }

    const modal =
        $("vehicleEditModal");

    const form =
        $("vehicleEditForm");

    if (!modal || !form) {
        throw new Error(
            "Vehicle editor is not available on this page."
        );
    }

    const values = {
        vehicle_id: currentVehicle.vehicleId,
        vehicle_assigned: currentVehicle.vehicleAssignedRaw,
        vehicle_number: currentVehicle.number,
        vehicle_type: currentVehicle.standardType,
        custom_vehicle_type: currentVehicle.customType,
        vehicle_model: currentVehicle.vehicleModel,
        manufacturer: currentVehicle.manufacturer,
        manufacturing_year: currentVehicle.manufacturingYear,
        vehicle_status: String(currentVehicle.status || "available")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_"),
        rc_number: currentVehicle.rcNumber,
        rc_expiry: currentVehicle.rcExpiry,
        insurance_number: currentVehicle.insuranceNumber,
        insurance_expiry: currentVehicle.insuranceExpiry,
        permit_number: currentVehicle.permitNumber,
        permit_expiry: currentVehicle.permitExpiry,
        pollution_number: currentVehicle.pollutionNumber,
        pollution_expiry: currentVehicle.pollutionExpiry,
        current_location: currentVehicle.currentLocation,
        gps_tracking: currentVehicle.gpsTracking,
        gps_device_id: currentVehicle.gpsDeviceId,
        load_capacity: currentVehicle.loadCapacity,
        seating_capacity: currentVehicle.seatingCapacity,
        fuel_type: currentVehicle.fuelType,
        current_odometer: currentVehicle.currentOdometer,
        last_service_date: currentVehicle.lastServiceDate,
        next_service_date: currentVehicle.nextServiceDate,
        next_service_at: currentVehicle.nextServiceAt,
        maintenance_status: currentVehicle.maintenanceStatus,
        notes: currentVehicle.notes
    };

    Object.entries(values).forEach(
        ([name, value]) => {
            const field =
                form.elements.namedItem(name);

            if (!field) {
                return;
            }

            const fieldValue =
                value === "—" || value === null || value === undefined
                    ? ""
                    : String(value);

            if (
                field instanceof HTMLSelectElement &&
                fieldValue &&
                !Array.from(field.options).some(
                    option => option.value === fieldValue
                )
            ) {
                const option =
                    document.createElement("option");

                option.value = fieldValue;
                option.textContent = fieldValue;
                field.appendChild(option);
            }

            field.value =
                field.type === "date"
                    ? fieldValue.slice(0, 10)
                    : fieldValue;
        }
    );

    updateCustomVehicleTypeField(form);
    modal.hidden = false;
    form.elements.namedItem("vehicle_assigned")?.focus();
}


function updateCustomVehicleTypeField(form) {

    const vehicleType =
        form.elements.namedItem("vehicle_type");

    const customType =
        form.elements.namedItem("custom_vehicle_type");

    const customTypeField =
        $("customVehicleTypeField");

    if (!vehicleType || !customType || !customTypeField) {
        return;
    }

    const isCustom =
        vehicleType.value === "Custom";

    customTypeField.hidden = !isCustom;
    customType.required = isCustom;

    if (!isCustom) {
        customType.value = "";
    }
}


function closeVehicleEditModal() {

    const modal =
        $("vehicleEditModal");

    if (modal) {
        modal.hidden = true;
    }
}


function optionalEditNumber(
    formData,
    name,
    label,
    integer = false,
    minimum = 0
) {

    const rawValue =
        String(formData.get(name) || "").trim();

    if (!rawValue) {
        return null;
    }

    const value =
        Number(rawValue);

    if (
        !Number.isFinite(value) ||
        value < minimum ||
        (integer && !Number.isInteger(value))
    ) {
        throw new Error(
            `${label} must be a valid ${integer ? "whole number" : "number"}.`
        );
    }

    return value;
}


async function saveVehicleDetails(event) {

    event.preventDefault();

    if (!currentVehicle) {
        return;
    }

    const form =
        $("vehicleEditForm");

    const saveButton =
        $("saveVehicleEdit");

    if (!form || !form.reportValidity()) {
        return;
    }

    const formData =
        new FormData(form);

    const textValue = name =>
        String(formData.get(name) || "").trim();

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    }

    try {

        const selectedStatus =
            textValue("vehicle_status");

        const vehicleStatus =
            currentVehicle.assignedDriverId
                ? (
                    selectedStatus === "available"
                        ? "assigned"
                        : selectedStatus
                )
                : (
                    selectedStatus === "assigned"
                        ? "available"
                        : selectedStatus
                );

        const vehicleRecord = {
            vehicle_assigned:
                textValue("vehicle_assigned") || null,
            vehicle_number:
                textValue("vehicle_number"),
            vehicle_type:
                textValue("vehicle_type"),
            custom_vehicle_type:
                textValue("vehicle_type") === "Custom"
                    ? textValue("custom_vehicle_type")
                    : null,
            vehicle_status: vehicleStatus,
            vehicle_model:
                textValue("vehicle_model") || null,
            manufacturer:
                textValue("manufacturer") || null,
            manufacturing_year:
                optionalEditNumber(
                    formData,
                    "manufacturing_year",
                    "Manufacturing year",
                    true,
                    1950
                ),
            rc_number:
                textValue("rc_number") || null,
            rc_expiry:
                textValue("rc_expiry") || null,
            insurance_number:
                textValue("insurance_number") || null,
            insurance_expiry:
                textValue("insurance_expiry") || null,
            permit_number:
                textValue("permit_number") || null,
            permit_expiry:
                textValue("permit_expiry") || null,
            pollution_number:
                textValue("pollution_number") || null,
            pollution_expiry:
                textValue("pollution_expiry") || null,
            current_location:
                textValue("current_location") || null,
            gps_tracking:
                textValue("gps_tracking") || null,
            gps_device_id:
                textValue("gps_device_id") || null,
            load_capacity:
                textValue("load_capacity") || null,
            seating_capacity:
                optionalEditNumber(
                    formData,
                    "seating_capacity",
                    "Seating capacity",
                    true,
                    1
                ),
            fuel_type:
                textValue("fuel_type") || null,
            current_odometer:
                optionalEditNumber(
                    formData,
                    "current_odometer",
                    "Current odometer"
                ),
            last_service_date:
                textValue("last_service_date") || null,
            next_service_date:
                textValue("next_service_date") || null,
            next_service_at:
                optionalEditNumber(
                    formData,
                    "next_service_at",
                    "Next service odometer"
                ),
            maintenance_status:
                textValue("maintenance_status") || null,
            notes:
                textValue("notes") || null,
            updated_at:
                new Date().toISOString()
        };

        const {
            data: updatedVehicle,
            error
        } = await supabaseClient
            .from("vehicles")
            .update(vehicleRecord)
            .eq("id", currentVehicle.id)
            .select("*")
            .single();

        if (error) {
            throw error;
        }

        if (!updatedVehicle) {
            throw new Error(
                "Vehicle update returned no saved vehicle."
            );
        }

        currentVehicle =
            normalizeVehicle(
                updatedVehicle,
                currentVehicle.driver
            );

        closeVehicleEditModal();
        renderVehiclePage(currentVehicle);
        showSuccess("Vehicle details saved successfully.");

    } catch (error) {
        console.error(
            "Unable to save vehicle details:",
            error
        );

        showError(
            error.message ||
            "Unable to save vehicle details."
        );

    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = "Save Details";
        }
    }
}


function setupVehicleEditModal() {

    const form =
        $("vehicleEditForm");

    const modal =
        $("vehicleEditModal");

    const close =
        $("closeVehicleEditModal");

    const cancel =
        $("cancelVehicleEdit");

    if (form) {
        form.addEventListener(
            "submit",
            saveVehicleDetails
        );

        form.elements.namedItem("vehicle_type")?.addEventListener(
            "change",
            () => updateCustomVehicleTypeField(form)
        );
    }

    [close, cancel].forEach(button => {
        button?.addEventListener(
            "click",
            closeVehicleEditModal
        );
    });

    modal?.addEventListener(
        "click",
        event => {
            if (event.target === modal) {
                closeVehicleEditModal();
            }
        }
    );

    window.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                modal &&
                !modal.hidden
            ) {
                closeVehicleEditModal();
            }
        }
    );
}


/* =========================================================
   DRIVER MODAL
========================================================= */

async function openDriverModal() {

    const modal =
        $("driverModal");


    const options =
        $("driverOptions");


    if (
        !modal ||
        !options
    ) {

        return;

    }


    options.innerHTML = `
        <div style="
            padding:20px;
            text-align:center;
        ">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading drivers...
        </div>
    `;


    modal.hidden =
        false;


    try {

        const {
            data: drivers,
            error
        } =
            await supabaseClient
                .from("drivers")
                .select(`
                    id,
                    driver_id,
                    name,
                    phone,
                    status
                `)
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        const driverList =
            Array.isArray(
                drivers
            )
                ? drivers
                : [];

        const {
            data: assignedVehicles,
            error: assignmentError
        } = await supabaseClient
            .from("vehicles")
            .select("id,assigned_driver_id")
            .not(
                "assigned_driver_id",
                "is",
                null
            );

        if (assignmentError) {
            throw assignmentError;
        }

        const assignedDriverIds =
            new Set(
                (assignedVehicles || [])
                    .filter(
                        vehicle =>
                            String(vehicle.id) !==
                            String(currentVehicle.id)
                    )
                    .map(
                        vehicle =>
                            String(vehicle.assigned_driver_id)
                    )
            );

        options.innerHTML =
            `
                <label class="driver-option">
                    <input
                        type="radio"
                        name="vehicleDriver"
                        value=""
                        ${currentVehicle.assignedDriverId ? "" : "checked"}
                    >
                    <div>
                        <strong>No Driver Assigned</strong>
                        <span>Clear this vehicle's driver assignment</span>
                    </div>
                </label>
            ` +
            driverList
                .map(
                    driver => {

                        const isCurrent =
                            String(
                                driver.id
                            ) ===
                            String(
                                currentVehicle.assignedDriverId
                            );

                        const isAvailable =
                            !assignedDriverIds.has(
                                String(driver.id)
                            ) ||
                            isCurrent;


                        return `
                            <label class="driver-option">

                                <input
                                    type="radio"
                                    name="vehicleDriver"
                                    value="${escapeHTML(
                                        driver.id
                                    )}"
                                    ${isAvailable ? "" : "disabled"}
                                    ${
                                        isCurrent
                                            ? "checked"
                                            : ""
                                    }
                                >

                                <div>

                                    <strong>
                                        ${escapeHTML(
                                            safeValue(
                                                driver.name,
                                                "Driver"
                                            )
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHTML(
                                            safeValue(
                                                driver.driver_id
                                            )
                                        )}
                                        ·
                                        ${escapeHTML(
                                            safeValue(
                                                driver.phone
                                            )
                                        )}
                                        ·
                                        ${escapeHTML(
                                            formatVehicleStatus(
                                                driver.status
                                            )
                                        )}
                                        ${
                                            isAvailable
                                                ? ""
                                                : " · Already assigned"
                                        }
                                    </span>

                                </div>

                            </label>
                        `;

                    }
                )
                .join("");

    } catch (error) {

        console.error(
            "Unable to load drivers:",
            error
        );


        options.innerHTML = `
            <div style="
                padding:20px;
                color:#d93025;
            ">
                Unable to load drivers.
            </div>
        `;

    }

}


/* =========================================================
   CLOSE DRIVER MODAL
========================================================= */

function closeDriverModal() {

    const modal =
        $("driverModal");


    if (modal) {

        modal.hidden =
            true;

    }

}


/* =========================================================
   SAVE DRIVER CHANGE
========================================================= */

async function saveDriverChange() {

    if (!currentVehicle) {
        return;
    }


    const selected =
        document.querySelector(
            'input[name="vehicleDriver"]:checked'
        );


    if (!selected) {

        alert(
            "Please select a driver."
        );

        return;

    }


    const driverId =
        selected.value || null;


    const saveButton =
        $("saveDriverChange");


    if (saveButton) {

        saveButton.disabled =
            true;


        saveButton.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    }


    try {

        /*
        Verify that the selected driver
        really exists.
        */

        let driver = null;

        if (driverId) {

            const {
                data,
                error: driverError
            } = await supabaseClient
                .from("drivers")
                .select(`
                    id,
                    driver_id,
                    name,
                    phone,
                    status,
                    vehicle_assigned
                `)
                .eq("id", driverId)
                .maybeSingle();

            if (driverError) {
                throw driverError;
            }

            if (!data) {
                throw new Error(
                    "Selected driver was not found."
                );
            }

            if (
                String(data.status || "")
                    .toLowerCase() !== "active"
            ) {
                throw new Error(
                    "Only an active driver can be assigned to a vehicle."
                );
            }

            const {
                data: existingVehicle,
                error: assignmentError
            } = await supabaseClient
                .from("vehicles")
                .select("vehicle_id")
                .eq("assigned_driver_id", data.id)
                .neq("id", currentVehicle.id)
                .maybeSingle();

            if (assignmentError) {
                throw assignmentError;
            }

            if (existingVehicle) {
                throw new Error(
                    `This driver is already assigned to ${existingVehicle.vehicle_id}.`
                );
            }

            driver = data;

        }


        /*
        Update the vehicle.
        */

        const {
            data: updatedVehicle,
            error: updateError
        } =
            await supabaseClient
                .from("vehicles")
                .update({
                    assigned_driver_id:
                        driver?.id || null,
                    vehicle_status:
                        driver
                            ? (
                                currentVehicle.status === "available"
                                    ? "assigned"
                                    : currentVehicle.status
                            )
                            : (
                                currentVehicle.status === "assigned"
                                    ? "available"
                                    : currentVehicle.status
                            ),
                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    currentVehicle.id
                )
                .select("*")
                .single();


        if (updateError) {
            throw updateError;
        }

        if (
            !updatedVehicle
        ) {
            throw new Error(
                "Vehicle assignment update returned no vehicle."
            );
        }

        if (
            currentVehicle.assignedDriverId &&
            String(currentVehicle.assignedDriverId) !==
                String(driver?.id || "")
        ) {

            const {
                error: clearFlagError
            } = await supabaseClient
                .from("drivers")
                .update({
                    vehicle_assigned: false
                })
                .eq(
                    "id",
                    currentVehicle.assignedDriverId
                );

            if (clearFlagError) {
                console.warn(
                    "Previous driver assignment flag could not be cleared:",
                    clearFlagError
                );
            }

        }

        if (driver) {

            const {
                error: setFlagError
            } = await supabaseClient
                .from("drivers")
                .update({
                    vehicle_assigned: true
                })
                .eq("id", driver.id);

            if (setFlagError) {
                console.warn(
                    "Driver assignment flag could not be updated:",
                    setFlagError
                );
            }

        }

        /*
        Update local page state
        using the database response.
        */

        currentVehicle =
            normalizeVehicle(
                updatedVehicle,
                driver
            );


        closeDriverModal();


        renderVehiclePage(
            currentVehicle
        );


        showSuccess(
            "Driver changed successfully."
        );

    } catch (error) {

        console.error(
            "Unable to change driver:",
            error
        );


        showError(
            error.code === "23505"
                ? "This driver is already assigned to another vehicle."
                : error.message ||
            "Unable to change driver."
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;


            saveButton.innerHTML =
                "Save";

        }

    }

}


/* =========================================================
   DRIVER MODAL BUTTONS
========================================================= */

function setupDriverModal() {

    const close =
        $("closeDriverModal");


    const cancel =
        $("cancelDriverChange");


    const save =
        $("saveDriverChange");


    if (close) {

        close.addEventListener(
            "click",
            closeDriverModal
        );

    }


    if (cancel) {

        cancel.addEventListener(
            "click",
            closeDriverModal
        );

    }


    if (save) {

        save.addEventListener(
            "click",
            saveDriverChange
        );

    }


    const modal =
        $("driverModal");


    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    closeDriverModal();

                }

            }
        );

    }

}


/* =========================================================
   SUCCESS MESSAGE
========================================================= */

function showSuccess(
    message
) {

    /*
    Use existing toast if the page
    already provides one.
    */

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            "success"
        );

        return;

    }


    /*
    Fallback.
    */

    console.log(
        message
    );

}


/* =========================================================
   ERROR MESSAGE
========================================================= */

function showError(
    message
) {

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            "error"
        );

        return;

    }


    alert(
        message
    );

}


/* =========================================================
   COMPLETE RENDER
========================================================= */

function renderVehiclePage(
    vehicle
) {

    if (!vehicle) {
        return;
    }


    renderVehicleProfile(
        vehicle
    );


    renderTrip(
        vehicle
    );


    renderCurrentStatus(
        vehicle
    );


    renderVehicleInformation(
        vehicle
    );


    renderMobileDriver(
        vehicle
    );


    renderDocuments(
        vehicle
    );


    renderMaintenance(
        vehicle
    );


    renderTrackingInfo(
        vehicle
    );


    renderAlerts(
        vehicle
    );


    /*
    Destroy previous map.
    */

    if (map) {

        map.remove();

        map =
            null;

        vehicleMarker =
            null;

    }


    initializeMap(
        vehicle
    );

}


/* =========================================================
   WINDOW RESIZE
========================================================= */

window.addEventListener(
    "resize",
    () => {

        if (map) {

            setTimeout(
                () => {

                    map.invalidateSize();

                },
                150
            );

        }

    }
);


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializePage() {

    try {

        /*
        1. Verify admin.
        */

        await verifyAdminAccess();


        /*
        2. Vehicle ID is required.
        */

        if (!requestedVehicleId) {

            throw new Error(
                "No vehicle ID was supplied."
            );

        }


        /*
        3. Load vehicle from Supabase.
        */

        currentVehicle =
            await loadVehicle();


        /*
        4. Render.
        */

        renderVehiclePage(
            currentVehicle
        );


        /*
        5. Setup page controls.
        */

        setupMapControls();

        setupCopyButton();

        setupAccordions();

        setupSidebar();

        setupNavigation();

        setupVehicleEditModal();

        setupDriverModal();


    } catch (error) {

        console.error(
            "Vehicle Details initialization failed:",
            error
        );


        showError(
            error.message ||
            "Unable to load vehicle details."
        );

    }

}


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePage
    );

} else {

    initializePage();

}