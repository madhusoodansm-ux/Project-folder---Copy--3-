/* =========================================================
   SSP DRIVER PORTAL
   BOOKING DETAILS JAVASCRIPT

   DATA SOURCE:
       Supabase public.bookings

   AUTH:
       Existing ../js/auth.js

   BOOKING RELATION:
       bookings.driver_id -> drivers.id

   URL:
       booking-details.html?id=BOOKING_UUID

   IMPORTANT:
       This page does NOT use localStorage for booking data.
========================================================= */

"use strict";


/* =========================================================
   SUPABASE
========================================================= */

const supabase =
    window.supabaseClient;


/* =========================================================
   PAGE STATE
========================================================= */

let currentDriver = null;

let currentBooking = null;

let bookingIdentifier = null;

let realtimeChannel = null;

let refreshTimer = null;


/* =========================================================
   DOM
========================================================= */

const elements = {

    loadingState:
        document.getElementById(
            "loadingState"
        ),

    errorState:
        document.getElementById(
            "errorState"
        ),

    errorTitle:
        document.getElementById(
            "errorTitle"
        ),

    errorMessage:
        document.getElementById(
            "errorMessage"
        ),

    bookingContent:
        document.getElementById(
            "bookingContent"
        ),

    retryButton:
        document.getElementById(
            "retryButton"
        ),

    refreshButton:
        document.getElementById(
            "refreshButton"
        ),

    backButton:
        document.getElementById(
            "backButton"
        ),

    backActionButton:
        document.getElementById(
            "backActionButton"
        ),

    refreshActionButton:
        document.getElementById(
            "refreshActionButton"
        ),

    bookingId:
        document.getElementById(
            "bookingId"
        ),

    bookingCreated:
        document.getElementById(
            "bookingCreated"
        ),

    bookingStatus:
        document.getElementById(
            "bookingStatus"
        ),

    infoBookingId:
        document.getElementById(
            "infoBookingId"
        ),

    bookingDate:
        document.getElementById(
            "bookingDate"
        ),

    bookingTime:
        document.getElementById(
            "bookingTime"
        ),

    serviceType:
        document.getElementById(
            "serviceType"
        ),

    infoStatus:
        document.getElementById(
            "infoStatus"
        ),

    driverId:
        document.getElementById(
            "driverId"
        ),

    pickupName:
        document.getElementById(
            "pickupName"
        ),

    pickupPhone:
        document.getElementById(
            "pickupPhone"
        ),

    callPickupButton:
        document.getElementById(
            "callPickupButton"
        ),

    pickupAddress:
        document.getElementById(
            "pickupAddress"
        ),

    pickupSchedule:
        document.getElementById(
            "pickupSchedule"
        ),

    pickupStatus:
        document.getElementById(
            "pickupStatus"
        ),

    receiverName:
        document.getElementById(
            "receiverName"
        ),

    receiverPhone:
        document.getElementById(
            "receiverPhone"
        ),

    callReceiverButton:
        document.getElementById(
            "callReceiverButton"
        ),

    deliveryAddress:
        document.getElementById(
            "deliveryAddress"
        ),

    deliveryLandmark:
        document.getElementById(
            "deliveryLandmark"
        ),

    deliveryCity:
        document.getElementById(
            "deliveryCity"
        ),

    deliveryDistrict:
        document.getElementById(
            "deliveryDistrict"
        ),

    deliveryState:
        document.getElementById(
            "deliveryState"
        ),

    deliveryPincode:
        document.getElementById(
            "deliveryPincode"
        ),

    deliverySchedule:
        document.getElementById(
            "deliverySchedule"
        ),

    deliveryStatus:
        document.getElementById(
            "deliveryStatus"
        ),

    parcelName:
        document.getElementById(
            "parcelName"
        ),

    parcelType:
        document.getElementById(
            "parcelType"
        ),

    pieces:
        document.getElementById(
            "pieces"
        ),

    parcelWeight:
        document.getElementById(
            "parcelWeight"
        ),

    parcelDescription:
        document.getElementById(
            "parcelDescription"
        ),

    dimensions:
        document.getElementById(
            "dimensions"
        ),

    basePrice:
        document.getElementById(
            "basePrice"
        ),

    distanceCharge:
        document.getElementById(
            "distanceCharge"
        ),

    handlingCharge:
        document.getElementById(
            "handlingCharge"
        ),

    gstAmount:
        document.getElementById(
            "gstAmount"
        ),

    serviceCharge:
        document.getElementById(
            "serviceCharge"
        ),

    totalAmount:
        document.getElementById(
            "totalAmount"
        ),

    receivedAmount:
        document.getElementById(
            "receivedAmount"
        ),

    balanceAmount:
        document.getElementById(
            "balanceAmount"
        ),

    paymentMethod:
        document.getElementById(
            "paymentMethod"
        ),

    paymentStatus:
        document.getElementById(
            "paymentStatus"
        ),

    paymentStatusText:
        document.getElementById(
            "paymentStatusText"
        ),

    collectionStatus:
        document.getElementById(
            "collectionStatus"
        ),

    timeline:
        document.getElementById(
            "timeline"
        ),

    podTitle:
        document.getElementById(
            "podTitle"
        ),

    podDetails:
        document.getElementById(
            "podDetails"
        ),

    viewPodButton:
        document.getElementById(
            "viewPodButton"
        ),

    adminNotes:
        document.getElementById(
            "adminNotes"
        ),

    toast:
        document.getElementById(
            "toast"
        ),

    toastIcon:
        document.getElementById(
            "toastIcon"
        ),

    toastMessage:
        document.getElementById(
            "toastMessage"
        ),

    sidebar:
        document.getElementById(
            "sidebar"
        ),

    sidebarOverlay:
        document.getElementById(
            "sidebarOverlay"
        ),

    sidebarClose:
        document.getElementById(
            "sidebarClose"
        ),

    menuButton:
        document.getElementById(
            "menuButton"
        ),

    sidebarLogout:
        document.getElementById(
            "sidebarLogout"
        )

};


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializePage
);


async function initializePage() {

    setupNavigation();

    setupSidebar();

    setupActions();

    bookingIdentifier =
        getBookingIdentifier();

    if (!bookingIdentifier) {

        showError(
            "Booking ID missing",
            "Open Booking Details from a shipment, pickup or delivery card."
        );

        return;

    }


    await authenticateAndLoad();

}


/* =========================================================
   AUTHENTICATION
========================================================= */

async function authenticateAndLoad() {

    showLoading();


    try {

        /*
           IMPORTANT:

           Existing auth.js is responsible for:
           - Supabase session
           - profile
           - driver role
           - active status
           - drivers record
           - driver/profile relationship

           We do NOT recreate authentication here.
        */

        if (
            typeof window.requireDriver !==
            "function"
        ) {

            throw new Error(
                "Driver authentication module is not available."
            );

        }


        currentDriver =
            await window.requireDriver();


        if (!currentDriver) {

            return;

        }


        await loadBooking();


        await loadBookingTimeline();


        setupRealtime();


        setupPeriodicRefresh();

    }
    catch (error) {

        console.error(
            "Booking Details initialization failed:",
            error
        );


        showError(
            "Unable to load booking",
            error?.message ||
            "Something went wrong while loading the booking."
        );

    }

}


/* =========================================================
   GET BOOKING IDENTIFIER
========================================================= */

function getBookingIdentifier() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return (
        params.get("id") ||
        params.get("booking_id") ||
        ""
    ).trim();

}


/* =========================================================
   LOAD BOOKING
========================================================= */

async function loadBooking() {

    if (
        !supabase
    ) {

        throw new Error(
            "Supabase client is not available."
        );

    }


    if (
        !currentDriver?.driverUuid
    ) {

        throw new Error(
            "Authenticated driver ID is not available."
        );

    }


    let query;


    /*
       First try UUID.

       Existing pickup/delivery pages normally
       navigate using booking.id.
    */

    query =
        await supabase
            .from("bookings")
            .select("*")
            .eq(
                "id",
                bookingIdentifier
            )
            .eq(
                "driver_id",
                currentDriver.driverUuid
            )
            .maybeSingle();


    if (
        query.error
    ) {

        /*
           If the supplied ID is not a UUID,
           try human-readable booking_id.
        */

        query =
            await supabase
                .from("bookings")
                .select("*")
                .eq(
                    "booking_id",
                    bookingIdentifier
                )
                .eq(
                    "driver_id",
                    currentDriver.driverUuid
                )
                .maybeSingle();

    }


    /*
       If UUID query simply returned no row,
       also try booking_id.

       This makes the page compatible with
       both old and new navigation.
    */

    if (
        !query.error &&
        !query.data
    ) {

        query =
            await supabase
                .from("bookings")
                .select("*")
                .eq(
                    "booking_id",
                    bookingIdentifier
                )
                .eq(
                    "driver_id",
                    currentDriver.driverUuid
                )
                .maybeSingle();

    }


    if (
        query.error
    ) {

        console.error(
            "Booking query failed:",
            query.error
        );

        throw new Error(
            query.error.message ||
            "Unable to load booking from Supabase."
        );

    }


    if (
        !query.data
    ) {

        throw new Error(
            "This booking was not found or is not assigned to the current driver."
        );

    }


    currentBooking =
        query.data;


    renderBooking(
        currentBooking
    );


    hideLoading();

}


/* =========================================================
   RENDER BOOKING
========================================================= */

function renderBooking(
    booking
) {

    if (!booking) {
        return;
    }


    /* =====================================================
       HEADER
    ================================================== */

    const bookingNumber =
        booking.booking_id ||
        booking.bookingId ||
        booking.id ||
        "—";


    elements.bookingId.textContent =
        bookingNumber;


    elements.infoBookingId.textContent =
        bookingNumber;


    elements.bookingCreated.textContent =
        formatDateTime(
            booking.created_at
        );


    setStatusBadge(
        elements.bookingStatus,
        booking.status
    );


    /* =====================================================
       BASIC INFORMATION
    ================================================== */

    elements.bookingDate.textContent =
        formatDate(
            booking.booking_date
        );


    elements.bookingTime.textContent =
        booking.booking_time ||
        "—";


    elements.serviceType.textContent =
        formatLabel(
            booking.service_type
        );


    elements.infoStatus.textContent =
        formatStatus(
            booking.status
        );


    elements.driverId.textContent =
        currentDriver?.driverId ||
        booking.driver_id ||
        "—";


    /* =====================================================
       PICKUP
    ================================================== */

    elements.pickupName.textContent =
        valueOrDash(
            booking.pickup_name
        );


    elements.pickupPhone.textContent =
        valueOrDash(
            booking.pickup_phone
        );


    setPhoneLink(
        elements.callPickupButton,
        booking.pickup_phone
    );


    elements.pickupAddress.textContent =
        buildAddress(
            booking.pickup_address,
            booking.pickup_city,
            booking.pickup_district,
            booking.pickup_state,
            booking.pickup_pincode
        );


    elements.pickupSchedule.textContent =
        formatSchedule(
            booking.pickup_scheduled_at,
            booking.booking_date,
            booking.booking_time
        );


    elements.pickupStatus.textContent =
        getPickupStatus(
            booking.status
        );


    /* =====================================================
       DELIVERY
    ================================================== */

    elements.receiverName.textContent =
        valueOrDash(
            booking.receiver_name
        );


    elements.receiverPhone.textContent =
        valueOrDash(
            booking.receiver_phone
        );


    setPhoneLink(
        elements.callReceiverButton,
        booking.receiver_phone
    );


    elements.deliveryAddress.textContent =
        buildAddress(
            booking.delivery_address,
            booking.delivery_city,
            booking.delivery_district,
            booking.delivery_state,
            booking.delivery_pincode
        );


    elements.deliveryLandmark.textContent =
        valueOrDash(
            booking.delivery_landmark
        );


    elements.deliveryCity.textContent =
        valueOrDash(
            booking.delivery_city
        );


    elements.deliveryDistrict.textContent =
        valueOrDash(
            booking.delivery_district
        );


    elements.deliveryState.textContent =
        valueOrDash(
            booking.delivery_state
        );


    elements.deliveryPincode.textContent =
        valueOrDash(
            booking.delivery_pincode
        );


    elements.deliverySchedule.textContent =
        formatSchedule(
            booking.delivery_scheduled_at,
            booking.booking_date,
            booking.booking_time
        );


    elements.deliveryStatus.textContent =
        getDeliveryStatus(
            booking.status
        );


    /* =====================================================
       PARCEL
    ================================================== */

    elements.parcelName.textContent =
        valueOrDash(
            booking.parcel_name
        );


    elements.parcelType.textContent =
        valueOrDash(
            booking.parcel_type
        );


    elements.pieces.textContent =
        booking.pieces ??
        "1";


    elements.parcelWeight.textContent =
        booking.parcel_weight !== null &&
        booking.parcel_weight !== undefined &&
        booking.parcel_weight !== ""
            ? `${booking.parcel_weight} kg`
            : "—";


    elements.parcelDescription.textContent =
        valueOrDash(
            booking.parcel_description
        );


    elements.dimensions.textContent =
        valueOrDash(
            booking.dimensions_text
        );


    /* =====================================================
       PAYMENT
    ================================================== */

    renderPayment(
        booking
    );


    /* =====================================================
       POD
    ================================================== */

    renderProofOfDelivery(
        booking
    );


    /* =====================================================
       NOTES
    ================================================== */

    elements.adminNotes.textContent =
        booking.admin_notes ||
        "No notes available.";


    elements.bookingContent
        .classList
        .remove("hidden");

}


/* =========================================================
   PAYMENT
========================================================= */

function renderPayment(
    booking
) {

    /*
       SSP payment calculation:

       Base Price
       + Distance Charge
       + Handling Charge
       + GST
       + Service Charge
       = Total Amount

       Received Amount
       = COALESCE(received_amount, 0)

       Balance
       = Total - Received
    */

    const base =
        toNumber(
            booking.base_price
        );


    const distance =
        toNumber(
            booking.distance_charge
        );


    const handling =
        toNumber(
            booking.handling_charge
        );


    const gst =
        toNumber(
            booking.gst_amount
        );


    const service =
        toNumber(
            booking.service_charge
        );


    const total =
        base +
        distance +
        handling +
        gst +
        service;


    const received =
        Math.max(
            0,
            toNumber(
                booking.received_amount
            )
        );


    const balance =
        Math.max(
            0,
            total - received
        );


    elements.basePrice.textContent =
        formatCurrency(
            base
        );


    elements.distanceCharge.textContent =
        formatCurrency(
            distance
        );


    elements.handlingCharge.textContent =
        formatCurrency(
            handling
        );


    elements.gstAmount.textContent =
        formatCurrency(
            gst
        );


    elements.serviceCharge.textContent =
        formatCurrency(
            service
        );


    elements.totalAmount.textContent =
        formatCurrency(
            total
        );


    elements.receivedAmount.textContent =
        formatCurrency(
            received
        );


    elements.balanceAmount.textContent =
        formatCurrency(
            balance
        );


    elements.paymentMethod.textContent =
        formatLabel(
            booking.payment_method
        );


    const paymentStatus =
        booking.payment_status ||
        calculatePaymentStatus(
            total,
            received
        );


    elements.paymentStatusText.textContent =
        formatLabel(
            paymentStatus
        );


    setPaymentStatusBadge(
        elements.paymentStatus,
        paymentStatus
    );


    elements.collectionStatus.textContent =
        getCollectionStatus(
            total,
            received,
            paymentStatus
        );

}


/* =========================================================
   PAYMENT STATUS
========================================================= */

function calculatePaymentStatus(
    total,
    received
) {

    if (
        total <= 0
    ) {

        return "pending";

    }


    if (
        received <= 0
    ) {

        return "pending";

    }


    if (
        received < total
    ) {

        return "partially_paid";

    }


    return "paid";

}


/* =========================================================
   COLLECTION STATUS
========================================================= */

function getCollectionStatus(
    total,
    received,
    paymentStatus
) {

    if (
        paymentStatus ===
        "refunded"
    ) {

        return "Refunded";

    }


    if (
        paymentStatus ===
        "cancelled"
    ) {

        return "Cancelled";

    }


    if (
        total <= 0
    ) {

        return "No amount due";

    }


    if (
        received >= total
    ) {

        return "Fully collected";

    }


    if (
        received > 0
    ) {

        return "Partially collected";

    }


    return "Amount pending";

}


/* =========================================================
   TIMELINE
========================================================= */

async function loadBookingTimeline() {

    if (
        !currentBooking?.id
    ) {

        return;

    }


    elements.timeline.innerHTML = `
        <div class="timeline-loading">
            Loading timeline...
        </div>
    `;


    const {
        data,
        error
    } =
        await supabase
            .from("booking_status_history")
            .select("*")
            .eq(
                "booking_id",
                currentBooking.id
            )
            .order(
                "changed_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Timeline query failed:",
            error
        );


        elements.timeline.innerHTML = `
            <div class="timeline-loading">
                Timeline information is currently unavailable.
            </div>
        `;

        return;

    }


    const history =
        Array.isArray(data)
            ? data
            : [];


    /*
       If history does not yet contain anything,
       show the current booking status.
    */

    if (
        !history.length
    ) {

        elements.timeline.innerHTML = `
            ${createTimelineItem(
                currentBooking.status,
                currentBooking.updated_at ||
                currentBooking.created_at,
                "Current booking status"
            )}
        `;

        return;

    }


    elements.timeline.innerHTML =
        history
            .map(
                item =>
                    createTimelineItem(
                        item.status,
                        item.changed_at,
                        item.note
                    )
            )
            .join("");

}


/* =========================================================
   CREATE TIMELINE ITEM
========================================================= */

function createTimelineItem(
    status,
    date,
    note
) {

    return `
        <div class="timeline-item">

            <div class="timeline-dot"></div>

            <div class="timeline-content">

                <strong>
                    ${escapeHTML(
                        formatStatus(status)
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        formatDateTime(date)
                    )}
                </span>

                ${
                    note
                        ? `
                            <p>
                                ${escapeHTML(
                                    note
                                )}
                            </p>
                          `
                        : ""
                }

            </div>

        </div>
    `;

}


/* =========================================================
   PROOF OF DELIVERY
========================================================= */

function renderProofOfDelivery(
    booking
) {

    const hasPod =
        Boolean(
            booking.pod_path ||
            booking.pod_file_name ||
            booking.pod_uploaded_at
        );


    if (!hasPod) {

        elements.podTitle.textContent =
            "No proof of delivery uploaded";


        elements.podDetails.textContent =
            "Proof of delivery will appear here after upload.";


        elements.viewPodButton
            .classList
            .add("hidden");


        return;

    }


    elements.podTitle.textContent =
        booking.pod_file_name ||
        "Proof of delivery uploaded";


    elements.podDetails.textContent =
        booking.pod_uploaded_at
            ? `Uploaded ${formatDateTime(
                booking.pod_uploaded_at
            )}`
            : "Proof of delivery is available.";


    /*
       The delivery-pod bucket is private.

       We create a temporary signed URL only
       when the driver requests to view the POD.
    */

    elements.viewPodButton
        .classList
        .remove("hidden");


    elements.viewPodButton.onclick =
        openProofOfDelivery;

}


/* =========================================================
   OPEN POD
========================================================= */

async function openProofOfDelivery() {

    if (
        !currentBooking?.pod_path
    ) {

        showToast(
            "Proof of delivery file is not available.",
            "error"
        );

        return;

    }


    try {

        const {
            data,
            error
        } =
            await supabase
                .storage
                .from("delivery-pod")
                .createSignedUrl(
                    currentBooking.pod_path,
                    300
                );


        if (error) {

            throw error;

        }


        if (
            !data?.signedUrl
        ) {

            throw new Error(
                "Unable to create POD viewing link."
            );

        }


        window.open(
            data.signedUrl,
            "_blank",
            "noopener,noreferrer"
        );

    }
    catch (error) {

        console.error(
            "POD viewing failed:",
            error
        );


        showToast(
            error.message ||
            "Unable to open proof of delivery.",
            "error"
        );

    }

}


/* =========================================================
   REALTIME
========================================================= */

function setupRealtime() {

    if (
        !supabase ||
        !currentBooking?.id
    ) {

        return;

    }


    if (
        realtimeChannel
    ) {

        supabase.removeChannel(
            realtimeChannel
        );

    }


    realtimeChannel =
        supabase
            .channel(
                `driver-booking-details-${currentBooking.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "bookings",
                    filter:
                        `id=eq.${currentBooking.id}`
                },
                async payload => {

                    console.log(
                        "Booking realtime update:",
                        payload
                    );


                    /*
                       Re-read the booking from Supabase
                       instead of trusting the event payload.

                       This guarantees that the page displays
                       the latest database state.
                    */

                    await loadBooking();

                    await loadBookingTimeline();

                    showToast(
                        "Booking information updated.",
                        "success"
                    );

                }
            )
            .subscribe();

}


/* =========================================================
   PERIODIC REFRESH
========================================================= */

function setupPeriodicRefresh() {

    if (
        refreshTimer
    ) {

        clearInterval(
            refreshTimer
        );

    }


    /*
       Realtime handles normal database changes.

       This periodic refresh is a fallback in case
       the browser temporarily loses the realtime
       connection.
    */

    refreshTimer =
        setInterval(
            async () => {

                if (
                    document.visibilityState !==
                    "visible"
                ) {

                    return;

                }


                try {

                    await loadBooking();

                    await loadBookingTimeline();

                }
                catch (error) {

                    console.error(
                        "Automatic booking refresh failed:",
                        error
                    );

                }

            },
            30000
        );

}


/* =========================================================
   MANUAL REFRESH
========================================================= */

async function refreshBooking() {

    try {

        setRefreshing(
            true
        );


        await loadBooking();

        await loadBookingTimeline();


        showToast(
            "Booking details refreshed.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "Manual refresh failed:",
            error
        );


        showToast(
            error.message ||
            "Unable to refresh booking.",
            "error"
        );

    }
    finally {

        setRefreshing(
            false
        );

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function goBack() {

    if (
        document.referrer &&
        document.referrer.includes(
            window.location.origin
        )
    ) {

        window.history.back();

        return;

    }


    window.location.href =
        "shipments.html";

}


/* =========================================================
   SIDEBAR
========================================================= */

function setupSidebar() {

    elements.menuButton?.addEventListener(
        "click",
        openSidebar
    );


    elements.sidebarClose?.addEventListener(
        "click",
        closeSidebar
    );


    elements.sidebarOverlay?.addEventListener(
        "click",
        closeSidebar
    );


    elements.sidebarLogout?.addEventListener(
        "click",
        handleLogout
    );

}


function openSidebar() {

    elements.sidebar
        ?.classList
        .add("open");


    elements.sidebarOverlay
        ?.classList
        .remove("hidden");


    document.body.style.overflow =
        "hidden";

}


function closeSidebar() {

    elements.sidebar
        ?.classList
        .remove("open");


    elements.sidebarOverlay
        ?.classList
        .add("hidden");


    document.body.style.overflow =
        "";

}


async function handleLogout() {

    try {

        if (
            typeof window.logoutDriver ===
            "function"
        ) {

            await window.logoutDriver();

        }
        else if (
            window.driverAuth?.logout
        ) {

            await window.driverAuth.logout();

        }


        window.location.href =
            "../index.html";

    }
    catch (error) {

        console.error(
            "Logout failed:",
            error
        );

    }

}


/* =========================================================
   ACTIONS
========================================================= */

function setupActions() {

    elements.backButton?.addEventListener(
        "click",
        goBack
    );


    elements.backActionButton?.addEventListener(
        "click",
        goBack
    );


    elements.refreshButton?.addEventListener(
        "click",
        refreshBooking
    );


    elements.refreshActionButton?.addEventListener(
        "click",
        refreshBooking
    );


    elements.retryButton?.addEventListener(
        "click",
        async () => {

            await authenticateAndLoad();

        }
    );

}


/* =========================================================
   LOADING
========================================================= */

function showLoading() {

    elements.loadingState
        ?.classList
        .remove("hidden");


    elements.errorState
        ?.classList
        .add("hidden");


    elements.bookingContent
        ?.classList
        .add("hidden");

}


function hideLoading() {

    elements.loadingState
        ?.classList
        .add("hidden");


    elements.errorState
        ?.classList
        .add("hidden");


    elements.bookingContent
        ?.classList
        .remove("hidden");

}


function showError(
    title,
    message
) {

    elements.loadingState
        ?.classList
        .add("hidden");


    elements.bookingContent
        ?.classList
        .add("hidden");


    elements.errorState
        ?.classList
        .remove("hidden");


    elements.errorTitle.textContent =
        title ||
        "Unable to load booking";


    elements.errorMessage.textContent =
        message ||
        "Booking information could not be loaded.";

}


/* =========================================================
   REFRESH BUTTON STATE
========================================================= */

function setRefreshing(
    isRefreshing
) {

    const buttons = [
        elements.refreshButton,
        elements.refreshActionButton
    ];


    buttons.forEach(
        button => {

            if (!button) {
                return;
            }


            button.disabled =
                isRefreshing;


            const icon =
                button.querySelector(
                    "i"
                );


            if (
                isRefreshing
            ) {

                icon?.classList.add(
                    "fa-spin"
                );

            }
            else {

                icon?.classList.remove(
                    "fa-spin"
                );

            }

        }
    );

}


/* =========================================================
   PHONE
========================================================= */

function setPhoneLink(
    element,
    phone
) {

    if (
        !element
    ) {

        return;

    }


    if (
        !phone
    ) {

        element.removeAttribute(
            "href"
        );

        element.classList.add(
            "hidden"
        );

        return;

    }


    const cleanPhone =
        String(
            phone
        ).replace(
            /[^+\d]/g,
            ""
        );


    element.href =
        `tel:${cleanPhone}`;


    element.classList.remove(
        "hidden"
    );

}


/* =========================================================
   STATUS
========================================================= */

function setStatusBadge(
    element,
    status
) {

    if (
        !element
    ) {

        return;

    }


    element.textContent =
        formatStatus(
            status
        );


    element.className =
        "status-badge";


    const normalized =
        String(
            status ||
            ""
        ).toLowerCase();


    if (
        normalized ===
        "delivered"
    ) {

        element.style.background =
            "#eaf8f0";

        element.style.color =
            "#219653";

    }
    else if (
        normalized ===
        "cancelled"
    ) {

        element.style.background =
            "#fff0f1";

        element.style.color =
            "#dc3545";

    }
    else if (
        normalized ===
        "out_for_delivery"
    ) {

        element.style.background =
            "#f3edff";

        element.style.color =
            "#7e57c2";

    }
    else {

        element.style.background =
            "#eef5ff";

        element.style.color =
            "#0d4da1";

    }

}


/* =========================================================
   PAYMENT BADGE
========================================================= */

function setPaymentStatusBadge(
    element,
    status
) {

    if (
        !element
    ) {

        return;

    }


    element.textContent =
        formatLabel(
            status
        );


    element.className =
        "payment-status-badge";


    const normalized =
        String(
            status ||
            ""
        ).toLowerCase();


    if (
        normalized ===
        "paid"
    ) {

        element.style.background =
            "#eaf8f0";

        element.style.color =
            "#219653";

    }
    else if (
        normalized ===
        "partially_paid"
    ) {

        element.style.background =
            "#fff7e6";

        element.style.color =
            "#b26b00";

    }
    else if (
        normalized ===
        "failed" ||
        normalized ===
        "cancelled"
    ) {

        element.style.background =
            "#fff0f1";

        element.style.color =
            "#dc3545";

    }
    else {

        element.style.background =
            "#eef5ff";

        element.style.color =
            "#0d4da1";

    }

}


/* =========================================================
   STATUS HELPERS
========================================================= */

function formatStatus(
    status
) {

    if (!status) {
        return "Unknown";
    }


    return String(
        status
    )
        .replace(
            /_/g,
            " "
        )
        .replace(
            /\b\w/g,
            character =>
                character.toUpperCase()
        );

}


function formatLabel(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "Not specified";

    }


    return formatStatus(
        value
    );

}


function getPickupStatus(
    status
) {

    switch (
        String(
            status ||
            ""
        )
    ) {

        case "pickup_started":
            return "Pickup started";

        case "picked_up":
            return "Picked up";

        case "in_transit":
            return "In transit";

        case "out_for_delivery":
            return "In transit";

        case "delivered":
            return "Completed";

        case "cancelled":
            return "Cancelled";

        default:
            return "Pending";

    }

}


function getDeliveryStatus(
    status
) {

    switch (
        String(
            status ||
            ""
        )
    ) {

        case "out_for_delivery":
            return "Out for delivery";

        case "delivered":
            return "Delivered";

        case "cancelled":
            return "Cancelled";

        default:
            return "Pending";

    }

}


/* =========================================================
   ADDRESS
========================================================= */

function buildAddress(
    address,
    city,
    district,
    state,
    pincode
) {

    return [
        address,
        city,
        district,
        state,
        pincode
    ]
        .filter(
            item =>
                item !== null &&
                item !== undefined &&
                String(item).trim() !== ""
        )
        .join(", ") ||
        "Address not available";

}


/* =========================================================
   SCHEDULE
========================================================= */

function formatSchedule(
    scheduledAt,
    fallbackDate,
    fallbackTime
) {

    if (
        scheduledAt
    ) {

        return formatDateTime(
            scheduledAt
        );

    }


    const combined =
        [
            fallbackDate,
            fallbackTime
        ]
            .filter(Boolean)
            .join(" ");


    return combined ||
        "Not scheduled";

}


/* =========================================================
   DATE
========================================================= */

function formatDate(
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

        return String(
            value
        );

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

        return String(
            value
        );

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
   CURRENCY
========================================================= */

function toNumber(
    value
) {

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


function formatCurrency(
    amount
) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(
        toNumber(
            amount
        )
    );

}


/* =========================================================
   VALUE
========================================================= */

function valueOrDash(
    value
) {

    if (
        value === null ||
        value === undefined ||
        String(
            value
        ).trim() === ""
    ) {

        return "—";

    }


    return String(
        value
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ??
        ""
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


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(
    message,
    type = "info"
) {

    if (
        !elements.toast
    ) {

        return;

    }


    clearTimeout(
        toastTimer
    );


    elements.toastMessage.textContent =
        message;


    elements.toast.className =
        `toast ${type}`;


    if (
        type === "success"
    ) {

        elements.toastIcon.className =
            "fa-solid fa-circle-check";

    }
    else if (
        type === "error"
    ) {

        elements.toastIcon.className =
            "fa-solid fa-circle-exclamation";

    }
    else {

        elements.toastIcon.className =
            "fa-solid fa-circle-info";

    }


    elements.toast.classList.remove(
        "hidden"
    );


    toastTimer =
        setTimeout(
            () => {

                elements.toast.classList.add(
                    "hidden"
                );

            },
            3500
        );

}


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (
            realtimeChannel &&
            supabase
        ) {

            supabase.removeChannel(
                realtimeChannel
            );

        }


        if (
            refreshTimer
        ) {

            clearInterval(
                refreshTimer
            );

        }

    }
);