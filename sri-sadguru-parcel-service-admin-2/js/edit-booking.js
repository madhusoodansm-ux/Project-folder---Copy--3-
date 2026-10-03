/* =========================================================
   SRI SADGURU SIDDAROODA PARCEL SERVICE
   EDIT BOOKING JAVASCRIPT

   SUPABASE DATABASE VERSION

   Database:
       public.bookings

   Important:
   - localStorage is NOT used.
   - Demo/legacy booking data is NOT used.
   - Existing booking_id is NEVER changed.
   - Booking is loaded directly from Supabase.
   - Booking updates are written directly to Supabase.
   - Existing HTML/CSS structure is preserved.
   - Existing booking ID comes from:
         edit-booking.html?id=SSP2609230004

   Supabase client:
       window.supabaseClient

   The Supabase Auth session is NOT implemented here.
   If the user is already logged into the Admin Portal,
   the existing Supabase client/session will be used.
   ========================================================= */

"use strict";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getSupabaseClient() {

    if (
        window.supabaseClient &&
        window.supabaseClient.from &&
        window.supabaseClient.auth
    ) {
        return window.supabaseClient;
    }

    /*
       Compatibility with an existing global Supabase
       client if the project uses one.
    */

    try {

        if (
            typeof supabase !== "undefined" &&
            supabase &&
            supabase.from &&
            supabase.auth
        ) {
            return supabase;
        }

    } catch (error) {

        console.error(
            "Unable to access Supabase client:",
            error
        );

    }

    return null;
}


/* =========================================================
   GET BOOKING ID FROM URL
   ========================================================= */

const params =
    new URLSearchParams(
        window.location.search
    );


const bookingId =
    params.get("id");


/* =========================================================
   CURRENT DATABASE BOOKING
   ========================================================= */

let currentDatabaseBooking = null;


/*
   This is the normalized object used by the
   existing Edit Booking form and Preview UI.
*/

let currentBooking = null;


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   GET FORM VALUE
   ========================================================= */

function value(id) {

    const element =
        $(id);

    return element
        ? element.value
        : "";

}


/* =========================================================
   SET FORM VALUE
   ========================================================= */

function setValue(id, data) {

    const element =
        $(id);

    if (!element) {
        return;
    }

    if (
        data === null ||
        data === undefined
    ) {

        element.value = "";

        return;

    }

    element.value =
        data;

}


/* =========================================================
   ESCAPE HTML
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
   CLONE OBJECT
   ========================================================= */

function cloneObject(object) {

    if (!object) {
        return {};
    }

    if (
        typeof structuredClone ===
        "function"
    ) {

        return structuredClone(
            object
        );

    }

    return JSON.parse(
        JSON.stringify(object)
    );

}


/* =========================================================
   NUMBER HELPER
   ========================================================= */

function numberOrNull(input) {

    if (
        input === null ||
        input === undefined ||
        input === ""
    ) {

        return null;

    }

    const number =
        Number(input);

    return Number.isFinite(number)
        ? number
        : null;

}


/* =========================================================
   PARSE NUMERIC VALUE
   =========================================================

   Examples:

       "5 kg"       → 5
       "5.5 kg"     → 5.5
       "1500"       → 1500

   Used for parcel weight and numeric fields.
   ========================================================= */

function parseFirstNumber(input) {

    if (
        input === null ||
        input === undefined
    ) {
        return null;
    }

    const text =
        String(input).trim();

    if (!text) {
        return null;
    }

    const match =
        text.match(
            /-?\d+(?:\.\d+)?/
        );

    if (!match) {
        return null;
    }

    const number =
        Number(match[0]);

    return Number.isFinite(number)
        ? number
        : null;

}


/* =========================================================
   PARSE DIMENSIONS
   =========================================================

   Supported examples:

       40 × 30 × 20 cm
       40 x 30 x 20 cm
       40 X 30 X 20
       40*30*20

   Returns:

       {
           length,
           width,
           height
       }

   ========================================================= */

function parseDimensions(input) {

    if (
        input === null ||
        input === undefined
    ) {

        return {
            length: null,
            width: null,
            height: null
        };

    }

    const text =
        String(input)
            .trim()
            .replace(/×/g, "x")
            .replace(/\*/g, "x");

    if (!text) {

        return {
            length: null,
            width: null,
            height: null
        };

    }

    const numbers =
        text.match(
            /\d+(?:\.\d+)?/g
        );

    if (
        !numbers ||
        numbers.length < 3
    ) {

        return {
            length: null,
            width: null,
            height: null
        };

    }

    return {

        length:
            Number(numbers[0]),

        width:
            Number(numbers[1]),

        height:
            Number(numbers[2])

    };

}


/* =========================================================
   FORMAT DIMENSIONS
   ========================================================= */

function formatDimensions(
    length,
    width,
    height
) {

    if (
        length === null ||
        length === undefined ||
        width === null ||
        width === undefined ||
        height === null ||
        height === undefined
    ) {

        return "";

    }

    return `${length} × ${width} × ${height} cm`;

}


/* =========================================================
   DATABASE STATUS → EXISTING HTML STATUS
   ========================================================= */

function databaseStatusToFormStatus(
    status
) {

    switch (
        String(status || "")
            .toLowerCase()
    ) {

        case "pending":
            return "Pending";

        case "confirmed":
            return "Confirmed";

        case "assigned":
            /*
               The existing HTML does not have
               an "Assigned" option.

               Preserve the existing form options.
            */
            return "Confirmed";

        case "pickup_started":
            return "Picked Up";

        case "picked_up":
            return "Picked Up";

        case "in_transit":
            return "In Transit";

        case "out_for_delivery":
            return "In Transit";

        case "delivered":
            return "Delivered";

        case "cancelled":
            return "Cancelled";

        default:
            return "Pending";

    }

}


/* =========================================================
   EXISTING HTML STATUS → DATABASE STATUS
   ========================================================= */

function formStatusToDatabaseStatus(
    status
) {

    switch (
        String(status || "")
            .trim()
            .toLowerCase()
    ) {

        case "pending":
            return "pending";

        case "booked":
            return "confirmed";

        case "confirmed":
            return "confirmed";

        case "picked up":
            return "picked_up";

        case "in transit":
            return "in_transit";

        case "delivered":
            return "delivered";

        case "cancelled":
            return "cancelled";

        default:
            return "pending";

    }

}


/* =========================================================
   DATABASE PAYMENT STATUS → EXISTING HTML
   ========================================================= */

function databasePaymentStatusToFormStatus(
    paymentStatus,
    paymentMethod
) {

    const status =
        String(
            paymentStatus || ""
        ).toLowerCase();

    const method =
        String(
            paymentMethod || ""
        ).toLowerCase();


    /*
       The current HTML contains:

           Pending
           Cash on Delivery
           Paid
           Partially Paid

       "Cash on Delivery" is represented in the
       database through payment_method while the
       payment_status remains pending.
    */

    if (
        method ===
            "cash on delivery" &&
        status === "pending"
    ) {

        return "Cash on Delivery";

    }


    if (
        status === "paid"
    ) {

        return "Paid";

    }


    if (
        status === "partially_paid"
    ) {

        return "Partially Paid";

    }


    return "Pending";

}


/* =========================================================
   FORM PAYMENT STATUS → DATABASE
   ========================================================= */

function formPaymentStatusToDatabaseStatus(
    status
) {

    switch (
        String(status || "")
            .trim()
            .toLowerCase()
    ) {

        case "paid":
            return "paid";

        case "partially paid":
            return "partially_paid";

        case "cash on delivery":
            return "pending";

        case "pending":
        default:
            return "pending";

    }

}


/* =========================================================
   LOAD DRIVER PROFILE
   =========================================================

   Driver assignment is stored using driver_id.

   We do NOT change driver_id from this Edit form.

   We only read the driver's profile so the existing
   Driver / Vehicle fields can display useful information.
   ========================================================= */

async function loadDriverInformation(
    driverId
) {

    if (!driverId) {

        return {

            name: "",
            phone: "",
            vehicle: {}

        };

    }


    const client =
        getSupabaseClient();

    if (!client) {

        return {

            name: "",
            phone: "",
            vehicle: {}

        };

    }


    try {

        const {
            data,
            error
        } =
            await client
                .from("profiles")
                .select(
                    "id, full_name, phone, role, status"
                )
                .eq(
                    "id",
                    driverId
                )
                .maybeSingle();


        if (error) {

            console.warn(
                "Unable to load driver profile:",
                error
            );

            return {

                name: "",
                phone: "",
                vehicle: {}

            };

        }


        if (!data) {

            return {

                name: "",
                phone: "",
                vehicle: {}

            };

        }


        return {

            name:
                data.full_name || "",

            phone:
                data.phone || "",

            vehicle: {}

        };

    } catch (error) {

        console.warn(
            "Driver information could not be loaded:",
            error
        );

        return {

            name: "",
            phone: "",
            vehicle: {}

        };

    }

}


/* =========================================================
   CONVERT SUPABASE BOOKING → EXISTING FORM OBJECT
   ========================================================= */

async function convertDatabaseBooking(
    row
) {

    const driver =
        await loadDriverInformation(
            row.driver_id
        );


    const dimensions =
        row.dimensions_text ||
        formatDimensions(
            row.parcel_length,
            row.parcel_width,
            row.parcel_height
        );


    return {

        id:
            row.booking_id,

        bookingDate:
            row.booking_date || "",

        bookingTime:
            row.booking_time
                ? String(row.booking_time)
                    .substring(0, 5)
                : "",

        status:
            databaseStatusToFormStatus(
                row.status
            ),


        sender: {

            name:
                row.pickup_name || "",

            phone:
                row.pickup_phone || "",

            address:
                row.pickup_address || ""

        },


        receiver: {

            name:
                row.receiver_name || "",

            phone:
                row.receiver_phone || "",

            address:
                row.delivery_address || ""

        },


        route: {

            from:
                row.pickup_city || "",

            to:
                row.delivery_city || ""

        },


        pickupAddress:
            row.pickup_address || "",


        deliveryAddress:
            row.delivery_address || "",


        parcel: {

            type:
                row.parcel_type || "",

            pieces:
                row.pieces ?? "",

            weight:
                row.parcel_weight !== null &&
                row.parcel_weight !== undefined
                    ? `${row.parcel_weight} kg`
                    : "",

            dimensions:
                dimensions,

            declaredValue:
                row.declared_value ?? "",

            instructions:
                row.special_instructions || ""

        },


        pricing: {

            basePrice:
                row.base_price ?? null,

            distanceCharge:
                row.distance_charge ?? null,

            handlingCharge:
                row.handling_charge ?? null,

            gst:
                row.gst_amount ?? null,

            total:
                row.service_charge ?? null

        },


        payment: {

            method:
                row.payment_method || "",

            status:
                databasePaymentStatusToFormStatus(
                    row.payment_status,
                    row.payment_method
                ),

            receivedAmount:
                row.received_amount ?? null

        },


        driver: {

            id:
                row.driver_id || null,

            name:
                driver.name || "",

            phone:
                driver.phone || ""

        },


        vehicle: {},


        delivery: {

            serviceType:
                row.service_type || "",

            expectedDelivery:
                null,

            currentLocation:
                null

        },


        proofOfDelivery:
            null,


        internalNotes:
            row.admin_notes || ""

    };

}


/* =========================================================
   FETCH BOOKING FROM SUPABASE
   ========================================================= */

async function findBooking() {

    if (!bookingId) {
        return null;
    }


    const client =
        getSupabaseClient();


    if (!client) {

        throw new Error(
            "Supabase client is not available. Make sure supabase-client.js is loaded before edit-booking.js."
        );

    }


    const {
        data,
        error
    } =
        await client
            .from("bookings")
            .select("*")
            .eq(
                "booking_id",
                bookingId
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Supabase booking load error:",
            error
        );

        throw new Error(
            error.message ||
            "Unable to load the booking from Supabase."
        );

    }


    if (!data) {

        return null;

    }


    currentDatabaseBooking =
        data;


    currentBooking =
        await convertDatabaseBooking(
            data
        );


    return currentBooking;

}


/* =========================================================
   SHOW ELEMENT
   ========================================================= */

function show(element) {

    if (element) {

        element.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   HIDE ELEMENT
   ========================================================= */

function hide(element) {

    if (element) {

        element.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   LOAD BOOKING INTO FORM
   ========================================================= */

function loadBookingIntoForm(
    booking
) {

    /* ---------------------------------------------
       Booking
       --------------------------------------------- */

    setValue(
        "bookingId",
        booking.id || bookingId
    );


    setValue(
        "bookingDate",
        booking.bookingDate || ""
    );


    setValue(
        "bookingTime",
        booking.bookingTime || ""
    );


    setValue(
        "bookingStatus",
        booking.status || "Pending"
    );


    /* ---------------------------------------------
       Sender
       --------------------------------------------- */

    const sender =
        booking.sender || {};


    setValue(
        "senderName",
        sender.name || ""
    );


    setValue(
        "senderPhone",
        sender.phone || ""
    );


    setValue(
        "senderAddress",
        sender.address ||
        booking.pickupAddress ||
        ""
    );


    /* ---------------------------------------------
       Receiver
       --------------------------------------------- */

    const receiver =
        booking.receiver || {};


    setValue(
        "receiverName",
        receiver.name || ""
    );


    setValue(
        "receiverPhone",
        receiver.phone || ""
    );


    setValue(
        "receiverAddress",
        receiver.address ||
        booking.deliveryAddress ||
        ""
    );


    /* ---------------------------------------------
       Route
       --------------------------------------------- */

    const route =
        booking.route || {};


    setValue(
        "routeFrom",
        route.from || ""
    );


    setValue(
        "routeTo",
        route.to || ""
    );


    setValue(
        "pickupAddress",
        booking.pickupAddress ||
        sender.address ||
        ""
    );


    setValue(
        "deliveryAddress",
        booking.deliveryAddress ||
        receiver.address ||
        ""
    );


    /* ---------------------------------------------
       Parcel
       --------------------------------------------- */

    const parcel =
        booking.parcel || {};


    setValue(
        "parcelType",
        parcel.type || ""
    );


    setValue(
        "parcelPieces",
        parcel.pieces ?? ""
    );


    setValue(
        "parcelWeight",
        parcel.weight || ""
    );


    setValue(
        "parcelDimensions",
        parcel.dimensions || ""
    );


    setValue(
        "declaredValue",
        parcel.declaredValue ?? ""
    );


    setValue(
        "parcelInstructions",
        parcel.instructions || ""
    );


    /* ---------------------------------------------
       Payment
       --------------------------------------------- */

    const payment =
        booking.payment || {};


    setValue(
        "paymentStatus",
        payment.status || "Pending"
    );


    setValue(
        "paymentMethod",
        payment.method || ""
    );


    setValue(
        "receivedAmount",
        payment.receivedAmount ?? ""
    );


    /* ---------------------------------------------
       Pricing
       --------------------------------------------- */

    const pricing =
        booking.pricing || {};


    setValue(
        "basePrice",
        pricing.basePrice ?? ""
    );


    setValue(
        "distanceCharge",
        pricing.distanceCharge ?? ""
    );


    setValue(
        "handlingCharge",
        pricing.handlingCharge ?? ""
    );


    setValue(
        "gst",
        pricing.gst ?? ""
    );


    setValue(
        "total",
        pricing.total ?? ""
    );


    /* ---------------------------------------------
       Driver
       --------------------------------------------- */

    const driver =
        booking.driver || {};


    const vehicle =
        booking.vehicle || {};


    setValue(
        "driverName",
        driver.name || ""
    );


    setValue(
        "driverPhone",
        driver.phone || ""
    );


    setValue(
        "vehicleNumber",
        vehicle.number ||
        driver.vehicle?.number ||
        ""
    );


    setValue(
        "vehicleType",
        vehicle.type ||
        driver.vehicle?.type ||
        ""
    );

}


/* =========================================================
   COLLECT UPDATED BOOKING
   ========================================================= */

function collectUpdatedBooking() {

    /*
       Start from the existing normalized booking.

       This preserves information not represented
       in the Edit form.
    */

    const updated =
        cloneObject(
            currentBooking
        );


    /* ---------------------------------------------
       Booking
       --------------------------------------------- */

    updated.id =
        bookingId;


    updated.bookingDate =
        value("bookingDate");


    updated.bookingTime =
        value("bookingTime");


    updated.status =
        value("bookingStatus");


    /* ---------------------------------------------
       Sender
       --------------------------------------------- */

    updated.sender = {

        ...(currentBooking.sender || {}),

        name:
            value("senderName"),

        phone:
            value("senderPhone"),

        address:
            value("senderAddress")

    };


    /* ---------------------------------------------
       Receiver
       --------------------------------------------- */

    updated.receiver = {

        ...(currentBooking.receiver || {}),

        name:
            value("receiverName"),

        phone:
            value("receiverPhone"),

        address:
            value("receiverAddress")

    };


    /* ---------------------------------------------
       Route
       --------------------------------------------- */

    updated.route = {

        ...(currentBooking.route || {}),

        from:
            value("routeFrom"),

        to:
            value("routeTo")

    };


    updated.pickupAddress =
        value("pickupAddress");


    updated.deliveryAddress =
        value("deliveryAddress");


    /* ---------------------------------------------
       Parcel
       --------------------------------------------- */

    updated.parcel = {

        ...(currentBooking.parcel || {}),

        type:
            value("parcelType"),

        pieces:
            value("parcelPieces"),

        weight:
            value("parcelWeight"),

        dimensions:
            value("parcelDimensions"),

        declaredValue:
            value("declaredValue"),

        instructions:
            value("parcelInstructions")

    };


    /* ---------------------------------------------
       Payment
       --------------------------------------------- */

    updated.payment = {

        ...(currentBooking.payment || {}),

        status:
            value("paymentStatus"),

        method:
            value("paymentMethod"),

        receivedAmount:
            value("receivedAmount")

    };


    /* ---------------------------------------------
       Pricing
       --------------------------------------------- */

    updated.pricing = {

        ...(currentBooking.pricing || {}),

        basePrice:
            numberOrNull(
                value("basePrice")
            ),

        distanceCharge:
            numberOrNull(
                value("distanceCharge")
            ),

        handlingCharge:
            numberOrNull(
                value("handlingCharge")
            ),

        gst:
            numberOrNull(
                value("gst")
            ),

        total:
            numberOrNull(
                value("total")
            )

    };


    /* ---------------------------------------------
       Driver
       --------------------------------------------- */

    const driverName =
        value("driverName");


    const driverPhone =
        value("driverPhone");


    const vehicleNumber =
        value("vehicleNumber");


    const vehicleType =
        value("vehicleType");


    updated.driver = {

        ...(currentBooking.driver || {}),

        name:
            driverName,

        phone:
            driverPhone

    };


    updated.vehicle = {

        ...(currentBooking.vehicle || {}),

        number:
            vehicleNumber,

        type:
            vehicleType

    };


    return updated;

}


/* =========================================================
   BUILD SUPABASE UPDATE
   ========================================================= */

function buildDatabaseUpdate(
    updated
) {

    if (
        !currentDatabaseBooking
    ) {

        throw new Error(
            "The original Supabase booking is not available."
        );

    }


    /* ---------------------------------------------
       Required numeric parcel weight
       --------------------------------------------- */

    const parcelWeight =
        parseFirstNumber(
            updated.parcel.weight
        );


    if (
        parcelWeight === null
    ) {

        throw new Error(
            "Parcel weight must contain a valid numeric value. Example: 5 kg."
        );

    }


    /* ---------------------------------------------
       Pieces
       --------------------------------------------- */

    const pieces =
        Number(
            updated.parcel.pieces
        );


    if (
        !Number.isInteger(pieces) ||
        pieces < 1
    ) {

        throw new Error(
            "Parcel pieces must be a whole number greater than 0."
        );

    }


    /* ---------------------------------------------
       Dimensions
       --------------------------------------------- */

    const dimensions =
        parseDimensions(
            updated.parcel.dimensions
        );


    /*
       If dimensions are entered, they must contain
       length × width × height.
    */

    if (
        updated.parcel.dimensions &&
        (
            dimensions.length === null ||
            dimensions.width === null ||
            dimensions.height === null
        )
    ) {

        throw new Error(
            "Dimensions must be entered like: 40 × 30 × 20 cm."
        );

    }


    /* ---------------------------------------------
       Payment
       --------------------------------------------- */

    let paymentMethod =
        value("paymentMethod").trim();


    const formPaymentStatus =
        value("paymentStatus");


    /*
       If the user selects Cash on Delivery as the
       payment status and no payment method is selected,
       automatically use Cash on Delivery.
    */

    if (
        formPaymentStatus ===
            "Cash on Delivery" &&
        !paymentMethod
    ) {

        paymentMethod =
            "Cash on Delivery";

    }


    const databasePaymentStatus =
        formPaymentStatusToDatabaseStatus(
            formPaymentStatus
        );


    /* ---------------------------------------------
       Price
       --------------------------------------------- */

    const basePrice =
        numberOrNull(
            value("basePrice")
        );


    const distanceCharge =
        numberOrNull(
            value("distanceCharge")
        );


    const handlingCharge =
        numberOrNull(
            value("handlingCharge")
        );


    const gstAmount =
        numberOrNull(
            value("gst")
        );


    const serviceCharge =
        numberOrNull(
            value("total")
        );


    const declaredValue =
        numberOrNull(
            value("declaredValue")
        );


    const receivedAmount =
        numberOrNull(
            value("receivedAmount")
        );


    /* ---------------------------------------------
       Database update object
       --------------------------------------------- */

    const update = {

        /*
           Booking information
        */

        booking_date:
            updated.bookingDate || null,

        booking_time:
            updated.bookingTime || null,

        status:
            formStatusToDatabaseStatus(
                updated.status
            ),


        /*
           Sender
        */

        pickup_name:
            updated.sender.name.trim(),

        pickup_phone:
            updated.sender.phone.trim(),

        pickup_address:
            updated.sender.address.trim(),

        /*
           The existing Edit Booking form calls
           this field "From".
        */

        pickup_city:
            updated.route.from.trim(),


        /*
           Receiver
        */

        receiver_name:
            updated.receiver.name.trim(),

        receiver_phone:
            updated.receiver.phone.trim(),

        delivery_address:
            updated.receiver.address.trim(),

        /*
           The existing Edit Booking form calls
           this field "To".
        */

        delivery_city:
            updated.route.to.trim(),


        /*
           Parcel
        */

        parcel_type:
            updated.parcel.type.trim(),

        parcel_weight:
            parcelWeight,

        pieces:
            pieces,

        special_instructions:
            updated.parcel.instructions.trim() ||
            null,

        declared_value:
            declaredValue,


        /*
           Dimensions
        */

        dimensions_text:
            updated.parcel.dimensions.trim() ||
            null,

        parcel_length:
            dimensions.length,

        parcel_width:
            dimensions.width,

        parcel_height:
            dimensions.height,


        /*
           Pricing
        */

        base_price:
            basePrice,

        distance_charge:
            distanceCharge,

        handling_charge:
            handlingCharge,

        gst_amount:
            gstAmount,

        service_charge:
            serviceCharge,


        /*
           Payment
        */

        payment_status:
            databasePaymentStatus,

        payment_method:
            paymentMethod || null,

        received_amount:
            receivedAmount,


        /*
           Service type is not represented by the
           current Edit HTML.

           Therefore preserve the existing DB value.
        */

        service_type:
            currentDatabaseBooking.service_type || null,


        /*
           Preserve the existing customer and driver
           relationships.

           We do NOT modify these IDs here.
        */

        customer_id:
            currentDatabaseBooking.customer_id,

        driver_id:
            currentDatabaseBooking.driver_id,


        /*
           Preserve call confirmation state.
        */

        call_confirmation_status:
            currentDatabaseBooking.call_confirmation_status,

        call_confirmed_at:
            currentDatabaseBooking.call_confirmed_at,

        call_confirmed_by:
            currentDatabaseBooking.call_confirmed_by,


        /*
           Preserve admin notes.
        */

        admin_notes:
            currentDatabaseBooking.admin_notes,


        /*
           Update timestamp.
        */

        updated_at:
            new Date().toISOString()

    };


    return update;

}


/* =========================================================
   VALIDATE FORM
   ========================================================= */

function validateForm() {

    const form =
        $("editBookingForm");


    if (!form) {
        return false;
    }


    if (
        !form.checkValidity()
    ) {

        form.reportValidity();

        return false;

    }


    return true;

}


/* =========================================================
   PREVIEW VALUE
   ========================================================= */

function previewValue(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";

    }

    return escapeHTML(
        value
    );

}


/* =========================================================
   PREVIEW ROW
   ========================================================= */

function previewRow(
    label,
    data
) {

    return `

        <div class="preview-row">

            <span class="preview-label">
                ${escapeHTML(label)}
            </span>

            <div class="preview-value">
                ${previewValue(data)}
            </div>

        </div>

    `;

}


/* =========================================================
   PREVIEW SECTION
   ========================================================= */

function previewSection(
    title,
    rows
) {

    return `

        <section class="preview-section">

            <h3>
                ${escapeHTML(title)}
            </h3>

            <div class="preview-grid">

                ${rows}

            </div>

        </section>

    `;

}


/* =========================================================
   CREATE PREVIEW
   ========================================================= */

function createPreview(
    updated
) {

    const sender =
        updated.sender || {};


    const receiver =
        updated.receiver || {};


    const route =
        updated.route || {};


    const parcel =
        updated.parcel || {};


    const payment =
        updated.payment || {};


    const pricing =
        updated.pricing || {};


    const driver =
        updated.driver || {};


    const vehicle =
        updated.vehicle || {};


    let html = "";


    /* ---------------------------------------------
       Booking
       --------------------------------------------- */

    html +=
        previewSection(

            "Booking Information",

            previewRow(
                "Booking ID",
                updated.id
            ) +

            previewRow(
                "Booking Date",
                updated.bookingDate
            ) +

            previewRow(
                "Booking Time",
                updated.bookingTime
            ) +

            previewRow(
                "Booking Status",
                updated.status
            )

        );


    /* ---------------------------------------------
       Sender
       --------------------------------------------- */

    html +=
        previewSection(

            "Sender / Customer",

            previewRow(
                "Name",
                sender.name
            ) +

            previewRow(
                "Phone",
                sender.phone
            ) +

            previewRow(
                "Address",
                sender.address
            )

        );


    /* ---------------------------------------------
       Receiver
       --------------------------------------------- */

    html +=
        previewSection(

            "Receiver",

            previewRow(
                "Name",
                receiver.name
            ) +

            previewRow(
                "Phone",
                receiver.phone
            ) +

            previewRow(
                "Address",
                receiver.address
            )

        );


    /* ---------------------------------------------
       Route
       --------------------------------------------- */

    html +=
        previewSection(

            "Parcel Route",

            previewRow(
                "From",
                route.from
            ) +

            previewRow(
                "To",
                route.to
            ) +

            previewRow(
                "Pickup Address",
                updated.pickupAddress
            ) +

            previewRow(
                "Delivery Address",
                updated.deliveryAddress
            )

        );


    /* ---------------------------------------------
       Parcel
       --------------------------------------------- */

    html +=
        previewSection(

            "Parcel Details",

            previewRow(
                "Parcel Type",
                parcel.type
            ) +

            previewRow(
                "Pieces",
                parcel.pieces
            ) +

            previewRow(
                "Weight",
                parcel.weight
            ) +

            previewRow(
                "Dimensions",
                parcel.dimensions
            ) +

            previewRow(
                "Declared Value",
                parcel.declaredValue
            ) +

            previewRow(
                "Special Instructions",
                parcel.instructions
            )

        );


    /* ---------------------------------------------
       Payment
       --------------------------------------------- */

    html +=
        previewSection(

            "Payment Information",

            previewRow(
                "Status",
                payment.status
            ) +

            previewRow(
                "Method",
                payment.method
            ) +

            previewRow(
                "Received Amount",
                payment.receivedAmount
            )

        );


    /* ---------------------------------------------
       Pricing
       --------------------------------------------- */

    html +=
        previewSection(

            "Price Details",

            previewRow(
                "Base Price",
                pricing.basePrice
            ) +

            previewRow(
                "Distance Charge",
                pricing.distanceCharge
            ) +

            previewRow(
                "Handling Charge",
                pricing.handlingCharge
            ) +

            previewRow(
                "GST",
                pricing.gst
            ) +

            previewRow(
                "Total",
                pricing.total
            )

        );


    /* ---------------------------------------------
       Driver
       --------------------------------------------- */

    if (
        driver.name ||
        driver.phone ||
        vehicle.number ||
        vehicle.type
    ) {

        html +=
            previewSection(

                "Driver / Vehicle",

                previewRow(
                    "Driver Name",
                    driver.name
                ) +

                previewRow(
                    "Driver Phone",
                    driver.phone
                ) +

                previewRow(
                    "Vehicle Number",
                    vehicle.number
                ) +

                previewRow(
                    "Vehicle Type",
                    vehicle.type
                )

            );

    }


    return html;

}


/* =========================================================
   OPEN PREVIEW
   ========================================================= */

function openPreview() {

    if (
        !validateForm()
    ) {

        return;

    }


    let updated;


    try {

        updated =
            collectUpdatedBooking();


        /*
           Build the Supabase payload now.

           This validates values before the user
           clicks Confirm & Save.
        */

        buildDatabaseUpdate(
            updated
        );

    } catch (error) {

        alert(
            error.message ||
            "Please check the booking information."
        );

        return;

    }


    const previewContent =
        $("previewContent");


    if (previewContent) {

        previewContent.innerHTML =
            createPreview(
                updated
            );

    }


    show(
        $("previewModal")
    );

}


/* =========================================================
   CLOSE PREVIEW
   ========================================================= */

function closePreview() {

    hide(
        $("previewModal")
    );

}


/* =========================================================
   SAVE UPDATED BOOKING TO SUPABASE
   ========================================================= */

async function saveUpdatedBooking() {

    if (
        !currentDatabaseBooking
    ) {

        alert(
            "No booking is currently loaded."
        );

        return;

    }


    const client =
        getSupabaseClient();


    if (!client) {

        alert(
            "Supabase client is not available."
        );

        return;

    }


    let updated;
    let databaseUpdate;


    try {

        updated =
            collectUpdatedBooking();


        /*
           Booking ID must never change.
        */

        updated.id =
            bookingId;


        if (
            updated.id !== bookingId
        ) {

            throw new Error(
                "Booking ID cannot be changed."
            );

        }


        databaseUpdate =
            buildDatabaseUpdate(
                updated
            );

    } catch (error) {

        alert(
            error.message ||
            "Unable to prepare the booking update."
        );

        return;

    }


    const confirmSaveBtn =
        $("confirmSaveBtn");


    if (confirmSaveBtn) {

        confirmSaveBtn.disabled =
            true;

        confirmSaveBtn.textContent =
            "Saving...";

    }


    try {

        /*
           IMPORTANT:

           Update by the immutable booking_id.

           We do NOT update booking_id itself.
        */

        const {
            data,
            error
        } =
            await client
                .from("bookings")
                .update(
                    databaseUpdate
                )
                .eq(
                    "booking_id",
                    bookingId
                )
                .select("*")
                .single();


        if (error) {

            console.error(
                "Supabase booking update error:",
                error
            );

            throw new Error(
                error.message ||
                "Supabase could not update the booking."
            );

        }


        if (!data) {

            throw new Error(
                "The booking was not returned after the update."
            );

        }


        /*
           Keep the updated database row.
        */

        currentDatabaseBooking =
            data;


        /*
           Rebuild the normalized booking object.
        */

        currentBooking =
            await convertDatabaseBooking(
                data
            );


        /*
           Close preview.
        */

        closePreview();


        /*
           Show existing success modal.
        */

        show(
            $("successModal")
        );


    } catch (error) {

        console.error(
            "Unable to save booking:",
            error
        );


        alert(
            `Unable to save the booking.\n\n${error.message || "Unknown Supabase error."}`
        );


    } finally {

        if (confirmSaveBtn) {

            confirmSaveBtn.disabled =
                false;

            confirmSaveBtn.textContent =
                "Confirm & Save";

        }

    }

}


/* =========================================================
   RETURN TO BOOKING DETAILS
   ========================================================= */

function goToBookingDetails() {

    window.location.href =
        `bookings-details.html?id=${encodeURIComponent(
            bookingId
        )}`;

}


/* =========================================================
   CANCEL EDIT
   ========================================================= */

function cancelEdit() {

    if (
        document.referrer &&
        document.referrer !==
            window.location.href
    ) {

        window.history.back();

        return;

    }


    goToBookingDetails();

}


/* =========================================================
   SHOW ERROR
   ========================================================= */

function showError(
    message
) {

    hide(
        $("loadingMessage")
    );


    hide(
        $("editBookingForm")
    );


    show(
        $("errorMessage")
    );


    const errorText =
        $("errorText");


    if (errorText) {

        errorText.textContent =
            message;

    }

}


/* =========================================================
   LOAD PAGE
   ========================================================= */

async function initializeEditBookingPage() {

    /*
       Validate booking ID.
    */

    if (!bookingId) {

        showError(
            "No booking ID was supplied in the URL."
        );

        return;

    }


    const bookingIdDisplay =
        $("bookingIdDisplay");


    if (
        bookingIdDisplay
    ) {

        bookingIdDisplay.textContent =
            bookingId;

    }


    try {

        /*
           Load directly from Supabase.
        */

        currentBooking =
            await findBooking();


        if (!currentBooking) {

            showError(
                "This booking could not be found in the Supabase bookings table."
            );

            return;

        }


        /*
           Load the existing values into
           the unchanged form.
        */

        loadBookingIntoForm(
            currentBooking
        );


        hide(
            $("loadingMessage")
        );


        show(
            $("editBookingForm")
        );


    } catch (error) {

        console.error(
            "Edit Booking initialization error:",
            error
        );


        showError(
            error.message ||
            "Unable to load this booking from Supabase."
        );

        return;

    }


    /* =====================================================
       PREVIEW
       ===================================================== */

    const previewBtn =
        $("previewBtn");


    if (previewBtn) {

        previewBtn.addEventListener(
            "click",
            openPreview
        );

    }


    /* =====================================================
       CANCEL
       ===================================================== */

    const cancelBtn =
        $("cancelBtn");


    if (cancelBtn) {

        cancelBtn.addEventListener(
            "click",
            cancelEdit
        );

    }


    /* =====================================================
       ERROR BACK
       ===================================================== */

    const errorBackBtn =
        $("errorBackBtn");


    if (errorBackBtn) {

        errorBackBtn.addEventListener(
            "click",
            cancelEdit
        );

    }


    /* =====================================================
       CLOSE PREVIEW
       ===================================================== */

    const closePreviewBtn =
        $("closePreviewBtn");


    if (closePreviewBtn) {

        closePreviewBtn.addEventListener(
            "click",
            closePreview
        );

    }


    /* =====================================================
       BACK TO EDIT
       ===================================================== */

    const backToEditBtn =
        $("backToEditBtn");


    if (backToEditBtn) {

        backToEditBtn.addEventListener(
            "click",
            closePreview
        );

    }


    /* =====================================================
       PREVIEW OVERLAY
       ===================================================== */

    const modalOverlay =
        $("modalOverlay");


    if (modalOverlay) {

        modalOverlay.addEventListener(
            "click",
            closePreview
        );

    }


    /* =====================================================
       CONFIRM SAVE
       ===================================================== */

    const confirmSaveBtn =
        $("confirmSaveBtn");


    if (confirmSaveBtn) {

        confirmSaveBtn.addEventListener(
            "click",
            saveUpdatedBooking
        );

    }


    /* =====================================================
       SUCCESS CONTINUE
       ===================================================== */

    const successContinueBtn =
        $("successContinueBtn");


    if (successContinueBtn) {

        successContinueBtn.addEventListener(
            "click",
            goToBookingDetails
        );

    }


    /* =====================================================
       PAGE TITLE
       ===================================================== */

    document.title =
        `Edit ${bookingId} | Sri Sadguru Parcel Service`;

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeEditBookingPage();

    }
);