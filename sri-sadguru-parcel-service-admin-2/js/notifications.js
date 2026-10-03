/* =========================================================
   NOTIFICATIONS PAGE
   Sri Sadguru Siddarooda Parcel Service - Admin Portal
========================================================= */

"use strict";


/* =========================
   STORAGE
========================= */

const STORAGE_KEY = "ssp_demo_bookings_v2";


/* =========================
   PAGE STATE
========================= */

let notifications = [];
let activeFilter = "all";
let toastTimer = null;
let notificationSettings = null;


/* =========================
   DOM ELEMENTS
========================= */

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const notificationList = document.getElementById("notificationList");
const notificationEmptyState = document.getElementById("notificationEmptyState");

const markAllReadButton = document.getElementById("markAllReadButton");
const clearReadButton = document.getElementById("clearReadButton");

const unreadCountPill = document.getElementById("unreadCountPill");
const visibleNotificationCount = document.getElementById(
    "visibleNotificationCount"
);

const sidebarUnreadCount = document.getElementById(
    "sidebarUnreadCount"
);

const topbarUnreadCount = document.getElementById(
    "topbarUnreadCount"
);

const topbarNotificationButton = document.getElementById(
    "topbarNotificationButton"
);

const allCount = document.getElementById("allCount");
const unreadFilterCount = document.getElementById(
    "unreadFilterCount"
);
const bookingCount = document.getElementById("bookingCount");
const paymentCount = document.getElementById("paymentCount");
const driverCount = document.getElementById("driverCount");
const pickupCount = document.getElementById("pickupCount");
const deliveryCount = document.getElementById("deliveryCount");
const systemCount = document.getElementById("systemCount");

const toast = document.getElementById("toast");
const toastIcon = document.getElementById("toastIcon");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");
const closeToast = document.getElementById("closeToast");


/* =========================
   INITIALIZATION
========================= */

document.addEventListener("DOMContentLoaded", async () => {
    setupSidebar();
    setupFilters();
    setupActions();
    setupStorageListener();

    try {
        if (typeof window.requireAdminAuth !== "function") {
            throw new Error("Admin authentication is unavailable.");
        }

        await window.requireAdminAuth();
        notificationSettings =
            await window.SSPAdminSettings.get();
        initializeNotifications();
    } catch (error) {
        console.error(
            "Unable to load Admin notification settings:",
            error
        );
        notifications = [];
        showNotificationToast(
            "Notifications Unavailable",
            "Admin notification settings could not be loaded.",
            "!"
        );
    }

    renderNotifications();
    updateCounts();
});


/* =========================
   STORAGE HELPERS
========================= */

function readStorage() {

    try {

        const rawData = localStorage.getItem(STORAGE_KEY);

        if (!rawData) {
            return {};
        }

        const parsedData = JSON.parse(rawData);

        if (!parsedData || typeof parsedData !== "object") {
            return {};
        }

        return parsedData;

    } catch (error) {

        console.error(
            "Unable to read SSP demo storage:",
            error
        );

        return {};
    }
}


function getBookings() {

    const data = readStorage();

    /*
       Current SSP V2 structure:
       {
           "BK-0001": {...},
           "BK-0002": {...},
           ...
           "drivers": {...},
           "vehicles": {...},
           "customers": {...}
       }
    */

    return Object.values(data).filter(item => {

        return (
            item &&
            typeof item === "object" &&
            !Array.isArray(item) &&
            (
                item.id ||
                item.bookingId ||
                item.sender ||
                item.receiver ||
                item.route ||
                item.status
            )
        );

    });
}


/* =========================
   INITIALIZE NOTIFICATIONS
========================= */

function initializeNotifications() {

    notifications = buildNotificationsFromBookings();

    /*
       Keep the newest notifications first.
    */

    notifications.sort(
        (a, b) => b.createdAt - a.createdAt
    );
}


/* =========================
   BUILD NOTIFICATIONS
========================= */

function buildNotificationsFromBookings() {

    const bookings = getBookings();

    const generated = [];

    bookings.forEach((booking, index) => {

        const bookingId =
            booking.id ||
            booking.bookingId ||
            `BK-${String(index + 1).padStart(4, "0")}`;

        const customerName = getCustomerName(booking);

        const routeText = getRouteText(booking);

        const status = normalizeStatus(
            booking.status
        );

        const bookingTime = getBookingDateTime(booking);

        /*
           1. Booking notification
        */

        if (notificationSettings?.bookingNotifications) {
            generated.push(createNotification(
                `booking-created-${bookingId}`,
                "booking",
                "New Booking Created",
                `${bookingId} has been created${customerName ? ` for ${customerName}` : ""}.`,
                bookingTime,
                true,
                bookingId
            ));
        }


        /*
           2. Payment notification
        */

        const paymentStatus = getPaymentStatus(booking);

        if (notificationSettings?.paymentNotifications && paymentStatus) {

            if (
                paymentStatus.includes("paid") ||
                paymentStatus.includes("success") ||
                paymentStatus.includes("completed")
            ) {

                generated.push(
                    createNotification(
                        `payment-${bookingId}`,
                        "payment",
                        "Payment Received",
                        `Payment for ${bookingId} has been received successfully.`,
                        bookingTime + 1000,
                        false,
                        bookingId
                    )
                );

            } else if (
                paymentStatus.includes("pending")
            ) {

                generated.push(
                    createNotification(
                        `payment-pending-${bookingId}`,
                        "payment",
                        "Payment Pending",
                        `Payment for ${bookingId} is still pending.`,
                        bookingTime + 1000,
                        true,
                        bookingId
                    )
                );
            }
        }


        /*
           3. Pickup notification
        */

        if (
            notificationSettings?.bookingNotifications &&
            (
                status.includes("pickup") ||
                status.includes("picked") ||
                status.includes("assigned")
            )
        ) {

            generated.push(
                createNotification(
                    `pickup-${bookingId}`,
                    "pickup",
                    "Pickup Update",
                    `${bookingId} has an updated pickup status.`,
                    bookingTime + 2000,
                    true,
                    bookingId
                )
            );
        }


        /*
           4. Delivery notification
        */

        if (
            notificationSettings?.enableDeliveryNotifications &&
            notificationSettings?.deliveryNotifications &&
            (
                status.includes("delivered") ||
                status.includes("delivery")
            )
        ) {

            generated.push(
                createNotification(
                    `delivery-${bookingId}`,
                    "delivery",
                    "Delivery Update",
                    `${bookingId} has an updated delivery status${routeText ? ` for ${routeText}` : ""}.`,
                    bookingTime + 3000,
                    false,
                    bookingId
                )
            );
        }


        /*
           5. Driver assignment notification
        */

        const driverName = getDriverName(booking);

        if (
            driverName &&
            notificationSettings?.driverNotifications
        ) {

            generated.push(
                createNotification(
                    `driver-${bookingId}`,
                    "driver",
                    "Driver Assigned",
                    `${driverName} has been assigned to ${bookingId}.`,
                    bookingTime + 4000,
                    false,
                    bookingId
                )
            );
        }

    });


    /*
       Add a system notification if no booking data exists.
    */

    if (generated.length === 0) {

        generated.push(
            createNotification(
                "system-welcome",
                "system",
                "Notification Center Ready",
                "Your SSP Admin notification center is ready. New activity will appear here.",
                Date.now(),
                false,
                null
            )
        );
    }


    return generated;
}


/* =========================
   CREATE NOTIFICATION
========================= */

function createNotification(
    id,
    type,
    title,
    message,
    createdAt,
    unread,
    bookingId
) {

    return {
        id,
        type,
        title,
        message,
        createdAt,
        unread,
        bookingId
    };
}


/* =========================
   CUSTOMER NAME
========================= */

function getCustomerName(booking) {

    if (!booking) {
        return "";
    }

    if (
        typeof booking.customer === "string" &&
        booking.customer.trim()
    ) {
        return booking.customer.trim();
    }

    if (
        booking.customer &&
        typeof booking.customer === "object"
    ) {

        return (
            booking.customer.name ||
            booking.customer.customerName ||
            ""
        );
    }

    if (
        typeof booking.customerName === "string" &&
        booking.customerName.trim()
    ) {
        return booking.customerName.trim();
    }

    if (
        booking.sender &&
        typeof booking.sender === "object"
    ) {

        return (
            booking.sender.name ||
            booking.sender.fullName ||
            ""
        );
    }

    return "";
}


/* =========================
   DRIVER NAME
========================= */

function getDriverName(booking) {

    if (!booking) {
        return "";
    }

    if (
        booking.driver &&
        typeof booking.driver === "object"
    ) {

        return (
            booking.driver.name ||
            booking.driver.driverName ||
            ""
        );
    }

    if (
        typeof booking.driver === "string" &&
        booking.driver.trim()
    ) {

        return booking.driver.trim();
    }

    if (
        typeof booking.driverName === "string" &&
        booking.driverName.trim()
    ) {

        return booking.driverName.trim();
    }

    return "";
}


/* =========================
   ROUTE
========================= */

function getRouteText(booking) {

    if (!booking) {
        return "";
    }

    if (
        booking.route &&
        typeof booking.route === "object"
    ) {

        const from =
            booking.route.from ||
            booking.route.pickup ||
            booking.route.source ||
            "";

        const to =
            booking.route.to ||
            booking.route.delivery ||
            booking.route.destination ||
            "";

        if (from && to) {
            return `${from} → ${to}`;
        }
    }

    if (
        typeof booking.route === "string" &&
        booking.route.trim()
    ) {

        return booking.route.trim();
    }

    return "";
}


/* =========================
   STATUS
========================= */

function normalizeStatus(status) {

    if (
        status === null ||
        status === undefined
    ) {
        return "";
    }

    if (
        typeof status === "object"
    ) {

        return String(
            status.status ||
            status.name ||
            status.label ||
            ""
        ).toLowerCase();
    }

    return String(status).toLowerCase();
}


/* =========================
   PAYMENT STATUS
========================= */

function getPaymentStatus(booking) {

    if (!booking) {
        return "";
    }

    if (
        booking.payment &&
        typeof booking.payment === "object"
    ) {

        return String(
            booking.payment.status ||
            booking.payment.paymentStatus ||
            ""
        ).toLowerCase();
    }

    if (
        typeof booking.paymentStatus === "string"
    ) {

        return booking.paymentStatus.toLowerCase();
    }

    return "";
}


/* =========================
   BOOKING DATE/TIME
========================= */

function getBookingDateTime(booking) {

    if (!booking) {
        return Date.now();
    }

    const candidates = [
        booking.createdAt,
        booking.updatedAt,
        booking.bookingDateTime,
        booking.bookingDate
    ];

    for (const value of candidates) {

        if (!value) {
            continue;
        }

        const timestamp = new Date(value).getTime();

        if (!Number.isNaN(timestamp)) {
            return timestamp;
        }
    }

    return Date.now();
}


/* =========================
   FILTERS
========================= */

function setupFilters() {

    const filterButtons = document.querySelectorAll(
        ".notification-filter"
    );

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            const filter =
                button.dataset.filter || "all";

            activeFilter = filter;

            filterButtons.forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            renderNotifications();
        });

    });
}


/* =========================
   FILTER NOTIFICATIONS
========================= */

function getFilteredNotifications() {

    switch (activeFilter) {

        case "unread":

            return notifications.filter(
                notification => notification.unread
            );


        case "booking":

            return notifications.filter(
                notification =>
                    notification.type === "booking"
            );


        case "payment":

            return notifications.filter(
                notification =>
                    notification.type === "payment"
            );

        case "driver":

            return notifications.filter(
                notification =>
                    notification.type === "driver"
            );


        case "pickup":

            return notifications.filter(
                notification =>
                    notification.type === "pickup"
            );


        case "delivery":

            return notifications.filter(
                notification =>
                    notification.type === "delivery"
            );


        case "system":

            return notifications.filter(
                notification =>
                    notification.type === "system"
            );


        case "all":

        default:

            return [...notifications];
    }
}


/* =========================
   RENDER NOTIFICATIONS
========================= */

function renderNotifications() {

    if (!notificationList) {
        return;
    }

    notificationList.innerHTML = "";

    const filteredNotifications =
        getFilteredNotifications();


    /*
       Empty state
    */

    if (filteredNotifications.length === 0) {

        notificationEmptyState.hidden = false;

        visibleNotificationCount.textContent =
            "0 notifications";

        return;

    } else {

        notificationEmptyState.hidden = true;
    }


    /*
       Count
    */

    visibleNotificationCount.textContent =
        `${filteredNotifications.length} ${
            filteredNotifications.length === 1
                ? "notification"
                : "notifications"
        }`;


    /*
       Render
    */

    filteredNotifications.forEach(notification => {

        const element =
            createNotificationElement(notification);

        notificationList.appendChild(element);

    });
}


/* =========================
   CREATE NOTIFICATION ELEMENT
========================= */

function createNotificationElement(notification) {

    const article =
        document.createElement("article");

    article.className =
        `notification-item ${
            notification.unread ? "unread" : ""
        }`;

    article.dataset.notificationId =
        notification.id;


    /*
       Icon
    */

    const iconWrapper =
        document.createElement("div");

    iconWrapper.className =
        `notification-icon-wrapper ${notification.type}`;

    iconWrapper.textContent =
        getNotificationIcon(notification.type);


    /*
       Content
    */

    const content =
        document.createElement("div");

    content.className =
        "notification-content";


    /*
       Top row
    */

    const topRow =
        document.createElement("div");

    topRow.className =
        "notification-top-row";


    const title =
        document.createElement("div");

    title.className =
        "notification-title";

    title.textContent =
        notification.title;


    topRow.appendChild(title);


    if (notification.unread) {

        const unreadDot =
            document.createElement("span");

        unreadDot.className =
            "unread-dot";

        unreadDot.setAttribute(
            "aria-label",
            "Unread"
        );

        topRow.appendChild(unreadDot);
    }


    /*
       Message
    */

    const message =
        document.createElement("div");

    message.className =
        "notification-message";

    message.textContent =
        notification.message;


    /*
       Meta
    */

    const meta =
        document.createElement("div");

    meta.className =
        "notification-meta";


    const time =
        document.createElement("span");

    time.className =
        "notification-time";

    time.textContent =
        formatNotificationTime(
            notification.createdAt
        );


    const typeLabel =
        document.createElement("span");

    typeLabel.className =
        "notification-type-label";

    typeLabel.textContent =
        getNotificationTypeLabel(
            notification.type
        );


    meta.appendChild(time);
    meta.appendChild(typeLabel);


    content.appendChild(topRow);
    content.appendChild(message);
    content.appendChild(meta);


    /*
       Actions
    */

    const actions =
        document.createElement("div");

    actions.className =
        "notification-actions";


    /*
       Mark as read button
    */

    if (notification.unread) {

        const readButton =
            document.createElement("button");

        readButton.type = "button";

        readButton.className =
            "notification-action-button";

        readButton.title =
            "Mark as read";

        readButton.setAttribute(
            "aria-label",
            "Mark notification as read"
        );

        readButton.textContent =
            "✓";


        readButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                markNotificationAsRead(
                    notification.id
                );
            }
        );


        actions.appendChild(readButton);
    }


    /*
       Delete button
    */

    const deleteButton =
        document.createElement("button");

    deleteButton.type = "button";

    deleteButton.className =
        "notification-action-button delete";

    deleteButton.title =
        "Delete notification";

    deleteButton.setAttribute(
        "aria-label",
        "Delete notification"
    );

    deleteButton.textContent =
        "×";


    deleteButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            deleteNotification(
                notification.id
            );
        }
    );


    actions.appendChild(deleteButton);


    /*
       Assemble
    */

    article.appendChild(iconWrapper);
    article.appendChild(content);
    article.appendChild(actions);


    /*
       Clicking notification marks it read
    */

    article.addEventListener(
        "click",
        () => {

            if (notification.unread) {

                markNotificationAsRead(
                    notification.id
                );

            } else {

                showNotificationToast(
                    "Notification",
                    "This notification is already marked as read.",
                    "✓"
                );
            }

        }
    );


    return article;
}


/* =========================
   ICONS
========================= */

function getNotificationIcon(type) {

    switch (type) {

        case "booking":
            return "▣";

        case "payment":
            return "₹";

        case "driver":
            return "♙";

        case "pickup":
            return "↗";

        case "delivery":
            return "✓";

        case "system":
        default:
            return "⚙";
    }
}


/* =========================
   TYPE LABEL
========================= */

function getNotificationTypeLabel(type) {

    switch (type) {

        case "booking":
            return "Booking";

        case "payment":
            return "Payment";

        case "driver":
            return "Driver";

        case "pickup":
            return "Pickup";

        case "delivery":
            return "Delivery";

        case "system":
        default:
            return "System";
    }
}


/* =========================
   TIME FORMAT
========================= */

function formatNotificationTime(timestamp) {

    const date =
        new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "Recently";
    }

    const now =
        Date.now();

    const difference =
        now - date.getTime();

    const minute =
        60 * 1000;

    const hour =
        60 * minute;

    const day =
        24 * hour;


    if (difference < minute) {
        return "Just now";
    }

    if (difference < hour) {

        const minutes =
            Math.floor(difference / minute);

        return `${minutes} ${
            minutes === 1
                ? "minute"
                : "minutes"
        } ago`;
    }

    if (difference < day) {

        const hours =
            Math.floor(difference / hour);

        return `${hours} ${
            hours === 1
                ? "hour"
                : "hours"
        } ago`;
    }

    if (difference < 7 * day) {

        const days =
            Math.floor(difference / day);

        return `${days} ${
            days === 1
                ? "day"
                : "days"
        } ago`;
    }


    return window.SSPAdminSettings.formatDate(date);
}


/* =========================
   COUNTS
========================= */

function updateCounts() {

    const unread =
        notifications.filter(
            notification => notification.unread
        ).length;

    const drivers =
        notifications.filter(
            notification =>
                notification.type === "driver"
        ).length;


    const bookings =
        notifications.filter(
            notification =>
                notification.type === "booking"
        ).length;


    const payments =
        notifications.filter(
            notification =>
                notification.type === "payment"
        ).length;


    const pickups =
        notifications.filter(
            notification =>
                notification.type === "pickup"
        ).length;


    const deliveries =
        notifications.filter(
            notification =>
                notification.type === "delivery"
        ).length;


    const systems =
        notifications.filter(
            notification =>
                notification.type === "system"
        ).length;


    /*
       Page count
    */

    unreadCountPill.textContent =
        `${unread} ${
            unread === 1
                ? "Unread"
                : "Unread"
        }`;


    /*
       Sidebar count
    */

    sidebarUnreadCount.textContent =
        unread;


    sidebarUnreadCount.style.display =
        unread > 0
            ? "inline-flex"
            : "none";


    /*
       Topbar count
    */

    topbarUnreadCount.textContent =
        unread;

    if (unread > 0) {

        topbarUnreadCount.classList.add(
            "visible"
        );

    } else {

        topbarUnreadCount.classList.remove(
            "visible"
        );
    }


    /*
       Filter counts
    */

    allCount.textContent =
        notifications.length;

    unreadFilterCount.textContent =
        unread;

    bookingCount.textContent =
        bookings;

    paymentCount.textContent =
        payments;

    driverCount.textContent =
        drivers;

    pickupCount.textContent =
        pickups;

    deliveryCount.textContent =
        deliveries;

    systemCount.textContent =
        systems;


    /*
       Disable mark all button
       when nothing is unread.
    */

    markAllReadButton.disabled =
        unread === 0;
}


/* =========================
   MARK ONE AS READ
========================= */

function markNotificationAsRead(
    notificationId
) {

    const notification =
        notifications.find(
            item =>
                item.id === notificationId
        );

    if (!notification) {
        return;
    }

    if (!notification.unread) {
        return;
    }

    notification.unread = false;

    renderNotifications();

    updateCounts();

    showNotificationToast(
        "Notification Read",
        "The notification has been marked as read.",
        "✓"
    );
}


/* =========================
   MARK ALL AS READ
========================= */

function markAllNotificationsAsRead() {

    let changed = false;

    notifications.forEach(
        notification => {

            if (notification.unread) {

                notification.unread = false;

                changed = true;
            }
        }
    );


    if (!changed) {

        showNotificationToast(
            "Notifications",
            "There are no unread notifications.",
            "✓"
        );

        return;
    }


    renderNotifications();

    updateCounts();

    showNotificationToast(
        "All Notifications Read",
        "All unread notifications have been marked as read.",
        "✓"
    );
}


/* =========================
   DELETE NOTIFICATION
========================= */

function deleteNotification(
    notificationId
) {

    const index =
        notifications.findIndex(
            notification =>
                notification.id === notificationId
        );

    if (index === -1) {
        return;
    }

    notifications.splice(index, 1);

    renderNotifications();

    updateCounts();

    showNotificationToast(
        "Notification Deleted",
        "The notification has been removed.",
        "✓"
    );
}


/* =========================
   CLEAR READ
========================= */

function clearReadNotifications() {

    const unreadNotifications =
        notifications.filter(
            notification =>
                notification.unread
        );


    if (
        unreadNotifications.length ===
        notifications.length
    ) {

        showNotificationToast(
            "Notifications",
            "There are no read notifications to clear.",
            "✓"
        );

        return;
    }


    const removedCount =
        notifications.length -
        unreadNotifications.length;


    notifications =
        unreadNotifications;


    renderNotifications();

    updateCounts();

    showNotificationToast(
        "Read Notifications Cleared",
        `${removedCount} read ${
            removedCount === 1
                ? "notification"
                : "notifications"
        } have been cleared.`,
        "✓"
    );
}


/* =========================
   ACTION SETUP
========================= */

function setupActions() {

    markAllReadButton.addEventListener(
        "click",
        markAllNotificationsAsRead
    );


    clearReadButton.addEventListener(
        "click",
        clearReadNotifications
    );


    closeToast.addEventListener(
        "click",
        hideToast
    );


    /*
       Topbar notification button
       simply keeps user on notification page.
    */

    topbarNotificationButton.addEventListener(
        "click",
        () => {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );
}


/* =========================
   SIDEBAR
========================= */

function setupSidebar() {

    if (mobileMenuButton) {

        mobileMenuButton.addEventListener(
            "click",
            openSidebar
        );
    }


    if (sidebarToggle) {

        sidebarToggle.addEventListener(
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


    /*
       Close mobile sidebar after
       selecting a navigation item.
    */

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );

    navItems.forEach(item => {

        item.addEventListener(
            "click",
            () => {

                if (
                    window.innerWidth <= 850
                ) {
                    closeSidebar();
                }

            }
        );

    });
}


function openSidebar() {

    if (!sidebar) {
        return;
    }

    sidebar.classList.add("open");

    sidebarOverlay.classList.add("show");

    document.body.style.overflow =
        "hidden";
}


function closeSidebar() {

    if (!sidebar) {
        return;
    }

    sidebar.classList.remove("open");

    sidebarOverlay.classList.remove("show");

    document.body.style.overflow =
        "";
}


/* =========================
   STORAGE CHANGE LISTENER
========================= */

function setupStorageListener() {

    window.addEventListener(
        "storage",
        event => {

            if (
                event.key !== STORAGE_KEY
            ) {
                return;
            }

            /*
               Rebuild notifications when
               another same-origin tab changes
               the SSP booking storage.
            */

            initializeNotifications();

            renderNotifications();

            updateCounts();
        }
    );
}


/* =========================
   TOAST
========================= */

function showNotificationToast(
    title,
    message,
    icon = "✓"
) {

    toastTitle.textContent =
        title;

    toastMessage.textContent =
        message;

    toastIcon.textContent =
        icon;


    toast.classList.add("show");


    if (toastTimer) {
        clearTimeout(toastTimer);
    }


    toastTimer =
        setTimeout(
            hideToast,
            3500
        );
}


function hideToast() {

    toast.classList.remove(
        "show"
    );
}


/* =========================
   ESCAPE KEY
========================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeSidebar();

            hideToast();
        }

    }
);