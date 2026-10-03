"use strict";


/* =========================================================
   SSP CUSTOMER PORTAL
   ORDERS / ORDER HISTORY

   REAL SUPABASE DATA

   This page ONLY:
   - authenticates customer
   - loads customer's bookings
   - displays order list
   - opens order-details.html

   It does NOT:
   - display tracking timeline
   - display complete order details
   - modify bookings
========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    async function () {


        /* =====================================================
           DOM
        ====================================================== */

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


        const notificationButton =
            document.getElementById(
                "notificationButton"
            );


        const profileButton =
            document.getElementById(
                "profileButton"
            );



        /* =====================================================
           HEADER NAVIGATION
        ====================================================== */

        if (notificationButton) {

            notificationButton.addEventListener(
                "click",
                function () {

                    window.location.href =
                        "notifications.html";

                }
            );

        }


        if (profileButton) {

            profileButton.addEventListener(
                "click",
                function () {

                    window.location.href =
                        "profile.html";

                }
            );

        }



        /* =====================================================
           RETRY
        ====================================================== */

        if (retryButton) {

            retryButton.addEventListener(
                "click",
                loadOrders
            );

        }



        /* =====================================================
           LOAD
        ====================================================== */

        await loadOrders();



        /* =====================================================
           LOAD ORDERS
        ====================================================== */

        async function loadOrders() {


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
                   REAL BOOKINGS

                   Only this customer's bookings.
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



                /* =============================================
                   SUPABASE ERROR
                ============================================== */

                if (error) {

                    console.error(
                        "SSP Orders: Supabase error:",
                        error
                    );

                    throw new Error(
                        "Unable to load your orders from the database."
                    );

                }



                const bookings =
                    Array.isArray(data)
                        ? data
                        : [];



                /* =============================================
                   DISPLAY
                ============================================== */

                renderOrders(
                    bookings
                );


            } catch (error) {


                console.error(
                    "SSP Orders:",
                    error
                );


                showError(
                    error.message ||
                    "Unable to load your orders."
                );

            }

        }



        /* =====================================================
           RENDER ORDERS
        ====================================================== */

        function renderOrders(
            bookings
        ) {


            hideLoading();


            hideError();


            if (ordersList) {

                ordersList.innerHTML =
                    "";

            }



            /* =============================================
               COUNT
            ============================================== */

            if (ordersCount) {

                const count =
                    bookings.length;


                ordersCount.textContent =
                    count === 1
                        ? "1 order"
                        : `${count} orders`;

            }



            /* =============================================
               EMPTY
            ============================================== */

            if (!bookings.length) {

                if (ordersEmpty) {

                    ordersEmpty.hidden =
                        false;

                }

                return;

            }


            if (ordersEmpty) {

                ordersEmpty.hidden =
                    true;

            }



            /* =============================================
               CREATE CARDS
            ============================================== */

            bookings.forEach(
                function (booking) {

                    const card =
                        createOrderCard(
                            booking
                        );


                    if (ordersList) {

                        ordersList.appendChild(
                            card
                        );

                    }

                }
            );

        }



        /* =====================================================
           ORDER CARD
        ====================================================== */

        function createOrderCard(
            booking
        ) {


            /*
               Use booking_id as the public order ID.

               The next page will receive:
               parcel-details.html?id=<booking_id>
            */

            const bookingId =
                booking.booking_id ||
                booking.id;



            const card =
                document.createElement(
                    "a"
                );


            card.className =
                "order-card";


            card.href =
                "parcel-details.html?id=" +
                encodeURIComponent(
                    bookingId
                );


            card.setAttribute(
                "aria-label",
                `Open order ${bookingId}`
            );



            /* =============================================
               TOP
            ============================================== */

            const top =
                document.createElement(
                    "div"
                );


            top.className =
                "order-card-top";



            /* =============================================
               MAIN
            ============================================== */

            const main =
                document.createElement(
                    "div"
                );


            main.className =
                "order-main";



            /* =============================================
               ICON
            ============================================== */

            const icon =
                document.createElement(
                    "div"
                );


            icon.className =
                "order-icon";


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

            const information =
                document.createElement(
                    "div"
                );


            information.className =
                "order-information";



            const bookingIdElement =
                document.createElement(
                    "h2"
                );


            bookingIdElement.className =
                "order-booking-id";


            bookingIdElement.textContent =
                bookingId;



            const route =
                document.createElement(
                    "p"
                );


            route.className =
                "order-route";


            route.textContent =
                `${booking.pickup_city || "-"} → ${booking.delivery_city || "-"}`;



            const date =
                document.createElement(
                    "p"
                );


            date.className =
                "order-date";


            date.textContent =
                formatDate(
                    booking.created_at
                );



            information.appendChild(
                bookingIdElement
            );

            information.appendChild(
                route
            );

            information.appendChild(
                date
            );



            main.appendChild(
                icon
            );

            main.appendChild(
                information
            );



            /* =============================================
               STATUS
            ============================================== */

            const status =
                document.createElement(
                    "span"
                );


            status.className =
                "order-status " +
                getStatusClass(
                    booking.status
                );


            status.textContent =
                formatStatus(
                    booking.status
                );



            top.appendChild(
                main
            );

            top.appendChild(
                status
            );



            /* =============================================
               BOTTOM
            ============================================== */

            const bottom =
                document.createElement(
                    "div"
                );


            bottom.className =
                "order-card-bottom";



            const parcel =
                document.createElement(
                    "div"
                );


            parcel.className =
                "order-parcel";


            const parcelType =
                booking.parcel_type ||
                "Parcel";


            const parcelName =
                booking.parcel_name ||
                "-";


            parcel.innerHTML =
                `<strong>${escapeHtml(parcelName)}</strong> · ${escapeHtml(parcelType)}`;



            /* =============================================
               OPEN ARROW
            ============================================== */

            const open =
                document.createElement(
                    "span"
                );


            open.className =
                "order-open";


            open.innerHTML = `
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
                        d="M9 18l6-6-6-6"
                    ></path>

                </svg>
            `;



            bottom.appendChild(
                parcel
            );

            bottom.appendChild(
                open
            );



            /* =============================================
               COMPLETE CARD
            ============================================== */

            card.appendChild(
                top
            );

            card.appendChild(
                bottom
            );


            return card;

        }



        /* =====================================================
           STATUS CLASS
        ====================================================== */

        function getStatusClass(
            status
        ) {


            const statusMap = {

                pending:
                    "status-pending",

                confirmed:
                    "status-confirmed",

                assigned:
                    "status-assigned",

                pickup_started:
                    "status-pickup-started",

                picked_up:
                    "status-picked-up",

                in_transit:
                    "status-in-transit",

                out_for_delivery:
                    "status-out-for-delivery",

                delivered:
                    "status-delivered",

                cancelled:
                    "status-cancelled"

            };


            return (
                statusMap[
                    String(
                        status || ""
                    ).toLowerCase()
                ] ||
                "status-pending"
            );

        }



        /* =====================================================
           STATUS TEXT
        ====================================================== */

        function formatStatus(
            status
        ) {


            const statusMap = {

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
                statusMap[
                    String(
                        status || ""
                    ).toLowerCase()
                ] ||
                "Pending"
            );

        }



        /* =====================================================
           DATE
        ====================================================== */

        function formatDate(
            value
        ) {


            if (!value) {

                return "Date unavailable";

            }


            const date =
                new Date(value);


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return "Date unavailable";

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
           HTML ESCAPE
        ====================================================== */

        function escapeHtml(
            value
        ) {

            return String(
                value ?? ""
            )

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



        /* =====================================================
           LOADING
        ====================================================== */

        function showLoading() {


            if (ordersLoading) {

                ordersLoading.style.display =
                    "flex";

            }


            if (ordersEmpty) {

                ordersEmpty.hidden =
                    true;

            }


            if (ordersError) {

                ordersError.hidden =
                    true;

            }

        }



        function hideLoading() {


            if (ordersLoading) {

                ordersLoading.style.display =
                    "none";

            }

        }



        /* =====================================================
           ERROR
        ====================================================== */

        function showError(
            message
        ) {


            hideLoading();


            if (ordersEmpty) {

                ordersEmpty.hidden =
                    true;

            }


            if (ordersErrorMessage) {

                ordersErrorMessage.textContent =
                    message;

            }


            if (ordersError) {

                ordersError.hidden =
                    false;

            }


            if (ordersCount) {

                ordersCount.textContent =
                    "Unable to load orders";

            }

        }



        function hideError() {


            if (ordersError) {

                ordersError.hidden =
                    true;

            }

        }


    }
);