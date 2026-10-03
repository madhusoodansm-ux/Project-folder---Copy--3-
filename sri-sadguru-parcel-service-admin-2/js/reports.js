/* =========================================================
   REPORTS
   Sri Sadguru Siddarooda Parcel Service
   REAL SUPABASE DATABASE VERSION

   DATA SOURCES
   ---------------------------------------------------------
   bookings
   customer_details
   drivers
   profiles

   IMPORTANT
   ---------------------------------------------------------
   No localStorage is used.
   No demo booking data is created.
   No demo customer data is created.
   No demo driver data is created.

   Real relationships:

   profiles
       ↓
   customer_details
       ↓
   bookings

   profiles
       ↓
   drivers
       ↓
   bookings
   ========================================================= */

"use strict";


/* =========================================================
   SUPABASE
   ========================================================= */

const reportsSupabase =
    window.supabaseClient;


/* =========================================================
   DOM
   ========================================================= */

const sidebar =
    document.getElementById("sidebar");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const mobileMenuButton =
    document.getElementById("mobileMenuButton");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");


const startDate =
    document.getElementById("startDate");

const endDate =
    document.getElementById("endDate");

const statusFilter =
    document.getElementById("statusFilter");

const applyFilterButton =
    document.getElementById("applyFilterButton");

const resetFilterButton =
    document.getElementById("resetFilterButton");

const filterError =
    document.getElementById("filterError");


const printReportButton =
    document.getElementById("printReportButton");

const exportReportButton =
    document.getElementById("exportReportButton");


const reportPeriodLabel =
    document.getElementById("reportPeriodLabel");

const reportGeneratedAt =
    document.getElementById("reportGeneratedAt");

const reportLoadError =
    document.getElementById("reportLoadError");


/* =========================================================
   SUMMARY
   ========================================================= */

const totalBookings =
    document.getElementById("totalBookings");

const deliveredBookings =
    document.getElementById("deliveredBookings");

const activeBookings =
    document.getElementById("activeBookings");

const totalRevenue =
    document.getElementById("totalRevenue");

const paidAmount =
    document.getElementById("paidAmount");

const totalCustomers =
    document.getElementById("totalCustomers");


/* =========================================================
   STATUS
   ========================================================= */

const statusReportList =
    document.getElementById("statusReportList");


/* =========================================================
   PAYMENT
   ========================================================= */

const paymentTotal =
    document.getElementById("paymentTotal");

const paymentPaid =
    document.getElementById("paymentPaid");

const paymentPending =
    document.getElementById("paymentPending");

const paymentRecordCount =
    document.getElementById("paymentRecordCount");


/* =========================================================
   DELIVERY
   ========================================================= */

const deliveryDelivered =
    document.getElementById("deliveryDelivered");

const deliveryTransit =
    document.getElementById("deliveryTransit");

const deliveryOutForDelivery =
    document.getElementById("deliveryOutForDelivery");

const deliveryPending =
    document.getElementById("deliveryPending");

const deliveryDeliveredBar =
    document.getElementById("deliveryDeliveredBar");

const deliveryTransitBar =
    document.getElementById("deliveryTransitBar");

const deliveryOutForDeliveryBar =
    document.getElementById("deliveryOutForDeliveryBar");

const deliveryPendingBar =
    document.getElementById("deliveryPendingBar");


/* =========================================================
   DRIVER
   ========================================================= */

const driverReportBody =
    document.getElementById("driverReportBody");

const driverEmptyState =
    document.getElementById("driverEmptyState");


/* =========================================================
   CUSTOMER
   ========================================================= */

const customerReportBody =
    document.getElementById("customerReportBody");

const customerEmptyState =
    document.getElementById("customerEmptyState");


/* =========================================================
   BOOKING
   ========================================================= */

const bookingReportBody =
    document.getElementById("bookingReportBody");

const bookingEmptyState =
    document.getElementById("bookingEmptyState");

const bookingRecordCount =
    document.getElementById("bookingRecordCount");


/* =========================================================
   TOAST
   ========================================================= */

const toast =
    document.getElementById("toast");

const toastIcon =
    document.getElementById("toastIcon");

const toastTitle =
    document.getElementById("toastTitle");

const toastMessage =
    document.getElementById("toastMessage");

const closeToast =
    document.getElementById("closeToast");


/* =========================================================
   STATE
   ========================================================= */

let allBookings = [];

let filteredBookings = [];

let allCustomers = {};

let allDrivers = {};

let allProfiles = {};

let currentReport = null;

let toastTimer = null;

let reportDataState = "loading";


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        setupEvents();

        setupSidebar();

        updateGeneratedTime();


        if (!reportsSupabase) {

            renderReportLoadError(
                new Error(
                    "Supabase client could not be loaded."
                )
            );

            return;
        }

        try {
            if (
                typeof window.requireAdminAuth !==
                "function"
            ) {
                throw new Error(
                    "Shared Admin authentication is unavailable."
                );
            }

            const adminAccess =
                await window.requireAdminAuth();

            if (!adminAccess) {
                return;
            }

            await loadReportData();

            reportDataState = "loaded";
            filteredBookings =
                allBookings.slice();

            renderReport();
        } catch (error) {
            renderReportLoadError(error);
        }

    }
);


function renderReportLoadError(error) {

    reportDataState = "error";

    console.error(
        "SSP Reports data load failed:",
        error?.message || error,
        {
            details: error?.details,
            hint: error?.hint,
            code: error?.code
        }
    );

    if (reportLoadError) {
        reportLoadError.hidden = false;
        reportLoadError.textContent =
            "Reports could not be loaded. Please check your Admin session or connection and try again.";
    }

    [
        totalBookings,
        deliveredBookings,
        activeBookings,
        totalRevenue,
        paidAmount,
        totalCustomers,
        paymentTotal,
        paymentPaid,
        paymentPending
    ].forEach(element => {
        if (element) {
            element.textContent = "—";
        }
    });

    if (paymentRecordCount) {
        paymentRecordCount.textContent =
            "Unavailable";
    }

    if (bookingRecordCount) {
        bookingRecordCount.textContent =
            "Unavailable";
    }

    if (statusReportList) {
        statusReportList.innerHTML =
            '<div class="empty-state show">Report data is unavailable.</div>';
    }

    [
        [driverReportBody, driverEmptyState],
        [customerReportBody, customerEmptyState],
        [bookingReportBody, bookingEmptyState]
    ].forEach(([body, emptyState]) => {
        if (body) {
            body.innerHTML = "";
        }

        if (emptyState) {
            emptyState.textContent =
                "Report data is unavailable because loading failed.";
            emptyState.classList.add("show");
        }
    });

    showToast(
        "Report Error",
        "Unable to load report data. Please check your Admin session or connection.",
        true
    );
}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    if (mobileMenuButton) {

        mobileMenuButton.addEventListener(
            "click",
            openSidebar
        );

    }


    if (sidebarToggle) {

        sidebarToggle.addEventListener(
            "click",
            closeSidebar
        );

    }


    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            closeSidebar
        );

    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {

                closeSidebar();

                hideToast();

            }

        }
    );


    if (applyFilterButton) {

        applyFilterButton.addEventListener(
            "click",
            applyFilters
        );

    }


    if (resetFilterButton) {

        resetFilterButton.addEventListener(
            "click",
            resetFilters
        );

    }


    if (printReportButton) {

        printReportButton.addEventListener(
            "click",
            printReport
        );

    }


    if (exportReportButton) {

        exportReportButton.addEventListener(
            "click",
            exportCSV
        );

    }


    if (closeToast) {

        closeToast.addEventListener(
            "click",
            hideToast
        );

    }

}


/* =========================================================
   SIDEBAR
   ========================================================= */

function setupSidebar() {

    if (!sidebar) {
        return;
    }

}


function openSidebar() {

    if (!sidebar) {
        return;
    }

    sidebar.classList.add("open");

    if (sidebarOverlay) {

        sidebarOverlay.classList.add("show");

    }

    document.body.style.overflow =
        "hidden";

}


function closeSidebar() {

    if (!sidebar) {
        return;
    }

    sidebar.classList.remove("open");

    if (sidebarOverlay) {

        sidebarOverlay.classList.remove("show");

    }

    document.body.style.overflow =
        "";

}


/* =========================================================
   LOAD ALL REAL DATABASE DATA
   ========================================================= */

async function loadReportData() {

    await loadBookings();

    const relatedDataLoads = [
        ["customer details", loadCustomers],
        ["drivers", loadDrivers],
        ["profiles", loadProfiles]
    ];

    const results = await Promise.allSettled(
        relatedDataLoads.map(([, load]) => load())
    );

    const failedLoads = [];

    results.forEach((result, index) => {
        const [name] = relatedDataLoads[index];
        const error =
            result.status === "rejected"
                ? result.reason
                : result.value?.error;

        if (error) {
            failedLoads.push(name);
            console.error(
                `Reports ${name} data could not be loaded; booking results remain available:`,
                error
            );
        }
    });

    if (failedLoads.length) {
        showToast(
            "Partial Report Data",
            `Bookings loaded, but ${failedLoads.join(", ")} data could not be loaded.`,
            true
        );
    }

    console.log(
        "SSP Reports database data loaded:",
        {
            bookings:
                allBookings.length,

            customers:
                Object.keys(allCustomers).length,

            drivers:
                Object.keys(allDrivers).length,

            profiles:
                Object.keys(allProfiles).length
        }
    );

}


/* =========================================================
   LOAD BOOKINGS
   ========================================================= */

async function loadBookings() {

    const {
        data,
        error
    } =
        await reportsSupabase
            .from("bookings")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Bookings query failed:",
            error
        );

        throw error;

    }


    allBookings =
        Array.isArray(data)
            ? data
            : [];

}


/* =========================================================
   LOAD CUSTOMER DETAILS
   ========================================================= */

async function loadCustomers() {

    const {
        data,
        error
    } =
        await reportsSupabase
            .from("customer_details")
            .select("*");


    if (error) {

        console.error(
            "Customer details could not be loaded:",
            error
        );

        throw error;

    }


    allCustomers = {};


    (data || []).forEach(
        function (customer) {

            [
                customer.user_id,
                customer.profile_id,
                customer.customer_id,
                customer.id
            ].forEach(id => {
                const normalizedId =
                    String(id || "").trim();

                if (normalizedId) {
                    allCustomers[normalizedId] =
                        customer;
                }
            });

        }
    );

}
                                                                                          

/* =========================================================
   LOAD DRIVERS
   ========================================================= */

async function loadDrivers() {

    const {
        data,
        error
    } =
        await reportsSupabase
            .from("drivers")
            .select("*");


    if (error) {

        console.error(
            "Drivers query failed:",
            error
        );

        throw error;

    }


    allDrivers = {};


    (data || []).forEach(
        function (driver) {

            const databaseId =
                String(
                    driver.id ||
                    ""
                ).trim();


            const publicDriverId =
                String(
                    driver.driver_id ||
                    ""
                ).trim();


            /*
             * Store using database UUID.
             */

            if (databaseId) {

                allDrivers[
                    databaseId
                ] = driver;

            }


            /*
             * Also store using the exact public
             * driver_id.
             *
             * We never modify or generate this ID.
             */

            if (publicDriverId) {

                allDrivers[
                    publicDriverId
                ] = driver;

            }

        }
    );

}


/* =========================================================
   LOAD PROFILES
   ========================================================= */

async function loadProfiles() {

    const {
        data,
        error
    } =
        await reportsSupabase
            .from("profiles")
            .select(
                "id, email, phone, full_name, role, status"
            );


    if (error) {

        console.error(
            "Profiles could not be loaded:",
            error
        );

        throw error;

    }


    allProfiles = {};


    (data || []).forEach(
        function (profile) {

            if (!profile.id) {
                return;
            }


            allProfiles[
                String(profile.id)
            ] = profile;

        }
    );

}


/* =========================================================
   FILTERS
   ========================================================= */

function applyFilters() {

    if (reportDataState !== "loaded") {
        showToast(
            "Report Unavailable",
            reportDataState === "loading"
                ? "Please wait for report data to finish loading."
                : "Report data did not load successfully.",
            true
        );
        return;
    }

    if (!startDate || !endDate) {
        return;
    }


    filterError.textContent = "";


    const start =
        startDate.value;

    const end =
        endDate.value;


    if (
        start &&
        end &&
        start > end
    ) {

        filterError.textContent =
            "Start date cannot be later than end date.";

        return;

    }


    filteredBookings =
        getFilteredBookings(
            allBookings,
            start,
            end,
            statusFilter
                ? statusFilter.value
                : "all"
        );


    renderReport();


    showToast(
        "Report Updated",
        "Report filters have been applied."
    );

}


/* =========================================================
   RESET FILTERS
   ========================================================= */

function resetFilters() {

    if (startDate) {
        startDate.value = "";
    }


    if (endDate) {
        endDate.value = "";
    }


    if (statusFilter) {
        statusFilter.value = "all";
    }


    if (filterError) {
        filterError.textContent = "";
    }

    if (reportDataState !== "loaded") {
        showToast(
            "Report Unavailable",
            reportDataState === "loading"
                ? "Please wait for report data to finish loading."
                : "Report data did not load successfully.",
            true
        );
        return;
    }

    filteredBookings =
        allBookings.slice();


    renderReport();


    showToast(
        "Filters Reset",
        "The report now includes all available bookings."
    );

}


/* =========================================================
   FILTER BOOKINGS
   ========================================================= */

function getFilteredBookings(
    bookings,
    start,
    end,
    status
) {

    return bookings.filter(
        function (booking) {

            const bookingDate =
                getBookingDate(
                    booking
                );


            if (start) {

                if (
                    !bookingDate ||
                    bookingDate < start
                ) {

                    return false;

                }

            }


            if (end) {

                if (
                    !bookingDate ||
                    bookingDate > end
                ) {

                    return false;

                }

            }


            if (
                status &&
                status !== "all"
            ) {

                const bookingStatus =
                    normalizeStatus(
                        getBookingStatus(
                            booking
                        )
                    );


                if (
                    bookingStatus !==
                    normalizeStatus(status)
                ) {

                    return false;

                }

            }


            return true;

        }
    );

}


/* =========================================================
   RENDER REPORT
   ========================================================= */

function renderReport() {

    if (reportDataState !== "loaded") {
        return;
    }

    if (!Array.isArray(filteredBookings)) {

        filteredBookings =
            [];

    }


    currentReport =
        buildReportData(
            filteredBookings
        );


    renderSummary(
        currentReport
    );

    renderStatusReport(
        currentReport
    );

    renderPaymentReport(
        currentReport
    );

    renderDeliveryReport(
        currentReport
    );

    renderDriverReport(
        currentReport
    );

    renderCustomerReport(
        currentReport
    );

    renderBookingReport(
        currentReport
    );

    updatePeriodLabel();

}


/* =========================================================
   ACTIVE FILTER CHECK
   ========================================================= */

function hasActiveFilters() {

    return Boolean(

        startDate &&
        (
            startDate.value
        )

        ||

        endDate &&
        (
            endDate.value
        )

        ||

        statusFilter &&
        statusFilter.value &&
        statusFilter.value !== "all"

    );

}


/* =========================================================
   BUILD REPORT
   ========================================================= */

function buildReportData(bookings) {

    const report = {

        totalBookings:
            bookings.length,

        delivered:
            0,

        active:
            0,

        totalRevenue:
            0,

        paidAmount:
            0,

        pendingPayment:
            0,

        paymentRecords:
            0,

        statuses: {},

        delivery: {

            delivered:
                0,

            transit:
                0,

            outForDelivery:
                0,

            pending:
                0

        },

        drivers: {},

        customers: {},

        uniqueCustomers:
            new Set()

    };


    /*
     * Include all real drivers in the report,
     * even if they currently have zero bookings.
     *
     * This is important for the future Driver Portal.
     */

    Object.values(
        getUniqueDrivers()
    ).forEach(
        function (driver) {

            const driverId =
                getDriverPublicId(
                    driver
                );


            const driverName =
                getDriverName(
                    driver
                );


            if (!driverId) {
                return;
            }


            report.drivers[
                driverId
            ] = {

                id:
                    driverId,

                name:
                    driverName,

                bookings:
                    0,

                delivered:
                    0,

                active:
                    0

            };

        }
    );


    bookings.forEach(
        function (booking) {

            /* =================================================
               STATUS
               ================================================= */

            const status =
                getBookingStatus(
                    booking
                );


            const normalized =
                normalizeStatus(
                    status
                );


            const displayStatus =
                formatStatus(
                    status
                );


            report.statuses[
                displayStatus
            ] =
                (
                    report.statuses[
                        displayStatus
                    ] || 0
                ) + 1;


            /* =================================================
               DELIVERY
               ================================================= */

            if (
                normalized ===
                "delivered"
            ) {

                report.delivered++;

                report.delivery.delivered++;

            }

            else if (
                normalized ===
                "in transit"
            ) {

                report.active++;

                report.delivery.transit++;

            }

            else if (
                normalized ===
                "out for delivery"
            ) {

                report.active++;

                report.delivery.outForDelivery++;

            }

            else if (
                normalized !==
                    "cancelled"
            ) {

                report.active++;

                report.delivery.pending++;

            }


            /* =================================================
               PAYMENT
               ================================================= */

            const amount =
                getAmount(
                    booking
                );


            const paid =
                getPaidAmount(
                    booking,
                    amount
                );


            report.totalRevenue +=
                amount;


            report.paidAmount +=
                paid;


            report.pendingPayment +=
                Math.max(
                    amount - paid,
                    0
                );


            if (
                amount > 0 ||
                getRawPaymentStatus(
                    booking
                )
            ) {

                report.paymentRecords++;

            }


            /* =================================================
               CUSTOMER
               ================================================= */

            const customer =
                getBookingCustomer(
                    booking
                );


            const customerId =
                getCustomerId(
                    booking,
                    customer
                );


            const customerName =
                getCustomerName(
                    booking,
                    customer
                );


            if (customerId) {

                report.uniqueCustomers.add(
                    customerId
                );

            }


            if (
                customerId ||
                customerName
            ) {

                const key =
                    customerId ||
                    customerName;


                if (
                    !report.customers[key]
                ) {

                    report.customers[key] = {

                        id:
                            customerId ||
                            "—",

                        name:
                            customerName ||
                            "Unknown Customer",

                        bookings:
                            0,

                        delivered:
                            0,

                        spent:
                            0

                    };

                }


                report.customers[key].bookings++;


                if (
                    normalized ===
                    "delivered"
                ) {

                    report.customers[key].delivered++;

                }


                report.customers[key].spent +=
                    amount;

            }


            /* =================================================
               DRIVER
               ================================================= */

            const driver =
                getBookingDriver(
                    booking
                );


            if (driver) {

                const driverId =
                    getDriverPublicId(
                        driver
                    ) ||
                    getBookingDriverId(
                        booking
                    );


                const driverName =
                    getDriverName(
                        driver
                    );


                if (driverId) {

                    if (
                        !report.drivers[
                            driverId
                        ]
                    ) {

                        report.drivers[
                            driverId
                        ] = {

                            id:
                                driverId,

                            name:
                                driverName,

                            bookings:
                                0,

                            delivered:
                                0,

                            active:
                                0

                        };

                    }


                    report.drivers[
                        driverId
                    ].bookings++;


                    if (
                        normalized ===
                        "delivered"
                    ) {

                        report.drivers[
                            driverId
                        ].delivered++;

                    }


                    if (
                        normalized !==
                            "delivered" &&
                        normalized !==
                            "cancelled"
                    ) {

                        report.drivers[
                            driverId
                        ].active++;

                    }

                }

            }

        }
    );


    return report;

}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderSummary(report) {

    if (totalBookings) {

        totalBookings.textContent =
            formatNumber(
                report.totalBookings
            );

    }


    if (deliveredBookings) {

        deliveredBookings.textContent =
            formatNumber(
                report.delivered
            );

    }


    if (activeBookings) {

        activeBookings.textContent =
            formatNumber(
                report.active
            );

    }


    if (totalRevenue) {

        totalRevenue.textContent =
            formatCurrency(
                report.totalRevenue
            );

    }


    if (paidAmount) {

        paidAmount.textContent =
            formatCurrency(
                report.paidAmount
            );

    }


    if (totalCustomers) {

        totalCustomers.textContent =
            formatNumber(
                report.uniqueCustomers.size
            );

    }

}


/* =========================================================
   STATUS REPORT
   ========================================================= */

function renderStatusReport(report) {

    if (!statusReportList) {
        return;
    }


    statusReportList.innerHTML =
        "";


    const entries =
        Object.entries(
            report.statuses
        );


    if (!entries.length) {

        statusReportList.innerHTML =
            `
            <div class="empty-state show">
                No booking status data available.
            </div>
            `;

        return;

    }


    entries.sort(
        function (a, b) {

            return b[1] - a[1];

        }
    );


    entries.forEach(
        function ([status, count]) {

            const percentage =
                report.totalBookings > 0
                    ?
                    (
                        count /
                        report.totalBookings
                    ) * 100
                    :
                    0;


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "status-report-item";


            item.innerHTML =
                `

                <span class="status-name">
                    ${escapeHTML(status)}
                </span>

                <div class="status-track">

                    <div
                        class="status-progress"
                        style="width:${percentage}%">
                    </div>

                </div>

                <span class="status-count">
                    ${count}
                </span>

                `;


            statusReportList.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   PAYMENT REPORT
   ========================================================= */

function renderPaymentReport(report) {

    if (paymentTotal) {

        paymentTotal.textContent =
            formatCurrency(
                report.totalRevenue
            );

    }


    if (paymentPaid) {

        paymentPaid.textContent =
            formatCurrency(
                report.paidAmount
            );

    }


    if (paymentPending) {

        paymentPending.textContent =
            formatCurrency(
                report.pendingPayment
            );

    }


    if (paymentRecordCount) {

        paymentRecordCount.textContent =
            formatNumber(
                report.paymentRecords
            );

    }

}


/* =========================================================
   DELIVERY REPORT
   ========================================================= */

function renderDeliveryReport(report) {

    const total =
        report.totalBookings ||
        0;


    if (deliveryDelivered) {

        deliveryDelivered.textContent =
            report.delivery.delivered;

    }


    if (deliveryTransit) {

        deliveryTransit.textContent =
            report.delivery.transit;

    }


    if (deliveryOutForDelivery) {

        deliveryOutForDelivery.textContent =
            report.delivery.outForDelivery;

    }


    if (deliveryPending) {

        deliveryPending.textContent =
            report.delivery.pending;

    }


    setProgress(
        deliveryDeliveredBar,
        report.delivery.delivered,
        total
    );


    setProgress(
        deliveryTransitBar,
        report.delivery.transit,
        total
    );


    setProgress(
        deliveryOutForDeliveryBar,
        report.delivery.outForDelivery,
        total
    );


    setProgress(
        deliveryPendingBar,
        report.delivery.pending,
        total
    );

}


/* =========================================================
   PROGRESS
   ========================================================= */

function setProgress(
    element,
    value,
    total
) {

    if (!element) {
        return;
    }


    const percentage =
        total > 0
            ?
            (
                value /
                total
            ) * 100
            :
            0;


    element.style.width =
        `${Math.min(
            Math.max(
                percentage,
                0
            ),
            100
        )}%`;

}


/* =========================================================
   DRIVER REPORT
   ========================================================= */

function renderDriverReport(report) {

    if (!driverReportBody) {
        return;
    }


    driverReportBody.innerHTML =
        "";


    const drivers =
        Object.values(
            report.drivers
        );


    if (!drivers.length) {

        if (driverEmptyState) {

            driverEmptyState.textContent =
                "No driver data available for the selected report.";
            driverEmptyState.classList.add(
                "show"
            );

        }

        return;

    }


    if (driverEmptyState) {

        driverEmptyState.classList.remove(
            "show"
        );

    }


    drivers.sort(
        function (a, b) {

            /*
             * Keep drivers with bookings first,
             * then sort by name.
             *
             * No fake ranking is introduced.
             */

            if (
                b.bookings !==
                a.bookings
            ) {

                return (
                    b.bookings -
                    a.bookings
                );

            }


            return String(
                a.name
            ).localeCompare(
                String(
                    b.name
                )
            );

        }
    );


    drivers.forEach(
        function (driver) {

            const rate =
                driver.bookings > 0
                    ?
                    (
                        driver.delivered /
                        driver.bookings
                    ) * 100
                    :
                    0;


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML =
                `

                <td data-label="Driver">
                    ${escapeHTML(
                        driver.name
                    )}
                </td>

                <td data-label="Driver ID">
                    ${escapeHTML(
                        driver.id
                    )}
                </td>

                <td data-label="Total Bookings">
                    ${driver.bookings}
                </td>

                <td data-label="Delivered">
                    ${driver.delivered}
                </td>

                <td data-label="Active">
                    ${driver.active}
                </td>

                <td data-label="Delivery Rate">
                    ${rate.toFixed(1)}%
                </td>

                `;


            driverReportBody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   CUSTOMER REPORT
   ========================================================= */

function renderCustomerReport(report) {

    if (!customerReportBody) {
        return;
    }


    customerReportBody.innerHTML =
        "";


    const customers =
        Object.values(
            report.customers
        );


    if (!customers.length) {

        if (customerEmptyState) {

            customerEmptyState.textContent =
                "No customer activity available.";
            customerEmptyState.classList.add(
                "show"
            );

        }

        return;

    }


    if (customerEmptyState) {

        customerEmptyState.classList.remove(
            "show"
        );

    }


    customers.sort(
        function (a, b) {

            return (
                b.spent -
                a.spent
            );

        }
    );


    customers.forEach(
        function (customer) {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML =
                `

                <td data-label="Customer">
                    ${escapeHTML(
                        customer.name
                    )}
                </td>

                <td data-label="Customer ID">
                    ${escapeHTML(
                        customer.id
                    )}
                </td>

                <td data-label="Bookings">
                    ${customer.bookings}
                </td>

                <td data-label="Delivered">
                    ${customer.delivered}
                </td>

                <td data-label="Total Spent">
                    ${formatCurrency(
                        customer.spent
                    )}
                </td>

                `;


            customerReportBody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   BOOKING REPORT
   ========================================================= */

function renderBookingReport(report) {

    if (!bookingReportBody) {
        return;
    }


    bookingReportBody.innerHTML =
        "";


    const bookings =
        Array.isArray(
            filteredBookings
        )
            ?
            filteredBookings
            :
            [];


    if (bookingRecordCount) {

        bookingRecordCount.textContent =
            `${bookings.length} ${
                bookings.length === 1
                    ? "record"
                    : "records"
            }`;

    }


    if (!bookings.length) {

        if (bookingEmptyState) {

            bookingEmptyState.textContent =
                "No bookings found for the selected filters.";
            bookingEmptyState.classList.add(
                "show"
            );

        }

        return;

    }


    if (bookingEmptyState) {

        bookingEmptyState.classList.remove(
            "show"
        );

    }


    const sorted =
        bookings
            .slice()
            .sort(
                function (a, b) {

                    return getBookingDateTime(
                        b
                    ) -
                    getBookingDateTime(
                        a
                    );

                }
            );


    sorted.forEach(
        function (booking) {

            const status =
                getBookingStatus(
                    booking
                );


            const normalizedStatus =
                normalizeDatabaseStatus(
                    status
                );


            const customer =
                getBookingCustomer(
                    booking
                );


            const customerName =
                getCustomerName(
                    booking,
                    customer
                );


            const amount =
                getAmount(
                    booking
                );


            const paymentStatus =
                getPaymentStatus(
                    booking
                );


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML =
                `

                <td data-label="Booking ID">
                    ${escapeHTML(
                        getBookingId(
                            booking
                        )
                    )}
                </td>

                <td data-label="Date">
                    ${formatDisplayDate(
                        getBookingDate(
                            booking
                        )
                    )}
                </td>

                <td data-label="Route">
                    ${escapeHTML(
                        getRoute(
                            booking
                        )
                    )}
                </td>

                <td data-label="Customer">
                    ${escapeHTML(
                        customerName ||
                        "—"
                    )}
                </td>

                <td data-label="Status">

                    <span
                        class="status-cell
                        ${getStatusClass(
                            normalizedStatus
                        )}">

                        ${escapeHTML(
                            formatStatus(
                                status
                            )
                        )}

                    </span>

                </td>

                <td data-label="Amount">
                    ${formatCurrency(
                        amount
                    )}
                </td>

                <td data-label="Payment">

                    <span
                        class="payment-cell
                        ${getPaymentClass(
                            paymentStatus
                        )}">

                        ${escapeHTML(
                            paymentStatus
                        )}

                    </span>

                </td>

                `;


            bookingReportBody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   BOOKING ID
   ========================================================= */

function getBookingId(booking) {

    return String(

        booking.booking_id ||

        booking.id ||

        "—"

    ).trim();

}


/* =========================================================
   BOOKING DATE
   ========================================================= */

function getBookingDate(booking) {

    const value =

        booking.booking_date ||

        booking.created_at ||

        "";


    if (!value) {
        return "";
    }


    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}/.test(value)
    ) {

        return value.substring(
            0,
            10
        );

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


/* =========================================================
   BOOKING DATE + TIME
   ========================================================= */

function getBookingDateTime(booking) {

    const value =
        booking.created_at ||
        booking.booking_date ||
        "";


    if (!value) {
        return 0;
    }


    const time =
        new Date(value).getTime();


    return Number.isNaN(time)
        ? 0
        : time;

}


/* =========================================================
   BOOKING STATUS
   ========================================================= */

function getBookingStatus(booking) {

    return String(

        booking.status ||

        "Unknown"

    ).trim();

}


/* =========================================================
   STATUS DISPLAY
   ========================================================= */

function formatStatus(status) {

    const normalized =
        normalizeDatabaseStatus(
            status
        );


    const map = {

        pending:
            "Pending",

        confirmed:
            "Confirmed",

        assigned:
            "Assigned",

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

        map[normalized] ||

        String(
            status ||
            "Unknown"
        )

    );

}


/* =========================================================
   ROUTE
   ========================================================= */

function getRoute(booking) {

    const pickup =
        booking.pickup_city ||
        "";

    const delivery =
        booking.delivery_city ||
        "";


    if (
        pickup &&
        delivery
    ) {

        return `${pickup} → ${delivery}`;

    }


    if (pickup) {

        return pickup;

    }


    if (delivery) {

        return delivery;

    }


    return "—";

}


/* =========================================================
   AMOUNT
   ========================================================= */

function getAmount(booking) {

    /*
     * Itemized fields are authoritative in the SSP booking flow.
     * service_charge stores their final total and is only a fallback.
     *
     * base_price
     * distance_charge
     * handling_charge
     * gst_amount
     */

    const values = [

        booking.base_price,

        booking.distance_charge,

        booking.handling_charge,

        booking.gst_amount

    ];


    let total = 0;


    values.forEach(
        function (value) {

            const number =
                parseMoney(
                    value
                );


            if (
                Number.isFinite(
                    number
                )
            ) {

                total += number;

            }

        }
    );


    if (total > 0) {
        return total;
    }

    const storedTotal =
        parseMoney(
            booking.total_amount ??
            booking.service_charge
        );

    return Number.isFinite(storedTotal)
        ? Math.max(storedTotal, 0)
        : 0;

}


/* =========================================================
   RAW PAYMENT STATUS
   ========================================================= */

function getRawPaymentStatus(booking) {

    return String(

        booking.payment_status ||

        ""

    )
        .trim()
        .toLowerCase();

}


/* =========================================================
   PAYMENT STATUS
   ========================================================= */

function getPaymentStatus(booking) {

    const rawStatus =
        getRawPaymentStatus(
            booking
        );


    if (rawStatus) {

        return formatPaymentStatus(
            rawStatus
        );

    }


    const amount =
        getAmount(
            booking
        );


    const paid =
        getPaidAmount(
            booking,
            amount
        );


    if (
        amount > 0 &&
        paid >= amount
    ) {

        return "Paid";

    }


    if (
        paid > 0
    ) {

        return "Partial";

    }


    if (
        amount > 0
    ) {

        return "Pending";

    }


    return "Not Recorded";

}


/* =========================================================
   PAYMENT STATUS DISPLAY
   ========================================================= */

function formatPaymentStatus(value) {

    const normalized =
        normalizeDatabaseStatus(
            value
        );


    const map = {

        paid:
            "Paid",

        completed:
            "Completed",

        pending:
            "Pending",

        failed:
            "Failed",

        refunded:
            "Refunded",

        cancelled:
            "Cancelled"

    };


    return (

        map[normalized] ||

        String(
            value ||
            "Not Recorded"
        )

    );

}


/* =========================================================
   PAID AMOUNT
   ========================================================= */

function getPaidAmount(
    booking,
    totalAmount
) {

    /*
     * REAL DATABASE FIELD:
     *
     * received_amount
     */

    const received =
        parseMoney(
            booking.received_amount
        );


    if (
        Number.isFinite(
            received
        )
    ) {

        return Math.min(
            Math.max(
                received,
                0
            ),
            totalAmount
        );

    }

    return 0;

}


/* =========================================================
   CUSTOMER LOOKUP
   ========================================================= */

function getBookingCustomer(booking) {

    const customerId =
        String(
            booking.customer_id ||
            ""
        ).trim();


    if (!customerId) {

        return null;

    }


    /*
     * First try customer_details.
     */

    if (
        allCustomers[
            customerId
        ]
    ) {

        return allCustomers[
            customerId
        ];

    }


    /*
     * Then try profiles.
     */

    if (
        allProfiles[
            customerId
        ]
    ) {

        return allProfiles[
            customerId
        ];

    }


    return null;

}


/* =========================================================
   CUSTOMER ID
   ========================================================= */

function getCustomerId(
    booking,
    customer
) {

    return String(

        booking.customer_id ||

        customer?.customer_id ||

        customer?.id ||

        customer?.profile_id ||

        ""

    ).trim();

}


/* =========================================================
   CUSTOMER NAME
   ========================================================= */

function getCustomerName(
    booking,
    customer
) {

    return String(

        customer?.name ||

        customer?.full_name ||

        customer?.customer_name ||

        customer?.customerName ||

        allProfiles[
            String(
                booking.customer_id ||
                ""
            )
        ]?.full_name ||

        booking.pickup_name ||

        ""

    ).trim();

}


/* =========================================================
   DRIVER ID
   ========================================================= */

function getBookingDriverId(booking) {

    return String(

        booking.driver_id ||

        ""

    ).trim();

}


/* =========================================================
   GET BOOKING DRIVER
   ========================================================= */

function getBookingDriver(booking) {

    const driverId =
        getBookingDriverId(
            booking
        );


    if (!driverId) {

        return null;

    }


    return (

        allDrivers[
            driverId
        ] ||

        null

    );

}


/* =========================================================
   UNIQUE DRIVERS
   ========================================================= */

function getUniqueDrivers() {

    const result = {};


    Object.values(
        allDrivers
    ).forEach(
        function (driver) {

            if (!driver) {
                return;
            }


            const uuid =
                String(
                    driver.id ||
                    ""
                ).trim();


            if (uuid) {

                result[
                    uuid
                ] = driver;

            }

        }
    );


    return result;

}


/* =========================================================
   PUBLIC DRIVER ID
   ========================================================= */

function getDriverPublicId(driver) {

    return String(

        driver?.driver_id ||

        driver?.id ||

        ""

    ).trim();

}


/* =========================================================
   DRIVER NAME
   ========================================================= */

function getDriverName(driver) {

    return String(

        driver?.name ||

        driver?.full_name ||

        allProfiles[
            String(
                driver?.profile_id ||
                ""
            )
        ]?.full_name ||

        "Unknown Driver"

    ).trim();

}


/* =========================================================
   DATABASE STATUS NORMALIZATION
   ========================================================= */

function normalizeDatabaseStatus(status) {

    return String(
        status || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[\s-]+/g,
            "_"
        );

}


/* =========================================================
   GENERAL STATUS NORMALIZATION
   ========================================================= */

function normalizeStatus(status) {

    return String(
        status || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[_-]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        );

}


/* =========================================================
   STATUS CLASS
   ========================================================= */

function getStatusClass(status) {

    const normalized =
        normalizeDatabaseStatus(
            status
        );


    if (
        normalized ===
        "delivered"
    ) {

        return "delivered";

    }


    if (
        normalized ===
        "cancelled"
    ) {

        return "cancelled";

    }


    if (
        normalized ===
        "pending"
    ) {

        return "pending";

    }


    return "active";

}


/* =========================================================
   PAYMENT CLASS
   ========================================================= */

function getPaymentClass(status) {

    const normalized =
        normalizeStatus(
            status
        );


    if (
        normalized ===
        "paid" ||
        normalized ===
        "completed"
    ) {

        return "paid";

    }


    if (
        normalized ===
        "pending"
    ) {

        return "pending";

    }


    return "other";

}


/* =========================================================
   MONEY
   ========================================================= */

function parseMoney(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return NaN;

    }


    if (
        typeof value === "number"
    ) {

        return value;

    }


    const cleaned =
        String(value)
            .replace(
                /[^0-9.-]/g,
                ""
            );


    if (!cleaned) {

        return NaN;

    }


    const number =
        Number(
            cleaned
        );


    return Number.isFinite(
        number
    )
        ? number
        : NaN;

}


/* =========================================================
   CURRENCY
   ========================================================= */

function formatCurrency(amount) {

    const number =
        Number(amount) || 0;


    return "₹" +
        number.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        );

}


/* =========================================================
   NUMBER
   ========================================================= */

function formatNumber(number) {

    return (
        Number(number) || 0
    ).toLocaleString(
        "en-IN"
    );

}


/* =========================================================
   DATE DISPLAY
   ========================================================= */

function formatDisplayDate(value) {

    if (!value) {
        return "—";
    }


    return window.SSPAdminSettings.formatDate(value);

}


/* =========================================================
   FILE DATE
   ========================================================= */

function getFileDate() {

    const now =
        new Date();


    return [

        now.getFullYear(),

        String(
            now.getMonth() + 1
        ).padStart(2, "0"),

        String(
            now.getDate()
        ).padStart(2, "0")

    ].join("-");

}


/* =========================================================
   GENERATED TIME
   ========================================================= */

function updateGeneratedTime() {

    if (!reportGeneratedAt) {
        return;
    }


    const now =
        new Date();


    reportGeneratedAt.textContent =
        `Generated ${now.toLocaleString(
            "en-IN"
        )}`;

}


/* =========================================================
   EXPORT CSV
   ========================================================= */

function exportCSV() {

    const bookings =
        Array.isArray(
            filteredBookings
        )
            ?
            filteredBookings
            :
            [];


    if (!bookings.length) {

        showToast(
            "Nothing to Export",
            "There are no booking records in the current report.",
            true
        );

        return;

    }


    const rows = [

        [
            "Booking ID",
            "Date",
            "Route",
            "Customer",
            "Status",
            "Amount",
            "Payment Status"
        ]

    ];


    bookings.forEach(
        function (booking) {

            const customer =
                getBookingCustomer(
                    booking
                );


            rows.push([

                getBookingId(
                    booking
                ),

                getBookingDate(
                    booking
                ),

                getRoute(
                    booking
                ),

                getCustomerName(
                    booking,
                    customer
                ),

                formatStatus(
                    getBookingStatus(
                        booking
                    )
                ),

                getAmount(
                    booking
                ).toFixed(2),

                getPaymentStatus(
                    booking
                )

            ]);

        }
    );


    const csv =
        rows
            .map(
                function (row) {

                    return row
                        .map(
                            csvEscape
                        )
                        .join(",");

                }
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
        `ssp-report-${getFileDate()}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );


    showToast(
        "Export Complete",
        "The booking report CSV has been exported."
    );

}


/* =========================================================
   CSV ESCAPE
   ========================================================= */

function csvEscape(value) {

    const string =
        String(
            value ?? ""
        );


    if (
        string.includes(",") ||
        string.includes('"') ||
        string.includes("\n")
    ) {

        return `"${string.replace(
            /"/g,
            '""'
        )}"`;

    }


    return string;

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
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
   PERIOD LABEL
   ========================================================= */

function updatePeriodLabel() {

    if (!reportPeriodLabel) {
        return;
    }


    const start =
        startDate
            ? startDate.value
            : "";

    const end =
        endDate
            ? endDate.value
            : "";

    const status =
        statusFilter
            ? statusFilter.value
            : "all";


    let label =
        "All available bookings";


    if (
        start &&
        end
    ) {

        label =
            `${formatDisplayDate(start)} to ${formatDisplayDate(end)}`;

    }

    else if (start) {

        label =
            `From ${formatDisplayDate(start)}`;

    }

    else if (end) {

        label =
            `Up to ${formatDisplayDate(end)}`;

    }


    if (
        status &&
        status !== "all"
    ) {

        label +=
            ` • ${formatStatus(status)}`;

    }


    reportPeriodLabel.textContent =
        label;

}


/* =========================================================
   PRINT
   ========================================================= */

function printReport() {

    window.print();

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    title,
    message,
    isError = false
) {

    if (!toast) {
        return;
    }


    clearTimeout(
        toastTimer
    );


    if (toastTitle) {

        toastTitle.textContent =
            title;

    }


    if (toastMessage) {

        toastMessage.textContent =
            message;

    }


    if (toastIcon) {

        toastIcon.textContent =
            isError
                ? "!"
                : "✓";

    }


    toast.classList.toggle(
        "error",
        isError
    );


    toast.classList.add(
        "show"
    );


    toastTimer =
        setTimeout(
            hideToast,
            4500
        );

}


function hideToast() {

    if (!toast) {
        return;
    }


    toast.classList.remove(
        "show"
    );


    clearTimeout(
        toastTimer
    );

}