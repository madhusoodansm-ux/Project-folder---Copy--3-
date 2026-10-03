"use strict";

/*
 * =========================================================
 * SSP ADMIN PORTAL — SETTINGS
 * =========================================================
 *
 * Database:
 *     public.app_settings
 *
 * Authentication:
 *     Existing SSP Supabase authentication
 *
 * Storage:
 *     NO localStorage
 *     NO sessionStorage
 *
 * This page reads and writes the single SSP application
 * settings record from Supabase.
 * =========================================================
 */

document.addEventListener("DOMContentLoaded", initSettingsPage);

/* =========================================================
   DEFAULT SETTINGS
   ========================================================= */

const DEFAULT_SETTINGS = {
    serviceName: "Sri Sadguru Siddarooda Parcel Service",
    serviceShortName: "SSP Parcel Service",
    supportPhone: "",
    supportEmail: "support@srisadguruparcel.com",

    allowNewBookings: true,
    requireCustomerDetails: true,
    requireDriverAssignment: false,
    defaultBookingStatus: "pending",

    requireProofOfDelivery: true,
    allowDeliveryUpdates: true,
    enableDeliveryNotifications: true,

    bookingNotifications: true,
    paymentNotifications: true,
    driverNotifications: true,
    deliveryNotifications: true,

    themeMode: "light",
    dateFormat: "DD/MM/YYYY"
};

const BOOKING_STATUSES = new Set([
    "pending",
    "confirmed",
    "assigned",
    "pickup_started",
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "cancelled"
]);

/* =========================================================
   STATE
   ========================================================= */

let originalSettings = null;
let toastTimer = null;

/* =========================================================
   DOM ELEMENTS
   ========================================================= */

let settingsForm;

let serviceName;
let serviceShortName;
let supportPhone;
let supportEmail;

let allowNewBookings;
let requireCustomerDetails;
let requireDriverAssignment;
let defaultBookingStatus;

let requireProofOfDelivery;
let allowDeliveryUpdates;
let enableDeliveryNotifications;

let bookingNotifications;
let paymentNotifications;
let driverNotifications;
let deliveryNotifications;

let themeMode;
let dateFormat;

let resetSettingsButton;
let restoreDefaultsButton;
let saveSettingsButton;

let toast;
let toastIcon;
let toastTitle;
let toastMessage;
let closeToastButton;

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initSettingsPage() {

    cacheElements();

    bindEvents();

    initializeSidebar();
    setFormBusy(true, "Loading...");

    /*
     * The page uses the existing SSP admin authentication.
     *
     * If admin-auth.js exposes requireAdmin(), use it.
     * If it exposes requireAdminAuth(), use that instead.
     */
    try {

        await requireAuthenticatedAdmin();

    } catch (error) {

        console.error(
            "Admin authentication failed:",
            error
        );

        showToast(
            "Authentication Required",
            "Please sign in as an active administrator.",
            true
        );

        setFormBusy(true, "Access Denied");
        return;
    }

    await loadSettings();
}

/* =========================================================
   CACHE DOM ELEMENTS
   ========================================================= */

function cacheElements() {

    settingsForm =
        document.getElementById("settingsForm");

    serviceName =
        document.getElementById("serviceName");

    serviceShortName =
        document.getElementById("serviceShortName");

    supportPhone =
        document.getElementById("supportPhone");

    supportEmail =
        document.getElementById("supportEmail");

    allowNewBookings =
        document.getElementById("allowNewBookings");

    requireCustomerDetails =
        document.getElementById("requireCustomerDetails");

    requireDriverAssignment =
        document.getElementById("requireDriverAssignment");

    defaultBookingStatus =
        document.getElementById("defaultBookingStatus");

    requireProofOfDelivery =
        document.getElementById("requireProofOfDelivery");

    allowDeliveryUpdates =
        document.getElementById("allowDeliveryUpdates");

    enableDeliveryNotifications =
        document.getElementById("enableDeliveryNotifications");

    bookingNotifications =
        document.getElementById("bookingNotifications");

    paymentNotifications =
        document.getElementById("paymentNotifications");

    driverNotifications =
        document.getElementById("driverNotifications");

    deliveryNotifications =
        document.getElementById("deliveryNotifications");

    themeMode =
        document.getElementById("themeMode");

    dateFormat =
        document.getElementById("dateFormat");

    resetSettingsButton =
        document.getElementById("resetSettingsButton");

    restoreDefaultsButton =
        document.getElementById("restoreDefaultsButton");

    saveSettingsButton =
        document.getElementById("saveSettingsButton");

    toast =
        document.getElementById("toast");

    toastIcon =
        document.getElementById("toastIcon");

    toastTitle =
        document.getElementById("toastTitle");

    toastMessage =
        document.getElementById("toastMessage");

    closeToastButton =
        document.getElementById("closeToast");
}

/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {

    settingsForm?.addEventListener(
        "submit",
        handleSettingsSubmit
    );

    resetSettingsButton?.addEventListener(
        "click",
        handleResetSettings
    );

    restoreDefaultsButton?.addEventListener(
        "click",
        restoreDefaultSettings
    );

    closeToastButton?.addEventListener(
        "click",
        hideToast
    );

    supportPhone?.addEventListener(
        "input",
        restrictPhoneInput
    );

    themeMode?.addEventListener(
        "change",
        () => window.SSPAdminSettings?.setTheme(
            themeMode.value
        )
    );
}

/* =========================================================
   SIDEBAR
   ========================================================= */

function initializeSidebar() {

    const sidebar =
        document.getElementById("sidebar");

    const sidebarToggle =
        document.getElementById("sidebarToggle");

    const mobileMenuButton =
        document.getElementById("mobileMenuButton");

    const sidebarOverlay =
        document.getElementById("sidebarOverlay");

    mobileMenuButton?.addEventListener(
        "click",
        openSidebar
    );

    sidebarToggle?.addEventListener(
        "click",
        closeSidebar
    );

    sidebarOverlay?.addEventListener(
        "click",
        closeSidebar
    );

    document
        .querySelectorAll(".sidebar .nav-item")
        .forEach((item) => {

            item.addEventListener(
                "click",
                closeSidebar
            );

        });

    function openSidebar() {

        sidebar?.classList.add("open");

        sidebarOverlay?.classList.add("show");

        document.body.style.overflow = "hidden";
    }

    function closeSidebar() {

        sidebar?.classList.remove("open");

        sidebarOverlay?.classList.remove("show");

        document.body.style.overflow = "";
    }
}

/* =========================================================
   ADMIN AUTHENTICATION
   ========================================================= */

async function requireAuthenticatedAdmin() {

    /*
     * The existing SSP admin-auth.js should expose one of
     * these functions.
     *
     * Prefer requireAdminAuth() when available.
     */

    if (
        typeof window.SSPAuth !== "undefined" &&
        typeof window.SSPAuth.requireAdminAuth === "function"
    ) {

        return await window.SSPAuth.requireAdminAuth();

    }

    if (typeof window.requireAdminAuth === "function") {
        const result =
            await window.requireAdminAuth();

        if (
            !result?.user?.id ||
            result.profile?.role !== "admin" ||
            result.profile?.status !== "active"
        ) {
            throw new Error(
                "The authenticated account is not an active SSP administrator."
            );
        }

        return result;
    }

    if (
        typeof window.SSPAuth !== "undefined" &&
        typeof window.SSPAuth.requireAdmin === "function"
    ) {

        return await window.SSPAuth.requireAdmin();

    }

    /*
     * Fallback: directly verify the current Supabase user
     * and profile.
     */

    const client = getSupabaseClient();

    const {
        data: {
            user
        },
        error: sessionError
    } = await client.auth.getUser();

    if (sessionError || !user) {

        throw new Error(
            "No authenticated Supabase user was found."
        );
    }

    const {
        data: profile,
        error: profileError
    } = await client
        .from("profiles")
        .select("id, email, role, status")
        .eq("id", user.id)
        .single();

    if (profileError) {
        throw profileError;
    }

    if (
        profile.role !== "admin" ||
        profile.status !== "active"
    ) {

        throw new Error(
            "The authenticated account is not an active SSP administrator."
        );
    }

    return {
        user,
        profile
    };
}

/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getSupabaseClient() {

    if (!window.supabaseClient) {

        throw new Error(
            "Supabase client is not available. Check supabase-client.js."
        );
    }

    return window.supabaseClient;
}

/* =========================================================
   GET CURRENT ADMIN
   ========================================================= */

async function getCurrentAdminId() {
    const { user } =
        await requireAuthenticatedAdmin();

    return user.id;
}

/* =========================================================
   LOAD FROM SUPABASE
   ========================================================= */

async function fetchSettings() {

    const client = getSupabaseClient();

    const {
        data,
        error
    } = await client
        .from("app_settings")
        .select(`
            id,
            service_name,
            service_short_name,
            support_phone,
            support_email,
            allow_new_bookings,
            require_customer_details,
            require_driver_assignment,
            default_booking_status,
            require_proof_of_delivery,
            allow_delivery_updates,
            enable_delivery_notifications,
            booking_notifications,
            payment_notifications,
            driver_notifications,
            delivery_notifications,
            theme_mode,
            date_format,
            updated_at
        `)
        .eq("id", true)
        .maybeSingle();

    if (error) {
        throw error;
    }

    /*
     * Initialize the singleton row with defaults when it does
     * not exist yet. The database migration secures access but
     * does not create application settings data.
     */

    if (!data) {

        const adminId =
            await getCurrentAdminId();

        const {
            data: inserted,
            error: insertError
        } = await client
            .from("app_settings")
            .insert({
                id: true,
                service_name: DEFAULT_SETTINGS.serviceName,
                service_short_name: DEFAULT_SETTINGS.serviceShortName,
                support_phone: DEFAULT_SETTINGS.supportPhone,
                support_email: DEFAULT_SETTINGS.supportEmail,

                allow_new_bookings:
                    DEFAULT_SETTINGS.allowNewBookings,

                require_customer_details:
                    DEFAULT_SETTINGS.requireCustomerDetails,

                require_driver_assignment:
                    DEFAULT_SETTINGS.requireDriverAssignment,

                default_booking_status:
                    DEFAULT_SETTINGS.defaultBookingStatus,

                require_proof_of_delivery:
                    DEFAULT_SETTINGS.requireProofOfDelivery,

                allow_delivery_updates:
                    DEFAULT_SETTINGS.allowDeliveryUpdates,

                enable_delivery_notifications:
                    DEFAULT_SETTINGS.enableDeliveryNotifications,

                booking_notifications:
                    DEFAULT_SETTINGS.bookingNotifications,

                payment_notifications:
                    DEFAULT_SETTINGS.paymentNotifications,

                driver_notifications:
                    DEFAULT_SETTINGS.driverNotifications,

                delivery_notifications:
                    DEFAULT_SETTINGS.deliveryNotifications,

                theme_mode:
                    DEFAULT_SETTINGS.themeMode,

                date_format:
                    DEFAULT_SETTINGS.dateFormat,

                updated_by: adminId
            })
            .select(`
                id,
                service_name,
                service_short_name,
                support_phone,
                support_email,
                allow_new_bookings,
                require_customer_details,
                require_driver_assignment,
                default_booking_status,
                require_proof_of_delivery,
                allow_delivery_updates,
                enable_delivery_notifications,
                booking_notifications,
                payment_notifications,
                driver_notifications,
                delivery_notifications,
                theme_mode,
                date_format,
                updated_at
            `)
            .single();

        if (insertError) {
            throw insertError;
        }

        return databaseToFormSettings(inserted);
    }

    return databaseToFormSettings(data);
}

/* =========================================================
   DATABASE → FORM
   ========================================================= */

function databaseToFormSettings(data) {

    return {
        serviceName:
            data.service_name ??
            DEFAULT_SETTINGS.serviceName,

        serviceShortName:
            data.service_short_name ??
            DEFAULT_SETTINGS.serviceShortName,

        supportPhone:
            data.support_phone ?? "",

        supportEmail:
            data.support_email ??
            DEFAULT_SETTINGS.supportEmail,

        allowNewBookings:
            data.allow_new_bookings ??
            DEFAULT_SETTINGS.allowNewBookings,

        requireCustomerDetails:
            data.require_customer_details ??
            DEFAULT_SETTINGS.requireCustomerDetails,

        requireDriverAssignment:
            data.require_driver_assignment ??
            DEFAULT_SETTINGS.requireDriverAssignment,

        defaultBookingStatus:
            normalizeBookingStatus(
                data.default_booking_status
            ) || DEFAULT_SETTINGS.defaultBookingStatus,

        requireProofOfDelivery:
            data.require_proof_of_delivery ??
            DEFAULT_SETTINGS.requireProofOfDelivery,

        allowDeliveryUpdates:
            data.allow_delivery_updates ??
            DEFAULT_SETTINGS.allowDeliveryUpdates,

        enableDeliveryNotifications:
            data.enable_delivery_notifications ??
            DEFAULT_SETTINGS.enableDeliveryNotifications,

        bookingNotifications:
            data.booking_notifications ??
            DEFAULT_SETTINGS.bookingNotifications,

        paymentNotifications:
            data.payment_notifications ??
            DEFAULT_SETTINGS.paymentNotifications,

        driverNotifications:
            data.driver_notifications ??
            DEFAULT_SETTINGS.driverNotifications,

        deliveryNotifications:
            data.delivery_notifications ??
            DEFAULT_SETTINGS.deliveryNotifications,

        themeMode:
            data.theme_mode ??
            DEFAULT_SETTINGS.themeMode,

        dateFormat:
            data.date_format ??
            DEFAULT_SETTINGS.dateFormat
    };
}

/* =========================================================
   FORM → DATABASE
   ========================================================= */

function formToDatabaseSettings(
    settings,
    adminId
) {

    return {
        id: true,

        service_name:
            settings.serviceName,

        service_short_name:
            settings.serviceShortName,

        support_phone:
            settings.supportPhone || null,

        support_email:
            settings.supportEmail || null,

        allow_new_bookings:
            settings.allowNewBookings,

        require_customer_details:
            settings.requireCustomerDetails,

        require_driver_assignment:
            settings.requireDriverAssignment,

        default_booking_status:
            normalizeBookingStatus(
                settings.defaultBookingStatus
            ),

        require_proof_of_delivery:
            settings.requireProofOfDelivery,

        allow_delivery_updates:
            settings.allowDeliveryUpdates,

        enable_delivery_notifications:
            settings.enableDeliveryNotifications,

        booking_notifications:
            settings.bookingNotifications,

        payment_notifications:
            settings.paymentNotifications,

        driver_notifications:
            settings.driverNotifications,

        delivery_notifications:
            settings.deliveryNotifications,

        theme_mode:
            settings.themeMode,

        date_format:
            settings.dateFormat,

        updated_by:
            adminId,

        updated_at:
            new Date().toISOString()
    };
}

function normalizeBookingStatus(value) {
    const status = String(value || "")
        .trim()
        .toLowerCase()
        .replaceAll(" ", "_");

    return BOOKING_STATUSES.has(status)
        ? status
        : "";
}

/* =========================================================
   SAVE TO SUPABASE
   ========================================================= */

async function saveSettingsToDatabase(settings) {

    const client =
        getSupabaseClient();

    const adminId =
        await getCurrentAdminId();

    const payload =
        formToDatabaseSettings(
            settings,
            adminId
        );

    const {
        data,
        error
    } = await client
        .from("app_settings")
        .upsert(
            payload,
            {
                onConflict: "id"
            }
        )
        .select(`
            id,
            service_name,
            service_short_name,
            support_phone,
            support_email,
            allow_new_bookings,
            require_customer_details,
            require_driver_assignment,
            default_booking_status,
            require_proof_of_delivery,
            allow_delivery_updates,
            enable_delivery_notifications,
            booking_notifications,
            payment_notifications,
            driver_notifications,
            delivery_notifications,
            theme_mode,
            date_format,
            updated_at
        `)
        .single();

    if (error) {
        throw error;
    }

    return databaseToFormSettings(data);
}

/* =========================================================
   LOAD SETTINGS
   ========================================================= */

async function loadSettings() {

    setFormBusy(true);

    try {

        const settings =
            await fetchSettings();

        originalSettings = {
            ...settings
        };

        applySettings(settings);

        clearValidationMessages();

    } catch (error) {

        console.error(
            "Unable to load SSP settings:",
            error
        );

        showToast(
            "Unable to Load Settings",
            getDatabaseErrorMessage(error),
            true
        );

    } finally {

        if (originalSettings) {
            setFormBusy(false);
        } else {
            setFormBusy(true, "Unavailable");
        }
    }
}

/* =========================================================
   SUBMIT SETTINGS
   ========================================================= */

async function handleSettingsSubmit(event) {

    event.preventDefault();

    if (!originalSettings) {
        showToast(
            "Settings Unavailable",
            "Settings must load successfully before they can be changed.",
            true
        );
        return;
    }

    clearValidationMessages();

    if (!validateSettings()) {

        showToast(
            "Check Information",
            "Please correct the highlighted fields.",
            true
        );

        return;
    }

    const updatedSettings =
        collectFormSettings();

    setFormBusy(
        true,
        "Saving..."
    );

    try {

        const savedSettings =
            await saveSettingsToDatabase(
                updatedSettings
            );

        originalSettings = {
            ...savedSettings
        };

        window.SSPAdminSettings?.update(savedSettings);
        applySettings(savedSettings);

        showToast(
            "Settings Saved",
            "Your settings were updated successfully."
        );

    } catch (error) {

        console.error(
            "Unable to save SSP settings:",
            error
        );

        showToast(
            "Unable to Save Settings",
            getDatabaseErrorMessage(error),
            true
        );

    } finally {

        setFormBusy(false);
    }
}

/* =========================================================
   COLLECT FORM SETTINGS
   ========================================================= */

function collectFormSettings() {

    return {

        serviceName:
            serviceName.value.trim(),

        serviceShortName:
            serviceShortName.value.trim(),

        supportPhone:
            supportPhone.value.trim(),

        supportEmail:
            supportEmail.value.trim(),

        allowNewBookings:
            allowNewBookings.checked,

        requireCustomerDetails:
            requireCustomerDetails.checked,

        requireDriverAssignment:
            requireDriverAssignment.checked,

        defaultBookingStatus:
            defaultBookingStatus.value,

        requireProofOfDelivery:
            requireProofOfDelivery.checked,

        allowDeliveryUpdates:
            allowDeliveryUpdates.checked,

        enableDeliveryNotifications:
            enableDeliveryNotifications.checked,

        bookingNotifications:
            bookingNotifications.checked,

        paymentNotifications:
            paymentNotifications.checked,

        driverNotifications:
            driverNotifications.checked,

        deliveryNotifications:
            deliveryNotifications.checked,

        themeMode:
            themeMode.value,

        dateFormat:
            dateFormat.value
    };
}

/* =========================================================
   VALIDATION
   ========================================================= */

function validateSettings() {

    let valid = true;

    const name =
        serviceName.value.trim();

    const phone =
        supportPhone.value.trim();

    const email =
        supportEmail.value.trim();

    if (!normalizeBookingStatus(defaultBookingStatus.value)) {
        setValidation(
            defaultBookingStatus,
            "defaultBookingStatusError",
            "Select a valid default booking status."
        );

        valid = false;
    }

    if (!name) {

        setValidation(
            serviceName,
            "serviceNameError",
            "Service name is required."
        );

        valid = false;

    } else if (name.length < 3) {

        setValidation(
            serviceName,
            "serviceNameError",
            "Service name must contain at least 3 characters."
        );

        valid = false;
    }

    if (
        phone &&
        !/^\d{10}$/.test(phone)
    ) {

        setValidation(
            supportPhone,
            "supportPhoneError",
            "Support phone must contain exactly 10 digits."
        );

        valid = false;
    }

    if (
        email &&
        !isValidEmail(email)
    ) {

        setValidation(
            supportEmail,
            "supportEmailError",
            "Enter a valid support email address."
        );

        valid = false;
    }

    return valid;
}

function setValidation(
    input,
    errorId,
    message
) {

    input?.classList.add(
        "input-error"
    );

    const errorElement =
        document.getElementById(errorId);

    if (errorElement) {

        errorElement.textContent =
            message;
    }
}

function clearValidationMessages() {

    document
        .querySelectorAll(
            ".validation-message"
        )
        .forEach((element) => {

            element.textContent = "";

        });

    document
        .querySelectorAll(
            ".input-error"
        )
        .forEach((element) => {

            element.classList.remove(
                "input-error"
            );

        });
}

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);
}

function restrictPhoneInput(event) {

    event.target.value =
        event.target.value
            .replace(/\D/g, "")
            .slice(0, 10);
}

/* =========================================================
   RESET UNSAVED CHANGES
   ========================================================= */

function handleResetSettings() {

    if (!originalSettings) {

        showToast(
            "Unable to Reset Changes",
            "Saved settings are not available. Reload the page after the load error is resolved.",
            true
        );

        return;
    }

    const confirmed =
        window.confirm(
            "Reset all unsaved settings changes?"
        );

    if (!confirmed) {
        return;
    }

    applySettings(
        originalSettings
    );

    clearValidationMessages();

    showToast(
        "Changes Reset",
        "Unsaved settings changes have been reset."
    );
}

/* =========================================================
   RESTORE DEFAULT SETTINGS
   ========================================================= */

async function restoreDefaultSettings() {

    if (!originalSettings) {
        showToast(
            "Settings Unavailable",
            "Settings must load successfully before defaults can be restored.",
            true
        );
        return;
    }

    const confirmed =
        window.confirm(
            "Restore all settings to their default values?"
        );

    if (!confirmed) {
        return;
    }

    clearValidationMessages();

    setFormBusy(
        true,
        "Restoring..."
    );

    try {

        const savedSettings =
            await saveSettingsToDatabase({
                ...DEFAULT_SETTINGS
            });

        originalSettings = {
            ...savedSettings
        };

        window.SSPAdminSettings?.update(savedSettings);
        applySettings(
            savedSettings
        );

        showToast(
            "Defaults Restored",
            "Default settings have been restored successfully."
        );

    } catch (error) {

        console.error(
            "Unable to restore SSP settings:",
            error
        );

        showToast(
            "Unable to Restore Settings",
            getDatabaseErrorMessage(error),
            true
        );

    } finally {

        setFormBusy(false);
    }
}

/* =========================================================
   APPLY SETTINGS TO FORM
   ========================================================= */

function applySettings(settings) {

    serviceName.value =
        settings.serviceName || "";

    serviceShortName.value =
        settings.serviceShortName || "";

    supportPhone.value =
        settings.supportPhone || "";

    supportEmail.value =
        settings.supportEmail || "";

    allowNewBookings.checked =
        Boolean(
            settings.allowNewBookings
        );

    requireCustomerDetails.checked =
        Boolean(
            settings.requireCustomerDetails
        );

    requireDriverAssignment.checked =
        Boolean(
            settings.requireDriverAssignment
        );

    defaultBookingStatus.value =
        normalizeBookingStatus(
            settings.defaultBookingStatus
        ) || "pending";

    requireProofOfDelivery.checked =
        Boolean(
            settings.requireProofOfDelivery
        );

    allowDeliveryUpdates.checked =
        Boolean(
            settings.allowDeliveryUpdates
        );

    enableDeliveryNotifications.checked =
        Boolean(
            settings.enableDeliveryNotifications
        );

    bookingNotifications.checked =
        Boolean(
            settings.bookingNotifications
        );

    paymentNotifications.checked =
        Boolean(
            settings.paymentNotifications
        );

    driverNotifications.checked =
        Boolean(
            settings.driverNotifications
        );

    deliveryNotifications.checked =
        Boolean(
            settings.deliveryNotifications
        );

    themeMode.value =
        settings.themeMode ||
        "light";

    dateFormat.value =
        settings.dateFormat ||
        "DD/MM/YYYY";

    window.SSPAdminSettings?.setTheme(
        settings.themeMode || "light"
    );
}

/* =========================================================
   FORM BUSY STATE
   ========================================================= */

function setFormBusy(
    isBusy,
    saveText = "Save Settings"
) {

    const controls =
        settingsForm?.querySelectorAll(
            "input, select, button"
        );

    controls?.forEach(
        (control) => {

            control.disabled =
                isBusy;

        }
    );

    if (saveSettingsButton) {

        saveSettingsButton.textContent =
            isBusy
                ? saveText
                : "Save Settings";
    }
}

/* =========================================================
   DATABASE ERROR MESSAGE
   ========================================================= */

function getDatabaseErrorMessage(error) {

    if (!error) {

        return "An unexpected database error occurred.";
    }

    if (error.code === "42501") {

        return "Supabase denied access to app_settings. Verify table grants and Admin access policies.";
    }

    if (error.code === "23505") {

        return "The settings record already exists. Please try saving again.";
    }

    return (
        error.message ||
        "An unexpected database error occurred."
    );
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    title,
    message,
    isError = false
) {

    clearTimeout(toastTimer);

    if (!toast) {
        return;
    }

    toastTitle.textContent =
        title;

    toastMessage.textContent =
        message;

    toastIcon.textContent =
        isError
            ? "!"
            : "✓";

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

    toast?.classList.remove(
        "show"
    );

    clearTimeout(
        toastTimer
    );
}