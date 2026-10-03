/* =========================================================
   SRI SADGURU PARCEL SERVICE
   ADMIN PORTAL
   NEW BOOKING JAVASCRIPT

   LIVE SUPABASE VERSION

   FLOW:

   New Booking
       ↓
   Validate
       ↓
   Preview
       ↓
   Confirm
       ↓
   Supabase
       ↓
   public.bookings
       ↓
   Database generates official booking_id
       ↓
   Success
       ↓
   Booking Details / Bookings
   ========================================================= */

"use strict";


/* =========================================================
   CONSTANTS
   ========================================================= */

const GST_RATE = 0.18;
let adminBookingSettings = null;


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getSupabaseClient() {

    if (
        typeof window === "undefined" ||
        !window.supabaseClient
    ) {

        console.error(
            "Supabase client is not available."
        );

        throw new Error(
            "Supabase client is not initialized."
        );

    }

    return window.supabaseClient;

}


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(selector) {

    return document.querySelector(selector);

}


function $all(selector) {

    return document.querySelectorAll(selector);

}


/* =========================================================
   SAFE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(
        value ?? "—"
    ).replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character])
    );

}


/* =========================================================
   MONEY
   ========================================================= */

function money(value) {

    if (
        value === null ||
        value === undefined ||
        value === "" ||
        Number.isNaN(Number(value))
    ) {

        return "—";

    }


    return (
        "₹" +
        Number(value).toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )
    );

}


/* =========================================================
   NUMBER HELPER
   ========================================================= */

function numberOrNull(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }


    const number = Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return null;

    }


    return number;

}


/* =========================================================
   CURRENT DATE / TIME
   ========================================================= */

function setCurrentDateTime() {

    const now = new Date();


    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");


    const hours =
        String(
            now.getHours()
        ).padStart(2, "0");

    const minutes =
        String(
            now.getMinutes()
        ).padStart(2, "0");


    const dateInput =
        $("#bookingDate");

    const timeInput =
        $("#bookingTime");


    if (dateInput) {

        dateInput.value =
            `${year}-${month}-${day}`;

    }


    if (timeInput) {

        timeInput.value =
            `${hours}:${minutes}`;

    }

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatBookingDate(dateValue) {

    if (!dateValue) {

        return "—";

    }


    const date =
        new Date(
            `${dateValue}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateValue;

    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatBookingTime(timeValue) {

    if (!timeValue) {

        return "—";

    }


    const parts =
        timeValue.split(":");


    if (
        parts.length < 2
    ) {

        return timeValue;

    }


    const hours =
        Number(parts[0]);

    const minutes =
        Number(parts[1]);


    const suffix =
        hours >= 12
            ? "PM"
            : "AM";


    const displayHour =
        hours % 12 || 12;


    return (
        `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`
    );

}


/* =========================================================
   GET PAYMENT METHOD
   ========================================================= */

function getPaymentMethod() {

    const selected =
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        );


    return selected
        ? selected.value
        : "Cash on Delivery";

}


/* =========================================================
   PAYMENT STATUS MAPPING
   ========================================================= */

function mapPaymentStatus(value) {

    const status =
        String(
            value || ""
        )
            .trim()
            .toLowerCase();


    switch (status) {

        case "received":

            return "paid";


        case "partially received":

            return "partially_paid";


        case "pending":

            return "pending";


        default:

            return "pending";

    }

}


/* =========================================================
   DIMENSION PARSER
   ========================================================= */

function parseDimensions(value) {

    if (
        !value ||
        !String(value).trim()
    ) {

        return {

            length: null,

            width: null,

            height: null

        };

    }


    const cleaned =
        String(value)
            .replace(/×/g, "x")
            .replace(/\*/g, "x")
            .replace(/,/g, "x")
            .replace(/\s+/g, " ")
            .trim();


    const numbers =
        cleaned
            .split(/x/i)
            .map(
                part =>
                    Number(
                        part
                            .replace(
                                /[^0-9.]/g,
                                ""
                            )
                    )
            )
            .filter(
                number =>
                    Number.isFinite(number)
            );


    return {

        length:
            numbers[0] ?? null,

        width:
            numbers[1] ?? null,

        height:
            numbers[2] ?? null

    };

}


/* =========================================================
   CALCULATE PRICE
   ========================================================= */

function calculatePricing() {

    const base =
        numberOrNull(
            $("#basePrice").value
        );


    const distance =
        numberOrNull(
            $("#distanceCharge").value
        );


    const handling =
        numberOrNull(
            $("#handlingCharge").value
        );


    const gstEntered =
        numberOrNull(
            $("#gst").value
        );


    const hasAnyPrice =
        base !== null ||
        distance !== null ||
        handling !== null ||
        gstEntered !== null;


    if (!hasAnyPrice) {

        return {

            assigned: false,

            basePrice: null,

            distanceCharge: null,

            handlingCharge: null,

            gst: null,

            total: null

        };

    }


    const baseValue =
        base ?? 0;


    const distanceValue =
        distance ?? 0;


    const handlingValue =
        handling ?? 0;


    const taxable =
        baseValue +
        distanceValue +
        handlingValue;


    const gst =
        gstEntered !== null
            ? gstEntered
            : taxable * GST_RATE;


    const total =
        taxable + gst;


    return {

        assigned: true,

        basePrice:
            baseValue,

        distanceCharge:
            distanceValue,

        handlingCharge:
            handlingValue,

        gst:
            gst,

        total:
            total

    };

}


/* =========================================================
   UPDATE TOTAL PREVIEW
   ========================================================= */

function updateTotalPreview() {

    const pricing =
        calculatePricing();


    const totalElement =
        $("#totalPricePreview");


    if (!totalElement) {

        return;

    }


    if (!pricing.assigned) {

        totalElement.textContent =
            "Price Not Assigned";

        return;

    }


    totalElement.textContent =
        money(
            pricing.total
        );

}


/* =========================================================
   COLLECT FORM DATA
   ========================================================= */

function collectFormData() {

    const date =
        $("#bookingDate").value;


    const time =
        $("#bookingTime").value;


    const pricing =
        calculatePricing();


    const paymentMethod =
        getPaymentMethod();


    const paymentStatus =
        $("#paymentStatus").value;


    const receivedAmount =
        numberOrNull(
            $("#receivedAmount").value
        );


    const dimensionsText =
        $("#dimensions")
            .value
            .trim();


    const dimensions =
        parseDimensions(
            dimensionsText
        );


    const weight =
        numberOrNull(
            $("#weight").value
        );


    const pieces =
        Number(
            $("#pieces").value
        );


    const parcelType =
        $("#parcelType")
            .value
            .trim();


    /*
       Frontend object.

       IMPORTANT:
       No booking ID is generated here.

       Supabase generates the official
       booking_id.
    */

    const booking = {

        bookingDate:
            date,

        bookingTime:
            time,

        bookingDateDisplay:
            formatBookingDate(date),

        bookingTimeDisplay:
            formatBookingTime(time),

        serviceType:
            $("#serviceType").value,

        sender: {

            name:
                $("#senderName")
                    .value
                    .trim(),

            phone:
                $("#senderPhone")
                    .value
                    .trim(),

            address:
                $("#senderAddress")
                    .value
                    .trim()

        },

        receiver: {

            name:
                $("#receiverName")
                    .value
                    .trim(),

            phone:
                $("#receiverPhone")
                    .value
                    .trim(),

            address:
                $("#receiverAddress")
                    .value
                    .trim()

        },

        route: {

            from:
                $("#routeFrom")
                    .value
                    .trim(),

            to:
                $("#routeTo")
                    .value
                    .trim()

        },

        pickupAddress:
            $("#pickupAddress")
                .value
                .trim(),

        deliveryAddress:
            $("#deliveryAddress")
                .value
                .trim(),

        parcel: {

            type:
                parcelType,

            pieces:
                pieces,

            weight:
                weight,

            weightDisplay:
                `${weight} kg`,

            dimensions:
                dimensionsText,

            dimensionValues:
                dimensions,

            declaredValue:
                numberOrNull(
                    $("#declaredValue").value
                ),

            instructions:
                $("#instructions")
                    .value
                    .trim()

        },

        pricing: {

            basePrice:
                pricing.basePrice,

            distanceCharge:
                pricing.distanceCharge,

            handlingCharge:
                pricing.handlingCharge,

            gst:
                pricing.gst,

            total:
                pricing.total

        },

        payment: {

            method:
                paymentMethod,

            status:
                paymentStatus,

            receivedAmount:
                receivedAmount

        },

        status:
            "pending"

    };


    return booking;

}


/* =========================================================
   CONVERT FRONTEND BOOKING
   TO SUPABASE ROW
   ========================================================= */

function buildSupabaseBookingRow(
    booking
) {

    const paymentStatus =
        mapPaymentStatus(
            booking.payment.status
        );


    const dimensions =
        booking.parcel
            .dimensionValues;


    const total =
        booking.pricing.total;


    /*
       If a customer account is already present in the system,
       link the booking to that profile. Otherwise leave it null.
       The admin form does not currently offer a customer selector,
       so we prefer a profile lookup by phone/email when available.
    */

    return {

        customer_id:
            booking.customer_id || null,

        pickup_name:
            booking.sender.name,

        pickup_phone:
            booking.sender.phone,

        pickup_email:
            null,

        pickup_address:
            booking.pickupAddress,

        pickup_city:
            booking.route.from,

        pickup_pincode:
            null,

        receiver_name:
            booking.receiver.name,

        receiver_phone:
            booking.receiver.phone,

        receiver_email:
            null,

        delivery_address:
            booking.deliveryAddress,

        delivery_city:
            booking.route.to,

        delivery_district:
            null,

        delivery_state:
            null,

        delivery_pincode:
            null,

        delivery_landmark:
            null,

        /*
           The current UI does not have
           a separate parcel-name field.

           Therefore parcel type is used
           as parcel_name.
        */

        parcel_name:
            booking.parcel.type,

        parcel_type:
            booking.parcel.type,

        parcel_description:
            booking.parcel.instructions || null,

        parcel_weight:
            booking.parcel.weight,

        parcel_length:
            dimensions.length,

        parcel_width:
            dimensions.width,

        parcel_height:
            dimensions.height,

        dimensions_text:
            booking.parcel.dimensions || null,

        pieces:
            booking.parcel.pieces,

        special_instructions:
            booking.parcel.instructions || null,

        declared_value:
            booking.parcel.declaredValue,

        /*
           Database default is pending.
        */

        status:
            adminBookingSettings.defaultBookingStatus,

        /*
           Database default is required.
        */

        call_confirmation_status:
            "required",

        driver_id:
            null,

        service_type:
            booking.serviceType,

        service_charge:
            total,

        base_price:
            booking.pricing.basePrice,

        distance_charge:
            booking.pricing.distanceCharge,

        handling_charge:
            booking.pricing.handlingCharge,

        gst_amount:
            booking.pricing.gst,

        payment_status:
            paymentStatus,

        payment_method:
            booking.payment.method,

        received_amount:
            booking.payment.receivedAmount,

        admin_notes:
            null,

        booking_date:
            booking.bookingDate,

        booking_time:
            booking.bookingTime

    };

}


/* =========================================================
   VALIDATION
   ========================================================= */

function clearValidation() {

    $all(
        ".field.invalid"
    )
        .forEach(field => {

            field.classList.remove(
                "invalid"
            );

        });


    $all(
        ".field-error"
    )
        .forEach(error => {

            error.remove();

        });

}


/* =========================================================
   INVALID FIELD
   ========================================================= */

function markInvalid(
    input,
    message
) {

    const field =
        input.closest(
            ".field"
        );


    if (!field) {

        return;

    }


    field.classList.add(
        "invalid"
    );


    const error =
        document.createElement(
            "div"
        );


    error.className =
        "field-error";


    error.textContent =
        message;


    field.appendChild(
        error
    );

}


/* =========================================================
   FORM VALIDATION
   ========================================================= */

function validateForm() {

    clearValidation();


    let valid =
        true;


    const requiredFields = [

        [
            $("#routeFrom"),
            "From location is required."
        ],

        [
            $("#routeTo"),
            "To location is required."
        ],

        [
            $("#pickupAddress"),
            "Pickup address is required."
        ],

        [
            $("#deliveryAddress"),
            "Delivery address is required."
        ],

        [
            $("#parcelType"),
            "Parcel type is required."
        ],

        [
            $("#pieces"),
            "Number of pieces is required."
        ],

        [
            $("#weight"),
            "Weight is required."
        ]

    ];

    if (adminBookingSettings.requireCustomerDetails) {
        requiredFields.unshift(
            [
                $("#senderName"),
                "Sender name is required."
            ],
            [
                $("#senderPhone"),
                "Sender mobile number is required."
            ],
            [
                $("#senderAddress"),
                "Sender address is required."
            ],
            [
                $("#receiverName"),
                "Receiver name is required."
            ],
            [
                $("#receiverPhone"),
                "Receiver mobile number is required."
            ],
            [
                $("#receiverAddress"),
                "Receiver address is required."
            ]
        );
    }


    requiredFields.forEach(
        ([input, message]) => {

            if (
                !input ||
                !input.value.trim()
            ) {

                if (input) {

                    markInvalid(
                        input,
                        message
                    );

                }

                valid =
                    false;

            }

        }
    );


    /*
       Sender phone
    */

    const senderPhone =
        $("#senderPhone")
            .value
            .trim();


    if (
        senderPhone &&
        !/^[6-9][0-9]{9}$/.test(
            senderPhone
        )
    ) {

        markInvalid(
            $("#senderPhone"),
            "Enter a valid 10 digit mobile number."
        );

        valid =
            false;

    }


    /*
       Receiver phone
    */

    const receiverPhone =
        $("#receiverPhone")
            .value
            .trim();


    if (
        receiverPhone &&
        !/^[6-9][0-9]{9}$/.test(
            receiverPhone
        )
    ) {

        markInvalid(
            $("#receiverPhone"),
            "Enter a valid 10 digit mobile number."
        );

        valid =
            false;

    }


    /*
       Pieces
    */

    const pieces =
        Number(
            $("#pieces").value
        );


    if (
        !Number.isInteger(
            pieces
        ) ||
        pieces < 1
    ) {

        markInvalid(
            $("#pieces"),
            "Pieces must be at least 1."
        );

        valid =
            false;

    }


    /*
       Weight
    */

    const weight =
        Number(
            $("#weight").value
        );


    if (
        !Number.isFinite(weight) ||
        weight <= 0
    ) {

        markInvalid(
            $("#weight"),
            "Enter a valid weight."
        );

        valid =
            false;

    }


    /*
       Date
    */

    const bookingDate =
        $("#bookingDate").value;


    if (!bookingDate) {

        markInvalid(
            $("#bookingDate"),
            "Booking date is required."
        );

        valid =
            false;

    }


    /*
       Time
    */

    const bookingTime =
        $("#bookingTime").value;


    if (!bookingTime) {

        markInvalid(
            $("#bookingTime"),
            "Booking time is required."
        );

        valid =
            false;

    }


    if (!valid) {

        const firstInvalid =
            document.querySelector(
                ".field.invalid input, .field.invalid select, .field.invalid textarea"
            );


        if (firstInvalid) {

            firstInvalid.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


            firstInvalid.focus();

        }


        showToast(
            "Please correct the highlighted fields."
        );

    }


    return valid;

}


/* =========================================================
   PREVIEW HELPERS
   ========================================================= */

function previewItem(
    label,
    value
) {

    return `

        <div class="preview-item">

            <span class="preview-label">
                ${escapeHTML(label)}
            </span>

            <div class="preview-value">
                ${escapeHTML(
                    value || "—"
                )}
            </div>

        </div>

    `;

}


function previewGroup(
    title,
    items
) {

    return `

        <div class="preview-group">

            <div class="preview-group-title">
                ${escapeHTML(title)}
            </div>

            <div class="preview-grid">

                ${items.join("")}

            </div>

        </div>

    `;

}


/* =========================================================
   RENDER PREVIEW
   ========================================================= */

function renderPreview(
    booking
) {

    const pricing =
        booking.pricing;


    const payment =
        booking.payment;


    const parcel =
        booking.parcel;


    const preview =
        $("#previewContent");


    preview.innerHTML =

        previewGroup(
            "Booking Information",
            [

                previewItem(
                    "Tracking ID",
                    "Generated after saving"
                ),

                previewItem(
                    "Booking Date",
                    booking.bookingDateDisplay
                ),

                previewItem(
                    "Booking Time",
                    booking.bookingTimeDisplay
                ),

                previewItem(
                    "Booking Status",
                    adminBookingSettings.defaultBookingStatus
                        .split("_")
                        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(" ")
                ),

                previewItem(
                    "Delivery Service",
                    booking.serviceType
                )

            ]
        )


        +


        previewGroup(
            "Sender Details",
            [

                previewItem(
                    "Name",
                    booking.sender.name
                ),

                previewItem(
                    "Mobile",
                    booking.sender.phone
                ),

                previewItem(
                    "Address",
                    booking.sender.address
                )

            ]
        )


        +


        previewGroup(
            "Receiver Details",
            [

                previewItem(
                    "Name",
                    booking.receiver.name
                ),

                previewItem(
                    "Mobile",
                    booking.receiver.phone
                ),

                previewItem(
                    "Address",
                    booking.receiver.address
                )

            ]
        )


        +


        previewGroup(
            "Parcel Route",
            [

                previewItem(
                    "From",
                    booking.route.from
                ),

                previewItem(
                    "To",
                    booking.route.to
                ),

                previewItem(
                    "Pickup Address",
                    booking.pickupAddress
                ),

                previewItem(
                    "Delivery Address",
                    booking.deliveryAddress
                )

            ]
        )


        +


        previewGroup(
            "Parcel Details",
            [

                previewItem(
                    "Parcel Type",
                    parcel.type
                ),

                previewItem(
                    "Pieces",
                    parcel.pieces
                ),

                previewItem(
                    "Weight",
                    parcel.weightDisplay
                ),

                previewItem(
                    "Dimensions",
                    parcel.dimensions
                ),

                previewItem(
                    "Declared Value",
                    money(
                        parcel.declaredValue
                    )
                ),

                previewItem(
                    "Instructions",
                    parcel.instructions
                )

            ]
        )


        +


        previewGroup(
            "Payment Information",
            [

                previewItem(
                    "Payment Method",
                    payment.method
                ),

                previewItem(
                    "Payment Status",
                    payment.status
                ),

                previewItem(
                    "Received Amount",
                    money(
                        payment.receivedAmount
                    )
                )

            ]
        )


        +


        previewGroup(
            "Price Information",
            [

                previewItem(
                    "Base Price",
                    pricing.basePrice !== null
                        ? money(
                            pricing.basePrice
                        )
                        : "Price Not Assigned"
                ),

                previewItem(
                    "Distance Charge",
                    pricing.distanceCharge !== null
                        ? money(
                            pricing.distanceCharge
                        )
                        : "—"
                ),

                previewItem(
                    "Handling Charge",
                    pricing.handlingCharge !== null
                        ? money(
                            pricing.handlingCharge
                        )
                        : "—"
                ),

                previewItem(
                    "GST",
                    pricing.gst !== null
                        ? money(
                            pricing.gst
                        )
                        : "—"
                ),

                previewItem(
                    "TOTAL",
                    pricing.total !== null
                        ? money(
                            pricing.total
                        )
                        : "Price Not Assigned"
                )

            ]
        );

}


/* =========================================================
   MODAL HELPERS
   ========================================================= */

function openModal(
    element
) {

    if (!element) {

        return;

    }


    element.classList.add(
        "show"
    );


    element.setAttribute(
        "aria-hidden",
        "false"
    );

}


function closeModal(
    element
) {

    if (!element) {

        return;

    }


    element.classList.remove(
        "show"
    );


    element.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer;


function showToast(
    message
) {

    const toast =
        $("#toast");


    if (!toast) {

        return;

    }


    clearTimeout(
        toastTimer
    );


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}


/* =========================================================
   ADMIN AUTHENTICATION
   ========================================================= */

async function requireActiveAdmin() {

    const client =
        getSupabaseClient();


    const {
        data: sessionData,
        error: sessionError
    } =
        await client.auth.getSession();


    if (
        sessionError ||
        !sessionData ||
        !sessionData.session ||
        !sessionData.session.user
    ) {

        window.location.href =
            "../index.html";

        throw new Error(
            "Administrator session not found."
        );

    }


    const user =
        sessionData.session.user;


    const {
        data: profile,
        error: profileError
    } =
        await client
            .from("profiles")
            .select(
                "id,email,phone,full_name,role,status"
            )
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


    if (
        profileError
    ) {

        console.error(
            "Unable to verify administrator profile:",
            profileError
        );


        await client.auth.signOut();


        window.location.href =
            "../index.html";


        throw new Error(
            "Unable to verify administrator profile."
        );

    }


    if (
        !profile ||
        profile.id !== user.id ||
        profile.role !== "admin" ||
        profile.status !== "active"
    ) {

        await client.auth.signOut();


        window.location.href =
            "../index.html";


        throw new Error(
            "Administrator access denied."
        );

    }


    return {

        client,

        user,

        profile

    };

}


/* =========================================================
   CUSTOMER LINK RESOLUTION
   ========================================================= */

async function resolveCustomerIdFromBooking(
    booking
) {

    if (
        booking?.customer_id
    ) {

        return booking.customer_id;

    }

    const client =
        getSupabaseClient();

    const phoneValue =
        String(
            booking?.sender?.phone || ""
        )
            .trim();

    if (!phoneValue) {
        return null;
    }

    const {
        data,
        error
    } =
        await client
            .from("profiles")
            .select("id")
            .eq("phone", phoneValue)
            .eq("role", "customer")
            .maybeSingle();

    if (error) {

        console.warn(
            "Unable to resolve customer profile by phone:",
            error
        );

        return null;

    }

    return data?.id || null;

}


/* =========================================================
   SUPABASE INSERT
   ========================================================= */

async function insertBookingIntoSupabase(
    booking
) {

    const {

        client

    } =
        await requireActiveAdmin();

    adminBookingSettings =
        await window.SSPAdminSettings.get(true);

    if (!adminBookingSettings.allowNewBookings) {
        throw new Error(
            "New Admin bookings are currently disabled in Settings."
        );
    }

    const row =
        buildSupabaseBookingRow(
            booking
        );

    row.customer_id =
        await resolveCustomerIdFromBooking(
            booking
        );


    console.log(
        "SSP New Booking → Supabase INSERT:",
        row
    );


    const {
        data,
        error
    } =
        await client
            .from("bookings")
            .insert(row)
            .select("*")
            .single();


    if (error) {

        console.error(
            "Supabase booking insert failed:",
            error
        );


        throw error;

    }


    if (
        !data ||
        !data.id ||
        !data.booking_id
    ) {

        throw new Error(
            "Booking was inserted but the database did not return the booking ID."
        );

    }


    console.log(
        "SSP booking created:",
        data
    );


    return data;

}


/* =========================================================
   PENDING BOOKING
   ========================================================= */

let pendingBooking =
    null;


/* =========================================================
   FINAL SAVE
   ========================================================= */

async function performFinalSave() {

    if (!pendingBooking) {

        showToast(
            "Booking information is missing."
        );

        return;

    }


    const finalSaveButton =
        $("#finalSaveButton");


    if (finalSaveButton) {

        finalSaveButton.disabled =
            true;

        finalSaveButton.textContent =
            "Saving...";

    }


    try {
        adminBookingSettings =
            await window.SSPAdminSettings.get(true);

        if (!adminBookingSettings.allowNewBookings) {
            throw new Error(
                "New Admin bookings are currently disabled in Settings."
            );
        }

        /*
           This is the ONLY point where
           the booking is permanently saved.
        */

        const savedRow =
            await insertBookingIntoSupabase(
                pendingBooking
            );


        /*
           Attach the official database
           booking ID to the frontend object.
        */

        pendingBooking.id =
            savedRow.booking_id;


        pendingBooking.databaseId =
            savedRow.id;


        pendingBooking.status =
            savedRow.status;


        pendingBooking.createdAt =
            savedRow.created_at;


        pendingBooking.updatedAt =
            savedRow.updated_at;


        /*
           Keep returned database values.
        */

        pendingBooking.serviceCharge =
            savedRow.service_charge;


        pendingBooking.paymentStatus =
            savedRow.payment_status;


        pendingBooking.callConfirmationStatus =
            savedRow.call_confirmation_status;


        closeModal(
            $("#confirmModal")
        );


        closeModal(
            $("#previewModal")
        );


        showSuccess(
            pendingBooking
        );


    } catch (error) {

        console.error(
            "Unable to create SSP booking:",
            error
        );


        let message =
            "Unable to save booking.";


        if (
            error &&
            error.message
        ) {

            message =
                error.message;

        }


        if (
            error &&
            error.code === "42501"
        ) {

            message =
                "You are not authorized to create this booking.";

        }


        if (
            error &&
            error.code === "23514"
        ) {

            message =
                "One of the booking values is not accepted by the database.";

        }


        if (
            error &&
            error.code === "23502"
        ) {

            message =
                "A required booking field is missing.";

        }


        showToast(
            message
        );


    } finally {

        if (finalSaveButton) {

            finalSaveButton.disabled =
                false;

            finalSaveButton.textContent =
                "Yes, Save Booking";

        }

    }

}


/* =========================================================
   SUCCESS
   ========================================================= */

function showSuccess(
    booking
) {

    $("#createdBookingId")
        .textContent =
            booking.id;


    window.lastCreatedBookingId =
        booking.id;


    window.lastCreatedDatabaseId =
        booking.databaseId;


    openModal(
        $("#successModal")
    );

}


/* =========================================================
   BACK TO BOOKINGS
   ========================================================= */

function goToBookings() {

    window.location.href =
        "bookings.html";

}


/* =========================================================
   OPEN CREATED BOOKING
   ========================================================= */

function openCreatedBooking() {

    if (
        !window.lastCreatedBookingId
    ) {

        return;

    }


    window.location.href =
        `bookings-details.html?id=${encodeURIComponent(
            window.lastCreatedBookingId
        )}`;

}


/* =========================================================
   FORM SUBMIT
   ========================================================= */

function handleSaveRequest() {

    if (!adminBookingSettings?.allowNewBookings) {
        showToast(
            "New Admin bookings are disabled in Settings."
        );

        return;
    }

    if (
        !validateForm()
    ) {

        return;

    }


    pendingBooking =
        collectFormData();


    renderPreview(
        pendingBooking
    );


    openModal(
        $("#previewModal")
    );

}


/* =========================================================
   PRICE INPUT EVENTS
   ========================================================= */

[
    "#basePrice",
    "#distanceCharge",
    "#handlingCharge",
    "#gst"
]
.forEach(
    selector => {

        const input =
            $(selector);


        if (!input) {

            return;

        }


        input.addEventListener(
            "input",
            updateTotalPreview
        );

    }
);


/* =========================================================
   MODAL BACKDROP
   ========================================================= */

$all(
    ".modal-overlay"
)
.forEach(
    overlay => {

        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target !==
                    overlay
                ) {

                    return;

                }


                closeModal(
                    overlay
                );

            }
        );

    }
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            /*
               Verify Admin before allowing
               booking creation.
            */

            await requireActiveAdmin();

            adminBookingSettings =
                await window.SSPAdminSettings.get();

            if (!adminBookingSettings.allowNewBookings) {
                const notice =
                    document.createElement("div");

                notice.className = "booking-settings-notice";
                notice.setAttribute("role", "status");
                notice.textContent =
                    "New Admin bookings are disabled in Settings. You can review this page, but bookings cannot be created.";
                $("#bookingForm")?.prepend(notice);
                $("#previewButton").disabled = true;
                $("#saveButton").disabled = true;
            }


            /*
               Current date/time.
            */

            setCurrentDateTime();


            /*
               Preview button.
            */

            $("#previewButton")
                .addEventListener(
                    "click",
                    handleSaveRequest
                );


            /*
               Form submit.
            */

            $("#bookingForm")
                .addEventListener(
                    "submit",
                    event => {

                        event.preventDefault();

                        handleSaveRequest();

                    }
                );


            /*
               Edit preview.
            */

            $("#editPreviewButton")
                .addEventListener(
                    "click",
                    () => {

                        closeModal(
                            $("#previewModal")
                        );

                    }
                );


            /*
               Close preview.
            */

            $("#closePreviewButton")
                .addEventListener(
                    "click",
                    () => {

                        closeModal(
                            $("#previewModal")
                        );

                    }
                );


            /*
               Confirm save.
            */

            $("#confirmSaveButton")
                .addEventListener(
                    "click",
                    () => {

                        if (
                            !pendingBooking
                        ) {

                            showToast(
                                "Booking information is missing."
                            );

                            return;

                        }


                        closeModal(
                            $("#previewModal")
                        );


                        openModal(
                            $("#confirmModal")
                        );

                    }
                );


            /*
               Cancel confirmation.
            */

            $("#cancelConfirmButton")
                .addEventListener(
                    "click",
                    () => {

                        closeModal(
                            $("#confirmModal")
                        );

                    }
                );


            /*
               Final Supabase save.
            */

            $("#finalSaveButton")
                .addEventListener(
                    "click",
                    performFinalSave
                );


            /*
               Back button.
            */

            $("#backButton")
                .addEventListener(
                    "click",
                    () => {

                        window.history.back();

                    }
                );


            /*
               Cancel button.
            */

            $("#cancelButton")
                .addEventListener(
                    "click",
                    () => {

                        const confirmed =
                            window.confirm(
                                "Cancel this new booking? Entered information will be lost."
                            );


                        if (
                            confirmed
                        ) {

                            window.history.back();

                        }

                    }
                );


            /*
               Success → Booking Details.
            */

            $("#openBookingButton")
                .addEventListener(
                    "click",
                    openCreatedBooking
                );


            /*
               Success → Bookings.
            */

            $("#successBackButton")
                .addEventListener(
                    "click",
                    goToBookings
                );


            /*
               Initial price preview.
            */

            updateTotalPreview();


        } catch (error) {

            console.error(
                "New Booking initialization failed:",
                error
            );

        }

    }
);