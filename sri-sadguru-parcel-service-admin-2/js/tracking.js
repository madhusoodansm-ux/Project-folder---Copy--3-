"use strict";

/* =========================================================
   SRI SADGURU PARCEL SERVICE
   ADMIN PORTAL — TRACKING

   DATA SOURCE
   ---------------------------------------------------------
   public.bookings
   public.booking_status_history
   public.profiles

   NO localStorage
   NO demo bookings
   NO hardcoded drivers
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const ROWS_PER_PAGE = 10;


/* =========================================================
   PAGE STATE
========================================================= */

let allBookings = [];

let filteredBookings = [];

let currentPage = 1;

let selectedStatus = "";

let selectedBooking = null;

let toastTimer = null;


/* =========================================================
   DOM REFERENCES
========================================================= */

const sidebar =
    document.getElementById("sidebar");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const refreshButton =
    document.getElementById("refreshButton");

const searchInput =
    document.getElementById("searchInput");

const trackingBody =
    document.getElementById("trackingBody");

const mobileList =
    document.getElementById("mobileList");

const listCount =
    document.getElementById("listCount");

const statusTabs =
    document.getElementById("statusTabs");

const previousPage =
    document.getElementById("previousPage");

const nextPage =
    document.getElementById("nextPage");

const pageButtons =
    document.getElementById("pageButtons");


/* =========================================================
   MODAL
========================================================= */

const detailsModal =
    document.getElementById("detailsModal");

const modalBackdrop =
    document.getElementById("modalBackdrop");

const closeModal =
    document.getElementById("closeModal");

const modalBookingId =
    document.getElementById("modalBookingId");

const modalContent =
    document.getElementById("modalContent");

const modalViewBooking =
    document.getElementById("modalViewBooking");

const modalDownloadBill =
    document.getElementById("modalDownloadBill");


/* =========================================================
   MOBILE
========================================================= */

const mobileMoreBtn =
    document.getElementById("mobileMoreBtn");

const mobileMoreMenu =
    document.getElementById("mobileMoreMenu");


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

    throw new Error(
        "Supabase client was not loaded. Check ../js/supabase-client.js."
    );
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeTracking
);


async function initializeTracking() {

    setupSidebar();

    setupFilters();

    setupPagination();

    setupModal();

    setupMobileNavigation();

    setupSearch();

    try {
        await loadBookings();

    } catch (error) {

        console.error(
            "Tracking initialization error:",
            error
        );

        showPageError(
            getReadableError(error)
        );
    }
}


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

async function verifyAdminSession(client) {

    const {
        data: sessionData,
        error: sessionError
    } = await client.auth.getSession();


    if (sessionError) {

        throw new Error(
            "Unable to verify administrator session."
        );
    }


    const session =
        sessionData?.session;


    if (!session?.user) {

        window.location.href =
            "../index.html";

        return false;
    }


    const user =
        session.user;


    const {
        data: profile,
        error: profileError
    } = await client
        .from("profiles")
        .select(
            "id, email, phone, full_name, role, status"
        )
        .eq("id", user.id)
        .maybeSingle();


    if (profileError) {

        throw new Error(
            profileError.message
        );
    }


    if (
        !profile ||
        profile.role !== "admin" ||
        profile.status !== "active"
    ) {

        await client.auth.signOut();

        window.location.href =
            "../index.html";

        return false;
    }


    return true;
}


/* =========================================================
   LOAD BOOKINGS
========================================================= */

async function loadBookings() {

    setLoadingState(true);


    try {

        const client =
            getSupabaseClient();


        const isAdmin =
            await verifyAdminSession(client);


        if (!isAdmin) {
            return;
        }


        /* =================================================
           BOOKINGS
        ================================================= */

        const {
            data: bookings,
            error: bookingError
        } = await client
            .from("bookings")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (bookingError) {

            throw new Error(
                bookingError.message
            );
        }


        const bookingRows =
            Array.isArray(bookings)
                ? bookings
                : [];


        const customerIds = [
            ...new Set(
                bookingRows
                    .map(
                        booking =>
                            booking.customer_id
                    )
                    .filter(Boolean)
            )
        ];

        const driverIds = [
            ...new Set(
                bookingRows
                    .map(
                        booking =>
                            booking.driver_id
                    )
                    .filter(Boolean)
            )
        ];

        let profiles = [];

        let driverRows = [];
        let driverProfiles = [];
        let historyRows = [];

        allBookings =
            bookingRows.map(
                booking =>
                    normalizeBooking(
                        booking,
                        new Map(),
                        new Map(),
                        new Map()
                    )
            );

        applyFilters();

        if (customerIds.length > 0) {
            const {
                data,
                error
            } = await client
                .from("profiles")
                .select(
                    "id, full_name, email, phone, role, status"
                )
                .in(
                    "id",
                    customerIds
                );

            if (error) {
                console.error(
                    "Tracking customer profile details could not be loaded:",
                    error
                );
            } else {
                profiles =
                    Array.isArray(data)
                        ? data
                        : [];
            }
        }

        const profileMap =
            new Map(
                profiles.map(
                    profile => [
                        profile.id,
                        profile
                    ]
                )
            );

        if (driverIds.length > 0) {
            const {
                data,
                error
            } = await client
                .from("drivers")
                .select("id,profile_id,driver_id,name,email,phone,status")
                .in("id", driverIds);

            if (error) {
                console.error(
                    "Tracking driver details could not be loaded:",
                    error
                );
            } else {
                driverRows =
                    Array.isArray(data)
                        ? data
                        : [];
            }
        }

        const driverProfileIds = [
            ...new Set(
                driverRows
                    .map(driver => driver.profile_id)
                    .filter(Boolean)
            )
        ];

        if (driverProfileIds.length > 0) {
            const {
                data,
                error
            } = await client
                .from("profiles")
                .select("id,full_name,email,phone,role,status")
                .in("id", driverProfileIds);

            if (error) {
                console.error(
                    "Tracking driver profile details could not be loaded:",
                    error
                );
            } else {
                driverProfiles =
                    Array.isArray(data)
                        ? data
                        : [];
            }
        }

        const driverProfileMap =
            new Map(
                driverProfiles.map(profile => [
                    String(profile.id),
                    profile
                ])
            );

        const driverMap =
            new Map(
                driverRows.map(driver => {
                    const profile =
                        driverProfileMap.get(
                            String(driver.profile_id || "")
                        );

                    return [
                        String(driver.id),
                        {
                            ...driver,
                            full_name:
                                profile?.full_name ||
                                driver.name ||
                                "",
                            email:
                                profile?.email ||
                                driver.email ||
                                "",
                            phone:
                                driver.phone ||
                                profile?.phone ||
                                ""
                        }
                    ];
                })
            );


        /* =================================================
           BOOKING HISTORY
        ================================================= */

        const bookingIds = [
            ...new Set(
                bookingRows
                    .map(
                        booking =>
                            booking.id
                    )
                    .filter(Boolean)
            )
        ];


        if (bookingIds.length > 0) {

            const {
                data,
                error
            } = await client
                .from("booking_status_history")
                .select(
                    "id, booking_id, customer_id, status, note, changed_at, changed_by"
                )
                .in(
                    "booking_id",
                    bookingIds
                )
                .order(
                    "changed_at",
                    {
                        ascending: true
                    }
                );


            if (error) {
                console.error(
                    "Tracking status history could not be loaded; shipment rows remain available:",
                    error
                );
            } else {
                historyRows =
                    Array.isArray(data)
                        ? data
                        : [];
            }
        }


        /* =================================================
           HISTORY MAP
        ================================================= */

        const historyMap =
            new Map();


        historyRows.forEach(
            history => {

                if (
                    !historyMap.has(
                        history.booking_id
                    )
                ) {

                    historyMap.set(
                        history.booking_id,
                        []
                    );
                }


                historyMap
                    .get(history.booking_id)
                    .push(history);

            }
        );


        /* =================================================
           NORMALIZE BOOKINGS
        ================================================= */

        allBookings =
            bookingRows.map(
                booking =>
                    normalizeBooking(
                        booking,
                        profileMap,
                        driverMap,
                        historyMap
                    )
            );


        applyFilters();


    } finally {

        setLoadingState(false);
    }
}


/* =========================================================
   NORMALIZE BOOKING
========================================================= */

function normalizeBooking(
    booking,
    profileMap,
    driverMap,
    historyMap
) {

    const customer =
        booking.customer_id
            ? profileMap.get(
                booking.customer_id
            )
            : null;


    const driver =
        booking.driver_id
            ? driverMap.get(
                String(booking.driver_id)
            )
            : null;


    const history =
        historyMap.get(
            booking.id
        ) || [];


    return {

        ...booking,

        _customer:
            customer || null,

        _driver:
            driver || null,

        _history:
            history

    };
}


/* =========================================================
   STATUS LABEL
========================================================= */

function getStatusLabel(status) {

    const labels = {

        pending:
            "New",

        confirmed:
            "Confirmed",

        assigned:
            "Driver Assigned",

        pickup_started:
            "Pickup Started",

        picked_up:
            "Picked Up",

        in_transit:
            "In Transit",

        out_for_delivery:
            "Out for Delivery",

        delivered:
            "Delivered",

        cancelled:
            "Cancelled"
    };


    return (
        labels[status] ||
        formatStatus(status)
    );
}


/* =========================================================
   FORMAT STATUS
========================================================= */

function formatStatus(status) {

    if (!status) {
        return "Unknown";
    }


    return String(status)
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            character =>
                character.toUpperCase()
        );
}


/* =========================================================
   STATUS CSS
========================================================= */

function getStatusClass(status) {

    const classes = {

        pending:
            "status-pending",

        confirmed:
            "status-confirmed",

        assigned:
            "status-assigned",

        pickup_started:
            "status-pickup",

        picked_up:
            "status-picked",

        in_transit:
            "status-transit",

        out_for_delivery:
            "status-out",

        delivered:
            "status-delivered",

        cancelled:
            "status-cancelled"
    };


    return (
        classes[status] ||
        "status-pending"
    );
}


/* =========================================================
   CUSTOMER
========================================================= */

function getCustomerName(booking) {

    return (
        booking?._customer?.full_name ||
        booking.pickup_name ||
        "Customer"
    );
}


function getCustomerPhone(booking) {

    return (
        booking?._customer?.phone ||
        booking.pickup_phone ||
        "—"
    );
}


/* =========================================================
   DRIVER
========================================================= */

function getDriverName(booking) {

    return (
        booking?._driver?.full_name ||
        "Not assigned"
    );
}


function getDriverPhone(booking) {

    return (
        booking?._driver?.phone ||
        "—"
    );
}


/* =========================================================
   ROUTE
========================================================= */

function getPickupLocation(booking) {

    return (
        booking.pickup_city ||
        booking.pickup_address ||
        "Pickup location"
    );
}


function getDeliveryLocation(booking) {

    return (
        booking.delivery_city ||
        booking.delivery_address ||
        "Delivery location"
    );
}


function getRouteSearchText(booking) {

    return [
        booking.pickup_city,
        booking.delivery_city,
        booking.pickup_address,
        booking.delivery_address
    ]
        .filter(Boolean)
        .join(" ");
}


/* =========================================================
   CURRENT LOCATION
========================================================= */

function getCurrentLocation(booking) {

    /*
       The verified bookings schema currently does not
       contain a live driver-location field.

       Therefore we do not invent a location.

       We display the latest operational location that
       can be safely derived from the shipment state.
    */

    if (
        booking.status === "delivered"
    ) {
        return "Delivered";
    }


    if (
        booking.status === "out_for_delivery"
    ) {
        return (
            booking.delivery_city ||
            "Out for delivery"
        );
    }


    if (
        booking.status === "in_transit"
    ) {
        return "In transit";
    }


    if (
        booking.status === "picked_up" ||
        booking.status === "pickup_started"
    ) {
        return (
            booking.pickup_city ||
            "Pickup area"
        );
    }


    if (booking.driver_id) {
        return "Driver assigned";
    }


    return "Not updated";
}


/* =========================================================
   LOCATION UPDATE TIME
========================================================= */

function getLocationUpdatedAt(booking) {

    const history =
        booking._history || [];


    const operationalStatuses = [
        "pickup_started",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered"
    ];


    const matching =
        history
            .filter(
                item =>
                    operationalStatuses.includes(
                        item.status
                    )
            )
            .sort(
                (a, b) =>
                    new Date(b.changed_at) -
                    new Date(a.changed_at)
            );


    if (matching.length > 0) {

        return formatDateTime(
            matching[0].changed_at
        );
    }


    return "Not updated";
}


/* =========================================================
   EXPECTED DELIVERY
========================================================= */

function getExpectedDelivery(booking) {

    /*
       No verified expected_delivery column is
       currently available in the known schema.

       Do not fabricate a date.

       If the booking is already delivered,
       display the actual state.
    */

    if (
        booking.status === "delivered"
    ) {
        return "Delivered";
    }


    return "Not scheduled";
}


/* =========================================================
   BOOKING DATE/TIME
========================================================= */

function getBookingDateTime(booking) {

    if (
        booking.booking_date
    ) {

        const date =
            formatDate(
                booking.booking_date
            );


        const time =
            formatTime(
                booking.booking_time
            );


        return {
            date,
            time
        };
    }


    if (booking.created_at) {

        return {

            date:
                formatDate(
                    booking.created_at
                ),

            time:
                formatTime(
                    booking.created_at
                )

        };
    }


    return {
        date: "—",
        time: "—"
    };
}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(value) {

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

        return String(value);
    }


    return window.SSPAdminSettings.formatDate(date);
}


/* =========================================================
   TIME FORMAT
========================================================= */

function formatTime(value) {

    if (!value) {
        return "—";
    }


    /*
       PostgreSQL time can arrive as:
       HH:MM:SS
    */

    if (
        /^\d{2}:\d{2}/.test(
            String(value)
        )
    ) {

        const parts =
            String(value)
                .split(":");


        const hours =
            Number(parts[0]);


        const minutes =
            Number(parts[1]);


        if (
            Number.isFinite(hours) &&
            Number.isFinite(minutes)
        ) {

            const suffix =
                hours >= 12
                    ? "PM"
                    : "AM";


            const displayHour =
                hours % 12 || 12;


            return (
                `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`
            );
        }
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);
    }


    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   DATE + TIME
========================================================= */

function formatDateTime(value) {

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

        return String(value);
    }


    return window.SSPAdminSettings.formatDateTime(date);
}


/* =========================================================
   ESCAPE HTML
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


/* =========================================================
   SEARCH
========================================================= */

function getSearchText(booking) {

    return [

        booking.booking_id,

        getCustomerName(
            booking
        ),

        getCustomerPhone(
            booking
        ),

        getPickupLocation(
            booking
        ),

        getDeliveryLocation(
            booking
        ),

        getRouteSearchText(
            booking
        ),

        getDriverName(
            booking
        ),

        getDriverPhone(
            booking
        ),

        booking.parcel_type

    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

    const search =
        String(
            searchInput?.value || ""
        )
            .trim()
            .toLowerCase();


    filteredBookings =
        allBookings.filter(
            booking => {

                const statusMatches =
                    !selectedStatus ||
                    booking.status ===
                        selectedStatus;


                const searchMatches =
                    !search ||
                    getSearchText(
                        booking
                    ).includes(search);


                return (
                    statusMatches &&
                    searchMatches
                );
            }
        );


    currentPage = 1;


    renderTrackingList();

    renderPagination();

    updateListCount();
}


/* =========================================================
   RENDER LIST
========================================================= */

function renderTrackingList() {

    const total =
        filteredBookings.length;


    const start =
        (currentPage - 1) *
        ROWS_PER_PAGE;


    const end =
        start +
        ROWS_PER_PAGE;


    const rows =
        filteredBookings.slice(
            start,
            end
        );


    renderDesktopRows(
        rows
    );


    renderMobileCards(
        rows
    );
}


/* =========================================================
   DESKTOP TABLE
========================================================= */

function renderDesktopRows(
    rows
) {

    if (!trackingBody) {
        return;
    }


    if (rows.length === 0) {

        trackingBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fa-solid fa-location-dot"></i>
                        <strong>No tracking records found</strong>
                        <p>
                            Try another search or status filter.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    trackingBody.innerHTML =
        rows
            .map(
                booking =>
                    createDesktopRow(
                        booking
                    )
            )
            .join("");


    trackingBody
        .querySelectorAll(
            "[data-view-booking]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.viewBooking;

                        openTrackingDetails(
                            id
                        );
                    }
                );

            }
        );
}


/* =========================================================
   DESKTOP ROW
========================================================= */

function createDesktopRow(
    booking
) {

    const dateTime =
        getBookingDateTime(
            booking
        );


    const statusLabel =
        getStatusLabel(
            booking.status
        );


    const statusClass =
        getStatusClass(
            booking.status
        );


    const currentLocation =
        getCurrentLocation(
            booking
        );


    const updated =
        getLocationUpdatedAt(
            booking
        );


    const expected =
        getExpectedDelivery(
            booking
        );


    return `
        <tr>

            <td>

                <span class="booking-id">
                    ${escapeHTML(
                        booking.booking_id
                    )}
                </span>

                <span class="booking-date-time">
                    ${escapeHTML(
                        dateTime.date
                    )}
                    ·
                    ${escapeHTML(
                        dateTime.time
                    )}
                </span>

            </td>


            <td>

                <span class="customer-name">
                    ${escapeHTML(
                        getCustomerName(
                            booking
                        )
                    )}
                </span>

                <span class="customer-phone">
                    ${escapeHTML(
                        getCustomerPhone(
                            booking
                        )
                    )}
                </span>

            </td>


            <td>

                <div class="route">

                    <span class="route-from">
                        ${escapeHTML(
                            getPickupLocation(
                                booking
                            )
                        )}
                    </span>

                    <span class="route-arrow">
                        ↓
                    </span>

                    <span class="route-to">
                        ${escapeHTML(
                            getDeliveryLocation(
                                booking
                            )
                        )}
                    </span>

                </div>

            </td>


            <td>

                <span
                    class="status-badge ${statusClass}"
                >
                    ${escapeHTML(
                        statusLabel
                    )}
                </span>

            </td>


            <td>

                <div class="current-location">

                    <i class="fa-solid fa-location-dot"></i>

                    <span>
                        ${escapeHTML(
                            currentLocation
                        )}
                    </span>

                </div>

                <span class="location-updated">
                    ${escapeHTML(
                        updated
                    )}
                </span>

            </td>


            <td>

                <span class="customer-name">
                    ${escapeHTML(
                        expected
                    )}
                </span>

            </td>


            <td>

                <button
                    type="button"
                    class="action-button"
                    title="View tracking"
                    aria-label="View tracking"
                    data-view-booking="${escapeHTML(
                        booking.booking_id
                    )}"
                >

                    <i class="fa-solid fa-eye"></i>

                </button>

            </td>

        </tr>
    `;
}


/* =========================================================
   MOBILE CARDS
========================================================= */

function renderMobileCards(
    rows
) {

    if (!mobileList) {
        return;
    }


    if (rows.length === 0) {

        mobileList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-location-dot"></i>
                <strong>No tracking records found</strong>
                <p>
                    Try another search or status filter.
                </p>
            </div>
        `;

        return;
    }


    mobileList.innerHTML =
        rows
            .map(
                booking =>
                    createMobileCard(
                        booking
                    )
            )
            .join("");


    mobileList
        .querySelectorAll(
            "[data-mobile-view]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        openTrackingDetails(
                            button.dataset.mobileView
                        );
                    }
                );

            }
        );
}


/* =========================================================
   MOBILE CARD
========================================================= */

function createMobileCard(
    booking
) {

    const dateTime =
        getBookingDateTime(
            booking
        );


    const statusLabel =
        getStatusLabel(
            booking.status
        );


    const statusClass =
        getStatusClass(
            booking.status
        );


    return `
        <article class="mobile-tracking-card">


            <div class="mobile-tracking-top">

                <div>

                    <div class="mobile-tracking-id">
                        ${escapeHTML(
                            booking.booking_id
                        )}
                    </div>

                    <div class="mobile-tracking-date">
                        ${escapeHTML(
                            dateTime.date
                        )}
                        ·
                        ${escapeHTML(
                            dateTime.time
                        )}
                    </div>

                </div>


                <span
                    class="status-badge ${statusClass}"
                >
                    ${escapeHTML(
                        statusLabel
                    )}
                </span>

            </div>


            <div class="mobile-tracking-customer">

                ${escapeHTML(
                    getCustomerName(
                        booking
                    )
                )}

            </div>


            <div class="mobile-tracking-phone">

                ${escapeHTML(
                    getCustomerPhone(
                        booking
                    )
                )}

            </div>


            <div class="mobile-tracking-route">

                <strong>
                    ${escapeHTML(
                        getPickupLocation(
                            booking
                        )
                    )}
                </strong>

                <br>

                <span>
                    ↓
                </span>

                <br>

                <strong>
                    ${escapeHTML(
                        getDeliveryLocation(
                            booking
                        )
                    )}
                </strong>

            </div>


            <div class="mobile-tracking-info">


                <div class="mobile-info-item">

                    <span class="mobile-info-label">
                        Current Location
                    </span>

                    <span class="mobile-info-value">
                        ${escapeHTML(
                            getCurrentLocation(
                                booking
                            )
                        )}
                    </span>

                </div>


                <div class="mobile-info-item">

                    <span class="mobile-info-label">
                        Expected Delivery
                    </span>

                    <span class="mobile-info-value">
                        ${escapeHTML(
                            getExpectedDelivery(
                                booking
                            )
                        )}
                    </span>

                </div>


            </div>


            <button
                type="button"
                class="mobile-view-button"
                data-mobile-view="${escapeHTML(
                    booking.booking_id
                )}"
            >

                <i class="fa-solid fa-location-dot"></i>

                View Tracking

            </button>


        </article>
    `;
}


/* =========================================================
   LIST COUNT
========================================================= */

function updateListCount() {

    if (!listCount) {
        return;
    }


    const total =
        filteredBookings.length;


    const all =
        allBookings.length;


    if (total === all) {

        listCount.textContent =
            `${all} shipment${all === 1 ? "" : "s"}`;

        return;
    }


    listCount.textContent =
        `Showing ${total} of ${all} shipments`;
}


/* =========================================================
   PAGINATION
========================================================= */

function setupPagination() {

    previousPage?.addEventListener(
        "click",
        () => {

            if (currentPage > 1) {

                currentPage--;

                renderTrackingList();

                renderPagination();
            }
        }
    );


    nextPage?.addEventListener(
        "click",
        () => {

            const totalPages =
                getTotalPages();


            if (
                currentPage <
                totalPages
            ) {

                currentPage++;

                renderTrackingList();

                renderPagination();
            }
        }
    );
}


function getTotalPages() {

    return Math.max(
        1,
        Math.ceil(
            filteredBookings.length /
            ROWS_PER_PAGE
        )
    );
}


function renderPagination() {

    if (
        !previousPage ||
        !nextPage ||
        !pageButtons
    ) {
        return;
    }


    const totalPages =
        getTotalPages();


    previousPage.disabled =
        currentPage <= 1;


    nextPage.disabled =
        currentPage >= totalPages;


    pageButtons.innerHTML = "";


    const maxVisiblePages =
        5;


    let start =
        Math.max(
            1,
            currentPage -
                Math.floor(
                    maxVisiblePages / 2
                )
        );


    let end =
        Math.min(
            totalPages,
            start +
                maxVisiblePages -
                1
        );


    if (
        end - start + 1 <
        maxVisiblePages
    ) {

        start =
            Math.max(
                1,
                end -
                    maxVisiblePages +
                    1
            );
    }


    for (
        let page = start;
        page <= end;
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
            () => {

                currentPage =
                    page;

                renderTrackingList();

                renderPagination();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );


        pageButtons.appendChild(
            button
        );
    }
}


/* =========================================================
   FILTERS
========================================================= */

function setupFilters() {

    if (!statusTabs) {
        return;
    }


    statusTabs
        .querySelectorAll(
            ".status-tab"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        selectedStatus =
                            button.dataset.status ||
                            "";


                        statusTabs
                            .querySelectorAll(
                                ".status-tab"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        applyFilters();
                    }
                );

            }
        );
}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    if (!searchInput) {
        return;
    }


    let searchTimer = null;


    searchInput.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    applyFilters,
                    150
                );
        }
    );
}


/* =========================================================
   REFRESH
========================================================= */

refreshButton?.addEventListener(
    "click",
    async () => {

        refreshButton.disabled =
            true;


        const icon =
            refreshButton.querySelector(
                "i"
            );


        icon?.classList.add(
            "fa-spin"
        );


        try {

            await loadBookings();


        } catch (error) {

            console.error(
                error
            );


            showPageError(
                getReadableError(
                    error
                )
            );


        } finally {

            refreshButton.disabled =
                false;


            icon?.classList.remove(
                "fa-spin"
            );
        }
    }
);


/* =========================================================
   TRACKING DETAILS
========================================================= */

function openTrackingDetails(
    bookingId
) {

    const booking =
        allBookings.find(
            item =>
                item.booking_id ===
                bookingId
        );


    if (!booking) {

        showPageError(
            "The selected booking could not be found."
        );

        return;
    }


    selectedBooking =
        booking;


    modalBookingId.textContent =
        booking.booking_id ||
        "—";


    renderModal(
        booking
    );


    detailsModal.classList.add(
        "show"
    );


    detailsModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";
}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeTrackingModal() {

    detailsModal.classList.remove(
        "show"
    );


    detailsModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";
}


function setupModal() {

    closeModal?.addEventListener(
        "click",
        closeTrackingModal
    );


    modalBackdrop?.addEventListener(
        "click",
        closeTrackingModal
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeTrackingModal();
            }
        }
    );


    modalViewBooking?.addEventListener(
        "click",
        () => {

            if (!selectedBooking) {
                return;
            }


            const id =
                encodeURIComponent(
                    selectedBooking.booking_id
                );


            window.location.href =
                `bookings.html?id=${id}`;
        }
    );


    modalDownloadBill?.addEventListener(
        "click",
        () => {

            if (!selectedBooking) {
                return;
            }


            const id =
                encodeURIComponent(
                    selectedBooking.booking_id
                );


            window.location.href =
                `download-bill.html?id=${id}`;
        }
    );
}


/* =========================================================
   RENDER MODAL
========================================================= */

function renderModal(
    booking
) {

    const history =
        getTrackingHistory(
            booking
        );


    const dateTime =
        getBookingDateTime(
            booking
        );


    const statusLabel =
        getStatusLabel(
            booking.status
        );


    const statusClass =
        getStatusClass(
            booking.status
        );


    const callStatus =
        getCallConfirmationLabel(
            booking
        );


    const driverName =
        getDriverName(
            booking
        );


    const driverPhone =
        getDriverPhone(
            booking
        );


    modalContent.innerHTML = `

        <div class="tracking-summary">


            <div class="summary-box">

                <span class="summary-label">
                    Status
                </span>

                <span class="summary-value">

                    <span class="status-badge ${statusClass}">
                        ${escapeHTML(
                            statusLabel
                        )}
                    </span>

                </span>

            </div>


            <div class="summary-box">

                <span class="summary-label">
                    Booking Date
                </span>

                <span class="summary-value">
                    ${escapeHTML(
                        dateTime.date
                    )}
                </span>

            </div>


            <div class="summary-box">

                <span class="summary-label">
                    Payment
                </span>

                <span class="summary-value">
                    ${escapeHTML(
                        formatPaymentStatus(
                            booking.payment_status
                        )
                    )}
                </span>

            </div>


            <div class="summary-box">

                <span class="summary-label">
                    Driver
                </span>

                <span class="summary-value">
                    ${escapeHTML(
                        driverName
                    )}
                </span>

            </div>


        </div>


        <section class="modal-section">

            <h3 class="modal-section-title">
                Shipment Information
            </h3>


            <div class="info-grid">


                <div class="info-box">

                    <span class="info-label">
                        Booking Date
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            dateTime.date
                        )}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        Booking Time
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            dateTime.time
                        )}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        Sender
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            booking.pickup_name ||
                            getCustomerName(
                                booking
                            )
                        )}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        Receiver
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            booking.receiver_name ||
                            "—"
                        )}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        Pickup
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            booking.pickup_address ||
                            booking.pickup_city ||
                            "—"
                        )}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        Delivery
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            booking.delivery_address ||
                            booking.delivery_city ||
                            "—"
                        )}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        Call Confirmation
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            callStatus
                        )}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        Payment Status
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            formatPaymentStatus(
                                booking.payment_status
                            )
                        )}
                    </span>

                </div>


            </div>

        </section>


        <section class="modal-section">

            <h3 class="modal-section-title">
                Parcel Information
            </h3>


            <div class="info-grid">


                <div class="info-box">

                    <span class="info-label">
                        Parcel Type
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            booking.parcel_type ||
                            "—"
                        )}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        Pieces
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            booking.pieces ??
                            "—"
                        )}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        Weight
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            booking.weight
                                ? `${booking.weight} kg`
                                : "—"
                        )}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        Declared Value
                    </span>

                    <span class="info-value">
                        ${formatMoney(
                            booking.declared_value
                        )}
                    </span>

                </div>


                <div class="info-box full">

                    <span class="info-label">
                        Instructions
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            booking.special_instructions ||
                            "No special instructions"
                        )}
                    </span>

                </div>


            </div>

        </section>


        <section class="modal-section">

            <h3 class="modal-section-title">
                Driver & Vehicle
            </h3>


            <div class="info-grid">


                <div class="info-box">

                    <span class="info-label">
                        Driver
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            driverName
                        )}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        Driver Phone
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            driverPhone
                        )}
                    </span>

                </div>


                <div class="info-box full">

                    <span class="info-label">
                        Current Location
                    </span>

                    <span class="info-value">
                        ${escapeHTML(
                            getCurrentLocation(
                                booking
                            )
                        )}
                    </span>

                </div>


            </div>

        </section>


        <section class="modal-section">

            <h3 class="modal-section-title">
                Tracking Timeline
            </h3>


            <div class="timeline">

                ${history.length > 0
                    ? history
                        .map(
                            (item, index) =>
                                createTimelineItem(
                                    item,
                                    index,
                                    history,
                                    booking
                                )
                        )
                        .join("")
                    : createFallbackTimeline(
                        booking
                    )
                }

            </div>

        </section>

    `;
}


/* =========================================================
   TRACKING HISTORY
========================================================= */

function getTrackingHistory(
    booking
) {

    const history =
        Array.isArray(
            booking._history
        )
            ? [...booking._history]
            : [];


    history.sort(
        (a, b) =>
            new Date(a.changed_at) -
            new Date(b.changed_at)
    );


    return history;
}


/* =========================================================
   TIMELINE ITEM
========================================================= */

function createTimelineItem(
    item,
    index,
    history,
    booking
) {

    const status =
        item.status;


    const current =
        index ===
        history.length - 1;


    const cancelled =
        status === "cancelled";


    const completed =
        !current &&
        !cancelled;


    const icon =
        getTimelineIcon(
            status
        );


    const title =
        getStatusLabel(
            status
        );


    return `

        <div
            class="
                timeline-item
                ${completed ? "completed" : ""}
                ${current ? "current" : ""}
                ${cancelled ? "cancelled" : ""}
            "
        >


            <div class="timeline-dot">

                <i class="${icon}"></i>

            </div>


            <div class="timeline-content">

                <div class="timeline-title">

                    ${escapeHTML(
                        title
                    )}

                </div>


                <div class="timeline-date">

                    ${escapeHTML(
                        formatDateTime(
                            item.changed_at
                        )
                    )}

                </div>


                ${
                    item.note
                        ? `
                            <div class="timeline-note">
                                ${escapeHTML(
                                    item.note
                                )}
                            </div>
                          `
                        : ""
                }


            </div>


        </div>

    `;
}


/* =========================================================
   FALLBACK TIMELINE
========================================================= */

function createFallbackTimeline(
    booking
) {

    const date =
        booking.created_at;


    return `

        <div class="timeline-item current">

            <div class="timeline-dot">

                <i class="fa-solid fa-box"></i>

            </div>


            <div class="timeline-content">

                <div class="timeline-title">
                    ${escapeHTML(
                        getStatusLabel(
                            booking.status
                        )
                    )}
                </div>


                <div class="timeline-date">
                    ${escapeHTML(
                        formatDateTime(
                            date
                        )
                    )}
                </div>


            </div>

        </div>

    `;
}


/* =========================================================
   TIMELINE ICON
========================================================= */

function getTimelineIcon(
    status
) {

    const icons = {

        pending:
            "fa-solid fa-box",

        confirmed:
            "fa-solid fa-circle-check",

        assigned:
            "fa-solid fa-user-check",

        pickup_started:
            "fa-solid fa-box-open",

        picked_up:
            "fa-solid fa-hand-holding-box",

        in_transit:
            "fa-solid fa-truck",

        out_for_delivery:
            "fa-solid fa-truck-fast",

        delivered:
            "fa-solid fa-check",

        cancelled:
            "fa-solid fa-xmark"
    };


    return (
        icons[status] ||
        "fa-solid fa-circle"
    );
}


/* =========================================================
   CALL CONFIRMATION
========================================================= */

function getCallConfirmationLabel(
    booking
) {

    const status =
        booking.call_confirmation_status;


    const labels = {

        required:
            "Required",

        done:
            "Confirmed",

        not_reachable:
            "Not reachable",

        cancelled:
            "Cancelled"
    };


    let label =
        labels[status] ||
        "—";


    if (
        status === "done" &&
        booking.call_confirmed_at
    ) {

        label +=
            ` · ${formatDateTime(
                booking.call_confirmed_at
            )}`;
    }


    return label;
}


/* =========================================================
   PAYMENT
========================================================= */

function formatPaymentStatus(
    status
) {

    const labels = {

        pending:
            "Pending",

        partially_paid:
            "Partially Paid",

        paid:
            "Paid",

        failed:
            "Failed",

        cancelled:
            "Cancelled",

        refunded:
            "Refunded"
    };


    return (
        labels[status] ||
        "—"
    );
}


/* =========================================================
   MONEY
========================================================= */

function formatMoney(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";
    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return "—";
    }


    return (
        "₹" +
        number.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )
    );
}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

function setupMobileNavigation() {

    document
        .querySelectorAll(
            ".bottom-nav-item[data-bottom-page]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const page =
                            button.dataset.bottomPage;


                        navigateMobilePage(
                            page
                        );
                    }
                );

            }
        );


    mobileMoreBtn?.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            mobileMoreMenu.classList.toggle(
                "show"
            );
        }
    );


    document
        .querySelectorAll(
            "[data-more-page]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const page =
                            button.dataset.morePage;


                        navigateMorePage(
                            page
                        );
                    }
                );

            }
        );


    document.addEventListener(
        "click",
        event => {

            if (
                !mobileMoreMenu.contains(
                    event.target
                ) &&
                event.target !==
                    mobileMoreBtn
            ) {

                mobileMoreMenu.classList.remove(
                    "show"
                );
            }
        }
    );
}


/* =========================================================
   MOBILE PAGE ROUTES
========================================================= */

function navigateMobilePage(
    page
) {

    const routes = {

        home:
            "dashboard.html",

        bookings:
            "bookings.html",

        payment:
            "payments.html",

        tracking:
            "tracking.html"
    };


    if (
        routes[page] &&
        page !== "tracking"
    ) {

        window.location.href =
            routes[page];
    }
}


/* =========================================================
   MORE ROUTES
========================================================= */

function navigateMorePage(
    page
) {

    const routes = {

        "recent-orders":
            "bookings.html",

        pickup:
            "pickup-management.html",

        delivery:
            "delivery-management.html",

        drivers:
            "drivers.html",

        reports:
            "reports.html",

        settings:
            "settings.html"
    };


    if (routes[page]) {

        window.location.href =
            routes[page];
    }
}


/* =========================================================
   SIDEBAR
========================================================= */

function setupSidebar() {

    sidebarToggle?.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );


            sidebarOverlay.classList.toggle(
                "show"
            );


            document.body.style.overflow =
                sidebar.classList.contains(
                    "open"
                )
                    ? "hidden"
                    : "";
        }
    );


    sidebarOverlay?.addEventListener(
        "click",
        closeSidebar
    );


    sidebar
        ?.querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        if (
                            window.innerWidth <=
                            768
                        ) {

                            closeSidebar();
                        }
                    }
                );

            }
        );
}


function closeSidebar() {

    sidebar?.classList.remove(
        "open"
    );


    sidebarOverlay?.classList.remove(
        "show"
    );


    document.body.style.overflow =
        "";
}


/* =========================================================
   LOADING
========================================================= */

function setLoadingState(
    loading
) {

    if (loading) {

        if (trackingBody) {

            trackingBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <i class="fa-solid fa-spinner fa-spin"></i>
                            <strong>
                                Loading tracking data...
                            </strong>
                            <p>
                                Connecting to Supabase.
                            </p>
                        </div>
                    </td>
                </tr>
            `;
        }


        if (mobileList) {

            mobileList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <strong>
                        Loading tracking data...
                    </strong>
                    <p>
                        Connecting to Supabase.
                    </p>
                </div>
            `;
        }


        if (listCount) {

            listCount.textContent =
                "Loading shipments...";
        }

    }
}


/* =========================================================
   ERROR
========================================================= */

function showPageError(
    message
) {

    if (trackingBody) {

        trackingBody.innerHTML = `
            <tr>
                <td colspan="7">

                    <div class="empty-state">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                        <strong>
                            Unable to load tracking data
                        </strong>

                        <p>
                            ${escapeHTML(
                                message
                            )}
                        </p>

                    </div>

                </td>
            </tr>
        `;
    }


    if (mobileList) {

        mobileList.innerHTML = `
            <div class="empty-state">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <strong>
                    Unable to load tracking data
                </strong>

                <p>
                    ${escapeHTML(
                        message
                    )}
                </p>

            </div>
        `;
    }


    if (listCount) {

        listCount.textContent =
            "Unable to load shipments";
    }
}


/* =========================================================
   READABLE ERROR
========================================================= */

function getReadableError(
    error
) {

    if (!error) {
        return "Unknown error.";
    }


    if (
        error.message
    ) {

        return error.message;
    }


    return String(error);
}


/* =========================================================
   WINDOW RESIZE
========================================================= */

window.addEventListener(
    "resize",
    () => {

        if (
            window.innerWidth >
            768
        ) {

            closeSidebar();
        }
    }
);