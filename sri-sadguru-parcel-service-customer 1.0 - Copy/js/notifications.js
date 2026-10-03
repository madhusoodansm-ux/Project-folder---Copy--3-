/* =========================================================
   SRI SADGURU PARCEL SERVICE
   CUSTOMER NOTIFICATIONS
   REAL SUPABASE DATA
========================================================= */

document.addEventListener("DOMContentLoaded", async function () {

    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    const notificationsList =
        document.getElementById("notificationsList");

    const noNotifications =
        document.getElementById("noNotifications");

    const notificationsLoading =
        document.getElementById("notificationsLoading");

    const totalNotifications =
        document.getElementById("totalNotifications");

    const unreadNotifications =
        document.getElementById("unreadNotifications");

    const paymentNotifications =
        document.getElementById("paymentNotifications");

    const deliveryNotifications =
        document.getElementById("deliveryNotifications");

    const markAllReadButton =
        document.getElementById("markAllReadButton");

    const backButton =
        document.getElementById("backButton");

    const filterButtons =
        document.querySelectorAll(
            ".notification-filter"
        );


    /* =====================================================
       MODAL ELEMENTS
    ===================================================== */

    const notificationModal =
        document.getElementById(
            "notificationModal"
        );

    const notificationModalOverlay =
        document.getElementById(
            "notificationModalOverlay"
        );

    const closeNotificationModal =
        document.getElementById(
            "closeNotificationModal"
        );

    const modalNotificationIcon =
        document.getElementById(
            "modalNotificationIcon"
        );

    const modalNotificationType =
        document.getElementById(
            "modalNotificationType"
        );

    const modalNotificationTitle =
        document.getElementById(
            "modalNotificationTitle"
        );

    const modalNotificationMessage =
        document.getElementById(
            "modalNotificationMessage"
        );

    const modalNotificationDate =
        document.getElementById(
            "modalNotificationDate"
        );

    const modalTrackingId =
        document.getElementById(
            "modalTrackingId"
        );

    const modalTrackingRow =
        document.getElementById(
            "modalTrackingRow"
        );

    const modalAmount =
        document.getElementById(
            "modalAmount"
        );

    const modalAmountRow =
        document.getElementById(
            "modalAmountRow"
        );

    const modalActionButton =
        document.getElementById(
            "modalActionButton"
        );


    /* =====================================================
       STATE
    ===================================================== */

    let notifications = [];

    let currentFilter = "all";

    let currentCustomerId = null;


    /* =====================================================
       ICONS
       No emojis.
    ===================================================== */

    function getNotificationIcon(type) {

        const icons = {

            booking: `
                <svg viewBox="0 0 24 24"
                     aria-hidden="true">
                    <path
                        d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linejoin="round"
                    />
                    <path
                        d="M4 7.5l8 4.5 8-4.5M12 12v9"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    />
                </svg>
            `,

            delivery: `
                <svg viewBox="0 0 24 24"
                     aria-hidden="true">
                    <rect
                        x="3"
                        y="5"
                        width="11"
                        height="12"
                        rx="1.5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    />
                    <path
                        d="M14 9h4l3 3v5h-7z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linejoin="round"
                    />
                    <circle
                        cx="7"
                        cy="18"
                        r="1.5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    />
                    <circle
                        cx="18"
                        cy="18"
                        r="1.5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    />
                </svg>
            `,

            payment: `
                <svg viewBox="0 0 24 24"
                     aria-hidden="true">
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    />
                    <path
                        d="M3 9h18M7 14h4"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                    />
                </svg>
            `,

            service: `
                <svg viewBox="0 0 24 24"
                     aria-hidden="true">
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    />
                    <path
                        d="M12 10v6"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                    />
                    <circle
                        cx="12"
                        cy="7"
                        r="1"
                        fill="currentColor"
                    />
                </svg>
            `

        };

        return (
            icons[type] ||
            icons.service
        );
    }


    /* =====================================================
       STATUS TEXT
    ===================================================== */

    function getStatusTitle(status) {

        const titles = {

            pending:
                "Booking Pending",

            confirmed:
                "Booking Confirmed",

            assigned:
                "Driver Assigned",

            pickup_started:
                "Pickup Started",

            picked_up:
                "Parcel Picked Up",

            in_transit:
                "Parcel In Transit",

            out_for_delivery:
                "Parcel Out for Delivery",

            delivered:
                "Parcel Delivered",

            cancelled:
                "Booking Cancelled"

        };

        return (
            titles[status] ||
            "Parcel Status Updated"
        );
    }


    /* =====================================================
       STATUS MESSAGE
    ===================================================== */

    function getStatusMessage(
        status,
        booking
    ) {

        const parcelName =
            booking.parcel_name ||
            "your parcel";

        const messages = {

            pending:
                `Your booking for ${parcelName} is pending.`,

            confirmed:
                `Your booking for ${parcelName} has been confirmed.`,

            assigned:
                `A driver has been assigned to your parcel.`,

            pickup_started:
                `Pickup for ${parcelName} has started.`,

            picked_up:
                `Your parcel has been picked up successfully.`,

            in_transit:
                `Your parcel is currently in transit to the destination.`,

            out_for_delivery:
                `Your parcel is out for delivery.`,

            delivered:
                `Your parcel has been successfully delivered.`,

            cancelled:
                `Your parcel booking has been cancelled.`

        };

        return (
            messages[status] ||
            `The status of ${parcelName} has been updated.`
        );
    }


    /* =====================================================
       PAYMENT NOTIFICATION
    ===================================================== */

    function createPaymentNotification(
        booking
    ) {

        if (
            booking.service_charge === null ||
            booking.service_charge === undefined
        ) {

            return null;
        }


        const amount =
            Number(booking.service_charge);


        if (
            !Number.isFinite(amount)
        ) {

            return null;
        }


        const paymentStatus =
            booking.payment_status ||
            "pending";


        let title =
            "Payment Amount Available";

        let message =
            `The service charge for booking ${booking.booking_id} is now available. Please complete the payment.`;


        if (paymentStatus === "paid") {

            title =
                "Payment Successful";

            message =
                `Payment for booking ${booking.booking_id} has been received successfully.`;

        } else if (
            paymentStatus === "failed"
        ) {

            title =
                "Payment Failed";

            message =
                `The payment for booking ${booking.booking_id} was not completed successfully.`;

        } else if (
            paymentStatus === "cancelled"
        ) {

            title =
                "Payment Cancelled";

            message =
                `The payment for booking ${booking.booking_id} has been cancelled.`;

        } else if (
            paymentStatus === "refunded"
        ) {

            title =
                "Payment Refunded";

            message =
                `The payment for booking ${booking.booking_id} has been refunded.`;
        }


        return {

            id:
                `payment-${booking.id}`,

            type:
                "payment",

            title:
                title,

            message:
                message,

            date:
                booking.updated_at ||
                booking.created_at,

            bookingId:
                booking.booking_id,

            amount:
                amount,

            action:
                "payment"

        };
    }


    /* =====================================================
       BOOKING CREATED NOTIFICATION
    ===================================================== */

    function createBookingNotification(
        booking
    ) {

        return {

            id:
                `booking-${booking.id}`,

            type:
                "booking",

            title:
                "Parcel Booking Created",

            message:
                `Your parcel booking ${booking.booking_id} has been created successfully.`,

            date:
                booking.created_at,

            bookingId:
                booking.booking_id,

            amount:
                null,

            action:
                "track"

        };
    }


    /* =====================================================
       STATUS HISTORY NOTIFICATION
    ===================================================== */

    function createStatusNotification(
        history,
        booking
    ) {

        return {

            id:
                `status-${history.id}`,

            type:
                getNotificationType(
                    history.status
                ),

            title:
                getStatusTitle(
                    history.status
                ),

            message:
                history.note ||
                getStatusMessage(
                    history.status,
                    booking
                ),

            date:
                history.changed_at,

            bookingId:
                booking.booking_id,

            amount:
                null,

            action:
                "track"

        };
    }


    /* =====================================================
       NOTIFICATION TYPE
    ===================================================== */

    function getNotificationType(
        status
    ) {

        if (
            status === "pending" ||
            status === "confirmed" ||
            status === "assigned"
        ) {

            return "booking";
        }


        if (
            status === "pickup_started" ||
            status === "picked_up" ||
            status === "in_transit" ||
            status === "out_for_delivery" ||
            status === "delivered"
        ) {

            return "delivery";
        }


        if (
            status === "cancelled"
        ) {

            return "alert";
        }


        return "service";
    }


    /* =====================================================
       READ STATUS STORAGE
    ===================================================== */

    function getReadStorageKey() {

        if (!currentCustomerId) {

            return null;
        }

        return (
            `sspCustomerNotificationRead_${currentCustomerId}`
        );
    }


    function loadReadStatus() {

        const storageKey =
            getReadStorageKey();

        if (!storageKey) {

            return {};
        }


        const saved =
            localStorage.getItem(
                storageKey
            );

        if (!saved) {

            return {};
        }


        try {

            return JSON.parse(saved);

        } catch (error) {

            return {};
        }
    }


    function saveReadStatus(
        readStatus
    ) {

        const storageKey =
            getReadStorageKey();

        if (!storageKey) {

            return;
        }


        localStorage.setItem(
            storageKey,
            JSON.stringify(
                readStatus
            )
        );
    }


    /* =====================================================
       APPLY READ STATUS
    ===================================================== */

    function applyReadStatus() {

        const readStatus =
            loadReadStatus();


        notifications.forEach(
            function (notification) {

                notification.read =
                    readStatus[
                        notification.id
                    ] === true;

            }
        );
    }


    /* =====================================================
       LOAD CUSTOMER NOTIFICATIONS
    ===================================================== */

    async function loadNotifications() {

        try {

            if (
                !window.supabaseClient
            ) {

                throw new Error(
                    "Supabase client is not available."
                );
            }


            if (
                !window.SSPAuth ||
                typeof SSPAuth.requireCustomer !==
                    "function"
            ) {

                throw new Error(
                    "Customer authentication is not available."
                );
            }


            const customer =
                await SSPAuth.requireCustomer();


            if (
                !customer ||
                !customer.user
            ) {

                throw new Error(
                    "Customer session not found."
                );
            }


            const user =
                customer.user;


            currentCustomerId =
                user.id;


            /* =============================================
               LOAD CUSTOMER BOOKINGS
            ============================================= */

            const {
                data: bookings,
                error: bookingsError
            } =
                await window.supabaseClient
                    .from("bookings")
                    .select(`
                        id,
                        booking_id,
                        parcel_name,
                        service_charge,
                        payment_status,
                        created_at,
                        updated_at
                    `)
                    .eq(
                        "customer_id",
                        user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (bookingsError) {

                throw bookingsError;
            }


            const bookingRows =
                bookings || [];


            const generatedNotifications =
                [];


            /* =============================================
               BOOKING + PAYMENT NOTIFICATIONS
            ============================================= */

            bookingRows.forEach(
                function (booking) {

                    generatedNotifications.push(
                        createBookingNotification(
                            booking
                        )
                    );


                    const paymentNotification =
                        createPaymentNotification(
                            booking
                        );


                    if (
                        paymentNotification
                    ) {

                        generatedNotifications.push(
                            paymentNotification
                        );
                    }

                }
            );


            /* =============================================
               LOAD STATUS HISTORY
            ============================================= */

            for (
                const booking of bookingRows
            ) {

                const {
                    data: historyRows,
                    error: historyError
                } =
                    await window.supabaseClient
                        .from(
                            "booking_status_history"
                        )
                        .select(`
                            id,
                            booking_id,
                            status,
                            note,
                            changed_at
                        `)
                        .eq(
                            "booking_id",
                            booking.id
                        )
                        .eq(
                            "customer_id",
                            user.id
                        )
                        .order(
                            "changed_at",
                            {
                                ascending: false
                            }
                        );


                if (historyError) {

                    console.warn(
                        "Status history could not be loaded:",
                        historyError
                    );

                    continue;
                }


                (
                    historyRows || []
                ).forEach(
                    function (history) {

                        generatedNotifications.push(
                            createStatusNotification(
                                history,
                                booking
                            )
                        );

                    }
                );

            }


            notifications =
                generatedNotifications;


            applyReadStatus();


            notifications.sort(
                function (a, b) {

                    return (
                        new Date(b.date) -
                        new Date(a.date)
                    );

                }
            );


            updateSummary();

            displayNotifications();


        } catch (error) {

            console.error(
                "Notification loading error:",
                error
            );


            notifications = [];


            updateSummary();


            notificationsList.innerHTML = "";


            noNotifications.style.display =
                "flex";


            const emptyText =
                noNotifications.querySelector(
                    "p"
                );


            if (emptyText) {

                emptyText.textContent =
                    "Notifications could not be loaded right now.";
            }

        } finally {

            notificationsLoading.style.display =
                "none";

        }

    }


    /* =====================================================
       FORMAT DATE
    ===================================================== */

    function formatDate(
        dateString
    ) {

        if (!dateString) {

            return "—";
        }


        const date =
            new Date(dateString);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";
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


    /* =====================================================
       FORMAT TIME
    ===================================================== */

    function formatTime(
        dateString
    ) {

        if (!dateString) {

            return "";
        }


        const date =
            new Date(dateString);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";
        }


        return date.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    /* =====================================================
       FORMAT AMOUNT
    ===================================================== */

    function formatAmount(
        amount
    ) {

        const numericAmount =
            Number(amount);


        if (
            !Number.isFinite(
                numericAmount
            )
        ) {

            return "—";
        }


        return numericAmount.toLocaleString(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2
            }
        );

    }


    /* =====================================================
       TYPE NAME
    ===================================================== */

    function getTypeName(
        type
    ) {

        const names = {

            booking: "Booking",

            delivery: "Delivery",

            payment: "Payment",

            service: "Service",

            alert: "Alert"

        };


        return (
            names[type] ||
            "Notification"
        );
    }


    /* =====================================================
       UPDATE SUMMARY
    ===================================================== */

    function updateSummary() {

        const total =
            notifications.length;


        const unread =
            notifications.filter(
                function (notification) {

                    return !notification.read;

                }
            ).length;


        const payments =
            notifications.filter(
                function (notification) {

                    return (
                        notification.type ===
                        "payment"
                    );

                }
            ).length;


        const deliveries =
            notifications.filter(
                function (notification) {

                    return (
                        notification.type ===
                            "delivery" ||
                        notification.type ===
                            "alert"
                    );

                }
            ).length;


        totalNotifications.textContent =
            total;


        unreadNotifications.textContent =
            unread;


        paymentNotifications.textContent =
            payments;


        deliveryNotifications.textContent =
            deliveries;


        if (unread === 0) {

            markAllReadButton.textContent =
                "All notifications read";

        } else {

            markAllReadButton.textContent =
                "Mark all as read";

        }

    }


    /* =====================================================
       FILTER
    ===================================================== */

    function getFilteredNotifications() {

        let filtered =
            [...notifications];


        if (
            currentFilter ===
            "unread"
        ) {

            filtered =
                filtered.filter(
                    function (notification) {

                        return !notification.read;

                    }
                );

        } else if (
            currentFilter !==
            "all"
        ) {

            filtered =
                filtered.filter(
                    function (notification) {

                        return (
                            notification.type ===
                            currentFilter
                        );

                    }
                );

        }


        filtered.sort(
            function (a, b) {

                return (
                    new Date(b.date) -
                    new Date(a.date)
                );

            }
        );


        return filtered;
    }


    /* =====================================================
       DISPLAY NOTIFICATIONS
    ===================================================== */

    function displayNotifications() {

        const filtered =
            getFilteredNotifications();


        notificationsList.innerHTML =
            "";


        if (
            filtered.length === 0
        ) {

            noNotifications.style.display =
                "flex";

            return;
        }


        noNotifications.style.display =
            "none";


        filtered.forEach(
            function (notification) {

                const card =
                    createNotificationCard(
                        notification
                    );


                notificationsList.appendChild(
                    card
                );

            }
        );

    }


    /* =====================================================
       CREATE CARD
    ===================================================== */

    function createNotificationCard(
        notification
    ) {

        const card =
            document.createElement(
                "article"
            );


        card.className =
            "notification-card";


        if (
            !notification.read
        ) {

            card.classList.add(
                "unread"
            );

        }


        /* Icon */

        const icon =
            document.createElement(
                "div"
            );


        icon.className =
            `notification-icon ${notification.type}`;


        icon.innerHTML =
            getNotificationIcon(
                notification.type
            );


        /* Content */

        const content =
            document.createElement(
                "div"
            );


        content.className =
            "notification-content";


        /* Top row */

        const topRow =
            document.createElement(
                "div"
            );


        topRow.className =
            "notification-top-row";


        const title =
            document.createElement(
                "h3"
            );


        title.className =
            "notification-title";


        title.textContent =
            notification.title;


        const time =
            document.createElement(
                "span"
            );


        time.className =
            "notification-time";


        time.textContent =
            `${formatDate(notification.date)} • ${formatTime(notification.date)}`;


        topRow.appendChild(
            title
        );


        topRow.appendChild(
            time
        );


        /* Message */

        const message =
            document.createElement(
                "p"
            );


        message.className =
            "notification-message";


        message.textContent =
            notification.message;


        /* Meta */

        const meta =
            document.createElement(
                "div"
            );


        meta.className =
            "notification-meta";


        const type =
            document.createElement(
                "span"
            );


        type.className =
            "notification-type";


        type.textContent =
            getTypeName(
                notification.type
            );


        meta.appendChild(
            type
        );


        if (
            notification.bookingId
        ) {

            const tracking =
                document.createElement(
                    "span"
                );


            tracking.className =
                "notification-tracking";


            tracking.textContent =
                `Booking ID: ${notification.bookingId}`;


            meta.appendChild(
                tracking
            );

        }


        content.appendChild(
            topRow
        );


        content.appendChild(
            message
        );


        content.appendChild(
            meta
        );


        /* Unread */

        if (
            !notification.read
        ) {

            const unreadDot =
                document.createElement(
                    "span"
                );


            unreadDot.className =
                "unread-dot";


            unreadDot.setAttribute(
                "aria-label",
                "Unread"
            );


            card.appendChild(
                unreadDot
            );

        }


        /* View button */

        const action =
            document.createElement(
                "div"
            );


        action.className =
            "notification-action";


        const viewButton =
            document.createElement(
                "button"
            );


        viewButton.type =
            "button";


        viewButton.className =
            "notification-view-button";


        viewButton.textContent =
            "View";


        viewButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                openNotification(
                    notification.id
                );

            }
        );


        action.appendChild(
            viewButton
        );


        card.appendChild(
            icon
        );


        card.appendChild(
            content
        );


        card.appendChild(
            action
        );


        card.addEventListener(
            "click",
            function () {

                openNotification(
                    notification.id
                );

            }
        );


        return card;
    }


    /* =====================================================
       OPEN NOTIFICATION
    ===================================================== */

    function openNotification(
        notificationId
    ) {

        const notification =
            notifications.find(
                function (item) {

                    return (
                        item.id ===
                        notificationId
                    );

                }
            );


        if (!notification) {

            return;
        }


        /* Mark read */

        notification.read =
            true;


        const readStatus =
            loadReadStatus();


        readStatus[
            notification.id
        ] = true;


        saveReadStatus(
            readStatus
        );


        updateSummary();


        /* Modal icon */

        modalNotificationIcon.innerHTML =
            getNotificationIcon(
                notification.type
            );


        modalNotificationIcon.className =
            `modal-notification-icon ${notification.type}`;


        /* Modal data */

        modalNotificationType.textContent =
            getTypeName(
                notification.type
            );


        modalNotificationTitle.textContent =
            notification.title;


        modalNotificationMessage.textContent =
            notification.message;


        modalNotificationDate.textContent =
            `${formatDate(notification.date)} • ${formatTime(notification.date)}`;


        /* Booking ID */

        if (
            notification.bookingId
        ) {

            modalTrackingRow.style.display =
                "flex";

            modalTrackingId.textContent =
                notification.bookingId;

        } else {

            modalTrackingRow.style.display =
                "none";

        }


        /* Amount */

        if (
            notification.amount !== null &&
            notification.amount !== undefined
        ) {

            modalAmountRow.style.display =
                "flex";

            modalAmount.textContent =
                formatAmount(
                    notification.amount
                );

        } else {

            modalAmountRow.style.display =
                "none";

        }


        /* Action */

        if (
            notification.action ===
            "payment"
        ) {

            modalActionButton.textContent =
                "Go to Payment";

            modalActionButton.style.display =
                "block";

        } else if (
            notification.action ===
            "track"
        ) {

            modalActionButton.textContent =
                "Track Parcel";

            modalActionButton.style.display =
                "block";

        } else {

            modalActionButton.style.display =
                "none";

        }


        modalActionButton.onclick =
            function () {

                handleNotificationAction(
                    notification
                );

            };


        notificationModal.style.display =
            "flex";


        document.body.style.overflow =
            "hidden";


        displayNotifications();
    }


    /* =====================================================
       ACTION
    ===================================================== */

    function handleNotificationAction(
        notification
    ) {

        if (
            notification.action ===
            "payment"
        ) {

            window.location.href =
                "payment.html";

            return;
        }


        if (
            notification.action ===
            "track"
        ) {

            if (
                notification.bookingId
            ) {

                window.location.href =
                    `track-parcel-details.html?id=${encodeURIComponent(notification.bookingId)}`;

            } else {

                window.location.href =
                    "track-parcel.html";

            }

        }

    }


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    function closeModal() {

        notificationModal.style.display =
            "none";

        document.body.style.overflow =
            "";

    }


    closeNotificationModal.addEventListener(
        "click",
        closeModal
    );


    notificationModalOverlay.addEventListener(
        "click",
        closeModal
    );


    /* =====================================================
       ESCAPE
    ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                notificationModal.style.display !==
                    "none"
            ) {

                closeModal();

            }

        }
    );


    /* =====================================================
       MARK ALL AS READ
    ===================================================== */

    markAllReadButton.addEventListener(
        "click",
        function () {

            const readStatus =
                loadReadStatus();


            notifications.forEach(
                function (notification) {

                    notification.read =
                        true;


                    readStatus[
                        notification.id
                    ] = true;

                }
            );


            saveReadStatus(
                readStatus
            );


            updateSummary();

            displayNotifications();

        }
    );


    /* =====================================================
       FILTER BUTTONS
    ===================================================== */

    filterButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    filterButtons.forEach(
                        function (item) {

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


                    displayNotifications();

                }
            );

        }
    );


    /* =====================================================
       BACK BUTTON
       Always return to Dashboard.
    ===================================================== */

    backButton.addEventListener(
        "click",
        function () {

            window.location.href =
                "dashboard.html";

        }
    );


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    await loadNotifications();

});