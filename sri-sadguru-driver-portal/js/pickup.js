/* =========================================================
   SRI SADGURU DRIVER PORTAL
   PICKUP PAGE
   SUPABASE VERSION
========================================================= */

"use strict";


/* =========================================================
   STATE
========================================================= */

let currentDriver = null;

let allDriverBookings = [];

let currentFilter = "all";

let searchText = "";

let currentSort = "latest";


/* =========================================================
   DOM
========================================================= */

const bookingList =
    document.getElementById("bookingList");

const searchInput =
    document.getElementById("searchInput");

const sortSelect =
    document.getElementById("sortSelect");

const filterButtons =
    document.querySelectorAll(".filter-btn");


/* =========================================================
   SAFE VALUE
========================================================= */

function safeValue(value, fallback = "") {

    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    return String(value).trim();
}


/* =========================================================
   STATUS NORMALIZATION
========================================================= */

function normalizePickupStatus(booking) {

    const status =
        safeValue(booking.status)
            .toLowerCase();

    /*
        Database statuses:

        pending
        confirmed
        assigned
        pickup_started
        picked_up
        in_transit
        out_for_delivery
        delivered
        cancelled
    */

    if (status === "picked_up") {
        return "picked";
    }

    if (status === "pickup_started") {
        return "started";
    }

    /*
        Once the parcel has moved beyond pickup,
        keep it under Picked Up for this page.
    */

    if (
        status === "in_transit" ||
        status === "out_for_delivery" ||
        status === "delivered"
    ) {
        return "picked";
    }

    /*
        Cancelled bookings should not be treated
        as active pickup tasks.
    */

    if (status === "cancelled") {
        return "cancelled";
    }

    return "pending";
}


/* =========================================================
   BOOKING ID
========================================================= */

function getBookingId(booking) {

    return safeValue(
        booking.booking_id ||
        booking.bookingId ||
        booking.id
    );
}


/* =========================================================
   CUSTOMER NAME
========================================================= */

function getCustomerName(booking) {

    return safeValue(
        booking.pickup_name,
        "Customer"
    );
}


/* =========================================================
   PHONE
========================================================= */

function getPhone(booking) {

    return safeValue(
        booking.pickup_phone
    );
}


/* =========================================================
   PICKUP ADDRESS
========================================================= */

function getPickupAddress(booking) {

    const address =
        safeValue(
            booking.pickup_address
        );

    const city =
        safeValue(
            booking.pickup_city
        );

    const pincode =
        safeValue(
            booking.pickup_pincode
        );

    return [
        address,
        city,
        pincode
    ]
        .filter(Boolean)
        .join(", ") ||
        "Pickup address not available";
}


/* =========================================================
   PACKAGE
========================================================= */

function getPackageType(booking) {

    return safeValue(
        booking.parcel_type ||
        booking.parcel_name,
        "Package"
    );
}


/* =========================================================
   PIECES
========================================================= */

function getPieces(booking) {

    return safeValue(
        booking.pieces,
        "1"
    );
}


/* =========================================================
   WEIGHT
========================================================= */

function getWeight(booking) {

    const value =
        safeValue(
            booking.parcel_weight
        );

    if (!value) {
        return "-";
    }

    return value.toLowerCase().includes("kg")
        ? value
        : `${value} kg`;
}


/* =========================================================
   PICKUP DATE
========================================================= */

function getPickupDate(booking) {

    /*
        pickup_scheduled_at is the primary
        pickup date/time source.

        booking_date is used as fallback.
    */

    if (booking.pickup_scheduled_at) {

        const date =
            new Date(
                booking.pickup_scheduled_at
            );

        if (!Number.isNaN(date.getTime())) {

            return date.toLocaleDateString(
                "en-GB"
            );
        }
    }

    return safeValue(
        booking.booking_date
    );
}


/* =========================================================
   PICKUP TIME
========================================================= */

function getPickupTime(booking) {

    if (booking.pickup_scheduled_at) {

        const date =
            new Date(
                booking.pickup_scheduled_at
            );

        if (!Number.isNaN(date.getTime())) {

            return date.toLocaleTimeString(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
        }
    }

    return safeValue(
        booking.booking_time
    );
}


/* =========================================================
   DATE FOR SORTING
========================================================= */

function getBookingTimestamp(booking) {

    const date =
        booking.pickup_scheduled_at ||
        booking.booking_date ||
        booking.created_at;

    if (!date) {
        return 0;
    }

    const timestamp =
        Date.parse(date);

    return Number.isNaN(timestamp)
        ? 0
        : timestamp;
}


/* =========================================================
   LOAD BOOKINGS FROM SUPABASE
========================================================= */

async function loadBookings() {

    try {

        if (!window.driverAuth) {

            throw new Error(
                "Driver authentication module is not available."
            );
        }


        /*
            Get the currently authenticated driver.

            driverUuid = public.drivers.id
            driverId   = human-readable driver_id
        */

        currentDriver =
            await window.driverAuth.getCurrentDriver();


        if (
            !currentDriver ||
            !currentDriver.driverUuid
        ) {

            throw new Error(
                "Unable to identify the logged-in driver."
            );
        }


        /*
            Important:

            bookings.driver_id stores the UUID
            from public.drivers.id.

            Therefore we filter using driverUuid,
            NOT driver_id text such as DRV-XXXXXXXX.
        */

        const {
            data,
            error
        } =
            await window.supabaseClient
                .from("bookings")
                .select("*")
                .eq(
                    "driver_id",
                    currentDriver.driverUuid
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Pickup booking query error:",
                error
            );

            throw error;
        }


        allDriverBookings =
            Array.isArray(data)
                ? data
                : [];


        renderBookings();

    } catch (error) {

        console.error(
            "Unable to load pickup bookings:",
            error
        );


        allDriverBookings = [];


        if (bookingList) {

            bookingList.innerHTML = `

                <div class="empty-state">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <h3>
                        Unable to load pickup bookings
                    </h3>

                    <p>
                        Please refresh the page and try again.
                    </p>

                </div>

            `;
        }
    }
}


/* =========================================================
   UPDATE BOOKING STATUS
========================================================= */

async function updatePickupStatus(
    bookingUuid,
    newStatus
) {

    if (
        !currentDriver ||
        !currentDriver.driverUuid
    ) {

        throw new Error(
            "Driver session is not available."
        );
    }


    /*
        The driver UUID is included in the update
        condition so a driver can only update
        their own assigned booking.
    */

    const {
        data,
        error
    } =
        await window.supabaseClient
            .from("bookings")
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq(
                "id",
                bookingUuid
            )
            .eq(
                "driver_id",
                currentDriver.driverUuid
            )
            .select()
            .single();


    if (error) {

        console.error(
            "Pickup status update error:",
            error
        );

        throw error;
    }


    return data;
}


/* =========================================================
   FILTER
========================================================= */

function getFilteredBookings() {

    let result =
        [...allDriverBookings];


    /* =====================================================
       STATUS FILTER
    ===================================================== */

    if (currentFilter !== "all") {

        result =
            result.filter(
                booking =>
                    normalizePickupStatus(
                        booking
                    ) === currentFilter
            );
    }


    /* =====================================================
       SEARCH
    ===================================================== */

    if (searchText) {

        const query =
            searchText.toLowerCase();


        result =
            result.filter(
                booking => {

                    const searchable = [

                        getBookingId(
                            booking
                        ),

                        getCustomerName(
                            booking
                        ),

                        getPhone(
                            booking
                        ),

                        getPickupAddress(
                            booking
                        ),

                        getPackageType(
                            booking
                        )

                    ]
                        .join(" ")
                        .toLowerCase();


                    return searchable.includes(
                        query
                    );
                }
            );
    }


    /* =====================================================
       SORT
    ===================================================== */

    if (currentSort === "latest") {

        result.sort(
            (a, b) =>
                getBookingTimestamp(b) -
                getBookingTimestamp(a)
        );

    } else if (
        currentSort === "oldest"
    ) {

        result.sort(
            (a, b) =>
                getBookingTimestamp(a) -
                getBookingTimestamp(b)
        );

    } else if (
        currentSort === "customer"
    ) {

        result.sort(
            (a, b) =>
                getCustomerName(a)
                    .localeCompare(
                        getCustomerName(b)
                    )
        );

    } else if (
        currentSort === "pickup"
    ) {

        result.sort(
            (a, b) =>
                getBookingTimestamp(a) -
                getBookingTimestamp(b)
        );
    }


    return result;
}


/* =========================================================
   UPDATE COUNTS
========================================================= */

function updateCounts() {

    const activeBookings =
        allDriverBookings.filter(
            booking =>
                normalizePickupStatus(
                    booking
                ) !== "cancelled"
        );


    const all =
        activeBookings.length;


    const pending =
        activeBookings.filter(
            booking =>
                normalizePickupStatus(
                    booking
                ) === "pending"
        ).length;


    const started =
        activeBookings.filter(
            booking =>
                normalizePickupStatus(
                    booking
                ) === "started"
        ).length;


    const picked =
        activeBookings.filter(
            booking =>
                normalizePickupStatus(
                    booking
                ) === "picked"
        ).length;


    const allCount =
        document.getElementById(
            "allCount"
        );

    const pendingCount =
        document.getElementById(
            "pendingCount"
        );

    const startedCount =
        document.getElementById(
            "startedCount"
        );

    const pickedCount =
        document.getElementById(
            "pickedCount"
        );


    if (allCount) {
        allCount.textContent = all;
    }

    if (pendingCount) {
        pendingCount.textContent = pending;
    }

    if (startedCount) {
        startedCount.textContent = started;
    }

    if (pickedCount) {
        pickedCount.textContent = picked;
    }
}


/* =========================================================
   STATUS TEXT
========================================================= */

function getStatusText(status) {

    if (status === "started") {
        return "Pickup Started";
    }

    if (status === "picked") {
        return "Picked Up";
    }

    if (status === "cancelled") {
        return "Cancelled";
    }

    return "Pending Pickup";
}


/* =========================================================
   CARD ICON
========================================================= */

function getIconClass(status) {

    if (status === "started") {
        return "started";
    }

    if (status === "picked") {
        return "picked";
    }

    return "";
}


/* =========================================================
   RENDER CARD
========================================================= */

function createBookingCard(
    booking
) {

    const id =
        getBookingId(booking) ||
        "Booking";


    const customer =
        getCustomerName(
            booking
        );


    const phone =
        getPhone(
            booking
        );


    const address =
        getPickupAddress(
            booking
        );


    const packageType =
        getPackageType(
            booking
        );


    const pieces =
        getPieces(
            booking
        );


    const weight =
        getWeight(
            booking
        );


    const pickupDate =
        getPickupDate(
            booking
        );


    const pickupTime =
        getPickupTime(
            booking
        );


    const status =
        normalizePickupStatus(
            booking
        );


    const statusText =
        getStatusText(
            status
        );


    const iconClass =
        getIconClass(
            status
        );


    /*
        UUID is used internally for database updates.

        booking_id is used for the visible URL/details.
    */

    const bookingUuid =
        safeValue(
            booking.id
        );


    const safeBookingId =
        escapeAttribute(
            id
        );


    const safeBookingUuid =
        escapeAttribute(
            bookingUuid
        );


    /* =====================================================
       PHONE
    ===================================================== */

    const phoneForCall =
        phone.replace(
            /[\s\-().]/g,
            ""
        );


    const callButton =
        phoneForCall

            ? `

                <a
                    href="tel:${escapeAttribute(phoneForCall)}"
                    class="call-btn"
                    onclick="event.stopPropagation();"
                >

                    <i class="fa-solid fa-phone"></i>

                    Call Customer

                </a>

              `

            : `

                <button
                    class="call-btn"
                    type="button"
                    disabled
                    onclick="event.stopPropagation();"
                >

                    <i class="fa-solid fa-phone-slash"></i>

                    No Phone

                </button>

              `;


    /* =====================================================
       ACTION BUTTON
    ===================================================== */

    let actionButton = "";


    if (status === "pending") {

        actionButton = `

            <button
                class="pickup-btn"
                type="button"
                onclick="startPickup(event, '${safeBookingUuid}')"
            >

                <i class="fa-solid fa-truck-pickup"></i>

                Start Pickup

            </button>

        `;

    } else if (
        status === "started"
    ) {

        actionButton = `

            <button
                class="pickup-btn"
                type="button"
                onclick="completePickup(event, '${safeBookingUuid}')"
            >

                <i class="fa-solid fa-box"></i>

                Mark Picked Up

            </button>

        `;

    } else {

        actionButton = `

            <button
                class="pickup-btn completed"
                type="button"
                onclick="openBookingDetails(event, '${safeBookingId}')"
            >

                <i class="fa-solid fa-eye"></i>

                View Details

            </button>

        `;
    }


    /* =====================================================
       CARD
    ===================================================== */

    return `

        <article
            class="booking-card"
            onclick="openBookingDetails(event, '${safeBookingId}')"
        >

            <div class="booking-top">

                <div class="package-icon ${iconClass}">

                    <i class="fa-solid fa-box"></i>

                </div>


                <div class="booking-main">

                    <div class="booking-id-row">

                        <div>

                            <div class="booking-id">

                                ${escapeHTML(id)}

                            </div>


                            <div class="booking-customer">

                                ${escapeHTML(customer)}

                            </div>


                            <div class="booking-phone">

                                ${
                                    phone
                                        ? escapeHTML(phone)
                                        : "Phone not available"
                                }

                            </div>

                        </div>


                        <span
                            class="status-badge ${iconClass}"
                        >

                            ${escapeHTML(statusText)}

                        </span>

                    </div>

                </div>


                <i
                    class="fa-solid fa-chevron-right booking-arrow"
                ></i>

            </div>


            <div class="pickup-location">

                <i class="fa-solid fa-location-dot"></i>

                <span>

                    ${escapeHTML(address)}

                </span>

            </div>


            <div class="booking-meta">

                <span class="meta-chip">

                    <i class="fa-solid fa-box"></i>

                    ${escapeHTML(packageType)}

                </span>


                <span class="meta-chip">

                    <i class="fa-solid fa-cubes"></i>

                    ${escapeHTML(pieces)} pcs

                </span>


                <span class="meta-chip">

                    <i class="fa-solid fa-weight-hanging"></i>

                    ${escapeHTML(weight)}

                </span>


                ${
                    pickupDate

                        ? `

                            <span class="meta-chip">

                                <i class="fa-regular fa-calendar"></i>

                                ${escapeHTML(pickupDate)}

                            </span>

                          `

                        : ""
                }


                ${
                    pickupTime

                        ? `

                            <span class="meta-chip">

                                <i class="fa-regular fa-clock"></i>

                                ${escapeHTML(pickupTime)}

                            </span>

                          `

                        : ""
                }

            </div>


            <div class="card-actions">

                ${callButton}

                ${actionButton}

            </div>

        </article>

    `;
}


/* =========================================================
   RENDER BOOKINGS
========================================================= */

function renderBookings() {

    updateCounts();


    const bookings =
        getFilteredBookings();


    if (!bookingList) {
        return;
    }


    if (bookings.length === 0) {

        bookingList.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-box-open"></i>

                <h3>
                    No pickup bookings
                </h3>

                <p>
                    There are no pickup bookings matching
                    your current filter.
                </p>

            </div>

        `;

        return;
    }


    bookingList.innerHTML =
        bookings
            .map(
                booking =>
                    createBookingCard(
                        booking
                    )
            )
            .join("");
}


/* =========================================================
   START PICKUP
========================================================= */

async function startPickup(
    event,
    bookingUuid
) {

    event.stopPropagation();


    const booking =
        allDriverBookings.find(
            item =>
                safeValue(item.id) ===
                bookingUuid
        );


    if (!booking) {

        console.error(
            "Booking not found:",
            bookingUuid
        );

        return;
    }


    if (
        normalizePickupStatus(
            booking
        ) !== "pending"
    ) {

        return;
    }


    try {

        await updatePickupStatus(
            bookingUuid,
            "pickup_started"
        );


        /*
            Update the local copy immediately.
        */

        booking.status =
            "pickup_started";


        renderBookings();

    } catch (error) {

        console.error(
            "Unable to start pickup:",
            error
        );


        alert(
            "Unable to start pickup. Please try again."
        );
    }
}


/* =========================================================
   COMPLETE PICKUP
========================================================= */

async function completePickup(
    event,
    bookingUuid
) {

    event.stopPropagation();


    const booking =
        allDriverBookings.find(
            item =>
                safeValue(item.id) ===
                bookingUuid
        );


    if (!booking) {

        console.error(
            "Booking not found:",
            bookingUuid
        );

        return;
    }


    if (
        normalizePickupStatus(
            booking
        ) !== "started"
    ) {

        return;
    }


    const confirmed =
        window.confirm(
            "The parcel has been picked up. Are you confirm?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await updatePickupStatus(
            bookingUuid,
            "picked_up"
        );


        /*
            Update the local copy immediately.
        */

        booking.status =
            "picked_up";


        renderBookings();

    } catch (error) {

        console.error(
            "Unable to complete pickup:",
            error
        );


        alert(
            "Unable to mark the parcel as picked up. Please try again."
        );
    }
}


/* =========================================================
   BOOKING DETAILS
========================================================= */

function openBookingDetails(
    event,
    bookingId
) {

    /*
        Do not open details when the user taps
        Call Customer or an action button.
    */

    if (
        event &&
        event.target.closest(
            ".call-btn, .pickup-btn"
        )
    ) {

        return;
    }


    window.location.href =
        `booking-details.html?id=${encodeURIComponent(
            bookingId
        )}`;
}


/* =========================================================
   SEARCH
========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            searchText =
                this.value.trim();

            renderBookings();

        }
    );
}


/* =========================================================
   SORT
========================================================= */

if (sortSelect) {

    sortSelect.addEventListener(
        "change",
        function () {

            currentSort =
                this.value;

            renderBookings();

        }
    );
}


/* =========================================================
   FILTER BUTTONS
========================================================= */

filterButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            function () {

                filterButtons.forEach(
                    item =>
                        item.classList.remove(
                            "active"
                        )
                );


                this.classList.add(
                    "active"
                );


                currentFilter =
                    this.dataset.filter;


                renderBookings();

            }
        );

    }
);


/* =========================================================
   SIDEBAR
========================================================= */

const menuBtn =
    document.getElementById(
        "menuBtn"
    );

const sidebar =
    document.getElementById(
        "sidebar"
    );

const sidebarOverlay =
    document.getElementById(
        "sidebarOverlay"
    );


function openSidebar() {

    if (sidebar) {

        sidebar.classList.add(
            "open"
        );
    }


    if (sidebarOverlay) {

        sidebarOverlay.classList.add(
            "show"
        );
    }
}


function closeSidebar() {

    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );
    }


    if (sidebarOverlay) {

        sidebarOverlay.classList.remove(
            "show"
        );
    }
}


if (menuBtn) {

    menuBtn.addEventListener(
        "click",
        openSidebar
    );
}


if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        closeSidebar
    );
}


/* =========================================================
   LOGOUT
========================================================= */

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async function () {

            try {

                await window.supabaseClient
                    .auth
                    .signOut();

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
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value)

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
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(value) {

    return String(value)

        .replace(
            /\\/g,
            "\\\\"
        )

        .replace(
            /'/g,
            "\\'"
        );
}


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        /*
            Show the existing loading state
            while authentication/database
            information is being loaded.
        */

        if (bookingList) {

            bookingList.innerHTML = `

                <div class="loading">

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    Loading pickup bookings...

                </div>

            `;
        }


        await loadBookings();

    }
);