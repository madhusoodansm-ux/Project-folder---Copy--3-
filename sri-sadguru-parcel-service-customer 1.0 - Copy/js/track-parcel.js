"use strict";


/* =========================================================
   SSP CUSTOMER PORTAL
   TRACK PARCEL

   REAL SUPABASE DATA ONLY

   This page:
   - authenticates the customer
   - loads customer's bookings
   - searches Booking ID
   - displays parcel list
   - opens Track Parcel Details

   It does NOT:
   - create demo bookings
   - use localStorage for bookings
   - display fake tracking history
========================================================= */


/* =========================================================
   STATE
========================================================= */

let allBookings = [];

let currentSearch = "";



/* =========================================================
   DOM
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {


        const backButton =
            document.getElementById(
                "backButton"
            );


        const trackingForm =
            document.getElementById(
                "trackingForm"
            );


        const trackingInput =
            document.getElementById(
                "trackingInput"
            );


        const clearSearchButton =
            document.getElementById(
                "clearSearchButton"
            );


        const searchMessage =
            document.getElementById(
                "searchMessage"
            );


        const ordersList =
            document.getElementById(
                "ordersList"
            );


        const ordersLoading =
            document.getElementById(
                "ordersLoading"
            );


        const ordersEmpty =
            document.getElementById(
                "ordersEmpty"
            );


        const ordersError =
            document.getElementById(
                "ordersError"
            );


        const ordersErrorMessage =
            document.getElementById(
                "ordersErrorMessage"
            );


        const ordersCount =
            document.getElementById(
                "ordersCount"
            );


        const retryButton =
            document.getElementById(
                "retryButton"
            );



        /* =================================================
           BACK BUTTON

           Always goes to Dashboard.
           Does not use history.back().
        ================================================== */

        if (backButton) {

            backButton.addEventListener(
                "click",
                function () {

                    window.location.href =
                        "dashboard.html";

                }
            );

        }



        /* =================================================
           SEARCH SUBMIT
        ================================================== */

        if (trackingForm) {

            trackingForm.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    currentSearch =
                        trackingInput.value
                            .trim()
                            .toUpperCase();

                    updateClearButton();

                    renderBookings();

                }
            );

        }



        /* =================================================
           LIVE SEARCH
        ================================================== */

        if (trackingInput) {

            trackingInput.addEventListener(
                "input",
                function () {

                    currentSearch =
                        trackingInput.value
                            .trim()
                            .toUpperCase();

                    updateClearButton();

                    /*
                     * Do not show error while the
                     * customer is still typing.
                     */

                    if (searchMessage) {

                        searchMessage.textContent =
                            "";

                        searchMessage.className =
                            "search-message";

                    }


                    renderBookings();

                }
            );

        }



        /* =================================================
           CLEAR SEARCH
        ================================================== */

        if (clearSearchButton) {

            clearSearchButton.addEventListener(
                "click",
                function () {

                    trackingInput.value = "";

                    currentSearch = "";

                    updateClearButton();

                    if (searchMessage) {

                        searchMessage.textContent =
                            "";

                        searchMessage.className =
                            "search-message";

                    }

                    renderBookings();

                    trackingInput.focus();

                }
            );

        }



        /* =================================================
           RETRY
        ================================================== */

        if (retryButton) {

            retryButton.addEventListener(
                "click",
                loadBookings
            );

        }



        /* =================================================
           INITIAL LOAD
        ================================================== */

        await loadBookings();



        /* =================================================
           UPDATE CLEAR BUTTON
        ================================================== */

        function updateClearButton() {

            if (!clearSearchButton) {
                return;
            }


            clearSearchButton.hidden =
                trackingInput.value.trim() === "";

        }



        /* =================================================
           LOAD BOOKINGS
        ================================================== */

        async function loadBookings() {

            showLoading();


            try {


                /* =============================================
                   CUSTOMER AUTH
                ============================================== */

                if (
                    !window.SSPAuth ||
                    typeof SSPAuth.requireCustomer !==
                        "function"
                ) {

                    throw new Error(
                        "Customer authentication is unavailable."
                    );

                }


                const customer =
                    await SSPAuth.requireCustomer();


                if (!customer) {

                    return;

                }


                const user =
                    customer.user;


                if (!user || !user.id) {

                    throw new Error(
                        "Logged-in customer was not found."
                    );

                }



                /* =============================================
                   SUPABASE
                ============================================== */

                const supabase =
                    window.supabaseClient;


                if (!supabase) {

                    throw new Error(
                        "Supabase client is unavailable."
                    );

                }



                /* =============================================
                   REAL CUSTOMER BOOKINGS
                ============================================== */

                const {
                    data,
                    error
                } = await supabase

                    .from("bookings")

                    .select(`
                        id,
                        booking_id,

                        pickup_city,
                        delivery_city,

                        parcel_name,
                        parcel_type,

                        status,

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



                if (error) {

                    throw error;

                }



                allBookings =
                    Array.isArray(data)
                        ? data
                        : [];


                currentSearch = "";


                if (trackingInput) {

                    trackingInput.value = "";

                }


                updateClearButton();


                renderBookings();


            } catch (error) {

                console.error(
                    "Track Parcel load error:",
                    error
                );


                showError(
                    error?.message ||
                    "Unable to load your parcels."
                );

            }

        }



        /* =================================================
           RENDER BOOKINGS
        ================================================== */

        function renderBookings() {

            if (!ordersList) {
                return;
            }


            ordersList.innerHTML = "";


            let filteredBookings =
                allBookings;


            /* =============================================
               SEARCH BY BOOKING ID
            ============================================== */

            if (currentSearch !== "") {

                filteredBookings =
                    allBookings.filter(
                        function (booking) {

                            const bookingId =
                                String(
                                    booking.booking_id || ""
                                ).toUpperCase();


                            return bookingId.includes(
                                currentSearch
                            );

                        }
                    );

            }



            /* =============================================
               COUNT
            ============================================== */

            updateCount(
                filteredBookings.length
            );



            /* =============================================
               NO RESULT
            ============================================== */

            if (
                currentSearch !== "" &&
                filteredBookings.length === 0
            ) {

                hide(
                    ordersLoading
                );

                hide(
                    ordersError
                );

                show(
                    ordersEmpty
                );

                setEmptySearchMessage();

                return;

            }



            /* =============================================
               NO BOOKINGS
            ============================================== */

            if (filteredBookings.length === 0) {

                hide(
                    ordersLoading
                );

                hide(
                    ordersError
                );

                show(
                    ordersEmpty
                );

                setDefaultEmptyMessage();

                return;

            }



            /* =============================================
               BOOKINGS AVAILABLE
            ============================================== */

            hide(
                ordersLoading
            );

            hide(
                ordersError
            );

            hide(
                ordersEmpty
            );


            filteredBookings.forEach(
                function (booking) {

                    ordersList.appendChild(
                        createParcelCard(
                            booking
                        )
                    );

                }
            );


            /* =============================================
               SEARCH MESSAGE
            ============================================== */

            if (
                currentSearch !== "" &&
                searchMessage
            ) {

                searchMessage.textContent =
                    filteredBookings.length === 1
                        ? "1 booking found."
                        : `${filteredBookings.length} bookings found.`;

                searchMessage.className =
                    "search-message success";

            }

        }



        /* =================================================
           CREATE PARCEL CARD
        ================================================== */

        function createParcelCard(
            booking
        ) {

            const link =
                document.createElement("a");


            link.className =
                "parcel-card";


            link.href =
                "track-parcel-details.html?id=" +
                encodeURIComponent(
                    booking.booking_id
                );



            /* =============================================
               PARCEL ICON
            ============================================== */

            const icon =
                document.createElement("span");


            icon.className =
                "parcel-icon";


            icon.innerHTML = `

                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >

                    <path
                        d="M4 7.5L12 3l8 4.5"
                    ></path>

                    <path
                        d="M4 7.5v9L12 21l8-4.5v-9"
                    ></path>

                    <path
                        d="M12 12v9"
                    ></path>

                    <path
                        d="M4.5 7.5L12 12l7.5-4.5"
                    ></path>

                </svg>

            `;



            /* =============================================
               INFORMATION
            ============================================== */

            const info =
                document.createElement("div");


            info.className =
                "parcel-info";



            const top =
                document.createElement("div");


            top.className =
                "parcel-top";



            const bookingId =
                document.createElement("h3");


            bookingId.className =
                "booking-id";


            bookingId.textContent =
                booking.booking_id ||
                "Booking ID unavailable";



            const status =
                document.createElement("span");


            const normalizedStatus =
                normalizeStatus(
                    booking.status
                );


            status.className =
                "status-badge status-" +
                normalizedStatus;


            status.textContent =
                formatStatus(
                    booking.status
                );


            top.appendChild(
                bookingId
            );


            top.appendChild(
                status
            );



            /* =============================================
               PARCEL NAME / TYPE
            ============================================== */

            const parcelName =
                document.createElement("p");


            parcelName.className =
                "parcel-name";


            const parcelNameText =
                booking.parcel_name ||
                "Parcel";


            const parcelTypeText =
                booking.parcel_type ||
                "General";


            parcelName.textContent =
                `${parcelNameText} • ${parcelTypeText}`;



            /* =============================================
               META
            ============================================== */

            const meta =
                document.createElement("div");


            meta.className =
                "parcel-meta";



            /* ROUTE */

            const route =
                document.createElement("div");


            route.className =
                "route";


            route.innerHTML = `

                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >

                    <path
                        d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"
                    ></path>

                    <circle
                        cx="12"
                        cy="10"
                        r="2.5"
                    ></circle>

                </svg>

                <span class="route-text">
                    ${escapeHtml(
                        booking.pickup_city ||
                        "—"
                    )}
                </span>

                <span class="route-arrow">
                    →
                </span>

                <span class="route-text">
                    ${escapeHtml(
                        booking.delivery_city ||
                        "—"
                    )}
                </span>

            `;



            /* DATE */

            const dateRow =
                document.createElement("div");


            dateRow.className =
                "date-row";


            dateRow.innerHTML = `

                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >

                    <rect
                        x="3"
                        y="4"
                        width="18"
                        height="17"
                        rx="2"
                    ></rect>

                    <path
                        d="M16 2v4"
                    ></path>

                    <path
                        d="M8 2v4"
                    ></path>

                    <path
                        d="M3 10h18"
                    ></path>

                </svg>

                <span>
                    Booked on
                    ${formatDate(
                        booking.created_at
                    )}
                </span>

            `;



            meta.appendChild(
                route
            );


            meta.appendChild(
                dateRow
            );



            info.appendChild(
                top
            );


            info.appendChild(
                parcelName
            );


            info.appendChild(
                meta
            );



            /* =============================================
               ARROW
            ============================================== */

            const arrow =
                document.createElement("span");


            arrow.className =
                "parcel-arrow";


            arrow.innerHTML = `

                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >

                    <path
                        d="m9 18 6-6-6-6"
                    ></path>

                </svg>

            `;



            link.appendChild(
                icon
            );

            link.appendChild(
                info
            );

            link.appendChild(
                arrow
            );


            return link;

        }



        /* =================================================
           STATUS NORMALIZATION
        ================================================== */

        function normalizeStatus(
            status
        ) {

            const value =
                String(
                    status || "pending"
                )
                    .trim()
                    .toLowerCase();


            return value
                .replace(/_/g, "-")
                .replace(/\s+/g, "-");

        }



        /* =================================================
           STATUS DISPLAY
        ================================================== */

        function formatStatus(
            status
        ) {

            const normalized =
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

                "pickup-started":
                    "Pickup Started",

                "picked-up":
                    "Picked Up",

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
                labels[normalized] ||
                "Pending"
            );

        }



        /* =================================================
           DATE FORMAT
        ================================================== */

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



        /* =================================================
           HTML ESCAPE
        ================================================== */

        function escapeHtml(
            value
        ) {

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



        /* =================================================
           COUNT
        ================================================== */

        function updateCount(
            count
        ) {

            if (!ordersCount) {
                return;
            }


            ordersCount.textContent =
                count === 1
                    ? "1 booking"
                    : `${count} bookings`;

        }



        /* =================================================
           SEARCH EMPTY MESSAGE
        ================================================== */

        function setEmptySearchMessage() {

            const heading =
                ordersEmpty.querySelector("h3");


            const paragraph =
                ordersEmpty.querySelector("p");


            if (heading) {

                heading.textContent =
                    "No parcel found";

            }


            if (paragraph) {

                paragraph.textContent =
                    "No booking matches the Booking ID you searched for.";

            }

        }



        /* =================================================
           DEFAULT EMPTY MESSAGE
        ================================================== */

        function setDefaultEmptyMessage() {

            const heading =
                ordersEmpty.querySelector("h3");


            const paragraph =
                ordersEmpty.querySelector("p");


            if (heading) {

                heading.textContent =
                    "No parcels found";

            }


            if (paragraph) {

                paragraph.textContent =
                    "Your bookings will appear here after you book a parcel.";

            }

        }



        /* =================================================
           LOADING
        ================================================== */

        function showLoading() {

            show(
                ordersLoading
            );

            hide(
                ordersError
            );

            hide(
                ordersEmpty
            );

            ordersList.innerHTML = "";

            updateCount(0);

        }



        /* =================================================
           ERROR
        ================================================== */

        function showError(
            message
        ) {

            hide(
                ordersLoading
            );

            hide(
                ordersEmpty
            );

            show(
                ordersError
            );


            if (ordersErrorMessage) {

                ordersErrorMessage.textContent =
                    message;

            }

        }



        /* =================================================
           SHOW / HIDE
        ================================================== */

        function show(
            element
        ) {

            if (element) {

                element.hidden =
                    false;

            }

        }


        function hide(
            element
        ) {

            if (element) {

                element.hidden =
                    true;

            }

        }


    }
);