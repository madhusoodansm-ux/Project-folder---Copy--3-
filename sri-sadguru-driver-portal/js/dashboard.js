/* =========================================================
   SSP DRIVER PORTAL
   DRIVER DASHBOARD
   SUPABASE VERSION

   DATA SOURCE:

       Supabase Auth
            ↓
       profiles
            ↓
       drivers
            ↓
       bookings

   Driver bookings are matched using:

       bookings.driver_id
       =
       drivers.id

   IMPORTANT:
   CSS and Dashboard HTML structure are not changed.
========================================================= */

"use strict";


/* =========================================================
   STATE
========================================================= */

let currentDriver = null;

let bookings = [];

let assignedBookings = [];

let toastTimer = null;


/* =========================================================
   DOM
========================================================= */

const elements = {

    driverName:
        document.getElementById("driverName"),

    driverId:
        document.getElementById("driverId"),

    assignedCount:
        document.getElementById("assignedCount"),

    pickupCount:
        document.getElementById("pickupCount"),

    deliveryCount:
        document.getElementById("deliveryCount"),

    completedCount:
        document.getElementById("completedCount"),

    pendingCount:
        document.getElementById("pendingCount"),

    notificationCount:
        document.getElementById("notificationCount"),

    shipmentList:
        document.getElementById("shipmentList"),

    emptyShipments:
        document.getElementById("emptyShipments"),

    activityList:
        document.getElementById("activityList"),

    sideMenu:
        document.getElementById("sideMenu"),

    menuOverlay:
        document.getElementById("menuOverlay"),

    menuButton:
        document.getElementById("menuButton"),

    closeMenu:
        document.getElementById("closeMenu"),

    menuLogout:
        document.getElementById("menuLogout"),

    profileButton:
        document.getElementById("profileButton"),

    notificationButton:
        document.getElementById("notificationButton"),

    summaryViewAll:
        document.getElementById("summaryViewAll"),

    shipmentsViewAll:
        document.getElementById("shipmentsViewAll"),

    activityViewAll:
        document.getElementById("activityViewAll"),

    activitySection:
        document.getElementById("activitySection"),

    toast:
        document.getElementById("toast")
};


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    return String(value ?? "").replace(
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
   STATUS NORMALIZATION
========================================================= */

function normalizeStatus(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase();

}


/* =========================================================
   BOOKING STATUS
========================================================= */

function getStatus(booking) {

    return normalizeStatus(
        booking?.status || "pending"
    );

}


/* =========================================================
   STATUS TESTS
========================================================= */

function isDelivered(booking) {

    return getStatus(booking) === "delivered";

}


function isPickupPending(booking) {

    const status = getStatus(booking);

    return [
        "pending",
        "confirmed",
        "assigned",
        "pickup_started"
    ].includes(status);

}


function isDeliveryInProgress(booking) {

    const status = getStatus(booking);

    return [
        "picked_up",
        "in_transit",
        "out_for_delivery"
    ].includes(status);

}


/* =========================================================
   STATUS LABEL
========================================================= */

function getStatusLabel(booking) {

    switch (getStatus(booking)) {

        case "pending":
            return "Pending";

        case "confirmed":
            return "Confirmed";

        case "assigned":
            return "Driver Assigned";

        case "pickup_started":
            return "Pickup Started";

        case "picked_up":
            return "Picked Up";

        case "in_transit":
            return "In Transit";

        case "out_for_delivery":
            return "Out for Delivery";

        case "delivered":
            return "Delivered";

        case "cancelled":
            return "Cancelled";

        default:
            return booking?.status || "Pending";
    }

}


/* =========================================================
   STATUS CSS CLASS
========================================================= */

function getStatusClass(booking) {

    const status = getStatus(booking);

    if (status === "delivered") {
        return "status-delivered";
    }

    if (status === "out_for_delivery") {
        return "status-delivery";
    }

    if (
        status === "in_transit" ||
        status === "picked_up"
    ) {
        return "status-transit";
    }

    if (status === "assigned") {
        return "status-assigned";
    }

    if (status === "confirmed") {
        return "status-new";
    }

    return "status-pending";
}


/* =========================================================
   BOOKING ID
========================================================= */

function getBookingId(booking) {

    return (
        booking?.booking_id ||
        booking?.id ||
        "N/A"
    );

}


/* =========================================================
   CUSTOMER NAME
========================================================= */

function getCustomerName(booking) {

    return (
        booking?.receiver_name ||
        booking?.pickup_name ||
        "Customer"
    );

}


/* =========================================================
   CUSTOMER PHONE
========================================================= */

function getCustomerPhone(booking) {

    return (
        booking?.receiver_phone ||
        booking?.pickup_phone ||
        ""
    );

}


/* =========================================================
   FROM
========================================================= */

function getFrom(booking) {

    const address = booking?.pickup_address || "";

    const city = booking?.pickup_city || "";

    if (address && city) {
        return `${address}, ${city}`;
    }

    return (
        city ||
        address ||
        "Pickup"
    );

}


/* =========================================================
   TO
========================================================= */

function getTo(booking) {

    const address = booking?.delivery_address || "";

    const city = booking?.delivery_city || "";

    if (address && city) {
        return `${address}, ${city}`;
    }

    return (
        city ||
        address ||
        "Delivery"
    );

}


/* =========================================================
   BOOKING TIMESTAMP
========================================================= */

function getBookingTimestamp(booking) {

    const value =
        booking?.updated_at ||
        booking?.created_at ||
        booking?.booking_date ||
        "";

    const timestamp =
        Date.parse(String(value));

    return Number.isFinite(timestamp)
        ? timestamp
        : 0;

}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDateTime(booking) {

    const value =
        booking?.updated_at ||
        booking?.created_at;

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =========================================================
   TODAY CHECK
========================================================= */

function isToday(booking) {

    const value =
        booking?.updated_at ||
        booking?.created_at;

    if (!value) {
        return false;
    }

    const date = new Date(value);

    const today = new Date();

    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );

}


/* =========================================================
   LOAD DRIVER
========================================================= */

async function loadDriver() {

    currentDriver =
        await window.driverAuth.getCurrentDriver();

    if (!currentDriver) {

        throw new Error(
            "Driver session could not be loaded."
        );

    }


    elements.driverName.innerHTML = `

        ${escapeHTML(
            currentDriver.name || "Driver"
        )}

        <span>👋</span>

    `;


    elements.driverId.textContent =
        currentDriver.driverId || "—";

}


/* =========================================================
   LOAD BOOKINGS FROM SUPABASE
========================================================= */

async function loadBookings() {

    if (!currentDriver?.driverUuid) {

        throw new Error(
            "Driver record ID is missing."
        );

    }


    const {
        data,
        error
    } = await window.supabaseClient
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
            "Dashboard booking query failed:",
            error
        );

        throw error;

    }


    bookings =
        Array.isArray(data)
            ? data
            : [];


    assignedBookings =
        [...bookings].sort(
            (a, b) =>
                getBookingTimestamp(b) -
                getBookingTimestamp(a)
        );

}


/* =========================================================
   SUMMARY
========================================================= */

function renderSummary() {

    const total =
        assignedBookings.length;


    const pickupPending =
        assignedBookings.filter(
            booking =>
                isPickupPending(booking)
        ).length;


    const deliveries =
        assignedBookings.filter(
            booking =>
                isDeliveryInProgress(booking)
        ).length;


    const completedToday =
        assignedBookings.filter(
            booking =>
                isDelivered(booking) &&
                isToday(booking)
        ).length;


    const pending =
        assignedBookings.filter(
            booking =>
                !isDelivered(booking) &&
                getStatus(booking) !== "cancelled"
        ).length;


    elements.assignedCount.textContent =
        total;


    elements.pickupCount.textContent =
        pickupPending;


    elements.deliveryCount.textContent =
        deliveries;


    elements.completedCount.textContent =
        completedToday;


    elements.pendingCount.textContent =
        pending;


    elements.notificationCount.textContent =
        pending;

}


/* =========================================================
   DASHBOARD ACTION
========================================================= */

function getAction(booking) {

    const status =
        getStatus(booking);


    switch (status) {

        case "assigned":

        case "confirmed":

        case "pending":

            return {
                text: "Start Pickup",
                className: "primary",
                nextStatus: "pickup_started"
            };


        case "pickup_started":

            return {
                text: "Mark Picked Up",
                className: "primary",
                nextStatus: "picked_up"
            };


        case "picked_up":

            return {
                text: "Start Transit",
                className: "primary",
                nextStatus: "in_transit"
            };


        case "in_transit":

            return {
                text: "Start Delivery",
                className: "primary",
                nextStatus: "out_for_delivery"
            };


        case "out_for_delivery":

            return {
                text: "Complete Delivery",
                className: "green",
                nextStatus: "delivered"
            };


        case "delivered":

            return {
                text: "Delivered",
                className: "green",
                nextStatus: null
            };


        case "cancelled":

            return {
                text: "Cancelled",
                className: "green",
                nextStatus: null
            };


        default:

            return {
                text: "Start Pickup",
                className: "primary",
                nextStatus: "pickup_started"
            };
    }

}


/* =========================================================
   SHIPMENT CARD
========================================================= */

function createShipmentHTML(booking) {

    const id =
        escapeHTML(
            getBookingId(booking)
        );


    const customer =
        escapeHTML(
            getCustomerName(booking)
        );


    const from =
        escapeHTML(
            getFrom(booking)
        );


    const to =
        escapeHTML(
            getTo(booking)
        );


    const status =
        getStatusLabel(booking);


    const statusClass =
        getStatusClass(booking);


    const action =
        getAction(booking);


    const nextStatus =
        escapeHTML(
            action.nextStatus || ""
        );


    const disabled =
        action.nextStatus === null
            ? "disabled"
            : "";


    return `

        <article
            class="shipment-card"
            data-booking-id="${id}"
        >

            <div class="shipment-icon">

                <i class="fa-solid fa-box"></i>

            </div>


            <div class="shipment-main">

                <div class="shipment-top">

                    <div>

                        <div class="shipment-id">

                            ${id}

                        </div>


                        <div class="shipment-customer">

                            ${customer}

                        </div>

                    </div>

                </div>


                <div class="shipment-route">

                    <span class="route-dot"></span>

                    <span>
                        ${from}
                    </span>


                    <span class="route-arrow">

                        <i class="fa-solid fa-arrow-right"></i>

                    </span>


                    <span class="route-dot destination"></span>

                    <span>
                        ${to}
                    </span>

                </div>


                <div class="shipment-bottom">

                    <span
                        class="status-badge ${statusClass}"
                    >
                        ${escapeHTML(status)}
                    </span>


                    <button
                        type="button"
                        class="shipment-action ${action.className}"
                        data-action-booking="${id}"
                        data-next-status="${nextStatus}"
                        ${disabled}
                    >
                        ${escapeHTML(action.text)}
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

    if (!assignedBookings.length) {

        elements.shipmentList.innerHTML = "";

        elements.emptyShipments
            .classList
            .remove("hidden");

        return;

    }


    elements.emptyShipments
        .classList
        .add("hidden");


    elements.shipmentList.innerHTML =
        assignedBookings
            .slice(0, 6)
            .map(
                booking =>
                    createShipmentHTML(booking)
            )
            .join("");

}


/* =========================================================
   ACTIVITY
========================================================= */

function createActivityHTML(booking) {

    const status =
        getStatus(booking);


    let icon = "fa-box";

    let iconClass = "";

    let title = "Shipment assigned";


    if (status === "pickup_started") {

        icon = "fa-truck-ramp-box";

        iconClass = "orange";

        title = "Pickup started";

    }


    if (status === "picked_up") {

        icon = "fa-box";

        iconClass = "orange";

        title = "Shipment picked up";

    }


    if (status === "in_transit") {

        icon = "fa-truck";

        title = "Shipment in transit";

    }


    if (status === "out_for_delivery") {

        icon = "fa-location-dot";

        title = "Shipment out for delivery";

    }


    if (status === "delivered") {

        icon = "fa-circle-check";

        iconClass = "green";

        title = "Shipment delivered";

    }


    if (status === "cancelled") {

        icon = "fa-circle-xmark";

        title = "Shipment cancelled";

    }


    const id =
        escapeHTML(
            getBookingId(booking)
        );


    const destination =
        escapeHTML(
            getTo(booking)
        );


    const time =
        escapeHTML(
            formatDateTime(booking)
        );


    return `

        <div class="activity-item">

            <div
                class="activity-icon ${iconClass}"
            >

                <i
                    class="fa-solid ${icon}"
                ></i>

            </div>


            <div class="activity-content">

                <strong>

                    ${title}

                    ${id}

                </strong>


                <span>

                    ${destination}

                </span>

            </div>


            <span class="activity-time">

                ${time}

            </span>

        </div>

    `;

}


/* =========================================================
   RENDER ACTIVITY
========================================================= */

function renderActivity() {

    if (!assignedBookings.length) {

        elements.activityList.innerHTML = `

            <div class="activity-item">

                <div class="activity-icon">

                    <i
                        class="fa-solid fa-circle-info"
                    ></i>

                </div>


                <div class="activity-content">

                    <strong>
                        No recent activity
                    </strong>

                    <span>
                        Your assigned shipment activity will appear here.
                    </span>

                </div>


                <span class="activity-time">
                    —
                </span>

            </div>

        `;

        return;

    }


    elements.activityList.innerHTML =
        assignedBookings
            .slice(0, 5)
            .map(
                booking =>
                    createActivityHTML(booking)
            )
            .join("");

}


/* =========================================================
   REFRESH DASHBOARD
========================================================= */

async function refreshDashboard() {

    try {

        await loadDriver();

        await loadBookings();

        renderSummary();

        renderShipments();

        renderActivity();

    }
    catch (error) {

        console.error(
            "Dashboard refresh failed:",
            error
        );


        elements.shipmentList.innerHTML = "";

        elements.emptyShipments
            .classList
            .remove("hidden");


        elements.emptyShipments
            .querySelector("h3")
            ?.replaceChildren(
                document.createTextNode(
                    "Unable to load shipments"
                )
            );


        showToast(
            error?.message ||
            "Unable to load dashboard data."
        );

    }

}


/* =========================================================
   UPDATE BOOKING STATUS
========================================================= */

async function updateBookingStatus(
    bookingId,
    nextStatus
) {

    if (!currentDriver?.driverUuid) {

        showToast(
            "Driver session is not available."
        );

        return;

    }


    const booking =
        assignedBookings.find(
            item =>
                String(
                    getBookingId(item)
                ) ===
                String(bookingId)
        );


    if (!booking) {

        showToast(
            "Booking was not found."
        );

        return;

    }


    const bookingUuid =
        booking.id;


    if (!bookingUuid) {

        showToast(
            "Booking database ID is missing."
        );

        return;

    }


    const updates = {

        status: nextStatus,

        updated_at:
            new Date().toISOString()

    };


    if (nextStatus === "delivered") {

        updates.delivery_current_location =
            booking.delivery_current_location ||
            null;

    }


    const {
        error
    } = await window.supabaseClient
        .from("bookings")
        .update(updates)
        .eq("id", bookingUuid)
        .eq(
            "driver_id",
            currentDriver.driverUuid
        );


    if (error) {

        console.error(
            "Booking status update failed:",
            error
        );

        showToast(
            error.message ||
            "Unable to update shipment."
        );

        return;

    }


    await refreshDashboard();


    showToast(
        `${bookingId} updated to ${getStatusLabel({
            status: nextStatus
        })}.`
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

const PAGE_MAP = {

    dashboard: "dashboard.html",

    shipments: "shipments.html",

    pickup: "pickup.html",

    pickups: "pickup.html",

    deliveries: "deliveries.html",

    delivery: "deliveries.html",

    profile: "profile.html",

    notifications: "notifications.html"

};


function goToPage(page) {

    const target =
        PAGE_MAP[
            String(page || "").toLowerCase()
        ];


    if (!target) {

        showToast(
            "Page is not available."
        );

        return;

    }


    window.location.href = target;

}


/* =========================================================
   SIDEBAR
========================================================= */

function openMenu() {

    elements.sideMenu
        .classList
        .add("open");


    elements.menuOverlay
        .classList
        .add("show");


    document.body.style.overflow =
        "hidden";


    elements.menuButton
        .setAttribute(
            "aria-expanded",
            "true"
        );


    elements.menuButton
        .setAttribute(
            "aria-label",
            "Close menu"
        );


    const icon =
        elements.menuButton
            .querySelector("i");


    if (icon) {

        icon.classList.remove(
            "fa-bars"
        );

        icon.classList.add(
            "fa-xmark"
        );

    }

}


function closeSideMenu() {

    elements.sideMenu
        .classList
        .remove("open");


    elements.menuOverlay
        .classList
        .remove("show");


    document.body.style.overflow = "";


    elements.menuButton
        .setAttribute(
            "aria-expanded",
            "false"
        );


    elements.menuButton
        .setAttribute(
            "aria-label",
            "Open menu"
        );


    const icon =
        elements.menuButton
            .querySelector("i");


    if (icon) {

        icon.classList.remove(
            "fa-xmark"
        );

        icon.classList.add(
            "fa-bars"
        );

    }

}


/* =========================================================
   ACTIVE PAGE
========================================================= */

function setActivePage(page) {

    document
        .querySelectorAll("[data-page]")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.page === page
            );

        });

}


/* =========================================================
   NAVIGATION EVENTS
========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            ".side-nav-item, .bottom-nav-item"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    const page =
                        item.dataset.page;

                    setActivePage(page);

                    closeSideMenu();

                }
            );

        });


    document
        .querySelectorAll(
            "[data-summary-page]"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    goToPage(
                        card.dataset.summaryPage
                    );

                }
            );

        });

}


/* =========================================================
   PROFILE BUTTON
========================================================= */

function setupProfileButton() {

    elements.profileButton
        .addEventListener(
            "click",
            () => {

                goToPage("profile");

            }
        );

}


/* =========================================================
   NOTIFICATION BUTTON
========================================================= */

function setupNotificationButton() {

    elements.notificationButton
        .addEventListener(
            "click",
            () => {

                goToPage("notifications");

            }
        );

}


/* =========================================================
   VIEW BUTTONS
========================================================= */

function setupViewButtons() {

    elements.summaryViewAll
        .addEventListener(
            "click",
            () => {

                goToPage("shipments");

            }
        );


    elements.shipmentsViewAll
        .addEventListener(
            "click",
            () => {

                goToPage("shipments");

            }
        );


    elements.activityViewAll
        .addEventListener(
            "click",
            () => {

                elements.activitySection
                    .scrollIntoView({
                        behavior: "smooth"
                    });

            }
        );

}


/* =========================================================
   SHIPMENT ACTIONS
========================================================= */

function setupShipmentActions() {

    elements.shipmentList
        .addEventListener(
            "click",
            async event => {

                const button =
                    event.target.closest(
                        "[data-action-booking]"
                    );


                if (!button) {
                    return;
                }


                const bookingId =
                    button.dataset.actionBooking;


                const nextStatus =
                    button.dataset.nextStatus;


                if (!nextStatus) {
                    return;
                }


                button.disabled = true;


                await updateBookingStatus(
                    bookingId,
                    nextStatus
                );


                button.disabled = false;

            }
        );

}


/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {

    elements.menuLogout
        .addEventListener(
            "click",
            async () => {

                const confirmed =
                    window.confirm(
                        "Are you sure you want to logout?"
                    );


                if (!confirmed) {
                    return;
                }


                try {

                    await window.driverAuth.logout();

                }
                catch (error) {

                    console.error(
                        "Logout failed:",
                        error
                    );

                    window.location.href =
                        "../index.html";

                }

            }
        );

}


/* =========================================================
   PAGE FOCUS
========================================================= */

window.addEventListener(
    "focus",
    () => {

        refreshDashboard();

    }
);


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    if (!elements.toast) {
        return;
    }


    elements.toast.textContent =
        message;


    elements.toast
        .classList
        .add("show");


    clearTimeout(toastTimer);


    toastTimer =
        setTimeout(
            () => {

                elements.toast
                    .classList
                    .remove("show");

            },
            2600
        );

}


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeDashboard() {

    try {

        /*
           Require a valid logged-in driver.
        */

        const driver =
            await window.driverAuth
                .requireDriver();


        if (!driver) {
            return;
        }


        currentDriver = driver;


        await refreshDashboard();


        /* Sidebar */

        elements.menuButton
            .addEventListener(
                "click",
                openMenu
            );


        elements.closeMenu
            .addEventListener(
                "click",
                closeSideMenu
            );


        elements.menuOverlay
            .addEventListener(
                "click",
                closeSideMenu
            );


        /* Navigation */

        setupNavigation();


        /* Header */

        setupProfileButton();

        setupNotificationButton();


        /* View buttons */

        setupViewButtons();


        /* Shipment actions */

        setupShipmentActions();


        /* Logout */

        setupLogout();


        /* Active page */

        setActivePage("dashboard");

    }
    catch (error) {

        console.error(
            "Dashboard initialization failed:",
            error
        );

        showToast(
            error?.message ||
            "Unable to load driver dashboard."
        );

    }

}


/* =========================================================
   START
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard
    );

}
else {

    initializeDashboard();

}