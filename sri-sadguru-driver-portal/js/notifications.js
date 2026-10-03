/* =====================================================
   SSP DRIVER PORTAL
   NOTIFICATIONS JAVASCRIPT
   SUPABASE VERSION
===================================================== */

"use strict";


/* =====================================================
   STATE
===================================================== */

let bookings = [];

let notifications = [];

let currentDriver = null;

let currentFilter = "all";

let toastTimer;


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeNotifications
);


async function initializeNotifications() {

    try {

        /*
           Authenticate current driver.
        */

        currentDriver =
            await window.driverAuth.getCurrentDriver();


        if (!currentDriver) {

            window.location.href =
                "../index.html";

            return;

        }


        /*
           Load real bookings assigned
           to this driver.
        */

        await loadBookings();


        /*
           Create any required notifications
           from the current booking status.
        */

        await generateBookingNotifications();


        /*
           Load notifications from Supabase.
        */

        await loadNotifications();


        setupSidebar();

        setupFilters();

        setupNotificationActions();

        renderNotifications();


    } catch (error) {

        console.error(
            "Notifications initialization failed:",
            error
        );


        showToast(
            "Unable to load notifications."
        );

    }

}


/* =====================================================
   LOAD DRIVER BOOKINGS
===================================================== */

async function loadBookings() {

    const driverUuid =
        currentDriver.driverUuid;


    const {
        data,
        error
    } = await supabaseClient
        .from("bookings")
        .select("*")
        .eq(
            "driver_id",
            driverUuid
        )
        .neq(
            "status",
            "cancelled"
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Unable to load driver bookings:",
            error
        );

        throw error;

    }


    bookings =
        Array.isArray(data)
            ? data
            : [];

}


/* =====================================================
   LOAD NOTIFICATIONS
===================================================== */

async function loadNotifications() {

    const {
        data,
        error
    } = await supabaseClient
        .from("driver_notifications")
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
            "Unable to load notifications:",
            error
        );

        throw error;

    }


    notifications =
        Array.isArray(data)
            ? data
            : [];

}


/* =====================================================
   BOOKING STATUS HELPERS
===================================================== */

function getBookingId(booking) {

    return String(
        booking.booking_id ??
        booking.id ??
        "N/A"
    );

}


function getCustomerName(booking) {

    return String(
        booking.pickup_name ??
        booking.receiver_name ??
        "Customer"
    );

}


function getBookingStatus(booking) {

    return String(
        booking.status ??
        "pending"
    ).toLowerCase();

}


/* =====================================================
   GENERATE BOOKING NOTIFICATIONS
===================================================== */

async function generateBookingNotifications() {

    if (!currentDriver) {

        return;

    }


    const driverUuid =
        currentDriver.driverUuid;


    for (const booking of bookings) {

        const bookingId =
            getBookingId(booking);


        const customer =
            getCustomerName(booking);


        const status =
            getBookingStatus(booking);


        /*
           -------------------------------------------------
           BOOKING ASSIGNED
           -------------------------------------------------
        */

        await createNotificationIfMissing({

            driverId:
                driverUuid,

            bookingId:
                booking.id,

            sourceKey:
                `${booking.id}:booking-assigned`,

            type:
                "booking",

            title:
                "Booking assigned",

            message:
                `Booking ${bookingId} for ${customer} is assigned to you.`

        });


        /*
           -------------------------------------------------
           PICKUP STARTED
           -------------------------------------------------
        */

        if (
            status === "pickup_started"
        ) {

            await createNotificationIfMissing({

                driverId:
                    driverUuid,

                bookingId:
                    booking.id,

                sourceKey:
                    `${booking.id}:pickup-started`,

                type:
                    "pickup",

                title:
                    "Pickup started",

                message:
                    `Pickup has started for booking ${bookingId}.`

            });

        }


        /*
           -------------------------------------------------
           PICKED UP
           -------------------------------------------------
        */

        if (
            status === "picked_up"
        ) {

            await createNotificationIfMissing({

                driverId:
                    driverUuid,

                bookingId:
                    booking.id,

                sourceKey:
                    `${booking.id}:picked-up`,

                type:
                    "pickup",

                title:
                    "Parcel picked up",

                message:
                    `Parcel for booking ${bookingId} has been picked up.`

            });

        }


        /*
           -------------------------------------------------
           IN TRANSIT
           -------------------------------------------------
        */

        if (
            status === "in_transit"
        ) {

            await createNotificationIfMissing({

                driverId:
                    driverUuid,

                bookingId:
                    booking.id,

                sourceKey:
                    `${booking.id}:in-transit`,

                type:
                    "delivery",

                title:
                    "Parcel in transit",

                message:
                    `Booking ${bookingId} is now in transit.`

            });

        }


        /*
           -------------------------------------------------
           OUT FOR DELIVERY
           -------------------------------------------------
        */

        if (
            status === "out_for_delivery"
        ) {

            await createNotificationIfMissing({

                driverId:
                    driverUuid,

                bookingId:
                    booking.id,

                sourceKey:
                    `${booking.id}:out-for-delivery`,

                type:
                    "delivery",

                title:
                    "Out for delivery",

                message:
                    `Booking ${bookingId} for ${customer} is out for delivery.`

            });

        }


        /*
           -------------------------------------------------
           DELIVERED
           -------------------------------------------------
        */

        if (
            status === "delivered"
        ) {

            await createNotificationIfMissing({

                driverId:
                    driverUuid,

                bookingId:
                    booking.id,

                sourceKey:
                    `${booking.id}:delivered`,

                type:
                    "delivery",

                title:
                    "Delivery completed",

                message:
                    `Booking ${bookingId} for ${customer} has been delivered.`

            });

        }

    }

}


/* =====================================================
   CREATE NOTIFICATION IF MISSING
===================================================== */

async function createNotificationIfMissing(
    notification
) {

    const existing =
        notifications.find(
            item =>
                item.source_key ===
                notification.sourceKey
        );


    if (existing) {

        return;

    }


    const {
        data,
        error
    } = await supabaseClient
        .from("driver_notifications")
        .insert({

            driver_id:
                notification.driverId,

            booking_id:
                notification.bookingId,

            type:
                notification.type,

            title:
                notification.title,

            message:
                notification.message,

            source_key:
                notification.sourceKey,

            read:
                false

        })
        .select()
        .single();


    if (error) {

        /*
           Ignore duplicate race conditions.
        */

        if (
            error.code === "23505"
        ) {

            return;

        }


        console.error(
            "Unable to create notification:",
            error
        );

        return;

    }


    if (data) {

        notifications.push(
            data
        );

    }

}


/* =====================================================
   FILTER
===================================================== */

function getFilteredNotifications() {

    let result =
        [...notifications];


    if (
        currentFilter ===
        "unread"
    ) {

        result =
            result.filter(
                notification =>
                    notification.read !== true
            );

    } else if (
        currentFilter !==
        "all"
    ) {

        result =
            result.filter(
                notification =>
                    notification.type ===
                    currentFilter
            );

    }


    return result;

}


/* =====================================================
   RENDER
===================================================== */

function renderNotifications() {

    const list =
        document.getElementById(
            "notificationList"
        );


    const empty =
        document.getElementById(
            "emptyState"
        );


    if (!list || !empty) {

        return;

    }


    const results =
        getFilteredNotifications();


    updateCounts();


    list.innerHTML = "";


    if (!results.length) {

        empty.classList.remove(
            "hidden"
        );

    } else {

        empty.classList.add(
            "hidden"
        );


        results.forEach(
            notification => {

                list.appendChild(
                    createNotificationElement(
                        notification
                    )
                );

            }
        );

    }


    const resultText =
        document.getElementById(
            "resultText"
        );


    if (resultText) {

        resultText.textContent =
            `${results.length} ${
                results.length === 1
                    ? "notification"
                    : "notifications"
            }`;

    }

}


/* =====================================================
   CREATE NOTIFICATION ELEMENT
===================================================== */

function createNotificationElement(
    notification
) {

    const article =
        document.createElement(
            "article"
        );


    article.className =
        "notification-item";


    if (
        !notification.read
    ) {

        article.classList.add(
            "unread"
        );

    }


    const icon =
        getNotificationIcon(
            notification.type
        );


    const iconClass =
        notification.type;


    const bookingHTML =
        notification.booking_id
            ? `
                <span class="notification-booking">
                    ${escapeHTML(
                        getBookingDisplayId(
                            notification.booking_id
                        )
                    )}
                </span>
              `
            : "";


    const unreadDot =
        !notification.read
            ? `
                <span
                    class="unread-dot"
                    aria-label="Unread"
                ></span>
              `
            : "";


    article.innerHTML = `

        <div
            class="notification-item-icon ${iconClass}"
        >

            <i class="${icon}"></i>

        </div>


        <div class="notification-content">

            <div class="notification-title-row">

                <span class="notification-title">
                    ${escapeHTML(
                        notification.title
                    )}
                </span>

                ${unreadDot}

            </div>


            <p class="notification-message">
                ${escapeHTML(
                    notification.message
                )}
            </p>


            <div class="notification-meta">

                ${bookingHTML}

                <span>
                    ${formatNotificationTime(
                        notification.created_at
                    )}
                </span>

            </div>

        </div>


        <button
            type="button"
            class="notification-delete"
            aria-label="Delete notification"
        >

            <i class="fa-solid fa-trash-can"></i>

        </button>

    `;


    /*
       Clicking notification = mark as read.
    */

    article.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    ".notification-delete"
                )
            ) {

                return;

            }


            markAsRead(
                notification.id
            );

        }
    );


    /*
       Delete notification.
    */

    const deleteButton =
        article.querySelector(
            ".notification-delete"
        );


    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                deleteNotification(
                    notification.id
                );

            }
        );

    }


    return article;

}


/* =====================================================
   BOOKING DISPLAY ID
===================================================== */

function getBookingDisplayId(
    bookingUuid
) {

    const booking =
        bookings.find(
            item =>
                item.id ===
                bookingUuid
        );


    if (booking) {

        return getBookingId(
            booking
        );

    }


    return bookingUuid;

}


/* =====================================================
   ICONS
===================================================== */

function getNotificationIcon(type) {

    switch (type) {

        case "pickup":

            return "fa-solid fa-motorcycle";


        case "delivery":

            return "fa-solid fa-truck";


        case "system":

            return "fa-solid fa-circle-info";


        case "booking":

        default:

            return "fa-solid fa-box";

    }

}


/* =====================================================
   TIME FORMAT
===================================================== */

function formatNotificationTime(
    dateValue
) {

    if (!dateValue) {

        return "Recently";

    }


    const date =
        new Date(dateValue);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Recently";

    }


    const now =
        new Date();


    const difference =
        Math.max(
            0,
            now.getTime() -
            date.getTime()
        );


    const seconds =
        Math.floor(
            difference / 1000
        );


    if (seconds < 60) {

        return "Just now";

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (minutes < 60) {

        return `${minutes} min ago`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours < 24) {

        return `${hours} hr ago`;

    }


    const days =
        Math.floor(
            hours / 24
        );


    if (days < 7) {

        return `${days} day${
            days === 1
                ? ""
                : "s"
        } ago`;

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    );

}


/* =====================================================
   COUNTS
===================================================== */

function updateCounts() {

    const all =
        notifications.length;


    const unread =
        notifications.filter(
            item =>
                item.read !== true
        ).length;


    const booking =
        notifications.filter(
            item =>
                item.type ===
                "booking"
        ).length;


    const pickup =
        notifications.filter(
            item =>
                item.type ===
                "pickup"
        ).length;


    const delivery =
        notifications.filter(
            item =>
                item.type ===
                "delivery"
        ).length;


    const system =
        notifications.filter(
            item =>
                item.type ===
                "system"
        ).length;


    setText(
        "allCount",
        all
    );


    setText(
        "unreadCount",
        unread
    );


    setText(
        "bookingCount",
        booking
    );


    setText(
        "pickupCount",
        pickup
    );


    setText(
        "deliveryCount",
        delivery
    );


    setText(
        "systemCount",
        system
    );


    updateBadge(
        "notificationBadge",
        unread
    );


    updateBadge(
        "sidebarNotificationCount",
        unread
    );

}


/* =====================================================
   TEXT HELPER
===================================================== */

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;

    }

}


/* =====================================================
   BADGE
===================================================== */

function updateBadge(
    elementId,
    count
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        return;

    }


    element.textContent =
        count > 99
            ? "99+"
            : count;


    if (count > 0) {

        element.classList.remove(
            "hidden"
        );

    } else {

        element.classList.add(
            "hidden"
        );

    }

}


/* =====================================================
   FILTERS
===================================================== */

function setupFilters() {

    document
        .querySelectorAll(
            ".filter-chip"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".filter-chip"
                            )
                            .forEach(
                                item => {

                                    item.classList.remove(
                                        "active"
                                    );

                                }
                            );


                        button.classList.add(
                            "active"
                        );


                        currentFilter =
                            button.dataset.filter;


                        renderNotifications();

                    }
                );

            }
        );

}


/* =====================================================
   ACTIONS
===================================================== */

function setupNotificationActions() {

    const markAll =
        document.getElementById(
            "markAllReadButton"
        );


    const clearRead =
        document.getElementById(
            "clearReadButton"
        );


    if (markAll) {

        markAll.addEventListener(
            "click",
            markAllAsRead
        );

    }


    if (clearRead) {

        clearRead.addEventListener(
            "click",
            clearReadNotifications
        );

    }

}


/* =====================================================
   MARK AS READ
===================================================== */

async function markAsRead(
    notificationId
) {

    const notification =
        notifications.find(
            item =>
                item.id ===
                notificationId
        );


    if (
        !notification ||
        notification.read
    ) {

        return;

    }


    const {
        error
    } = await supabaseClient
        .from("driver_notifications")
        .update({
            read: true
        })
        .eq(
            "id",
            notificationId
        )
        .eq(
            "driver_id",
            currentDriver.driverUuid
        );


    if (error) {

        console.error(
            "Unable to mark notification as read:",
            error
        );

        showToast(
            "Unable to update notification."
        );

        return;

    }


    notification.read =
        true;


    renderNotifications();

}


/* =====================================================
   MARK ALL AS READ
===================================================== */

async function markAllAsRead() {

    const unreadCount =
        notifications.filter(
            notification =>
                notification.read !== true
        ).length;


    if (unreadCount === 0) {

        showToast(
            "There are no unread notifications."
        );

        return;

    }


    const {
        error
    } = await supabaseClient
        .from("driver_notifications")
        .update({
            read: true
        })
        .eq(
            "driver_id",
            currentDriver.driverUuid
        )
        .eq(
            "read",
            false
        );


    if (error) {

        console.error(
            "Unable to mark all notifications as read:",
            error
        );

        showToast(
            "Unable to update notifications."
        );

        return;

    }


    notifications.forEach(
        notification => {

            notification.read =
                true;

        }
    );


    renderNotifications();


    showToast(
        "All notifications marked as read."
    );

}


/* =====================================================
   DELETE
===================================================== */

async function deleteNotification(
    notificationId
) {

    const {
        error
    } = await supabaseClient
        .from("driver_notifications")
        .delete()
        .eq(
            "id",
            notificationId
        )
        .eq(
            "driver_id",
            currentDriver.driverUuid
        );


    if (error) {

        console.error(
            "Unable to delete notification:",
            error
        );

        showToast(
            "Unable to delete notification."
        );

        return;

    }


    notifications =
        notifications.filter(
            item =>
                item.id !==
                notificationId
        );


    renderNotifications();


    showToast(
        "Notification deleted."
    );

}


/* =====================================================
   CLEAR READ
===================================================== */

async function clearReadNotifications() {

    const readNotifications =
        notifications.filter(
            notification =>
                notification.read === true
        );


    if (
        readNotifications.length ===
        0
    ) {

        showToast(
            "There are no read notifications to clear."
        );

        return;

    }


    const {
        error
    } = await supabaseClient
        .from("driver_notifications")
        .delete()
        .eq(
            "driver_id",
            currentDriver.driverUuid
        )
        .eq(
            "read",
            true
        );


    if (error) {

        console.error(
            "Unable to clear read notifications:",
            error
        );

        showToast(
            "Unable to clear notifications."
        );

        return;

    }


    notifications =
        notifications.filter(
            notification =>
                notification.read !== true
        );


    renderNotifications();


    showToast(
        `${readNotifications.length} read ${
            readNotifications.length === 1
                ? "notification"
                : "notifications"
        } cleared.`
    );

}


/* =====================================================
   SIDEBAR
===================================================== */

function setupSidebar() {

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    const menu =
        document.getElementById(
            "menuButton"
        );


    const close =
        document.getElementById(
            "sidebarClose"
        );


    if (
        !sidebar ||
        !overlay ||
        !menu ||
        !close
    ) {

        return;

    }


    function openSidebar() {

        sidebar.classList.add(
            "open"
        );

        overlay.classList.remove(
            "hidden"
        );

    }


    function closeSidebar() {

        sidebar.classList.remove(
            "open"
        );

        overlay.classList.add(
            "hidden"
        );

    }


    menu.addEventListener(
        "click",
        openSidebar
    );


    close.addEventListener(
        "click",
        closeSidebar
    );


    overlay.addEventListener(
        "click",
        closeSidebar
    );

}


/* =====================================================
   TOAST
===================================================== */

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    const text =
        document.getElementById(
            "toastMessage"
        );


    if (
        !toast ||
        !text
    ) {

        return;

    }


    text.textContent =
        message;


    toast.classList.remove(
        "hidden"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.add(
                    "hidden"
                );

            },
            2500
        );

}


/* =====================================================
   SECURITY
===================================================== */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}