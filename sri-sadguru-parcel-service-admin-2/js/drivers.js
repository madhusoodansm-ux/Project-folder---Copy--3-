"use strict";

/*
============================================================
SRI SADGURU SIDDAROODA PARCEL SERVICE
ADMIN PORTAL — DRIVERS PAGE

DATA SOURCE:
    Supabase

TABLES:
    public.drivers
    public.vehicles
    public.bookings

IMPORTANT:
    No localStorage driver data is used.

UI / CSS / HTML structure remains unchanged.
============================================================
*/


/* =========================================================
   CONFIGURATION
========================================================= */

const ROWS_PER_PAGE = 10;


/* =========================================================
   DOM
========================================================= */

const sidebar =
    document.getElementById("sidebar");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const sidebarClose =
    document.getElementById("sidebarClose");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");


const addDriverButton =
    document.getElementById("addDriverButton");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const vehicleFilter =
    document.getElementById("vehicleFilter");

const refreshButton =
    document.getElementById("refreshButton");


const driversBody =
    document.getElementById("driversBody");

const mobileDriverList =
    document.getElementById("mobileDriverList");

const emptyState =
    document.getElementById("emptyState");

const listCount =
    document.getElementById("listCount");


const previousPage =
    document.getElementById("previousPage");

const nextPage =
    document.getElementById("nextPage");

const pageButtons =
    document.getElementById("pageButtons");

const paginationInfo =
    document.getElementById("paginationInfo");


const totalDrivers =
    document.getElementById("totalDrivers");

const availableDrivers =
    document.getElementById("availableDrivers");

const assignedDrivers =
    document.getElementById("assignedDrivers");

const deliveryDrivers =
    document.getElementById("deliveryDrivers");

const offlineDrivers =
    document.getElementById("offlineDrivers");


const logoutButton =
    document.getElementById("logoutButton");


/* =========================================================
   STATE
========================================================= */

let allDrivers = [];

let filteredDrivers = [];

let currentPage = 1;


/* =========================================================
   SUPABASE CLIENT
========================================================= */

function getSupabaseClient() {

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {
        return window.supabaseClient;
    }

    console.error(
        "SSP Supabase client was not found."
    );

    return null;
}


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {

    return String(
        value ?? "—"
    ).replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character])
    );
}


function normalize(value) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}


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


/* =========================================================
   DRIVER STATUS
========================================================= */

/*
Database status:

    active
    inactive
    suspended
    pending

UI status:

    Available
    Assigned
    On Delivery
    Offline
*/

function getDriverDisplayStatus(
    driver,
    bookings
) {

    const databaseStatus =
        normalize(driver.status);

    /*
       Inactive / suspended / pending
       are treated as Offline.
    */

    if (
        databaseStatus === "inactive" ||
        databaseStatus === "suspended" ||
        databaseStatus === "pending"
    ) {
        return "Offline";
    }


    /*
       Only active drivers can be
       Available / Assigned / On Delivery.
    */

    const driverBookings =
        bookings.filter(
            booking =>
                booking.driver_id ===
                driver.id
        );


    /*
       Check active delivery first.
    */

    const onDelivery =
        driverBookings.some(
            booking => {

                const status =
                    normalize(
                        booking.status
                    );

                return (
                    status === "out_for_delivery" ||
                    status === "in_transit" ||
                    status === "delivery_failed"
                );
            }
        );


    if (onDelivery) {
        return "On Delivery";
    }


    /*
       Check whether the driver
       currently has an assigned booking.
    */

    const assigned =
        driverBookings.some(
            booking => {

                const status =
                    normalize(
                        booking.status
                    );

                return (
                    status !== "delivered" &&
                    status !== "cancelled"
                );
            }
        );


    if (assigned) {
        return "Assigned";
    }


    return "Available";
}


/* =========================================================
   CURRENT LOCATION
========================================================= */

/*
The finalized SSP database schema does not contain
GPS latitude/longitude or live driver-location telemetry.

Therefore this page must NOT invent a current location.

For now the UI displays "Not available".
*/

function getCurrentLocation() {

    return "Not available";
}


/* =========================================================
   VEHICLE DATA
========================================================= */

function getVehicleForDriver(
    driver,
    vehicles
) {

    return (
        vehicles.find(
            vehicle =>
                vehicle.assigned_driver_id ===
                driver.id
        ) || null
    );
}


/* =========================================================
   NORMALIZE DRIVER
========================================================= */

function normalizeDriver(
    driver,
    profile,
    vehicle,
    bookings
) {

    const displayStatus =
        getDriverDisplayStatus(
            driver,
            bookings
        );


    return {

        id:
            driver.driver_id ||
            driver.id ||
            "",

        databaseId:
            driver.id ||
            "",

        name:
            profile?.full_name ||
            driver.name ||
            "Unnamed Driver",

        phone:
            profile?.phone ||
            driver.phone ||
            "",

        email:
            profile?.email ||
            driver.email ||
            "",

        status:
            displayStatus,

        databaseStatus:
            driver.status ||
            "",

        vehicleIdentifier:
            vehicle?.vehicle_id ||
            "",

        vehicleNumber:
            vehicle?.vehicle_number ||
            "",

        vehicleType:
            vehicle?.vehicle_type ||
            "",

        currentLocation:
            getCurrentLocation(),

        photo:
            driver.photo_url ||
            "",

        vehicleAssigned:
            Boolean(
                driver.vehicle_assigned
            ),

        raw:
            driver,

        vehicle:
            vehicle,

        bookings:
            bookings.filter(
                booking =>
                    booking.driver_id ===
                    driver.id
            )
    };
}


/* =========================================================
   LOAD DRIVERS FROM SUPABASE
========================================================= */

async function loadDriversFromSupabase() {

    const supabase =
        getSupabaseClient();


    if (!supabase) {

        throw new Error(
            "Supabase client is not available."
        );
    }


    /*
    --------------------------------------------------------
    1. LOAD DRIVERS
    --------------------------------------------------------
    */

    const {
        data: drivers,
        error: driversError
    } =
        await supabase
            .from("drivers")
            .select(`
                id,
                profile_id,
                driver_id,
                name,
                phone,
                alternate_phone,
                email,
                address_line1,
                address_line2,
                city,
                state,
                pin_code,
                driving_license_number,
                driving_license_expiry,
                joining_date,
                status,
                photo_url,
                vehicle_assigned,
                notes,
                created_at,
                updated_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (driversError) {

        console.error(
            "Drivers query failed:",
            driversError
        );

        throw driversError;
    }

    if (!drivers || drivers.length === 0) {
        return [];
    }

    const profileIds =
        Array.from(
            new Set(
                (drivers || [])
                    .map(driver => driver.profile_id)
                    .filter(Boolean)
            )
        );

    let profiles = [];

    if (profileIds.length > 0) {
        const {
            data: profileData,
            error: profilesError
        } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone, role")
            .in("id", profileIds)
            .eq("role", "driver");

        if (profilesError) {
            console.error(
                "Driver profiles query failed:",
                profilesError
            );

            throw profilesError;
        }

        profiles = profileData || [];
    }

    const profilesById =
        new Map(
            profiles.map(
                profile => [
                    profile.id,
                    profile
                ]
            )
        );


    /*
    --------------------------------------------------------
    2. LOAD VEHICLES
    --------------------------------------------------------
    */

    const {
        data: vehicles,
        error: vehiclesError
    } =
        await supabase
            .from("vehicles")
            .select(`
                id,
                vehicle_id,
                vehicle_number,
                vehicle_type,
                custom_vehicle_type,
                assigned_driver_id,
                vehicle_status
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (vehiclesError) {

        console.error(
            "Vehicles query failed:",
            vehiclesError
        );

        throw vehiclesError;
    }


    /*
    --------------------------------------------------------
    3. LOAD BOOKINGS
    --------------------------------------------------------
    */

    const {
        data: bookings,
        error: bookingsError
    } =
        await supabase
            .from("bookings")
            .select(`
                id,
                status,
                driver_id
            `);


    if (bookingsError) {

        console.error(
            "Bookings query failed:",
            bookingsError
        );

        throw bookingsError;
    }


    /*
    --------------------------------------------------------
    4. COMBINE DATABASE DATA
    --------------------------------------------------------
    */

    return (drivers || [])
        .map(
            driver => {

                const vehicle =
                    getVehicleForDriver(
                        driver,
                        vehicles || []
                    );

                const profile =
                    profilesById.get(
                        driver.profile_id
                    ) || null;

                return normalizeDriver(
                    driver,
                    profile,
                    vehicle,
                    bookings || []
                );
            }
        );
}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

    const drivers =
        allDrivers;


    const available =
        drivers.filter(
            driver =>
                normalize(
                    driver.status
                ) === "available"
        ).length;


    const assigned =
        drivers.filter(
            driver =>
                normalize(
                    driver.status
                ) === "assigned"
        ).length;


    const onDelivery =
        drivers.filter(
            driver =>
                normalize(
                    driver.status
                ) === "on delivery"
        ).length;


    const offline =
        drivers.filter(
            driver =>
                normalize(
                    driver.status
                ) === "offline"
        ).length;


    totalDrivers.textContent =
        drivers.length;

    availableDrivers.textContent =
        available;

    assignedDrivers.textContent =
        assigned;

    deliveryDrivers.textContent =
        onDelivery;

    offlineDrivers.textContent =
        offline;
}


/* =========================================================
   VEHICLE FILTER
========================================================= */

function updateVehicleFilter() {

    const currentValue =
        vehicleFilter.value;


    const identifiers =
        new Set();


    allDrivers.forEach(
        driver => {

            if (
                driver.vehicleIdentifier
            ) {

                identifiers.add(
                    driver.vehicleIdentifier
                );
            }
        }
    );


    vehicleFilter.innerHTML = `
        <option value="">
            Vehicle: All
        </option>
    `;


    Array.from(identifiers)
        .sort(
            (a, b) =>
                String(a).localeCompare(
                    String(b)
                )
        )
        .forEach(
            identifier => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    identifier;

                option.textContent =
                    identifier;

                vehicleFilter.appendChild(
                    option
                );
            }
        );


    if (
        identifiers.has(
            currentValue
        )
    ) {

        vehicleFilter.value =
            currentValue;
    }
}


/* =========================================================
   FILTER
========================================================= */

function applyFilters() {

    const search =
        normalize(
            searchInput.value
        );


    const status =
        normalize(
            statusFilter.value
        );


    const vehicle =
        normalize(
            vehicleFilter.value
        );


    filteredDrivers =
        allDrivers.filter(
            driver => {

                const searchableText =
                    [
                        driver.id,
                        driver.name,
                        driver.phone,
                        driver.email,
                        driver.vehicleIdentifier,
                        driver.vehicleNumber,
                        driver.vehicleType,
                        driver.status
                    ]
                        .join(" ")
                        .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                const matchesStatus =
                    !status ||
                    normalize(
                        driver.status
                    ) === status;


                const matchesVehicle =
                    !vehicle ||
                    normalize(
                        driver.vehicleIdentifier
                    ) === vehicle;


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesVehicle
                );
            }
        );


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredDrivers.length /
                ROWS_PER_PAGE
            )
        );


    if (
        currentPage > totalPages
    ) {

        currentPage =
            totalPages;
    }


    renderDrivers();
}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

    const normalized =
        normalize(status);


    if (
        normalized === "available"
    ) {
        return "available";
    }


    if (
        normalized === "assigned"
    ) {
        return "assigned";
    }


    if (
        normalized === "on delivery"
    ) {
        return "delivery";
    }


    return "offline";
}


/* =========================================================
   DRIVER AVATAR
========================================================= */

function createAvatar(driver) {

    if (driver.photo) {

        return `
            <img
                class="driver-avatar"
                src="${escapeHTML(driver.photo)}"
                alt="${escapeHTML(driver.name)}"
            >
        `;
    }


    const initials =
        driver.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(
                part =>
                    part.charAt(0)
            )
            .join("")
            .toUpperCase();


    return `
        <div class="driver-avatar initials">
            ${escapeHTML(
                initials || "DR"
            )}
        </div>
    `;
}


/* =========================================================
   DESKTOP ROW
========================================================= */

function createDesktopRow(driver) {

    const statusClass =
        getStatusClass(
            driver.status
        );


    const id =
        driver.id || "";


    return `
        <tr>

            <td>

                <div class="driver-cell">

                    ${createAvatar(driver)}

                    <div>

                        <strong>
                            ${escapeHTML(
                                driver.name
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                id ||
                                "Driver ID unavailable"
                            )}
                        </small>

                    </div>

                </div>

            </td>


            <td>
                <span class="vehicle-name">
                    ${escapeHTML(
                        driver.vehicleIdentifier ||
                        "Not assigned"
                    )}
                </span>
            </td>


            <td>
                <strong class="vehicle-number">
                    ${escapeHTML(
                        driver.vehicleNumber ||
                        "Not assigned"
                    )}
                </strong>
            </td>


            <td>

                <span
                    class="status-badge ${statusClass}"
                >
                    ${escapeHTML(
                        driver.status
                    )}
                </span>

            </td>


            <td>

                <span class="location-cell">

                    <i class="fa-solid fa-location-dot"></i>

                    ${escapeHTML(
                        driver.currentLocation
                    )}

                </span>

            </td>


            <td class="action-column">

                <button
                    type="button"
                    class="driver-action-button"
                    data-driver-id="${escapeHTML(id)}"
                    title="View driver details"
                    aria-label="View driver details"
                >
                    <i class="fa-regular fa-eye"></i>
                </button>

            </td>

        </tr>
    `;
}


/* =========================================================
   MOBILE CARD
========================================================= */

function createMobileCard(driver) {

    const statusClass =
        getStatusClass(
            driver.status
        );


    const id =
        driver.id || "";


    return `
        <article class="driver-mobile-card">


            <div class="mobile-driver-top">

                <div class="mobile-driver-identity">

                    ${createAvatar(driver)}

                    <div>

                        <strong>
                            ${escapeHTML(
                                driver.name
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                id ||
                                "Driver ID unavailable"
                            )}
                        </small>

                    </div>

                </div>


                <span
                    class="status-badge ${statusClass}"
                >
                    ${escapeHTML(
                        driver.status
                    )}
                </span>

            </div>


            <div class="mobile-driver-info">

                <div>

                    <span>
                        Vehicle
                    </span>

                    <strong>
                        ${escapeHTML(
                            driver.vehicleIdentifier ||
                            "Not assigned"
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Vehicle Number
                    </span>

                    <strong>
                        ${escapeHTML(
                            driver.vehicleNumber ||
                            "Not assigned"
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Current Location
                    </span>

                    <strong class="mobile-location">

                        <i class="fa-solid fa-location-dot"></i>

                        ${escapeHTML(
                            driver.currentLocation
                        )}

                    </strong>

                </div>

            </div>


            <div class="mobile-driver-action">

                <button
                    type="button"
                    class="driver-action-button"
                    data-driver-id="${escapeHTML(id)}"
                    title="View driver details"
                    aria-label="View driver details"
                >
                    <i class="fa-regular fa-eye"></i>
                </button>

            </div>

        </article>
    `;
}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination() {

    const total =
        filteredDrivers.length;


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total /
                ROWS_PER_PAGE
            )
        );


    const start =
        total === 0
            ? 0
            : (
                (currentPage - 1) *
                ROWS_PER_PAGE
            ) + 1;


    const end =
        Math.min(
            currentPage *
            ROWS_PER_PAGE,
            total
        );


    paginationInfo.textContent =
        total
            ? `Showing ${start}–${end} of ${total}`
            : "No drivers";


    previousPage.disabled =
        currentPage <= 1;


    nextPage.disabled =
        currentPage >= totalPages;


    pageButtons.innerHTML =
        "";


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";

        button.className =
            "page-button";


        if (
            page === currentPage
        ) {

            button.classList.add(
                "active"
            );
        }


        button.textContent =
            page;


        button.addEventListener(
            "click",
            function () {

                currentPage =
                    page;

                renderDrivers();
            }
        );


        pageButtons.appendChild(
            button
        );
    }
}


/* =========================================================
   RENDER
========================================================= */

function renderDrivers() {

    const total =
        filteredDrivers.length;


    const startIndex =
        (currentPage - 1) *
        ROWS_PER_PAGE;


    const visibleDrivers =
        filteredDrivers.slice(
            startIndex,
            startIndex +
            ROWS_PER_PAGE
        );


    driversBody.innerHTML =
        "";

    mobileDriverList.innerHTML =
        "";


    if (
        !visibleDrivers.length
    ) {

        emptyState.hidden =
            false;

        const emptyStateDescription =
            emptyState.querySelector("p");

        if (emptyStateDescription) {
            emptyStateDescription.textContent =
                allDrivers.length === 0
                    ? "There are currently no driver records."
                    : "No driver records match your current search or filter.";
        }

        listCount.textContent =
            "0 drivers";

        renderPagination();

        return;
    }


    emptyState.hidden =
        true;


    listCount.textContent =
        `${total} driver${
            total === 1
                ? ""
                : "s"
        }`;


    visibleDrivers.forEach(
        driver => {

            driversBody.insertAdjacentHTML(
                "beforeend",
                createDesktopRow(driver)
            );


            mobileDriverList.insertAdjacentHTML(
                "beforeend",
                createMobileCard(driver)
            );
        }
    );


    renderPagination();
}


/* =========================================================
   LOAD PAGE
========================================================= */

async function loadPage() {

    try {

        listCount.textContent =
            "Loading drivers...";

        const emptyStateTitle =
            emptyState.querySelector("h3");
        const emptyStateDescription =
            emptyState.querySelector("p");

        if (emptyStateTitle) {
            emptyStateTitle.textContent =
                "No drivers found";
        }

        if (emptyStateDescription) {
            emptyStateDescription.textContent =
                "No driver records match your current search or filter.";
        }

        if (
            typeof window.requireAdminAuth !==
            "function"
        ) {
            throw new Error(
                "Admin authentication is not available."
            );
        }

        const adminAccess =
            await window.requireAdminAuth();

        if (!adminAccess) {
            return;
        }


        allDrivers =
            await loadDriversFromSupabase();


        filteredDrivers =
            [...allDrivers];


        updateSummary();

        updateVehicleFilter();

        applyFilters();


    } catch (error) {

        console.error(
            "Unable to load drivers:",
            error
        );


        allDrivers = [];

        filteredDrivers = [];


        updateSummary();

        updateVehicleFilter();


        driversBody.innerHTML =
            "";

        mobileDriverList.innerHTML =
            "";


        emptyState.hidden =
            false;

        const emptyStateTitle =
            emptyState.querySelector("h3");
        const emptyStateDescription =
            emptyState.querySelector("p");

        if (emptyStateTitle) {
            emptyStateTitle.textContent =
                "Unable to load drivers";
        }

        if (emptyStateDescription) {
            emptyStateDescription.textContent =
                "Driver records could not be loaded. Check your connection or try again.";
        }


        listCount.textContent =
            "Unable to load drivers";


        paginationInfo.textContent =
            "Unable to load drivers";


        /*
        Show the actual database error
        in the browser console.
        */

        console.error(
            "SSP Drivers page error:",
            error?.message ||
            error
        );
    }
}


/* =========================================================
   ADD DRIVER
========================================================= */

addDriverButton.addEventListener(
    "click",
    function () {

        window.location.href =
            "new-driver-registration.html";
    }
);


/* =========================================================
   DRIVER DETAILS
========================================================= */

document.addEventListener(
    "click",
    function (event) {

        const button =
            event.target.closest(
                ".driver-action-button"
            );


        if (!button) {
            return;
        }


        const driverId =
            button.dataset.driverId;


        if (!driverId) {

            alert(
                "This driver does not have a valid Driver ID."
            );

            return;
        }


        window.location.href =
            `drivers-details.html?id=${encodeURIComponent(
                driverId
            )}`;
    }
);


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
    "input",
    function () {

        currentPage = 1;

        applyFilters();
    }
);


/* =========================================================
   STATUS FILTER
========================================================= */

statusFilter.addEventListener(
    "change",
    function () {

        currentPage = 1;

        applyFilters();
    }
);


/* =========================================================
   VEHICLE FILTER
========================================================= */

vehicleFilter.addEventListener(
    "change",
    function () {

        currentPage = 1;

        applyFilters();
    }
);


/* =========================================================
   REFRESH
========================================================= */

refreshButton.addEventListener(
    "click",
    async function () {

        refreshButton.classList.add(
            "rotating"
        );


        await loadPage();


        setTimeout(
            function () {

                refreshButton.classList.remove(
                    "rotating"
                );

            },
            450
        );
    }
);


/* =========================================================
   PAGINATION PREVIOUS
========================================================= */

previousPage.addEventListener(
    "click",
    function () {

        if (
            currentPage > 1
        ) {

            currentPage--;

            renderDrivers();
        }
    }
);


/* =========================================================
   PAGINATION NEXT
========================================================= */

nextPage.addEventListener(
    "click",
    function () {

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    filteredDrivers.length /
                    ROWS_PER_PAGE
                )
            );


        if (
            currentPage < totalPages
        ) {

            currentPage++;

            renderDrivers();
        }
    }
);


/* =========================================================
   SIDEBAR
========================================================= */

function toggleDesktopSidebar() {

    document.body.classList.toggle(
        "sidebar-collapsed"
    );
}


function openMobileSidebar() {

    sidebar.classList.add(
        "mobile-open"
    );

    sidebarOverlay.classList.add(
        "show"
    );

    document.body.style.overflow =
        "hidden";
}


function closeMobileSidebar() {

    sidebar.classList.remove(
        "mobile-open"
    );

    sidebarOverlay.classList.remove(
        "show"
    );

    document.body.style.overflow =
        "";
}


sidebarToggle.addEventListener(
    "click",
    function () {

        if (
            window.innerWidth <= 900
        ) {

            openMobileSidebar();

            return;
        }


        toggleDesktopSidebar();
    }
);


sidebarClose.addEventListener(
    "click",
    closeMobileSidebar
);


sidebarOverlay.addEventListener(
    "click",
    closeMobileSidebar
);


window.addEventListener(
    "resize",
    function () {

        if (
            window.innerWidth > 900
        ) {

            closeMobileSidebar();
        }
    }
);


/* =========================================================
   LOGOUT
========================================================= */

logoutButton.addEventListener(
    "click",
    async function (event) {

        event.preventDefault();


        const confirmed =
            window.confirm(
                "Are you sure you want to logout?"
            );


        if (!confirmed) {
            return;
        }


        try {

            const supabase =
                getSupabaseClient();


            if (supabase) {

                await supabase.auth.signOut();
            }

        } catch (error) {

            console.error(
                "Logout error:",
                error
            );
        }


        window.location.href =
            "../index.html";
    }
);


/* =========================================================
   INITIAL LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadPage();
    }
);