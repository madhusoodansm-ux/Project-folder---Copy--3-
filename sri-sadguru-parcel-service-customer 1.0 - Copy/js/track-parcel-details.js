"use strict";


/* =========================================================
   SSP CUSTOMER PORTAL
   TRACK PARCEL DETAILS

   REAL SUPABASE DATA
========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    async function () {


        /* =====================================================
           DOM
        ====================================================== */

        const loadingState =
            document.getElementById("loadingState");


        const errorState =
            document.getElementById("errorState");


        const notFoundState =
            document.getElementById("notFoundState");


        const detailsContent =
            document.getElementById("detailsContent");


        const errorMessage =
            document.getElementById("errorMessage");


        const retryButton =
            document.getElementById("retryButton");


        const backButton =
            document.getElementById("backButton");


        const backToListButton =
            document.getElementById("backToListButton");


        const bottomBackButton =
            document.getElementById("bottomBackButton");


        const bookingIdElement =
            document.getElementById("bookingId");


        const bookingStatusElement =
            document.getElementById("bookingStatus");


        const bookingDateElement =
            document.getElementById("bookingDate");


        const lastUpdatedElement =
            document.getElementById("lastUpdated");


        const currentStatusTitle =
            document.getElementById("currentStatusTitle");


        const currentStatusMessage =
            document.getElementById("currentStatusMessage");


        const parcelNameElement =
            document.getElementById("parcelName");


        const parcelTypeElement =
            document.getElementById("parcelType");


        const parcelWeightElement =
            document.getElementById("parcelWeight");


        const parcelPiecesElement =
            document.getElementById("parcelPieces");


        const parcelDescriptionElement =
            document.getElementById("parcelDescription");


        const pickupCityElement =
            document.getElementById("pickupCity");


        const pickupAddressElement =
            document.getElementById("pickupAddress");


        const deliveryCityElement =
            document.getElementById("deliveryCity");


        const deliveryAddressElement =
            document.getElementById("deliveryAddress");


        const timelineElement =
            document.getElementById("timeline");


        const timelineEmpty =
            document.getElementById("timelineEmpty");



        /* =====================================================
           BOOKING ID FROM URL
        ====================================================== */

        const params =
            new URLSearchParams(
                window.location.search
            );


        const requestedBookingId =
            params.get("id");


        if (!requestedBookingId) {

            showNotFound();

            return;

        }



        /* =====================================================
           NAVIGATION
        ====================================================== */

        function goBack() {

            window.location.href =
                "track-parcel.html";

        }


        if (backButton) {

            backButton.addEventListener(
                "click",
                goBack
            );

        }


        if (backToListButton) {

            backToListButton.addEventListener(
                "click",
                goBack
            );

        }


        if (bottomBackButton) {

            bottomBackButton.addEventListener(
                "click",
                goBack
            );

        }


        if (retryButton) {

            retryButton.addEventListener(
                "click",
                loadParcel
            );

        }



        /* =====================================================
           INITIAL LOAD
        ====================================================== */

        await loadParcel();



        /* =====================================================
           LOAD PARCEL
        ====================================================== */

        async function loadParcel() {

            showLoading();


            try {


                /* =============================================
                   CUSTOMER AUTHENTICATION
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
                   SUPABASE CLIENT
                ============================================== */

                const supabase =
                    window.supabaseClient;


                if (!supabase) {

                    throw new Error(
                        "Supabase client is unavailable."
                    );

                }



                /* =============================================
                   LOAD SELECTED BOOKING
                ============================================== */

                const {
                    data: booking,
                    error: bookingError
                } = await supabase

                    .from("bookings")

                    .select(`
                        id,
                        booking_id,
                        customer_id,

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

                        status,
                        created_at,
                        updated_at
                    `)

                    .eq(
                        "booking_id",
                        requestedBookingId
                    )

                    .eq(
                        "customer_id",
                        user.id
                    )

                    .maybeSingle();


                if (bookingError) {

                    throw bookingError;

                }


                if (!booking) {

                    showNotFound();

                    return;

                }



                /* =============================================
                   RENDER BOOKING
                ============================================== */

                renderBooking(booking);



                /* =============================================
                   LOAD REAL STATUS HISTORY
                ============================================== */

                const history =
                    await loadStatusHistory(
                        supabase,
                        booking
                    );


                renderTimeline(
                    history,
                    booking
                );


                showDetails();

            }
            catch (error) {

                console.error(
                    "Track parcel details error:",
                    error
                );


                showError(
                    getErrorMessage(error)
                );

            }

        }



        /* =====================================================
           LOAD STATUS HISTORY
        ====================================================== */

        async function loadStatusHistory(
            supabase,
            booking
        ) {


            /*
             * First try the public booking_id.
             */

            let result =
                await supabase

                    .from("booking_status_history")

                    .select("*")

                    .eq(
                        "booking_id",
                        booking.booking_id
                    );


            /*
             * If the history relationship uses the
             * internal booking UUID instead, try that.
             */

            if (
                result.error &&
                booking.id
            ) {

                result =
                    await supabase

                        .from("booking_status_history")

                        .select("*")

                        .eq(
                            "booking_id",
                            booking.id
                        );

            }


            /*
             * If status history cannot be loaded,
             * do not invent tracking events.
             */

            if (result.error) {

                console.warn(
                    "Status history could not be loaded:",
                    result.error
                );


                return [];

            }


            const rows =
                Array.isArray(result.data)
                    ? result.data
                    : [];


            return rows.sort(
                function (a, b) {

                    return (
                        getHistoryTime(b) -
                        getHistoryTime(a)
                    );

                }
            );

        }



        /* =====================================================
           RENDER BOOKING
        ====================================================== */

        function renderBooking(booking) {

            const status =
                normalizeStatus(
                    booking.status
                );


            bookingIdElement.textContent =
                booking.booking_id || "—";


            bookingStatusElement.textContent =
                getStatusLabel(status);


            bookingStatusElement.className =
                "status-badge " +
                getStatusClass(status);


            bookingDateElement.textContent =
                formatDateTime(
                    booking.created_at
                );


            lastUpdatedElement.textContent =
                formatDateTime(
                    booking.updated_at ||
                    booking.created_at
                );


            currentStatusTitle.textContent =
                getStatusLabel(status);


            currentStatusMessage.textContent =
                getStatusMessage(status);


            parcelNameElement.textContent =
                booking.parcel_name || "—";


            parcelTypeElement.textContent =
                booking.parcel_type || "—";


            parcelWeightElement.textContent =
                formatWeight(
                    booking.parcel_weight
                );


            parcelPiecesElement.textContent =
                booking.pieces ??
                "—";


            parcelDescriptionElement.textContent =
                booking.parcel_description ||
                "No description provided";


            pickupCityElement.textContent =
                booking.pickup_city || "—";


            pickupAddressElement.textContent =
                buildPickupAddress(
                    booking
                );


            deliveryCityElement.textContent =
                booking.delivery_city || "—";


            deliveryAddressElement.textContent =
                buildDeliveryAddress(
                    booking
                );

        }



        /* =====================================================
           RENDER TIMELINE
        ====================================================== */

        function renderTimeline(
            history,
            booking
        ) {

            timelineElement.innerHTML = "";


            if (!history.length) {

                timelineEmpty.hidden = false;


                /*
                 * Only the real current booking status
                 * is displayed.
                 */

                const currentItem =
                    createTimelineItem(
                        {
                            status:
                                booking.status,

                            description:
                                getStatusMessage(
                                    booking.status
                                ),

                            created_at:
                                booking.updated_at ||
                                booking.created_at
                        },
                        true,
                        true
                    );


                timelineElement.appendChild(
                    currentItem
                );


                return;

            }


            timelineEmpty.hidden = true;


            history.forEach(
                function (item, index) {

                    const current =
                        index === 0;


                    const timelineItem =
                        createTimelineItem(
                            item,
                            true,
                            current
                        );


                    timelineElement.appendChild(
                        timelineItem
                    );

                }
            );

        }



        /* =====================================================
           CREATE TIMELINE ITEM
        ====================================================== */

        function createTimelineItem(
            item,
            completed,
            current
        ) {

            const wrapper =
                document.createElement("div");


            wrapper.className =
                "timeline-item " +
                (
                    completed
                        ? "completed "
                        : ""
                ) +
                (
                    current
                        ? "current"
                        : ""
                );


            const line =
                document.createElement("div");


            line.className =
                "timeline-line";


            const dot =
                document.createElement("div");


            dot.className =
                "timeline-dot";


            dot.textContent =
                completed
                    ? "✓"
                    : "";


            const content =
                document.createElement("div");


            content.className =
                "timeline-content";


            const title =
                document.createElement("div");


            title.className =
                "timeline-title";


            const status =
                normalizeStatus(
                    getHistoryStatus(item)
                );


            title.textContent =
                getStatusLabel(status);


            const description =
                document.createElement("div");


            description.className =
                "timeline-description";


            description.textContent =
                getHistoryDescription(
                    item,
                    status
                );


            content.appendChild(title);

            content.appendChild(description);


            const time =
                document.createElement("div");


            time.className =
                "timeline-time";


            time.textContent =
                formatDateTime(
                    getHistoryTimestamp(item)
                );


            wrapper.appendChild(line);

            wrapper.appendChild(dot);

            wrapper.appendChild(content);

            wrapper.appendChild(time);


            return wrapper;

        }



        /* =====================================================
           HISTORY FIELD HELPERS
        ====================================================== */

        function getHistoryStatus(item) {

            return (
                item.status ||
                item.new_status ||
                item.to_status ||
                item.booking_status ||
                ""
            );

        }


        function getHistoryDescription(
            item,
            status
        ) {

            return (
                item.description ||
                item.note ||
                item.notes ||
                item.message ||
                item.remarks ||
                getStatusMessage(status)
            );

        }


        function getHistoryTimestamp(item) {

            return (
                item.changed_at ||
                item.created_at ||
                item.updated_at ||
                item.timestamp ||
                item.occurred_at ||
                null
            );

        }


        function getHistoryTime(item) {

            const value =
                getHistoryTimestamp(item);


            const time =
                value
                    ? new Date(value).getTime()
                    : 0;


            return Number.isFinite(time)
                ? time
                : 0;

        }



        /* =====================================================
           STATUS HELPERS
        ====================================================== */

        function normalizeStatus(status) {

            return String(
                status || "pending"
            )
                .trim()
                .toLowerCase()
                .replace(/[\s-]+/g, "_");

        }


        function getStatusLabel(status) {

            const labels = {

                pending:
                    "Pending",

                confirmed:
                    "Confirmed",

                assigned:
                    "Driver Assigned",

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
                labels[
                    normalizeStatus(status)
                ] ||

                String(
                    status || "Unknown"
                )
                    .replace(/_/g, " ")
                    .replace(
                        /\b\w/g,
                        function (letter) {
                            return letter.toUpperCase();
                        }
                    )
            );

        }


        function getStatusMessage(status) {

            const messages = {

                pending:
                    "Your parcel booking is pending confirmation.",

                confirmed:
                    "Your parcel booking has been confirmed.",

                assigned:
                    "A driver has been assigned to your parcel.",

                pickup_started:
                    "Pickup for your parcel has started.",

                picked_up:
                    "Your parcel has been picked up.",

                in_transit:
                    "Your parcel is currently moving towards the destination.",

                out_for_delivery:
                    "Your parcel is out for delivery.",

                delivered:
                    "Your parcel has been delivered.",

                cancelled:
                    "This parcel booking has been cancelled."

            };


            return (
                messages[
                    normalizeStatus(status)
                ] ||

                "The current status of your parcel is shown above."
            );

        }


        function getStatusClass(status) {

            const normalized =
                normalizeStatus(status);


            if (
                normalized === "delivered"
            ) {

                return "status-success";

            }


            if (
                normalized === "cancelled"
            ) {

                return "status-danger";

            }


            if (
                normalized === "pending" ||
                normalized === "pickup_started"
            ) {

                return "status-warning";

            }


            return "";

        }



        /* =====================================================
           ADDRESS HELPERS
        ====================================================== */

        function buildPickupAddress(
            booking
        ) {

            return [

                booking.pickup_address,

                booking.pickup_pincode

            ]
                .filter(Boolean)
                .join(", ") || "—";

        }


        function buildDeliveryAddress(
            booking
        ) {

            return [

                booking.delivery_address,

                booking.delivery_landmark,

                booking.delivery_district,

                booking.delivery_state,

                booking.delivery_pincode

            ]
                .filter(Boolean)
                .join(", ") || "—";

        }



        /* =====================================================
           FORMAT HELPERS
        ====================================================== */

        function formatWeight(weight) {

            if (
                weight === null ||
                weight === undefined ||
                weight === ""
            ) {

                return "—";

            }


            return `${weight} kg`;

        }


        function formatDateTime(value) {

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


            return new Intl.DateTimeFormat(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                }
            ).format(date);

        }



        /* =====================================================
           UI STATES
        ====================================================== */

        function showLoading() {

            loadingState.hidden = false;

            errorState.hidden = true;

            notFoundState.hidden = true;

            detailsContent.hidden = true;

        }


        function showDetails() {

            loadingState.hidden = true;

            errorState.hidden = true;

            notFoundState.hidden = true;

            detailsContent.hidden = false;

        }


        function showNotFound() {

            loadingState.hidden = true;

            errorState.hidden = true;

            notFoundState.hidden = false;

            detailsContent.hidden = true;

        }


        function showError(message) {

            loadingState.hidden = true;

            errorState.hidden = false;

            notFoundState.hidden = true;

            detailsContent.hidden = true;

            errorMessage.textContent =
                message;

        }


        function getErrorMessage(error) {

            if (
                error &&
                typeof error.message === "string" &&
                error.message.trim()
            ) {

                return error.message;

            }


            return (
                "Something went wrong while loading the parcel. Please try again."
            );

        }

    }
);