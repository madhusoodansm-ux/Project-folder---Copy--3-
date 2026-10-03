"use strict";


const DEFAULT_ROWS_PER_PAGE = 10;

let allBookings = [];
let filteredBookings = [];

let selectedFilter = "All";

let currentPage = 1;

let rowsPerPageValue =
    DEFAULT_ROWS_PER_PAGE;

let currentAdmin = null;


/* =========================================================
   DOM
========================================================= */

const sidebar =
    document.getElementById("sidebar");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const searchInput =
    document.getElementById("searchInput");

const bookingBody =
    document.getElementById("bookingBody");

const mobileBookings =
    document.getElementById("mobileBookings");

const paymentFilter =
    document.getElementById("paymentFilter");

const parcelFilter =
    document.getElementById("parcelFilter");

const fromDate =
    document.getElementById("fromDate");

const toDate =
    document.getElementById("toDate");

const resetButton =
    document.getElementById("resetButton");

const showingText =
    document.getElementById("showingText");

const notificationButton =
    document.getElementById("notificationButton");

const exportButton =
    document.getElementById("exportButton");

const newBookingButton =
    document.getElementById("newBookingButton");

const rowsPerPage =
    document.getElementById("rowsPerPage");

const toastElement =
    document.getElementById("toast");

const bookingCountText =
    document.getElementById("bookingCountText");


/* =========================================================
   SUPABASE
========================================================= */

function getSupabaseClient() {

    return window.supabaseClient || null;

}


async function requireActiveAdmin() {

    const client =
        getSupabaseClient();

    if (!client) {

        throw new Error(
            "Supabase client is not available."
        );

    }


    const {
        data: authData,
        error: authError
    } =
        await client.auth.getUser();


    if (
        authError ||
        !authData ||
        !authData.user
    ) {

        window.location.href =
            "../index.html";

        return null;

    }


    const userId =
        authData.user.id;


    const {
        data: profile,
        error: profileError
    } =
        await client
            .from("profiles")
            .select(
                "id, email, phone, full_name, role, status"
            )
            .eq("id", userId)
            .maybeSingle();


    if (
        profileError ||
        !profile ||
        String(profile.role || "")
            .toLowerCase() !== "admin" ||
        String(profile.status || "")
            .toLowerCase() !== "active"
    ) {

        await client.auth.signOut();

        window.location.href =
            "../index.html";

        return null;

    }


    currentAdmin =
        profile;


    updateAdminDisplay(
        profile
    );


    return profile;

}


/* =========================================================
   ADMIN DISPLAY
========================================================= */

function updateAdminDisplay(
    profile
) {

    const name =
        profile.full_name ||
        profile.email ||
        "Admin";


    const initials =
        getInitials(name);


    document
        .querySelectorAll(
            ".admin-info strong, .profile-details strong"
        )
        .forEach(
            element => {

                element.textContent =
                    name;

            }
        );


    document
        .querySelectorAll(
            ".admin-info span, .profile-details span"
        )
        .forEach(
            element => {

                element.textContent =
                    "Admin";

            }
        );


    document
        .querySelectorAll(
            ".admin-avatar, .profile-avatar"
        )
        .forEach(
            element => {

                element.textContent =
                    initials;

            }
        );

}


function getInitials(
    name
) {

    const parts =
        String(name || "Admin")
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!parts.length) {

        return "AD";

    }


    if (parts.length === 1) {

        return parts[0]
            .slice(0, 2)
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

}


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(
    value
) {

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


function clean(
    value
) {

    return String(
        value ?? ""
    ).trim();

}


function normalize(
    value
) {

    return clean(
        value
    ).toLowerCase();

}


/* =========================================================
   DATE
========================================================= */

function formatDateTime(
    value
) {

    if (!value) {

        return {
            date: "—",
            time: "—"
        };

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return {
            date: clean(value),
            time: "—"
        };

    }


    return {

        date:
            window.SSPAdminSettings.formatDate(date),

        time:
            date.toLocaleTimeString(
                "en-US",
                {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                }
            )

    };

}


function formatDateInput(
    value
) {

    if (!value) {

        return "";

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return [
        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(2, "0"),

        String(
            date.getDate()
        ).padStart(2, "0")

    ].join("-");

}


function formatBookingDate(
    booking
) {

    return formatDateTime(
        booking.created_at
    );

}


/* =========================================================
   BOOKING DATA HELPERS
========================================================= */

function getRoute(
    booking
) {

    const from =
        clean(
            booking.pickup_city
        ) ||
        clean(
            booking.pickup_address
        ) ||
        clean(
            booking.pickup_name
        );


    const to =
        clean(
            booking.delivery_city
        ) ||
        clean(
            booking.delivery_address
        );


    if (
        from &&
        to
    ) {

        return `${from} → ${to}`;

    }


    return (
        from ||
        to ||
        "—"
    );

}


function getCustomerName(
    booking
) {

    return (
        clean(
            booking.customer_profile?.full_name
        ) ||
        clean(
            booking.pickup_name
        ) ||
        "—"
    );

}


function getCustomerPhone(
    booking
) {

    return (
        clean(
            booking.customer_profile?.phone
        ) ||
        clean(
            booking.pickup_phone
        ) ||
        "—"
    );

}


/* =========================================================
   STATUS LABELS
========================================================= */

function getCallLabel(
    status
) {

    const labels = {

        required:
            "Call Required",

        done:
            "Call Confirmed",

        not_reachable:
            "Not Reachable",

        cancelled:
            "Call Cancelled"

    };


    return (
        labels[
            normalize(status)
        ] ||
        "—"
    );

}


function getPaymentLabel(
    status
) {

    const labels = {

        pending:
            "Unpaid",

        paid:
            "Payment Received",

        failed:
            "Payment Failed",

        cancelled:
            "Payment Cancelled",

        refunded:
            "Payment Refunded"

    };


    return (
        labels[
            normalize(status)
        ] ||
        "—"
    );

}


function getCallClass(
    status
) {

    switch (
        normalize(status)
    ) {

        case "done":
            return "green";

        case "not_reachable":
            return "red";

        case "cancelled":
            return "blue";

        default:
            return "orange";

    }

}


function getPaymentClass(
    status
) {

    switch (
        normalize(status)
    ) {

        case "paid":
            return "green";

        case "refunded":
            return "blue";

        case "failed":
        case "cancelled":
            return "red";

        default:
            return "orange";

    }

}


/* =========================================================
   LOAD BOOKINGS FROM SUPABASE
========================================================= */

async function loadBookings() {

    const client =
        getSupabaseClient();


    if (!client) {

        throw new Error(
            "Supabase client is not available."
        );

    }


    const batchSize = 1000;

    let from = 0;

    let rows = [];


    while (true) {

        const {
            data,
            error
        } =
            await client
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
                    admin_notes,
                    created_at,
                    updated_at
                `)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .range(
                    from,
                    from + batchSize - 1
                );


        if (error) {

            throw error;

        }


        const batch =
            Array.isArray(data)
                ? data
                : [];


        rows.push(
            ...batch
        );


        if (
            batch.length <
            batchSize
        ) {

            break;

        }


        from +=
            batchSize;

    }


    /* CUSTOMER PROFILES */

    const customerIds =
        [
            ...new Set(
                rows
                    .map(
                        row =>
                            row.customer_id
                    )
                    .filter(Boolean)
            )
        ];


    let profilesById =
        new Map();


    if (
        customerIds.length
    ) {

        try {
            const {
                data: profiles,
                error: profileError
            } =
                await client
                    .from("profiles")
                    .select(
                        "id, full_name, phone, email"
                    )
                    .in(
                        "id",
                        customerIds
                    );

            if (profileError) {
                throw profileError;
            }

            profilesById =
                new Map(
                    (profiles || [])
                        .map(
                            profile => [
                                profile.id,
                                profile
                            ]
                        )
                );
        } catch (error) {
            console.error(
                "Customer profile enrichment failed; displaying booking rows without profile details:",
                error
            );
        }

    }


    allBookings =
        rows.map(
            row => ({

                ...row,

                customer_profile:
                    profilesById.get(
                        row.customer_id
                    ) || null

            })
        );


    populateParcelFilter();

    render();

}


/* =========================================================
   PARCEL TYPE FILTER
========================================================= */

function populateParcelFilter() {

    if (!parcelFilter) {

        return;

    }


    const currentValue =
        parcelFilter.value;


    const values =
        [
            ...new Set(
                allBookings
                    .map(
                        booking =>
                            clean(
                                booking.parcel_type
                            )
                    )
                    .filter(Boolean)
            )
        ]
        .sort(
            (a, b) =>
                a.localeCompare(b)
        );


    parcelFilter.innerHTML =
        `<option value="">Parcel Type</option>` +
        values
            .map(
                value =>
                    `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`
            )
            .join("");


    if (
        values.includes(
            currentValue
        )
    ) {

        parcelFilter.value =
            currentValue;

    }

}


/* =========================================================
   QUICK FILTERS
========================================================= */

function matchesQuickFilter(
    booking,
    filter
) {

    const status =
        normalize(
            booking.status
        );


    const driverAssigned =
        Boolean(
            booking.driver_id
        );


    switch (filter) {

        case "Pickup":

            return [
                "pickup_started",
                "picked_up"
            ].includes(
                status
            );


        case "In Transit":

            return (
                status ===
                "in_transit"
            );


        case "Assigned":

            return (
                status ===
                "assigned"
            );


        case "Pending Pickup":

            return [
                "pending",
                "confirmed"
            ].includes(
                status
            );


        case "Delivered":

            return (
                status ===
                "delivered"
            );


        case "Call Confirmation Required":

            return (
                normalize(
                    booking.call_confirmation_status
                ) ===
                "required"
            );


        case "Call Confirmed":

            return (
                normalize(
                    booking.call_confirmation_status
                ) ===
                "done"
            );


        case "Driver Assigned":

            return driverAssigned;


        case "All":

        default:

            return true;

    }

}


/* =========================================================
   FILTER DATA
========================================================= */

function getFilteredBookings() {

    const search =
        normalize(
            searchInput?.value
        );


    const payment =
        normalize(
            paymentFilter?.value
        );


    const parcel =
        normalize(
            parcelFilter?.value
        );


    const from =
        fromDate?.value ||
        "";


    const to =
        toDate?.value ||
        "";


    filteredBookings =
        allBookings.filter(
            booking => {

                const bookingDate =
                    formatDateInput(
                        booking.created_at
                    );


                const searchText = [

                    booking.booking_id,

                    getCustomerName(
                        booking
                    ),

                    getCustomerPhone(
                        booking
                    ),

                    booking.pickup_city,

                    booking.delivery_city,

                    booking.pickup_address,

                    booking.delivery_address,

                    booking.parcel_type,

                    booking.parcel_name

                ]
                    .map(clean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchText.includes(
                        search
                    );


                const matchesPayment =
                    !payment ||
                    normalize(
                        booking.payment_status
                    ) === payment;


                const matchesParcel =
                    !parcel ||
                    normalize(
                        booking.parcel_type
                    ) === parcel;


                const matchesFrom =
                    !from ||
                    (
                        bookingDate &&
                        bookingDate >= from
                    );


                const matchesTo =
                    !to ||
                    (
                        bookingDate &&
                        bookingDate <= to
                    );


                return (

                    matchesQuickFilter(
                        booking,
                        selectedFilter
                    ) &&

                    matchesSearch &&

                    matchesPayment &&

                    matchesParcel &&

                    matchesFrom &&

                    matchesTo

                );

            }
        );


    return filteredBookings;

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

    const filterButtons =
        document.querySelectorAll(
            ".filter-chip"
        );


    filterButtons.forEach(
        button => {

            const filter =
                button.dataset.filter;


            const count =
                allBookings.filter(
                    booking =>
                        matchesQuickFilter(
                            booking,
                            filter
                        )
                ).length;


            const countElement =
                button.querySelector("b");


            if (countElement) {

                countElement.textContent =
                    count;

            }

        }
    );


    const total =
        allBookings.length;


    if (bookingCountText) {

        bookingCountText.textContent =
            `${total} booking${total === 1 ? "" : "s"}`;

    }

}


/* =========================================================
   DESKTOP TABLE
========================================================= */

function renderTable(
    data,
    startIndex
) {

    if (!data.length) {

        bookingBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="empty-row">
                    No bookings found
                </td>
            </tr>
        `;

        return;

    }


    bookingBody.innerHTML =
        data
            .map(
                (
                    booking,
                    index
                ) => {

                    const callClass =
                        getCallClass(
                            booking.call_confirmation_status
                        );


                    const paymentClass =
                        getPaymentClass(
                            booking.payment_status
                        );


                    const callLabel =
                        getCallLabel(
                            booking.call_confirmation_status
                        );


                    const paymentLabel =
                        getPaymentLabel(
                            booking.payment_status
                        );


                    const dateTime =
                        formatBookingDate(
                            booking
                        );


                    return `

                        <tr>

                            <td>
                                ${
                                    startIndex +
                                    index +
                                    1
                                }
                            </td>


                            <td>

                                <span
                                    class="tracking-id">

                                    ${
                                        escapeHTML(
                                            booking.booking_id
                                        )
                                    }

                                </span>

                            </td>


                            <td
                                class="customer-cell">

                                <strong>

                                    ${
                                        escapeHTML(
                                            getCustomerName(
                                                booking
                                            )
                                        )
                                    }

                                </strong>

                                <span>

                                    ${
                                        escapeHTML(
                                            getCustomerPhone(
                                                booking
                                            )
                                        )
                                    }

                                </span>

                            </td>


                            <td
                                class="route-cell">

                                ${
                                    escapeHTML(
                                        getRoute(
                                            booking
                                        )
                                    )
                                }

                            </td>


                            <td>

                                <span
                                    class="status ${callClass}">

                                    <span
                                        aria-hidden="true">
                                        ☎
                                    </span>

                                    ${
                                        escapeHTML(
                                            callLabel
                                        )
                                    }

                                </span>

                            </td>


                            <td>

                                <span
                                    class="status ${paymentClass}">

                                    <span
                                        aria-hidden="true">
                                        ▣
                                    </span>

                                    ${
                                        escapeHTML(
                                            paymentLabel
                                        )
                                    }

                                </span>

                            </td>


                            <td
                                class="date-time">

                                ${
                                    escapeHTML(
                                        dateTime.date
                                    )
                                }

                                <br>

                                ${
                                    escapeHTML(
                                        dateTime.time
                                    )
                                }

                            </td>


                            <td>

                                <button
                                    type="button"
                                    class="action-button"
                                    data-id="${escapeHTML(
                                        booking.booking_id
                                    )}"
                                    aria-label="Open booking details">

                                    ⋮

                                </button>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   MOBILE CARDS
========================================================= */

function renderMobile(
    data
) {

    if (!data.length) {

        mobileBookings.innerHTML = `

            <div
                class="mobile-booking">

                No bookings found

            </div>

        `;

        return;

    }


    mobileBookings.innerHTML =
        data
            .map(
                booking => {

                    const callClass =
                        getCallClass(
                            booking.call_confirmation_status
                        );


                    const paymentClass =
                        getPaymentClass(
                            booking.payment_status
                        );


                    const callLabel =
                        getCallLabel(
                            booking.call_confirmation_status
                        );


                    const paymentLabel =
                        getPaymentLabel(
                            booking.payment_status
                        );


                    const dateTime =
                        formatBookingDate(
                            booking
                        );


                    return `

                        <article
                            class="mobile-booking"
                            data-id="${escapeHTML(
                                booking.booking_id
                            )}"
                            tabindex="0"
                            role="button"
                            aria-label="Open booking ${escapeHTML(
                                booking.booking_id
                            )}">

                            <div
                                class="mobile-booking-top">

                                <span
                                    class="mobile-tracking">

                                    ${
                                        escapeHTML(
                                            booking.booking_id
                                        )
                                    }

                                </span>


                                <span
                                    class="mobile-date">

                                    ${
                                        escapeHTML(
                                            dateTime.date
                                        )
                                    },

                                    ${
                                        escapeHTML(
                                            dateTime.time
                                        )
                                    }

                                </span>

                            </div>


                            <div
                                class="mobile-customer">

                                ${
                                    escapeHTML(
                                        getCustomerName(
                                            booking
                                        )
                                    )
                                }

                            </div>


                            <div
                                class="mobile-phone">

                                ${
                                    escapeHTML(
                                        getCustomerPhone(
                                            booking
                                        )
                                    )
                                }

                            </div>


                            <div
                                class="mobile-route">

                                ${
                                    escapeHTML(
                                        getRoute(
                                            booking
                                        )
                                    )
                                }

                            </div>


                            <div
                                class="mobile-statuses">

                                <span
                                    class="status ${callClass}">

                                    <span
                                        aria-hidden="true">
                                        ☎
                                    </span>

                                    ${
                                        escapeHTML(
                                            callLabel
                                        )
                                    }

                                </span>


                                <span
                                    class="status ${paymentClass}">

                                    <span
                                        aria-hidden="true">
                                        ▣
                                    </span>

                                    ${
                                        escapeHTML(
                                            paymentLabel
                                        )
                                    }

                                </span>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   PAGINATION
========================================================= */

function buildPageList(
    totalPages,
    page
) {

    if (
        totalPages <= 7
    ) {

        return Array.from(
            {
                length:
                    totalPages
            },

            (
                _,
                index
            ) =>
                index + 1
        );

    }


    if (
        page <= 4
    ) {

        return [
            1,
            2,
            3,
            4,
            5,
            "…",
            totalPages
        ];

    }


    if (
        page >=
        totalPages - 3
    ) {

        return [
            1,
            "…",
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages
        ];

    }


    return [
        1,
        "…",
        page - 1,
        page,
        page + 1,
        "…",
        totalPages
    ];

}


function renderPagination(
    totalItems
) {

    const container =
        document.querySelector(
            ".page-buttons"
        );


    if (!container) {

        return;

    }


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalItems /
                rowsPerPageValue
            )
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;

    }


    container.innerHTML =
        "";


    const previous =
        document.createElement(
            "button"
        );


    previous.type =
        "button";

    previous.textContent =
        "‹";

    previous.disabled =
        currentPage === 1;

    previous.setAttribute(
        "aria-label",
        "Previous page"
    );


    previous.addEventListener(
        "click",
        () => {

            if (
                currentPage > 1
            ) {

                currentPage -= 1;

                render();

            }

        }
    );


    container.appendChild(
        previous
    );


    const pages =
        buildPageList(
            totalPages,
            currentPage
        );


    pages.forEach(
        item => {

            if (
                item === "…"
            ) {

                const span =
                    document.createElement(
                        "span"
                    );

                span.textContent =
                    "...";

                container.appendChild(
                    span
                );

                return;

            }


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.textContent =
                String(item);


            if (
                item ===
                currentPage
            ) {

                button.classList.add(
                    "selected"
                );

            }


            button.addEventListener(
                "click",
                () => {

                    currentPage =
                        item;

                    render();

                }
            );


            container.appendChild(
                button
            );

        }
    );


    const next =
        document.createElement(
            "button"
        );


    next.type =
        "button";

    next.textContent =
        "›";

    next.disabled =
        currentPage ===
        totalPages;

    next.setAttribute(
        "aria-label",
        "Next page"
    );


    next.addEventListener(
        "click",
        () => {

            if (
                currentPage <
                totalPages
            ) {

                currentPage += 1;

                render();

            }

        }
    );


    container.appendChild(
        next
    );

}


/* =========================================================
   MAIN RENDER
========================================================= */

function render() {

    const filtered =
        getFilteredBookings();


    const total =
        filtered.length;


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total /
                rowsPerPageValue
            )
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;

    }


    const startIndex =
        (
            currentPage - 1
        ) *
        rowsPerPageValue;


    const endIndex =
        Math.min(
            startIndex +
            rowsPerPageValue,
            total
        );


    const pageData =
        filtered.slice(
            startIndex,
            endIndex
        );


    renderTable(
        pageData,
        startIndex
    );


    renderMobile(
        pageData
    );


    renderPagination(
        total
    );


    updateCounters();


    if (!total) {

        showingText.textContent =
            "Showing 0 of 0 bookings";

    } else {

        showingText.textContent =
            `Showing ${startIndex + 1} to ${endIndex} of ${total} bookings`;

    }

}


/* =========================================================
   QUICK FILTER EVENTS
========================================================= */

document
    .querySelectorAll(
        ".filter-chip"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".filter-chip"
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                    button.classList.add(
                        "active"
                    );


                    selectedFilter =
                        button.dataset.filter ||
                        "All";


                    currentPage =
                        1;


                    render();

                }
            );

        }
    );


/* SEARCH */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            currentPage =
                1;

            render();

        }
    );

}


/* ADVANCED FILTERS */

[
    paymentFilter,
    parcelFilter,
    fromDate,
    toDate

].forEach(
    element => {

        if (!element) {

            return;

        }


        element.addEventListener(
            "change",
            () => {

                currentPage =
                    1;

                render();

            }
        );

    }
);


/* =========================================================
   RESET
========================================================= */

if (resetButton) {

    resetButton.addEventListener(
        "click",
        () => {

            selectedFilter =
                "All";


            currentPage =
                1;


            document
                .querySelectorAll(
                    ".filter-chip"
                )
                .forEach(
                    button => {

                        button.classList.toggle(
                            "active",
                            button.dataset.filter ===
                                "All"
                        );

                    }
                );


            if (searchInput) {

                searchInput.value =
                    "";

            }


            if (paymentFilter) {

                paymentFilter.value =
                    "";

            }


            if (parcelFilter) {

                parcelFilter.value =
                    "";

            }


            if (fromDate) {

                fromDate.value =
                    "";

            }


            if (toDate) {

                toDate.value =
                    "";

            }


            render();

            showToast(
                "Filters reset"
            );

        }
    );

}


/* =========================================================
   ROWS PER PAGE
========================================================= */

if (rowsPerPage) {

    rowsPerPageValue =
        Number(
            rowsPerPage.value
        ) ||
        DEFAULT_ROWS_PER_PAGE;


    rowsPerPage.addEventListener(
        "change",
        () => {

            rowsPerPageValue =
                Number(
                    rowsPerPage.value
                ) ||
                DEFAULT_ROWS_PER_PAGE;


            currentPage =
                1;


            render();

        }
    );

}


/* =========================================================
   SIDEBAR
========================================================= */

if (sidebarToggle) {

    sidebarToggle.addEventListener(
        "click",
        () => {

            if (
                window.innerWidth <=
                800
            ) {

                sidebar.classList.toggle(
                    "open"
                );

            } else {

                sidebar.classList.toggle(
                    "collapsed"
                );

            }

        }
    );

}


document
    .querySelectorAll(
        ".sidebar .nav-item"
    )
    .forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    if (
                        window.innerWidth <=
                        800
                    ) {

                        sidebar.classList.remove(
                            "open"
                        );

                    }

                }
            );

        }
    );


/* =========================================================
   NOTIFICATION
========================================================= */

if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        () => {

            showToast(
                "Open Notifications from the Admin Portal navigation."
            );

        }
    );

}


/* =========================================================
   NEW BOOKING BUTTON
========================================================= */

if (newBookingButton) {

    newBookingButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "new-booking.html";

        }
    );

}


/* =========================================================
   BOOKING DETAILS
========================================================= */

document.addEventListener(
    "click",
    event => {

        const actionButton =
            event.target.closest(
                ".action-button"
            );


        if (actionButton) {

            const id =
                actionButton.dataset.id;


            if (id) {

                window.location.href =
                    `bookings-details.html?id=${encodeURIComponent(id)}`;

            }


            return;

        }


        const mobileBooking =
            event.target.closest(
                ".mobile-booking"
            );


        if (mobileBooking) {

            const id =
                mobileBooking.dataset.id;


            if (id) {

                window.location.href =
                    `bookings-details.html?id=${encodeURIComponent(id)}`;

            }

        }

    }
);


/* =========================================================
   MOBILE KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        const card =
            event.target.closest?.(
                ".mobile-booking"
            );


        if (!card) {

            return;

        }


        if (
            event.key !== "Enter" &&
            event.key !== " "
        ) {

            return;

        }


        event.preventDefault();


        const id =
            card.dataset.id;


        if (id) {

            window.location.href =
                `bookings-details.html?id=${encodeURIComponent(id)}`;

        }

    }
);


/* =========================================================
   EXPORT
========================================================= */

if (exportButton) {

    exportButton.addEventListener(
        "click",
        () => {

            const data =
                getFilteredBookings();


            const rows = [

                [
                    "Tracking ID",
                    "Customer",
                    "Phone",
                    "From → To",
                    "Call Verification",
                    "Payment Status",
                    "Parcel Type",
                    "Booking Status",
                    "Date",
                    "Time"
                ],

                ...data.map(
                    booking => {

                        const dateTime =
                            formatBookingDate(
                                booking
                            );


                        return [

                            booking.booking_id,

                            getCustomerName(
                                booking
                            ),

                            getCustomerPhone(
                                booking
                            ),

                            getRoute(
                                booking
                            ),

                            getCallLabel(
                                booking.call_confirmation_status
                            ),

                            getPaymentLabel(
                                booking.payment_status
                            ),

                            booking.parcel_type ||
                                "",

                            booking.status ||
                                "",

                            dateTime.date,

                            dateTime.time

                        ];

                    }
                )

            ];


            const csv =
                rows
                    .map(
                        row =>
                            row
                                .map(
                                    value =>
                                        `"${String(
                                            value ?? ""
                                        ).replaceAll(
                                            '"',
                                            '""'
                                        )}"`
                                )
                                .join(",")
                    )
                    .join("\n");


            const blob =
                new Blob(
                    [csv],
                    {
                        type:
                            "text/csv;charset=utf-8;"
                    }
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                url;


            link.download =
                "sri-sadguru-bookings.csv";


            document.body.appendChild(
                link
            );


            link.click();


            link.remove();


            URL.revokeObjectURL(
                url
            );


            showToast(
                "Bookings exported successfully"
            );

        }
    );

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;


function showToast(
    message
) {

    if (!toastElement) {

        return;

    }


    clearTimeout(
        toastTimer
    );


    toastElement.textContent =
        message;


    toastElement.classList.add(
        "show"
    );


    toastTimer =
        setTimeout(
            () => {

                toastElement.classList.remove(
                    "show"
                );

            },

            2200
        );

}


/* =========================================================
   DATABASE ERROR
========================================================= */

function showDatabaseError(
    error
) {

    console.error(
        "SSP Bookings database error:",
        error
    );


    const message =
        error?.message ||
        "Unable to load bookings from Supabase.";


    bookingBody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="empty-row">

                Unable to load bookings.
                Please refresh and try again.

            </td>

        </tr>

    `;


    mobileBookings.innerHTML = `

        <div
            class="mobile-booking">

            Unable to load bookings.
            Please refresh and try again.

        </div>

    `;


    showingText.textContent =
        "Unable to load bookings";


    showToast(
        message
    );

}


/* =========================================================
   START
========================================================= */

async function initializeBookingsPage() {

    if (fromDate) {

        fromDate.value =
            "";

    }


    if (toDate) {

        toDate.value =
            "";

    }


    currentPage =
        1;


    rowsPerPageValue =
        Number(
            rowsPerPage?.value
        ) ||
        DEFAULT_ROWS_PER_PAGE;


    try {

        const admin =
            await requireActiveAdmin();


        if (!admin) {

            return;

        }

        await loadBookings();

    } catch (error) {

        showDatabaseError(
            error
        );

    }

}


initializeBookingsPage();