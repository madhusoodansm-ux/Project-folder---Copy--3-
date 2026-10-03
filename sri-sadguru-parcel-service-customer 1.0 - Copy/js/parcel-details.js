/* =========================================================
   SSP CUSTOMER PORTAL
   PARCEL DETAILS
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const bookingIdElement =
    document.getElementById("bookingId");

const bookingStatusElement =
    document.getElementById("bookingStatus");

const bookingDateElement =
    document.getElementById("bookingDate");


const parcelNameElement =
    document.getElementById("parcelName");

const parcelTypeElement =
    document.getElementById("parcelType");

const parcelDescriptionElement =
    document.getElementById("parcelDescription");

const parcelWeightElement =
    document.getElementById("parcelWeight");

const parcelPiecesElement =
    document.getElementById("parcelPieces");

const parcelLengthElement =
    document.getElementById("parcelLength");

const parcelWidthElement =
    document.getElementById("parcelWidth");

const parcelHeightElement =
    document.getElementById("parcelHeight");

const specialInstructionsElement =
    document.getElementById("specialInstructions");


const receiverNameElement =
    document.getElementById("receiverName");

const receiverPhoneElement =
    document.getElementById("receiverPhone");

const receiverEmailElement =
    document.getElementById("receiverEmail");

const deliveryAddressElement =
    document.getElementById("deliveryAddress");

const deliveryCityElement =
    document.getElementById("deliveryCity");

const deliveryDistrictElement =
    document.getElementById("deliveryDistrict");

const deliveryStateElement =
    document.getElementById("deliveryState");

const deliveryPincodeElement =
    document.getElementById("deliveryPincode");

const deliveryLandmarkElement =
    document.getElementById("deliveryLandmark");


const pickupNameElement =
    document.getElementById("pickupName");

const pickupPhoneElement =
    document.getElementById("pickupPhone");

const pickupEmailElement =
    document.getElementById("pickupEmail");

const pickupAddressElement =
    document.getElementById("pickupAddress");

const pickupCityElement =
    document.getElementById("pickupCity");

const pickupPincodeElement =
    document.getElementById("pickupPincode");


const paymentStatusElement =
    document.getElementById("paymentStatus");

const paymentAmountElement =
    document.getElementById("paymentAmount");

const paymentMethodElement =
    document.getElementById("paymentMethod");

const payNowButton =
    document.getElementById("payNowButton");

const paymentMessage =
    document.getElementById("paymentMessage");


const downloadBillButton =
    document.getElementById("downloadBillButton");

const trackButton =
    document.getElementById("trackButton");

const cancelOrderButton =
    document.getElementById("cancelOrderButton");

const cancelMessage =
    document.getElementById("cancelMessage");

const pageMessage =
    document.getElementById("pageMessage");

const backButton =
    document.getElementById("backButton");


/* =========================================================
   STATE
========================================================= */

let currentBooking = null;

let currentCustomer = null;



/* =========================================================
   GET BOOKING ID FROM URL
========================================================= */

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const requestedBookingId =
    urlParams.get("id");


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeParcelDetails
);


async function initializeParcelDetails() {

    try {

        const customer =
            await SSPAuth.requireCustomer();


        if (!customer) {
            return;
        }


        currentCustomer =
            customer.user;


        if (!requestedBookingId) {

            showPageError(
                "Booking ID is missing."
            );

            return;
        }


        await loadBooking();


        attachSectionEvents();


        attachActionEvents();

    } catch (error) {

        console.error(
            "Parcel details initialization error:",
            error
        );


        showPageError(
            "Unable to load parcel details."
        );

    }

}


/* =========================================================
   LOAD BOOKING
========================================================= */

async function loadBooking() {

    const supabase =
        window.supabaseClient;


    if (
        !supabase ||
        typeof supabase.from !== "function"
    ) {

        throw new Error(
            "Supabase client is unavailable."
        );

    }


    const {
        data,
        error
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
            special_instructions,

            status,
            call_confirmation_status,
            call_confirmed_at,
            call_confirmed_by,

            driver_id,

            service_charge,

            payment_status,
            payment_method,

            created_at,
            updated_at
        `)

        .eq(
            "booking_id",
            requestedBookingId
        )

        .eq(
            "customer_id",
            currentCustomer.id
        )

        .maybeSingle();


    if (error) {

        console.error(
            "Booking query error:",
            error
        );

        throw error;
    }


    if (!data) {

        showPageError(
            "This booking was not found."
        );

        return;
    }


    currentBooking = data;


    renderBooking(data);

}


/* =========================================================
   RENDER BOOKING
========================================================= */

function renderBooking(booking) {

    bookingIdElement.textContent =
        valueOrDash(
            booking.booking_id
        );


    bookingStatusElement.textContent =
        formatStatus(
            booking.status
        );


    bookingStatusElement.className =
        `status-badge ${getStatusClass(
            booking.status
        )}`;


    bookingDateElement.textContent =
        formatDateTime(
            booking.created_at
        );


    /* =====================================
       PARCEL
    ====================================== */

    parcelNameElement.textContent =
        valueOrDash(
            booking.parcel_name
        );

    parcelTypeElement.textContent =
        valueOrDash(
            booking.parcel_type
        );

    parcelDescriptionElement.textContent =
        valueOrDash(
            booking.parcel_description
        );

    parcelWeightElement.textContent =
        booking.parcel_weight != null
            ? `${booking.parcel_weight}`
            : "—";

    parcelPiecesElement.textContent =
        booking.pieces != null
            ? `${booking.pieces}`
            : "—";

    parcelLengthElement.textContent =
        booking.parcel_length != null
            ? `${booking.parcel_length}`
            : "—";

    parcelWidthElement.textContent =
        booking.parcel_width != null
            ? `${booking.parcel_width}`
            : "—";

    parcelHeightElement.textContent =
        booking.parcel_height != null
            ? `${booking.parcel_height}`
            : "—";

    specialInstructionsElement.textContent =
        valueOrDash(
            booking.special_instructions
        );


    /* =====================================
       RECEIVER
    ====================================== */

    receiverNameElement.textContent =
        valueOrDash(
            booking.receiver_name
        );

    receiverPhoneElement.textContent =
        valueOrDash(
            booking.receiver_phone
        );

    receiverEmailElement.textContent =
        valueOrDash(
            booking.receiver_email
        );

    deliveryAddressElement.textContent =
        valueOrDash(
            booking.delivery_address
        );

    deliveryCityElement.textContent =
        valueOrDash(
            booking.delivery_city
        );

    deliveryDistrictElement.textContent =
        valueOrDash(
            booking.delivery_district
        );

    deliveryStateElement.textContent =
        valueOrDash(
            booking.delivery_state
        );

    deliveryPincodeElement.textContent =
        valueOrDash(
            booking.delivery_pincode
        );

    deliveryLandmarkElement.textContent =
        valueOrDash(
            booking.delivery_landmark
        );


    /* =====================================
       SENDER
    ====================================== */

    pickupNameElement.textContent =
        valueOrDash(
            booking.pickup_name
        );

    pickupPhoneElement.textContent =
        valueOrDash(
            booking.pickup_phone
        );

    pickupEmailElement.textContent =
        valueOrDash(
            booking.pickup_email
        );

    pickupAddressElement.textContent =
        valueOrDash(
            booking.pickup_address
        );

    pickupCityElement.textContent =
        valueOrDash(
            booking.pickup_city
        );

    pickupPincodeElement.textContent =
        valueOrDash(
            booking.pickup_pincode
        );


    /* =====================================
       PAYMENT
    ====================================== */

    const paymentStatus =
        String(
            booking.payment_status || ""
        ).toLowerCase();


    paymentStatusElement.textContent =
        formatPaymentStatus(
            booking.payment_status
        );


    paymentAmountElement.textContent =
        formatCurrency(
            booking.service_charge
        );


    paymentMethodElement.textContent =
        valueOrDash(
            booking.payment_method
        );


    updatePaymentActions(
        booking
    );


    updateCancellationState(
        booking
    );

}


/* =========================================================
   PAYMENT ACTIONS
========================================================= */

function updatePaymentActions(
    booking
) {

    const paymentStatus =
        String(
            booking.payment_status || ""
        ).toLowerCase();


    const isPaid =
        paymentStatus === "paid";


    /* =====================================
       DOWNLOAD BILL
       Only after payment
    ====================================== */

    downloadBillButton.disabled =
        !isPaid;


    if (isPaid) {

        downloadBillButton.title =
            "Download Bill";

    } else {

        downloadBillButton.title =
            "Bill available after payment";

    }


    /* =====================================
       PAY NOW
    ====================================== */

    if (
        paymentStatus === "pending"
    ) {

        payNowButton.disabled =
            false;

        paymentMessage.textContent =
            "Payment is pending. Pay now to complete your payment.";

        return;
    }


    if (isPaid) {

        payNowButton.disabled =
            true;

        paymentMessage.textContent =
            "Payment completed.";

        return;
    }


    payNowButton.disabled =
        true;

    paymentMessage.textContent =
        "Online payment is not currently available for this booking.";

}


/* =========================================================
   CANCELLATION RULE
========================================================= */

function updateCancellationState(
    booking
) {

    const result =
        getCancellationEligibility(
            booking
        );


    cancelOrderButton.disabled =
        !result.allowed;


    if (result.allowed) {

        cancelMessage.textContent =
            `Cancellation available for ${result.remainingText}.`;

        return;
    }


    cancelMessage.textContent =
        result.reason;

}


/* =========================================================
   CHECK CANCELLATION ELIGIBILITY
========================================================= */

/* =========================================================
   CHECK CANCELLATION ELIGIBILITY
========================================================= */

function getCancellationEligibility(
    booking
) {

    const paymentStatus =
        String(
            booking.payment_status || ""
        ).toLowerCase();


    const bookingStatus =
        String(
            booking.status || ""
        ).toLowerCase();


    const callStatus =
        String(
            booking.call_confirmation_status || ""
        ).toLowerCase();


    /* =====================================
       ALREADY CANCELLED
    ====================================== */

    if (
        bookingStatus === "cancelled"
    ) {

        return {
            allowed: false,
            reason:
                "This order has already been cancelled."
        };

    }


    /* =====================================
       BOOKING MUST STILL BE PENDING
    ====================================== */

    if (
        bookingStatus !== "pending"
    ) {

        return {
            allowed: false,
            reason:
                "Cancellation is unavailable because this booking has already been processed."
        };

    }


    /* =====================================
       CALL CONFIRMATION
    ====================================== */

    if (
        callStatus !== "required"
    ) {

        return {
            allowed: false,
            reason:
                "Cancellation is unavailable because call confirmation has been completed."
        };

    }


    /* =====================================
       SERVICE PRICE
    ====================================== */

    if (
        booking.service_charge !== null &&
        booking.service_charge !== undefined
    ) {

        return {
            allowed: false,
            reason:
                "Cancellation is unavailable because the service price has been assigned."
        };

    }


    /* =====================================
       PAYMENT
    ====================================== */

    if (
        paymentStatus !== "pending"
    ) {

        return {
            allowed: false,
            reason:
                "Cancellation is unavailable because the payment status has changed."
        };

    }


    /* =====================================
       SIX-HOUR WINDOW
    ====================================== */

    const createdTime =
        new Date(
            booking.created_at
        );


    if (
        Number.isNaN(
            createdTime.getTime()
        )
    ) {

        return {
            allowed: false,
            reason:
                "Cancellation time could not be determined."
        };

    }


    const now =
        new Date();


    const sixHours =
        6 * 60 * 60 * 1000;


    const elapsed =
        now.getTime() -
        createdTime.getTime();


    /* =====================================
       FUTURE DATE PROTECTION
    ====================================== */

    if (
        elapsed < 0
    ) {

        return {
            allowed: false,
            reason:
                "Cancellation time could not be verified."
        };

    }


    /* =====================================
       SIX HOURS EXPIRED
    ====================================== */

    if (
        elapsed >= sixHours
    ) {

        return {
            allowed: false,
            reason:
                "The 6-hour cancellation period has expired."
        };

    }


    /* =====================================
       CANCELLATION ALLOWED
    ====================================== */

    const remaining =
        sixHours -
        elapsed;


    return {

        allowed: true,

        remainingText:
            formatRemainingTime(
                remaining
            )

    };

}


/* =========================================================
   SECTION ACCORDION
========================================================= */

function attachSectionEvents() {

    const sectionButtons =
        document.querySelectorAll(
            ".detail-section-header"
        );


    sectionButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    const targetId =
                        getSectionTarget(
                            button.dataset.section
                        );


                    const content =
                        document.getElementById(
                            targetId
                        );


                    if (!content) {
                        return;
                    }


                    const isOpen =
                        button.getAttribute(
                            "aria-expanded"
                        ) === "true";


                    button.setAttribute(
                        "aria-expanded",
                        String(!isOpen)
                    );


                    content.hidden =
                        isOpen;

                }
            );

        }
    );

}


/* =========================================================
   SECTION TARGET
========================================================= */

function getSectionTarget(
    section
) {

    const map = {

        parcel:
            "parcelSection",

        receiver:
            "receiverSection",

        sender:
            "senderSection",

        payment:
            "paymentSection"

    };


    return map[section];

}


/* =========================================================
   ACTION EVENTS
========================================================= */

function attachActionEvents() {

    /* =====================================
       BACK
    ====================================== */

    backButton.addEventListener(
        "click",
        function () {

            if (
                window.history.length > 1
            ) {

                window.history.back();

            } else {

                window.location.href =
                    "order-history.html";

            }

        }
    );


    /* =====================================
       PAY NOW
    ====================================== */

    payNowButton.addEventListener(
        "click",
        function () {

            if (
                !currentBooking ||
                payNowButton.disabled
            ) {
                return;
            }


            const id =
                currentBooking.booking_id;


            window.location.href =
                `payment.html?id=${encodeURIComponent(id)}`;

        }
    );


    /* =====================================
       TRACK
    ====================================== */

    trackButton.addEventListener(
        "click",
        function () {

            if (!currentBooking) {
                return;
            }


            const id =
                currentBooking.booking_id;


            window.location.href =
                `track-parcel.html?id=${encodeURIComponent(id)}`;

        }
    );


    /* =====================================
       DOWNLOAD BILL
    ====================================== */

    downloadBillButton.addEventListener(
        "click",
        function () {

            if (
                !currentBooking ||
                downloadBillButton.disabled
            ) {
                return;
            }


            downloadBill(
                currentBooking
            );

        }
    );


    /* =====================================
       CANCEL
    ====================================== */

    cancelOrderButton.addEventListener(
        "click",
        handleCancelOrder
    );

}


/* =========================================================
   CANCEL ORDER
========================================================= */

/* =========================================================
   CANCEL ORDER
========================================================= */

async function handleCancelOrder() {

    if (
        !currentBooking ||
        cancelOrderButton.disabled
    ) {
        return;
    }


    /*
       Check the current booking locally first.
       The database performs the final security check.
    */

    const eligibility =
        getCancellationEligibility(
            currentBooking
        );


    if (!eligibility.allowed) {

        updateCancellationState(
            currentBooking
        );

        return;
    }


    const confirmed =
        window.confirm(
            "Are you sure you want to cancel this order?"
        );


    if (!confirmed) {
        return;
    }


    cancelOrderButton.disabled =
        true;

    cancelMessage.textContent =
        "Cancelling order...";


    try {

        const {
            data,
            error
        } = await supabase.rpc(
            "cancel_customer_booking",
            {
                p_booking_id:
                    currentBooking.booking_id
            }
        );


        if (error) {

            console.error(
                "Cancel order error:",
                error
            );

            throw error;
        }


        if (
            !data ||
            data.success !== true
        ) {

            throw new Error(
                "The booking could not be cancelled."
            );

        }


        /*
           Update the local booking state
           immediately after successful
           database cancellation.
        */

        currentBooking.status =
            "cancelled";


        currentBooking.updated_at =
            new Date().toISOString();


        renderBooking(
            currentBooking
        );


        cancelOrderButton.disabled =
            true;


        cancelMessage.textContent =
            "Order cancelled successfully.";


    } catch (error) {

        console.error(
            "Cancellation failed:",
            error
        );


        updateCancellationState(
            currentBooking
        );


        cancelMessage.textContent =
            error.message ||
            "The order could not be cancelled. Please try again.";

    }

}

/* =========================================================
   DOWNLOAD BILL
========================================================= */

function downloadBill(
    booking
) {

    /*
     * This is intentionally kept as a client-side
     * bill-generation placeholder.
     *
     * It uses only the real booking data.
     *
     * When the final SSP invoice/PDF system is
     * implemented, this function can be connected
     * to that generated invoice.
     */

    const billNumber =
        booking.booking_id || "SSP-BILL";


    const amount =
        formatCurrency(
            booking.service_charge
        );


    const billText = [

        "SRI SADGURU SIDDAROODA PARCEL SERVICE",

        "",

        "PAYMENT BILL",

        "--------------------------------",

        `Booking ID: ${booking.booking_id || "—"}`,

        `Booking Date: ${formatDateTime(booking.created_at)}`,

        "",

        `Sender: ${booking.pickup_name || "—"}`,

        `Receiver: ${booking.receiver_name || "—"}`,

        "",

        `Parcel: ${booking.parcel_name || "—"}`,

        `Parcel Type: ${booking.parcel_type || "—"}`,

        "",

        `Amount: ${amount}`,

        `Payment Status: ${formatPaymentStatus(booking.payment_status)}`,

        `Payment Method: ${booking.payment_method || "—"}`,

        "",

        "--------------------------------",

        "Sri Sadguru Siddarooda Parcel Service"

    ].join("\n");


    const blob =
        new Blob(
            [billText],
            {
                type:
                    "text/plain;charset=utf-8"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const anchor =
        document.createElement(
            "a"
        );


    anchor.href =
        url;


    anchor.download =
        `${billNumber}-bill.txt`;


    document.body.appendChild(
        anchor
    );


    anchor.click();


    anchor.remove();


    URL.revokeObjectURL(
        url
    );

}


/* =========================================================
   HELPERS
========================================================= */

function valueOrDash(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }


    const text =
        String(value).trim();


    return text || "—";

}


/* =========================================================
   FORMAT DATE
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
        return "—";
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
   FORMAT CURRENCY
========================================================= */

function formatCurrency(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "₹ —";

    }


    const amount =
        Number(value);


    if (
        Number.isNaN(amount)
    ) {

        return "₹ —";

    }


    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(amount);

}


/* =========================================================
   FORMAT STATUS
========================================================= */

function formatStatus(
    status
) {

    if (!status) {
        return "Unknown";
    }


    return String(status)
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );

}


/* =========================================================
   PAYMENT STATUS
========================================================= */

function formatPaymentStatus(
    status
) {

    if (!status) {
        return "Unknown";
    }


    return String(status)
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(
    status
) {

    const normalized =
        String(
            status || ""
        ).toLowerCase();


    if (
        normalized === "delivered"
    ) {
        return "status-delivered";
    }


    if (
        normalized === "cancelled"
    ) {
        return "status-cancelled";
    }


    if (
        normalized === "pending"
    ) {
        return "status-pending";
    }


    return "status-active";

}


/* =========================================================
   REMAINING TIME
========================================================= */

function formatRemainingTime(
    milliseconds
) {

    const totalMinutes =
        Math.floor(
            milliseconds /
            (1000 * 60)
        );


    const hours =
        Math.floor(
            totalMinutes / 60
        );


    const minutes =
        totalMinutes % 60;


    if (hours > 0) {

        return `${hours}h ${minutes}m`;

    }


    return `${minutes}m`;

}


/* =========================================================
   PAGE ERROR
========================================================= */

function showPageError(
    message
) {

    if (!pageMessage) {
        return;
    }


    pageMessage.textContent =
        message;


    pageMessage.classList.add(
        "show"
    );

}
