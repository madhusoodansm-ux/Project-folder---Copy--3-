(() => {

    "use strict";


    /* =========================================================
       SRI SADGURU PARCEL SERVICE
       ADMIN PORTAL
       BOOKING DETAILS
       
       DATA SOURCE:
       Supabase
       
       Tables:
       - public.bookings
       - public.profiles
       - public.booking_status_history
    ========================================================= */


    /* =========================================================
       SETTINGS
    ========================================================= */

    const GST_RATE = 0.18;

    const params =
        new URLSearchParams(
            window.location.search
        );

    const requestedId =
        params.get("id");


    const COMPANY = {

        name:
            "Sri Sadguru Siddarooda Parcel Service",

        logo:
            "../images/logo.png",

        address:
            "School Road, Channnahalli, Shikaripura -577427, Shimoga District, Karnataka",

        phone:
            "8860883156",

        email:
            "madhuanavatti86@gmail.com",

        gstin:
            "GTSWY571620PU925"

    };


    /* =========================================================
       STATE
    ========================================================= */

    let booking = null;

    let customerProfile = null;

    let driverProfiles = [];

    let selectedDriverId = null;

    let bookingHistory = [];

    let pendingPodData = null;


    /* =========================================================
       SUPABASE CLIENT
    ========================================================= */

    function getSupabaseClient() {

        if (
            typeof window === "undefined" ||
            !window.supabaseClient
        ) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }

        return window.supabaseClient;

    }


    /* =========================================================
       AUTHENTICATION
    ========================================================= */

    async function requireAdminAuth() {

        const supabase =
            getSupabaseClient();

        const {
            data: sessionData,
            error: sessionError
        } =
            await supabase.auth.getSession();

        if (
            sessionError ||
            !sessionData?.session?.user
        ) {

            window.location.href =
                "index.html";

            throw new Error(
                "Admin session not found."
            );

        }

        const user =
            sessionData.session.user;


        const {
            data: profile,
            error: profileError
        } =
            await supabase
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
            profileError ||
            !profile
        ) {

            await supabase.auth.signOut();

            window.location.href =
                "index.html";

            throw new Error(
                "Administrator profile could not be verified."
            );

        }


        if (
            profile.role !== "admin" ||
            profile.status !== "active"
        ) {

            await supabase.auth.signOut();

            window.location.href =
                "index.html";

            throw new Error(
                "Active administrator access is required."
            );

        }


        return {
            user,
            profile
        };

    }


    /* =========================================================
       DOM HELPERS
    ========================================================= */

    const $ =
        selector =>
            document.querySelector(selector);


    function setText(
        selector,
        value
    ) {

        const element =
            $(selector);

        if (element) {

            element.textContent =
                value ??
                "—";

        }

    }


    function escapeHtml(value) {

        return String(
            value ?? "—"
        )
            .replace(
                /[&<>"']/g,
                character =>
                    ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#39;"
                    }[character])
            );

    }


    function money(value) {

        if (
            value === null ||
            value === undefined ||
            value === "" ||
            Number.isNaN(
                Number(value)
            )
        ) {

            return "—";

        }

        return `₹${Number(value)
            .toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }
            )}`;

    }


    function formatDate(dateValue) {

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

            return String(
                dateValue
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


    function formatTime(timeValue) {

        if (!timeValue) {

            return "—";

        }

        const parts =
            String(
                timeValue
            ).split(":");

        if (
            parts.length < 2
        ) {

            return String(
                timeValue
            );

        }

        const hours =
            Number(parts[0]);

        const minutes =
            Number(parts[1]);

        if (
            Number.isNaN(hours) ||
            Number.isNaN(minutes)
        ) {

            return String(
                timeValue
            );

        }

        const date =
            new Date();

        date.setHours(
            hours,
            minutes,
            0,
            0
        );

        return date.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
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
            new Date(value);

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
       STATUS LABELS
    ========================================================= */

    function getStatusLabel(
        status
    ) {

        const labels = {

            pending:
                "NEW BOOKING",

            confirmed:
                "CONFIRMED",

            assigned:
                "DRIVER ASSIGNED",

            pickup_started:
                "PICKUP STARTED",

            picked_up:
                "PICKED UP",

            in_transit:
                "IN TRANSIT",

            out_for_delivery:
                "OUT FOR DELIVERY",

            delivered:
                "DELIVERED",

            cancelled:
                "CANCELLED"

        };

        return (
            labels[status] ||
            String(
                status ||
                "PENDING"
            ).toUpperCase()
        );

    }


    /* =========================================================
       PAYMENT LABEL
    ========================================================= */

    function getPaymentLabel(
        status
    ) {

        const labels = {

            pending:
                "Pending",

            partially_paid:
                "Partially Paid",

            paid:
                "Paid",

            failed:
                "Failed",

            cancelled:
                "Cancelled",

            refunded:
                "Refunded"

        };

        return (
            labels[status] ||
            status ||
            "Pending"
        );

    }


    /* =========================================================
       LOAD BOOKING
    ========================================================= */

    async function loadBooking() {

        if (!requestedId) {

            throw new Error(
                "Booking ID is missing from the URL."
            );

        }


        const supabase =
            getSupabaseClient();


        const {
            data,
            error
        } =
            await supabase
                .from("bookings")
                .select("*")
                .eq(
                    "booking_id",
                    requestedId
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


        if (!data) {

            throw new Error(
                `Booking ${requestedId} was not found.`
            );

        }


        booking =
            data;


        await Promise.all([
            loadCustomerProfile(),
            loadBookingHistory(),
            loadDrivers()
        ]);

    }


    /* =========================================================
       LOAD CUSTOMER
    ========================================================= */

    async function loadCustomerProfile() {

        customerProfile =
            null;


        if (
            !booking.customer_id
        ) {

            return;

        }


        const supabase =
            getSupabaseClient();


        const {
            data,
            error
        } =
            await supabase
                .from("profiles")
                .select(
                    "id,email,phone,full_name,role,status"
                )
                .eq(
                    "id",
                    booking.customer_id
                )
                .maybeSingle();


        if (error) {

            console.warn(
                "Customer profile could not be loaded:",
                error
            );

            return;

        }


        customerProfile =
            data || null;

    }


    /* =========================================================
       LOAD DRIVER LIST
    ========================================================= */

    async function loadDrivers() {

        driverProfiles =
            [];


        const supabase =
            getSupabaseClient();


        const {
            data: driverRows,
            error: driverError
        } =
            await supabase
                .from("drivers")
                .select(
                    "id,profile_id,driver_id,name,phone,email,status"
                )
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );


        if (driverError) {

            console.error(
                "Drivers could not be loaded:",
                driverError
            );

            throw new Error(
                driverError.message ||
                "Unable to load drivers."
            );

        }

        const profileIds =
            [...new Set(
                (driverRows || [])
                    .map(driver => driver.profile_id)
                    .filter(Boolean)
            )];

        let profiles = [];

        if (profileIds.length) {
            const {
                data: profileRows,
                error: profileError
            } = await supabase
                .from("profiles")
                .select("id,email,phone,full_name")
                .in("id", profileIds);

            if (profileError) {
                console.error(
                    "Driver profile details could not be loaded:",
                    profileError
                );
                throw new Error(
                    profileError.message ||
                    "Unable to load driver profile details."
                );
            }

            profiles = profileRows || [];
        }

        const profilesById =
            new Map(
                profiles.map(profile => [
                    String(profile.id),
                    profile
                ])
            );

        driverProfiles =
            (driverRows || []).map(driver => {
                const profile =
                    profilesById.get(
                        String(driver.profile_id || "")
                    );

                return {
                    ...driver,
                    full_name:
                        profile?.full_name ||
                        driver.name ||
                        "",
                    phone:
                        driver.phone ||
                        profile?.phone ||
                        "",
                    email:
                        driver.email ||
                        profile?.email ||
                        ""
                };
            });

    }


    /* =========================================================
       LOAD BOOKING HISTORY
    ========================================================= */

    async function loadBookingHistory() {

        bookingHistory =
            [];


        if (!booking.id) {

            return;

        }


        const supabase =
            getSupabaseClient();


        const {
            data,
            error
        } =
            await supabase
                .from(
                    "booking_status_history"
                )
                .select(
                    "id,status,note,changed_at,changed_by"
                )
                .eq(
                    "booking_id",
                    booking.id
                )
                .order(
                    "changed_at",
                    {
                        ascending: true
                    }
                );


        if (error) {

            console.warn(
                "Booking history could not be loaded:",
                error
            );

            return;

        }


        bookingHistory =
            Array.isArray(data)
                ? data
                : [];

    }


    /* =========================================================
       GET DRIVER
    ========================================================= */

    function getCurrentDriver() {

        if (
            !booking.driver_id
        ) {

            return null;

        }


        return (
            driverProfiles.find(
                driver =>
                    String(driver.id) ===
                    String(
                        booking.driver_id
                    )
            ) ||
            null
        );

    }


    /* =========================================================
       RENDER MAIN PAGE
    ========================================================= */

    function render() {

        renderHeader();

        renderCustomer();

        renderRoute();

        renderParcel();

        renderPrice();

        renderStatus();

        renderPayment();

        renderDriver();

        renderVehicle();

        renderDelivery();

        renderTimeline();

        renderPOD();

        renderStateNote();

        updateEditBookingLink();

    }


    /* =========================================================
       HEADER
    ========================================================= */

    function renderHeader() {

        setText(
            "#bookingId",
            booking.booking_id
        );

        setText(
            "#mobileTopId",
            `Booking ${booking.booking_id}`
        );


        setText(
            "#bookingDate",
            formatDate(
                booking.booking_date ||
                booking.created_at?.slice(0, 10)
            )
        );


        setText(
            "#bookingTime",
            formatTime(
                booking.booking_time
            )
        );


        const badge =
            $("#statusBadge");


        if (!badge) {

            return;

        }


        badge.textContent =
            getStatusLabel(
                booking.status
            );


        badge.className =
            "status-badge";


        if (
            booking.status ===
            "delivered"
        ) {

            badge.style.background =
                "#eaf8ef";

            badge.style.color =
                "#15803d";

        }

        else if (
            booking.status ===
                "in_transit" ||
            booking.status ===
                "out_for_delivery"
        ) {

            badge.style.background =
                "#eaf2ff";

            badge.style.color =
                "#1d4ed8";

        }

        else if (
            booking.status ===
            "cancelled"
        ) {

            badge.style.background =
                "#fff1f2";

            badge.style.color =
                "#be123c";

        }

        else {

            badge.style.background =
                "";

            badge.style.color =
                "";

        }

    }


    /* =========================================================
       CUSTOMER
    ========================================================= */

    function renderCustomer() {

        const customerName =
            booking.pickup_name ||
            customerProfile?.full_name ||
            "—";


        const customerPhone =
            booking.pickup_phone ||
            customerProfile?.phone ||
            "—";


        const customerAddress =
            booking.pickup_address ||
            "—";


        setText(
            "#senderName",
            customerName
        );


        setText(
            "#senderPhone",
            customerPhone
        );


        setText(
            "#senderAddress",
            customerAddress
        );


        const senderPhone =
            $("#senderPhone");


        if (senderPhone) {

            senderPhone.href =
                customerPhone !== "—"
                    ? `tel:${String(
                        customerPhone
                    ).replace(
                        /\s+/g,
                        ""
                    )}`
                    : "#";

        }


        setText(
            "#receiverName",
            booking.receiver_name
        );


        setText(
            "#receiverPhone",
            booking.receiver_phone
        );


        setText(
            "#receiverAddress",
            booking.delivery_address
        );


        const receiverPhone =
            $("#receiverPhone");


        if (receiverPhone) {

            receiverPhone.href =
                booking.receiver_phone
                    ? `tel:${String(
                        booking.receiver_phone
                    ).replace(
                        /\s+/g,
                        ""
                    )}`
                    : "#";

        }

    }


    /* =========================================================
       ROUTE
    ========================================================= */

    function renderRoute() {

        const from =
            booking.pickup_city ||
            "—";


        const to =
            booking.delivery_city ||
            "—";


        setText(
            "#fromCity",
            from
        );

        setText(
            "#toCity",
            to
        );

        setText(
            "#mobileFrom",
            from
        );

        setText(
            "#mobileTo",
            to
        );


        setText(
            "#pickupAddress",
            booking.pickup_address
        );


        setText(
            "#deliveryAddress",
            booking.delivery_address
        );

    }


    /* =========================================================
       PARCEL
    ========================================================= */

    function renderParcel() {

        setText(
            "#parcelType",
            booking.parcel_type
        );


        setText(
            "#pieces",
            booking.pieces
        );


        const weight =
            booking.parcel_weight !==
            null &&
            booking.parcel_weight !==
            undefined
                ? `${booking.parcel_weight} kg`
                : "—";


        setText(
            "#weight",
            weight
        );


        let dimensions =
            booking.dimensions_text;


        if (
            !dimensions &&
            (
                booking.parcel_length !==
                    null ||
                booking.parcel_width !==
                    null ||
                booking.parcel_height !==
                    null
            )
        ) {

            dimensions =
                [
                    booking.parcel_length,
                    booking.parcel_width,
                    booking.parcel_height
                ]
                    .filter(
                        value =>
                            value !==
                            null &&
                            value !==
                            undefined
                    )
                    .join(
                        " × "
                    );

            if (dimensions) {

                dimensions +=
                    " cm";

            }

        }


        setText(
            "#dimensions",
            dimensions
        );


        setText(
            "#declaredValue",
            money(
                booking.declared_value
            )
        );


        setText(
            "#instructions",
            booking.special_instructions ||
            booking.parcel_description ||
            "—"
        );

    }


    /* =========================================================
       PRICE
    ========================================================= */

    function getTotalPrice() {

        if (
            booking.service_charge !==
                null &&
            booking.service_charge !==
                undefined
        ) {

            return Number(
                booking.service_charge
            );

        }


        const components =
            [
                booking.base_price,
                booking.distance_charge,
                booking.handling_charge,
                booking.gst_amount
            ];


        const hasComponent =
            components.some(
                value =>
                    value !== null &&
                    value !== undefined
            );


        if (!hasComponent) {

            return null;

        }


        return components.reduce(
            (
                total,
                value
            ) =>
                total +
                (
                    Number(value) ||
                    0
                ),
            0
        );

    }


    function renderPrice() {

        const total =
            getTotalPrice();


        const hasPrice =
            total !== null &&
            !Number.isNaN(
                Number(total)
            );


        const priceEmpty =
            $("#priceEmpty");


        const priceAssigned =
            $("#priceAssigned");


        const editPrice =
            $("#editPriceBtn");


        const assignButton =
            $("#assignPriceBtn");


        if (hasPrice) {

            priceEmpty?.classList.add(
                "hidden"
            );


            priceAssigned?.classList.remove(
                "hidden"
            );


            editPrice?.classList.remove(
                "hidden"
            );


            if (assignButton) {

                assignButton.textContent =
                    "Edit Price";

            }


            setText(
                "#basePrice",
                money(
                    booking.base_price
                )
            );


            setText(
                "#distanceCharge",
                money(
                    booking.distance_charge
                )
            );


            setText(
                "#handlingCharge",
                money(
                    booking.handling_charge
                )
            );


            setText(
                "#gst",
                money(
                    booking.gst_amount
                )
            );


            setText(
                "#totalPrice",
                money(total)
            );

        }

        else {

            priceEmpty?.classList.remove(
                "hidden"
            );


            priceAssigned?.classList.add(
                "hidden"
            );


            editPrice?.classList.add(
                "hidden"
            );


            if (assignButton) {

                assignButton.textContent =
                    "Assign Price";

            }

        }

    }


    /* =========================================================
       STATUS
    ========================================================= */

    function renderStatus() {

        renderStateNote();

    }


    /* =========================================================
       PAYMENT
    ========================================================= */

    function renderPayment() {

        const status =
            booking.payment_status ||
            "pending";


        setText(
            "#paymentMethod",
            booking.payment_method ||
            "—"
        );


        setText(
            "#paymentState",
            getPaymentLabel(
                status
            )
        );


        setText(
            "#receivedAmount",
            booking.received_amount ===
                null ||
            booking.received_amount ===
                undefined
                ? "—"
                : money(
                    booking.received_amount
                )
        );


        const pill =
            $("#paymentStatus");


        if (!pill) {

            return;

        }


        pill.textContent =
            getPaymentLabel(
                status
            ).toUpperCase();


        const lower =
            String(
                status
            ).toLowerCase();


        pill.className =
            "pill " +
            (
                lower === "paid"
                    ? "paid"
                    : lower ===
                        "pending"
                        ? "warning"
                        : lower ===
                            "partially_paid"
                            ? "warning"
                            : "unpaid"
            );

    }


    /* =========================================================
       DRIVER
    ========================================================= */

    function initials(
        name = ""
    ) {

        return name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(
                part =>
                    part[0]
            )
            .join("")
            .toUpperCase() ||
            "DR";

    }


    function renderDriver() {

        const driver =
            getCurrentDriver();


        const hasDriver =
            !!driver;


        const empty =
            $("#driverEmpty");


        const assigned =
            $("#driverAssigned");


        const edit =
            $("#editDriverBtn");


        const assign =
            $("#assignDriverBtn");


        empty?.classList.toggle(
            "hidden",
            hasDriver
        );


        assigned?.classList.toggle(
            "hidden",
            !hasDriver
        );


        edit?.classList.toggle(
            "hidden",
            !hasDriver
        );


        if (assign) {

            assign.textContent =
                hasDriver
                    ? "Edit Driver"
                    : "♙ Assign Driver";

        }


        if (!hasDriver) {

            if (assigned) {

                assigned.innerHTML =
                    "";

            }

            return;

        }


        assigned.innerHTML = `

            <div class="driver-row">

                <div class="driver-avatar">

                    ${escapeHtml(
                        initials(
                            driver.full_name
                        )
                    )}

                </div>

                <div class="driver-copy">

                    <strong>
                        ${escapeHtml(
                            driver.full_name ||
                            "Unnamed Driver"
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            driver.phone ||
                            "—"
                        )}
                    </span>

                    <span>
                        ${escapeHtml(
                            driver.driver_id ||
                            ""
                        )}
                    </span>

                    <span>
                        ${escapeHtml(
                            driver.status ||
                            "active"
                        )}
                    </span>

                </div>

                <span class="assigned-pill">
                    Assigned
                </span>

            </div>

        `;

    }


    /* =========================================================
       VEHICLE
       
       No vehicle table / vehicle_id currently exists
       in the live Supabase schema.
    ========================================================= */

    function renderVehicle() {

        const element =
            $("#vehicleInfo");


        if (!element) {

            return;

        }


        element.innerHTML = `

            <strong>
                Vehicle
            </strong>

            <br>

            Vehicle information will appear
            after vehicle data is connected
            to Supabase.

        `;

    }


    /* =========================================================
       DELIVERY
    ========================================================= */

    function renderDelivery() {

        setText(
            "#serviceType",
            booking.service_type ||
            "—"
        );


        setText(
            "#expectedDelivery",
            "—"
        );


        setText(
            "#currentLocation",
            "—"
        );

    }


    /* =========================================================
       TIMELINE
    ========================================================= */

    const stages = [

        [
            "booking",
            "Booking Created",
            "▦"
        ],

        [
            "pickup",
            "Picked Up",
            "▥"
        ],

        [
            "inTransit",
            "In Transit",
            "⌖"
        ],

        [
            "outForDelivery",
            "Out for Delivery",
            "♧"
        ],

        [
            "delivered",
            "Delivered",
            "✓"
        ]

    ];


    function getStageIndex() {

        const status =
            booking.status;


        return {

            pending:
                0,

            confirmed:
                0,

            assigned:
                0,

            pickup_started:
                1,

            picked_up:
                1,

            in_transit:
                2,

            out_for_delivery:
                3,

            delivered:
                4,

            cancelled:
                0

        }[
            status
        ] ?? 0;

    }


    function getHistoryForStage(
        key
    ) {

        const mapping = {

            booking: [
                "pending",
                "confirmed",
                "assigned"
            ],

            pickup: [
                "pickup_started",
                "picked_up"
            ],

            inTransit: [
                "in_transit"
            ],

            outForDelivery: [
                "out_for_delivery"
            ],

            delivered: [
                "delivered"
            ]

        };


        const statuses =
            mapping[key] ||
            [];


        const item =
            [...bookingHistory]
                .reverse()
                .find(
                    history =>
                        statuses.includes(
                            history.status
                        )
                );


        return item
            ? formatDateTime(
                item.changed_at
            )
            : "—";

    }


    function renderTimeline() {

        const timeline =
            $("#timeline");


        if (!timeline) {

            return;

        }


        const current =
            getStageIndex();


        timeline.innerHTML =
            stages
                .map(
                    (
                        stage,
                        index
                    ) => {

                        const [
                            key,
                            label,
                            icon
                        ] = stage;


                        const done =
                            index <
                                current ||
                            (
                                booking.status ===
                                "delivered"
                            );


                        const active =
                            index ===
                                current &&
                            booking.status !==
                                "delivered";


                        const stamp =
                            getHistoryForStage(
                                key
                            );


                        return `

                            <div
                                class="
                                    step
                                    ${done ? "done" : ""}
                                    ${active ? "current" : ""}
                                "
                            >

                                <div class="step-dot">
                                    ${icon}
                                </div>

                                <div class="step-label">
                                    ${label}
                                </div>

                                <div class="step-date">
                                    ${escapeHtml(
                                        stamp
                                    )}
                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =========================================================
       POD
       
       Permanent Supabase Storage integration is not yet
       connected. Existing UI remains available for selection
       and preview.
    ========================================================= */

    function renderPOD() {

        const view =
            $("#podView");


        if (!view) {

            return;

        }


        view.classList.add(
            "hidden"
        );

        view.innerHTML =
            "";

    }


    /* =========================================================
       STATE NOTE
    ========================================================= */

    function renderStateNote() {

        const notes = {

            pending:
                "This is a new booking. Assign the price and driver to continue.",

            confirmed:
                "Booking confirmed. Continue the delivery process.",

            assigned:
                "A driver has been assigned to this booking.",

            pickup_started:
                "Pickup has started.",

            picked_up:
                "The parcel has been picked up.",

            in_transit:
                "Parcel is currently in transit.",

            out_for_delivery:
                "Parcel is out for delivery.",

            delivered:
                "Delivery completed.",

            cancelled:
                "This booking has been cancelled."

        };


        setText(
            "#stateNote",
            notes[
                booking.status
            ] ||
            "Booking status updated."
        );

    }


    /* =========================================================
       EDIT BOOKING
    ========================================================= */

    function updateEditBookingLink() {

        const button =
            $("#editBookingBtn");


        if (!button) {

            return;

        }


        if (!booking?.booking_id) {

            button.disabled =
                true;

            return;

        }


        button.disabled =
            false;

    }


    /* =========================================================
       MODALS
    ========================================================= */

    function openModal(
        id
    ) {

        const element =
            $(`#${id}`);


        if (!element) {

            return;

        }


        element.classList.add(
            "open"
        );


        element.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );

    }


    function closeModal(
        id
    ) {

        const element =
            $(`#${id}`);


        if (!element) {

            return;

        }


        element.classList.remove(
            "open"
        );


        element.setAttribute(
            "aria-hidden",
            "true"
        );


        if (
            !document.querySelector(
                ".modal-backdrop.open"
            )
        ) {

            document.body.classList.remove(
                "modal-open"
            );

        }

    }


    function showInfo(
        title,
        message,
        type = "success"
    ) {

        const mark =
            $(".success-mark");

        if (mark) {
            const isError =
                type === "error";

            mark.classList.toggle(
                "error",
                isError
            );
            mark.classList.toggle(
                "success",
                !isError
            );
            mark.textContent =
                isError
                    ? "×"
                    : "✓";
            mark.setAttribute(
                "aria-label",
                isError
                    ? "Error"
                    : "Success"
            );
        }

        setText(
            "#infoTitle",
            title
        );


        setText(
            "#infoMessage",
            message
        );


        openModal(
            "infoModal"
        );

    }


    /* =========================================================
       PRICE MODAL
    ========================================================= */

    function openPrice() {

        setText(
            "#priceModalTitle",
            getTotalPrice() == null
                ? "Assign Price"
                : "Edit Price"
        );


        const base =
            $("#priceBase");

        const distance =
            $("#priceDistance");

        const handling =
            $("#priceHandling");


        if (base) {

            base.value =
                booking.base_price ??
                "";

        }


        if (distance) {

            distance.value =
                booking.distance_charge ??
                "";

        }


        if (handling) {

            handling.value =
                booking.handling_charge ??
                "";

        }


        calculatePrice();


        openModal(
            "priceModal"
        );


        setTimeout(
            () =>
                $("#priceBase")
                    ?.focus(),
            80
        );

    }


    function calculatePrice() {

        const base =
            Math.max(
                0,
                Number(
                    $("#priceBase")
                        ?.value
                ) || 0
            );


        const distance =
            Math.max(
                0,
                Number(
                    $("#priceDistance")
                        ?.value
                ) || 0
            );


        const handling =
            Math.max(
                0,
                Number(
                    $("#priceHandling")
                        ?.value
                ) || 0
            );


        const taxable =
            base +
            distance +
            handling;


        const gst =
            taxable *
            GST_RATE;


        const total =
            taxable +
            gst;


        setText(
            "#priceGST",
            money(gst)
        );


        setText(
            "#priceTotal",
            money(total)
        );


        return {

            base,
            distance,
            handling,
            gst,
            total

        };

    }


    async function savePrice() {

        const result =
            calculatePrice();


        if (
            result.total <= 0
        ) {

            showInfo(
                "Price Required",
                "Enter at least one price component before saving."
            );

            return;

        }


        const supabase =
            getSupabaseClient();


        const {
            data: authData
        } =
            await supabase.auth.getUser();


        const adminId =
            authData?.user?.id ||
            null;


        const {
            data,
            error
        } =
            await supabase
                .from("bookings")
                .update({

                    base_price:
                        result.base,

                    distance_charge:
                        result.distance,

                    handling_charge:
                        result.handling,

                    gst_amount:
                        result.gst,

                    service_charge:
                        result.total,

                    updated_at:
                        new Date()
                            .toISOString()

                })
                .eq(
                    "id",
                    booking.id
                )
                .select("*")
                .single();


        if (error) {

            console.error(
                "Price update failed:",
                error
            );

            showInfo(
                "Price Update Failed",
                error.message ||
                "Unable to save price."
            );

            return;

        }


        booking =
            data;


        if (
            booking.status ===
            "pending"
        ) {

            const {
                error: statusError
            } =
                await supabase
                    .from("bookings")
                    .update({

                        status:
                            "confirmed",

                        updated_at:
                            new Date()
                                .toISOString()

                    })
                    .eq(
                        "id",
                        booking.id
                    );


            if (statusError) {

                console.warn(
                    "Booking status could not be updated:",
                    statusError
                );

            }

            else {

                booking.status =
                    "confirmed";

            }

        }


        await loadBookingHistory();


        closeModal(
            "priceModal"
        );


        render();


        showInfo(
            "Price Assigned Successfully!",
            `Total Price ${money(
                result.total
            )}`
        );

    }


    /* =========================================================
       DRIVER MODAL
    ========================================================= */

    function renderDriverList() {

        const search =
            (
                $("#driverSearch")
                    ?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const list =
            driverProfiles.filter(
                driver => {

                    const text =
                        `
                        ${driver.full_name || ""}
                        ${driver.phone || ""}
                        ${driver.email || ""}
                        ${driver.id || ""}
                        ${driver.driver_id || ""}
                        `
                            .toLowerCase();


                    return text.includes(
                        search
                    );

                }
            );


        const container =
            $("#driverList");


        if (!container) {

            return;

        }


        container.innerHTML =
            list
                .map(
                    driver => {

                        const selected =
                            String(
                                driver.id
                            ) ===
                            String(
                                selectedDriverId ||
                                ""
                            );


                        const available =
                            driver.status ===
                            "active";


                        const disabled =
                            !available &&
                            !selected;


                        const statusClass =
                            !available
                                ? "offline"
                                : "";


                        return `

                            <label
                                class="
                                    driver-option
                                    ${selected ? "selected" : ""}
                                    ${disabled ? "disabled" : ""}
                                "
                            >

                                <input
                                    type="radio"
                                    name="driver"
                                    value="${escapeHtml(
                                        driver.id
                                    )}"
                                    ${selected ? "checked" : ""}
                                    ${disabled ? "disabled" : ""}
                                >

                                <div class="driver-avatar">
                                    ${escapeHtml(
                                        initials(
                                            driver.full_name
                                        )
                                    )}
                                </div>

                                <div class="driver-copy">

                                    <strong>
                                        ${escapeHtml(
                                            driver.full_name ||
                                            "Unnamed Driver"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            driver.phone ||
                                            "—"
                                        )}
                                    </span>

                                    <span>
                                        ${escapeHtml(
                                            driver.driver_id ||
                                            ""
                                        )}
                                    </span>

                                </div>

                                <span
                                    class="
                                        availability
                                        ${statusClass}
                                    "
                                >
                                    ${escapeHtml(
                                        driver.status ||
                                        "inactive"
                                    )}
                                </span>

                            </label>

                        `;

                    }
                )
                .join("");


        if (!list.length) {

            container.innerHTML = `

                <div
                    style="
                        font-size:10px;
                        color:#64748b;
                        padding:10px;
                    "
                >
                    No drivers found.
                </div>

            `;

        }

    }


    function openDriver() {

        selectedDriverId =
            booking.driver_id ||
            null;


        setText(
            "#driverModalTitle",
            booking.driver_id
                ? "Edit Driver"
                : "Assign Driver"
        );


        const search =
            $("#driverSearch");


        if (search) {

            search.value =
                "";

        }


        renderDriverList();


        openModal(
            "driverModal"
        );

    }


    async function saveDriver() {

        const radio =
            document.querySelector(
                'input[name="driver"]:checked'
            );


        if (!radio) {

            showInfo(
                "Driver Required",
                "Select an active driver.",
                "error"
            );

            return;

        }


        const driver =
            driverProfiles.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        radio.value
                    )
            );


        if (!driver) {

            showInfo(
                "Driver Not Found",
                "The selected driver could not be found.",
                "error"
            );

            return;

        }


        if (
            driver.status !==
            "active"
        ) {

            showInfo(
                "Driver Unavailable",
                "Please select an active driver.",
                "error"
            );

            return;

        }


        const supabase =
            getSupabaseClient();


        const {
            data,
            error
        } =
            await supabase
                .from("bookings")
                .update({

                    driver_id:
                        driver.id,

                    status:
                        (
                            booking.status ===
                                "pending" ||
                            booking.status ===
                                "confirmed"
                        )
                            ? "assigned"
                            : booking.status,

                    updated_at:
                        new Date()
                            .toISOString()

                })
                .eq(
                    "id",
                    booking.id
                )
                .select("*")
                .single();


        if (error) {

            console.error(
                "Driver assignment failed:",
                error
            );

            showInfo(
                "Driver Assignment Failed",
                error.message ||
                "Unable to assign driver.",
                "error"
            );

            return;

        }


        booking =
            data;


        selectedDriverId =
            driver.id;


        await loadBookingHistory();


        closeModal(
            "driverModal"
        );


        render();


        showInfo(
            "Driver Assigned Successfully!",
            `${driver.full_name || "Driver"}\n${driver.driver_id ? `${driver.driver_id}\n` : ""}${driver.phone || ""}`,
            "success"
        );

    }


    /* =========================================================
       PROOF OF DELIVERY
    ========================================================= */

    function chooseFile(
        file
    ) {

        if (!file) {

            return;

        }


        if (
            ![
                "image/jpeg",
                "image/png"
            ].includes(
                file.type
            )
        ) {

            showInfo(
                "Invalid File",
                "Please select a JPG or PNG image."
            );

            return;

        }


        if (
            file.size >
            5 * 1024 * 1024
        ) {

            showInfo(
                "File Too Large",
                "The proof image must be 5MB or smaller."
            );

            return;

        }


        const reader =
            new FileReader();


        reader.onload =
            () => {

                pendingPodData = {

                    name:
                        file.name,

                    dataUrl:
                        reader.result

                };


                const preview =
                    $("#podPreview");


                if (preview) {

                    preview.innerHTML = `

                        <img
                            src="${reader.result}"
                            alt="Proof preview"
                        >

                    `;

                }


                const uploadButton =
                    $("#uploadPodBtn");


                if (uploadButton) {

                    uploadButton.disabled =
                        false;

                }

            };


        reader.readAsDataURL(
            file
        );

    }


    function openPOD() {

        pendingPodData =
            null;


        const preview =
            $("#podPreview");


        if (preview) {

            preview.innerHTML =
                "";

        }


        const uploadButton =
            $("#uploadPodBtn");


        if (uploadButton) {

            uploadButton.disabled =
                true;

        }


        openModal(
            "podModal"
        );

    }


    async function uploadPOD() {

        if (!pendingPodData) {

            return;

        }


        /*
            IMPORTANT:

            Permanent POD storage requires a Supabase
            Storage bucket and a booking POD reference.

            The current database has no POD column.

            Therefore this version does NOT falsely
            claim that the image has been permanently
            stored in Supabase.
        */


        closeModal(
            "podModal"
        );


        showInfo(
            "POD Storage Not Connected",
            "The image was selected successfully, but permanent Proof of Delivery storage requires the Supabase Storage setup."
        );

    }


    /* =========================================================
       DOWNLOAD BILL
    ========================================================= */

    function downloadBill() {

        if (
            !booking?.booking_id
        ) {

            return;

        }


        window.open(
            `download-bill.html?id=${encodeURIComponent(
                booking.booking_id
            )}`,
            "_blank",
            "noopener"
        );

    }


    /* =========================================================
       MORE MENU
    ========================================================= */

    function closeMoreMenu() {

        const menu =
            $("#moreMenu");


        if (!menu) {

            return;

        }


        menu.classList.remove(
            "open"
        );


        $("#moreBtn")
            ?.setAttribute(
                "aria-expanded",
                "false"
            );


        $("#mobileMoreBtn")
            ?.setAttribute(
                "aria-expanded",
                "false"
            );

    }


    function toggleMoreMenu(
        event
    ) {

        event?.stopPropagation();


        const menu =
            $("#moreMenu");


        if (!menu) {

            return;

        }


        const opening =
            !menu.classList.contains(
                "open"
            );


        menu.classList.toggle(
            "open",
            opening
        );


        $("#moreBtn")
            ?.setAttribute(
                "aria-expanded",
                String(opening)
            );


        $("#mobileMoreBtn")
            ?.setAttribute(
                "aria-expanded",
                String(opening)
            );

    }


    function moreAction(
        type
    ) {

        if (
            type ===
            "bill"
        ) {

            closeMoreMenu();

            downloadBill();

            return;

        }


        const data = {

            metadata:
                `Booking: ${
                    booking.booking_id
                }
Status: ${
                    getStatusLabel(
                        booking.status
                    )
                }
Booked: ${
                    formatDate(
                        booking.booking_date
                    )
                }, ${
                    formatTime(
                        booking.booking_time
                    )
                }`,

            notes:
                booking.special_instructions ||
                booking.parcel_description ||
                booking.admin_notes ||
                "No notes.",

            payment:
                `Method: ${
                    booking.payment_method ||
                    "—"
                }
Status: ${
                    getPaymentLabel(
                        booking.payment_status
                    )
                }
Received: ${
                    booking.received_amount ==
                        null
                        ? "—"
                        : money(
                            booking.received_amount
                        )
                }`,

            delivery:
                `Service: ${
                    booking.service_type ||
                    "—"
                }
Expected: —
Current location: —`

        };


        const titles = {

            metadata:
                "Booking Metadata",

            notes:
                "Special Instructions",

            payment:
                "Payment Details",

            delivery:
                "Delivery Details"

        };


        showInfo(
            titles[type],
            data[type]
        );


        closeMoreMenu();

    }


    /* =========================================================
       SIDEBAR
    ========================================================= */

    function toggleSidebar() {

        if (
            window.innerWidth <=
            760
        ) {

            $("#sidebar")
                ?.classList.toggle(
                    "open"
                );


            $("#mobileOverlay")
                ?.classList.toggle(
                    "open"
                );


            return;

        }


        $("#appShell")
            ?.classList.toggle(
                "sidebar-collapsed"
            );

    }


    function closeMobileSidebar() {

        $("#sidebar")
            ?.classList.remove(
                "open"
            );


        $("#mobileOverlay")
            ?.classList.remove(
                "open"
            );

    }


    /* =========================================================
       PARCEL ACCORDION
    ========================================================= */

    function setParcelState(
        expanded
    ) {

        const card =
            $("#parcelCard");

        const content =
            $("#parcelContent");

        const button =
            $("#parcelToggle");


        if (
            !card ||
            !content
        ) {

            return;

        }


        card.classList.toggle(
            "expanded",
            expanded
        );


        content.classList.toggle(
            "collapsed",
            !expanded
        );


        button?.setAttribute(
            "aria-expanded",
            String(expanded)
        );

    }


    function toggleParcel() {

        const content =
            $("#parcelContent");


        if (!content) {

            return;

        }


        const expanded =
            !content.classList.contains(
                "collapsed"
            );


        setParcelState(
            !expanded
        );

    }


    /* =========================================================
       PAGE ERROR DISPLAY
    ========================================================= */

    function showPageError(
        message
    ) {

        console.error(
            message
        );


        setText(
            "#bookingId",
            requestedId ||
            "Booking"
        );


        setText(
            "#stateNote",
            message
        );


        setText(
            "#senderName",
            "Unable to load booking"
        );


        setText(
            "#senderAddress",
            message
        );


        const assignPrice =
            $("#assignPriceBtn");


        const assignDriver =
            $("#assignDriverBtn");


        if (assignPrice) {

            assignPrice.disabled =
                true;

        }


        if (assignDriver) {

            assignDriver.disabled =
                true;

        }

    }


    /* =========================================================
       EVENTS
    ========================================================= */

    $("#backBtn")
        ?.addEventListener(
            "click",
            () => {

                window.location.href =
                    "bookings.html";

            }
        );


    $("#downloadBillBtn")
        ?.addEventListener(
            "click",
            downloadBill
        );


    $("#assignPriceBtn")
        ?.addEventListener(
            "click",
            openPrice
        );


    $("#editPriceBtn")
        ?.addEventListener(
            "click",
            openPrice
        );


    $("#assignDriverBtn")
        ?.addEventListener(
            "click",
            openDriver
        );


    $("#editDriverBtn")
        ?.addEventListener(
            "click",
            openDriver
        );


    $("#podBtn")
        ?.addEventListener(
            "click",
            openPOD
        );


    $("#savePriceBtn")
        ?.addEventListener(
            "click",
            savePrice
        );


    $("#saveDriverBtn")
        ?.addEventListener(
            "click",
            saveDriver
        );


    $("#uploadPodBtn")
        ?.addEventListener(
            "click",
            uploadPOD
        );


    [
        "#priceBase",
        "#priceDistance",
        "#priceHandling"
    ]
        .forEach(
            selector => {

                $(selector)
                    ?.addEventListener(
                        "input",
                        calculatePrice
                    );

            }
        );


    $("#driverSearch")
        ?.addEventListener(
            "input",
            renderDriverList
        );


    $("#dropZone")
        ?.addEventListener(
            "click",
            () =>
                $("#podInput")
                    ?.click()
        );


    $("#dropZone")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                        "Enter" ||
                    event.key ===
                        " "
                ) {

                    event.preventDefault();

                    $("#podInput")
                        ?.click();

                }

            }
        );


    $("#podInput")
        ?.addEventListener(
            "change",
            event =>
                chooseFile(
                    event.target.files[0]
                )
        );


    [
        "dragenter",
        "dragover"
    ]
        .forEach(
            eventName => {

                $("#dropZone")
                    ?.addEventListener(
                        eventName,
                        event => {

                            event.preventDefault();

                            event.stopPropagation();

                            $("#dropZone")
                                .classList.add(
                                    "dragover"
                                );

                        }
                    );

            }
        );


    [
        "dragleave",
        "drop"
    ]
        .forEach(
            eventName => {

                $("#dropZone")
                    ?.addEventListener(
                        eventName,
                        event => {

                            event.preventDefault();

                            event.stopPropagation();

                            $("#dropZone")
                                .classList.remove(
                                    "dragover"
                                );

                        }
                    );

            }
        );


    $("#dropZone")
        ?.addEventListener(
            "drop",
            event => {

                chooseFile(
                    event.dataTransfer
                        .files[0]
                );

            }
        );


    document
        .querySelectorAll(
            "[data-close]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        closeModal(
                            button.dataset.close
                        )
                );

            }
        );


    $("#infoOkBtn")
        ?.addEventListener(
            "click",
            () =>
                closeModal(
                    "infoModal"
                )
        );


    $("#moreBtn")
        ?.addEventListener(
            "click",
            toggleMoreMenu
        );


    $("#mobileMoreBtn")
        ?.addEventListener(
            "click",
            toggleMoreMenu
        );


    document
        .querySelectorAll(
            "[data-more]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        moreAction(
                            button.dataset.more
                        )
                );

            }
        );


    $("#sidebarCollapse")
        ?.addEventListener(
            "click",
            toggleSidebar
        );


    $("#mobileMenuBtn")
        ?.addEventListener(
            "click",
            toggleSidebar
        );


    $("#mobileOverlay")
        ?.addEventListener(
            "click",
            closeMobileSidebar
        );


    $("#parcelToggle")
        ?.addEventListener(
            "click",
            toggleParcel
        );


    $("#editBookingBtn")
        ?.addEventListener(
            "click",
            () => {

                if (
                    !booking?.booking_id
                ) {

                    return;

                }


                window.location.href =
                    `edit-booking.html?id=${encodeURIComponent(
                        booking.booking_id
                    )}`;

            }
        );


    document.addEventListener(
        "click",
        event => {

            if (
                !event.target.closest(
                    "#moreMenu"
                ) &&
                !event.target.closest(
                    "#moreBtn"
                ) &&
                !event.target.closest(
                    "#mobileMoreBtn"
                )
            ) {

                closeMoreMenu();

            }

        }
    );


    document
        .querySelectorAll(
            ".modal-backdrop"
        )
        .forEach(
            backdrop => {

                backdrop.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            backdrop
                        ) {

                            closeModal(
                                backdrop.id
                            );

                        }

                    }
                );

            }
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                document
                    .querySelectorAll(
                        ".modal-backdrop.open"
                    )
                    .forEach(
                        modal =>
                            closeModal(
                                modal.id
                            )
                    );


                closeMoreMenu();

                closeMobileSidebar();

            }

        }
    );


    /* =========================================================
       INITIALIZATION
    ========================================================= */

    async function initialize() {

        try {

            await requireAdminAuth();

            await loadBooking();

            render();


            /*
                Mobile:
                Parcel card collapsed.

                Desktop:
                Parcel card expanded.
            */

            setParcelState(
                window.innerWidth >
                760
            );


            document.title =
                `Booking ${
                    booking.booking_id
                } | ${
                    COMPANY.name
                }`;

        }

        catch (error) {

            console.error(
                "Booking Details initialization failed:",
                error
            );


            showPageError(
                error.message ||
                "Unable to load booking details."
            );

        }

    }


    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth >
                760
            ) {

                setParcelState(
                    true
                );

            }

        }
    );


    initialize();

})();