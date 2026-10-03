"use strict";

/* =========================================================
   SRI SADGURU PARCEL SERVICE
   ADMIN PORTAL
   PICKUP MANAGEMENT

   DATA SOURCE:
   SUPABASE

   TABLES:
   public.bookings
   public.profiles

   NO localStorage
   NO demo bookings
   NO hardcoded drivers
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const ROWS_PER_PAGE = 10;

const LOGIN_PAGE = "index.html";


/* =========================================================
   STATE
========================================================= */

let supabaseClient = null;
let pickupSettings = null;

let currentUser = null;

let allBookings = [];

let filteredBookings = [];

let drivers = [];

let currentPage = 1;

let selectedBooking = null;

let toastTimer = null;


/* =========================================================
   DOM
========================================================= */

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const refreshButton =
    document.getElementById("refreshButton");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const pickupBody =
    document.getElementById("pickupBody");

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

const pendingCount =
    document.getElementById("pendingCount");

const scheduledCount =
    document.getElementById("scheduledCount");

const assignedCount =
    document.getElementById("assignedCount");

const startedCount =
    document.getElementById("startedCount");

const finishedCount =
    document.getElementById("finishedCount");


/* =========================================================
   MODAL
========================================================= */

const pickupModal =
    document.getElementById("pickupModal");

const modalBackdrop =
    document.getElementById("modalBackdrop");

const closeModal =
    document.getElementById("closeModal");

const modalBookingId =
    document.getElementById("modalBookingId");

const modalContent =
    document.getElementById("modalContent");

const savePickupButton =
    document.getElementById("savePickupButton");

const viewBookingButton =
    document.getElementById("viewBookingButton");


/* =========================================================
   MOBILE
========================================================= */

const bottomMoreButton =
    document.getElementById("bottomMoreButton");


/* =========================================================
   TOAST
========================================================= */

const toast =
    document.getElementById("toast");


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializePickupManagement
);


async function initializePickupManagement() {

    try {

        await requireAdminAccess();

        supabaseClient =
            getSupabaseClient();

        pickupSettings =
            await window.SSPAdminSettings.get();

        await loadDrivers();

        await loadBookings();

    } catch (error) {

        console.error(
            "Pickup Management initialization failed:",
            error
        );

        showToast(
            error.message ||
            "Unable to load Pickup Management."
        );

    }

}


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
   ADMIN AUTHENTICATION
========================================================= */

async function requireAdminAccess() {

    const client =
        getSupabaseClient();


    const {
        data,
        error
    } =
        await client.auth.getUser();


    if (
        error ||
        !data ||
        !data.user
    ) {

        window.location.href =
            LOGIN_PAGE;

        throw new Error(
            "Administrator authentication is required."
        );

    }


    currentUser =
        data.user;


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
                currentUser.id
            )
            .maybeSingle();


    if (
        profileError
    ) {

        console.error(
            "Admin profile verification failed:",
            profileError
        );

        window.location.href =
            LOGIN_PAGE;

        throw new Error(
            "Unable to verify administrator account."
        );

    }


    if (
        !profile ||
        profile.role !== "admin" ||
        profile.status !== "active"
    ) {

        await client.auth.signOut();

        window.location.href =
            LOGIN_PAGE;

        throw new Error(
            "This account is not authorized for the Admin Portal."
        );

    }

}


/* =========================================================
   LOAD DRIVERS
========================================================= */

async function loadDrivers() {

    const {
        data: driverRows,
        error: driverError
    } =
        await supabaseClient
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
            "Driver loading failed:",
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
        } =
            await supabaseClient
                .from("profiles")
                .select(
                    "id,full_name,phone,email"
                )
                .in(
                    "id",
                    profileIds
                );

        if (profileError) {
            console.error(
                "Driver profile loading failed:",
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

    drivers =
        (driverRows || [])
            .map(driver => {
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
            })
            .filter(
                driver =>
                    driver.status === "active"
            );

}


/* =========================================================
   LOAD BOOKINGS
========================================================= */

async function loadBookings() {

    setLoadingState(
        true
    );


    const {
        data,
        error
    } =
        await supabaseClient
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

                booking_date,
                booking_time,

                pickup_scheduled_at,
                pickup_notes,

                created_at,
                updated_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Booking loading failed:",
            error
        );

        setLoadingState(
            false
        );

        showToast(
            error.message ||
            "Unable to load pickup bookings."
        );

        return;

    }


    allBookings =
        data || [];


    updateSummary();

    applyFilters();

    setLoadingState(
        false
    );

}


/* =========================================================
   LOADING STATE
========================================================= */

function setLoadingState(
    loading
) {

    if (
        loading &&
        allBookings.length === 0
    ) {

        listCount.textContent =
            "Loading pickups...";

    }

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
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]
    );

}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(
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

        return String(value);

    }


    return window.SSPAdminSettings.formatDate(date);

}


/* =========================================================
   TIME FORMAT
========================================================= */

function formatTime(
    value
) {

    if (!value) {

        return "";

    }


    const text =
        String(value);


    const parts =
        text.split(":");


    if (
        parts.length < 2
    ) {

        return text;

    }


    return `${parts[0]}:${parts[1]}`;

}


/* =========================================================
   BOOKING DATE / TIME
========================================================= */

function getBookingDateTime(
    booking
) {

    const date =
        booking.booking_date
            ? formatDate(
                booking.booking_date
            )
            : "";


    const time =
        booking.booking_time
            ? formatTime(
                booking.booking_time
            )
            : "";


    if (
        date &&
        time
    ) {

        return `${date}, ${time}`;

    }


    if (date) {

        return date;

    }


    if (
        booking.created_at
    ) {

        return formatDate(
            booking.created_at
        );

    }


    return "—";

}


/* =========================================================
   CUSTOMER
========================================================= */

function getCustomerName(
    booking
) {

    return (
        booking.pickup_name ||
        "Unknown Customer"
    );

}


function getCustomerPhone(
    booking
) {

    return (
        booking.pickup_phone ||
        "—"
    );

}


/* =========================================================
   PICKUP
========================================================= */

function getPickupAddress(
    booking
) {

    const address =
        booking.pickup_address ||
        "Pickup address not available";


    const city =
        booking.pickup_city ||
        "";


    if (
        city &&
        !address
            .toLowerCase()
            .includes(
                city.toLowerCase()
            )
    ) {

        return `${address}, ${city}`;

    }


    return address;

}


/* =========================================================
   DELIVERY
========================================================= */

function getDeliveryAddress(
    booking
) {

    const address =
        booking.delivery_address ||
        "Delivery address not available";


    const city =
        booking.delivery_city ||
        "";


    if (
        city &&
        !address
            .toLowerCase()
            .includes(
                city.toLowerCase()
            )
    ) {

        return `${address}, ${city}`;

    }


    return address;

}


/* =========================================================
   ROUTE
========================================================= */

function getRoute(
    booking
) {

    const from =
        booking.pickup_city ||
        "—";


    const to =
        booking.delivery_city ||
        "—";


    return `${from} → ${to}`;

}


/* =========================================================
   DRIVER
========================================================= */

function getDriver(
    booking
) {

    if (
        !booking.driver_id
    ) {

        return null;

    }


    return (
        drivers.find(
            driver =>
                String(driver.id) ===
                String(booking.driver_id)
        ) ||
        null
    );

}


function getDriverName(
    booking
) {

    const driver =
        getDriver(
            booking
        );


    return (
        driver?.full_name ||
        "Not assigned"
    );

}


function getDriverPhone(
    booking
) {

    const driver =
        getDriver(
            booking
        );


    return (
        driver?.phone ||
        "—"
    );

}


/* =========================================================
   PICKUP STATUS
========================================================= */

function getPickupStatus(
    booking
) {

    const status =
        String(
            booking.status || ""
        ).toLowerCase();


    if (
        status === "cancelled"
    ) {

        return "Cancelled";

    }


    if (
        status === "picked_up" ||
        status === "in_transit" ||
        status === "out_for_delivery" ||
        status === "delivered"
    ) {

        return "Pickup Finished";

    }


    if (
        status === "pickup_started"
    ) {

        return "Pickup Started";

    }


    if (
        status === "assigned"
    ) {

        return "Driver Assigned";

    }


    if (
        booking.pickup_scheduled_at
    ) {

        return "Scheduled";

    }


    if (
        status === "confirmed"
    ) {

        return "Pickup Pending";

    }


    return "Pickup Pending";

}


/* =========================================================
   CALL STATUS
========================================================= */

function getCallStatus(
    booking
) {

    switch (
        booking.call_confirmation_status
    ) {

        case "done":
            return "Confirmed";

        case "not_reachable":
            return "Not Reachable";

        case "cancelled":
            return "Cancelled";

        default:
            return "Required";

    }

}


/* =========================================================
   PICKUP SCHEDULE
========================================================= */

function getPickupSchedule(
    booking
) {

    if (
        !booking.pickup_scheduled_at
    ) {

        return "Not scheduled";

    }


    return formatDateTime(
        booking.pickup_scheduled_at
    );

}


/* =========================================================
   DATE TIME
========================================================= */

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

        return String(value);

    }


    return window.SSPAdminSettings.formatDateTime(date);

}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

    totalCount.textContent =
        allBookings.length;


    let pending = 0;

    let scheduled = 0;

    let assigned = 0;

    let started = 0;

    let finished = 0;


    allBookings.forEach(
        booking => {

            const status =
                getPickupStatus(
                    booking
                );


            if (
                status ===
                    "Pickup Pending" ||
                status ===
                    "Call Confirmation Required"
            ) {

                pending++;

            }


            if (
                status ===
                "Scheduled"
            ) {

                scheduled++;

            }


            if (
                status ===
                "Driver Assigned"
            ) {

                assigned++;

            }


            if (
                status ===
                "Pickup Started"
            ) {

                started++;

            }


            if (
                status ===
                "Pickup Finished"
            ) {

                finished++;

            }

        }
    );


    pendingCount.textContent =
        pending;

    scheduledCount.textContent =
        scheduled;

    assignedCount.textContent =
        assigned;

    startedCount.textContent =
        started;

    finishedCount.textContent =
        finished;

}


/* =========================================================
   FILTER
========================================================= */

function applyFilters() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const selectedStatus =
        statusFilter.value;


    filteredBookings =
        allBookings.filter(
            booking => {

                const searchable = [

                    booking.booking_id,

                    getCustomerName(
                        booking
                    ),

                    getCustomerPhone(
                        booking
                    ),

                    getPickupAddress(
                        booking
                    ),

                    getRoute(
                        booking
                    ),

                    getDriverName(
                        booking
                    ),

                    getDriverPhone(
                        booking
                    )

                ]
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchable.includes(
                        search
                    );


                const pickupStatus =
                    getPickupStatus(
                        booking
                    );


                let matchesStatus =
                    true;


                if (
                    selectedStatus
                ) {

                    matchesStatus =
                        pickupStatus ===
                        selectedStatus;

                }


                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );


    currentPage = 1;

    renderList();

}


/* =========================================================
   PAGINATION
========================================================= */

function getPageCount() {

    return Math.max(
        1,
        Math.ceil(
            filteredBookings.length /
            ROWS_PER_PAGE
        )
    );

}


function getPageData() {

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


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(
    status
) {

    switch (status) {

        case "Pickup Pending":
            return "status-pending";

        case "Scheduled":
            return "status-scheduled";

        case "Driver Assigned":
            return "status-assigned";

        case "Pickup Started":
            return "status-started";

        case "Pickup Finished":
            return "status-finished";

        case "Cancelled":
            return "status-cancelled";

        default:
            return "status-pending";

    }

}


/* =========================================================
   RENDER LIST
========================================================= */

function renderList() {

    const pageData =
        getPageData();


    pickupBody.innerHTML = "";

    mobileList.innerHTML = "";


    if (
        filteredBookings.length === 0
    ) {

        emptyState.classList.remove(
            "hidden"
        );

        document.querySelector(
            ".table-wrapper"
        ).style.display =
            "none";

        mobileList.style.display =
            "none";

    } else {

        emptyState.classList.add(
            "hidden"
        );


        if (
            window.innerWidth <= 768
        ) {

            document.querySelector(
                ".table-wrapper"
            ).style.display =
                "none";

            mobileList.style.display =
                "block";

        } else {

            document.querySelector(
                ".table-wrapper"
            ).style.display =
                "";

            mobileList.style.display =
                "none";

        }

    }


    pageData.forEach(
        booking => {

            renderDesktopRow(
                booking
            );

            renderMobileCard(
                booking
            );

        }
    );


    listCount.textContent =
        filteredBookings.length === 0
            ? "0 pickups"
            : `${filteredBookings.length} pickup${
                filteredBookings.length === 1
                    ? ""
                    : "s"
            }`;


    renderPagination();

}


/* =========================================================
   DESKTOP ROW
========================================================= */

function renderDesktopRow(
    booking
) {

    const status =
        getPickupStatus(
            booking
        );


    const driver =
        getDriver(
            booking
        );


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

            <span class="booking-date">

                ${escapeHTML(
                    getBookingDateTime(
                        booking
                    )
                )}

            </span>

        </td>


        <td>

            <strong>

                ${escapeHTML(
                    getCustomerName(
                        booking
                    )
                )}

            </strong>

            <span class="secondary-text">

                ${escapeHTML(
                    getCustomerPhone(
                        booking
                    )
                )}

            </span>

        </td>


        <td>

            ${escapeHTML(
                getPickupAddress(
                    booking
                )
            )}

            <span class="secondary-text">

                ${escapeHTML(
                    getCallStatus(
                        booking
                    )
                )}

            </span>

        </td>


        <td>

            ${escapeHTML(
                getRoute(
                    booking
                )
            )}

            <span class="secondary-text">

                To:
                ${escapeHTML(
                    getDeliveryAddress(
                        booking
                    )
                )}

            </span>

        </td>


        <td>

            <span class="driver-name">

                ${escapeHTML(
                    driver?.full_name ||
                    "Not assigned"
                )}

            </span>

            <span class="secondary-text">

                ${escapeHTML(
                    driver?.phone ||
                    "—"
                )}

            </span>

            <span class="driver-status">

                ${driver
                    ? "Assigned"
                    : "Not assigned"
                }

            </span>

        </td>


        <td>

            <span class="secondary-text">

                ${escapeHTML(
                    getPickupSchedule(
                        booking
                    )
                )}

            </span>

            <span
                class="
                    status-badge
                    ${getStatusClass(status)}
                "
            >

                ${escapeHTML(
                    status
                )}

            </span>

        </td>


        <td>

            <button
                type="button"
                class="action-button"
                data-booking-id="${escapeHTML(
                    booking.booking_id
                )}"
                title="Pickup details"
                aria-label="Pickup details"
            >
                👁
            </button>

        </td>

    `;


    pickupBody.appendChild(
        row
    );

}


/* =========================================================
   MOBILE CARD
========================================================= */

function renderMobileCard(
    booking
) {

    const status =
        getPickupStatus(
            booking
        );


    const driver =
        getDriver(
            booking
        );


    const card =
        document.createElement(
            "article"
        );


    card.className =
        "mobile-pickup-card";


    card.innerHTML = `

        <div class="mobile-top">

            <div>

                <div class="mobile-booking-id">

                    ${escapeHTML(
                        booking.booking_id
                    )}

                </div>


                <div class="mobile-booking-date">

                    ${escapeHTML(
                        getBookingDateTime(
                            booking
                        )
                    )}

                </div>


                <div class="mobile-customer">

                    ${escapeHTML(
                        getCustomerName(
                            booking
                        )
                    )}

                </div>

            </div>


            <span
                class="
                    status-badge
                    ${getStatusClass(status)}
                "
            >

                ${escapeHTML(
                    status
                )}

            </span>

        </div>


        <div class="mobile-route">

            <strong>
                Pickup:
            </strong>

            ${escapeHTML(
                getPickupAddress(
                    booking
                )
            )}

            <br><br>

            <strong>
                Route:
            </strong>

            ${escapeHTML(
                getRoute(
                    booking
                )
            )}

        </div>


        <div class="mobile-info-grid">


            <div class="mobile-info">

                <span>
                    Customer Phone
                </span>

                <strong>

                    ${escapeHTML(
                        getCustomerPhone(
                            booking
                        )
                    )}

                </strong>

            </div>


            <div class="mobile-info">

                <span>
                    Call
                </span>

                <strong>

                    ${escapeHTML(
                        getCallStatus(
                            booking
                        )
                    )}

                </strong>

            </div>


            <div class="mobile-info">

                <span>
                    Driver
                </span>

                <strong>

                    ${escapeHTML(
                        driver?.full_name ||
                        "Not assigned"
                    )}

                </strong>

            </div>


            <div class="mobile-info">

                <span>
                    Driver Phone
                </span>

                <strong>

                    ${escapeHTML(
                        driver?.phone ||
                        "—"
                    )}

                </strong>

            </div>


            <div class="mobile-info">

                <span>
                    Pickup Schedule
                </span>

                <strong>

                    ${escapeHTML(
                        getPickupSchedule(
                            booking
                        )
                    )}

                </strong>

            </div>


            <div class="mobile-info">

                <span>
                    Pickup Status
                </span>

                <strong>

                    ${escapeHTML(
                        status
                    )}

                </strong>

            </div>

        </div>


        <div class="mobile-action">

            <button
                type="button"
                class="action-button"
                data-booking-id="${escapeHTML(
                    booking.booking_id
                )}"
                title="Pickup details"
                aria-label="Pickup details"
            >
                👁
            </button>

        </div>

    `;


    mobileList.appendChild(
        card
    );

}


/* =========================================================
   ACTION BUTTON
========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".action-button"
            );


        if (!button) {

            return;

        }


        const bookingId =
            button.dataset.bookingId;


        if (!bookingId) {

            return;

        }


        openPickupDetails(
            bookingId
        );

    }
);


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination() {

    const totalPages =
        getPageCount();


    pageButtons.innerHTML =
        "";


    previousPage.disabled =
        currentPage <= 1;


    nextPage.disabled =
        currentPage >= totalPages;


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
            "page-button";


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

                renderList();

            }
        );


        pageButtons.appendChild(
            button
        );

    }

}


previousPage.addEventListener(
    "click",
    () => {

        if (
            currentPage > 1
        ) {

            currentPage--;

            renderList();

        }

    }
);


nextPage.addEventListener(
    "click",
    () => {

        const totalPages =
            getPageCount();


        if (
            currentPage <
            totalPages
        ) {

            currentPage++;

            renderList();

        }

    }
);


/* =========================================================
   OPEN DETAILS
========================================================= */

function openPickupDetails(
    bookingId
) {

    const booking =
        allBookings.find(
            item =>
                String(
                    item.booking_id
                ) ===
                String(
                    bookingId
                )
        );


    if (!booking) {

        showToast(
            "Booking could not be found."
        );

        return;

    }


    selectedBooking =
        booking;


    renderPickupModal(
        booking
    );


    pickupModal.classList.add(
        "open"
    );


    pickupModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "details-open"
    );


    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   RENDER MODAL
========================================================= */

function renderPickupModal(
    booking
) {

    const status =
        getPickupStatus(
            booking
        );


    const driver =
        getDriver(
            booking
        );


    modalBookingId.textContent =
        booking.booking_id;


    modalContent.innerHTML = `

        <div class="detail-section">

            <h3>
                Booking Information
            </h3>


            <div class="detail-grid">


                <div class="detail-item">

                    <span>
                        Booking ID
                    </span>

                    <strong>
                        ${escapeHTML(
                            booking.booking_id
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Booking Date & Time
                    </span>

                    <strong>
                        ${escapeHTML(
                            getBookingDateTime(
                                booking
                            )
                        )}
                    </strong>

                </div>


                <div class="detail-item">

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


                <div class="detail-item">

                    <span>
                        Customer Phone
                    </span>

                    <strong>
                        ${escapeHTML(
                            getCustomerPhone(
                                booking
                            )
                        )}
                    </strong>

                </div>


                <div class="detail-item full">

                    <span>
                        Pickup Location
                    </span>

                    <strong>
                        ${escapeHTML(
                            getPickupAddress(
                                booking
                            )
                        )}
                    </strong>

                </div>


                <div class="detail-item full">

                    <span>
                        Delivery Location
                    </span>

                    <strong>
                        ${escapeHTML(
                            getDeliveryAddress(
                                booking
                            )
                        )}
                    </strong>

                </div>


                <div class="detail-item">

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


                <div class="detail-item">

                    <span>
                        Parcel
                    </span>

                    <strong>
                        ${escapeHTML(
                            booking.parcel_type ||
                            "—"
                        )}
                        ·
                        ${escapeHTML(
                            booking.pieces ||
                            0
                        )}
                        piece(s)
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Weight
                    </span>

                    <strong>
                        ${escapeHTML(
                            booking.parcel_weight ||
                            "—"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Current Pickup Status
                    </span>

                    <strong>
                        ${escapeHTML(
                            status
                        )}
                    </strong>

                </div>

            </div>

        </div>


        <div class="detail-section">

            <h3>
                Pickup Update
            </h3>


            <div class="update-grid">


                <div class="form-group">

                    <label
                        for="pickupStatusInput"
                    >
                        Pickup Status
                    </label>

                    <select
                        id="pickupStatusInput"
                    >

                        ${createStatusOptions(
                            booking
                        )}

                    </select>

                </div>


                <div class="form-group">

                    <label
                        for="callStatusInput"
                    >
                        Call Confirmation
                    </label>

                    <select
                        id="callStatusInput"
                    >

                        ${createCallOptions(
                            booking
                        )}

                    </select>

                </div>


                <div class="form-group">

                    <label
                        for="driverIdInput"
                    >
                        Assign Driver
                    </label>

                    <select
                        id="driverIdInput"
                    >

                        ${createDriverOptions(
                            booking.driver_id
                        )}

                    </select>

                </div>


                <div class="form-group">

                    <label
                        for="pickupScheduleInput"
                    >
                        Pickup Schedule
                    </label>

                    <input
                        type="datetime-local"
                        id="pickupScheduleInput"
                        value="${escapeHTML(
                            toDateTimeLocal(
                                booking.pickup_scheduled_at
                            )
                        )}"
                    >

                </div>


                <div class="form-group full">

                    <label
                        for="pickupNotesInput"
                    >
                        Pickup Notes
                    </label>

                    <input
                        type="text"
                        id="pickupNotesInput"
                        value="${escapeHTML(
                            booking.pickup_notes ||
                            ""
                        )}"
                        placeholder="Enter pickup notes"
                    >

                </div>


                <div class="form-group">

                    <label>
                        Driver Phone
                    </label>

                    <input
                        type="text"
                        id="driverPhoneDisplay"
                        value="${escapeHTML(
                            driver?.phone ||
                            "—"
                        )}"
                        readonly
                    >

                </div>


                <div class="form-group">

                    <label>
                        Driver Email
                    </label>

                    <input
                        type="text"
                        id="driverEmailDisplay"
                        value="${escapeHTML(
                            driver?.email ||
                            "—"
                        )}"
                        readonly
                    >

                </div>

            </div>

        </div>

    `;


    const driverSelect =
        document.getElementById(
            "driverIdInput"
        );


    if (driverSelect) {

        driverSelect.addEventListener(
            "change",
            updateDriverDisplay
        );

    }

}


/* =========================================================
   STATUS OPTIONS
========================================================= */

function createStatusOptions(
    booking
) {

    const dbStatus =
        String(
            booking.status ||
            "pending"
        ).toLowerCase();


    const selected =
        mapDatabaseStatusToPickupStatus(
            dbStatus
        );


    const statuses = [

        {
            value: "pending",
            label: "Pickup Pending"
        },

        {
            value: "confirmed",
            label: "Confirmed"
        },

        {
            value: "assigned",
            label: "Driver Assigned"
        },

        {
            value: "pickup_started",
            label: "Pickup Started"
        },

        {
            value: "picked_up",
            label: "Pickup Finished"
        }

    ];


    return statuses.map(
        item => `

            <option
                value="${item.value}"
                ${
                    item.value === selected
                        ? "selected"
                        : ""
                }
            >
                ${item.label}
            </option>

        `
    ).join("");

}


function mapDatabaseStatusToPickupStatus(
    status
) {

    switch (status) {

        case "confirmed":
            return "confirmed";

        case "assigned":
            return "assigned";

        case "pickup_started":
            return "pickup_started";

        case "picked_up":
        case "in_transit":
        case "out_for_delivery":
        case "delivered":
            return "picked_up";

        default:
            return "pending";

    }

}


/* =========================================================
   CALL OPTIONS
========================================================= */

function createCallOptions(
    booking
) {

    const selected =
        booking.call_confirmation_status ||
        "required";


    const options = [

        {
            value: "required",
            label: "Call Confirmation Required"
        },

        {
            value: "done",
            label: "Call Confirmed"
        },

        {
            value: "not_reachable",
            label: "Customer Not Reachable"
        },

        {
            value: "cancelled",
            label: "Call Cancelled"
        }

    ];


    return options.map(
        option => `

            <option
                value="${option.value}"
                ${
                    option.value === selected
                        ? "selected"
                        : ""
                }
            >
                ${option.label}
            </option>

        `
    ).join("");

}


/* =========================================================
   DRIVER OPTIONS
========================================================= */

function createDriverOptions(
    selectedDriverId
) {

    let html = `

        <option value="">
            Not Assigned
        </option>

    `;


    drivers.forEach(
        driver => {

            html += `

                <option
                    value="${escapeHTML(
                        driver.id
                    )}"
                    ${
                        String(
                            driver.id
                        ) ===
                        String(
                            selectedDriverId ||
                            ""
                        )
                            ? "selected"
                            : ""
                    }
                >

                    ${escapeHTML(
                        driver.full_name ||
                        driver.email ||
                        "Driver"
                    )}
                    ${driver.driver_id
                        ? ` (${escapeHTML(driver.driver_id)})`
                        : ""}

                </option>

            `;

        }
    );


    return html;

}


/* =========================================================
   DRIVER DISPLAY
========================================================= */

function updateDriverDisplay() {

    const driverId =
        document.getElementById(
            "driverIdInput"
        )?.value;


    const driver =
        drivers.find(
            item =>
                String(item.id) ===
                String(driverId)
        );


    const phone =
        document.getElementById(
            "driverPhoneDisplay"
        );


    const email =
        document.getElementById(
            "driverEmailDisplay"
        );


    if (phone) {

        phone.value =
            driver?.phone ||
            "—";

    }


    if (email) {

        email.value =
            driver?.email ||
            "—";

    }

}


/* =========================================================
   DATETIME LOCAL
========================================================= */

function toDateTimeLocal(
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


    const pad =
        number =>
            String(number)
                .padStart(
                    2,
                    "0"
                );


    return `${date.getFullYear()}-${
        pad(date.getMonth() + 1)
    }-${
        pad(date.getDate())
    }T${
        pad(date.getHours())
    }:${
        pad(date.getMinutes())
    }`;

}


/* =========================================================
   SAVE PICKUP UPDATE
========================================================= */

savePickupButton.addEventListener(
    "click",
    savePickupUpdate
);


async function savePickupUpdate() {

    if (
        !selectedBooking
    ) {

        return;

    }


    savePickupButton.disabled =
        true;


    savePickupButton.textContent =
        "Saving...";


    try {
        pickupSettings =
            await window.SSPAdminSettings.get(true);

        const status =
            document.getElementById(
                "pickupStatusInput"
            )?.value ||
            "pending";


        const callStatus =
            document.getElementById(
                "callStatusInput"
            )?.value ||
            "required";


        const driverId =
            document.getElementById(
                "driverIdInput"
            )?.value ||
            null;


        const scheduleValue =
            document.getElementById(
                "pickupScheduleInput"
            )?.value ||
            "";


        const notes =
            document.getElementById(
                "pickupNotesInput"
            )?.value
                .trim() ||
            null;


        /* =================================================
           WORKFLOW VALIDATION
        ================================================= */

        if (
            (
                status === "assigned" ||
                status === "pickup_started" ||
                status === "picked_up"
            ) &&
            callStatus !== "done"
        ) {

            throw new Error(
                "Customer call must be confirmed before assigning or starting the pickup."
            );

        }


        if (
            (
                status === "assigned" ||
                status === "pickup_started" ||
                status === "picked_up"
            ) &&
            pickupSettings.requireDriverAssignment &&
            !driverId
        ) {

            throw new Error(
                "Please assign a driver before moving the pickup to this stage."
            );

        }


        /* =================================================
           BUILD UPDATE
        ================================================= */

        const updatePayload = {

            status:
                status,

            call_confirmation_status:
                callStatus,

            driver_id:
                driverId,

            pickup_scheduled_at:
                scheduleValue
                    ? new Date(
                        scheduleValue
                    ).toISOString()
                    : null,

            pickup_notes:
                notes,

            updated_at:
                new Date().toISOString()

        };


        /* =================================================
           CALL CONFIRMATION
        ================================================= */

        if (
            callStatus === "done"
        ) {

            updatePayload.call_confirmed_at =
                selectedBooking.call_confirmed_at ||
                new Date().toISOString();

            updatePayload.call_confirmed_by =
                selectedBooking.call_confirmed_by ||
                currentUser.id;

        } else {

            updatePayload.call_confirmed_at =
                null;

            updatePayload.call_confirmed_by =
                null;

        }


        /* =================================================
           SUPABASE UPDATE
        ================================================= */

        const {
            data,
            error
        } =
            await supabaseClient
                .from("bookings")
                .update(
                    updatePayload
                )
                .eq(
                    "id",
                    selectedBooking.id
                )
                .select()
                .single();


        if (error) {

            console.error(
                "Pickup update failed:",
                error
            );

            throw new Error(
                error.message ||
                "Pickup update failed."
            );

        }


        /* =================================================
           UPDATE LOCAL PAGE STATE
           NOT localStorage.
           This is only in-memory UI state.
        ================================================= */

        selectedBooking =
            data;


        showToast(
            "Pickup update saved successfully."
        );


        closePickupModal();


        await loadBookings();

    } catch (error) {

        console.error(
            "Unable to save pickup update:",
            error
        );


        showToast(
            error.message ||
            "Unable to save pickup update."
        );

    } finally {

        savePickupButton.disabled =
            false;

        savePickupButton.textContent =
            "Save Pickup Update";

    }

}


/* =========================================================
   VIEW BOOKING
========================================================= */

viewBookingButton.addEventListener(
    "click",
    () => {

        if (
            !selectedBooking
        ) {

            return;

        }


        window.location.href =
            `bookings-details.html?id=${encodeURIComponent(
                selectedBooking.booking_id
            )}`;

    }
);


/* =========================================================
   CLOSE MODAL
========================================================= */

function closePickupModal() {

    pickupModal.classList.remove(
        "open"
    );


    pickupModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "details-open"
    );


    document.body.style.overflow =
        "";

}


closeModal.addEventListener(
    "click",
    closePickupModal
);


modalBackdrop.addEventListener(
    "click",
    closePickupModal
);


/* =========================================================
   SIDEBAR
========================================================= */

function isMobile() {

    return window.innerWidth <= 768;

}


function openMobileSidebar() {

    sidebar.classList.add(
        "open"
    );

    sidebarOverlay.classList.add(
        "open"
    );

}


function closeMobileSidebar() {

    sidebar.classList.remove(
        "open"
    );

    sidebarOverlay.classList.remove(
        "open"
    );

}


function toggleSidebar() {

    if (
        isMobile()
    ) {

        if (
            sidebar.classList.contains(
                "open"
            )
        ) {

            closeMobileSidebar();

        } else {

            openMobileSidebar();

        }

        return;

    }


    document.body.classList.toggle(
        "sidebar-collapsed"
    );

}


sidebarToggle?.addEventListener(
    "click",
    toggleSidebar
);


sidebarOverlay?.addEventListener(
    "click",
    closeMobileSidebar
);


/* =========================================================
   MOBILE MORE
========================================================= */

bottomMoreButton?.addEventListener(
    "click",
    () => {

        if (
            !isMobile()
        ) {

            return;

        }


        if (
            sidebar.classList.contains(
                "open"
            )
        ) {

            closeMobileSidebar();

        } else {

            openMobileSidebar();

        }

    }
);


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
    "input",
    applyFilters
);


statusFilter.addEventListener(
    "change",
    applyFilters
);


/* =========================================================
   REFRESH
========================================================= */

refreshButton.addEventListener(
    "click",
    async () => {

        try {

            await loadDrivers();

            await loadBookings();

            showToast(
                "Pickup list refreshed."
            );

        } catch (error) {

            console.error(
                error
            );

            showToast(
                "Unable to refresh pickup list."
            );

        }

    }
);


/* =========================================================
   ESCAPE
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closePickupModal();

            closeMobileSidebar();

        }

    }
);


/* =========================================================
   RESIZE
========================================================= */

window.addEventListener(
    "resize",
    () => {

        if (
            !isMobile()
        ) {

            closeMobileSidebar();

        }


        renderList();

    }
);


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message
) {

    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
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