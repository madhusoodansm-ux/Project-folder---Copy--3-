/* ============================================================
   SRI SADGURU SIDDAROODA PARCEL SERVICE
   ADMIN DASHBOARD - LIVE SUPABASE VERSION
   ============================================================ */

"use strict";


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /* ========================================================
           ADMIN AUTHENTICATION
           ======================================================== */

        const adminAccess =
            await requireAdminAuth();

        if (!adminAccess) {
            return;
        }


        /* ========================================================
           SUPABASE
           ======================================================== */

        const supabase =
            window.supabaseClient;

        if (!supabase) {

            console.error(
                "SSP Dashboard: Supabase client is not available."
            );

            showFatalError(
                "Supabase connection is not available."
            );

            return;
        }


        /* ========================================================
           CONSTANTS
           ======================================================== */

        const RECENT_ORDER_LIMIT = 6;


        const MORE_MENU_ROUTES = {

            "recent-orders":
                "bookings.html",

            "pickup":
                "pickup-management.html",

            "delivery":
                "delivery-management.html",

            "drivers":
                "drivers.html",

            "vehicles":
                "vehicles.html",

            "customers":
                "customers.html",

            "reports":
                "reports.html",

            "settings":
                "settings.html",

            "profile":
                "admin-profile.html",

            "notifications":
                "notifications.html"

        };


        /* ========================================================
           DOM ELEMENTS
           ======================================================== */

        const elements = {

            sidebar:
                document.getElementById(
                    "sidebar"
                ),

            sidebarOverlay:
                document.getElementById(
                    "sidebarOverlay"
                ),

            mobileMenuBtn:
                document.getElementById(
                    "mobileMenuBtn"
                ),

            desktopMenuBtn:
                document.getElementById(
                    "desktopMenuBtn"
                ),

            globalSearch:
                document.getElementById(
                    "globalSearch"
                ),

            notificationBtn:
                document.getElementById(
                    "notificationBtn"
                ),

            notificationCount:
                document.getElementById(
                    "notificationCount"
                ),

            adminProfileBtn:
                document.getElementById(
                    "adminProfileBtn"
                ),

            newBookingBtn:
                document.getElementById(
                    "newBookingBtn"
                ),

            logoutBtn:
                document.getElementById(
                    "logoutBtn"
                ),

            ordersList:
                document.getElementById(
                    "ordersList"
                ),

            activityDate:
                document.getElementById(
                    "activityDate"
                ),

            activityGrid:
                document.getElementById(
                    "activityGrid"
                ),

            viewAllOrdersBtn:
                document.getElementById(
                    "viewAllOrdersBtn"
                ),

            mobileMoreBtn:
                document.getElementById(
                    "mobileMoreBtn"
                ),

            mobileMoreMenu:
                document.getElementById(
                    "mobileMoreMenu"
                ),

            activityMessage:
                document.getElementById(
                    "activityMessage"
                ),


            /* Admin profile */

            sidebarAdminName:
                document.getElementById(
                    "sidebarAdminName"
                ),

            sidebarAdminRole:
                document.getElementById(
                    "sidebarAdminRole"
                ),

            sidebarAdminAvatar:
                document.getElementById(
                    "sidebarAdminAvatar"
                ),

            headerAdminName:
                document.getElementById(
                    "headerAdminName"
                ),

            headerAdminRole:
                document.getElementById(
                    "headerAdminRole"
                ),

            headerAdminAvatar:
                document.getElementById(
                    "headerAdminAvatar"
                ),


            /* Summary */

            summaryNewBookings:
                document.getElementById(
                    "summaryNewBookings"
                ),

            summaryNewBookingsDescription:
                document.getElementById(
                    "summaryNewBookingsDescription"
                ),

            summaryActiveDrivers:
                document.getElementById(
                    "summaryActiveDrivers"
                ),

            summaryPendingPickup:
                document.getElementById(
                    "summaryPendingPickup"
                ),

            summaryPendingPayments:
                document.getElementById(
                    "summaryPendingPayments"
                ),


            /* Activity */

            activityTotalBookings:
                document.getElementById(
                    "activityTotalBookings"
                ),

            activityNewBooking:
                document.getElementById(
                    "activityNewBooking"
                ),

            activityDelivered:
                document.getElementById(
                    "activityDelivered"
                ),

            activityPayment:
                document.getElementById(
                    "activityPayment"
                ),

            activityCancelled:
                document.getElementById(
                    "activityCancelled"
                ),

            activityInTransit:
                document.getElementById(
                    "activityInTransit"
                ),

            activityPriceAssigned:
                document.getElementById(
                    "activityPriceAssigned"
                ),

            activityPriceNotAssigned:
                document.getElementById(
                    "activityPriceNotAssigned"
                )

        };


        /* ========================================================
           STATE
           ======================================================== */

        const state = {

            adminUser: null,

            bookings: [],

            profiles: [],

            drivers: [],

            currentFilter: "all",

            currentSearch: "",

            selectedActivity: null,

            toastTimer: null,

            touchStartX: 0,

            touchStartY: 0,

            loading: false

        };


        /* ========================================================
           BASIC HELPERS
           ======================================================== */

        function escapeHTML(
            value
        ) {

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


        function showFatalError(
            message
        ) {

            const orders =
                document.getElementById(
                    "ordersList"
                );

            if (!orders) {
                return;
            }

            orders.innerHTML = `
                <div class="empty-orders">
                    ${escapeHTML(message)}
                </div>
            `;

        }


        function isMobile() {

            return (
                window.innerWidth <= 768
            );

        }


        function getInitials(
            name
        ) {

            const parts =
                String(
                    name || "Admin"
                )
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);

            if (!parts.length) {
                return "AD";
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


        /* ========================================================
           STATUS
           ======================================================== */

        function normalizeStatus(
            status
        ) {

            return String(
                status || ""
            )
                .trim()
                .toLowerCase()
                .replaceAll(
                    "-",
                    "_"
                )
                .replaceAll(
                    " ",
                    "_"
                );

        }


        function statusText(
            status
        ) {

            const value =
                normalizeStatus(
                    status
                );

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
                "Unknown"
            );

        }


        function statusGroup(
            booking
        ) {

            const status =
                normalizeStatus(
                    booking.status
                );


            if (
                status === "pending"
            ) {

                return "new";

            }


            if (
                status === "assigned" ||
                Boolean(
                    booking.driver_id
                )
            ) {

                return "assigned";

            }


            if (
                status === "in_transit" ||
                status === "out_for_delivery"
            ) {

                return "in-transit";

            }


            if (
                status === "delivered"
            ) {

                return "delivered";

            }


            if (
                status === "cancelled"
            ) {

                return "cancelled";

            }


            return status;

        }


        /* ========================================================
           PROFILE HELPERS
           ======================================================== */

        function profileById(
            id
        ) {

            if (!id) {
                return null;
            }

            return (
                state.profiles.find(
                    profile =>
                        profile.id === id
                ) ||
                null
            );

        }


        function customerName(
            booking
        ) {

            const profile =
                profileById(
                    booking.customer_id
                );


            if (
                profile?.full_name?.trim()
            ) {

                return profile
                    .full_name
                    .trim();

            }


            if (
                profile?.email?.trim()
            ) {

                return profile
                    .email
                    .trim();

            }


            if (
                booking.pickup_name?.trim()
            ) {

                return booking
                    .pickup_name
                    .trim();

            }


            return "Customer";

        }


        function driverName(
            booking
        ) {

            const driver =
                state.drivers.find(
                    item =>
                        String(item.id) ===
                        String(booking.driver_id || "")
                );

            const profile =
                driver?.profile_id
                    ? profileById(driver.profile_id)
                    : null;


            if (
                profile?.full_name?.trim() ||
                driver?.name?.trim()
            ) {

                return (
                    profile?.full_name ||
                    driver?.name
                ).trim();

            }


            if (
                profile?.email?.trim()
            ) {

                return profile
                    .email
                    .trim();

            }


            return "Unassigned";

        }


        /* ========================================================
           PRICE
           ======================================================== */

        function bookingPrice(
            booking
        ) {

            if (
                booking.service_charge ===
                    null ||
                booking.service_charge ===
                    undefined ||
                booking.service_charge ===
                    ""
            ) {

                return "Price Not Assigned";

            }


            const amount =
                Number(
                    booking.service_charge
                );


            if (
                !Number.isFinite(
                    amount
                )
            ) {

                return "Price Not Assigned";

            }


            return (
                "₹" +
                amount.toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits:
                            0,

                        maximumFractionDigits:
                            2
                    }
                )
            );

        }


        /* ========================================================
           DATE / TIME
           ======================================================== */

        function bookingTimestamp(
            booking
        ) {

            const timestamp =
                Date.parse(
                    booking.created_at ||
                    ""
                );

            return Number.isFinite(
                timestamp
            )
                ? timestamp
                : 0;

        }


        function formatDateTime(
            value
        ) {

            if (!value) {
                return "—";
            }


            const date =
                new Date(
                    value
                );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return "—";

            }


            return window.SSPAdminSettings.formatDateTime(
                date,
                "en-IN",
                "Asia/Kolkata"
            );

        }


        function businessDate(
            value
        ) {

            if (!value) {
                return "";
            }


            const date =
                new Date(
                    value
                );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return "";

            }


            return date.toLocaleDateString(
                "en-CA",
                {
                    timeZone:
                        "Asia/Kolkata"
                }
            );

        }


        function todayBusinessDate() {

            return businessDate(
                new Date().toISOString()
            );

        }


        function formatSelectedDate(
            dateString
        ) {

            if (!dateString) {
                return "selected date";
            }


            const date =
                new Date(
                    `${dateString}T00:00:00`
                );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return dateString;

            }


            return window.SSPAdminSettings.formatDate(date);

        }


        /* ========================================================
           TOAST
           ======================================================== */

        function showActivityMessage(
            message
        ) {

            if (
                !elements.activityMessage
            ) {

                return;

            }


            elements
                .activityMessage
                .textContent =
                    message;


            elements
                .activityMessage
                .classList
                .add(
                    "show"
                );


            clearTimeout(
                state.toastTimer
            );


            state.toastTimer =
                setTimeout(
                    () => {

                        elements
                            .activityMessage
                            .classList
                            .remove(
                                "show"
                            );

                    },
                    2500
                );

        }


        /* ========================================================
           ADMIN PROFILE
           ======================================================== */

        function setAdminProfile(
            profile
        ) {

            const name =
                profile?.full_name?.trim() ||
                profile?.email ||
                "Admin";


            const avatar =
                getInitials(
                    name
                );


            if (
                elements.sidebarAdminName
            ) {

                elements
                    .sidebarAdminName
                    .textContent =
                        name;

            }


            if (
                elements.sidebarAdminRole
            ) {

                elements
                    .sidebarAdminRole
                    .textContent =
                        "Admin";

            }


            if (
                elements.sidebarAdminAvatar
            ) {

                elements
                    .sidebarAdminAvatar
                    .textContent =
                        avatar;

            }


            if (
                elements.headerAdminName
            ) {

                elements
                    .headerAdminName
                    .textContent =
                        name;

            }


            if (
                elements.headerAdminRole
            ) {

                elements
                    .headerAdminRole
                    .textContent =
                        "Admin";

            }


            if (
                elements.headerAdminAvatar
            ) {

                elements
                    .headerAdminAvatar
                    .textContent =
                        avatar;

            }

        }


        async function loadAdminProfile() {

            const user =
                state.adminUser;


            if (!user?.id) {
                return;
            }


            const {
                data,
                error
            } =
                await supabase
                    .from(
                        "profiles"
                    )
                    .select(`
                        id,
                        email,
                        phone,
                        full_name,
                        role,
                        status,
                        last_login_at
                    `)
                    .eq(
                        "id",
                        user.id
                    )
                    .maybeSingle();


            if (error) {

                console.error(
                    "Admin profile load failed:",
                    error
                );

                return;

            }


            if (
                !data ||
                data.role !== "admin" ||
                data.status !== "active"
            ) {

                await supabase
                    .auth
                    .signOut();

                window.location.replace(
                    "../index.html"
                );

                return;

            }


            setAdminProfile(
                data
            );

        }


        /* ========================================================
           LOAD REAL SUPABASE DATA
           ======================================================== */

        async function loadDashboardData() {

            state.loading = true;


            try {

                const [
                    bookingsResult,
                    profilesResult,
                    driversResult
                ] = await Promise.allSettled([

                    supabase
                        .from(
                            "bookings"
                        )
                        .select(`
                            id,
                            booking_id,
                            customer_id,
                            pickup_name,
                            pickup_city,
                            receiver_name,
                            delivery_city,
                            status,
                            call_confirmation_status,
                            driver_id,
                            service_charge,
                            payment_status,
                            payment_method,
                            created_at,
                            updated_at
                        `)
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        ),


                    supabase
                        .from(
                            "profiles"
                        )
                        .select(`
                            id,
                            email,
                            phone,
                            full_name,
                            role,
                            status
                        `)
                        .in(
                            "role",
                            [
                                "customer",
                                "driver"
                            ]
                        ),

                    supabase
                        .from("drivers")
                        .select("id,profile_id,driver_id,name")

                ]);


                if (bookingsResult.status === "rejected") {
                    throw new Error(
                        `Unable to load bookings: ${bookingsResult.reason?.message || bookingsResult.reason}`
                    );
                }

                if (bookingsResult.value.error) {
                    throw new Error(
                        `Unable to load bookings: ${bookingsResult.value.error.message}`
                    );
                }

                state.bookings =
                    Array.isArray(
                        bookingsResult.value.data
                    )
                        ? bookingsResult.value.data
                        : [];

                if (
                    profilesResult.status === "rejected" ||
                    profilesResult.value.error
                ) {
                    console.error(
                        "Dashboard customer/driver profile details could not be loaded; booking rows will still be shown:",
                        profilesResult.status === "rejected"
                            ? profilesResult.reason
                            : profilesResult.value.error
                    );
                    state.profiles = [];
                } else {
                    state.profiles =
                        Array.isArray(
                            profilesResult.value.data
                        )
                            ? profilesResult.value.data
                            : [];
                }

                if (
                    driversResult.status === "rejected" ||
                    driversResult.value.error
                ) {
                    console.error(
                        "Dashboard driver details could not be loaded; booking rows will still be shown:",
                        driversResult.status === "rejected"
                            ? driversResult.reason
                            : driversResult.value.error
                    );
                    state.drivers = [];
                } else {
                    state.drivers =
                        Array.isArray(
                            driversResult.value.data
                        )
                            ? driversResult.value.data
                            : [];
                }

            } catch (
                error
            ) {

                console.error(
                    "Dashboard data load failed:",
                    error
                );


                state.bookings = [];

                state.profiles = [];

                state.drivers = [];


                showFatalError(
                    error?.message ||
                    "Unable to load live dashboard data."
                );


            } finally {

                state.loading = false;

            }

        }


        /* ========================================================
           SUMMARY CARDS
           ======================================================== */

        function updateSummaryCards() {

            const bookings =
                state.bookings;


            const today =
                todayBusinessDate();


            const todayBookings =
                bookings.filter(
                    booking =>
                        businessDate(
                            booking.created_at
                        ) === today
                );


            const activeDrivers =
                state.profiles.filter(
                    profile =>
                        profile.role ===
                            "driver" &&
                        profile.status ===
                            "active"
                ).length;


            const pendingPickup =
                bookings.filter(
                    booking => {

                        const status =
                            normalizeStatus(
                                booking.status
                            );


                        return [
                            "pending",
                            "confirmed",
                            "assigned"
                        ].includes(
                            status
                        );

                    }
                ).length;


            const pendingPayments =
                bookings.filter(
                    booking =>
                        normalizeStatus(
                            booking.payment_status
                        ) === "pending"
                ).length;


            if (
                elements.summaryNewBookings
            ) {

                elements
                    .summaryNewBookings
                    .textContent =
                        bookings.length;

            }


            if (
                elements.summaryNewBookingsDescription
            ) {

                elements
                    .summaryNewBookingsDescription
                    .textContent =
                        `${todayBookings.length} today`;

            }


            if (
                elements.summaryActiveDrivers
            ) {

                elements
                    .summaryActiveDrivers
                    .textContent =
                        activeDrivers;

            }


            if (
                elements.summaryPendingPickup
            ) {

                elements
                    .summaryPendingPickup
                    .textContent =
                        pendingPickup;

            }


            if (
                elements.summaryPendingPayments
            ) {

                elements
                    .summaryPendingPayments
                    .textContent =
                        pendingPayments;

            }

        }


        /* ========================================================
           RECENT ORDERS
           ======================================================== */

        function renderOrders() {

            if (
                !elements.ordersList
            ) {

                return;

            }


            const search =
                state.currentSearch;


            const orders =
                [...state.bookings]
                    .sort(
                        (
                            first,
                            second
                        ) =>
                            bookingTimestamp(
                                second
                            ) -
                            bookingTimestamp(
                                first
                            )
                    )
                    .filter(
                        booking => {

                            const group =
                                statusGroup(
                                    booking
                                );


                            const filterMatches =
                                state.currentFilter ===
                                    "all" ||
                                group ===
                                    state.currentFilter;


                            const customer =
                                customerName(
                                    booking
                                );


                            const driver =
                                driverName(
                                    booking
                                );


                            const searchable =
                                [

                                    booking.booking_id,

                                    customer,

                                    driver,

                                    booking.pickup_city,

                                    booking.delivery_city,

                                    booking.receiver_name,

                                    statusText(
                                        booking.status
                                    ),

                                    bookingPrice(
                                        booking
                                    ),

                                    booking.payment_status

                                ]
                                    .filter(
                                        Boolean
                                    )
                                    .join(
                                        " "
                                    )
                                    .toLowerCase();


                            return (
                                filterMatches &&
                                searchable.includes(
                                    search
                                )
                            );

                        }
                    )
                    .slice(
                        0,
                        RECENT_ORDER_LIMIT
                    );


            if (!orders.length) {

                elements
                    .ordersList
                    .innerHTML = `
                        <div class="empty-orders">
                            No matching orders found.
                        </div>
                    `;

                return;

            }


            elements
                .ordersList
                .innerHTML =
                    orders
                        .map(
                            booking => {

                                const customer =
                                    customerName(
                                        booking
                                    );


                                const from =
                                    booking.pickup_city ||
                                    booking.pickup_name ||
                                    "—";


                                const to =
                                    booking.delivery_city ||
                                    "—";


                                const group =
                                    statusGroup(
                                        booking
                                    );


                                return `

                                    <div
                                        class="order-row"
                                        data-booking-id="${escapeHTML(
                                            booking.booking_id
                                        )}"
                                    >

                                        <button
                                            class="tracking-id"
                                            type="button"
                                            data-booking-id="${escapeHTML(
                                                booking.booking_id
                                            )}"
                                        >
                                            #${escapeHTML(
                                                booking.booking_id
                                            )}
                                        </button>


                                        <div
                                            class="customer-info"
                                        >

                                            <strong
                                                class="customer-name"
                                            >
                                                ${escapeHTML(
                                                    customer
                                                )}
                                            </strong>


                                            <span
                                                class="route"
                                            >

                                                ${escapeHTML(
                                                    from
                                                )}

                                                <i
                                                    class="fa-solid fa-arrow-right"
                                                ></i>

                                                ${escapeHTML(
                                                    to
                                                )}

                                            </span>

                                        </div>


                                        <div
                                            class="order-status-wrap"
                                        >

                                            <span
                                                class="
                                                    status-badge
                                                    status-${escapeHTML(
                                                        group
                                                    )}
                                                "
                                            >
                                                ${escapeHTML(
                                                    statusText(
                                                        booking.status
                                                    )
                                                )}
                                            </span>

                                        </div>


                                        <div
                                            class="order-meta"
                                        >

                                            <strong
                                                class="order-price"
                                            >
                                                ${escapeHTML(
                                                    bookingPrice(
                                                        booking
                                                    )
                                                )}
                                            </strong>


                                            <span
                                                class="order-time"
                                            >
                                                ${escapeHTML(
                                                    formatDateTime(
                                                        booking.created_at
                                                    )
                                                )}
                                            </span>

                                        </div>

                                    </div>

                                `;

                            }
                        )
                        .join(
                            ""
                        );


            elements
                .ordersList
                .querySelectorAll(
                    ".tracking-id"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                const id =
                                    button.dataset
                                        .bookingId;


                                if (!id) {
                                    return;
                                }


                                window.location.href =
                                    `bookings-details.html?id=${encodeURIComponent(
                                        id
                                    )}`;

                            }
                        );

                    }
                );

        }


        /* ========================================================
           ACTIVITY DATA
           ======================================================== */

        function getActivityBookings() {

            const selectedDate =
                elements.activityDate?.value ||
                todayBusinessDate();


            return state.bookings.filter(
                booking =>
                    businessDate(
                        booking.created_at
                    ) === selectedDate
            );

        }


        function updateActivityCards() {

            const bookings =
                getActivityBookings();


            const total =
                bookings.length;


            const newCount =
                bookings.filter(
                    booking =>
                        normalizeStatus(
                            booking.status
                        ) === "pending"
                ).length;


            const delivered =
                bookings.filter(
                    booking =>
                        normalizeStatus(
                            booking.status
                        ) === "delivered"
                ).length;


            const paid =
                bookings.filter(
                    booking =>
                        normalizeStatus(
                            booking.payment_status
                        ) === "paid"
                ).length;


            const cancelled =
                bookings.filter(
                    booking =>
                        normalizeStatus(
                            booking.status
                        ) === "cancelled"
                ).length;


            const inTransit =
                bookings.filter(
                    booking =>
                        [
                            "in_transit",
                            "out_for_delivery"
                        ].includes(
                            normalizeStatus(
                                booking.status
                            )
                        )
                ).length;


            const priceAssigned =
                bookings.filter(
                    booking =>
                        booking.service_charge !==
                            null &&
                        booking.service_charge !==
                            undefined &&
                        booking.service_charge !==
                            ""
                ).length;


            const priceNotAssigned =
                Math.max(
                    0,
                    total -
                    priceAssigned
                );


            if (
                elements.activityTotalBookings
            ) {

                elements
                    .activityTotalBookings
                    .textContent =
                        total;

            }


            if (
                elements.activityNewBooking
            ) {

                elements
                    .activityNewBooking
                    .textContent =
                        newCount;

            }


            if (
                elements.activityDelivered
            ) {

                elements
                    .activityDelivered
                    .textContent =
                        delivered;

            }


            if (
                elements.activityPayment
            ) {

                elements
                    .activityPayment
                    .textContent =
                        paid;

            }


            if (
                elements.activityCancelled
            ) {

                elements
                    .activityCancelled
                    .textContent =
                        cancelled;

            }


            if (
                elements.activityInTransit
            ) {

                elements
                    .activityInTransit
                    .textContent =
                        inTransit;

            }


            if (
                elements.activityPriceAssigned
            ) {

                elements
                    .activityPriceAssigned
                    .textContent =
                        priceAssigned;

            }


            if (
                elements.activityPriceNotAssigned
            ) {

                elements
                    .activityPriceNotAssigned
                    .textContent =
                        priceNotAssigned;

            }

        }


        /* ========================================================
           ACTIVITY MESSAGES
           ======================================================== */

        function getActivityMessage(
            activity
        ) {

            const bookings =
                getActivityBookings();


            const total =
                bookings.length;


            const values = {

                "total-bookings":
                    total,

                "new-booking":
                    bookings.filter(
                        booking =>
                            normalizeStatus(
                                booking.status
                            ) === "pending"
                    ).length,

                "delivered":
                    bookings.filter(
                        booking =>
                            normalizeStatus(
                                booking.status
                            ) === "delivered"
                    ).length,

                "payment":
                    bookings.filter(
                        booking =>
                            normalizeStatus(
                                booking.payment_status
                            ) === "paid"
                    ).length,

                "cancelled":
                    bookings.filter(
                        booking =>
                            normalizeStatus(
                                booking.status
                            ) === "cancelled"
                    ).length,

                "in-transit":
                    bookings.filter(
                        booking =>
                            [
                                "in_transit",
                                "out_for_delivery"
                            ].includes(
                                normalizeStatus(
                                    booking.status
                                )
                            )
                    ).length,

                "price-assigned":
                    bookings.filter(
                        booking =>
                            booking.service_charge !==
                                null &&
                            booking.service_charge !==
                                undefined &&
                            booking.service_charge !==
                                ""
                    ).length

            };


            if (
                activity ===
                "price-not-assigned"
            ) {

                return (
                    `${Math.max(
                        0,
                        total -
                        values[
                            "price-assigned"
                        ]
                    )} bookings do not have pricing assigned for ` +
                    `${formatSelectedDate(
                        elements.activityDate?.value
                    )}.`
                );

            }


            const labels = {

                "total-bookings":
                    "total bookings",

                "new-booking":
                    "new bookings",

                "delivered":
                    "delivered bookings",

                "payment":
                    "paid bookings",

                "cancelled":
                    "cancelled bookings",

                "in-transit":
                    "in-transit bookings",

                "price-assigned":
                    "bookings with pricing assigned"

            };


            if (
                !(activity in values)
            ) {

                return (
                    `Dashboard activity for ` +
                    `${formatSelectedDate(
                        elements.activityDate?.value
                    )}.`
                );

            }


            return (
                `${values[activity]} ` +
                `${labels[activity]} for ` +
                `${formatSelectedDate(
                    elements.activityDate?.value
                )}.`
            );

        }


        function initializeActivityCards() {

            document
                .querySelectorAll(
                    ".activity-card"
                )
                .forEach(
                    card => {

                        card.type =
                            "button";


                        card.addEventListener(
                            "click",
                            () => {

                                state.selectedActivity =
                                    card.dataset
                                        .activity ||
                                    null;


                                document
                                    .querySelectorAll(
                                        ".activity-card"
                                    )
                                    .forEach(
                                        item => {

                                            item.classList
                                                .remove(
                                                    "activity-selected"
                                                );

                                        }
                                    );


                                card.classList.add(
                                    "activity-selected"
                                );


                                showActivityMessage(
                                    getActivityMessage(
                                        state.selectedActivity
                                    )
                                );

                            }
                        );

                    }
                );

        }


        /* ========================================================
           DATE SELECTOR
           ======================================================== */

        function initializeDateSelector() {

            if (
                !elements.activityDate
            ) {

                return;

            }


            if (
                !elements
                    .activityDate
                    .value
            ) {

                elements
                    .activityDate
                    .value =
                        todayBusinessDate();

            }


            elements
                .activityDate
                .addEventListener(
                    "change",
                    () => {

                        updateActivityCards();


                        showActivityMessage(
                            `Showing activity for ${formatSelectedDate(
                                elements
                                    .activityDate
                                    .value
                            )}`
                        );

                    }
                );

        }


        /* ========================================================
           FILTERS
           ======================================================== */

        function initializeFilters() {

            document
                .querySelectorAll(
                    ".filter-btn"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                state.currentFilter =
                                    button.dataset
                                        .filter ||
                                    "all";


                                document
                                    .querySelectorAll(
                                        ".filter-btn"
                                    )
                                    .forEach(
                                        item => {

                                            const active =
                                                item ===
                                                button;


                                            item.classList
                                                .toggle(
                                                    "active",
                                                    active
                                                );


                                            item.setAttribute(
                                                "aria-selected",
                                                String(
                                                    active
                                                )
                                            );

                                        }
                                    );


                                renderOrders();

                            }
                        );

                    }
                );

        }


        /* ========================================================
           SEARCH
           ======================================================== */

        function initializeSearch() {

            if (
                !elements.globalSearch
            ) {

                return;

            }


            elements
                .globalSearch
                .addEventListener(
                    "input",
                    () => {

                        state.currentSearch =
                            elements
                                .globalSearch
                                .value
                                .trim()
                                .toLowerCase();


                        renderOrders();

                    }
                );

        }


        /* ========================================================
           MOBILE SIDEBAR
           ======================================================== */

        function openMobileSidebar() {

            if (
                !elements.sidebar
            ) {

                return;

            }


            elements
                .sidebar
                .classList
                .add(
                    "mobile-sidebar-open"
                );


            document.body
                .classList
                .add(
                    "sidebar-open"
                );


            elements
                .sidebarOverlay
                ?.classList
                .add(
                    "show"
                );


            elements
                .sidebarOverlay
                ?.setAttribute(
                    "aria-hidden",
                    "false"
                );


            if (
                elements.mobileMenuBtn
            ) {

                elements
                    .mobileMenuBtn
                    .setAttribute(
                        "aria-expanded",
                        "true"
                    );


                elements
                    .mobileMenuBtn
                    .setAttribute(
                        "aria-label",
                        "Close menu"
                    );


                const icon =
                    elements
                        .mobileMenuBtn
                        .querySelector(
                            "i"
                        );


                if (icon) {

                    icon.classList
                        .remove(
                            "fa-bars"
                        );

                    icon.classList
                        .add(
                            "fa-xmark"
                        );

                }

            }

        }


        function closeMobileSidebar() {

            if (
                !elements.sidebar
            ) {

                return;

            }


            elements
                .sidebar
                .classList
                .remove(
                    "mobile-sidebar-open"
                );


            document.body
                .classList
                .remove(
                    "sidebar-open"
                );


            elements
                .sidebarOverlay
                ?.classList
                .remove(
                    "show"
                );


            elements
                .sidebarOverlay
                ?.setAttribute(
                    "aria-hidden",
                    "true"
                );


            if (
                elements.mobileMenuBtn
            ) {

                elements
                    .mobileMenuBtn
                    .setAttribute(
                        "aria-expanded",
                        "false"
                    );


                elements
                    .mobileMenuBtn
                    .setAttribute(
                        "aria-label",
                        "Open menu"
                    );


                const icon =
                    elements
                        .mobileMenuBtn
                        .querySelector(
                            "i"
                        );


                if (icon) {

                    icon.classList
                        .remove(
                            "fa-xmark"
                        );

                    icon.classList
                        .add(
                            "fa-bars"
                        );

                }

            }

        }


        /* ========================================================
           MORE MENU
           ======================================================== */

        function openMoreMenu() {

            if (
                !elements.mobileMoreMenu
            ) {

                return;

            }


            elements
                .mobileMoreMenu
                .classList
                .add(
                    "show"
                );


            elements
                .mobileMoreMenu
                .setAttribute(
                    "aria-hidden",
                    "false"
                );


            elements
                .mobileMoreBtn
                ?.setAttribute(
                    "aria-expanded",
                    "true"
                );

        }


        function closeMoreMenu() {

            if (
                !elements.mobileMoreMenu
            ) {

                return;

            }


            elements
                .mobileMoreMenu
                .classList
                .remove(
                    "show"
                );


            elements
                .mobileMoreMenu
                .setAttribute(
                    "aria-hidden",
                    "true"
                );


            elements
                .mobileMoreBtn
                ?.setAttribute(
                    "aria-expanded",
                    "false"
                );

        }


        /* ========================================================
           NAVIGATION
           ======================================================== */

        function initializeNavigation() {

            if (
                elements.mobileMenuBtn
            ) {

                elements
                    .mobileMenuBtn
                    .addEventListener(
                        "click",
                        event => {

                            event.preventDefault();


                            if (
                                elements.sidebar
                                    ?.classList
                                    .contains(
                                        "mobile-sidebar-open"
                                    )
                            ) {

                                closeMobileSidebar();

                            } else {

                                openMobileSidebar();

                            }

                        }
                    );

            }


            if (
                elements.sidebarOverlay
            ) {

                elements
                    .sidebarOverlay
                    .addEventListener(
                        "click",
                        closeMobileSidebar
                    );

            }


            if (
                elements.desktopMenuBtn
            ) {

                elements
                    .desktopMenuBtn
                    .addEventListener(
                        "click",
                        () => {

                            if (
                                !elements.sidebar
                            ) {

                                return;

                            }


                            if (
                                isMobile()
                            ) {

                                openMobileSidebar();

                                return;

                            }


                            elements
                                .sidebar
                                .classList
                                .toggle(
                                    "desktop-sidebar-collapsed"
                                );


                            document.body
                                .classList
                                .toggle(
                                    "sidebar-collapsed"
                                );

                        }
                    );

            }


            document
                .querySelectorAll(
                    ".sidebar .nav-item"
                )
                .forEach(
                    link => {

                        link.addEventListener(
                            "click",
                            () => {

                                if (
                                    isMobile()
                                ) {

                                    closeMobileSidebar();

                                }

                            }
                        );

                    }
                );


            document
                .querySelectorAll(
                    ".bottom-nav-item"
                )
                .forEach(
                    item => {

                        item.addEventListener(
                            "click",
                            () => {

                                const page =
                                    item.dataset
                                        .bottomPage;


                                if (
                                    page ===
                                    "home"
                                ) {

                                    window.location.href =
                                        "dashboard.html";

                                }

                                else if (
                                    page ===
                                    "bookings"
                                ) {

                                    window.location.href =
                                        "bookings.html";

                                }

                                else if (
                                    page ===
                                    "payment"
                                ) {

                                    window.location.href =
                                        "payments.html";

                                }

                                else if (
                                    page ===
                                    "tracking"
                                ) {

                                    window.location.href =
                                        "tracking.html";

                                }

                            }
                        );

                    }
                );


            if (
                elements.mobileMoreBtn
            ) {

                elements
                    .mobileMoreBtn
                    .addEventListener(
                        "click",
                        event => {

                            event.preventDefault();

                            event.stopPropagation();


                            if (
                                elements
                                    .mobileMoreMenu
                                    ?.classList
                                    .contains(
                                        "show"
                                    )
                            ) {

                                closeMoreMenu();

                            } else {

                                openMoreMenu();

                            }

                        }
                    );

            }


            if (
                elements.mobileMoreMenu
            ) {

                elements
                    .mobileMoreMenu
                    .addEventListener(
                        "click",
                        event => {

                            const button =
                                event.target.closest(
                                    "button[data-more-page]"
                                );


                            if (!button) {
                                return;
                            }


                            const route =
                                MORE_MENU_ROUTES[
                                    button.dataset
                                        .morePage
                                ];


                            if (!route) {
                                return;
                            }


                            closeMoreMenu();


                            window.location.assign(
                                route
                            );

                        }
                    );

            }


            document.addEventListener(
                "click",
                event => {

                    if (
                        elements.mobileMoreMenu &&
                        elements.mobileMoreBtn &&
                        !elements.mobileMoreMenu
                            .contains(
                                event.target
                            ) &&
                        !elements.mobileMoreBtn
                            .contains(
                                event.target
                            )
                    ) {

                        closeMoreMenu();

                    }

                }
            );


            document.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key !==
                        "Escape"
                    ) {

                        return;

                    }


                    closeMobileSidebar();
                    closeMoreMenu();

                }
            );


            window.addEventListener(
                "resize",
                () => {

                    if (
                        !isMobile()
                    ) {

                        closeMobileSidebar();
                        closeMoreMenu();

                    }

                }
            );


            document.addEventListener(
                "touchstart",
                event => {

                    if (
                        !event.touches?.length
                    ) {

                        return;

                    }


                    state.touchStartX =
                        event.touches[0]
                            .clientX;


                    state.touchStartY =
                        event.touches[0]
                            .clientY;

                },
                {
                    passive:
                        true
                }
            );


            document.addEventListener(
                "touchend",
                event => {

                    if (
                        !isMobile() ||
                        !event.changedTouches?.length
                    ) {

                        return;

                    }


                    const endX =
                        event.changedTouches[0]
                            .clientX;


                    const endY =
                        event.changedTouches[0]
                            .clientY;


                    const differenceX =
                        endX -
                        state.touchStartX;


                    const differenceY =
                        endY -
                        state.touchStartY;


                    if (
                        Math.abs(
                            differenceY
                        ) >
                        Math.abs(
                            differenceX
                        )
                    ) {

                        return;

                    }


                    if (
                        state.touchStartX <
                            50 &&
                        differenceX >
                            70
                    ) {

                        openMobileSidebar();

                    }

                    else if (
                        differenceX <
                            -70 &&
                        elements.sidebar
                            ?.classList
                            .contains(
                                "mobile-sidebar-open"
                            )
                    ) {

                        closeMobileSidebar();

                    }

                },
                {
                    passive:
                        true
                }
            );

        }


        /* ========================================================
           BUTTON ACTIONS
           ======================================================== */

        function initializeActions() {

            if (
                elements.newBookingBtn
            ) {

                elements
                    .newBookingBtn
                    .addEventListener(
                        "click",
                        () => {

                            window.location.href =
                                "new-booking.html";

                        }
                    );

            }


            if (
                elements.viewAllOrdersBtn
            ) {

                elements
                    .viewAllOrdersBtn
                    .addEventListener(
                        "click",
                        () => {

                            window.location.href =
                                "bookings.html";

                        }
                    );

            }


            if (
                elements.notificationBtn
            ) {

                elements
                    .notificationBtn
                    .addEventListener(
                        "click",
                        () => {

                            window.location.href =
                                "notifications.html";

                        }
                    );

            }


            if (
                elements.adminProfileBtn
            ) {

                elements
                    .adminProfileBtn
                    .addEventListener(
                        "click",
                        () => {

                            window.location.href =
                                "settings.html";

                        }
                    );

            }


            /* ====================================================
               LOGOUT
               ==================================================== */

            if (
                elements.logoutBtn
            ) {

                elements
                    .logoutBtn
                    .addEventListener(
                        "click",
                        async () => {

                            if (
                                elements
                                    .logoutBtn
                                    .disabled
                            ) {

                                return;

                            }


                            elements
                                .logoutBtn
                                .disabled =
                                    true;


                            try {

                                if (
                                    typeof adminLogout ===
                                    "function"
                                ) {

                                    await adminLogout();

                                    return;

                                }


                                const {
                                    error
                                } =
                                    await supabase
                                        .auth
                                        .signOut();


                                if (error) {
                                    throw error;
                                }


                                window.location.replace(
                                    "../index.html"
                                );


                            } catch (
                                error
                            ) {

                                console.error(
                                    "Admin logout failed:",
                                    error
                                );


                                elements
                                    .logoutBtn
                                    .disabled =
                                        false;


                                showActivityMessage(
                                    "Unable to log out. Please try again."
                                );

                            }

                        }
                    );

            }


            /*
             * There is currently no notifications
             * table in the SSP database.
             *
             * Therefore do not invent a count.
             */

            if (
                elements.notificationCount
            ) {

                elements
                    .notificationCount
                    .textContent =
                        "0";

            }

        }


        /* ========================================================
           VISIBILITY REFRESH
           ======================================================== */

        function initializeVisibilityRefresh() {

            document.addEventListener(
                "visibilitychange",
                async () => {

                    if (
                        document.visibilityState !==
                        "visible"
                    ) {

                        return;

                    }


                    await loadDashboardData();


                    updateSummaryCards();

                    renderOrders();

                    updateActivityCards();

                }
            );

        }


        /* ========================================================
           AUTH STATE
           ======================================================== */

        function initializeAuthListener() {

            supabase.auth.onAuthStateChange(
                (
                    event,
                    session
                ) => {

                    if (
                        event ===
                            "SIGNED_OUT" ||
                        !session
                    ) {

                        window.location.replace(
                            "../index.html"
                        );

                    }

                }
            );

        }


        /* ========================================================
           INITIALIZE
           ======================================================== */

        async function initializeDashboard() {

            const {
                data: {
                    user
                },
                error
            } =
                await supabase
                    .auth
                    .getUser();


            if (
                error ||
                !user
            ) {

                window.location.replace(
                    "../index.html"
                );

                return;

            }


            state.adminUser =
                user;


            await loadAdminProfile();

            await loadDashboardData();


            updateSummaryCards();

            renderOrders();

            updateActivityCards();


            initializeDateSelector();

            initializeFilters();

            initializeSearch();

            initializeActivityCards();

            initializeNavigation();

            initializeActions();

            initializeVisibilityRefresh();

            initializeAuthListener();


            console.info(
                `SSP Admin Dashboard: ${state.bookings.length} live bookings loaded from Supabase.`
            );

        }


        /* ========================================================
           START
           ======================================================== */

        initializeDashboard();

    }
);