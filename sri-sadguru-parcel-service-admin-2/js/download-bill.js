/* =========================================================
   SSP ADMIN PORTAL
   DOWNLOAD BILL
   REAL SUPABASE DATA
   A4 SINGLE PAGE
========================================================= */

"use strict";


/* =========================================================
   COMPANY INFORMATION
========================================================= */

const COMPANY = {

    name:
        "SRI SADGURU SIDDAROODA PARCEL SERVICE",

    address:
        "Hubballi, Karnataka, India",

    phone:
        "+91 XXXXX XXXXX",

    email:
        "info@srisadguru.com",

    gstin:
        "29XXXXXXXXXXXXXX",

    logo:
        "../images/logo.png"

};


/* =========================================================
   PAGE STATE
========================================================= */

let bookingId = "";

let bookingRecord = null;

let customerProfile = null;

let driverProfile = null;

let zoomLevel = 1;


/* =========================================================
   DOM
========================================================= */

function $(selector) {

    return document.querySelector(selector);

}


/* =========================================================
   SUPABASE
========================================================= */

function getSupabaseClient() {

    if (
        window.supabaseClient &&
        window.supabaseClient.auth
    ) {

        return window.supabaseClient;

    }

    return null;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


/* =========================================================
   MONEY
========================================================= */

function money(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {

        return "₹0.00";

    }

    return number.toLocaleString(
        "en-IN",
        {
            style: "currency",
            currency: "INR"
        }
    );

}


/* =========================================================
   DATE
========================================================= */

function formatDate(value) {

    if (!value) {

        return "—";

    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {

        return String(value);

    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


/* =========================================================
   TIME
========================================================= */

function formatTime(value) {

    if (!value) {

        return "—";

    }

    const text = String(value);

    /*
       PostgreSQL TIME may return:
       10:30:00
    */

    const match =
        text.match(
            /^(\d{1,2}):(\d{2})/
        );

    if (!match) {

        return text;

    }

    let hour =
        Number(match[1]);

    const minute =
        match[2];

    const period =
        hour >= 12
            ? "PM"
            : "AM";

    hour =
        hour % 12 || 12;

    return `${hour}:${minute} ${period}`;

}


/* =========================================================
   STATUS
========================================================= */

function formatStatus(status) {

    if (!status) {

        return "—";

    }

    return String(status)

        .replace(/_/g, " ")

        .replace(/\b\w/g, char =>
            char.toUpperCase()
        );

}


/* =========================================================
   PAYMENT STATUS
========================================================= */

function formatPaymentStatus(status) {

    return formatStatus(status);

}


/* =========================================================
   SAFE VALUE
========================================================= */

function valueOrDash(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {

        return "—";

    }

    return escapeHTML(value);

}


/* =========================================================
   GET BOOKING ID
========================================================= */

function getBookingIdFromURL() {

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

    const client =
        getSupabaseClient();

    if (!client) {

        throw new Error(
            "Supabase client is not available."
        );

    }


    if (!bookingId) {

        throw new Error(
            "No booking ID was supplied."
        );

    }


    /*
       Load the real booking.
    */

    const {
        data: booking,
        error
    } = await client

        .from("bookings")

        .select("*")

        .eq(
            "booking_id",
            bookingId
        )

        .maybeSingle();


    if (error) {

        console.error(
            "Booking query failed:",
            error
        );

        throw new Error(
            error.message ||
            "Unable to load booking."
        );

    }


    if (!booking) {

        throw new Error(
            `Booking ${bookingId} was not found.`
        );

    }


    bookingRecord =
        booking;


    /*
       Load customer profile.
    */

    if (booking.customer_id) {

        const {
            data: customer,
            error: customerError
        } = await client

            .from("profiles")

            .select(
                "id, full_name, email, phone, role, status"
            )

            .eq(
                "id",
                booking.customer_id
            )

            .maybeSingle();


        if (customerError) {

            console.warn(
                "Customer profile could not be loaded:",
                customerError
            );

        } else {

            customerProfile =
                customer;

        }

    }


    /*
       Load driver profile.
    */

    if (booking.driver_id) {

        const {
            data: driver,
            error: driverError
        } = await client
            .from("drivers")
            .select(
                "id,profile_id,driver_id,name,email,phone,status"
            )
            .eq(
                "id",
                booking.driver_id
            )
            .maybeSingle();


        if (driverError) {

            console.warn(
                "Driver profile could not be loaded:",
                driverError
            );

        } else {

            let profile = null;

            if (driver?.profile_id) {
                const {
                    data: profileData,
                    error: profileError
                } = await client
                    .from("profiles")
                    .select("id,full_name,email,phone")
                    .eq("id", driver.profile_id)
                    .maybeSingle();

                if (profileError) {
                    console.warn(
                        "Driver profile could not be loaded:",
                        profileError
                    );
                } else {
                    profile = profileData;
                }
            }

            driverProfile = driver
                ? {
                    ...driver,
                    full_name:
                        profile?.full_name ||
                        driver.name ||
                        "",
                    email:
                        profile?.email ||
                        driver.email ||
                        "",
                    phone:
                        driver.phone ||
                        profile?.phone ||
                        ""
                }
                : null;

        }

    }

}


/* =========================================================
   RENDER BILL
========================================================= */

function renderBill() {

    const invoice =
        $("#invoice");


    if (!invoice) {

        return;

    }


    const booking =
        bookingRecord;


    /*
       Confirmed database fields are used here.
    */

    const senderName =
        booking.pickup_name ||
        customerProfile?.full_name ||
        "—";

    const senderPhone =
        booking.pickup_phone ||
        customerProfile?.phone ||
        "—";

    const receiverName =
        booking.receiver_name ||
        "—";

    const receiverPhone =
        booking.receiver_phone ||
        "—";


    const pickupAddress =
        booking.pickup_address ||
        "—";

    const deliveryAddress =
        booking.delivery_address ||
        "—";


    const pickupCity =
        booking.pickup_city ||
        "—";

    const deliveryCity =
        booking.delivery_city ||
        "—";


    const serviceCharge =
        booking.service_charge;


    const invoiceNumber =
        `INV-${String(
            booking.booking_id || bookingId
        ).replace(
            /^SSP/i,
            ""
        )}`;


    invoice.innerHTML = `

        <!-- =========================================
             HEADER
        ========================================== -->

        <header class="bill-header">

            <div class="company-area">

                <img
                    class="company-logo"
                    src="${escapeHTML(COMPANY.logo)}"
                    alt="Sri Sadguru Siddarooda Parcel Service"
                >

                <div class="company-details">

                    <h1 class="company-name">
                        ${escapeHTML(COMPANY.name)}
                    </h1>

                    <div class="company-line">
                        ${escapeHTML(COMPANY.address)}
                    </div>

                    <div class="company-line">
                        Phone: ${escapeHTML(COMPANY.phone)}
                        &nbsp; | &nbsp;
                        Email: ${escapeHTML(COMPANY.email)}
                    </div>

                    <div class="company-line">
                        GSTIN: ${escapeHTML(COMPANY.gstin)}
                    </div>

                </div>

            </div>


            <div class="bill-title-area">

                <div class="bill-title">
                    PARCEL BILL
                </div>

                <div class="bill-title-sub">
                    Invoice
                </div>

            </div>

        </header>


        <!-- =========================================
             META
        ========================================== -->

        <section class="bill-meta">

            <div class="meta-item">

                <span class="meta-label">
                    Invoice No.
                </span>

                <span class="meta-value">
                    ${escapeHTML(invoiceNumber)}
                </span>

            </div>


            <div class="meta-item">

                <span class="meta-label">
                    Booking No.
                </span>

                <span class="meta-value">
                    ${valueOrDash(booking.booking_id)}
                </span>

            </div>


            <div class="meta-item">

                <span class="meta-label">
                    Booking Date
                </span>

                <span class="meta-value">
                    ${formatDate(booking.booking_date)}
                </span>

            </div>


            <div class="meta-item">

                <span class="meta-label">
                    Booking Time
                </span>

                <span class="meta-value">
                    ${formatTime(booking.booking_time)}
                </span>

            </div>


            <div class="meta-item">

                <span class="meta-label">
                    Status
                </span>

                <span class="meta-value">
                    ${escapeHTML(
                        formatStatus(
                            booking.status
                        )
                    )}
                </span>

            </div>

        </section>


        <!-- =========================================
             TRACKING
        ========================================== -->

        <section class="tracking-box">

            <div>

                <div class="tracking-label">
                    Tracking ID
                </div>

                <div class="tracking-id">
                    ${valueOrDash(booking.booking_id)}
                </div>

            </div>


            <div class="tracking-note">
                Keep this ID for parcel tracking.
            </div>

        </section>


        <!-- =========================================
             SENDER / RECEIVER
        ========================================== -->

        <section class="bill-section">

            <div class="section-title">
                Sender & Receiver
            </div>

            <div class="section-body">

                <div class="two-column">

                    <div>

                        <div class="detail-label">
                            Sender
                        </div>

                        <div class="detail-value">
                            ${escapeHTML(senderName)}
                        </div>

                        <div class="detail-line">
                            ${escapeHTML(senderPhone)}
                        </div>

                        <div class="detail-line">
                            ${escapeHTML(pickupAddress)}
                        </div>

                    </div>


                    <div>

                        <div class="detail-label">
                            Receiver
                        </div>

                        <div class="detail-value">
                            ${escapeHTML(receiverName)}
                        </div>

                        <div class="detail-line">
                            ${escapeHTML(receiverPhone)}
                        </div>

                        <div class="detail-line">
                            ${escapeHTML(deliveryAddress)}
                        </div>

                    </div>

                </div>

            </div>

        </section>


        <!-- =========================================
             ROUTE
        ========================================== -->

        <section class="bill-section">

            <div class="section-title">
                Route
            </div>

            <div class="section-body">

                <div class="route-grid">

                    <div class="route-place">

                        <div class="detail-label">
                            Pickup
                        </div>

                        <div class="route-city">
                            ${escapeHTML(pickupCity)}
                        </div>

                        <div class="route-address">
                            ${escapeHTML(pickupAddress)}
                        </div>

                    </div>


                    <div class="route-arrow">
                        →
                    </div>


                    <div class="route-place">

                        <div class="detail-label">
                            Delivery
                        </div>

                        <div class="route-city">
                            ${escapeHTML(deliveryCity)}
                        </div>

                        <div class="route-address">
                            ${escapeHTML(deliveryAddress)}
                        </div>

                    </div>

                </div>

            </div>

        </section>


        <!-- =========================================
             PARCEL DETAILS
        ========================================== -->

        <section class="bill-section">

            <div class="section-title">
                Parcel Details
            </div>

            <div class="section-body">

                <table class="bill-table">

                    <thead>

                        <tr>

                            <th>
                                Parcel Type
                            </th>

                            <th>
                                Pieces
                            </th>

                            <th>
                                Weight
                            </th>

                            <th>
                                Declared Value
                            </th>

                            <th>
                                Instructions
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        <tr>

                            <td>
                                ${valueOrDash(
                                    booking.parcel_type
                                )}
                            </td>

                            <td>
                                ${valueOrDash(
                                    booking.pieces
                                )}
                            </td>

                            <td>
                                ${
                                    booking.weight !== null &&
                                    booking.weight !== undefined
                                        ? escapeHTML(
                                            booking.weight
                                        ) + " kg"
                                        : "—"
                                }
                            </td>

                            <td>
                                ${
                                    booking.declared_value !== null &&
                                    booking.declared_value !== undefined
                                        ? money(
                                            booking.declared_value
                                        )
                                        : "—"
                                }
                            </td>

                            <td>
                                ${valueOrDash(
                                    booking.special_instructions
                                )}
                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>

        </section>


        <!-- =========================================
             PAYMENT + PRICE
        ========================================== -->

        <section class="bill-section">

            <div class="section-title">
                Payment & Price Details
            </div>

            <div class="section-body">

                <div class="payment-price-grid">

                    <div>

                        <div class="info-row">

                            <span class="info-label">
                                Payment Status
                            </span>

                            <span class="info-value">
                                ${escapeHTML(
                                    formatPaymentStatus(
                                        booking.payment_status
                                    )
                                )}
                            </span>

                        </div>


                        <div class="info-row">

                            <span class="info-label">
                                Payment Method
                            </span>

                            <span class="info-value">
                                ${valueOrDash(
                                    booking.payment_method
                                )}
                            </span>

                        </div>

                    </div>


                    <div>

                        <div class="info-row">

                            <span class="info-label">
                                Service Charge
                            </span>

                            <span class="info-value">
                                ${money(
                                    serviceCharge
                                )}
                            </span>

                        </div>


                        <div class="info-row total-row">

                            <span class="info-label">
                                Total
                            </span>

                            <span class="info-value">
                                ${money(
                                    serviceCharge
                                )}
                            </span>

                        </div>

                    </div>

                </div>

            </div>

        </section>


        <!-- =========================================
             DRIVER / VEHICLE
        ========================================== -->

        <section class="bill-section">

            <div class="section-title">
                Driver / Vehicle
            </div>

            <div class="section-body">

                <div class="driver-grid">

                    <div>

                        <div class="detail-label">
                            Driver
                        </div>

                        <div class="detail-value">
                            ${escapeHTML(
                                driverProfile?.full_name ||
                                "Not assigned"
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="detail-label">
                            Phone
                        </div>

                        <div class="detail-value">
                            ${escapeHTML(
                                driverProfile?.phone ||
                                "—"
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="detail-label">
                            Vehicle No.
                        </div>

                        <div class="detail-value">
                            —
                        </div>

                    </div>


                    <div>

                        <div class="detail-label">
                            Vehicle Type
                        </div>

                        <div class="detail-value">
                            —
                        </div>

                    </div>

                </div>

            </div>

        </section>


        <!-- =========================================
             SIGNATURE / SEAL
        ========================================== -->

        <section class="bill-section">

            <div class="section-title">
                Authorization
            </div>

            <div class="section-body">

                <div class="authorization">

                    <div class="signature-box">

                        <div class="signature-line"></div>

                        <div class="signature-label">
                            Owner Signature
                        </div>

                    </div>


                    <div class="authorization-text">

                        Authorized representative<br>

                        Sri Sadguru Siddarooda
                        Parcel Service

                    </div>


                    <div class="seal-box">

                        <div class="seal-placeholder">
                            COMPANY<br>
                            SEAL
                        </div>

                        <div class="seal-label">
                            Company Seal
                        </div>

                    </div>

                </div>

            </div>

        </section>


        <!-- =========================================
             FOOTER
        ========================================== -->

        <footer class="bill-footer">

            <span>
                ${escapeHTML(COMPANY.name)}
            </span>

            <span>
                ${escapeHTML(COMPANY.phone)}
            </span>

            <span>
                Thank you for choosing our parcel service.
            </span>

        </footer>

    `;

}


/* =========================================================
   ERROR
========================================================= */

function showError(message) {

    const invoice =
        $("#invoice");


    if (!invoice) {

        return;

    }


    invoice.innerHTML = `

        <div class="error-state">

            <strong>
                Unable to Load Bill
            </strong>

            <span>
                ${escapeHTML(message)}
            </span>

            <span>
                Booking ID:
                ${escapeHTML(
                    bookingId || "Not provided"
                )}
            </span>

        </div>

    `;

}


/* =========================================================
   ZOOM
========================================================= */

function updateZoom() {

    const invoice =
        $("#invoice");

    const zoomValue =
        $("#zoomValue");


    if (!invoice) {

        return;

    }


    invoice.style.transform =
        `scale(${zoomLevel})`;


    if (zoomValue) {

        zoomValue.textContent =
            `${Math.round(
                zoomLevel * 100
            )}%`;

    }

}


function zoomIn() {

    zoomLevel =
        Math.min(
            1.5,
            Number(
                (
                    zoomLevel + 0.1
                ).toFixed(2)
            )
        );

    updateZoom();

}


function zoomOut() {

    zoomLevel =
        Math.max(
            0.5,
            Number(
                (
                    zoomLevel - 0.1
                ).toFixed(2)
            )
        );

    updateZoom();

}


function resetZoom() {

    zoomLevel = 1;

    updateZoom();

}


/* =========================================================
   DOWNLOAD / PDF
========================================================= */

function downloadBill() {

    /*
       Browser print dialog allows:
       Save as PDF

       CSS @page forces:
       A4 portrait
       210mm × 297mm
       zero page margin
    */

    window.print();

}


/* =========================================================
   BACK
========================================================= */

function goBack() {

    if (
        document.referrer &&
        window.history.length > 1
    ) {

        window.history.back();

        return;

    }


    window.location.href =
        `bookings-details.html?id=${encodeURIComponent(
            bookingId
        )}`;

}


/* =========================================================
   BUTTONS
========================================================= */

function setupControls() {

    const backBtn =
        $("#backBtn");

    const downloadBtn =
        $("#downloadBtn");

    const zoomInBtn =
        $("#zoomInBtn");

    const zoomOutBtn =
        $("#zoomOutBtn");

    const zoomResetBtn =
        $("#zoomResetBtn");


    if (backBtn) {

        backBtn.addEventListener(
            "click",
            goBack
        );

    }


    if (downloadBtn) {

        downloadBtn.addEventListener(
            "click",
            downloadBill
        );

    }


    if (zoomInBtn) {

        zoomInBtn.addEventListener(
            "click",
            zoomIn
        );

    }


    if (zoomOutBtn) {

        zoomOutBtn.addEventListener(
            "click",
            zoomOut
        );

    }


    if (zoomResetBtn) {

        zoomResetBtn.addEventListener(
            "click",
            resetZoom
        );

    }

}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeBill() {

    bookingId =
        getBookingIdFromURL();


    setupControls();


    if (!bookingId) {

        showError(
            "No booking ID was supplied in the URL."
        );

        return;

    }


    try {

        await loadBooking();

        renderBill();

        resetZoom();

    } catch (error) {

        console.error(
            "Download Bill error:",
            error
        );

        showError(
            error.message ||
            "Unable to load the booking."
        );

    }

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeBill
);