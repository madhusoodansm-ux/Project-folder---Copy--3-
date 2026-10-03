/* =========================================================
   SRI SADGURU PARCEL SERVICE
   ADMIN PORTAL
   DELIVERY MANAGEMENT

   DATA SOURCE:
   Supabase

   TABLES:
   - public.bookings
   - public.profiles
   - public.booking_status_history

   NO localStorage
   NO demo bookings
   NO hardcoded drivers
========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const ROWS_PER_PAGE = 10;


/*
   Delivery Management only works with statuses that belong
   to the delivery stage of the current SSP database.
*/

const DELIVERY_STATUSES = [
    "in_transit",
    "out_for_delivery",
    "delivered",
    "cancelled"
];


/* =========================================================
   STATE
========================================================= */

let allBookings = [];

let filteredBookings = [];

let currentPage = 1;

let selectedBooking = null;

let toastTimer = null;

let deliveryRealtimeChannel = null;

let realtimeRefreshTimer = null;

let realtimeRefreshInProgress = false;

let realtimeRefreshQueued = false;
let deliverySettings = null;


/* =========================================================
   DOM
========================================================= */

const appShell =
    document.getElementById("appShell");

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const menuButton =
    document.getElementById("menuButton");

const logoutBtn =
    document.getElementById("logoutBtn");

const refreshButton =
    document.getElementById("refreshButton");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const deliveryBody =
    document.getElementById("deliveryBody");

const mobileList =
    document.getElementById("mobileList");

const listCount =
    document.getElementById("listCount");

const emptyState =
    document.getElementById("emptyState");

const previousPage =
    document.getElementById("previousPage");

const nextPage =
    document.getElementById("nextPage");

const pageButtons =
    document.getElementById("pageButtons");


/* =========================================================
   SUMMARY
========================================================= */

const totalCount =
    document.getElementById("totalCount");

const transitCount =
    document.getElementById("transitCount");

const outCount =
    document.getElementById("outCount");

const deliveredCount =
    document.getElementById("deliveredCount");

const cancelledCount =
    document.getElementById("cancelledCount");


/* =========================================================
   MODAL
========================================================= */

const deliveryModal =
    document.getElementById("deliveryModal");

const modalBackdrop =
    document.getElementById("modalBackdrop");

const closeModal =
    document.getElementById("closeModal");

const modalBookingId =
    document.getElementById("modalBookingId");

const modalContent =
    document.getElementById("modalContent");

const saveDeliveryButton =
    document.getElementById("saveDeliveryButton");

const viewBookingButton =
    document.getElementById("viewBookingButton");


/* =========================================================
   MOBILE
========================================================= */

const bottomMoreButton =
    document.getElementById("bottomMoreButton");

const moreMenu =
    document.getElementById("moreMenu");


/* =========================================================
   TOAST
========================================================= */

const toast =
    document.getElementById("toast");

const toastTitle =
    document.getElementById("toastTitle");

const toastMessage =
    document.getElementById("toastMessage");


/* =========================================================
   SUPABASE CLIENT
========================================================= */

function getSupabaseClient() {

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {

        return window.supabaseClient;

    }


    /*
       Fallback only if the existing SSP client exposes
       the standard Supabase object.
    */

    if (
        window.supabase &&
        typeof window.supabase.from === "function"
    ) {

        return window.supabase;

    }


    return null;
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeDeliveryPage
);


async function initializeDeliveryPage() {

    setupSidebar();

    setupFilters();

    setupPagination();

    setupModal();

    setupMobileMoreMenu();

    setupLogout();

    await requireAdmin();

    deliverySettings =
        await window.SSPAdminSettings.get();

    setupRealtimeRefresh();

    await loadDeliveries();

}


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

async function requireAdmin() {

    /*
       Use the existing SSP authentication helper if
       it is available.
    */

    if (
        window.SSPAuth &&
        typeof window.SSPAuth.requireAdminAuth === "function"
    ) {

        try {

            const result =
                await window.SSPAuth.requireAdminAuth();

            return result;

        } catch (error) {

            console.error(
                "Admin authentication failed:",
                error
            );

            return null;

        }

    }


    /*
       If the existing helper is not loaded, do not
       invent another authentication system here.

       Supabase RLS still protects the database.
    */

    return null;
}


/* =========================================================
   LOAD DELIVERIES
========================================================= */

async function loadDeliveries(
    showLoading = true
) {

    if (showLoading) {

        setLoadingState();

    }

    const client =
        getSupabaseClient();


    if (!client) {

        showPageError(
            "Supabase client is not available. Check supabase-client.js."
        );

        return;

    }


    try {

        /*
           Read real bookings.

           select("*") is intentionally used because the
           existing SSP booking schema contains the booking
           fields used by the other Admin pages.
        */

        const {
            data: bookings,
            error: bookingsError
        } = await client
            .from("bookings")
            .select("*");


        if (bookingsError) {

            throw bookingsError;

        }


        const sourceBookings =
            Array.isArray(bookings)
                ? bookings
                : [];


        /*
           Delivery Management only displays bookings that
           have reached the delivery stage.
        */

        const deliveryBookings =
            sourceBookings.filter(
                booking =>
                    DELIVERY_STATUSES.includes(
                        String(
                            booking.status || ""
                        ).toLowerCase()
                    )
            );


        /*
           Customer IDs reference profiles; booking driver IDs
           reference drivers.
        */

        const profileIds =
            [
                ...new Set(
                    deliveryBookings
                        .map(booking => booking.customer_id)
                        .filter(Boolean)
                )
            ];

        const driverIds =
            [
                ...new Set(
                    deliveryBookings
                        .map(booking => booking.driver_id)
                        .filter(Boolean)
                )
            ];


        let profiles = [];


        if (profileIds.length > 0) {

            const {
                data: profileRows,
                error: profileError
            } = await client
                .from("profiles")
                .select("*")
                .in("id", profileIds);


            if (profileError) {

                console.warn(
                    "Profile data could not be loaded:",
                    profileError
                );

            } else {

                profiles =
                    Array.isArray(profileRows)
                        ? profileRows
                        : [];

            }

        }


        /*
           Convert profiles into a quick lookup.
        */

        const profileMap =
            new Map(
                profiles.map(
                    profile => [
                        profile.id,
                        profile
                    ]
                )
            );

        let driverRows = [];

        if (driverIds.length > 0) {
            const {
                data,
                error
            } = await client
                .from("drivers")
                .select("id,profile_id,driver_id,name,email,phone,status")
                .in("id", driverIds);

            if (error) {
                console.warn(
                    "Driver details could not be loaded:",
                    error
                );
            } else {
                driverRows = data || [];
            }
        }

        const driverMap =
            new Map(
                driverRows.map(driver => {
                    const profile =
                        driver.profile_id
                            ? profileMap.get(driver.profile_id)
                            : null;

                    return [
                        String(driver.id),
                        {
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
                    ];
                })
            );


        /*
           Attach customer and driver profile information
           in memory only.
        */

        allBookings =
            deliveryBookings.map(
                booking => {

                    const customer =
                        booking.customer_id
                            ? profileMap.get(
                                booking.customer_id
                            )
                            : null;

                    const driver =
                        booking.driver_id
                            ? driverMap.get(
                                String(booking.driver_id)
                            )
                            : null;


                    return {

                        ...booking,

                        customerProfile:
                            customer || null,

                        driverProfile:
                            driver || null

                    };

                }
            );


        /*
           Newest bookings first.
        */

        allBookings.sort(
            (a, b) =>
                getBookingTimestamp(b) -
                getBookingTimestamp(a)
        );


        updateSummary();

        applyFilters();

    } catch (error) {

        console.error(
            "Unable to load Delivery Management:",
            error
        );


        showPageError(
            getErrorMessage(error)
        );

    }

}


/* =========================================================
   REALTIME REFRESH
========================================================= */

function setupRealtimeRefresh() {

    const client =
        getSupabaseClient();


    if (!client) {

        console.error(
            "Delivery updates cannot be subscribed to because Supabase is unavailable."
        );

        return;

    }


    deliveryRealtimeChannel =
        client
            .channel(
                "admin-delivery-management-bookings"
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "bookings"
                },
                scheduleRealtimeDeliveryRefresh
            )
            .subscribe(
                (status, error) => {

                    if (
                        status === "CHANNEL_ERROR" ||
                        status === "TIMED_OUT" ||
                        status === "CLOSED"
                    ) {

                        console.error(
                            "Delivery realtime subscription failed:",
                            error || status
                        );

                    }

                }
            );

}


function scheduleRealtimeDeliveryRefresh() {

    if (realtimeRefreshTimer) {

        window.clearTimeout(
            realtimeRefreshTimer
        );

    }


    realtimeRefreshTimer =
        window.setTimeout(
            refreshDeliveriesFromRealtime,
            250
        );

}


async function refreshDeliveriesFromRealtime() {

    if (realtimeRefreshInProgress) {

        realtimeRefreshQueued = true;

        return;

    }


    realtimeRefreshInProgress = true;


    try {

        await loadDeliveries(false);


        if (selectedBooking) {

            const refreshedBooking =
                allBookings.find(
                    booking =>
                        String(booking.id) ===
                        String(selectedBooking.id)
                );


            if (refreshedBooking) {

                selectedBooking =
                    refreshedBooking;

                await renderModalContent(
                    refreshedBooking
                );

            }

        }

    } finally {

        realtimeRefreshInProgress = false;


        if (realtimeRefreshQueued) {

            realtimeRefreshQueued = false;

            scheduleRealtimeDeliveryRefresh();

        }

    }

}


/* =========================================================
   LOADING STATE
========================================================= */

function setLoadingState() {

    if (deliveryBody) {

        deliveryBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell">
                    Loading delivery records...
                </td>
            </tr>
        `;

    }


    if (mobileList) {

        mobileList.innerHTML = `
            <div class="loading-mobile">
                Loading delivery records...
            </div>
        `;

    }


    if (emptyState) {

        emptyState.hidden = true;

    }


    if (listCount) {

        listCount.textContent =
            "Loading deliveries...";

    }

}


/* =========================================================
   ERROR
========================================================= */

function showPageError(message) {

    if (deliveryBody) {

        deliveryBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="table-error">
                        ${escapeHTML(message)}
                    </div>
                </td>
            </tr>
        `;

    }


    if (mobileList) {

        mobileList.innerHTML = `
            <div class="mobile-error">
                ${escapeHTML(message)}
            </div>
        `;

    }


    if (listCount) {

        listCount.textContent =
            "Unable to load deliveries.";

    }

}


/* =========================================================
   FILTER SETUP
========================================================= */

function setupFilters() {

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                currentPage = 1;

                applyFilters();

            }
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            () => {

                currentPage = 1;

                applyFilters();

            }
        );

    }


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async () => {

                refreshButton.disabled = true;

                await loadDeliveries();

                refreshButton.disabled = false;

            }
        );

    }

}


/* =========================================================
   FILTER
========================================================= */

function applyFilters() {

    const search =
        String(
            searchInput?.value || ""
        )
            .trim()
            .toLowerCase();


    const selectedStatus =
        String(
            statusFilter?.value || "all"
        );


    filteredBookings =
        allBookings.filter(
            booking => {

                const searchableText =
                    getSearchableText(
                        booking
                    );


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                const bookingStatus =
                    String(
                        booking.status || ""
                    ).toLowerCase();


                const matchesStatus =
                    selectedStatus === "all" ||
                    bookingStatus === selectedStatus;


                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );


    renderCurrentPage();

}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

    const total =
        allBookings.length;


    const transit =
        allBookings.filter(
            booking =>
                booking.status === "in_transit"
        ).length;


    const out =
        allBookings.filter(
            booking =>
                booking.status === "out_for_delivery"
        ).length;


    const delivered =
        allBookings.filter(
            booking =>
                booking.status === "delivered"
        ).length;


    const cancelled =
        allBookings.filter(
            booking =>
                booking.status === "cancelled"
        ).length;


    if (totalCount) {

        totalCount.textContent =
            total;

    }


    if (transitCount) {

        transitCount.textContent =
            transit;

    }


    if (outCount) {

        outCount.textContent =
            out;

    }


    if (deliveredCount) {

        deliveredCount.textContent =
            delivered;

    }


    if (cancelledCount) {

        cancelledCount.textContent =
            cancelled;

    }

}


/* =========================================================
   PAGINATION
========================================================= */

function getTotalPages() {

    return Math.max(
        1,
        Math.ceil(
            filteredBookings.length /
            ROWS_PER_PAGE
        )
    );

}


function getCurrentPageItems() {

    const start =
        (
            currentPage - 1
        ) *
        ROWS_PER_PAGE;


    return filteredBookings.slice(
        start,
        start + ROWS_PER_PAGE
    );

}


function setupPagination() {

    if (previousPage) {

        previousPage.addEventListener(
            "click",
            () => {

                if (currentPage > 1) {

                    currentPage--;

                    renderCurrentPage();

                }

            }
        );

    }


    if (nextPage) {

        nextPage.addEventListener(
            "click",
            () => {

                const totalPages =
                    getTotalPages();


                if (
                    currentPage <
                    totalPages
                ) {

                    currentPage++;

                    renderCurrentPage();

                }

            }
        );

    }

}


/* =========================================================
   RENDER PAGE
========================================================= */

function renderCurrentPage() {

    const totalPages =
        getTotalPages();


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;

    }


    const items =
        getCurrentPageItems();


    renderDesktopTable(
        items
    );


    renderMobileList(
        items
    );


    renderPagination(
        totalPages
    );


    updateListCount();

}


/* =========================================================
   DESKTOP TABLE
========================================================= */

function renderDesktopTable(items) {

    if (!deliveryBody) {

        return;

    }


    deliveryBody.innerHTML = "";


    if (items.length === 0) {

        deliveryBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="table-empty">
                        No delivery records found.
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    items.forEach(
        booking => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>

                    <span class="booking-id">
                        ${escapeHTML(
                            booking.booking_id
                        )}
                    </span>

                </td>


                <td>

                    <div class="customer-cell">

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

                    <div class="destination-cell">

                        <strong>
                            ${escapeHTML(
                                getDeliveryCity(
                                    booking
                                )
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                getDeliveryAddress(
                                    booking
                                )
                            )}
                        </span>

                    </div>

                </td>


                <td>

                    ${escapeHTML(
                        getDriverName(
                            booking
                        )
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        formatBookingDate(
                            booking
                        )
                    )}

                </td>


                <td>

                    ${getStatusBadge(
                        booking.status
                    )}

                </td>


                <td>

                    <button
                        class="action-button"
                        type="button"
                        title="View delivery"
                        aria-label="View delivery"
                        data-view-booking="${escapeHTML(
                            booking.id
                        )}"
                    >

                        <i class="fa-regular fa-eye"></i>

                    </button>

                </td>

            `;


            deliveryBody.appendChild(
                row
            );

        }
    );


    attachViewButtons();

}


/* =========================================================
   MOBILE LIST
========================================================= */

function renderMobileList(items) {

    if (!mobileList) {

        return;

    }


    mobileList.innerHTML = "";


    if (items.length === 0) {

        mobileList.innerHTML = `
            <div class="mobile-empty">
                No delivery records found.
            </div>
        `;

        return;

    }


    items.forEach(
        booking => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "mobile-delivery-card";


            card.innerHTML = `

                <div class="mobile-card-top">

                    <div>

                        <div class="mobile-booking-id">

                            ${escapeHTML(
                                booking.booking_id
                            )}

                        </div>

                        <div class="mobile-date">

                            ${escapeHTML(
                                formatBookingDate(
                                    booking
                                )
                            )}

                        </div>

                    </div>


                    ${getStatusBadge(
                        booking.status
                    )}

                </div>


                <div class="mobile-customer">

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


                <div class="mobile-destination">

                    <strong>

                        Delivery:
                        ${escapeHTML(
                            getDeliveryCity(
                                booking
                            )
                        )}

                    </strong>

                    <span>

                        ${escapeHTML(
                            getDeliveryAddress(
                                booking
                            )
                        )}

                    </span>

                </div>


                <div class="mobile-info-grid">


                    <div class="mobile-info">

                        <small>
                            Driver
                        </small>

                        <strong>

                            ${escapeHTML(
                                getDriverName(
                                    booking
                                )
                            )}

                        </strong>

                    </div>


                    <div class="mobile-info">

                        <small>
                            Status
                        </small>

                        <strong>

                            ${escapeHTML(
                                formatStatus(
                                    booking.status
                                )
                            )}

                        </strong>

                    </div>


                </div>


                <div class="mobile-action-row">

                    <button
                        type="button"
                        class="mobile-view-button"
                        data-view-booking="${escapeHTML(
                            booking.id
                        )}"
                    >

                        <i class="fa-regular fa-eye"></i>

                        View Delivery

                    </button>

                </div>

            `;


            mobileList.appendChild(
                card
            );

        }
    );


    attachViewButtons();

}


/* =========================================================
   VIEW BUTTONS
========================================================= */

function attachViewButtons() {

    document
        .querySelectorAll(
            "[data-view-booking]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const bookingId =
                            button.dataset.viewBooking;


                        openDeliveryModal(
                            bookingId
                        );

                    }
                );

            }
        );

}


/* =========================================================
   LIST COUNT
========================================================= */

function updateListCount() {

    if (!listCount) {

        return;

    }


    const total =
        filteredBookings.length;


    if (total === 0) {

        listCount.textContent =
            "0 deliveries";

        return;

    }


    const start =
        (
            currentPage - 1
        ) *
        ROWS_PER_PAGE +
        1;


    const end =
        Math.min(
            currentPage *
                ROWS_PER_PAGE,
            total
        );


    listCount.textContent =
        `${start}-${end} of ${total} deliveries`;

}


/* =========================================================
   PAGINATION UI
========================================================= */

function renderPagination(
    totalPages
) {

    if (!pageButtons) {

        return;

    }


    pageButtons.innerHTML = "";


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "page-number";


        if (
            page ===
            currentPage
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

                renderCurrentPage();

            }
        );


        pageButtons.appendChild(
            button
        );

    }


    if (previousPage) {

        previousPage.disabled =
            currentPage <= 1;

    }


    if (nextPage) {

        nextPage.disabled =
            currentPage >= totalPages;

    }

}


/* =========================================================
   MODAL SETUP
========================================================= */

function setupModal() {

    if (closeModal) {

        closeModal.addEventListener(
            "click",
            closeDeliveryModal
        );

    }


    if (modalBackdrop) {

        modalBackdrop.addEventListener(
            "click",
            closeDeliveryModal
        );

    }


    if (saveDeliveryButton) {

        saveDeliveryButton.addEventListener(
            "click",
            saveDeliveryChanges
        );

    }


    if (viewBookingButton) {

        viewBookingButton.addEventListener(
            "click",
            viewSelectedBooking
        );

    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                deliveryModal &&
                !deliveryModal.hidden
            ) {

                closeDeliveryModal();

            }

        }
    );

}


/* =========================================================
   OPEN MODAL
========================================================= */

async function openDeliveryModal(
    databaseId
) {

    const booking =
        allBookings.find(
            item =>
                String(item.id) ===
                String(databaseId)
        );


    if (!booking) {

        showToast(
            "Delivery",
            "Booking could not be found.",
            "error"
        );

        return;

    }


    selectedBooking =
        booking;


    modalBookingId.textContent =
        booking.booking_id ||
        "Booking";


    modalContent.innerHTML = `
        <div class="modal-loading">
            Loading delivery details...
        </div>
    `;


    deliveryModal.hidden = false;

    deliveryModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    await renderModalContent(
        booking
    );

}


/* =========================================================
   RENDER MODAL
========================================================= */

async function renderModalContent(
    booking
) {

    const history =
        await getBookingHistory(
            booking.id
        );


    modalContent.innerHTML = `

        <!-- SHIPMENT -->

        <section class="detail-section">

            <h3 class="detail-section-title">
                Shipment Information
            </h3>


            <div class="detail-grid">


                <div class="detail-item">

                    <small>
                        Booking ID
                    </small>

                    <strong>
                        ${escapeHTML(
                            booking.booking_id
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <small>
                        Current Status
                    </small>

                    <strong>
                        ${escapeHTML(
                            formatStatus(
                                booking.status
                            )
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <small>
                        Booking Date
                    </small>

                    <strong>
                        ${escapeHTML(
                            formatBookingDate(
                                booking
                            )
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <small>
                        Booking Time
                    </small>

                    <strong>
                        ${escapeHTML(
                            booking.booking_time ||
                            "—"
                        )}
                    </strong>

                </div>


                <div class="detail-item full">

                    <small>
                        Delivery Address
                    </small>

                    <strong>
                        ${escapeHTML(
                            getDeliveryAddress(
                                booking
                            )
                        )}
                    </strong>

                </div>


            </div>

        </section>



        <!-- CUSTOMER -->

        <section class="detail-section">

            <h3 class="detail-section-title">
                Receiver / Customer
            </h3>


            <div class="detail-grid">


                <div class="detail-item">

                    <small>
                        Customer
                    </small>

                    <strong>
                        ${escapeHTML(
                            getCustomerName(
                                booking
                            )
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <small>
                        Customer Phone
                    </small>

                    <strong>
                        ${escapeHTML(
                            getCustomerPhone(
                                booking
                            )
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <small>
                        Receiver
                    </small>

                    <strong>
                        ${escapeHTML(
                            getReceiverName(
                                booking
                            )
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <small>
                        Receiver Phone
                    </small>

                    <strong>
                        ${escapeHTML(
                            getReceiverPhone(
                                booking
                            )
                        )}
                    </strong>

                </div>


            </div>

        </section>



        <!-- PARCEL -->

        <section class="detail-section">

            <h3 class="detail-section-title">
                Parcel Information
            </h3>


            <div class="detail-grid">


                <div class="detail-item">

                    <small>
                        Parcel Type
                    </small>

                    <strong>
                        ${escapeHTML(
                            booking.parcel_type ||
                            "—"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <small>
                        Pieces
                    </small>

                    <strong>
                        ${escapeHTML(
                            booking.pieces ??
                            "—"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <small>
                        Weight
                    </small>

                    <strong>
                        ${escapeHTML(
                            booking.weight
                                ? `${booking.weight} kg`
                                : "—"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <small>
                        Declared Value
                    </small>

                    <strong>
                        ${formatCurrency(
                            booking.declared_value
                        )}
                    </strong>

                </div>


            </div>

        </section>



        <!-- DRIVER -->

        <section class="detail-section">

            <h3 class="detail-section-title">
                Assigned Driver
            </h3>


            <div class="detail-grid">


                <div class="detail-item">

                    <small>
                        Driver
                    </small>

                    <strong>
                        ${escapeHTML(
                            getDriverName(
                                booking
                            )
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <small>
                        Driver Phone
                    </small>

                    <strong>
                        ${escapeHTML(
                            getDriverPhone(
                                booking
                            )
                        )}
                    </strong>

                </div>


            </div>

        </section>



        <!-- UPDATE -->

        <section class="detail-section">

            <h3 class="detail-section-title">
                Update Delivery
            </h3>


            <div class="update-grid">


                <div class="form-group">

                    <label
                        for="deliveryStatus"
                    >
                        Delivery Status
                    </label>


                    <select
                        id="deliveryStatus"
                    >

                        <option value="in_transit">
                            In Transit
                        </option>

                        <option value="out_for_delivery">
                            Out for Delivery
                        </option>

                        <option value="delivered">
                            Delivered
                        </option>

                        <option value="cancelled">
                            Cancelled
                        </option>

                    </select>

                </div>


                <div class="form-group">

                    <label>
                        Payment Status
                    </label>


                    <div class="detail-item">

                        <strong>
                            ${escapeHTML(
                                formatStatus(
                                    booking.payment_status
                                )
                            )}
                        </strong>

                    </div>

                </div>


                <div class="form-group full">

                    <label
                        for="deliveryNotes"
                    >
                        Delivery Notes
                    </label>


                    <textarea
                        id="deliveryNotes"
                        placeholder="Enter delivery notes..."
                    >${escapeHTML(
                        booking.admin_notes || ""
                    )}</textarea>

                </div>


            </div>

        </section>



        <!-- PROOF OF DELIVERY -->

        <section class="detail-section">

            <h3 class="detail-section-title">
                Proof of Delivery
            </h3>


            <div class="pod-box">


                <div class="pod-box-title">
                    Delivery Proof
                </div>


                <div class="pod-box-info">
                    Select a delivery proof image for preview.
                    Storage upload can be connected when the SSP
                    delivery-proof storage bucket is configured.
                </div>


                <div class="pod-file-row">

                    <input
                        type="file"
                        id="podFile"
                        class="pod-file-input"
                        accept="image/*"
                    >

                </div>


                <img
                    id="podPreview"
                    class="pod-preview"
                    alt="Proof of delivery preview"
                    hidden
                >


            </div>

        </section>



        <!-- TIMELINE -->

        <section class="detail-section">

            <h3 class="detail-section-title">
                Delivery Timeline
            </h3>


            <div class="delivery-timeline">

                ${
                    renderTimeline(
                        history,
                        booking
                    )
                }

            </div>

        </section>

    `;


    const statusSelect =
        document.getElementById(
            "deliveryStatus"
        );


    if (statusSelect) {

        statusSelect.value =
            DELIVERY_STATUSES.includes(
                booking.status
            )
                ? booking.status
                : "in_transit";

    }


    const podFile =
        document.getElementById(
            "podFile"
        );


    if (podFile) {

        podFile.addEventListener(
            "change",
            previewProofOfDelivery
        );
    }

    applyDeliverySettingsToModal();

}

function applyDeliverySettingsToModal() {
    const statusSelect =
        document.getElementById("deliveryStatus");

    if (statusSelect) {
        statusSelect.disabled =
            deliverySettings?.allowDeliveryUpdates === false;
    }
}


/* =========================================================
   BOOKING HISTORY
========================================================= */

async function getBookingHistory(
    bookingId
) {

    const client =
        getSupabaseClient();


    if (!client || !bookingId) {

        return [];

    }


    try {

        const {
            data,
            error
        } = await client
            .from(
                "booking_status_history"
            )
            .select("*")
            .eq(
                "booking_id",
                bookingId
            )
            .order(
                "changed_at",
                {
                    ascending: true
                }
            );


        if (error) {

            console.warn(
                "Unable to load booking history:",
                error
            );

            return [];

        }


        return Array.isArray(data)
            ? data
            : [];

    } catch (error) {

        console.warn(
            "Booking history error:",
            error
        );

        return [];

    }

}


/* =========================================================
   TIMELINE
========================================================= */

function renderTimeline(
    history,
    booking
) {

    if (
        !history ||
        history.length === 0
    ) {

        return `

            <div class="timeline-item current">

                <div class="timeline-title">

                    ${escapeHTML(
                        formatStatus(
                            booking.status
                        )
                    )}

                </div>

                <div class="timeline-time">

                    ${escapeHTML(
                        formatBookingDateTime(
                            booking
                        )
                    )}

                </div>

            </div>

        `;

    }


    return history
        .map(
            (item, index) => `

                <div
                    class="timeline-item ${
                        index ===
                        history.length - 1
                            ? "current"
                            : ""
                    }"
                >

                    <div class="timeline-title">

                        ${escapeHTML(
                            formatStatus(
                                item.status
                            )
                        )}

                    </div>


                    <div class="timeline-time">

                        ${escapeHTML(
                            formatDateTime(
                                item.changed_at
                            )
                        )}

                    </div>


                    ${
                        item.note
                            ? `
                                <div class="timeline-note">
                                    ${escapeHTML(
                                        item.note
                                    )}
                                </div>
                              `
                            : ""
                    }

                </div>

            `
        )
        .join("");

}


/* =========================================================
   SAVE DELIVERY
========================================================= */

async function saveDeliveryChanges() {

    if (!selectedBooking) {

        return;

    }


    const client =
        getSupabaseClient();


    if (!client) {

        showToast(
            "Save failed",
            "Supabase client is not available.",
            "error"
        );

        return;

    }


    const statusSelect =
        document.getElementById(
            "deliveryStatus"
        );


    const notesInput =
        document.getElementById(
            "deliveryNotes"
        );


    const newStatus =
        statusSelect
            ? statusSelect.value
            : selectedBooking.status;


    const notes =
        notesInput
            ? notesInput.value.trim()
            : "";


    if (
        !DELIVERY_STATUSES.includes(
            newStatus
        )
    ) {

        showToast(
            "Save failed",
            "Invalid delivery status.",
            "error"
        );

        return;

    }


    saveDeliveryButton.disabled =
        true;


    const oldStatus =
        selectedBooking.status;


    try {
        deliverySettings =
            await window.SSPAdminSettings.get(true);

        /*
           Only update columns that are confirmed
           in the current bookings schema.
        */

        const updatePayload = {

            status:
                newStatus,

            admin_notes:
                notes || null

        };

        if (
            newStatus !== oldStatus &&
            !deliverySettings.allowDeliveryUpdates
        ) {
            throw new Error(
                "Delivery status updates are disabled in Settings."
            );
        }

        if (
            newStatus === "delivered" &&
            oldStatus !== "delivered" &&
            deliverySettings.requireProofOfDelivery &&
            !document.getElementById("podFile")?.files?.length
        ) {
            throw new Error(
                "Select proof of delivery before marking this parcel delivered."
            );
        }


        const {
            data,
            error
        } = await client
            .from("bookings")
            .update(
                updatePayload
            )
            .eq(
                "id",
                selectedBooking.id
            )
            .select("*")
            .single();


        if (error) {

            throw error;

        }


        /*
           The existing database trigger records status
           changes in booking_status_history.
        */


        selectedBooking = {
            ...selectedBooking,
            ...data
        };


        /*
           Update local page state.
        */

        allBookings =
            allBookings.map(
                booking =>
                    String(booking.id) ===
                    String(selectedBooking.id)
                        ? {
                            ...booking,
                            ...data
                        }
                        : booking
            );


        /*
           If the booking is still a delivery status,
           keep it visible.

           If future status changes move it outside the
           delivery stage, it will disappear after reload.
        */

        updateSummary();

        applyFilters();


        /*
           Refresh modal with the latest data.
        */

        await renderModalContent(
            selectedBooking
        );


        showToast(
            "Delivery Updated",
            oldStatus === newStatus
                ? "Delivery details saved successfully."
                : `Status changed to ${formatStatus(newStatus)}.`,
            "success"
        );

    } catch (error) {

        console.error(
            "Delivery update failed:",
            error
        );


        showToast(
            "Update Failed",
            getErrorMessage(error),
            "error"
        );

    } finally {

        saveDeliveryButton.disabled =
            false;

    }

}


/* =========================================================
   PROOF OF DELIVERY PREVIEW
========================================================= */

function previewProofOfDelivery(
    event
) {

    const file =
        event.target.files?.[0];


    const preview =
        document.getElementById(
            "podPreview"
        );


    if (!file || !preview) {

        return;

    }


    if (
        !file.type.startsWith(
            "image/"
        )
    ) {

        showToast(
            "Invalid File",
            "Please select an image file.",
            "error"
        );

        event.target.value = "";

        preview.hidden = true;

        return;

    }


    const reader =
        new FileReader();


    reader.onload =
        function () {

            preview.src =
                reader.result;

            preview.hidden =
                false;

        };


    reader.readAsDataURL(
        file
    );

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeDeliveryModal() {

    if (!deliveryModal) {

        return;

    }


    deliveryModal.hidden =
        true;


    deliveryModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";

    selectedBooking =
        null;

}


/* =========================================================
   VIEW BOOKING
========================================================= */

function viewSelectedBooking() {

    if (!selectedBooking) {

        return;

    }


    const bookingId =
        selectedBooking.booking_id;


    if (!bookingId) {

        return;

    }


    window.location.href =
        `booking-details.html?id=${encodeURIComponent(
            bookingId
        )}`;

}


/* =========================================================
   DOWNLOAD BILL
========================================================= */

function downloadBill(
    bookingId
) {

    if (!bookingId) {

        return;

    }


    window.location.href =
        `download-bill.html?id=${encodeURIComponent(
            bookingId
        )}`;

}


/* =========================================================
   SIDEBAR
========================================================= */

function setupSidebar() {

    if (sidebarToggle) {

        sidebarToggle.addEventListener(
            "click",
            () => {

                appShell.classList.toggle(
                    "sidebar-collapsed"
                );

            }
        );

    }


    if (menuButton) {

        menuButton.addEventListener(
            "click",
            () => {

                sidebar.classList.add(
                    "mobile-open"
                );

                sidebarOverlay.classList.add(
                    "active"
                );

            }
        );

    }


    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            closeMobileSidebar
        );

    }


    document
        .querySelectorAll(
            ".side-nav a"
        )
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    closeMobileSidebar
                );

            }
        );

}


function closeMobileSidebar() {

    sidebar?.classList.remove(
        "mobile-open"
    );

    sidebarOverlay?.classList.remove(
        "active"
    );

}


/* =========================================================
   MOBILE MORE
========================================================= */

function setupMobileMoreMenu() {

    if (!bottomMoreButton) {

        return;

    }


    bottomMoreButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            moreMenu.hidden =
                !moreMenu.hidden;

        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                moreMenu &&
                !moreMenu.hidden &&
                !moreMenu.contains(event.target) &&
                event.target !== bottomMoreButton
            ) {

                moreMenu.hidden =
                    true;

            }

        }
    );

}


/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {

    if (!logoutBtn) {

        return;

    }


    logoutBtn.addEventListener(
        "click",
        async () => {

            const client =
                getSupabaseClient();


            try {

                if (
                    client &&
                    client.auth
                ) {

                    await client.auth.signOut();

                }


                if (
                    window.SSPAuth &&
                    typeof window.SSPAuth.logout ===
                        "function"
                ) {

                    await window.SSPAuth.logout();

                }

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            } finally {

                window.location.href =
                    "index.html";

            }

        }
    );

}


/* =========================================================
   SEARCHABLE TEXT
========================================================= */

function getSearchableText(
    booking
) {

    return [

        booking.booking_id,

        getCustomerName(
            booking
        ),

        getCustomerPhone(
            booking
        ),

        getReceiverName(
            booking
        ),

        getReceiverPhone(
            booking
        ),

        getDeliveryCity(
            booking
        ),

        getDeliveryAddress(
            booking
        ),

        getDriverName(
            booking
        ),

        getDriverPhone(
            booking
        ),

        booking.parcel_type

    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

}


/* =========================================================
   CUSTOMER
========================================================= */

function getCustomerName(
    booking
) {

    if (
        booking.customerProfile?.full_name
    ) {

        return booking.customerProfile.full_name;

    }


    return (
        booking.customer_name ||
        booking.customerName ||
        booking.pickup_name ||
        "—"
    );

}


function getCustomerPhone(
    booking
) {

    if (
        booking.customerProfile?.phone
    ) {

        return booking.customerProfile.phone;

    }


    return (
        booking.customer_phone ||
        booking.customerPhone ||
        booking.pickup_phone ||
        "—"
    );

}


/* =========================================================
   RECEIVER
========================================================= */

function getReceiverName(
    booking
) {

    return (
        booking.receiver_name ||
        booking.receiverName ||
        "—"
    );

}


function getReceiverPhone(
    booking
) {

    return (
        booking.receiver_phone ||
        booking.receiverPhone ||
        "—"
    );

}


/* =========================================================
   DELIVERY
========================================================= */

function getDeliveryCity(
    booking
) {

    return (
        booking.delivery_city ||
        booking.to_city ||
        booking.deliveryCity ||
        "—"
    );

}


function getDeliveryAddress(
    booking
) {

    return (
        booking.delivery_address ||
        booking.deliveryAddress ||
        "—"
    );

}


/* =========================================================
   DRIVER
========================================================= */

function getDriverName(
    booking
) {

    if (
        booking.driverProfile?.full_name
    ) {

        return booking.driverProfile.full_name;

    }


    return (
        booking.driver_name ||
        booking.driverName ||
        "Not assigned"
    );

}


function getDriverPhone(
    booking
) {

    if (
        booking.driverProfile?.phone
    ) {

        return booking.driverProfile.phone;

    }


    return (
        booking.driver_phone ||
        booking.driverPhone ||
        "—"
    );

}


/* =========================================================
   STATUS FORMAT
========================================================= */

function formatStatus(
    status
) {

    const normalized =
        String(
            status || ""
        )
            .toLowerCase();


    const labels = {

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
            "Cancelled",

        partially_paid:
            "Partially Paid",

        paid:
            "Paid",

        failed:
            "Failed",

        refunded:
            "Refunded"

    };


    return (
        labels[normalized] ||
        (
            status
                ? String(status)
                    .replaceAll(
                        "_",
                        " "
                    )
                    .replace(
                        /\b\w/g,
                        letter =>
                            letter.toUpperCase()
                    )
                : "—"
        )
    );

}


/* =========================================================
   STATUS BADGE
========================================================= */

function getStatusBadge(
    status
) {

    const normalized =
        String(
            status || ""
        ).toLowerCase();


    let className =
        "status-pending";


    if (
        normalized ===
        "in_transit"
    ) {

        className =
            "status-in-transit";

    }


    if (
        normalized ===
        "out_for_delivery"
    ) {

        className =
            "status-out-for-delivery";

    }


    if (
        normalized ===
        "delivered"
    ) {

        className =
            "status-delivered";

    }


    if (
        normalized ===
        "cancelled"
    ) {

        className =
            "status-cancelled";

    }


    return `

        <span
            class="status-badge ${className}"
        >
            ${escapeHTML(
                formatStatus(
                    status
                )
            )}
        </span>

    `;

}


/* =========================================================
   BOOKING DATE
========================================================= */

function getBookingTimestamp(
    booking
) {

    const combined =
        booking.booking_date &&
        booking.booking_time
            ? `${booking.booking_date}T${booking.booking_time}`
            : (
                booking.created_at ||
                booking.updated_at ||
                ""
            );


    const timestamp =
        Date.parse(
            combined
        );


    return Number.isNaN(
        timestamp
    )
        ? 0
        : timestamp;

}


function formatBookingDate(
    booking
) {

    if (
        booking.booking_date
    ) {

        const date =
            new Date(
                `${booking.booking_date}T00:00:00`
            );


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return window.SSPAdminSettings.formatDate(date);

        }

    }


    if (
        booking.created_at
    ) {

        return formatDateTime(
            booking.created_at
        );

    }


    return "—";

}


function formatBookingDateTime(
    booking
) {

    const timestamp =
        getBookingTimestamp(
            booking
        );


    if (!timestamp) {

        return "—";

    }


    return formatDateTime(
        new Date(
            timestamp
        ).toISOString()
    );

}


/* =========================================================
   DATE FORMAT
========================================================= */

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

        return "—";

    }


    return window.SSPAdminSettings.formatDateTime(date);

}


/* =========================================================
   CURRENCY
========================================================= */

function formatCurrency(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";

    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return "—";

    }


    return number.toLocaleString(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    );

}


/* =========================================================
   ERROR MESSAGE
========================================================= */

function getErrorMessage(
    error
) {

    if (!error) {

        return "An unexpected error occurred.";

    }


    if (
        typeof error === "string"
    ) {

        return error;

    }


    if (
        error.message
    ) {

        return error.message;

    }


    return "Unable to complete the operation.";

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? "—"
    ).replace(
        /[&<>"']/g,
        character => {

            const map = {

                "&":
                    "&amp;",

                "<":
                    "&lt;",

                ">":
                    "&gt;",

                '"':
                    "&quot;",

                "'":
                    "&#039;"

            };


            return map[
                character
            ];

        }
    );

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    title,
    message,
    type = "success"
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


    const icon =
        toast.querySelector(
            ".toast-icon i"
        );


    if (icon) {

        icon.className =
            type === "error"
                ? "fa-solid fa-triangle-exclamation"
                : "fa-solid fa-check";

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


/* =========================================================
   STORAGE EVENT
   Not used for data.
   Only refreshes if another SSP page causes a browser
   storage event in case old pages are still open.
========================================================= */

window.addEventListener(
    "storage",
    event => {

        if (
            event.key
        ) {

            loadDeliveries();

        }

    }
);