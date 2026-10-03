/* =========================================================
   SSP ADMIN — CUSTOMER DETAILS
   SUPABASE VERSION
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
   ========================================================= */

const ORDERS_PER_PAGE = 6;

const DEFAULT_CUSTOMER_ID = "";

let supabaseClient = null;

let currentCustomer = null;

let customerOrders = [];

let filteredOrders = [];

let currentOrderPage = 1;

let toastTimer = null;


/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (selector) =>
    document.querySelector(selector);

const $$ = (selector) =>
    document.querySelectorAll(selector);


/* =========================================================
   SUPABASE
   ========================================================= */

function getSupabaseClient() {

    if (window.supabaseClient) {
        return window.supabaseClient;
    }

    console.error(
        "SSP Supabase client was not found."
    );

    return null;
}


/* =========================================================
   URL CUSTOMER ID
   ========================================================= */

function getCustomerIdFromUrl() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return (
        params.get("id") ||
        params.get("customer_id") ||
        DEFAULT_CUSTOMER_ID
    ).trim();
}


/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function clean(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
}


function firstValue(...values) {

    for (const value of values) {

        if (
            value !== null &&
            value !== undefined &&
            clean(value) !== ""
        ) {
            return value;
        }
    }

    return "";
}


function escapeHtml(value) {

    return clean(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(value) {

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
        return clean(value) || "—";
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
        return clean(value);
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

function formatCurrency(value) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {
        return "₹0";
    }

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(number);
}


/* =========================================================
   STATUS
   ========================================================= */

function normalizeCustomerStatus(value) {

    const status =
        clean(value).toLowerCase();

    if (
        status === "inactive" ||
        status === "disabled"
    ) {
        return "Inactive";
    }

    if (
        status === "suspended"
    ) {
        return "Suspended";
    }

    return "Active";
}


function bookingStatusLabel(status) {

    const value =
        clean(status).toLowerCase();

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
        labels[value] ||
        status ||
        "Pending"
    );
}


function getStatusClass(status) {

    return clean(status)
        .toLowerCase()
        .replace(/_/g, "-")
        .replace(/\s+/g, "-");
}


function getPaymentClass(status) {

    const value =
        clean(status).toLowerCase();

    if (
        value === "paid"
    ) {
        return "paid";
    }

    if (
        value === "partially_paid"
    ) {
        return "pending";
    }

    if (
        value === "failed" ||
        value === "cancelled" ||
        value === "refunded"
    ) {
        return "failed";
    }

    return "pending";
}


function paymentStatusLabel(status) {

    const value =
        clean(status).toLowerCase();

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
        labels[value] ||
        status ||
        "Pending"
    );
}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadCustomerProfile(
    customerId
) {

    const client =
        getSupabaseClient();

    if (!client) {
        throw new Error(
            "Supabase client is unavailable."
        );
    }


    if (!customerId) {

        throw new Error(
            "Customer ID is missing from the URL."
        );
    }


    const { data, error } =
        await client
            .from("profiles")
            .select("*")
            .eq("id", customerId)
            .eq("role", "customer")
            .maybeSingle();


    if (error) {

        console.error(
            "Customer profile query failed:",
            error
        );

        throw error;
    }


    if (!data) {

        throw new Error(
            "Customer profile was not found."
        );
    }


    return data;
}


/* =========================================================
   LOAD CUSTOMER BOOKINGS
   ========================================================= */

async function loadCustomerBookings(
    customerId
) {

    const client =
        getSupabaseClient();

    if (!client) {
        throw new Error(
            "Supabase client is unavailable."
        );
    }


    const { data, error } =
        await client
            .from("bookings")
            .select("*")
            .eq("customer_id", customerId)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Customer bookings query failed:",
            error
        );

        throw error;
    }


    return data || [];
}


/* =========================================================
   FIND LATEST BOOKING
   ========================================================= */

function getLatestBooking() {

    if (
        !customerOrders.length
    ) {
        return null;
    }

    return customerOrders[0]?.original ||
        null;
}


/* =========================================================
   NORMALIZE CUSTOMER
   ========================================================= */

function normalizeCustomer(
    profile
) {

    return {

        id:
            profile.id,

        name:
            profile.full_name ||
            "Customer",

        phone:
            profile.phone || "",

        alternatePhone:
            profile.alternate_phone ||
            "",

        email:
            profile.email || "",

        address:
            profile.address ||
            "",

        city:
            profile.city ||
            "",

        state:
            profile.state ||
            "",

        pinCode:
            profile.pin_code ||
            "",

        status:
            normalizeCustomerStatus(
                profile.status
            ),

        joinedDate:
            profile.created_at,

        photo:
            "",

        notes:
            profile.notes ||
            "",

        role:
            profile.role,

        raw:
            profile
    };
}


/* =========================================================
   NORMALIZE BOOKING
   ========================================================= */

function normalizeBooking(
    booking
) {

    const amount =
        Number(
            booking.service_charge
        ) || 0;


    const bookingDate =
        firstValue(
            booking.booking_date,
            booking.created_at
        );


    const from =
        firstValue(
            booking.pickup_city,
            booking.pickup_address
        );


    const to =
        firstValue(
            booking.delivery_city,
            booking.delivery_address
        );


    return {

        original:
            booking,

        id:
            booking.booking_id ||
            booking.id ||
            "—",

        rawDate:
            booking.booking_date ||
            booking.created_at,

        date:
            bookingDate,

        from,

        to,

        parcelName:
            booking.parcel_name ||
            "Parcel",

        parcelType:
            booking.parcel_type ||
            "Parcel",

        amount,

        paymentStatus:
            booking.payment_status ||
            "pending",

        status:
            booking.status ||
            "pending"
    };
}


/* =========================================================
   DERIVE PROFILE ADDRESS FROM BOOKINGS
   ========================================================= */

function enrichCustomerFromBookings() {

    if (!currentCustomer) {
        return;
    }


    const latest =
        getLatestBooking();


    if (!latest) {
        return;
    }


    if (
        !currentCustomer.address
    ) {
        currentCustomer.address =
            latest.pickup_address ||
            "";
    }


    if (
        !currentCustomer.city
    ) {
        currentCustomer.city =
            latest.pickup_city ||
            "";
    }


    if (
        !currentCustomer.pinCode
    ) {
        currentCustomer.pinCode =
            latest.pickup_pincode ||
            "";
    }


    if (
        !currentCustomer.state
    ) {
        currentCustomer.state =
            latest.delivery_state ||
            "";
    }
}


/* =========================================================
   SUMMARY
   ========================================================= */

function calculateSummary(
    orders
) {

    let completed = 0;

    let active = 0;

    let cancelled = 0;

    let totalSpent = 0;


    orders.forEach(
        order => {

            const status =
                clean(
                    order.status
                ).toLowerCase();


            if (
                status === "delivered"
            ) {
                completed++;
            }


            if (
                [
                    "pending",
                    "confirmed",
                    "assigned",
                    "pickup_started",
                    "picked_up",
                    "in_transit",
                    "out_for_delivery"
                ].includes(status)
            ) {
                active++;
            }


            if (
                status === "cancelled"
            ) {
                cancelled++;
            }


            /*
             * Total customer spending is calculated
             * from service_charge.
             *
             * Only successful/partial payments are
             * counted when payment status is known.
             */

            const payment =
                clean(
                    order.paymentStatus
                ).toLowerCase();


            if (
                payment === "paid" ||
                payment === "partially_paid"
            ) {

                totalSpent +=
                    Number(
                        order.amount
                    ) || 0;
            }
        }
    );


    return {

        totalOrders:
            orders.length,

        completed,

        active,

        cancelled,

        totalSpent
    };
}


/* =========================================================
   RENDER PROFILE
   ========================================================= */

function renderCustomerProfile() {

    if (!currentCustomer) {
        return;
    }


    enrichCustomerFromBookings();


    const customer =
        currentCustomer;


    const name =
        customer.name ||
        "Customer";


    $("#breadcrumbCustomerName")
        .textContent =
            name;


    $("#customerName")
        .textContent =
            name;


    $("#customerId")
        .textContent =
            customer.id ||
            "—";


    $("#customerPhoto")
        .src =
            customer.photo ||
            "../images/logo.png";


    $("#customerPhoto")
        .alt =
            `${name} profile photo`;


    const status =
        normalizeCustomerStatus(
            customer.status
        );


    const statusElement =
        $("#customerStatus");


    if (statusElement) {

        statusElement.textContent =
            status;

        statusElement.className =
            "status-badge";

        if (
            status.toLowerCase() ===
            "inactive"
        ) {
            statusElement.classList.add(
                "inactive"
            );
        }

        if (
            status.toLowerCase() ===
            "suspended"
        ) {
            statusElement.classList.add(
                "inactive"
            );
        }
    }


    const statusDot =
        $("#profileStatusDot");


    if (statusDot) {

        statusDot.classList.toggle(
            "inactive",
            status.toLowerCase() !==
            "active"
        );
    }


    const phone =
        customer.phone || "";


    const email =
        customer.email || "";


    $("#customerPhone")
        .textContent =
            phone ||
            "No phone number";


    $("#customerEmail")
        .textContent =
            email ||
            "No email address";


    $("#customerPhoneLink")
        .href =
            phone
                ? `tel:${phone.replace(
                    /\s/g,
                    ""
                )}`
                : "#";


    $("#customerEmailLink")
        .href =
            email
                ? `mailto:${email}`
                : "#";


    $("#detailFullName")
        .textContent =
            customer.name ||
            "—";


    $("#detailCustomerId")
        .textContent =
            customer.id ||
            "—";


    $("#detailPhone")
        .textContent =
            customer.phone ||
            "—";


    $("#detailAlternatePhone")
        .textContent =
            customer.alternatePhone ||
            "—";


    $("#detailEmail")
        .textContent =
            customer.email ||
            "—";


    $("#detailJoinedDate")
        .textContent =
            formatDate(
                customer.joinedDate
            );


    $("#detailAddress")
        .textContent =
            customer.address ||
            "—";


    $("#detailCity")
        .textContent =
            customer.city ||
            "—";


    $("#detailState")
        .textContent =
            customer.state ||
            "—";


    $("#detailPinCode")
        .textContent =
            customer.pinCode ||
            "—";


    $("#customerNotes")
        .textContent =
            customer.notes ||
            "No notes available for this customer.";
}


/* =========================================================
   RENDER SUMMARY
   ========================================================= */

function renderSummary() {

    const summary =
        calculateSummary(
            customerOrders
        );


    $("#totalOrders")
        .textContent =
            summary.totalOrders;


    $("#completedOrders")
        .textContent =
            summary.completed;


    $("#activeOrders")
        .textContent =
            summary.active;


    $("#cancelledOrders")
        .textContent =
            summary.cancelled;


    $("#totalSpent")
        .textContent =
            formatCurrency(
                summary.totalSpent
            );
}


/* =========================================================
   RENDER DESKTOP ORDERS
   ========================================================= */

function renderOrderTable() {

    const tbody =
        $("#orderHistoryTableBody");


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    const start =
        (currentOrderPage - 1) *
        ORDERS_PER_PAGE;


    const orders =
        filteredOrders.slice(
            start,
            start + ORDERS_PER_PAGE
        );


    if (!orders.length) {

        $("#emptyOrders")
            .hidden = false;

        return;
    }


    $("#emptyOrders")
        .hidden = true;


    orders.forEach(
        order => {

            const row =
                document.createElement(
                    "tr"
                );


            const statusClass =
                getStatusClass(
                    order.status
                );


            const paymentClass =
                getPaymentClass(
                    order.paymentStatus
                );


            row.innerHTML = `

                <td>
                    <span class="booking-id">
                        ${escapeHtml(
                            order.id
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        formatDate(
                            order.date
                        )
                    )}
                </td>

                <td>
                    <div class="route-cell">

                        <span class="route-from">
                            ${escapeHtml(
                                order.from || "—"
                            )}
                        </span>

                        <span class="route-arrow">
                            →
                        </span>

                        <span class="route-to">
                            ${escapeHtml(
                                order.to || "—"
                            )}
                        </span>

                    </div>
                </td>

                <td>

                    <span class="parcel-name">
                        ${escapeHtml(
                            order.parcelName
                        )}
                    </span>

                    <span class="parcel-type">
                        ${escapeHtml(
                            order.parcelType
                        )}
                    </span>

                </td>

                <td class="amount-cell">
                    ${escapeHtml(
                        formatCurrency(
                            order.amount
                        )
                    )}
                </td>

                <td>

                    <span class="
                        payment-badge
                        ${paymentClass}
                    ">
                        ${escapeHtml(
                            paymentStatusLabel(
                                order.paymentStatus
                            )
                        )}
                    </span>

                </td>

                <td>

                    <span class="
                        status-badge
                        ${statusClass}
                    ">
                        ${escapeHtml(
                            bookingStatusLabel(
                                order.status
                            )
                        )}
                    </span>

                </td>

                <td>

                    <button
                        type="button"
                        class="view-booking-btn"
                        data-booking-id="${escapeHtml(
                            order.id
                        )}"
                        title="View booking"
                        aria-label="View booking"
                    >
                        <i class="
                            fa-solid
                            fa-eye
                        "></i>
                    </button>

                </td>
            `;


            tbody.appendChild(
                row
            );
        }
    );


    bindBookingButtons();
}


/* =========================================================
   RENDER MOBILE ORDERS
   ========================================================= */

function renderMobileOrders() {

    const container =
        $("#mobileOrderList");


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const start =
        (currentOrderPage - 1) *
        ORDERS_PER_PAGE;


    const orders =
        filteredOrders.slice(
            start,
            start + ORDERS_PER_PAGE
        );


    if (!orders.length) {

        container.innerHTML = `

            <div class="empty-orders">

                <div class="empty-icon">
                    <i class="
                        fa-solid
                        fa-box-open
                    "></i>
                </div>

                <h3>
                    No Order History
                </h3>

                <p>
                    No bookings were found
                    for this customer.
                </p>

            </div>
        `;

        return;
    }


    orders.forEach(
        order => {

            const statusClass =
                getStatusClass(
                    order.status
                );


            const paymentClass =
                getPaymentClass(
                    order.paymentStatus
                );


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "mobile-order-card";


            card.innerHTML = `

                <div class="mobile-order-top">

                    <div>

                        <div class="mobile-booking-id">
                            ${escapeHtml(
                                order.id
                            )}
                        </div>

                        <div class="mobile-order-date">
                            ${escapeHtml(
                                formatDate(
                                    order.date
                                )
                            )}
                        </div>

                    </div>

                    <span class="
                        status-badge
                        ${statusClass}
                    ">
                        ${escapeHtml(
                            bookingStatusLabel(
                                order.status
                            )
                        )}
                    </span>

                </div>


                <div class="mobile-order-route">

                    <div class="mobile-route-point">

                        <span class="
                            mobile-route-label
                        ">
                            From
                        </span>

                        <span class="
                            mobile-route-value
                        ">
                            ${escapeHtml(
                                order.from || "—"
                            )}
                        </span>

                    </div>


                    <div class="
                        mobile-route-arrow
                    ">
                        <i class="
                            fa-solid
                            fa-arrow-right
                        "></i>
                    </div>


                    <div class="mobile-route-point">

                        <span class="
                            mobile-route-label
                        ">
                            To
                        </span>

                        <span class="
                            mobile-route-value
                        ">
                            ${escapeHtml(
                                order.to || "—"
                            )}
                        </span>

                    </div>

                </div>


                <div class="mobile-order-meta">

                    <div class="
                        mobile-meta-item
                    ">

                        <span class="
                            mobile-meta-label
                        ">
                            Parcel
                        </span>

                        <span class="
                            mobile-meta-value
                        ">
                            ${escapeHtml(
                                order.parcelName
                            )}
                        </span>

                    </div>


                    <div class="
                        mobile-meta-item
                    ">

                        <span class="
                            mobile-meta-label
                        ">
                            Amount
                        </span>

                        <span class="
                            mobile-meta-value
                        ">
                            ${escapeHtml(
                                formatCurrency(
                                    order.amount
                                )
                            )}
                        </span>

                    </div>


                    <div class="
                        mobile-meta-item
                    ">

                        <span class="
                            mobile-meta-label
                        ">
                            Payment
                        </span>

                        <span>

                            <span class="
                                payment-badge
                                ${paymentClass}
                            ">
                                ${escapeHtml(
                                    paymentStatusLabel(
                                        order.paymentStatus
                                    )
                                )}
                            </span>

                        </span>

                    </div>


                    <div class="
                        mobile-meta-item
                    ">

                        <span class="
                            mobile-meta-label
                        ">
                            Type
                        </span>

                        <span class="
                            mobile-meta-value
                        ">
                            ${escapeHtml(
                                order.parcelType
                            )}
                        </span>

                    </div>

                </div>


                <div class="
                    mobile-order-bottom
                ">

                    <strong>
                        ${escapeHtml(
                            formatCurrency(
                                order.amount
                            )
                        )}
                    </strong>


                    <div class="
                        mobile-order-actions
                    ">

                        <button
                            type="button"
                            class="mobile-view-booking"
                            data-booking-id="${escapeHtml(
                                order.id
                            )}"
                            title="View booking"
                            aria-label="View booking"
                        >
                            <i class="
                                fa-solid
                                fa-eye
                            "></i>
                        </button>

                    </div>

                </div>
            `;


            container.appendChild(
                card
            );
        }
    );


    bindBookingButtons();
}


/* =========================================================
   PAGINATION
   ========================================================= */

function renderPagination() {

    const pagination =
        $("#orderPagination");


    if (!pagination) {
        return;
    }


    const total =
        filteredOrders.length;


    if (!total) {

        pagination.hidden = true;

        return;
    }


    pagination.hidden = false;


    const totalPages =
        Math.ceil(
            total / ORDERS_PER_PAGE
        );


    if (
        currentOrderPage >
        totalPages
    ) {
        currentOrderPage =
            totalPages;
    }


    const start =
        (
            (currentOrderPage - 1) *
            ORDERS_PER_PAGE
        ) + 1;


    const end =
        Math.min(
            currentOrderPage *
                ORDERS_PER_PAGE,
            total
        );


    $("#paginationInfo")
        .textContent =
            `Showing ${start}–${end} of ${total} orders`;


    $("#currentOrderPage")
        .textContent =
            currentOrderPage;


    $("#previousOrderPage")
        .disabled =
            currentOrderPage <= 1;


    $("#nextOrderPage")
        .disabled =
            currentOrderPage >=
            totalPages;
}


function renderOrders() {

    renderOrderTable();

    renderMobileOrders();

    renderPagination();
}


/* =========================================================
   FILTER
   ========================================================= */

function applyOrderFilter() {

    const filter =
        clean(
            $("#orderStatusFilter")?.value
        ).toLowerCase();


    if (
        !filter ||
        filter === "all"
    ) {

        filteredOrders =
            [...customerOrders];

    } else {

        filteredOrders =
            customerOrders.filter(
                order =>
                    clean(
                        order.status
                    ).toLowerCase() ===
                    filter
            );
    }


    currentOrderPage = 1;

    renderOrders();
}


/* =========================================================
   BOOKING DETAILS
   ========================================================= */

function bindBookingButtons() {

    $$(
        "[data-booking-id]"
    ).forEach(
        button => {

            button.onclick =
                () => {

                    const bookingId =
                        button.dataset.bookingId;


                    if (!bookingId) {
                        return;
                    }


                    window.location.href =
                        `bookings-details.html?id=${
                            encodeURIComponent(
                                bookingId
                            )
                        }`;
                };
        }
    );
}


/* =========================================================
   RECENT ACTIVITY
   ========================================================= */

function buildActivities() {

    return customerOrders
        .slice(0, 6)
        .map(
            order => {

                const status =
                    clean(
                        order.status
                    ).toLowerCase();


                let icon =
                    "fa-box";

                let type =
                    "";


                if (
                    status ===
                    "delivered"
                ) {

                    icon =
                        "fa-circle-check";

                    type =
                        "success";

                } else if (
                    status ===
                    "cancelled"
                ) {

                    icon =
                        "fa-ban";

                    type =
                        "danger";

                } else if (
                    status ===
                    "pending"
                ) {

                    icon =
                        "fa-clock";

                    type =
                        "warning";
                }


                return {

                    icon,

                    type,

                    title:
                        `Booking ${order.id}`,

                    description:
                        `${
                            order.from || "—"
                        } → ${
                            order.to || "—"
                        } · ${
                            bookingStatusLabel(
                                order.status
                            )
                        }`,

                    time:
                        formatDateTime(
                            order.date
                        )
                };
            }
        );
}


function renderActivity() {

    const container =
        $("#activityList");


    const empty =
        $("#emptyActivity");


    if (!container) {
        return;
    }


    const activities =
        buildActivities();


    container.innerHTML = "";


    if (!activities.length) {

        if (empty) {
            empty.hidden = false;
        }

        return;
    }


    if (empty) {
        empty.hidden = true;
    }


    activities.forEach(
        activity => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "activity-item";


            item.innerHTML = `

                <div class="
                    activity-icon
                    ${activity.type}
                ">

                    <i class="
                        fa-solid
                        ${activity.icon}
                    "></i>

                </div>


                <div class="
                    activity-content
                ">

                    <div class="
                        activity-title
                    ">
                        ${escapeHtml(
                            activity.title
                        )}
                    </div>

                    <div class="
                        activity-description
                    ">
                        ${escapeHtml(
                            activity.description
                        )}
                    </div>

                    <div class="
                        activity-time
                    ">
                        ${escapeHtml(
                            activity.time
                        )}
                    </div>

                </div>
            `;


            container.appendChild(
                item
            );
        }
    );
}


/* =========================================================
   EDIT FORM
   ========================================================= */

function populateEditForm() {

    if (!currentCustomer) {
        return;
    }


    $("#editName").value =
        currentCustomer.name || "";


    $("#editPhone").value =
        currentCustomer.phone || "";


    $("#editAlternatePhone").value =
        currentCustomer.alternatePhone || "";


    $("#editEmail").value =
        currentCustomer.email || "";


    $("#editAddress").value =
        currentCustomer.address || "";


    $("#editCity").value =
        currentCustomer.city || "";


    $("#editState").value =
        currentCustomer.state || "";


    $("#editPinCode").value =
        currentCustomer.pinCode || "";


    $("#editStatus").value =
        normalizeCustomerStatus(
            currentCustomer.status
        );


    $("#editNotes").value =
        currentCustomer.notes || "";
}


/* =========================================================
   OPEN EDIT
   ========================================================= */

function openEditModal() {

    populateEditForm();


    const modal =
        $("#editCustomerModal");


    if (!modal) {
        return;
    }


    modal.hidden = false;

    document.body.style.overflow =
        "hidden";
}


/* =========================================================
   CLOSE EDIT
   ========================================================= */

function closeEditModal() {

    const modal =
        $("#editCustomerModal");


    if (!modal) {
        return;
    }


    modal.hidden = true;

    document.body.style.overflow =
        "";
}


/* =========================================================
   SAVE CUSTOMER
   ========================================================= */

async function saveCustomerChanges(
    event
) {

    event.preventDefault();


    if (!currentCustomer) {
        return;
    }


    const client =
        getSupabaseClient();


    if (!client) {

        showToast(
            "Save Failed",
            "Supabase client is not available.",
            "error"
        );

        return;
    }


    const name =
        clean(
            $("#editName").value
        );


    const phone =
        clean(
            $("#editPhone").value
        );


    const email =
        clean(
            $("#editEmail").value
        );


    const status =
        clean(
            $("#editStatus").value
        ).toLowerCase();


    if (!name) {

        showToast(
            "Validation Error",
            "Customer name is required.",
            "error"
        );

        $("#editName").focus();

        return;
    }


    if (
        !phone
    ) {

        showToast(
            "Validation Error",
            "Customer phone number is required.",
            "error"
        );

        $("#editPhone").focus();

        return;
    }


    if (
        email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email)
    ) {

        showToast(
            "Validation Error",
            "Enter a valid email address.",
            "error"
        );

        $("#editEmail").focus();

        return;
    }


    const corePayload = {

        full_name:
            name,

        phone:
            phone,

        email:
            email,

        status:
            status === "inactive"
                ? "inactive"
                : status === "suspended"
                    ? "suspended"
                    : "active",

        updated_at:
            new Date().toISOString()
    };


    /*
     * These columns are optional additions to profiles.
     * If the SQL migration has been run, all old edit
     * fields remain fully functional.
     */

    const extendedPayload = {

        ...corePayload,

        alternate_phone:
            clean(
                $("#editAlternatePhone").value
            ),

        address:
            clean(
                $("#editAddress").value
            ),

        city:
            clean(
                $("#editCity").value
            ),

        state:
            clean(
                $("#editState").value
            ),

        pin_code:
            clean(
                $("#editPinCode").value
            ),

        notes:
            clean(
                $("#editNotes").value
            )
    };


    let result =
        await client
            .from("profiles")
            .update(
                extendedPayload
            )
            .eq(
                "id",
                currentCustomer.id
            )
            .eq(
                "role",
                "customer"
            );


    /*
     * If optional profile columns have not yet
     * been added, retry with the existing schema.
     */

    if (
        result.error &&
        /column|schema cache|does not exist/i
            .test(
                result.error.message || ""
            )
    ) {

        console.warn(
            "Optional profile fields are not available. Retrying core profile update."
        );


        result =
            await client
                .from("profiles")
                .update(
                    corePayload
                )
                .eq(
                    "id",
                    currentCustomer.id
                )
                .eq(
                    "role",
                    "customer"
                );
    }


    if (result.error) {

        console.error(
            "Customer update failed:",
            result.error
        );


        showToast(
            "Update Failed",
            result.error.message ||
            "Customer information could not be updated.",
            "error"
        );

        return;
    }


    /*
     * Reload from Supabase so the screen always
     * displays database values.
     */

    try {

        currentCustomer =
            normalizeCustomer(
                await loadCustomerProfile(
                    currentCustomer.id
                )
            );


        customerOrders =
            (
                await loadCustomerBookings(
                    currentCustomer.id
                )
            ).map(
                normalizeBooking
            );


        filteredOrders =
            [...customerOrders];


        currentOrderPage = 1;


        renderCustomerProfile();

        renderSummary();

        renderOrders();

        renderActivity();

        closeEditModal();


        showToast(
            "Customer Updated",
            "Customer information was saved to Supabase.",
            "success"
        );

    } catch (error) {

        console.error(
            "Reload after update failed:",
            error
        );


        showToast(
            "Reload Failed",
            "Customer was updated, but the page could not reload the latest data.",
            "error"
        );
    }
}


/* =========================================================
   CALL CUSTOMER
   ========================================================= */

function callCustomer() {

    if (
        !currentCustomer ||
        !currentCustomer.phone
    ) {

        showToast(
            "Phone Unavailable",
            "No phone number is available.",
            "error"
        );

        return;
    }


    window.location.href =
        `tel:${currentCustomer.phone.replace(
            /\s/g,
            ""
        )}`;
}


/* =========================================================
   EMAIL CUSTOMER
   ========================================================= */

function emailCustomer() {

    if (
        !currentCustomer ||
        !currentCustomer.email
    ) {

        showToast(
            "Email Unavailable",
            "No email address is available.",
            "error"
        );

        return;
    }


    window.location.href =
        `mailto:${currentCustomer.email}`;
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    title,
    message,
    type = "success"
) {

    const toast =
        $("#toast");


    if (!toast) {
        return;
    }


    clearTimeout(
        toastTimer
    );


    $("#toastTitle")
        .textContent =
            title;


    $("#toastMessage")
        .textContent =
            message;


    const icon =
        toast.querySelector(
            ".toast-icon i"
        );


    const iconContainer =
        toast.querySelector(
            ".toast-icon"
        );


    if (
        type === "error"
    ) {

        icon.className =
            "fa-solid fa-circle-exclamation";

        iconContainer.style.background =
            "var(--danger-light)";

        iconContainer.style.color =
            "var(--danger)";

    } else {

        icon.className =
            "fa-solid fa-check";

        iconContainer.style.background =
            "var(--success-light)";

        iconContainer.style.color =
            "var(--success)";
    }


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
            3500
        );
}


function closeToast() {

    const toast =
        $("#toast");

    if (toast) {
        toast.classList.remove(
            "show"
        );
    }
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function setupSidebar() {

    const sidebar =
        $("#sidebar");

    const menuToggle =
        $("#menuToggle");

    const sidebarClose =
        $("#sidebarClose");

    const overlay =
        $("#sidebarOverlay");


    if (
        !sidebar ||
        !menuToggle
    ) {
        return;
    }


    menuToggle.addEventListener(
        "click",
        () => {

            if (
                window.innerWidth <=
                768
            ) {

                sidebar.classList.add(
                    "mobile-open"
                );

                if (overlay) {
                    overlay.classList.add(
                        "active"
                    );
                }

            } else {

                document.body.classList.toggle(
                    "sidebar-collapsed"
                );
            }
        }
    );


    if (sidebarClose) {

        sidebarClose.addEventListener(
            "click",
            closeMobileSidebar
        );
    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeMobileSidebar
        );
    }


    $$(".sidebar .nav-item")
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        if (
                            window.innerWidth <=
                            768
                        ) {
                            closeMobileSidebar();
                        }
                    }
                );
            }
        );


    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth >
                768
            ) {
                closeMobileSidebar();
            }
        }
    );
}


function closeMobileSidebar() {

    const sidebar =
        $("#sidebar");

    const overlay =
        $("#sidebarOverlay");


    if (sidebar) {

        sidebar.classList.remove(
            "mobile-open"
        );
    }


    if (overlay) {

        overlay.classList.remove(
            "active"
        );
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

    const button =
        $("#logoutBtn");


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            const confirmed =
                window.confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmed) {
                return;
            }


            const client =
                getSupabaseClient();


            if (client) {

                try {

                    await client.auth.signOut();

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );
                }
            }


            window.location.href =
                "index.html";
        }
    );
}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    const editButton =
        $("#editCustomerBtn");


    const closeModal =
        $("#closeEditCustomerModal");


    const cancelEdit =
        $("#cancelEditCustomer");


    const editForm =
        $("#editCustomerForm");


    const callButton =
        $("#callCustomerBtn");


    const emailButton =
        $("#emailCustomerBtn");


    const toastClose =
        $("#toastClose");


    const statusFilter =
        $("#orderStatusFilter");


    const previousPage =
        $("#previousOrderPage");


    const nextPage =
        $("#nextOrderPage");


    if (editButton) {

        editButton.addEventListener(
            "click",
            openEditModal
        );
    }


    if (closeModal) {

        closeModal.addEventListener(
            "click",
            closeEditModal
        );
    }


    if (cancelEdit) {

        cancelEdit.addEventListener(
            "click",
            closeEditModal
        );
    }


    if (editForm) {

        editForm.addEventListener(
            "submit",
            saveCustomerChanges
        );
    }


    if (callButton) {

        callButton.addEventListener(
            "click",
            callCustomer
        );
    }


    if (emailButton) {

        emailButton.addEventListener(
            "click",
            emailCustomer
        );
    }


    if (toastClose) {

        toastClose.addEventListener(
            "click",
            closeToast
        );
    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            applyOrderFilter
        );
    }


    if (previousPage) {

        previousPage.addEventListener(
            "click",
            () => {

                if (
                    currentOrderPage > 1
                ) {

                    currentOrderPage--;

                    renderOrders();
                }
            }
        );
    }


    if (nextPage) {

        nextPage.addEventListener(
            "click",
            () => {

                const totalPages =
                    Math.ceil(
                        filteredOrders.length /
                        ORDERS_PER_PAGE
                    );


                if (
                    currentOrderPage <
                    totalPages
                ) {

                    currentOrderPage++;

                    renderOrders();
                }
            }
        );
    }


    const modal =
        $("#editCustomerModal");


    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {
                    closeEditModal();
                }
            }
        );
    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                const editModal =
                    $("#editCustomerModal");


                if (
                    editModal &&
                    !editModal.hidden
                ) {
                    closeEditModal();
                }
            }
        }
    );
}


/* =========================================================
   REAL-TIME / TAB REFRESH
   ========================================================= */

function setupRealtimeRefresh() {

    const client =
        getSupabaseClient();


    if (!client) {
        return;
    }


    const customerId =
        getCustomerIdFromUrl();


    if (!customerId) {
        return;
    }


    /*
     * Refresh when the bookings table changes.
     * This keeps order history current.
     */

    client
        .channel(
            `customer-details-${customerId}`
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "bookings",
                filter:
                    `customer_id=eq.${customerId}`
            },
            async () => {

                try {

                    customerOrders =
                        (
                            await loadCustomerBookings(
                                customerId
                            )
                        ).map(
                            normalizeBooking
                        );


                    filteredOrders =
                        [...customerOrders];


                    currentOrderPage = 1;


                    renderSummary();

                    renderOrders();

                    renderActivity();

                } catch (error) {

                    console.error(
                        "Realtime customer refresh failed:",
                        error
                    );
                }
            }
        )
        .subscribe();
}


/* =========================================================
   LOAD CUSTOMER DETAILS
   ========================================================= */

async function loadCustomerDetails() {

    const loading =
        $("#loadingState");

    const content =
        $("#customerDetailsContent");

    const errorState =
        $("#errorState");


    if (loading) {
        loading.hidden = false;
    }

    if (content) {
        content.hidden = true;
    }

    if (errorState) {
        errorState.hidden = true;
    }


    try {

        supabaseClient =
            getSupabaseClient();


        if (!supabaseClient) {
            throw new Error(
                "Supabase client is not loaded."
            );
        }


        const customerId =
            getCustomerIdFromUrl();


        if (!customerId) {
            throw new Error(
                "No customer ID was supplied."
            );
        }


        const profile =
            await loadCustomerProfile(
                customerId
            );


        currentCustomer =
            normalizeCustomer(
                profile
            );


        const bookings =
            await loadCustomerBookings(
                customerId
            );


        customerOrders =
            bookings.map(
                normalizeBooking
            );


        filteredOrders =
            [...customerOrders];


        currentOrderPage = 1;


        renderCustomerProfile();

        renderSummary();

        renderOrders();

        renderActivity();


        if (loading) {
            loading.hidden = true;
        }


        if (content) {
            content.hidden = false;
        }


        if (errorState) {
            errorState.hidden = true;
        }


        setupRealtimeRefresh();

    } catch (error) {

        console.error(
            "Customer details loading failed:",
            error
        );


        if (loading) {
            loading.hidden = true;
        }


        if (content) {
            content.hidden = true;
        }


        if (errorState) {

            errorState.hidden = false;
        }


        const message =
            error?.message ||
            "Unable to load customer details.";


        $("#errorMessage")
            .textContent =
                message;
    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeCustomerDetails() {

    setupSidebar();

    setupLogout();

    setupEvents();

    await loadCustomerDetails();
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeCustomerDetails
);