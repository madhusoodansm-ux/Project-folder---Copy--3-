/* =====================================================
   SSP DRIVER PORTAL
   DELIVERIES JAVASCRIPT
   SUPABASE VERSION
===================================================== */

"use strict";


/* =====================================================
   CONFIGURATION
===================================================== */

const BOOKING_DETAILS_PAGE = "booking-details.html";

const POD_BUCKET = "delivery-pod";


/* =====================================================
   STATE
===================================================== */

let bookings = [];

let currentDriver = null;

let currentFilter = "all";

let selectedBookingId = null;

let selectedProofFile = null;

let toastTimer = null;

let sortLatestFirst = true;


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    try {

        /*
           Sidebar can work immediately.
        */
        setupSidebar();

        setupFilters();

        setupSearch();

        setupSort();

        setupModals();

        setupProofUpload();

        /*
           Load authenticated driver's deliveries.
        */
        await loadBookings();

        renderBookings();

    } catch (error) {

        console.error(
            "Deliveries page initialization error:",
            error
        );

        showToast(
            "Unable to load deliveries."
        );

    }

});


/* =====================================================
   LOAD BOOKINGS FROM SUPABASE
===================================================== */

async function loadBookings() {

    if (
        !window.driverAuth ||
        typeof window.driverAuth.getCurrentDriver !== "function"
    ) {

        console.error(
            "driverAuth is not available."
        );

        showToast(
            "Driver authentication is not available."
        );

        return;

    }


    /*
       Get currently logged-in driver.
    */
    currentDriver =
        await window.driverAuth.getCurrentDriver();


    if (!currentDriver) {

        return;

    }


    /*
       IMPORTANT:
       bookings.driver_id stores drivers.id UUID.

       It does NOT store the human-readable
       driver_id such as DRV-XXXXXXXX.
    */
    const { data, error } =
        await supabaseClient
            .from("bookings")
            .select("*")
            .eq(
                "driver_id",
                currentDriver.driverUuid
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Unable to load driver deliveries:",
            error
        );

        showToast(
            "Unable to load deliveries."
        );

        bookings = [];

        return;

    }


    bookings =
        Array.isArray(data)
            ? data
            : [];

}


/* =====================================================
   GET BOOKING ID
===================================================== */

function getBookingId(booking) {

    return String(
        booking?.booking_id ??
        booking?.id ??
        ""
    );

}


/* =====================================================
   GET DELIVERY STATUS
===================================================== */

function getDeliveryStatus(booking) {

    return String(
        booking?.status ??
        "pending"
    );

}


/* =====================================================
   NORMALIZE STATUS
===================================================== */

function statusType(status) {

    const value =
        String(status ?? "")
            .trim()
            .toLowerCase();


    /*
       Delivered must be checked first.
    */
    if (
        value === "delivered" ||
        value === "delivery completed" ||
        value === "completed"
    ) {

        return "delivered";

    }


    /*
       Out for delivery.
    */
    if (
        value === "out_for_delivery" ||
        value.includes("out for delivery") ||
        value === "in_transit" ||
        value.includes("in transit") ||
        value === "picked_up"
    ) {

        return "out";

    }


    /*
       All earlier delivery stages are treated
       as pending for this page.
    */
    return "pending";

}


/* =====================================================
   GET FILTERED BOOKINGS
===================================================== */

function getFilteredBookings() {

    let result =
        [...bookings];


    /*
       STATUS FILTER
    */
    if (currentFilter !== "all") {

        result =
            result.filter(
                booking => {

                    return (
                        statusType(
                            getDeliveryStatus(booking)
                        ) === currentFilter
                    );

                }
            );

    }


    /*
       SEARCH
    */
    const searchInput =
        document.getElementById(
            "searchInput"
        );


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    if (search) {

        result =
            result.filter(
                booking => {

                    const searchable = [

                        booking.booking_id,

                        booking.id,

                        booking.receiver_name,

                        booking.receiver_phone,

                        booking.delivery_address,

                        booking.delivery_city,

                        booking.delivery_district,

                        booking.delivery_state,

                        booking.delivery_pincode,

                        booking.parcel_name,

                        booking.parcel_type,

                        booking.parcel_description

                    ]
                    .filter(
                        value =>
                            value !== null &&
                            value !== undefined
                    )
                    .join(" ")
                    .toLowerCase();


                    return searchable.includes(
                        search
                    );

                }
            );

    }


    /*
       SORT
    */
    result.sort(
        (a, b) => {

            const dateA =
                new Date(
                    a.created_at || 0
                ).getTime();

            const dateB =
                new Date(
                    b.created_at || 0
                ).getTime();


            return sortLatestFirst
                ? dateB - dateA
                : dateA - dateB;

        }
    );


    return result;

}


/* =====================================================
   RENDER BOOKINGS
===================================================== */

function renderBookings() {

    const list =
        document.getElementById(
            "deliveryList"
        );


    const empty =
        document.getElementById(
            "emptyState"
        );


    if (!list) {

        console.error(
            "deliveryList element was not found."
        );

        return;

    }


    const results =
        getFilteredBookings();


    updateCounts();


    list.innerHTML = "";


    if (!results.length) {

        if (empty) {

            empty.classList.remove(
                "hidden"
            );

        }


        updateResultText(0);

        return;

    }


    if (empty) {

        empty.classList.add(
            "hidden"
        );

    }


    results.forEach(
        booking => {

            list.appendChild(
                createDeliveryCard(
                    booking
                )
            );

        }
    );


    updateResultText(
        results.length
    );

}


/* =====================================================
   RESULT TEXT
===================================================== */

function updateResultText(count) {

    const resultText =
        document.getElementById(
            "resultText"
        );


    if (!resultText) {

        return;

    }


    resultText.textContent =
        `${count} ${
            count === 1
                ? "delivery"
                : "deliveries"
        }`;

}


/* =====================================================
   CREATE DELIVERY CARD
===================================================== */

function createDeliveryCard(booking) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "delivery-card";


    const id =
        getBookingId(booking);


    const customer =
        booking.receiver_name ||
        "Receiver";


    const phone =
        booking.receiver_phone ||
        "";


    /*
       Build complete delivery address.
    */
    const location =
        buildDeliveryLocation(
            booking
        );


    /*
       Format scheduled delivery date/time.
    */
    const schedule =
        formatDeliverySchedule(
            booking
        );


    const packageType =
        booking.parcel_type ||
        booking.parcel_name ||
        "Parcel";


    const pieces =
        booking.pieces ??
        1;


    const weight =
        booking.parcel_weight !== null &&
        booking.parcel_weight !== undefined
            ? `${booking.parcel_weight} kg`
            : "—";


    const status =
        getDeliveryStatus(
            booking
        );


    const type =
        statusType(
            status
        );


    let statusClass =
        "status-pending";


    let displayStatus =
        "Pending";


    if (type === "out") {

        statusClass =
            "status-out";

        displayStatus =
            "Out for Delivery";

    }


    if (type === "delivered") {

        statusClass =
            "status-delivered";

        displayStatus =
            "Delivered";

    }


    const deliveredDisabled =
        type === "delivered"
            ? "disabled"
            : "";


    card.innerHTML = `

        <div class="delivery-top">

            <div class="package-icon">

                <i class="fa-solid fa-box"></i>

            </div>


            <div class="delivery-main">

                <div class="booking-id">

                    ${escapeHTML(id)}

                </div>


                <div class="customer-name">

                    ${escapeHTML(customer)}

                </div>


                <span class="customer-phone">

                    ${escapeHTML(phone)}

                </span>

            </div>


            <div class="delivery-header-right">

                <span class="delivery-status ${statusClass}">

                    ${escapeHTML(displayStatus)}

                </span>


                <button
                    type="button"
                    class="booking-details-button"
                    data-action="details"
                    data-id="${escapeAttribute(id)}"
                    aria-label="View booking details"
                    title="View booking details"
                >

                    <i class="fa-solid fa-chevron-right"></i>

                </button>

            </div>

        </div>


        <div class="delivery-details">

            <div class="detail-row">

                <div class="detail-icon">

                    <i class="fa-solid fa-location-dot"></i>

                </div>


                <div class="detail-content">

                    <span class="detail-label">

                        Delivery Location

                    </span>


                    <span class="detail-value">

                        ${escapeHTML(location)}

                    </span>

                </div>

            </div>


            <div class="detail-row">

                <div class="detail-icon">

                    <i class="fa-regular fa-calendar"></i>

                </div>


                <div class="detail-content">

                    <span class="detail-label">

                        Schedule

                    </span>


                    <span class="detail-value">

                        ${escapeHTML(schedule)}

                    </span>

                </div>

            </div>

        </div>


        <div class="package-info">

            <span class="package-tag">

                <i class="fa-solid fa-box"></i>

                ${escapeHTML(packageType)}

            </span>


            <span class="package-tag">

                <i class="fa-solid fa-cubes"></i>

                ${escapeHTML(String(pieces))} pcs

            </span>


            <span class="package-tag">

                <i class="fa-solid fa-weight-hanging"></i>

                ${escapeHTML(weight)}

            </span>

        </div>


        <div class="delivery-actions">

            <a
                class="call-button"
                href="tel:${escapeAttribute(phone)}"
                aria-label="Call receiver"
            >

                <i class="fa-solid fa-phone"></i>

                Call Receiver

            </a>


            <button
                type="button"
                class="delivered-button"
                data-action="delivered"
                data-id="${escapeAttribute(id)}"
                ${deliveredDisabled}
            >

                <i class="fa-solid fa-check"></i>

                Delivered

            </button>


            <button
                type="button"
                class="proof-button"
                data-action="proof"
                data-id="${escapeAttribute(id)}"
            >

                <i class="fa-solid fa-camera"></i>

                Proof of Delivery

            </button>

        </div>

    `;


    /*
       DETAILS
    */
    const detailsButton =
        card.querySelector(
            '[data-action="details"]'
        );


    if (detailsButton) {

        detailsButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();

                openBookingDetails(
                    id
                );

            }
        );

    }


    /*
       DELIVERED
    */
    const deliveredButton =
        card.querySelector(
            '[data-action="delivered"]'
        );


    if (deliveredButton) {

        deliveredButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();


                if (
                    deliveredButton.disabled
                ) {

                    return;

                }


                openDeliveryConfirmation(
                    id
                );

            }
        );

    }


    /*
       PROOF
    */
    const proofButton =
        card.querySelector(
            '[data-action="proof"]'
        );


    if (proofButton) {

        proofButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();

                openProofModal(
                    id
                );

            }
        );

    }


    /*
       Clicking card opens details.
    */
    card.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    "button, a"
                )
            ) {

                return;

            }


            openBookingDetails(
                id
            );

        }
    );


    return card;

}


/* =====================================================
   BUILD DELIVERY LOCATION
===================================================== */

function buildDeliveryLocation(
    booking
) {

    const parts = [

        booking.delivery_address,

        booking.delivery_landmark,

        booking.delivery_city,

        booking.delivery_district,

        booking.delivery_state,

        booking.delivery_pincode

    ]
    .filter(
        value =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
    );


    return parts.length
        ? parts.join(", ")
        : "Delivery location not available";

}


/* =====================================================
   FORMAT DELIVERY SCHEDULE
===================================================== */

function formatDeliverySchedule(
    booking
) {

    if (
        booking.delivery_scheduled_at
    ) {

        const date =
            new Date(
                booking.delivery_scheduled_at
            );


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date.toLocaleString(
                "en-IN",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            );

        }

    }


    const datePart =
        booking.booking_date || "";


    const timePart =
        booking.booking_time || "";


    const combined =
        [
            datePart,
            timePart
        ]
        .filter(Boolean)
        .join(" ");


    return combined ||
        "Schedule not available";

}


/* =====================================================
   OPEN BOOKING DETAILS
===================================================== */

function openBookingDetails(
    bookingId
) {

    if (!bookingId) {

        return;

    }


    /*
       Security check:
       booking must belong to the
       authenticated driver's loaded bookings.
    */
    const booking =
        bookings.find(
            item =>
                getBookingId(item) ===
                String(bookingId)
        );


    if (!booking) {

        showToast(
            "Booking not available for this driver."
        );

        return;

    }


    const url =
        `${BOOKING_DETAILS_PAGE}?id=${encodeURIComponent(
            bookingId
        )}`;


    window.location.href =
        url;

}


/* =====================================================
   COUNTS
===================================================== */

function updateCounts() {

    const pending =
        bookings.filter(
            booking =>
                statusType(
                    getDeliveryStatus(
                        booking
                    )
                ) === "pending"
        ).length;


    const out =
        bookings.filter(
            booking =>
                statusType(
                    getDeliveryStatus(
                        booking
                    )
                ) === "out"
        ).length;


    const delivered =
        bookings.filter(
            booking =>
                statusType(
                    getDeliveryStatus(
                        booking
                    )
                ) === "delivered"
        ).length;


    setText(
        "allCount",
        bookings.length
    );


    setText(
        "pendingCount",
        pending
    );


    setText(
        "outCount",
        out
    );


    setText(
        "deliveredCount",
        delivered
    );


    /*
       Pending deliveries shown as notification count.
    */
    setText(
        "notificationCount",
        pending
    );

}


/* =====================================================
   FILTERS
===================================================== */

function setupFilters() {

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
                                item => {

                                    item.classList.remove(
                                        "active"
                                    );

                                }
                            );


                        button.classList.add(
                            "active"
                        );


                        currentFilter =
                            button.dataset.filter ||
                            "all";


                        renderBookings();

                    }
                );

            }
        );

}


/* =====================================================
   SEARCH
===================================================== */

function setupSearch() {

    const input =
        document.getElementById(
            "searchInput"
        );


    if (!input) {

        return;

    }


    input.addEventListener(
        "input",
        renderBookings
    );

}


/* =====================================================
   SORT
===================================================== */

function setupSort() {

    const button =
        document.getElementById(
            "sortButton"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        () => {

            sortLatestFirst =
                !sortLatestFirst;


            const label =
                button.querySelector(
                    "span"
                );


            if (label) {

                label.textContent =
                    sortLatestFirst
                        ? "Sort: Latest"
                        : "Sort: Oldest";

            }


            renderBookings();

        }
    );

}


/* =====================================================
   SIDEBAR
===================================================== */

function setupSidebar() {

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    const menu =
        document.getElementById(
            "menuButton"
        );


    const close =
        document.getElementById(
            "sidebarClose"
        );


    if (
        !sidebar ||
        !overlay ||
        !menu ||
        !close
    ) {

        return;

    }


    function openSidebar() {

        sidebar.classList.add(
            "open"
        );

        overlay.classList.remove(
            "hidden"
        );

        document.body.classList.add(
            "sidebar-open"
        );

    }


    function closeSidebar() {

        sidebar.classList.remove(
            "open"
        );

        overlay.classList.add(
            "hidden"
        );

        document.body.classList.remove(
            "sidebar-open"
        );

    }


    menu.addEventListener(
        "click",
        openSidebar
    );


    close.addEventListener(
        "click",
        closeSidebar
    );


    overlay.addEventListener(
        "click",
        closeSidebar
    );

}


/* =====================================================
   MODALS
===================================================== */

function setupModals() {

    document
        .querySelectorAll(
            "[data-close]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const modalId =
                            button.dataset.close;


                        closeModal(
                            modalId
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".modal-overlay"
        )
        .forEach(
            overlay => {

                overlay.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            overlay
                        ) {

                            overlay.classList.add(
                                "hidden"
                            );

                        }

                    }
                );

            }
        );


    const confirmButton =
        document.getElementById(
            "confirmDeliveredButton"
        );


    if (confirmButton) {

        confirmButton.addEventListener(
            "click",
            confirmDelivery
        );

    }

}


/* =====================================================
   DELIVERY CONFIRMATION
===================================================== */

function openDeliveryConfirmation(
    bookingId
) {

    selectedBookingId =
        String(bookingId);


    const booking =
        bookings.find(
            item =>
                getBookingId(item) ===
                String(bookingId)
        );


    if (!booking) {

        showToast(
            "Booking not found."
        );

        return;

    }


    const modal =
        document.getElementById(
            "deliveryConfirmModal"
        );


    if (!modal) {

        const confirmed =
            window.confirm(
                "The product parcel has been delivered. Are you sure you want to confirm delivery?"
            );


        if (confirmed) {

            confirmDelivery();

        }

        return;

    }


    modal.classList.remove(
        "hidden"
    );

}


/* =====================================================
   CONFIRM DELIVERY
===================================================== */

async function confirmDelivery() {

    if (!selectedBookingId) {

        return;

    }


    const booking =
        bookings.find(
            item =>
                getBookingId(item) ===
                String(selectedBookingId)
        );


    if (!booking) {

        showToast(
            "Booking not found."
        );

        return;

    }


    if (
        getDeliveryStatus(booking) ===
        "delivered"
    ) {

        closeModal(
            "deliveryConfirmModal"
        );

        showToast(
            "This booking is already delivered."
        );

        return;

    }


    const bookingUuid =
        booking.id;


    if (!bookingUuid) {

        showToast(
            "Booking database ID is missing."
        );

        return;

    }


    /*
       Update ONLY this driver's booking.
    */
    const { error } =
        await supabaseClient
            .from("bookings")
            .update({
                status: "delivered"
            })
            .eq(
                "id",
                bookingUuid
            )
            .eq(
                "driver_id",
                currentDriver.driverUuid
            );


    if (error) {

        console.error(
            "Delivery status update failed:",
            error
        );

        showToast(
            "Unable to mark delivery as completed."
        );

        return;

    }


    const completedId =
        selectedBookingId;


    selectedBookingId =
        null;


    closeModal(
        "deliveryConfirmModal"
    );


    /*
       Reload from Supabase so the page
       always displays the database value.
    */
    await loadBookings();


    renderBookings();


    showToast(
        `Booking ${completedId} marked as delivered.`
    );

}


/* =====================================================
   PROOF OF DELIVERY
===================================================== */

function openProofModal(
    bookingId
) {

    const booking =
        bookings.find(
            item =>
                getBookingId(item) ===
                String(bookingId)
        );


    if (!booking) {

        showToast(
            "Booking not found."
        );

        return;

    }


    selectedBookingId =
        String(bookingId);


    selectedProofFile =
        null;


    const preview =
        document.getElementById(
            "proofPreview"
        );


    const image =
        document.getElementById(
            "proofImage"
        );


    if (preview) {

        preview.classList.add(
            "hidden"
        );

    }


    if (image) {

        image.removeAttribute(
            "src"
        );

    }


    resetProofInputs();


    /*
       If this booking already has POD,
       we still allow replacing it.
    */
    const modal =
        document.getElementById(
            "proofModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    } else {

        showToast(
            "Proof of delivery window is not available."
        );

    }

}


/* =====================================================
   CAMERA + PHOTOS
===================================================== */

function setupProofUpload() {

    const cameraInput =
        document.getElementById(
            "cameraInput"
        );


    const photoInput =
        document.getElementById(
            "photoInput"
        );


    if (cameraInput) {

        cameraInput.addEventListener(
            "change",
            event => {

                handleProofFile(
                    event.target.files[0]
                );

            }
        );

    }


    if (photoInput) {

        photoInput.addEventListener(
            "change",
            event => {

                handleProofFile(
                    event.target.files[0]
                );

            }
        );

    }


    const removeButton =
        document.getElementById(
            "removeProof"
        );


    if (removeButton) {

        removeButton.addEventListener(
            "click",
            removeProof
        );

    }


    const saveButton =
        document.getElementById(
            "saveProof"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveProof
        );

    }

}


/* =====================================================
   PROCESS PHOTO
===================================================== */

function handleProofFile(
    file
) {

    if (!file) {

        return;

    }


    if (
        !file.type ||
        !file.type.startsWith(
            "image/"
        )
    ) {

        showToast(
            "Please select an image."
        );

        return;

    }


    selectedProofFile =
        file;


    const reader =
        new FileReader();


    reader.onload =
        event => {

            const image =
                document.getElementById(
                    "proofImage"
                );


            const preview =
                document.getElementById(
                    "proofPreview"
                );


            if (image) {

                image.src =
                    event.target.result;

            }


            if (preview) {

                preview.classList.remove(
                    "hidden"
                );

            }

        };


    reader.readAsDataURL(
        file
    );

}


/* =====================================================
   REMOVE PHOTO
===================================================== */

function removeProof() {

    selectedProofFile =
        null;


    const image =
        document.getElementById(
            "proofImage"
        );


    const preview =
        document.getElementById(
            "proofPreview"
        );


    if (image) {

        image.removeAttribute(
            "src"
        );

    }


    if (preview) {

        preview.classList.add(
            "hidden"
        );

    }


    resetProofInputs();

}


/* =====================================================
   RESET PROOF INPUTS
===================================================== */

function resetProofInputs() {

    const cameraInput =
        document.getElementById(
            "cameraInput"
        );


    const photoInput =
        document.getElementById(
            "photoInput"
        );


    if (cameraInput) {

        cameraInput.value =
            "";

    }


    if (photoInput) {

        photoInput.value =
            "";

    }

}


/* =====================================================
   SAVE PROOF OF DELIVERY
===================================================== */

async function saveProof() {

    if (!selectedProofFile) {

        showToast(
            "Please select or capture a photo first."
        );

        return;

    }


    if (!selectedBookingId) {

        showToast(
            "Booking not selected."
        );

        return;

    }


    const booking =
        bookings.find(
            item =>
                getBookingId(item) ===
                String(selectedBookingId)
        );


    if (!booking) {

        showToast(
            "Booking not found."
        );

        return;

    }


    if (!currentDriver) {

        showToast(
            "Driver session not available."
        );

        return;

    }


    /*
       Create a unique storage path.

       Example:
       DRIVER_UUID / BOOKING_UUID / timestamp-file.jpg
    */
    const safeFileName =
        sanitizeFileName(
            selectedProofFile.name
        );


    const extension =
        getFileExtension(
            selectedProofFile.name
        );


    const storagePath =
        `${currentDriver.driverUuid}/` +
        `${booking.id}/` +
        `${Date.now()}-${safeFileName}`;


    /*
       Upload POD image to Supabase Storage.
    */
    const { error: uploadError } =
        await supabaseClient
            .storage
            .from(POD_BUCKET)
            .upload(
                storagePath,
                selectedProofFile,
                {
                    upsert: true,
                    contentType:
                        selectedProofFile.type
                }
            );


    if (uploadError) {

        console.error(
            "POD upload failed:",
            uploadError
        );

        showToast(
            "Unable to upload proof. Storage permission may need to be enabled."
        );

        return;

    }


    /*
       Store POD metadata in bookings.
    */
    const { error: updateError } =
        await supabaseClient
            .from("bookings")
            .update({

                pod_path:
                    storagePath,

                pod_file_name:
                    selectedProofFile.name,

                pod_file_type:
                    selectedProofFile.type ||
                    `image/${extension || "jpeg"}`,

                pod_uploaded_at:
                    new Date().toISOString()

            })
            .eq(
                "id",
                booking.id
            )
            .eq(
                "driver_id",
                currentDriver.driverUuid
            );


    if (updateError) {

        console.error(
            "POD metadata update failed:",
            updateError
        );

        /*
           Remove uploaded file if database
           metadata update failed.
        */
        await supabaseClient
            .storage
            .from(POD_BUCKET)
            .remove([
                storagePath
            ]);


        showToast(
            "Proof uploaded but could not be saved to the booking."
        );

        return;

    }


    /*
       Close and reset.
    */
    closeModal(
        "proofModal"
    );


    selectedProofFile =
        null;

    selectedBookingId =
        null;


    resetProofInputs();


    /*
       Reload the real database data.
    */
    await loadBookings();

    renderBookings();


    showToast(
        "Proof of delivery saved successfully."
    );

}


/* =====================================================
   FILE NAME HELPERS
===================================================== */

function sanitizeFileName(
    fileName
) {

    return String(
        fileName || "proof.jpg"
    )
    .replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
    );

}


function getFileExtension(
    fileName
) {

    const name =
        String(
            fileName || ""
        );


    const index =
        name.lastIndexOf(".");


    if (
        index === -1
    ) {

        return "";

    }


    return name
        .slice(index + 1)
        .toLowerCase();

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeModal(
    modalId
) {

    const modal =
        document.getElementById(
            modalId
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


/* =====================================================
   TOAST
===================================================== */

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    const text =
        document.getElementById(
            "toastMessage"
        );


    if (
        !toast ||
        !text
    ) {

        console.log(
            message
        );

        return;

    }


    text.textContent =
        message;


    toast.classList.remove(
        "hidden"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.add(
                    "hidden"
                );

            },
            3000
        );

}


/* =====================================================
   SAFE TEXT SETTER
===================================================== */

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;

    }

}


/* =====================================================
   SECURITY / HTML ESCAPING
===================================================== */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&#039;"
    );

}


/* =====================================================
   ATTRIBUTE ESCAPING
===================================================== */

function escapeAttribute(
    value
) {

    return String(
        value ?? ""
    )
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&#039;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    );

}