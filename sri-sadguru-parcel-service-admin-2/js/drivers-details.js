"use strict";

/* =========================================================
   SRI SADGURU PARCEL SERVICE
   ADMIN PORTAL — DRIVER DETAILS

   DATABASE:
       Supabase

   TABLES:
       public.drivers
       public.vehicles
       public.bookings

   IMPORTANT:
       - No localStorage
       - No demo driver data
       - Uses existing driver.driver_id
       - Does NOT generate a Driver ID
       - Does NOT change Driver ID format
       - Booking relationship:
             bookings.driver_id = drivers.id
========================================================= */


/* =========================================================
   SUPABASE CLIENT
========================================================= */

const supabaseClient = window.supabaseClient;

if (!supabaseClient) {

    console.error(
        "Supabase client is not available."
    );

}


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

const sidebarOverlay =
    $("sidebarOverlay");

const refreshButton =
    $("refreshButton");

const backButton =
    $("backButton");

const editDriverButton =
    $("editDriverButton");

const driverAvatar =
    $("driverAvatar");

const driverName =
    $("driverName");

const driverId =
    $("driverId");

const driverStatus =
    $("driverStatus");

const profileLocation =
    $("profileLocation");

const infoName =
    $("infoName");

const infoId =
    $("infoId");

const infoPhone =
    $("infoPhone");

const infoEmail =
    $("infoEmail");

const infoAddress =
    $("infoAddress");

const infoJoiningDate =
    $("infoJoiningDate");

const infoVehicleAssigned =
    $("infoVehicleAssigned");

const infoVehicleNumber =
    $("infoVehicleNumber");

const infoVehicleType =
    $("infoVehicleType");

const infoVehicleStatus =
    $("infoVehicleStatus");

const locationStatus =
    $("locationStatus");

const locationName =
    $("locationName");

const locationUpdated =
    $("locationUpdated");

const locationLiveDot =
    $("locationLiveDot");

const currentAssignment =
    $("currentAssignment");

const activityList =
    $("activityList");

const historyBody =
    $("historyBody");

const mobileHistory =
    $("mobileHistory");


/* =========================================================
   EDIT MODAL
========================================================= */

const editModal =
    $("editModal");

const modalBackdrop =
    $("modalBackdrop");

const closeModal =
    $("closeModal");

const cancelEdit =
    $("cancelEdit");

const editDriverForm =
    $("editDriverForm");

const editName =
    $("editName");

const editPhone =
    $("editPhone");

const editEmail =
    $("editEmail");

const editStatus =
    $("editStatus");

const editVehicleAssigned =
    $("editVehicleAssigned");

const editVehicleNumber =
    $("editVehicleNumber");

const editVehicleType =
    $("editVehicleType");

const editJoiningDate =
    $("editJoiningDate");

const editAddress =
    $("editAddress");

const toast =
    $("toast");


/* =========================================================
   URL
========================================================= */

const params =
    new URLSearchParams(
        window.location.search
    );

let selectedDriverIdentifier =
    params.get("id");


/* =========================================================
   STATE
========================================================= */

let selectedDriver = null;

let selectedVehicle = null;

let allBookings = [];

let bookingsLoadError = false;


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
   SUPABASE ERROR HELPER
========================================================= */

function handleSupabaseError(
    error,
    message
) {

    console.error(
        message,
        error
    );

    showToast(
        message
    );

}


/* =========================================================
   DRIVER STATUS
========================================================= */

/*
   Database values:

       active
       inactive
       suspended
       pending

   Existing UI uses:

       Available
       Assigned
       On Delivery
       Offline
*/

function getDatabaseStatus(
    value
) {

    const status =
        String(
            value || ""
        )
            .trim()
            .toLowerCase();

    if (
        status === "active"
    ) {
        return "active";
    }

    if (
        status === "inactive"
    ) {
        return "inactive";
    }

    if (
        status === "suspended"
    ) {
        return "suspended";
    }

    if (
        status === "pending"
    ) {
        return "pending";
    }

    return "active";

}


/* =========================================================
   DISPLAY DRIVER STATUS
========================================================= */

function getDisplayStatus(
    driver
) {

    if (!driver) {
        return "Offline";
    }


    const databaseStatus =
        getDatabaseStatus(
            driver.status
        );


    if (
        databaseStatus !== "active"
    ) {

        return "Offline";

    }


    /*
       Determine active assignment
       from actual bookings.
    */

    const driverBookings =
        getDriverBookings(
            driver
        );


    const activeBooking =
        driverBookings.find(
            booking =>
                isActiveBookingStatus(
                    booking.status
                )
        );


    if (activeBooking) {

        if (
            [
                "out_for_delivery",
                "in_transit",
                "pickup_started",
                "picked_up"
            ].includes(
                String(
                    activeBooking.status || ""
                ).toLowerCase()
            )
        ) {

            return "On Delivery";

        }


        return "Assigned";

    }


    return "Available";

}


/* =========================================================
   STATUS CSS
========================================================= */

function statusClass(
    status
) {

    const value =
        String(
            status || ""
        ).toLowerCase();


    if (
        value.includes(
            "available"
        )
    ) {

        return "status-available";

    }


    if (
        value.includes(
            "assigned"
        )
    ) {

        return "status-assigned";

    }


    if (
        value.includes(
            "delivery"
        )
    ) {

        return "status-delivery";

    }


    if (
        value.includes(
            "offline"
        )
    ) {

        return "status-offline";

    }


    return "";

}


/* =========================================================
   BOOKING STATUS
========================================================= */

function isActiveBookingStatus(
    status
) {

    const value =
        String(
            status || ""
        )
            .trim()
            .toLowerCase();


    return [
        "assigned",
        "pickup_started",
        "picked_up",
        "in_transit",
        "out_for_delivery"
    ].includes(
        value
    );

}


/* =========================================================
   BOOKING STATUS DISPLAY
========================================================= */

function getBookingStatusLabel(
    status
) {

    const value =
        String(
            status || ""
        )
            .trim()
            .toLowerCase();


    const labels = {

        pending:
            "Pending",

        confirmed:
            "Confirmed",

        assigned:
            "Assigned",

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
        labels[value] ||
        status ||
        "—"
    );

}


/* =========================================================
   INITIALS
========================================================= */

function initials(
    name
) {

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


    if (
        parts.length === 1
    ) {

        return parts[0]
            .slice(0, 2)
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[
            parts.length - 1
        ][0]
    ).toUpperCase();

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

        return String(
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
   DATE INPUT FORMAT
========================================================= */

function toInputDate(
    value
) {

    if (!value) {
        return "";
    }


    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            String(value)
        )
    ) {

        return String(value);

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return [
        date.getFullYear(),
        String(
            date.getMonth() + 1
        ).padStart(2, "0"),
        String(
            date.getDate()
        ).padStart(2, "0")
    ].join("-");

}


/* =========================================================
   DRIVER NAME
========================================================= */

function getDriverName(
    driver
) {

    return (
        driver?.name ||
        "Unnamed Driver"
    );

}


/* =========================================================
   DRIVER ID
========================================================= */

function getDriverID(
    driver
) {

    /*
       IMPORTANT:

       This uses the existing database
       driver_id exactly as stored.

       No generation.
       No formatting.
       No conversion.
    */

    return (
        driver?.driver_id ||
        "—"
    );

}


/* =========================================================
   DRIVER PHONE
========================================================= */

function getDriverPhone(
    driver
) {

    return (
        driver?.phone ||
        "—"
    );

}


/* =========================================================
   DRIVER ADDRESS
========================================================= */

function getDriverAddress(
    driver
) {

    const parts = [];

    if (
        driver?.address_line1
    ) {
        parts.push(
            driver.address_line1
        );
    }

    if (
        driver?.address_line2
    ) {
        parts.push(
            driver.address_line2
        );
    }

    if (
        driver?.city
    ) {
        parts.push(
            driver.city
        );
    }

    if (
        driver?.state
    ) {
        parts.push(
            driver.state
        );
    }

    if (
        driver?.pin_code
    ) {
        parts.push(
            driver.pin_code
        );
    }


    return (
        parts.join(", ") ||
        "—"
    );

}


/* =========================================================
   VEHICLE ASSIGNMENT
========================================================= */

function getVehicleDisplayName(
    vehicle
) {

    if (!vehicle) {
        return "Not Assigned";
    }


    return (
        vehicle.vehicle_id ||
        vehicle.vehicle_number ||
        "Assigned"
    );

}


/* =========================================================
   LOAD DRIVER
========================================================= */

async function loadDriver() {

    if (!supabaseClient) {
        return null;
    }


    if (
        !selectedDriverIdentifier
    ) {

        showToast(
            "Driver ID is missing."
        );

        return null;

    }


    /*
       First try the SSP Driver ID.

       This is the normal URL:
       drivers-details.html?id=<driver_id>
    */

    let result =
        await supabaseClient
            .from("drivers")
            .select("*")
            .eq(
                "driver_id",
                selectedDriverIdentifier
            )
            .maybeSingle();


    if (
        result.error
    ) {

        handleSupabaseError(
            result.error,
            "Unable to load driver details."
        );

        return null;

    }


    /*
       Fallback:
       allow UUID because older links
       may use the database id.
    */

    if (
        !result.data &&
        isUUID(
            selectedDriverIdentifier
        )
    ) {

        result =
            await supabaseClient
                .from("drivers")
                .select("*")
                .eq(
                    "id",
                    selectedDriverIdentifier
                )
                .maybeSingle();


        if (
            result.error
        ) {

            handleSupabaseError(
                result.error,
                "Unable to load driver details."
            );

            return null;

        }

    }


    if (!result.data) {

        showToast(
            "Driver could not be found."
        );

        return null;

    }


    return result.data;

}


/* =========================================================
   UUID CHECK
========================================================= */

function isUUID(
    value
) {

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(
            String(value || "")
        );

}


/* =========================================================
   LOAD VEHICLE
========================================================= */

async function loadVehicle(
    driver
) {

    selectedVehicle = null;


    if (
        !driver ||
        !driver.id
    ) {

        return null;

    }


    const result =
        await supabaseClient
            .from("vehicles")
            .select("*")
            .eq(
                "assigned_driver_id",
                driver.id
            )
            .maybeSingle();


    if (
        result.error
    ) {

        console.error(
            "Unable to load assigned vehicle:",
            result.error
        );

        return null;

    }


    selectedVehicle =
        result.data || null;


    return selectedVehicle;

}


/* =========================================================
   LOAD DRIVER BOOKINGS
========================================================= */

async function loadBookings() {

    allBookings = [];
    bookingsLoadError = false;


    if (
        !selectedDriver ||
        !selectedDriver.id
    ) {

        return [];

    }


    const result =
        await supabaseClient
            .from("bookings")
            .select("*")
            .eq(
                "driver_id",
                selectedDriver.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (
        result.error
    ) {

        bookingsLoadError = true;

        handleSupabaseError(
            result.error,
            "Unable to load driver booking history."
        );

        return [];

    }


    allBookings =
        result.data || [];


    return allBookings;

}


/* =========================================================
   DRIVER BOOKINGS
========================================================= */

function getDriverBookings() {

    return allBookings;

}


/* =========================================================
   BOOKING DATE/TIME
========================================================= */

function getBookingDateTime(
    booking
) {

    if (
        booking?.booking_date &&
        booking?.booking_time
    ) {

        return (
            formatDate(
                booking.booking_date
            ) +
            " " +
            String(
                booking.booking_time
            ).slice(0, 5)
        );

    }


    if (
        booking?.booking_date
    ) {

        return formatDate(
            booking.booking_date
        );

    }


    if (
        booking?.created_at
    ) {

        return formatDate(
            booking.created_at
        );

    }


    return "—";

}


/* =========================================================
   BOOKING TIMESTAMP
========================================================= */

function getBookingTimestamp(
    booking
) {

    const value =
        booking?.created_at ||
        booking?.booking_date ||
        "";


    const timestamp =
        new Date(
            value
        ).getTime();


    return Number.isNaN(
        timestamp
    )
        ? 0
        : timestamp;

}


/* =========================================================
   CURRENT BOOKING
========================================================= */

function getCurrentBooking() {

    return (
        allBookings
            .slice()
            .sort(
                (
                    a,
                    b
                ) =>
                    getBookingTimestamp(b) -
                    getBookingTimestamp(a)
            )
            .find(
                booking =>
                    isActiveBookingStatus(
                        booking.status
                    )
            ) ||
        null
    );

}


/* =========================================================
   RENDER PROFILE
========================================================= */

function renderProfile() {

    if (!selectedDriver) {
        return;
    }


    const name =
        getDriverName(
            selectedDriver
        );


    const id =
        getDriverID(
            selectedDriver
        );


    const displayStatus =
        getDisplayStatus(
            selectedDriver
        );


    const address =
        getDriverAddress(
            selectedDriver
        );


    /*
       Avatar
    */

    if (
        selectedDriver.photo_url
    ) {

        driverAvatar.innerHTML = `
            <img
                src="${escapeHTML(
                    selectedDriver.photo_url
                )}"
                alt="${escapeHTML(
                    name
                )}"
            >
        `;

    } else {

        driverAvatar.textContent =
            initials(
                name
            );

    }


    /*
       Header
    */

    driverName.textContent =
        name;


    driverId.textContent =
        id;


    driverStatus.textContent =
        displayStatus;


    driverStatus.className =
        "status-badge " +
        statusClass(
            displayStatus
        );


    /*
       Current location.

       There is currently no dedicated
       driver GPS field in drivers table.

       Therefore do NOT invent a location.
    */

    profileLocation.innerHTML = `
        <span>⌖</span>
        Location not updated
    `;


    /*
       Personal information
    */

    infoName.textContent =
        name;


    infoId.textContent =
        id;


    infoPhone.textContent =
        getDriverPhone(
            selectedDriver
        );


    infoEmail.textContent =
        selectedDriver.email ||
        "—";


    infoAddress.textContent =
        address;


    infoJoiningDate.textContent =
        formatDate(
            selectedDriver.joining_date
        );


    /*
       Vehicle
    */

    if (selectedVehicle) {

        infoVehicleAssigned.textContent =
            getVehicleDisplayName(
                selectedVehicle
            );


        infoVehicleNumber.textContent =
            selectedVehicle.vehicle_number ||
            "—";


        infoVehicleType.textContent =
            selectedVehicle.custom_vehicle_type ||
            selectedVehicle.vehicle_type ||
            "—";


        infoVehicleStatus.textContent =
            formatVehicleStatus(
                selectedVehicle.vehicle_status
            );

    } else {

        infoVehicleAssigned.textContent =
            "Not Assigned";


        infoVehicleNumber.textContent =
            "—";


        infoVehicleType.textContent =
            "—";


        infoVehicleStatus.textContent =
            "—";

    }


    /*
       Location section
    */

    locationStatus.textContent =
        "Location not updated";


    locationName.textContent =
        "Location not available";


    locationUpdated.textContent =
        "Last updated: —";


    locationLiveDot.classList.remove(
        "live"
    );

}


/* =========================================================
   VEHICLE STATUS
========================================================= */

function formatVehicleStatus(
    value
) {

    const status =
        String(
            value || ""
        )
            .toLowerCase();


    const labels = {

        available:
            "Available",

        assigned:
            "Assigned",

        inactive:
            "Inactive",

        maintenance:
            "Maintenance"

    };


    return (
        labels[status] ||
        value ||
        "—"
    );

}


/* =========================================================
   CURRENT ASSIGNMENT
========================================================= */

function renderCurrentAssignment() {

    const booking =
        getCurrentBooking();


    if (!booking) {

        currentAssignment.innerHTML = `
            <div class="no-assignment">

                <span>✓</span>

                <div>

                    <strong>
                        No active booking
                    </strong>

                    <p>
                        This driver currently has no active assignment.
                    </p>

                </div>

            </div>
        `;

        return;

    }


    const routeFrom =
        booking.pickup_address ||
        [
            booking.pickup_city
        ]
            .filter(Boolean)
            .join(", ") ||
        "—";


    const routeTo =
        booking.delivery_address ||
        [
            booking.delivery_city,
            booking.delivery_district
        ]
            .filter(Boolean)
            .join(", ") ||
        "—";


    const customer =
        booking.pickup_name ||
        "—";


    const status =
        getBookingStatusLabel(
            booking.status
        );


    currentAssignment.innerHTML = `

        <div class="assignment-box">

            <div class="assignment-header">

                <strong>
                    ${escapeHTML(
                        booking.booking_id
                    )}
                </strong>

                <span
                    class="status-badge ${statusClass(
                        status
                    )}"
                >
                    ${escapeHTML(
                        status
                    )}
                </span>

            </div>


            <div class="assignment-body">

                <div class="assignment-route">

                    ${escapeHTML(
                        routeFrom
                    )}

                    <span>→</span>

                    ${escapeHTML(
                        routeTo
                    )}

                </div>


                <div class="assignment-customer">

                    Customer:
                    ${escapeHTML(
                        customer
                    )}

                </div>


                <div class="assignment-actions">

                    <button
                        type="button"
                        class="small-button"
                        data-booking-id="${escapeHTML(
                            booking.id
                        )}"
                        data-action="booking"
                    >
                        View Booking
                    </button>


                    <button
                        type="button"
                        class="small-button"
                        data-booking-id="${escapeHTML(
                            booking.id
                        )}"
                        data-action="tracking"
                    >
                        Tracking
                    </button>

                </div>

            </div>

        </div>
    `;

}


/* =========================================================
   ACTIVITY
========================================================= */

function renderActivity() {

    const activities = [];


    if (
        selectedDriver?.created_at
    ) {

        activities.push({

            title:
                "Driver profile created",

            description:
                "Driver was added to the driver system.",

            time:
                selectedDriver.created_at

        });

    }


    allBookings
        .slice()
        .sort(
            (
                a,
                b
            ) =>
                getBookingTimestamp(b) -
                getBookingTimestamp(a)
        )
        .slice(0, 5)
        .forEach(
            booking => {

                activities.push({

                    title:
                        getBookingStatusLabel(
                            booking.status
                        ),

                    description:
                        "Booking " +
                        booking.booking_id +
                        " is associated with this driver.",

                    time:
                        booking.updated_at ||
                        booking.created_at

                });

            }
        );


    if (!activities.length) {

        activityList.innerHTML = `
            <div class="activity-item">

                <div class="activity-dot"></div>

                <div class="activity-content">

                    <strong>
                        No activity available
                    </strong>

                    <p>
                        There is no recorded driver activity yet.
                    </p>

                </div>

            </div>
        `;

        return;

    }


    activityList.innerHTML =
        activities
            .map(
                activity => `

                    <div class="activity-item">

                        <div class="activity-dot"></div>

                        <div class="activity-content">

                            <strong>
                                ${escapeHTML(
                                    activity.title
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    activity.description
                                )}
                            </p>

                            <span class="activity-time">
                                ${escapeHTML(
                                    formatDateTime(
                                        activity.time
                                    )
                                )}
                            </span>

                        </div>

                    </div>

                `
            )
            .join("");

}


/* =========================================================
   DATE + TIME
========================================================= */

function formatDateTime(
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

        return String(
            value
        );

    }


    return date.toLocaleString(
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


/* =========================================================
   HISTORY
========================================================= */

function renderHistory() {

    if (!allBookings.length) {
        const emptyMessage = bookingsLoadError
            ? "Booking history could not be loaded. Please refresh and try again."
            : "No booking history available.";

        historyBody.innerHTML = `
            <tr>

                <td
                    colspan="6"
                    style="
                        text-align:center;
                        color:#8792a4;
                        padding:25px
                    "
                >
                    ${emptyMessage}
                </td>

            </tr>
        `;


        mobileHistory.innerHTML = `
            <div class="history-mobile-card">

                <div
                    style="
                        text-align:center;
                        color:#8792a4;
                        font-size:10px;
                        padding:10px;
                    "
                >
                    ${emptyMessage}
                </div>

            </div>
        `;

        return;

    }


    const sorted =
        allBookings
            .slice()
            .sort(
                (
                    a,
                    b
                ) =>
                    getBookingTimestamp(b) -
                    getBookingTimestamp(a)
            );


    /*
       Desktop
    */

    historyBody.innerHTML =
        sorted
            .map(
                booking => {

                    const routeFrom =
                        booking.pickup_address ||
                        booking.pickup_city ||
                        "—";


                    const routeTo =
                        booking.delivery_address ||
                        booking.delivery_city ||
                        "—";


                    const payment =
                        booking.payment_method ||
                        "—";


                    const status =
                        getBookingStatusLabel(
                            booking.status
                        );


                    return `

                        <tr>

                            <td>

                                <span class="history-id">

                                    ${escapeHTML(
                                        booking.booking_id
                                    )}

                                </span>

                            </td>


                            <td>
                                ${escapeHTML(
                                    getBookingDateTime(
                                        booking
                                    )
                                )}
                            </td>


                            <td>

                                <span class="history-route">

                                    ${escapeHTML(
                                        routeFrom
                                    )}

                                    →

                                    ${escapeHTML(
                                        routeTo
                                    )}

                                </span>

                            </td>


                            <td>

                                <span
                                    class="status-badge ${statusClass(
                                        status
                                    )}"
                                >
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>

                            </td>


                            <td>
                                ${escapeHTML(
                                    payment
                                )}
                            </td>


                            <td>

                                <button
                                    type="button"
                                    class="history-action"
                                    data-booking-id="${escapeHTML(
                                        booking.id
                                    )}"
                                    data-action="booking"
                                    title="View booking"
                                >
                                    👁
                                </button>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    /*
       Mobile
    */

    mobileHistory.innerHTML =
        sorted
            .map(
                booking => {

                    const routeFrom =
                        booking.pickup_address ||
                        booking.pickup_city ||
                        "—";


                    const routeTo =
                        booking.delivery_address ||
                        booking.delivery_city ||
                        "—";


                    const payment =
                        booking.payment_method ||
                        "—";


                    const status =
                        getBookingStatusLabel(
                            booking.status
                        );


                    return `

                        <article
                            class="history-mobile-card"
                        >

                            <div class="history-mobile-top">

                                <div>

                                    <div class="history-mobile-id">

                                        ${escapeHTML(
                                            booking.booking_id
                                        )}

                                    </div>

                                    <div class="history-mobile-date">

                                        ${escapeHTML(
                                            getBookingDateTime(
                                                booking
                                            )
                                        )}

                                    </div>

                                </div>


                                <span
                                    class="status-badge ${statusClass(
                                        status
                                    )}"
                                >
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>

                            </div>


                            <div class="history-mobile-route">

                                ${escapeHTML(
                                    routeFrom
                                )}

                                →

                                ${escapeHTML(
                                    routeTo
                                )}

                            </div>


                            <div class="history-mobile-payment">

                                Payment:
                                ${escapeHTML(
                                    payment
                                )}

                            </div>


                            <button
                                type="button"
                                class="small-button history-mobile-action"
                                data-booking-id="${escapeHTML(
                                    booking.id
                                )}"
                                data-action="booking"
                            >
                                View Booking Details
                            </button>

                        </article>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   OPEN EDIT MODAL
========================================================= */

async function openEditModal() {

    if (!selectedDriver) {
        return;
    }


    editName.value =
        selectedDriver.name ||
        "";


    editPhone.value =
        selectedDriver.phone ||
        "";


    editEmail.value =
        selectedDriver.email ||
        "";


    /*
       Keep database status internally.

       Existing select uses UI labels.
    */

    const databaseStatus =
        getDatabaseStatus(
            selectedDriver.status
        );


    if (
        databaseStatus === "active"
    ) {

        editStatus.value =
            getDisplayStatus(
                selectedDriver
            ) === "Offline"
                ? "Offline"
                : getDisplayStatus(
                    selectedDriver
                );

    } else {

        editStatus.value =
            "Offline";

    }


    /*
       Vehicle
    */

    await populateVehicleOptions();


    if (selectedVehicle) {

        selectVehicleOption(
            selectedVehicle
        );

    } else {

        editVehicleAssigned.value =
            "";

        editVehicleNumber.value =
            "";

        editVehicleType.value =
            "";

    }


    editJoiningDate.value =
        toInputDate(
            selectedDriver.joining_date
        );


    editAddress.value =
        getDriverAddress(
            selectedDriver
        ) === "—"
            ? ""
            : getDriverAddress(
                selectedDriver
            );


    editModal.classList.add(
        "open"
    );

    editModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   POPULATE VEHICLE OPTIONS
========================================================= */

async function populateVehicleOptions() {

    if (
        !editVehicleAssigned ||
        !supabaseClient
    ) {

        return;

    }


    const result =
        await supabaseClient
            .from("vehicles")
            .select(
                "id, vehicle_id, vehicle_number, vehicle_type, custom_vehicle_type, assigned_driver_id, vehicle_status"
            )
            .order(
                "vehicle_id",
                {
                    ascending: true
                }
            );


    if (
        result.error
    ) {

        console.error(
            "Unable to load vehicles:",
            result.error
        );

        return;

    }


    const vehicles =
        result.data || [];


    const currentValue =
        selectedVehicle?.vehicle_id ||
        "";


    editVehicleAssigned.innerHTML = `

        <option value="">
            Not Assigned
        </option>

        ${vehicles
            .map(
                vehicle => `
                    <option
                        value="${escapeHTML(
                            vehicle.vehicle_id
                        )}"
                        data-vehicle-id="${escapeHTML(
                            vehicle.id
                        )}"
                        data-vehicle-number="${escapeHTML(
                            vehicle.vehicle_number
                        )}"
                        data-vehicle-type="${escapeHTML(
                            vehicle.custom_vehicle_type ||
                            vehicle.vehicle_type ||
                            ""
                        )}"
                    >
                        ${escapeHTML(
                            vehicle.vehicle_id
                        )}
                    </option>
                `
            )
            .join("")}

    `;


    if (currentValue) {

        editVehicleAssigned.value =
            currentValue;

    }

}


/* =========================================================
   SELECT VEHICLE
========================================================= */

function selectVehicleOption(
    vehicle
) {

    if (!vehicle) {
        return;
    }


    editVehicleAssigned.value =
        vehicle.vehicle_id ||
        "";


    editVehicleNumber.value =
        vehicle.vehicle_number ||
        "";


    editVehicleType.value =
        vehicle.custom_vehicle_type ||
        vehicle.vehicle_type ||
        "";

}


/* =========================================================
   VEHICLE SELECT CHANGE
========================================================= */

function handleVehicleSelection() {

    const selectedOption =
        editVehicleAssigned
            .selectedOptions[0];


    if (
        !selectedOption ||
        !selectedOption.value
    ) {

        editVehicleNumber.value =
            "";

        editVehicleType.value =
            "";

        return;

    }


    editVehicleNumber.value =
        selectedOption.dataset
            .vehicleNumber ||
        "";


    editVehicleType.value =
        selectedOption.dataset
            .vehicleType ||
        "";

}


/* =========================================================
   CLOSE EDIT MODAL
========================================================= */

function closeEditModal() {

    editModal.classList.remove(
        "open"
    );

    editModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";

}


/* =========================================================
   CONVERT UI STATUS TO DATABASE STATUS
========================================================= */

function getDatabaseStatusFromUI(
    value
) {

    const status =
        String(
            value || ""
        )
            .trim()
            .toLowerCase();


    /*
       "Available", "Assigned",
       "On Delivery" all mean the
       driver account itself is active.

       Assignment is determined by
       bookings.driver_id.
    */

    if (
        status === "offline"
    ) {

        return "inactive";

    }


    return "active";

}


/* =========================================================
   SAVE DRIVER EDIT
========================================================= */

async function saveDriverEdit() {

    if (!selectedDriver) {
        return false;
    }


    if (!supabaseClient) {

        showToast(
            "Supabase client is not available."
        );

        return false;

    }


    const name =
        editName.value.trim();


    const phone =
        editPhone.value.trim();


    const email =
        editEmail.value.trim();


    const joiningDate =
        editJoiningDate.value ||
        null;


    const address =
        editAddress.value.trim();


    if (!name) {

        showToast(
            "Driver name is required."
        );

        return false;

    }


    /*
       Split address back into the
       database's address fields.

       Existing modal has only one
       Address field, so preserve it
       in address_line1.
    */

    const addressLine1 =
        address || null;


    /*
       Driver status
    */

    const newDatabaseStatus =
        getDatabaseStatusFromUI(
            editStatus.value
        );


    /*
       Driver UPDATE
    */

    const driverUpdate = {

        name:
            name,

        phone:
            phone || selectedDriver.phone,

        email:
            email || null,

        status:
            newDatabaseStatus,

        joining_date:
            joiningDate,

        address_line1:
            addressLine1,

        updated_at:
            new Date().toISOString()

    };


    const driverResult =
        await supabaseClient
            .from("drivers")
            .update(
                driverUpdate
            )
            .eq(
                "id",
                selectedDriver.id
            )
            .select()
            .single();


    if (
        driverResult.error
    ) {

        console.error(
            "Driver update failed:",
            driverResult.error
        );

        showToast(
            "Unable to update driver information."
        );

        return false;

    }


    /*
       Vehicle handling
    */

    const vehicleId =
        getSelectedVehicleDatabaseId();


    if (vehicleId) {

        /*
           First remove this driver from
           any vehicle currently assigned
           to them.

           This prevents multiple vehicles
           being assigned to the same driver.
        */

        const clearResult =
            await supabaseClient
                .from("vehicles")
                .update({

                    assigned_driver_id:
                        null,

                    vehicle_status:
                        "available",

                    updated_at:
                        new Date().toISOString()

                })
                .eq(
                    "assigned_driver_id",
                    selectedDriver.id
                );


        if (
            clearResult.error
        ) {

            console.error(
                "Unable to clear previous vehicle assignment:",
                clearResult.error
            );

            showToast(
                "Driver saved, but vehicle assignment could not be updated."
            );

            await reloadPageData();

            return true;

        }


        /*
           Assign selected vehicle.
        */

        const assignResult =
            await supabaseClient
                .from("vehicles")
                .update({

                    assigned_driver_id:
                        selectedDriver.id,

                    vehicle_status:
                        "assigned",

                    updated_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    vehicleId
                );


        if (
            assignResult.error
        ) {

            console.error(
                "Unable to assign vehicle:",
                assignResult.error
            );

            showToast(
                "Driver saved, but selected vehicle could not be assigned."
            );

            await reloadPageData();

            return true;

        }


        /*
           Keep drivers.vehicle_assigned
           synchronized.
        */

        const assignedFlagResult =
            await supabaseClient
                .from("drivers")
                .update({

                    vehicle_assigned:
                        true,

                    updated_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    selectedDriver.id
                );


        if (
            assignedFlagResult.error
        ) {

            console.error(
                "Unable to update vehicle_assigned flag:",
                assignedFlagResult.error
            );

        }

    } else {

        /*
           No vehicle selected.

           Clear all vehicle assignments
           belonging to this driver.
        */

        const clearResult =
            await supabaseClient
                .from("vehicles")
                .update({

                    assigned_driver_id:
                        null,

                    vehicle_status:
                        "available",

                    updated_at:
                        new Date().toISOString()

                })
                .eq(
                    "assigned_driver_id",
                    selectedDriver.id
                );


        if (
            clearResult.error
        ) {

            console.error(
                "Unable to clear vehicle:",
                clearResult.error
            );

        }


        await supabaseClient
            .from("drivers")
            .update({

                vehicle_assigned:
                    false,

                updated_at:
                    new Date().toISOString()

            })
            .eq(
                "id",
                selectedDriver.id
            );

    }


    /*
       Reload from database.
    */

    await reloadPageData();


    showToast(
        "Driver information updated successfully."
    );


    return true;

}


/* =========================================================
   SELECTED VEHICLE DATABASE UUID
========================================================= */

function getSelectedVehicleDatabaseId() {

    const selectedOption =
        editVehicleAssigned
            .selectedOptions[0];


    if (
        !selectedOption ||
        !selectedOption.value
    ) {

        return null;

    }


    return (
        selectedOption.dataset
            .vehicleId ||
        null
    );

}


/* =========================================================
   RELOAD PAGE DATA
========================================================= */

async function reloadPageData() {

    const driver =
        await loadDriver();


    if (!driver) {
        return;
    }


    selectedDriver =
        driver;


    await loadVehicle(
        selectedDriver
    );


    await loadBookings();


    renderAll();

}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderAll() {

    renderProfile();

    renderCurrentAssignment();

    renderActivity();

    renderHistory();

}


/* =========================================================
   BOOKING NAVIGATION
========================================================= */

function goToBooking(
    bookingId
) {

    if (!bookingId) {
        return;
    }


    window.location.href =
        "bookings-details.html?id=" +
        encodeURIComponent(
            bookingId
        );

}


/* =========================================================
   TRACKING NAVIGATION
========================================================= */

function goToTracking(
    bookingId
) {

    if (!bookingId) {
        return;
    }


    window.location.href =
        "tracking.html?id=" +
        encodeURIComponent(
            bookingId
        );

}


/* =========================================================
   SIDEBAR
========================================================= */

function toggleSidebar() {

    if (
        window.innerWidth <= 800
    ) {

        sidebar.classList.toggle(
            "mobile-open"
        );

        sidebarOverlay.classList.toggle(
            "show"
        );

        return;

    }


    document.body.classList.toggle(
        "sidebar-collapsed"
    );

}


/* =========================================================
   CLOSE MOBILE SIDEBAR
========================================================= */

function closeMobileSidebar() {

    sidebar.classList.remove(
        "mobile-open"
    );

    sidebarOverlay.classList.remove(
        "show"
    );

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(
    message
) {

    if (!toast) {
        return;
    }


    toast.textContent =
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
            3000
        );

}


/* =========================================================
   EVENTS
========================================================= */

if (sidebarToggle) {

    sidebarToggle.addEventListener(
        "click",
        toggleSidebar
    );

}


if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        closeMobileSidebar
    );

}


if (backButton) {

    backButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "drivers.html";

        }
    );

}


if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        async () => {

            await reloadPageData();

            showToast(
                "Driver details refreshed."
            );

        }
    );

}


if (editDriverButton) {

    editDriverButton.addEventListener(
        "click",
        openEditModal
    );

}


if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeEditModal
    );

}


if (cancelEdit) {

    cancelEdit.addEventListener(
        "click",
        closeEditModal
    );

}


if (modalBackdrop) {

    modalBackdrop.addEventListener(
        "click",
        closeEditModal
    );

}


if (editVehicleAssigned) {

    editVehicleAssigned.addEventListener(
        "change",
        handleVehicleSelection
    );

}


if (editDriverForm) {

    editDriverForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const success =
                await saveDriverEdit();


            if (success) {

                closeEditModal();

            }

        }
    );

}


/* =========================================================
   ASSIGNMENT / HISTORY EVENTS
========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-booking-id]"
            );


        if (!button) {
            return;
        }


        const bookingId =
            button.dataset.bookingId;


        const action =
            button.dataset.action ||
            "booking";


        if (
            action ===
            "tracking"
        ) {

            goToTracking(
                bookingId
            );

        } else {

            goToBooking(
                bookingId
            );

        }

    }
);


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            if (
                editModal &&
                editModal.classList.contains(
                    "open"
                )
            ) {

                closeEditModal();

                return;

            }


            closeMobileSidebar();

        }

    }
);


/* =========================================================
   PAGE VISIBILITY
========================================================= */

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            await reloadPageData();

        }

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

async function initialize() {

    if (!supabaseClient) {

        showToast(
            "Supabase client is not loaded."
        );

        return;

    }


    if (
        !selectedDriverIdentifier
    ) {

        showToast(
            "Driver ID is missing from the page URL."
        );


        driverName.textContent =
            "Driver Not Found";


        driverId.textContent =
            "No driver ID";


        return;

    }


    /*
       Load driver
    */

    selectedDriver =
        await loadDriver();


    if (!selectedDriver) {

        driverName.textContent =
            "Driver Not Found";


        driverId.textContent =
            selectedDriverIdentifier;


        return;

    }


    /*
       Load vehicle
    */

    await loadVehicle(
        selectedDriver
    );


    /*
       Load bookings
    */

    await loadBookings();


    /*
       Render
    */

    renderAll();

}


/* =========================================================
   START
========================================================= */

initialize();