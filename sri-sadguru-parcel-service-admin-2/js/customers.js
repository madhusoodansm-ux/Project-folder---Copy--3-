/* =========================================================
   SSP ADMIN — CUSTOMERS
   REAL SUPABASE VERSION

   DATA SOURCES:
   1. public.profiles
      - role = customer
      - customer identity/status

   2. public.bookings
      - customer_id -> profiles.id
      - order count
      - total spent

   IMPORTANT:
   - No localStorage
   - No demo customers
   - No hardcoded customer records
   - Uses existing SSP Supabase project
   ========================================================= */

"use strict";


/* =========================================================
   PAGE CONFIGURATION
   ========================================================= */

const PAGE_SIZE = 6;

let currentPage = 1;

let allCustomers = [];

let filteredCustomers = [];

let allBookings = [];

let supabaseClient = null;


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   SUPABASE
   ========================================================= */

function getSupabaseClient() {

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {
        return window.supabaseClient;
    }

    console.error(
        "SSP Supabase client was not found."
    );

    return null;
}


/* =========================================================
   ADMIN AUTHENTICATION
   ========================================================= */

async function requireAdminAuthentication() {

    /*
       Use the existing SSP authentication system
       when available.
    */

    if (
        window.SSPAuth &&
        typeof window.SSPAuth.requireAdminAuth === "function"
    ) {

        try {

            const result =
                await window.SSPAuth.requireAdminAuth();

            return result !== false;

        } catch (error) {

            console.error(
                "Admin authentication failed:",
                error
            );

            return false;
        }
    }


    /*
       Fallback:
       Check the active Supabase session directly.
    */

    if (!supabaseClient) {
        return false;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "Unable to get Supabase session:",
                error
            );

            return false;
        }


        const session =
            data?.session;


        if (!session?.user) {

            window.location.href =
                "index.html";

            return false;
        }


        /*
           Verify the profile is an active admin.
        */

        const {
            data: profile,
            error: profileError
        } =
            await supabaseClient
                .from("profiles")
                .select(
                    "id,email,phone,full_name,role,status"
                )
                .eq(
                    "id",
                    session.user.id
                )
                .maybeSingle();


        if (
            profileError ||
            !profile
        ) {

            console.error(
                "Unable to verify admin profile:",
                profileError
            );

            await supabaseClient.auth.signOut();

            window.location.href =
                "index.html";

            return false;
        }


        if (
            profile.role !== "admin" ||
            profile.status !== "active"
        ) {

            console.error(
                "Authenticated user is not an active admin."
            );

            await supabaseClient.auth.signOut();

            window.location.href =
                "index.html";

            return false;
        }


        return true;

    } catch (error) {

        console.error(
            "Admin authentication error:",
            error
        );

        window.location.href =
            "index.html";

        return false;
    }
}


/* =========================================================
   NORMALIZE STATUS
   ========================================================= */

function normalizeStatus(status) {

    const value =
        String(status || "")
            .trim()
            .toLowerCase();


    if (
        value === "inactive" ||
        value === "disabled" ||
        value === "suspended"
    ) {
        return "Inactive";
    }


    return "Active";
}


/* =========================================================
   NORMALIZE PHONE
   ========================================================= */

function normalizePhone(phone) {

    if (
        phone === null ||
        phone === undefined
    ) {
        return "";
    }


    return String(phone).trim();
}


/* =========================================================
   FORMAT DATE
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

        return String(value);
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


/* =========================================================
   FORMAT CURRENCY
   ========================================================= */

function formatCurrency(amount) {

    const value =
        Number(amount) || 0;


    return value.toLocaleString(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    );
}


/* =========================================================
   GET INITIALS
   ========================================================= */

function getInitials(name) {

    const value =
        String(
            name || "Customer"
        ).trim();


    if (!value) {
        return "CU";
    }


    const parts =
        value
            .split(/\s+/)
            .filter(Boolean);


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
   LOAD CUSTOMERS FROM SUPABASE
   ========================================================= */

async function loadCustomers() {

    if (!supabaseClient) {

        showLoadError(
            "Supabase client is not available."
        );

        return;
    }


    try {

        showLoadingState();


        /*
           -------------------------------------------------
           1. LOAD CUSTOMER PROFILES
           -------------------------------------------------
        */

        const {
            data: profiles,
            error: profilesError
        } =
            await supabaseClient
                .from("profiles")
                .select(
                    `
                    id,
                    email,
                    phone,
                    full_name,
                    role,
                    status,
                    created_at,
                    updated_at
                    `
                )
                .eq(
                    "role",
                    "customer"
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (profilesError) {

            throw new Error(
                `Unable to load customers: ${profilesError.message}`
            );
        }


        /*
           -------------------------------------------------
           2. LOAD BOOKINGS
           -------------------------------------------------
        */

        const {
            data: bookings,
            error: bookingsError
        } =
            await supabaseClient
                .from("bookings")
                .select(
                    `
                    id,
                    booking_id,
                    customer_id,
                    service_charge,
                    payment_status,
                    status,
                    created_at,
                    booking_date,
                    booking_time,
                    pickup_city,
                    delivery_city
                    `
                );


        if (bookingsError) {

            throw new Error(
                `Unable to load customer bookings: ${bookingsError.message}`
            );
        }


        allBookings =
            Array.isArray(bookings)
                ? bookings
                : [];


        /*
           -------------------------------------------------
           3. BUILD CUSTOMER RECORDS
           -------------------------------------------------
        */

        allCustomers =
            (profiles || [])
                .map(profile =>
                    createCustomerRecord(
                        profile,
                        allBookings
                    )
                );


        /*
           Alphabetical customer order.
        */

        allCustomers.sort(
            (a, b) =>
                String(a.name || "")
                    .localeCompare(
                        String(b.name || ""),
                        "en-IN",
                        {
                            sensitivity: "base"
                        }
                    )
        );


        filteredCustomers =
            [...allCustomers];


        currentPage = 1;


        updateSummary();

        renderCustomers();

    } catch (error) {

        console.error(
            "Customers loading failed:",
            error
        );


        allCustomers = [];

        filteredCustomers = [];


        updateSummary();

        renderCustomers();


        showLoadError(
            error.message ||
            "Unable to load customers."
        );
    }
}


/* =========================================================
   CREATE CUSTOMER RECORD
   ========================================================= */

function createCustomerRecord(
    profile,
    bookings
) {

    const customerId =
        profile.id;


    const customerBookings =
        bookings.filter(
            booking =>
                String(
                    booking.customer_id || ""
                ) === String(customerId)
        );


    /*
       Total orders
    */

    const totalOrders =
        customerBookings.length;


    /*
       Total spent

       service_charge is the current SSP
       booking price field.

       We intentionally do NOT use:
       localStorage
       demo pricing
       hardcoded values
    */

    const totalSpent =
        customerBookings.reduce(
            (total, booking) => {

                const amount =
                    Number(
                        booking.service_charge
                    );


                if (
                    Number.isFinite(amount)
                ) {
                    return total + amount;
                }


                return total;

            },
            0
        );


    /*
       Determine city.

       profiles currently does not have a city
       column in the known SSP schema.

       Therefore use the latest booking's
       pickup_city when available.

       If unavailable, display —.
    */

    const sortedBookings =
        [...customerBookings]
            .sort(
                (a, b) =>
                    getBookingTimestamp(b) -
                    getBookingTimestamp(a)
            );


    const latestBooking =
        sortedBookings[0] ||
        null;


    const city =
        latestBooking?.pickup_city ||
        latestBooking?.delivery_city ||
        "—";


    return {

        id:
            profile.id,

        name:
            profile.full_name ||
            "Customer",

        phone:
            normalizePhone(
                profile.phone
            ),

        email:
            profile.email ||
            "",

        photo:
            "",

        city:
            city,

        status:
            normalizeStatus(
                profile.status
            ),

        joinedOn:
            profile.created_at ||
            "",

        totalOrders:
            totalOrders,

        totalSpent:
            totalSpent,

        completedOrders:
            customerBookings.filter(
                booking =>
                    String(
                        booking.status || ""
                    ).toLowerCase() ===
                    "delivered"
            ).length,

        activeOrders:
            customerBookings.filter(
                booking =>
                    isActiveBookingStatus(
                        booking.status
                    )
            ).length,

        lastOrderDate:
            latestBooking
                ? (
                    latestBooking.booking_date ||
                    latestBooking.created_at ||
                    ""
                )
                : ""
    };
}


/* =========================================================
   BOOKING TIMESTAMP
   ========================================================= */

function getBookingTimestamp(
    booking
) {

    if (!booking) {
        return 0;
    }


    /*
       Prefer created_at because it is a
       reliable database timestamp.
    */

    if (booking.created_at) {

        const created =
            new Date(
                booking.created_at
            ).getTime();


        if (
            Number.isFinite(created)
        ) {
            return created;
        }
    }


    /*
       Fallback to booking date/time.
    */

    if (
        booking.booking_date
    ) {

        const dateTime =
            `${booking.booking_date}T${
                booking.booking_time ||
                "00:00:00"
            }`;


        const timestamp =
            new Date(
                dateTime
            ).getTime();


        if (
            Number.isFinite(timestamp)
        ) {
            return timestamp;
        }
    }


    return 0;
}


/* =========================================================
   ACTIVE BOOKING STATUS
   ========================================================= */

function isActiveBookingStatus(
    status
) {

    const value =
        String(
            status || ""
        ).toLowerCase();


    return [
        "pending",
        "confirmed",
        "assigned",
        "pickup_started",
        "picked_up",
        "in_transit",
        "out_for_delivery"
    ].includes(value);
}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateSummary() {

    const total =
        allCustomers.length;


    const active =
        allCustomers.filter(
            customer =>
                normalizeStatus(
                    customer.status
                ) === "Active"
        ).length;


    const bookings =
        allCustomers.reduce(
            (
                sum,
                customer
            ) =>
                sum +
                Number(
                    customer.totalOrders ||
                    0
                ),
            0
        );


    const revenue =
        allCustomers.reduce(
            (
                sum,
                customer
            ) =>
                sum +
                Number(
                    customer.totalSpent ||
                    0
                ),
            0
        );


    if ($("totalCustomers")) {

        $("totalCustomers")
            .textContent =
                total.toLocaleString(
                    "en-IN"
                );
    }


    if ($("activeCustomers")) {

        $("activeCustomers")
            .textContent =
                active.toLocaleString(
                    "en-IN"
                );
    }


    if ($("activePercentage")) {

        const percentage =
            total > 0
                ? Math.round(
                    (
                        active /
                        total
                    ) * 100
                )
                : 0;


        $("activePercentage")
            .textContent =
                `${percentage}% of total`;
    }


    if ($("totalBookings")) {

        $("totalBookings")
            .textContent =
                bookings.toLocaleString(
                    "en-IN"
                );
    }


    if ($("totalRevenue")) {

        $("totalRevenue")
            .textContent =
                formatCurrency(
                    revenue
                );
    }
}


/* =========================================================
   APPLY FILTERS
   ========================================================= */

function applyFilters() {

    const search =
        String(
            $("customerSearch")?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const selectedStatus =
        String(
            $("statusFilter")?.value ||
            "all"
        )
        .toLowerCase();


    filteredCustomers =
        allCustomers.filter(
            customer => {

                const name =
                    String(
                        customer.name ||
                        ""
                    ).toLowerCase();


                const phone =
                    String(
                        customer.phone ||
                        ""
                    ).toLowerCase();


                const id =
                    String(
                        customer.id ||
                        ""
                    ).toLowerCase();


                const city =
                    String(
                        customer.city ||
                        ""
                    ).toLowerCase();


                const email =
                    String(
                        customer.email ||
                        ""
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    name.includes(search) ||
                    phone.includes(search) ||
                    id.includes(search) ||
                    city.includes(search) ||
                    email.includes(search);


                const customerStatus =
                    normalizeStatus(
                        customer.status
                    ).toLowerCase();


                const matchesStatus =
                    selectedStatus === "all" ||
                    customerStatus ===
                        selectedStatus;


                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );


    currentPage = 1;

    renderCustomers();
}


/* =========================================================
   RENDER CUSTOMERS
   ========================================================= */

function renderCustomers() {

    const tbody =
        $("customersTableBody");


    const emptyState =
        $("emptyState");


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (
        !filteredCustomers.length
    ) {

        if (emptyState) {

            emptyState.classList.add(
                "visible"
            );
        }


        updateResultsInfo(
            0,
            0,
            0
        );


        updatePagination(0);

        return;
    }


    if (emptyState) {

        emptyState.classList.remove(
            "visible"
        );
    }


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredCustomers.length /
                PAGE_SIZE
            )
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;
    }


    const start =
        (
            currentPage -
            1
        ) *
        PAGE_SIZE;


    const end =
        Math.min(
            start + PAGE_SIZE,
            filteredCustomers.length
        );


    const visibleCustomers =
        filteredCustomers.slice(
            start,
            end
        );


    visibleCustomers.forEach(
        customer => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML =
                createCustomerRow(
                    customer
                );


            tbody.appendChild(row);
        }
    );


    updateResultsInfo(
        start,
        end,
        filteredCustomers.length
    );


    updatePagination(
        filteredCustomers.length
    );
}


/* =========================================================
   CREATE CUSTOMER ROW
   ========================================================= */

function createCustomerRow(
    customer
) {

    const id =
        escapeHtml(
            customer.id ||
            "—"
        );


    const name =
        escapeHtml(
            customer.name ||
            "Customer"
        );


    const phone =
        escapeHtml(
            customer.phone ||
            "—"
        );


    const city =
        escapeHtml(
            customer.city ||
            "—"
        );


    const orders =
        Number(
            customer.totalOrders ||
            0
        );


    const spent =
        formatCurrency(
            customer.totalSpent ||
            0
        );


    const status =
        normalizeStatus(
            customer.status
        );


    const joinedOn =
        formatDate(
            customer.joinedOn
        );


    const initials =
        escapeHtml(
            getInitials(
                customer.name
            )
        );


    /*
       Current profiles table does not have a
       confirmed profile-photo column.

       Therefore use initials instead of
       inventing a database field.
    */

    const photoHtml = `
        <span class="customer-initials">
            ${initials}
        </span>
    `;


    return `
        <td>

            <div class="customer-cell">

                ${photoHtml}

                <div class="customer-name-block">

                    <span class="customer-name">
                        ${name}
                    </span>

                    <span class="customer-id">
                        ${id}
                    </span>

                </div>

            </div>

        </td>


        <td>

            <div class="phone-cell">

                <i class="fa-solid fa-phone"></i>

                <span>
                    ${phone}
                </span>

            </div>

        </td>


        <td>
            ${city}
        </td>


        <td>
            ${orders.toLocaleString("en-IN")}
        </td>


        <td>
            ${spent}
        </td>


        <td>

            <span class="status-badge ${status.toLowerCase()}">
                ${status}
            </span>

        </td>


        <td>
            ${joinedOn}
        </td>


        <td>

            <button
                class="view-customer-btn"
                type="button"
                data-customer-id="${escapeAttribute(customer.id)}"
                aria-label="View customer details"
                title="View customer details">

                <i class="fa-solid fa-eye"></i>

            </button>

        </td>
    `;
}


/* =========================================================
   RESULTS INFO
   ========================================================= */

function updateResultsInfo(
    start,
    end,
    total
) {

    const element =
        $("resultsInfo");


    if (!element) {
        return;
    }


    if (
        total === 0
    ) {

        element.textContent =
            "Showing 0 customers";

        return;
    }


    element.textContent =
        `Showing ${start + 1} to ${end} of ${total.toLocaleString("en-IN")} customers`;
}


/* =========================================================
   PAGINATION
   ========================================================= */

function updatePagination(
    totalItems
) {

    const pageNumbers =
        $("pageNumbers");


    const previous =
        $("previousPage");


    const next =
        $("nextPage");


    if (!pageNumbers) {
        return;
    }


    pageNumbers.innerHTML = "";


    const totalPages =
        Math.ceil(
            totalItems /
            PAGE_SIZE
        );


    if (previous) {

        previous.disabled =
            currentPage <= 1;
    }


    if (next) {

        next.disabled =
            totalPages === 0 ||
            currentPage >= totalPages;
    }


    if (
        totalPages <= 1
    ) {
        return;
    }


    const pages =
        getPaginationPages(
            currentPage,
            totalPages
        );


    pages.forEach(
        page => {

            if (page === "...") {

                const dots =
                    document.createElement(
                        "span"
                    );


                dots.textContent =
                    "...";


                dots.className =
                    "page-number";


                dots.style.cursor =
                    "default";


                pageNumbers.appendChild(
                    dots
                );


                return;
            }


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "page-number";


            if (
                page === currentPage
            ) {

                button.classList.add(
                    "active"
                );
            }


            button.textContent =
                page;


            button.addEventListener(
                "click",
                () => {

                    currentPage =
                        page;


                    renderCustomers();


                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }
            );


            pageNumbers.appendChild(
                button
            );
        }
    );
}


/* =========================================================
   PAGINATION PAGE NUMBERS
   ========================================================= */

function getPaginationPages(
    current,
    total
) {

    if (
        total <= 5
    ) {

        return Array.from(
            {
                length: total
            },
            (_, index) =>
                index + 1
        );
    }


    const pages = [1];


    if (
        current > 3
    ) {

        pages.push("...");
    }


    const start =
        Math.max(
            2,
            current - 1
        );


    const end =
        Math.min(
            total - 1,
            current + 1
        );


    for (
        let page = start;
        page <= end;
        page++
    ) {

        if (
            !pages.includes(page)
        ) {

            pages.push(page);
        }
    }


    if (
        current <
        total - 2
    ) {

        pages.push("...");
    }


    pages.push(total);


    return pages;
}


/* =========================================================
   VIEW CUSTOMER DETAILS
   ========================================================= */

function openCustomerDetails(
    customerId
) {

    if (!customerId) {
        return;
    }


    window.location.href =
        `customer-details.html?id=${encodeURIComponent(customerId)}`;
}


/* =========================================================
   SHOW LOADING STATE
   ========================================================= */

function showLoadingState() {

    const tbody =
        $("customersTableBody");


    const emptyState =
        $("emptyState");


    if (tbody) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:45px 20px;
                        color:#707985;
                    "
                >
                    <i
                        class="fa-solid fa-spinner fa-spin"
                        style="margin-right:8px;"
                    ></i>

                    Loading customers...
                </td>
            </tr>
        `;
    }


    if (emptyState) {

        emptyState.classList.remove(
            "visible"
        );
    }


    if ($("resultsInfo")) {

        $("resultsInfo").textContent =
            "Loading customers...";
    }
}


/* =========================================================
   SHOW LOAD ERROR
   ========================================================= */

function showLoadError(
    message
) {

    const tbody =
        $("customersTableBody");


    const emptyState =
        $("emptyState");


    if (tbody) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:45px 20px;
                        color:#e5484d;
                    "
                >
                    <i
                        class="fa-solid fa-triangle-exclamation"
                        style="margin-right:8px;"
                    ></i>

                    ${escapeHtml(
                        message ||
                        "Unable to load customers."
                    )}
                </td>
            </tr>
        `;
    }


    if (emptyState) {

        emptyState.classList.remove(
            "visible"
        );
    }


    if ($("resultsInfo")) {

        $("resultsInfo").textContent =
            "Unable to load customers";
    }


    updatePagination(0);
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

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
   ESCAPE ATTRIBUTE
   ========================================================= */

function escapeAttribute(value) {

    return escapeHtml(value)
        .replace(
            /`/g,
            "&#096;"
        );
}


/* =========================================================
   SETUP EVENTS
   ========================================================= */

function setupEvents() {

    /*
       Search
    */

    const search =
        $("customerSearch");


    if (search) {

        search.addEventListener(
            "input",
            applyFilters
        );
    }


    /*
       Status filter
    */

    const statusFilter =
        $("statusFilter");


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            applyFilters
        );
    }


    /*
       Filter button
    */

    const filterBtn =
        $("filterBtn");


    if (filterBtn) {

        filterBtn.addEventListener(
            "click",
            applyFilters
        );
    }


    /*
       Customer table actions
    */

    const tbody =
        $("customersTableBody");


    if (tbody) {

        tbody.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-customer-id]"
                    );


                if (!button) {
                    return;
                }


                const customerId =
                    button.dataset.customerId;


                openCustomerDetails(
                    customerId
                );
            }
        );
    }


    /*
       Add Customer
    */

    const addCustomerBtn =
        $("addCustomerBtn");


    if (addCustomerBtn) {

        addCustomerBtn.addEventListener(
            "click",
            () => {

                window.location.href =
                    "new-customer.html";
            }
        );
    }


    /*
       Previous page
    */

    const previous =
        $("previousPage");


    if (previous) {

        previous.addEventListener(
            "click",
            () => {

                if (
                    currentPage <= 1
                ) {
                    return;
                }


                currentPage--;


                renderCustomers();
            }
        );
    }


    /*
       Next page
    */

    const next =
        $("nextPage");


    if (next) {

        next.addEventListener(
            "click",
            () => {

                const totalPages =
                    Math.ceil(
                        filteredCustomers.length /
                        PAGE_SIZE
                    );


                if (
                    currentPage >=
                    totalPages
                ) {
                    return;
                }


                currentPage++;


                renderCustomers();
            }
        );
    }


    /*
       Mobile sidebar
    */

    setupSidebar();


    /*
       Logout
    */

    const logoutBtn =
        $("logoutBtn");


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            handleLogout
        );
    }
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function setupSidebar() {

    const menuBtn =
        $("menuBtn");


    const sidebar =
        $("sidebar");


    const overlay =
        $("sidebarOverlay");


    const sidebarClose =
        $("sidebarClose");


    function openSidebar() {

        if (!sidebar) {
            return;
        }


        sidebar.classList.add(
            "open"
        );


        if (overlay) {

            overlay.classList.add(
                "visible"
            );
        }
    }


    function closeSidebar() {

        if (!sidebar) {
            return;
        }


        sidebar.classList.remove(
            "open"
        );


        if (overlay) {

            overlay.classList.remove(
                "visible"
            );
        }
    }


    if (menuBtn) {

        menuBtn.addEventListener(
            "click",
            openSidebar
        );
    }


    if (sidebarClose) {

        sidebarClose.addEventListener(
            "click",
            closeSidebar
        );
    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeSidebar
        );
    }


    /*
       Close mobile sidebar after navigation.
    */

    if (sidebar) {

        sidebar
            .querySelectorAll(
                ".nav-item"
            )
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        closeSidebar
                    );
                }
            );
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function handleLogout() {

    try {

        if (supabaseClient) {

            await supabaseClient
                .auth
                .signOut();
        }

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );
    }


    window.location.href =
        "index.html";
}


/* =========================================================
   SUPABASE AUTH STATE
   ========================================================= */

function setupAuthListener() {

    if (
        !supabaseClient ||
        !supabaseClient.auth
    ) {
        return;
    }


    supabaseClient
        .auth
        .onAuthStateChange(
            (event, session) => {

                /*
                   If the session disappears while
                   the customer page is open,
                   return to login.
                */

                if (
                    event === "SIGNED_OUT" ||
                    !session
                ) {

                    window.location.href =
                        "index.html";
                }
            }
        );
}


/* =========================================================
   INITIALIZE PAGE
   ========================================================= */

async function initializeCustomersPage() {

    /*
       Supabase client
    */

    supabaseClient =
        getSupabaseClient();


    if (!supabaseClient) {

        showLoadError(
            "Supabase is not initialized. Check supabase-client.js."
        );

        return;
    }


    /*
       Verify admin
    */

    const isAdmin =
        await requireAdminAuthentication();


    if (!isAdmin) {
        return;
    }


    /*
       Auth listener
    */

    setupAuthListener();


    /*
       Events
    */

    setupEvents();


    /*
       Load real customers
    */

    await loadCustomers();
}


/* =========================================================
   PAGE START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeCustomersPage();

    }
);