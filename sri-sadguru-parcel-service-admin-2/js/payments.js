"use strict";

/* =========================================================
   SRI SADGURU SIDDAROODA PARCEL SERVICE
   ADMIN PORTAL
   PAYMENTS PAGE

   DATABASE:
       Supabase

   TABLE:
       public.bookings

   IMPORTANT:
       This version DOES NOT use localStorage.

       Payment information is stored directly in:
           public.bookings

       Payment columns:
           received_amount
           payment_method
           payment_status

       Pricing columns:
           base_price
           distance_charge
           handling_charge
           gst_amount
           service_charge
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const supabaseClient =
    window.supabaseClient;


/* =========================================================
   PAGE STATE
========================================================= */

let allBookings = [];

let currentFilter = "";

let currentPage = 1;

let currentRowsPerPage =
    Number(
        document.getElementById("rowsPerPage")?.value
    ) || 10;

let currentPaymentId = null;

let isLoading = false;

let paymentLoadError = "";


/* =========================================================
   DOM
========================================================= */

const paymentBody =
    document.getElementById(
        "paymentBody"
    );

const mobilePayments =
    document.getElementById(
        "mobilePayments"
    );

const paymentSearch =
    document.getElementById(
        "paymentSearch"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const statusFilter =
    document.getElementById(
        "statusFilter"
    );

const methodFilter =
    document.getElementById(
        "methodFilter"
    );

const resetButton =
    document.getElementById(
        "resetButton"
    );

const rowsPerPage =
    document.getElementById(
        "rowsPerPage"
    );

const pageButtons =
    document.getElementById(
        "pageButtons"
    );

const showingText =
    document.getElementById(
        "showingText"
    );


/* =========================================================
   SIDEBAR
========================================================= */

const sidebar =
    document.getElementById(
        "sidebar"
    );

const sidebarToggle =
    document.getElementById(
        "sidebarToggle"
    );

const notificationButton =
    document.getElementById(
        "notificationButton"
    );


/* =========================================================
   DRAWER
========================================================= */

const drawerOverlay =
    document.getElementById(
        "drawerOverlay"
    );

const closeDrawer =
    document.getElementById(
        "closeDrawer"
    );

const drawerContent =
    document.getElementById(
        "drawerContent"
    );

const drawerBookingId =
    document.getElementById(
        "drawerBookingId"
    );


/* =========================================================
   PAYMENT MODAL
========================================================= */

const paymentModal =
    document.getElementById(
        "paymentModal"
    );

const closePaymentModal =
    document.getElementById(
        "closePaymentModal"
    );

const cancelPayment =
    document.getElementById(
        "cancelPayment"
    );

const savePayment =
    document.getElementById(
        "savePayment"
    );

const modalBookingId =
    document.getElementById(
        "modalBookingId"
    );

const modalTotal =
    document.getElementById(
        "modalTotal"
    );

const modalMethod =
    document.getElementById(
        "modalMethod"
    );

const modalReceived =
    document.getElementById(
        "modalReceived"
    );

const modalStatus =
    document.getElementById(
        "modalStatus"
    );


/* =========================================================
   SUPABASE CHECK
========================================================= */

function checkSupabase() {

    if (
        !supabaseClient ||
        !supabaseClient.from
    ) {

        console.error(
            "Supabase client is not available."
        );

        showToast(
            "Supabase connection is not available."
        );

        return false;
    }

    return true;
}


/* =========================================================
   HTML ESCAPE
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

    const amount =
        Number(value);

    if (
        !Number.isFinite(amount)
    ) {

        return "₹0";
    }

    return (
        "₹" +
        amount.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )
    );
}


/* =========================================================
   NUMBER
========================================================= */

function numberValue(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


/* =========================================================
   CUSTOMER NAME
========================================================= */

function getCustomerName(
    booking
) {

    if (!booking) {
        return "—";
    }

    return (
        booking.customer_name ||
        booking.customerName ||
        booking.pickup_name ||
        booking.sender_name ||
        booking.sender?.name ||
        booking.receiver_name ||
        booking.receiver?.name ||
        "—"
    );
}


/* =========================================================
   CUSTOMER PHONE
========================================================= */

function getCustomerPhone(
    booking
) {

    if (!booking) {
        return "—";
    }

    return (
        booking.customer_phone ||
        booking.customerPhone ||
        booking.pickup_phone ||
        booking.sender_phone ||
        booking.sender?.phone ||
        booking.receiver_phone ||
        booking.receiver?.phone ||
        "—"
    );
}


/* =========================================================
   ROUTE
========================================================= */

function getRoute(
    booking
) {

    if (!booking) {
        return "—";
    }

    const from =
        booking.pickup_city ||
        booking.pickup_address ||
        booking.sender_city ||
        booking.sender?.city ||
        "";

    const to =
        booking.delivery_city ||
        booking.delivery_address ||
        booking.receiver?.city ||
        "";

    if (
        !from &&
        !to
    ) {

        return "—";
    }

    if (
        from &&
        to
    ) {

        return (
            `${from} → ${to}`
        );
    }

    return (
        from ||
        to ||
        "—"
    );
}


/* =========================================================
   BOOKING ID
========================================================= */

function getBookingId(
    booking
) {

    return (
        booking.booking_id ||
        booking.id ||
        "—"
    );
}


/* =========================================================
   TOTAL AMOUNT
========================================================= */

function getTotal(
    booking
) {

    if (!booking) {
        return 0;
    }

    /*
       Itemized pricing is authoritative. In the existing booking flow,
       service_charge stores the final total, so it is only a fallback.
    */

    const basePrice =
        numberValue(
            booking.base_price
        );

    const distanceCharge =
        numberValue(
            booking.distance_charge
        );

    const handlingCharge =
        numberValue(
            booking.handling_charge
        );

    const gstAmount =
        numberValue(
            booking.gst_amount
        );

    const calculatedTotal =
        basePrice +
        distanceCharge +
        handlingCharge +
        gstAmount;

    if (calculatedTotal > 0) {
        return calculatedTotal;
    }

    return numberValue(
        booking.total_amount ??
        booking.service_charge
    );
}


/* =========================================================
   RECEIVED AMOUNT
========================================================= */

function getReceived(
    booking
) {

    return numberValue(
        booking.received_amount
    );
}


/* =========================================================
   BALANCE
========================================================= */

function getBalance(
    booking
) {

    const total =
        getTotal(
            booking
        );

    const received =
        getReceived(
            booking
        );

    return Math.max(
        total - received,
        0
    );
}


/* =========================================================
   RAW PAYMENT STATUS
========================================================= */

function getRawPaymentStatus(
    booking
) {

    return String(
        booking.payment_status ||
        ""
    )
        .trim()
        .toLowerCase();
}


/* =========================================================
   NORMALIZED PAYMENT STATUS
========================================================= */

function getPaymentStatus(
    booking
) {

    const rawStatus =
        getRawPaymentStatus(
            booking
        );

    const normalizedStatus =
        rawStatus.replace(/[_-]+/g, " ");

    const total =
        getTotal(
            booking
        );

    const received =
        getReceived(
            booking
        );


    /*
       REFUNDED
    */

    if (normalizedStatus.includes("refund")) {

        return "refunded";
    }


    /*
       FAILED
    */

    if (normalizedStatus.includes("fail")) {

        return "failed";
    }


    /*
       CANCELLED
    */

    if (normalizedStatus.includes("cancel")) {

        return "cancelled";
    }


    /*
       PAID
    */

    if (
        normalizedStatus === "paid" ||
        normalizedStatus.includes("payment received")
    ) {

        /*
           If the database says paid,
           retain paid status.
        */

        return "paid";
    }


    /*
       PARTIALLY PAID
    */

    if (normalizedStatus.includes("partial")) {

        return "partial";
    }


    /*
       RECEIVED AMOUNT CAN ALSO
       DETERMINE STATUS.
    */

    if (
        total > 0 &&
        received >= total
    ) {

        return "paid";
    }


    if (
        received > 0 &&
        received < total
    ) {

        return "partial";
    }


    /*
       DEFAULT
    */

    return "pending";
}


/* =========================================================
   STATUS LABEL
========================================================= */

function statusLabel(
    status
) {

    switch (status) {

        case "paid":
            return "Paid";

        case "partial":
            return "Partial";

        case "refunded":
            return "Refunded";

        case "failed":
            return "Failed";

        case "cancelled":
            return "Cancelled";

        default:
            return "Pending";
    }
}


/* =========================================================
   PAYMENT METHOD LABEL
========================================================= */

function paymentMethodLabel(
    method
) {

    if (!method) {
        return "—";
    }

    const value =
        String(method)
            .trim();

    switch (
        value.toLowerCase()
    ) {

        case "cash":
            return "Cash";

        case "upi":
            return "UPI";

        case "card":
            return "Card";

        case "bank transfer":
            return "Bank Transfer";

        case "cash on delivery":
        case "cod":
            return "Cash on Delivery";

        default:
            return value;
    }
}


/* =========================================================
   BOOKING DATE
========================================================= */

function getBookingDate(
    booking
) {

    if (
        booking.booking_date
    ) {

        return window.SSPAdminSettings.formatDate(
            booking.booking_date
        );
    }

    if (
        booking.bookingDate
    ) {

        return booking.bookingDate;
    }

    if (
        booking.created_at
    ) {

        const date =
            new Date(
                booking.created_at
            );

        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return window.SSPAdminSettings.formatDate(date);
        }
    }

    return "—";
}


/* =========================================================
   DATABASE SELECT
========================================================= */

function getPaymentSelect() {

    return `
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
        parcel_weight,
        pieces,

        base_price,
        distance_charge,
        handling_charge,
        gst_amount,
        service_charge,

        received_amount,
        payment_method,
        payment_status,

        booking_date,
        booking_time,

        status,
        service_type,

        created_at,
        updated_at
    `;
}


/* =========================================================
   LOAD BOOKINGS FROM SUPABASE
========================================================= */

async function loadBookings() {

    if (
        !checkSupabase()
    ) {

        paymentLoadError =
            "Supabase connection is not available.";
        updateSummary();
        render();
        return;
    }

    paymentLoadError = "";
    setLoading(
        true
    );

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("bookings")
                .select(
                    getPaymentSelect()
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Supabase payment loading error:",
                error
            );

            throw error;
        }


        allBookings =
            Array.isArray(data)
                ? data
                : [];

        paymentLoadError = "";

        populateMethods();

        updateSummary();

        currentPage = 1;

        render();


    } catch (error) {

        console.error(
            "Unable to load payment records:",
            error
        );

        allBookings = [];
        paymentLoadError =
            "Unable to load payments from the database. Check your connection and try again.";

        updateSummary();

        render();

        showToast(
            "Unable to load payment records."
        );

    } finally {

        setLoading(
            false
        );
    }
}


/* =========================================================
   LOADING STATE
========================================================= */

function setLoading(
    loading
) {

    isLoading =
        loading;

    if (
        paymentBody &&
        loading
    ) {

        paymentBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#667085;
                    "
                >
                    Loading payment records...
                </td>
            </tr>
        `;
    }


    if (
        mobilePayments &&
        loading
    ) {

        mobilePayments.innerHTML = `
            <div
                style="
                    text-align:center;
                    padding:30px;
                    color:#667085;
                    font-size:13px;
                "
            >
                Loading payment records...
            </div>
        `;
    }
}


/* =========================================================
   SEARCH TEXT
========================================================= */

function getSearchText() {

    const first =
        paymentSearch?.value ||
        "";

    const second =
        searchInput?.value ||
        "";

    return (
        first.trim() ||
        second.trim()
    ).toLowerCase();
}


/* =========================================================
   FILTERED BOOKINGS
========================================================= */

function getFilteredBookings() {

    const search =
        getSearchText();

    const selectedMethod =
        methodFilter?.value ||
        "";


    return allBookings.filter(
        booking => {

            const customer =
                getCustomerName(
                    booking
                );

            const phone =
                getCustomerPhone(
                    booking
                );

            const route =
                getRoute(
                    booking
                );

            const bookingId =
                getBookingId(
                    booking
                );

            const method =
                paymentMethodLabel(
                    booking.payment_method
                );

            const status =
                getPaymentStatus(
                    booking
                );


            const searchText =
                [
                    bookingId,
                    customer,
                    phone,
                    route,
                    method,
                    status,
                    booking.payment_status
                ]
                    .join(" ")
                    .toLowerCase();


            const matchesSearch =
                !search ||
                searchText.includes(
                    search
                );


            const matchesStatus =
                !currentFilter ||
                status === currentFilter;


            const matchesMethod =
                !selectedMethod ||
                String(
                    booking.payment_method ||
                    ""
                ) ===
                selectedMethod;


            return (
                matchesSearch &&
                matchesStatus &&
                matchesMethod
            );
        }
    );
}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

    let paidCount = 0;

    let pendingCount = 0;

    let partialCount = 0;

    let paidAmount = 0;

    let pendingAmount = 0;

    let partialAmount = 0;

    let outstanding = 0;


    allBookings.forEach(
        booking => {

            const status =
                getPaymentStatus(
                    booking
                );

            const total =
                getTotal(
                    booking
                );

            const received =
                getReceived(
                    booking
                );

            const balance =
                getBalance(
                    booking
                );


            outstanding +=
                balance;


            if (
                status === "paid"
            ) {

                paidCount++;

                paidAmount +=
                    received;

            } else if (
                status === "partial"
            ) {

                partialCount++;

                partialAmount +=
                    received;

            } else {

                pendingCount++;

                pendingAmount +=
                    Math.max(
                        total - received,
                        0
                    );
            }
        }
    );


    const totalPayments =
        document.getElementById(
            "totalPayments"
        );

    const paidCountElement =
        document.getElementById(
            "paidCount"
        );

    const paidAmountElement =
        document.getElementById(
            "paidAmount"
        );

    const pendingCountElement =
        document.getElementById(
            "pendingCount"
        );

    const pendingAmountElement =
        document.getElementById(
            "pendingAmount"
        );

    const partialCountElement =
        document.getElementById(
            "partialCount"
        );

    const partialAmountElement =
        document.getElementById(
            "partialAmount"
        );

    const outstandingElement =
        document.getElementById(
            "outstandingAmount"
        );


    if (
        totalPayments
    ) {

        totalPayments.textContent =
            allBookings.length;
    }


    if (
        paidCountElement
    ) {

        paidCountElement.textContent =
            paidCount;
    }


    if (
        paidAmountElement
    ) {

        paidAmountElement.textContent =
            money(
                paidAmount
            );
    }


    if (
        pendingCountElement
    ) {

        pendingCountElement.textContent =
            pendingCount;
    }


    if (
        pendingAmountElement
    ) {

        pendingAmountElement.textContent =
            money(
                pendingAmount
            );
    }


    if (
        partialCountElement
    ) {

        partialCountElement.textContent =
            partialCount;
    }


    if (
        partialAmountElement
    ) {

        partialAmountElement.textContent =
            money(
                partialAmount
            );
    }


    if (
        outstandingElement
    ) {

        outstandingElement.textContent =
            money(
                outstanding
            );
    }
}


/* =========================================================
   PAYMENT METHODS
========================================================= */

function populateMethods() {

    if (
        !methodFilter
    ) {

        return;
    }


    const previous =
        methodFilter.value;


    const methods =
        new Set();


    allBookings.forEach(
        booking => {

            if (
                booking.payment_method
            ) {

                methods.add(
                    String(
                        booking.payment_method
                    )
                );
            }
        }
    );


    methodFilter.innerHTML = `
        <option value="">
            All Methods
        </option>
    `;


    Array.from(methods)
        .sort()
        .forEach(
            method => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    method;

                option.textContent =
                    paymentMethodLabel(
                        method
                    );

                methodFilter.appendChild(
                    option
                );
            }
        );


    if (
        Array.from(
            methods
        ).includes(
            previous
        )
    ) {

        methodFilter.value =
            previous;
    }
}


/* =========================================================
   DESKTOP TABLE
========================================================= */

function renderTable(
    data
) {

    if (
        !paymentBody
    ) {

        return;
    }


    if (
        !data.length
    ) {

        paymentBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#667085;
                    "
                >
                    ${
                        isLoading
                            ? "Loading payment records..."
                            : escapeHTML(
                                paymentLoadError ||
                                (
                                    allBookings.length
                                        ? "No payments match your search or filters."
                                        : "No payment records found."
                                )
                            )
                    }
                </td>
            </tr>
        `;

        return;
    }


    paymentBody.innerHTML =
        data
            .map(
                booking => {

                    const status =
                        getPaymentStatus(
                            booking
                        );

                    const total =
                        getTotal(
                            booking
                        );

                    const received =
                        getReceived(
                            booking
                        );

                    const balance =
                        getBalance(
                            booking
                        );


                    return `
                        <tr>

                            <td>
                                <span
                                    class="booking-id"
                                >
                                    ${escapeHTML(
                                        getBookingId(
                                            booking
                                        )
                                    )}
                                </span>
                            </td>


                            <td>

                                <div
                                    class="customer"
                                >

                                    <strong>
                                        ${escapeHTML(
                                            getCustomerName(
                                                booking
                                            )
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHTML(
                                            getCustomerPhone(
                                                booking
                                            )
                                        )}
                                    </span>

                                </div>

                            </td>


                            <td>
                                ${escapeHTML(
                                    getRoute(
                                        booking
                                    )
                                )}
                            </td>


                            <td>

                                <span
                                    class="amount"
                                >
                                    ${money(
                                        total
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="
                                        received
                                        ${
                                            received > 0
                                                ? "green"
                                                : "orange"
                                        }
                                    "
                                >
                                    ${money(
                                        received
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="
                                        balance
                                        ${
                                            balance > 0
                                                ? "red"
                                                : "green"
                                        }
                                    "
                                >
                                    ${money(
                                        balance
                                    )}
                                </span>

                            </td>


                            <td>
                                ${escapeHTML(
                                    paymentMethodLabel(
                                        booking.payment_method
                                    )
                                )}
                            </td>


                            <td>

                                <span
                                    class="
                                        status
                                        ${status}
                                    "
                                >
                                    ${statusLabel(
                                        status
                                    )}
                                </span>

                            </td>


                            <td>
                                ${escapeHTML(
                                    getBookingDate(
                                        booking
                                    )
                                )}
                            </td>


                            <td>

                                <button
                                    type="button"
                                    class="action-button"
                                    data-id="${escapeHTML(
                                        booking.id
                                    )}"
                                    aria-label="Payment actions"
                                >
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
   MOBILE
========================================================= */

function renderMobile(
    data
) {

    if (
        !mobilePayments
    ) {

        return;
    }


    if (
        !data.length
    ) {

        mobilePayments.innerHTML = `
            <div
                style="
                    text-align:center;
                    padding:30px;
                    color:#667085;
                    font-size:12px;
                "
            >
                ${escapeHTML(
                    paymentLoadError ||
                    (
                        allBookings.length
                            ? "No payments match your search or filters."
                            : "No payment records found."
                    )
                )}
            </div>
        `;

        return;
    }


    mobilePayments.innerHTML =
        data
            .map(
                booking => {

                    const status =
                        getPaymentStatus(
                            booking
                        );

                    return `
                        <article
                            class="mobile-payment-card"
                            data-id="${escapeHTML(
                                booking.id
                            )}"
                        >

                            <div
                                class="mobile-payment-top"
                            >

                                <span
                                    class="mobile-payment-id"
                                >
                                    ${escapeHTML(
                                        getBookingId(
                                            booking
                                        )
                                    )}
                                </span>

                                <span
                                    class="
                                        status
                                        ${status}
                                    "
                                >
                                    ${statusLabel(
                                        status
                                    )}
                                </span>

                            </div>


                            <div
                                class="mobile-payment-name"
                            >
                                ${escapeHTML(
                                    getCustomerName(
                                        booking
                                    )
                                )}
                            </div>


                            <div
                                class="mobile-payment-route"
                            >
                                ${escapeHTML(
                                    getRoute(
                                        booking
                                    )
                                )}
                            </div>


                            <div
                                class="mobile-payment-money"
                            >

                                <span>
                                    Amount:
                                    <strong>
                                        ${money(
                                            getTotal(
                                                booking
                                            )
                                        )}
                                    </strong>
                                </span>


                                <span>
                                    Received:
                                    <strong>
                                        ${money(
                                            getReceived(
                                                booking
                                            )
                                        )}
                                    </strong>
                                </span>


                                <span>
                                    Balance:
                                    <strong>
                                        ${money(
                                            getBalance(
                                                booking
                                            )
                                        )}
                                    </strong>
                                </span>

                            </div>

                            <div class="mobile-payment-meta">
                                <span>
                                    Payment Method
                                    <strong>
                                        ${escapeHTML(
                                            paymentMethodLabel(
                                                booking.payment_method
                                            )
                                        )}
                                    </strong>
                                </span>
                                <span>
                                    Date
                                    <strong>
                                        ${escapeHTML(
                                            getBookingDate(booking)
                                        )}
                                    </strong>
                                </span>
                            </div>

                            <button
                                type="button"
                                class="action-button mobile-payment-action"
                                data-id="${escapeHTML(booking.id)}"
                            >
                                View payment details
                            </button>

                        </article>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination(
    totalItems
) {

    if (
        !pageButtons
    ) {

        return;
    }


    const totalPages =
        Math.max(
            Math.ceil(
                totalItems /
                currentRowsPerPage
            ),
            1
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;
    }


    pageButtons.innerHTML =
        "";


    /*
       PREVIOUS
    */

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


    previous.addEventListener(
        "click",
        () => {

            if (
                currentPage > 1
            ) {

                currentPage--;

                render();
            }
        }
    );


    pageButtons.appendChild(
        previous
    );


    /*
       PAGE NUMBERS
    */

    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        if (
            totalPages > 7 &&
            page > 3 &&
            page < totalPages - 2
        ) {

            if (
                page === 4
            ) {

                const dots =
                    document.createElement(
                        "span"
                    );

                dots.textContent =
                    "...";

                dots.style.padding =
                    "7px";

                pageButtons.appendChild(
                    dots
                );
            }

            continue;
        }


        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.textContent =
            page;


        if (
            page === currentPage
        ) {

            button.classList.add(
                "active"
            );
        }


        button.addEventListener(
            "click",
            () => {

                currentPage =
                    page;

                render();
            }
        );


        pageButtons.appendChild(
            button
        );
    }


    /*
       NEXT
    */

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


    next.addEventListener(
        "click",
        () => {

            if (
                currentPage <
                totalPages
            ) {

                currentPage++;

                render();
            }
        }
    );


    pageButtons.appendChild(
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


    const start =
        (
            currentPage - 1
        ) *
        currentRowsPerPage;


    const end =
        Math.min(
            start +
            currentRowsPerPage,
            total
        );


    const pageData =
        filtered.slice(
            start,
            end
        );


    renderTable(
        pageData
    );


    renderMobile(
        pageData
    );


    renderPagination(
        total
    );


    if (
        showingText
    ) {

        showingText.textContent =
            total === 0
                ? "Showing 0 to 0 of 0 payments"
                : `Showing ${
                    start + 1
                  } to ${
                    end
                  } of ${
                    total
                  } payments`;
    }
}


/* =========================================================
   FIND BOOKING
========================================================= */

async function getBookingById(
    id
) {

    if (
        !checkSupabase()
    ) {

        return null;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("bookings")
            .select(
                getPaymentSelect()
            )
            .eq(
                "id",
                id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Unable to load booking:",
            error
        );

        return null;
    }


    return data;
}


/* =========================================================
   OPEN DETAILS
========================================================= */

async function openDetails(
    id
) {

    const booking =
        await getBookingById(
            id
        );


    if (!booking) {

        showToast(
            "Booking could not be found."
        );

        return;
    }


    const total =
        getTotal(
            booking
        );

    const received =
        getReceived(
            booking
        );

    const balance =
        getBalance(
            booking
        );

    const status =
        getPaymentStatus(
            booking
        );


    if (
        drawerBookingId
    ) {

        drawerBookingId.textContent =
            getBookingId(
                booking
            );
    }


    if (
        !drawerContent
    ) {

        return;
    }


    drawerContent.innerHTML = `

        <div
            class="detail-section"
        >

            <h3>
                Booking Information
            </h3>


            <div
                class="detail-row"
            >
                <span>
                    Booking ID
                </span>

                <strong>
                    ${escapeHTML(
                        getBookingId(
                            booking
                        )
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    Customer
                </span>

                <strong>
                    ${escapeHTML(
                        getCustomerName(
                            booking
                        )
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    Phone
                </span>

                <strong>
                    ${escapeHTML(
                        getCustomerPhone(
                            booking
                        )
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    Route
                </span>

                <strong>
                    ${escapeHTML(
                        getRoute(
                            booking
                        )
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    Booking Date
                </span>

                <strong>
                    ${escapeHTML(
                        getBookingDate(
                            booking
                        )
                    )}
                </strong>
            </div>

        </div>


        <div
            class="detail-section"
        >

            <h3>
                Billing Breakdown
            </h3>


            <div
                class="detail-row"
            >
                <span>
                    Base Price
                </span>

                <strong>
                    ${money(
                        booking.base_price
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    Distance Charge
                </span>

                <strong>
                    ${money(
                        booking.distance_charge
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    Handling Charge
                </span>

                <strong>
                    ${money(
                        booking.handling_charge
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    GST
                </span>

                <strong>
                    ${money(
                        booking.gst_amount
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    Service Charge
                </span>

                <strong>
                    ${money(
                        booking.service_charge
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    Total Amount
                </span>

                <strong>
                    ${money(
                        total
                    )}
                </strong>
            </div>

        </div>


        <div
            class="detail-section"
        >

            <h3>
                Payment Summary
            </h3>


            <div
                class="detail-row"
            >
                <span>
                    Status
                </span>

                <strong>
                    ${statusLabel(
                        status
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    Payment Method
                </span>

                <strong>
                    ${escapeHTML(
                        paymentMethodLabel(
                            booking.payment_method
                        )
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    Amount Received
                </span>

                <strong>
                    ${money(
                        received
                    )}
                </strong>
            </div>


            <div
                class="detail-row"
            >
                <span>
                    Balance Amount
                </span>

                <strong>
                    ${money(
                        balance
                    )}
                </strong>
            </div>

        </div>


        <div
            class="drawer-actions"
        >

            <button
                type="button"
                class="primary-button"
                id="drawerRecordPayment"
            >
                Record / Update Payment
            </button>


            <a
                href="download-bill.html?id=${encodeURIComponent(
                    booking.id
                )}"
                class="secondary-button"
            >
                Download Bill
            </a>

        </div>
    `;


    const recordButton =
        document.getElementById(
            "drawerRecordPayment"
        );


    if (
        recordButton
    ) {

        recordButton.addEventListener(
            "click",
            () => {

                closeDrawerPanel();

                openPaymentModal(
                    booking
                );
            }
        );
    }


    if (
        drawerOverlay
    ) {

        drawerOverlay.classList.add(
            "show"
        );
    }
}


/* =========================================================
   CLOSE DRAWER
========================================================= */

function closeDrawerPanel() {

    if (
        drawerOverlay
    ) {

        drawerOverlay.classList.remove(
            "show"
        );
    }
}


/* =========================================================
   OPEN PAYMENT MODAL
========================================================= */

function openPaymentModal(
    booking
) {

    currentPaymentId =
        booking.id;


    if (
        modalBookingId
    ) {

        modalBookingId.textContent =
            getBookingId(
                booking
            );
    }


    if (
        modalTotal
    ) {

        modalTotal.value =
            money(
                getTotal(
                    booking
                )
            );
    }


    if (
        modalMethod
    ) {

        modalMethod.value =
            booking.payment_method ||
            "";
    }


    if (
        modalReceived
    ) {

        modalReceived.value =
            getReceived(
                booking
            );
    }


    const status =
        getPaymentStatus(
            booking
        );


    if (
        modalStatus
    ) {

        switch (
            status
        ) {

            case "paid":

                modalStatus.value =
                    "Payment Received";

                break;


            case "partial":

                modalStatus.value =
                    "Partial";

                break;


            case "refunded":

                modalStatus.value =
                    "Payment Refunded";

                break;


            case "failed":

                modalStatus.value =
                    "Payment Failed";

                break;


            case "cancelled":

                modalStatus.value =
                    "Payment Cancelled";

                break;


            default:

                modalStatus.value =
                    "Payment Pending";
        }
    }


    if (
        paymentModal
    ) {

        paymentModal.classList.add(
            "show"
        );
    }
}


/* =========================================================
   CLOSE PAYMENT MODAL
========================================================= */

function closePaymentModalPanel() {

    if (
        paymentModal
    ) {

        paymentModal.classList.remove(
            "show"
        );
    }


    currentPaymentId =
        null;
}


/* =========================================================
   CONVERT UI STATUS TO DATABASE STATUS
========================================================= */

function databasePaymentStatus(
    uiStatus,
    received,
    total
) {

    const value =
        String(
            uiStatus || ""
        ).toLowerCase();


    if (
        value.includes("refunded")
    ) {

        return "refunded";
    }


    if (
        value.includes("failed")
    ) {

        return "failed";
    }


    if (
        value.includes("cancelled")
    ) {

        return "cancelled";
    }


    if (
        value.includes("received")
    ) {

        return "paid";
    }


    if (
        value.includes("partial")
    ) {

        return "partially_paid";
    }


    if (
        total > 0 &&
        received >= total
    ) {

        return "paid";
    }


    if (
        received > 0
    ) {

        return "partially_paid";
    }


    return "pending";
}


/* =========================================================
   UPDATE PAYMENT IN SUPABASE
========================================================= */

async function updatePayment() {

    if (
        !currentPaymentId
    ) {

        return;
    }


    if (
        !checkSupabase()
    ) {

        return;
    }


    const booking =
        await getBookingById(
            currentPaymentId
        );


    if (!booking) {

        showToast(
            "Booking not found."
        );

        return;
    }


    const total =
        getTotal(
            booking
        );


    const received =
        numberValue(
            modalReceived?.value
        );


    /*
       VALIDATION
    */

    if (
        received < 0
    ) {

        showToast(
            "Amount cannot be negative."
        );

        return;
    }


    if (
        total > 0 &&
        received > total
    ) {

        showToast(
            "Received amount cannot exceed total amount."
        );

        return;
    }


    const paymentMethod =
        modalMethod?.value ||
        null;


    const paymentStatus =
        databasePaymentStatus(
            modalStatus?.value,
            received,
            total
        );


    const updateData = {

        payment_method:
            paymentMethod,

        received_amount:
            received,

        payment_status:
            paymentStatus,

        updated_at:
            new Date().toISOString()
    };


    /*
       DATABASE UPDATE
    */

    savePayment.disabled =
        true;


    try {

        const {
            error
        } =
            await supabaseClient
                .from("bookings")
                .update(
                    updateData
                )
                .eq(
                    "id",
                    currentPaymentId
                );


        if (
            error
        ) {

            console.error(
                "Supabase payment update error:",
                error
            );

            throw error;
        }


        /*
           Close modal
        */

        closePaymentModalPanel();


        /*
           Reload fresh database data
        */

        await loadBookings();


        showToast(
            "Payment updated successfully."
        );


    } catch (error) {

        console.error(
            "Payment update failed:",
            error
        );


        showToast(
            error?.message ||
            "Unable to update payment."
        );


    } finally {

        savePayment.disabled =
            false;
    }
}


/* =========================================================
   SEARCH EVENTS
========================================================= */

if (
    paymentSearch
) {

    paymentSearch.addEventListener(
        "input",
        () => {

            currentPage =
                1;

            render();
        }
    );
}


if (
    searchInput
) {

    searchInput.addEventListener(
        "input",
        () => {

            currentPage =
                1;

            render();
        }
    );
}


/* =========================================================
   STATUS FILTER
========================================================= */

if (
    statusFilter
) {

    statusFilter.addEventListener(
        "change",
        () => {

            currentFilter =
                statusFilter.value;

            currentPage =
                1;


            document
                .querySelectorAll(
                    ".payment-tab"
                )
                .forEach(
                    button => {

                        button.classList.toggle(
                            "active",
                            button.dataset.filter ===
                            currentFilter
                        );
                    }
                );


            render();
        }
    );
}


/* =========================================================
   METHOD FILTER
========================================================= */

if (
    methodFilter
) {

    methodFilter.addEventListener(
        "change",
        () => {

            currentPage =
                1;

            render();
        }
    );
}


/* =========================================================
   PAYMENT TABS
========================================================= */

document
    .querySelectorAll(
        ".payment-tab"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    currentFilter =
                        button.dataset.filter ||
                        "";


                    if (
                        statusFilter
                    ) {

                        statusFilter.value =
                            currentFilter;
                    }


                    document
                        .querySelectorAll(
                            ".payment-tab"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "active"
                                );
                            }
                        );


                    button.classList.add(
                        "active"
                    );


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

if (
    resetButton
) {

    resetButton.addEventListener(
        "click",
        () => {

            if (
                paymentSearch
            ) {

                paymentSearch.value =
                    "";
            }


            if (
                searchInput
            ) {

                searchInput.value =
                    "";
            }


            if (
                statusFilter
            ) {

                statusFilter.value =
                    "";
            }


            if (
                methodFilter
            ) {

                methodFilter.value =
                    "";
            }


            currentFilter =
                "";

            currentPage =
                1;


            document
                .querySelectorAll(
                    ".payment-tab"
                )
                .forEach(
                    button => {

                        button.classList.toggle(
                            "active",
                            button.dataset.filter ===
                            ""
                        );
                    }
                );


            render();
        }
    );
}


/* =========================================================
   ROWS PER PAGE
========================================================= */

if (
    rowsPerPage
) {

    rowsPerPage.addEventListener(
        "change",
        () => {

            currentRowsPerPage =
                Number(
                    rowsPerPage.value
                ) || 10;

            currentPage =
                1;

            render();
        }
    );
}


/* =========================================================
   TABLE / MOBILE CLICK
========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".action-button"
            );


        if (
            button
        ) {

            const id =
                button.dataset.id;


            if (
                id
            ) {

                openDetails(
                    id
                );
            }


            return;
        }


        const mobileCard =
            event.target.closest(
                ".mobile-payment-card"
            );


        if (
            mobileCard
        ) {

            const id =
                mobileCard.dataset.id;


            if (
                id
            ) {

                openDetails(
                    id
                );
            }
        }
    }
);


/* =========================================================
   DRAWER CLOSE
========================================================= */

if (
    closeDrawer
) {

    closeDrawer.addEventListener(
        "click",
        closeDrawerPanel
    );
}


if (
    drawerOverlay
) {

    drawerOverlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                drawerOverlay
            ) {

                closeDrawerPanel();
            }
        }
    );
}


/* =========================================================
   PAYMENT MODAL CLOSE
========================================================= */

if (
    closePaymentModal
) {

    closePaymentModal.addEventListener(
        "click",
        closePaymentModalPanel
    );
}


if (
    cancelPayment
) {

    cancelPayment.addEventListener(
        "click",
        closePaymentModalPanel
    );
}


if (
    savePayment
) {

    savePayment.addEventListener(
        "click",
        updatePayment
    );
}


if (
    paymentModal
) {

    paymentModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                paymentModal
            ) {

                closePaymentModalPanel();
            }
        }
    );
}


/* =========================================================
   SIDEBAR
========================================================= */

if (
    sidebar &&
    sidebarToggle
) {

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

                sidebar.classList.remove(
                    "collapsed"
                );

            } else {

                sidebar.classList.toggle(
                    "collapsed"
                );

                sidebar.classList.remove(
                    "open"
                );
            }
        }
    );
}


/* =========================================================
   CLOSE MOBILE SIDEBAR
========================================================= */

if (
    sidebar
) {

    sidebar.addEventListener(
        "click",
        event => {

            if (
                window.innerWidth <=
                800 &&
                event.target.closest(
                    ".nav-item"
                )
            ) {

                sidebar.classList.remove(
                    "open"
                );
            }
        }
    );
}


/* =========================================================
   RESPONSIVE SIDEBAR CLEANUP
========================================================= */

window.addEventListener(
    "resize",
    () => {

        if (
            !sidebar
        ) {

            return;
        }


        if (
            window.innerWidth >
            800
        ) {

            sidebar.classList.remove(
                "open"
            );

        } else {

            sidebar.classList.remove(
                "collapsed"
            );
        }
    }
);


/* =========================================================
   NOTIFICATION
========================================================= */

if (
    notificationButton
) {

    notificationButton.addEventListener(
        "click",
        () => {

            showToast(
                "Notifications"
            );
        }
    );
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (
        !toast
    ) {

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
   SUPABASE AUTH CHECK
========================================================= */

async function verifyAdminSession() {

    if (
        !checkSupabase()
    ) {

        return false;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getUser();


        if (
            error ||
            !data?.user
        ) {

            window.location.href =
                "../index.html";

            return false;
        }


        /*
           Verify that the logged-in user
           is actually an SSP admin.
        */

        const {
            data: profile,
            error: profileError
        } =
            await supabaseClient
                .from("profiles")
                .select(
                    "id, role, status"
                )
                .eq(
                    "id",
                    data.user.id
                )
                .maybeSingle();


        if (
            profileError
        ) {

            console.error(
                "Unable to verify admin profile:",
                profileError
            );

            showToast(
                "Unable to verify admin account."
            );

            return false;
        }


        if (
            !profile ||
            profile.role !== "admin" ||
            profile.status !== "active"
        ) {

            showToast(
                "Admin access is required."
            );


            setTimeout(
                () => {

                    window.location.href =
                        "../index.html";

                },
                1200
            );


            return false;
        }


        return true;


    } catch (error) {

        console.error(
            "Admin session verification failed:",
            error
        );

        return false;
    }
}


/* =========================================================
   INITIALIZE PAYMENT PAGE
========================================================= */

async function initializePaymentPage() {

    const authenticated =
        await verifyAdminSession();


    if (
        !authenticated
    ) {

        return;
    }

    await window.SSPAdminSettings.get();

    await loadBookings();
}


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePaymentPage
    );

} else {

    initializePaymentPage();
}