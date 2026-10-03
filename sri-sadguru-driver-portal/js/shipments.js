"use strict";

/* =========================================================
   SRI SADGURU SIDDAROODA PARCEL SERVICE
   DRIVER SHIPMENTS

   SUPABASE VERSION

   DATA SOURCE:
       public.bookings

   DRIVER AUTHENTICATION:
       window.driverAuth

   DRIVER RELATIONSHIP:
       bookings.driver_id
           ->
       drivers.id

   IMPORTANT:
   Only bookings assigned to the currently authenticated
   driver are loaded and displayed.
   ========================================================= */


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   DOM
   ========================================================= */

const sidebar =
    $("sidebar");

const sidebarToggle =
    $("sidebarToggle");

const sidebarClose =
    $("sidebarClose");

const sidebarOverlay =
    $("sidebarOverlay");

const logoutButton =
    $("logoutButton");

const refreshButton =
    $("refreshButton");

const refreshInline =
    $("refreshInline");

const searchInput =
    $("searchInput");

const clearSearch =
    $("clearSearch");

const sortSelect =
    $("sortSelect");

const clearFilters =
    $("clearFilters");

const emptyReset =
    $("emptyReset");

const filterChips =
    $("filterChips");

const shipmentList =
    $("shipmentList");

const emptyState =
    $("emptyState");

const emptyMessage =
    $("emptyMessage");

const resultCount =
    $("resultCount");

const notificationBadge =
    $("notificationBadge");


/* =========================================================
   DRIVER DOM
   ========================================================= */

const sidebarDriverName =
    $("sidebarDriverName");

const sidebarDriverId =
    $("sidebarDriverId");

const sidebarAvatar =
    $("sidebarAvatar");

const topAvatar =
    $("topAvatar");

const driverMiniName =
    $("driverMiniName");

const driverMiniId =
    $("driverMiniId");

const driverMiniAvatar =
    $("driverMiniAvatar");


/* =========================================================
   MODAL
   ========================================================= */

const shipmentModal =
    $("shipmentModal");

const modalBackdrop =
    $("modalBackdrop");

const closeModal =
    $("closeModal");

const modalCloseButton =
    $("modalCloseButton");

const modalShipmentId =
    $("modalShipmentId");

const modalContent =
    $("modalContent");


/* =========================================================
   TOAST
   ========================================================= */

const toast =
    $("toast");

const toastMessage =
    $("toastMessage");


/* =========================================================
   STATE
   ========================================================= */

let currentDriver = null;

let allBookings = [];

let driverBookings = [];

let filteredBookings = [];

let currentFilter = "all";

let currentSearch = "";

let currentSort = "latest";

let selectedBooking = null;

let toastTimer = null;


/* =========================================================
   NORMALIZE
   ========================================================= */

function normalize(value) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
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
   FIRST VALUE
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


/* =========================================================
   GET DRIVER NAME
   ========================================================= */

function getCurrentDriverName() {

    return firstValue(
        currentDriver?.driver?.name,
        currentDriver?.profile?.full_name,
        currentDriver?.name,
        "Driver"
    );
}


/* =========================================================
   GET DRIVER ID
   ========================================================= */

function getCurrentDriverId() {

    return firstValue(
        currentDriver?.driver?.driver_id,
        currentDriver?.driverId,
        "—"
    );
}


/* =========================================================
   GET DRIVER PHONE
   ========================================================= */

function getCurrentDriverPhone() {

    return firstValue(
        currentDriver?.driver?.phone,
        currentDriver?.phone,
        ""
    );
}


/* =========================================================
   INITIALS
   ========================================================= */

function getInitials(name) {

    const parts =
        String(
            name || ""
        )
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!parts.length) {

        return "DR";
    }


    if (parts.length === 1) {

        return parts[0]
            .slice(0, 2)
            .toUpperCase();
    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


/* =========================================================
   RENDER DRIVER
   ========================================================= */

function renderDriver() {

    const name =
        getCurrentDriverName();

    const driverId =
        getCurrentDriverId();

    const initials =
        getInitials(name);


    if (sidebarDriverName) {

        sidebarDriverName.textContent =
            name;
    }


    if (sidebarDriverId) {

        sidebarDriverId.textContent =
            `ID: ${driverId}`;
    }


    if (sidebarAvatar) {

        sidebarAvatar.textContent =
            initials;
    }


    if (topAvatar) {

        topAvatar.textContent =
            initials;
    }


    if (driverMiniName) {

        driverMiniName.textContent =
            name;
    }


    if (driverMiniId) {

        driverMiniId.textContent =
            `ID: ${driverId}`;
    }


    if (driverMiniAvatar) {

        driverMiniAvatar.textContent =
            initials;
    }
}


/* =========================================================
   LOAD BOOKINGS FROM SUPABASE
   ========================================================= */

async function loadAllBookings() {

    if (
        !window.supabaseClient
    ) {

        throw new Error(
            "Supabase client is not available."
        );
    }


    if (
        !window.driverAuth
    ) {

        throw new Error(
            "Driver authentication module is not available."
        );
    }


    if (
        !currentDriver
    ) {

        currentDriver =
            await window.driverAuth.getCurrentDriver();
    }


    if (
        !currentDriver
    ) {

        throw new Error(
            "No authenticated driver was found."
        );
    }


    const driverUuid =
        currentDriver.driverUuid;


    if (!driverUuid) {

        throw new Error(
            "Authenticated driver UUID is missing."
        );
    }


    /*
       Query only bookings assigned to
       the currently authenticated driver.

       bookings.driver_id references
       drivers.id.
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
                driverUuid
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Unable to load driver shipments:",
            error
        );

        throw error;
    }


    allBookings =
        Array.isArray(data)
            ? data
            : [];


    /*
       This is already driver-filtered by
       Supabase query.

       Keep a second application-level
       check as an additional safety layer.
    */

    driverBookings =
        allBookings.filter(
            booking =>
                booking &&
                String(
                    booking.driver_id
                ) ===
                String(
                    driverUuid
                )
        );
}


/* =========================================================
   CUSTOMER NAME
   ========================================================= */

function getCustomerName(booking) {

    return firstValue(

        booking?.pickup_name,

        booking?.customer_name,

        "Unknown Customer"
    );
}


/* =========================================================
   CUSTOMER PHONE
   ========================================================= */

function getCustomerPhone(booking) {

    return firstValue(

        booking?.pickup_phone,

        booking?.customer_phone,

        ""
    );
}


/* =========================================================
   PICKUP LOCATION
   ========================================================= */

function getPickupLocation(booking) {

    return firstValue(

        booking?.pickup_address,

        booking?.pickup_city,

        "Not available"
    );
}


/* =========================================================
   DELIVERY LOCATION
   ========================================================= */

function getDeliveryLocation(booking) {

    return firstValue(

        booking?.delivery_address,

        booking?.delivery_city,

        "Not available"
    );
}


/* =========================================================
   ROUTE LOCATION NAME
   ========================================================= */

function getRouteFrom(booking) {

    return firstValue(

        booking?.pickup_city,

        booking?.pickup_address,

        "Pickup"
    );
}


function getRouteTo(booking) {

    return firstValue(

        booking?.delivery_city,

        booking?.delivery_address,

        "Delivery"
    );
}


/* =========================================================
   PARCEL
   ========================================================= */

function getParcelType(booking) {

    return firstValue(

        booking?.parcel_type,

        booking?.parcel_name,

        "Parcel"
    );
}


function getPieces(booking) {

    return firstValue(

        booking?.pieces,

        "—"
    );
}


function getWeight(booking) {

    const weight =
        firstValue(
            booking?.parcel_weight,
            ""
        );


    if (
        weight === "" ||
        weight === null ||
        weight === undefined
    ) {

        return "—";
    }


    return `${weight} kg`;
}


/* =========================================================
   DATE / TIME
   ========================================================= */

function getBookingDate(booking) {

    return firstValue(

        booking?.booking_date,

        ""
    );
}


function getBookingTime(booking) {

    return firstValue(

        booking?.booking_time,

        ""
    );
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatBookingDate(dateValue) {

    if (!dateValue) {

        return "";
    }


    const date =
        new Date(
            `${dateValue}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            dateValue
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
   FORMAT TIME
   ========================================================= */

function formatBookingTime(timeValue) {

    if (!timeValue) {

        return "";
    }


    const parts =
        String(
            timeValue
        ).split(":");


    if (
        parts.length < 2
    ) {

        return String(
            timeValue
        );
    }


    const hours =
        Number(
            parts[0]
        );

    const minutes =
        Number(
            parts[1]
        );


    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
    ) {

        return String(
            timeValue
        );
    }


    const date =
        new Date();

    date.setHours(
        hours,
        minutes,
        0,
        0
    );


    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   DATE / TIME DISPLAY
   ========================================================= */

function getBookingDateTime(booking) {

    const date =
        formatBookingDate(
            getBookingDate(
                booking
            )
        );


    const time =
        formatBookingTime(
            getBookingTime(
                booking
            )
        );


    if (
        date &&
        time
    ) {

        return `${date}, ${time}`;
    }


    if (date) {

        return date;
    }


    if (time) {

        return time;
    }


    /*
       Fallback to pickup schedule
       when booking date/time are empty.
    */

    if (
        booking?.pickup_scheduled_at
    ) {

        const scheduled =
            new Date(
                booking.pickup_scheduled_at
            );


        if (
            !Number.isNaN(
                scheduled.getTime()
            )
        ) {

            return scheduled.toLocaleString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
        }
    }


    return "Schedule not available";
}


/* =========================================================
   TIMESTAMP
   ========================================================= */

function getBookingTimestamp(booking) {

    /*
       Prefer booking_date + booking_time.
    */

    const date =
        getBookingDate(
            booking
        );

    const time =
        getBookingTime(
            booking
        );


    if (date) {

        const combined =
            time
                ? `${date}T${time}`
                : `${date}T00:00:00`;


        const parsed =
            new Date(
                combined
            );


        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {

            return parsed.getTime();
        }
    }


    /*
       Then use pickup scheduled time.
    */

    if (
        booking?.pickup_scheduled_at
    ) {

        const scheduled =
            new Date(
                booking.pickup_scheduled_at
            );


        if (
            !Number.isNaN(
                scheduled.getTime()
            )
        ) {

            return scheduled.getTime();
        }
    }


    /*
       Finally use created_at.
    */

    if (
        booking?.created_at
    ) {

        const created =
            new Date(
                booking.created_at
            );


        if (
            !Number.isNaN(
                created.getTime()
            )
        ) {

            return created.getTime();
        }
    }


    return 0;
}


/* =========================================================
   STATUS NORMALIZATION
   ========================================================= */

function getRawStatus(booking) {

    return firstValue(

        booking?.status,

        "pending"
    );
}


/* =========================================================
   STATUS NORMALIZATION
   ========================================================= */

function normalizeStatus(booking) {

    const status =
        normalize(
            getRawStatus(
                booking
            )
        );


    /*
       DATABASE:
       delivered
    */

    if (
        status === "delivered" ||
        status.includes("complete")
    ) {

        return "delivered";
    }


    /*
       DATABASE:
       out_for_delivery
       out-for-delivery
       out for delivery
    */

    if (
        status === "out_for_delivery" ||
        status === "out-for-delivery" ||
        status.includes(
            "out for delivery"
        )
    ) {

        return "out-for-delivery";
    }


    /*
       DATABASE:
       in_transit
       in-transit
       in transit
    */

    if (
        status === "in_transit" ||
        status === "in-transit" ||
        status.includes(
            "in transit"
        )
    ) {

        return "in-transit";
    }


    /*
       DATABASE:
       pickup_started
       picked_up
       pickup
    */

    if (
        status === "pickup_started" ||
        status === "picked_up" ||
        status === "pickup" ||
        status.includes("pickup") ||
        status.includes("pick up")
    ) {

        return "pickup";
    }


    /*
       DATABASE:
       assigned
    */

    if (
        status === "assigned" ||
        status === "accepted"
    ) {

        return "assigned";
    }


    /*
       DATABASE:
       confirmed

       A confirmed booking that is already
       assigned to this driver is treated
       as Pending on the driver page.
    */

    if (
        status === "confirmed"
    ) {

        return "pending";
    }


    /*
       DATABASE:
       pending
    */

    if (
        status === "pending"
    ) {

        return "pending";
    }


    /*
       DATABASE:
       cancelled
    */

    if (
        status === "cancelled" ||
        status === "canceled" ||
        status.includes("cancel")
    ) {

        return "cancelled";
    }


    /*
       Optional new status.
    */

    if (
        status === "new"
    ) {

        return "new";
    }


    /*
       Default.
    */

    return "pending";
}


/* =========================================================
   DISPLAY STATUS
   ========================================================= */

function getStatusLabel(booking) {

    const status =
        normalizeStatus(
            booking
        );


    const labels = {

        pending:
            "Pending",

        assigned:
            "Assigned",

        new:
            "New",

        pickup:
            "Pickup Pending",

        "in-transit":
            "In Transit",

        "out-for-delivery":
            "Out for Delivery",

        delivered:
            "Delivered",

        cancelled:
            "Cancelled"
    };


    return (
        labels[status] ||
        "Pending"
    );
}


/* =========================================================
   STATUS CLASS
   ========================================================= */

function getStatusClass(booking) {

    const status =
        normalizeStatus(
            booking
        );


    const classes = {

        pending:
            "status-pending",

        assigned:
            "status-assigned",

        new:
            "status-assigned",

        pickup:
            "status-pickup",

        "in-transit":
            "status-transit",

        "out-for-delivery":
            "status-delivery",

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
   FILTER MATCH
   ========================================================= */

function matchesFilter(booking) {

    if (
        currentFilter === "all"
    ) {

        return true;
    }


    const status =
        normalizeStatus(
            booking
        );


    /*
       "Need to Assign" does not apply
       to a driver-only shipment list.

       Only assigned bookings are loaded.
    */

    if (
        currentFilter ===
        "need-assign"
    ) {

        return false;
    }


    /*
       NEW
    */

    if (
        currentFilter === "new"
    ) {

        return status === "new";
    }


    /*
       PENDING

       Confirmed assigned bookings are
       normalized to pending.
    */

    if (
        currentFilter === "pending"
    ) {

        return (
            status === "pending" ||
            status === "assigned"
        );
    }


    /*
       PICKUP
    */

    if (
        currentFilter === "pickup"
    ) {

        return (
            status === "pickup"
        );
    }


    /*
       IN TRANSIT
    */

    if (
        currentFilter === "in-transit"
    ) {

        return (
            status === "in-transit"
        );
    }


    /*
       OUT FOR DELIVERY
    */

    if (
        currentFilter ===
        "out-for-delivery"
    ) {

        return (
            status ===
            "out-for-delivery"
        );
    }


    /*
       DELIVERED
    */

    if (
        currentFilter === "delivered"
    ) {

        return (
            status === "delivered"
        );
    }


    return true;
}


/* =========================================================
   SEARCH MATCH
   ========================================================= */

function matchesSearch(booking) {

    if (!currentSearch) {

        return true;
    }


    const query =
        normalize(
            currentSearch
        );


    const searchable = [

        booking?.booking_id,

        booking?.id,

        getCustomerName(
            booking
        ),

        getCustomerPhone(
            booking
        ),

        booking?.pickup_address,

        booking?.pickup_city,

        booking?.pickup_pincode,

        booking?.receiver_name,

        booking?.receiver_phone,

        booking?.delivery_address,

        booking?.delivery_city,

        booking?.delivery_district,

        booking?.delivery_state,

        booking?.delivery_pincode,

        getParcelType(
            booking
        ),

        getStatusLabel(
            booking
        )

    ]
        .map(
            value =>
                normalize(value)
        )
        .join(" ");


    return searchable.includes(
        query
    );
}


/* =========================================================
   SORT
   ========================================================= */

function sortBookings(bookings) {

    const copy =
        [...bookings];


    /*
       LATEST
    */

    if (
        currentSort === "latest"
    ) {

        return copy.sort(
            (a, b) =>
                getBookingTimestamp(b) -
                getBookingTimestamp(a)
        );
    }


    /*
       OLDEST
    */

    if (
        currentSort === "oldest"
    ) {

        return copy.sort(
            (a, b) =>
                getBookingTimestamp(a) -
                getBookingTimestamp(b)
        );
    }


    /*
       CUSTOMER
    */

    if (
        currentSort === "customer"
    ) {

        return copy.sort(
            (a, b) =>
                getCustomerName(a)
                    .localeCompare(
                        getCustomerName(b)
                    )
        );
    }


    /*
       STATUS
    */

    if (
        currentSort === "status"
    ) {

        return copy.sort(
            (a, b) =>
                getStatusLabel(a)
                    .localeCompare(
                        getStatusLabel(b)
                    )
        );
    }


    return copy;
}


/* =========================================================
   APPLY FILTERS
   ========================================================= */

function applyFilters() {

    const filtered =
        driverBookings.filter(
            booking =>
                matchesFilter(
                    booking
                ) &&
                matchesSearch(
                    booking
                )
        );


    filteredBookings =
        sortBookings(
            filtered
        );


    renderShipments();

    updateResultCount();
}


/* =========================================================
   COUNT STATUS
   ========================================================= */

function countStatus(status) {

    return driverBookings.filter(
        booking =>
            normalizeStatus(
                booking
            ) === status
    ).length;
}


/* =========================================================
   UPDATE FILTER COUNTS
   ========================================================= */

function updateFilterCounts() {

    if ($("countAll")) {

        $("countAll").textContent =
            driverBookings.length;
    }


    if ($("countPending")) {

        $("countPending").textContent =
            driverBookings.filter(
                booking => {

                    const status =
                        normalizeStatus(
                            booking
                        );

                    return (
                        status === "pending" ||
                        status === "assigned"
                    );
                }
            ).length;
    }


    /*
       A driver page never displays
       another driver's unassigned jobs.
    */

    if ($("countNeedAssign")) {

        $("countNeedAssign").textContent =
            "0";
    }


    if ($("countNew")) {

        $("countNew").textContent =
            countStatus("new");
    }


    if ($("countPickup")) {

        $("countPickup").textContent =
            countStatus("pickup");
    }


    if ($("countTransit")) {

        $("countTransit").textContent =
            countStatus("in-transit");
    }


    if ($("countOutDelivery")) {

        $("countOutDelivery").textContent =
            countStatus(
                "out-for-delivery"
            );
    }


    if ($("countDelivered")) {

        $("countDelivered").textContent =
            countStatus(
                "delivered"
            );
    }
}


/* =========================================================
   RESULT COUNT
   ========================================================= */

function updateResultCount() {

    const count =
        filteredBookings.length;


    if (!resultCount) {

        return;
    }


    resultCount.textContent =
        `${count} ${
            count === 1
                ? "shipment"
                : "shipments"
        }`;
}


/* =========================================================
   SHIPMENT CARD
   ========================================================= */

function createShipmentCard(booking) {

    const status =
        getStatusLabel(
            booking
        );


    const statusClass =
        getStatusClass(
            booking
        );


    const customer =
        getCustomerName(
            booking
        );


    const phone =
        getCustomerPhone(
            booking
        );


    const pickup =
        getRouteFrom(
            booking
        );


    const delivery =
        getRouteTo(
            booking
        );


    const dateTime =
        getBookingDateTime(
            booking
        );


    const parcel =
        getParcelType(
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


    const shipmentId =
        firstValue(
            booking?.booking_id,
            booking?.id,
            "—"
        );


    return `

        <article
            class="shipment-card"
            data-booking-id="${escapeHTML(
                booking.id
            )}"
        >

            <div class="shipment-top">

                <div class="shipment-id-row">

                    <div class="shipment-icon">

                        <i class="fa-solid fa-box"></i>

                    </div>

                    <div>

                        <div class="shipment-id">
                            ${escapeHTML(
                                shipmentId
                            )}
                        </div>

                        <div class="shipment-customer">
                            ${escapeHTML(
                                customer
                            )}

                            ${
                                phone
                                    ? ` · ${escapeHTML(phone)}`
                                    : ""
                            }
                        </div>

                    </div>

                </div>


                <span
                    class="
                        status-badge
                        ${statusClass}
                    "
                >

                    ${escapeHTML(status)}

                </span>

            </div>


            <div class="route-section">

                <div class="route-line">

                    <span class="route-dot"></span>

                    <span class="route-dot"></span>

                </div>


                <div class="route-point">

                    <div class="route-location">

                        <span class="route-label">
                            Pickup
                        </span>

                        <span class="route-value">
                            ${escapeHTML(pickup)}
                        </span>

                    </div>


                    <div class="route-location">

                        <span class="route-label">
                            Delivery
                        </span>

                        <span class="route-value">
                            ${escapeHTML(delivery)}
                        </span>

                    </div>

                </div>

            </div>


            <div class="shipment-info-grid">

                <div class="info-item">

                    <span class="info-label">
                        Schedule
                    </span>

                    <span class="info-value">
                        ${escapeHTML(dateTime)}
                    </span>

                </div>


                <div class="info-item">

                    <span class="info-label">
                        Parcel
                    </span>

                    <span class="info-value">
                        ${escapeHTML(parcel)}
                    </span>

                </div>


                <div class="info-item">

                    <span class="info-label">
                        Pieces
                    </span>

                    <span class="info-value">
                        ${escapeHTML(pieces)}
                    </span>

                </div>


                <div class="info-item">

                    <span class="info-label">
                        Weight
                    </span>

                    <span class="info-value">
                        ${escapeHTML(weight)}
                    </span>

                </div>

            </div>


            <div class="shipment-footer">

                <div class="shipment-meta">

                    <span class="meta-item">

                        <i class="fa-solid fa-user"></i>

                        ${escapeHTML(customer)}

                    </span>

                </div>


                <div class="shipment-actions">

                    <button
                        class="view-button"
                        type="button"
                        data-action="view"
                        data-id="${escapeHTML(
                            booking.id
                        )}"
                    >

                        View Details

                        <i class="fa-solid fa-chevron-right"></i>

                    </button>

                </div>

            </div>

        </article>

    `;
}


/* =========================================================
   RENDER SHIPMENTS
   ========================================================= */

function renderShipments() {

    if (
        !filteredBookings.length
    ) {

        shipmentList.innerHTML =
            "";

        emptyState.classList.remove(
            "hidden"
        );


        if (
            currentFilter ===
            "need-assign"
        ) {

            emptyMessage.textContent =
                "Unassigned shipments are not shown in a driver account. Only shipments assigned to this driver are accessible.";

        } else if (
            currentSearch
        ) {

            emptyMessage.textContent =
                "No assigned shipments match your search.";

        } else {

            emptyMessage.textContent =
                "There are no shipments matching your current filter.";
        }


        return;
    }


    emptyState.classList.add(
        "hidden"
    );


    shipmentList.innerHTML =
        filteredBookings
            .map(
                booking =>
                    createShipmentCard(
                        booking
                    )
            )
            .join("");
}


/* =========================================================
   FIND BOOKING
   ========================================================= */

function findDriverBooking(id) {

    return driverBookings.find(
        booking =>
            String(
                booking.id
            ) ===
            String(id)
    );
}


/* =========================================================
   MODAL
   ========================================================= */

function openShipmentModal(booking) {

    if (!booking) {

        return;
    }


    selectedBooking =
        booking;


    const shipmentId =
        firstValue(
            booking?.booking_id,
            booking?.id,
            "—"
        );


    modalShipmentId.textContent =
        shipmentId;


    const driverName =
        getCurrentDriverName();


    const driverId =
        getCurrentDriverId();


    modalContent.innerHTML = `

        <div class="modal-detail-grid">

            <div class="modal-detail">

                <span>
                    Customer
                </span>

                <strong>
                    ${escapeHTML(
                        getCustomerName(
                            booking
                        )
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Phone
                </span>

                <strong>
                    ${escapeHTML(
                        getCustomerPhone(
                            booking
                        ) || "—"
                    )}
                </strong>

            </div>


            <div class="modal-detail full">

                <span>
                    Pickup Address
                </span>

                <strong>
                    ${escapeHTML(
                        getPickupLocation(
                            booking
                        )
                    )}
                </strong>

            </div>


            <div class="modal-detail full">

                <span>
                    Delivery Address
                </span>

                <strong>
                    ${escapeHTML(
                        getDeliveryLocation(
                            booking
                        )
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Pickup City
                </span>

                <strong>
                    ${escapeHTML(
                        booking?.pickup_city ||
                        "—"
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Delivery City
                </span>

                <strong>
                    ${escapeHTML(
                        booking?.delivery_city ||
                        "—"
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Status
                </span>

                <strong>
                    ${escapeHTML(
                        getStatusLabel(
                            booking
                        )
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Schedule
                </span>

                <strong>
                    ${escapeHTML(
                        getBookingDateTime(
                            booking
                        )
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Parcel
                </span>

                <strong>
                    ${escapeHTML(
                        getParcelType(
                            booking
                        )
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Pieces
                </span>

                <strong>
                    ${escapeHTML(
                        getPieces(
                            booking
                        )
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Weight
                </span>

                <strong>
                    ${escapeHTML(
                        getWeight(
                            booking
                        )
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Service Type
                </span>

                <strong>
                    ${escapeHTML(
                        booking?.service_type ||
                        "—"
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Receiver
                </span>

                <strong>
                    ${escapeHTML(
                        booking?.receiver_name ||
                        "—"
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Receiver Phone
                </span>

                <strong>
                    ${escapeHTML(
                        booking?.receiver_phone ||
                        "—"
                    )}
                </strong>

            </div>


            <div class="modal-detail full">

                <span>
                    Special Instructions
                </span>

                <strong>
                    ${escapeHTML(
                        booking?.special_instructions ||
                        "—"
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Driver
                </span>

                <strong>
                    ${escapeHTML(
                        driverName
                    )}
                </strong>

            </div>


            <div class="modal-detail">

                <span>
                    Driver ID
                </span>

                <strong>
                    ${escapeHTML(
                        driverId
                    )}
                </strong>

            </div>

        </div>

    `;


    shipmentModal.classList.remove(
        "hidden"
    );


    shipmentModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";
}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeShipmentModal() {

    shipmentModal.classList.add(
        "hidden"
    );


    shipmentModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";


    selectedBooking =
        null;
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {

    if (!toast || !toastMessage) {

        return;
    }


    toastMessage.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2200
        );
}


/* =========================================================
   REFRESH
   ========================================================= */

async function refreshShipments(
    showMessage = true
) {

    try {

        if (!currentDriver) {

            currentDriver =
                await window.driverAuth
                    .getCurrentDriver();
        }


        await loadAllBookings();

        renderDriver();

        updateFilterCounts();

        applyFilters();


        /*
           Update notification count
           after refresh.
        */

        updateNotificationBadge();


        if (showMessage) {

            showToast(
                "Shipments refreshed"
            );
        }

    } catch (error) {

        console.error(
            "Unable to refresh shipments:",
            error
        );


        showToast(
            "Unable to refresh shipments"
        );
    }
}


/* =========================================================
   NOTIFICATION BADGE
   ========================================================= */

function updateNotificationBadge() {

    if (!notificationBadge) {

        return;
    }


    const pendingCount =
        driverBookings.filter(
            booking => {

                const status =
                    normalizeStatus(
                        booking
                    );


                return (
                    status === "pending" ||
                    status === "assigned" ||
                    status === "pickup"
                );
            }
        ).length;


    notificationBadge.textContent =
        pendingCount > 99
            ? "99+"
            : String(
                pendingCount
            );
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function openSidebar() {

    sidebar.classList.add(
        "open"
    );


    sidebarOverlay.classList.add(
        "visible"
    );


    sidebarOverlay.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";
}


function closeSidebar() {

    sidebar.classList.remove(
        "open"
    );


    sidebarOverlay.classList.remove(
        "visible"
    );


    sidebarOverlay.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";
}


/* =========================================================
   FILTER CLICK
   ========================================================= */

function handleFilterClick(event) {

    const button =
        event.target.closest(
            ".filter-chip"
        );


    if (!button) {

        return;
    }


    currentFilter =
        button.dataset.filter ||
        "all";


    document
        .querySelectorAll(
            ".filter-chip"
        )
        .forEach(
            chip =>
                chip.classList.remove(
                    "active"
                )
        );


    button.classList.add(
        "active"
    );


    applyFilters();
}


/* =========================================================
   SEARCH
   ========================================================= */

function handleSearch() {

    currentSearch =
        searchInput.value.trim();


    clearSearch.style.display =
        currentSearch
            ? "grid"
            : "none";


    applyFilters();
}


/* =========================================================
   CLEAR SEARCH
   ========================================================= */

function clearSearchInput() {

    searchInput.value =
        "";


    currentSearch =
        "";


    clearSearch.style.display =
        "none";


    applyFilters();
}


/* =========================================================
   CLEAR FILTER
   ========================================================= */

function resetFilters() {

    currentFilter =
        "all";


    currentSearch =
        "";


    searchInput.value =
        "";


    clearSearch.style.display =
        "none";


    sortSelect.value =
        "latest";


    currentSort =
        "latest";


    document
        .querySelectorAll(
            ".filter-chip"
        )
        .forEach(
            chip => {

                chip.classList.toggle(
                    "active",
                    chip.dataset.filter ===
                        "all"
                );

            }
        );


    applyFilters();
}


/* =========================================================
   EVENTS
   ========================================================= */

if (sidebarToggle) {

    sidebarToggle.addEventListener(
        "click",
        openSidebar
    );
}


if (sidebarClose) {

    sidebarClose.addEventListener(
        "click",
        closeSidebar
    );
}


if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        closeSidebar
    );
}


if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        () => {
            refreshShipments(
                true
            );
        }
    );
}


if (refreshInline) {

    refreshInline.addEventListener(
        "click",
        () => {
            refreshShipments(
                true
            );
        }
    );
}


if (filterChips) {

    filterChips.addEventListener(
        "click",
        handleFilterClick
    );
}


if (searchInput) {

    searchInput.addEventListener(
        "input",
        handleSearch
    );
}


if (clearSearch) {

    clearSearch.addEventListener(
        "click",
        clearSearchInput
    );
}


if (sortSelect) {

    sortSelect.addEventListener(
        "change",
        () => {

            currentSort =
                sortSelect.value;

            applyFilters();
        }
    );
}


if (clearFilters) {

    clearFilters.addEventListener(
        "click",
        resetFilters
    );
}


if (emptyReset) {

    emptyReset.addEventListener(
        "click",
        resetFilters
    );
}


/* =========================================================
   SHIPMENT CARD EVENTS
   ========================================================= */

if (shipmentList) {

    shipmentList.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action='view']"
                );


            if (!button) {

                return;
            }


            const id =
                button.dataset.id;


            const booking =
                findDriverBooking(
                    id
                );


            openShipmentModal(
                booking
            );
        }
    );
}


/* =========================================================
   MODAL EVENTS
   ========================================================= */

if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeShipmentModal
    );
}


if (modalCloseButton) {

    modalCloseButton.addEventListener(
        "click",
        closeShipmentModal
    );
}


if (modalBackdrop) {

    modalBackdrop.addEventListener(
        "click",
        closeShipmentModal
    );
}


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            if (
                shipmentModal &&
                !shipmentModal.classList.contains(
                    "hidden"
                )
            ) {

                closeShipmentModal();
            }


            if (
                sidebar &&
                sidebar.classList.contains(
                    "open"
                )
            ) {

                closeSidebar();
            }
        }
    }
);


/* =========================================================
   LOGOUT
   ========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                if (
                    window.driverAuth &&
                    typeof window.driverAuth.signOut ===
                        "function"
                ) {

                    await window.driverAuth.signOut();

                } else if (
                    window.supabaseClient
                ) {

                    await window.supabaseClient
                        .auth
                        .signOut();
                }

            } catch (error) {

                console.error(
                    "Driver logout error:",
                    error
                );

            } finally {

                window.location.href =
                    "../index.html";
            }
        }
    );
}


/* =========================================================
   NOTIFICATION
   ========================================================= */

const notificationButton =
    $("notificationButton");


if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        () => {

            if (
                driverBookings.length === 0
            ) {

                showToast(
                    "No shipment notifications"
                );

                return;
            }


            const pendingCount =
                driverBookings.filter(
                    booking => {

                        const status =
                            normalizeStatus(
                                booking
                            );


                        return (
                            status === "pending" ||
                            status === "assigned" ||
                            status === "pickup"
                        );
                    }
                ).length;


            if (
                pendingCount === 0
            ) {

                showToast(
                    "No new notifications"
                );

            } else {

                showToast(
                    `${pendingCount} shipment ${
                        pendingCount === 1
                            ? "needs"
                            : "need"
                    } attention`
                );
            }
        }
    );
}


/* =========================================================
   PROFILE
   ========================================================= */

const profileButton =
    $("profileButton");


if (profileButton) {

    profileButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "profile.html";
        }
    );
}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

function setupAuthStateListener() {

    if (
        !window.supabaseClient
    ) {

        return;
    }


    window.supabaseClient.auth
        .onAuthStateChange(
            async (
                event,
                session
            ) => {

                /*
                   If driver signs out,
                   return to login.
                */

                if (
                    event ===
                    "SIGNED_OUT"
                ) {

                    window.location.href =
                        "../index.html";

                    return;
                }


                /*
                   If a new session appears,
                   reload the driver information.
                */

                if (
                    event ===
                    "SIGNED_IN"
                ) {

                    try {

                        currentDriver =
                            await window.driverAuth
                                .getCurrentDriver();


                        await refreshShipments(
                            false
                        );

                    } catch (error) {

                        console.error(
                            "Unable to refresh after sign in:",
                            error
                        );
                    }
                }
            }
        );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeShipmentsPage() {

    /*
       Authentication must happen before
       loading shipments.
    */

    if (
        !window.supabaseClient
    ) {

        console.error(
            "Supabase client is missing."
        );

        showToast(
            "Supabase connection is unavailable"
        );

        return;
    }


    if (
        !window.driverAuth
    ) {

        console.error(
            "Driver authentication module is missing."
        );

        showToast(
            "Driver authentication is unavailable"
        );

        return;
    }


    try {

        /*
           Get the authenticated driver.
        */

        currentDriver =
            await window.driverAuth
                .getCurrentDriver();


        if (
            !currentDriver
        ) {

            console.warn(
                "No authenticated driver."
            );

            window.location.href =
                "../index.html";

            return;
        }


        /*
           Load only this driver's
           bookings.
        */

        await loadAllBookings();


        /*
           Render driver information.
        */

        renderDriver();


        /*
           Update filter counters.
        */

        updateFilterCounts();


        /*
           Apply initial filters.
        */

        applyFilters();


        /*
           Notification badge.
        */

        updateNotificationBadge();


        /*
           Listen for auth changes.
        */

        setupAuthStateListener();


    } catch (error) {

        console.error(
            "Unable to initialize Shipments page:",
            error
        );


        shipmentList.innerHTML =
            "";


        emptyState.classList.remove(
            "hidden"
        );


        emptyMessage.textContent =
            "Unable to load your shipments. Please refresh the page and try again.";


        if (resultCount) {

            resultCount.textContent =
                "0 shipments";
        }


        /*
           Do not automatically redirect
           for a normal database/query error.

           This allows the real error to be
           inspected instead of hiding it.
        */

        showToast(
            "Unable to load shipments"
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
        initializeShipmentsPage
    );

} else {

    initializeShipmentsPage();
}