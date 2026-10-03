"use strict";


/* =========================================================
   SSP CUSTOMER DASHBOARD

   REAL DATABASE VERSION

   Database:
   public.bookings

   Customer filter:
   customer_id = logged-in user's auth.uid()

   Dashboard contains:
   - Welcome
   - Book Parcel
   - Payment Due
   - Recent Bookings

   No:
   - Track Parcel card
   - Quick Tracking
   - Active Deliveries summary
   - Total Orders summary
   - Delivered summary
========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    async function () {


        /* =====================================================
           1. CUSTOMER AUTHENTICATION
        ====================================================== */

        if (
            !window.SSPAuth ||
            typeof SSPAuth.requireCustomer !== "function"
        ) {

            console.error(
                "SSP: Customer authentication manager is not available."
            );

            return;
        }


        const customer =
            await SSPAuth.requireCustomer();


        if (!customer) {
            return;
        }


        const user =
            customer.user;


        if (!user) {

            console.error(
                "SSP: Logged-in customer could not be found."
            );

            return;
        }



        /* =====================================================
           2. SUPABASE CLIENT
        ====================================================== */

        const supabase =
            window.supabaseClient;


        if (!supabase) {

            console.error(
                "SSP: Supabase client is not available."
            );

            showDashboardError(
                "Database connection is not available."
            );

            return;
        }



        /* =====================================================
           3. DOM ELEMENTS
        ====================================================== */

        const customerNameElement =
            document.getElementById(
                "customerName"
            );


        const paymentAmountElement =
            document.getElementById(
                "paymentAmount"
            );


        const recentBookingsList =
            document.getElementById(
                "recentBookingsList"
            );


        const bookingLoading =
            document.getElementById(
                "bookingLoading"
            );


        const bookingEmpty =
            document.getElementById(
                "bookingEmpty"
            );


        const notificationButton =
            document.getElementById(
                "notificationButton"
            );


        const headerProfileButton =
            document.getElementById(
                "headerProfileButton"
            );



        /* =====================================================
           4. CUSTOMER NAME
        ====================================================== */

        let customerName =
            user.user_metadata?.full_name ||
            "Customer";


        try {

            if (
                typeof SSPAuth.getCustomerProfile ===
                "function"
            ) {

                const profile =
                    await SSPAuth.getCustomerProfile();


                if (profile?.full_name) {

                    customerName =
                        profile.full_name;

                }

            }

        } catch (error) {

            console.warn(
                "SSP: Could not load customer profile.",
                error
            );

        }


        customerName =
            String(customerName).trim() ||
            "Customer";


        if (customerNameElement) {

            customerNameElement.textContent =
                customerName + "!";

        }



        /* =====================================================
           5. NOTIFICATIONS
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



        /* =====================================================
           6. HEADER PROFILE

           Profile still exists.

           We are only removing Profile from
           bottom navigation.

           Header profile remains unchanged.
        ====================================================== */

        if (headerProfileButton) {

            headerProfileButton.addEventListener(
                "click",
                function () {

                    window.location.href =
                        "profile.html";

                }
            );

        }



        /* =====================================================
           7. LOAD REAL BOOKINGS
        ====================================================== */

        try {


            const {
                data: bookings,
                error
            } = await supabase

                .from("bookings")

                .select(`
                    id,
                    booking_id,
                    pickup_name,
                    pickup_phone,
                    pickup_email,
                    pickup_address,
                    pickup_city,
                    pickup_pincode,

                    receiver_name,
                    receiver_phone,
                    receiver_email,

                    delivery_address,
                    delivery_city,
                    delivery_district,
                    delivery_state,
                    delivery_pincode,
                    delivery_landmark,

                    parcel_name,
                    parcel_type,
                    parcel_description,

                    parcel_weight,
                    parcel_length,
                    parcel_width,
                    parcel_height,

                    pieces,
                    special_instructions,

                    status,

                    service_charge,
                    payment_status,
                    payment_method,

                    driver_id,

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



            /* =================================================
               DATABASE ERROR
            ================================================== */

            if (error) {

                console.error(
                    "SSP: Bookings query failed:",
                    error
                );


                showDashboardError(
                    "Your bookings could not be loaded. Please refresh the page."
                );


                return;
            }



            /* =================================================
               SAFE ARRAY
            ================================================== */

            const customerBookings =
                Array.isArray(bookings)
                    ? bookings
                    : [];



            /* =================================================
               PAYMENT DUE
            ================================================== */

            const paymentDue =
                calculatePaymentDue(
                    customerBookings
                );


            if (paymentAmountElement) {

                paymentAmountElement.textContent =
                    formatCurrency(
                        paymentDue
                    );

            }



            /* =================================================
               RECENT BOOKINGS
            ================================================= */

            renderRecentBookings(
                customerBookings.slice(
                    0,
                    5
                )
            );


        } catch (error) {

            console.error(
                "SSP: Dashboard database error:",
                error
            );


            showDashboardError(
                "Something went wrong while loading your dashboard."
            );

        }



        /* =====================================================
           8. BOTTOM NAVIGATION

           Navigation itself uses normal links.

           This only handles active visual state.
        ====================================================== */

        const bottomNavigationItems =
            document.querySelectorAll(
                ".bottom-nav-item"
            );


        bottomNavigationItems.forEach(
            function (item) {

                item.addEventListener(
                    "click",
                    function () {

                        bottomNavigationItems.forEach(
                            function (navItem) {

                                navItem.classList.remove(
                                    "active"
                                );

                            }
                        );


                        item.classList.add(
                            "active"
                        );

                    }
                );

            }
        );



        /* =====================================================
           DASHBOARD READY
        ====================================================== */

        console.log(
            "SSP Customer Dashboard connected to Supabase successfully."
        );



        /* =====================================================
           HELPER FUNCTIONS
        ====================================================== */


        function calculatePaymentDue(
            bookings
        ) {

            return bookings.reduce(
                function (total, booking) {

                    if (
                        String(
                            booking.payment_status ||
                            ""
                        ).toLowerCase() !== "pending"
                    ) {

                        return total;

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

                        return total;

                    }


                    return total + amount;

                },
                0
            );

        }



        function renderRecentBookings(
            bookings
        ) {

            if (!recentBookingsList) {
                return;
            }


            recentBookingsList.innerHTML =
                "";


            if (bookingLoading) {

                bookingLoading.style.display =
                    "none";

            }


            if (!bookings.length) {

                if (bookingEmpty) {

                    bookingEmpty.hidden =
                        false;

                }

                return;

            }


            if (bookingEmpty) {

                bookingEmpty.hidden =
                    true;

            }


            bookings.forEach(
                function (booking) {

                    recentBookingsList.appendChild(
                        createBookingCard(
                            booking
                        )
                    );

                }
            );

        }



        function createBookingCard(
            booking
        ) {

            const article =
                document.createElement(
                    "article"
                );


            article.className =
                "booking-item";



            /* ===============================================
               LEFT SIDE
            ================================================ */

            const left =
                document.createElement(
                    "div"
                );


            left.className =
                "booking-left";


            const icon =
                document.createElement(
                    "div"
                );


            icon.className =
                "booking-icon";


            icon.textContent =
                "📦";



            const information =
                document.createElement(
                    "div"
                );


            information.className =
                "booking-information";



            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                booking.booking_id ||
                "Parcel Booking";



            const route =
                document.createElement(
                    "p"
                );


            route.textContent =
                `${booking.pickup_city || "-"} → ${booking.delivery_city || "-"}`;



            const parcel =
                document.createElement(
                    "p"
                );


            parcel.textContent =
                `Parcel: ${
                    booking.parcel_name ||
                    booking.parcel_type ||
                    "-"
                }`;



            const date =
                document.createElement(
                    "span"
                );


            date.textContent =
                formatDate(
                    booking.created_at
                );



            information.appendChild(
                title
            );

            information.appendChild(
                route
            );

            information.appendChild(
                parcel
            );

            information.appendChild(
                date
            );


            left.appendChild(
                icon
            );

            left.appendChild(
                information
            );



            /* ===============================================
               RIGHT SIDE
            ================================================ */

            const right =
                document.createElement(
                    "div"
                );


            right.className =
                "booking-right";



            const status =
                document.createElement(
                    "span"
                );


            status.className =
                "booking-status " +
                getStatusClass(
                    booking.status
                );


            status.textContent =
                formatStatus(
                    booking.status
                );



            const details =
                document.createElement(
                    "a"
                );


            details.className =
                "booking-details";


            details.href =
                "parcel-details.html?id=" +
                encodeURIComponent(
                    booking.booking_id || ""
                );


            details.textContent =
                "View Details →";



            right.appendChild(
                status
            );

            right.appendChild(
                details
            );



            /* ===============================================
               COMPLETE CARD
            ================================================ */

            article.appendChild(
                left
            );

            article.appendChild(
                right
            );


            return article;

        }



        function getStatusClass(
            status
        ) {

            const classMap = {

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
                classMap[status] ||
                "status-pending"
            );

        }



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
                statusMap[status] ||
                "Pending"
            );

        }



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



        function formatCurrency(
            value
        ) {

            const amount =
                Number(value) || 0;


            return new Intl.NumberFormat(
                "en-IN",
                {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 2
                }
            ).format(amount);

        }



        function showDashboardError(
            message
        ) {

            if (!recentBookingsList) {
                return;
            }


            if (bookingLoading) {

                bookingLoading.textContent =
                    message;

                bookingLoading.style.color =
                    "#b91c1c";

            }

        }

    }
);