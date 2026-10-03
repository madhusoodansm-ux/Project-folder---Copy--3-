"use strict";

(function initializeSspAdminSettings() {
    const defaults = Object.freeze({
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
    });

    let settingsPromise = null;
    let currentSettings = null;
    let themeMediaQuery = null;

    async function loadSettings() {
        const client = window.supabaseClient;

        if (!client?.auth || typeof client.from !== "function") {
            throw new Error("Supabase is not available for Admin Settings.");
        }

        const {
            data: { user },
            error: userError
        } = await client.auth.getUser();

        if (userError) {
            throw userError;
        }

        if (!user) {
            throw new Error("An authenticated Admin session is required.");
        }

        const {
            data: profile,
            error: profileError
        } = await client
            .from("profiles")
            .select("id,role,status")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (
            profile?.id !== user.id ||
            profile.role !== "admin" ||
            profile.status !== "active"
        ) {
            throw new Error("Settings are available only to active Admins.");
        }

        const {
            data,
            error
        } = await client
            .from("app_settings")
            .select(`
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
                date_format
            `)
            .eq("id", true)
            .maybeSingle();

        if (error) {
            throw error;
        }

        const settings = data
            ? {
                allowNewBookings: data.allow_new_bookings,
                requireCustomerDetails: data.require_customer_details,
                requireDriverAssignment: data.require_driver_assignment,
                defaultBookingStatus: data.default_booking_status,
                requireProofOfDelivery: data.require_proof_of_delivery,
                allowDeliveryUpdates: data.allow_delivery_updates,
                enableDeliveryNotifications: data.enable_delivery_notifications,
                bookingNotifications: data.booking_notifications,
                paymentNotifications: data.payment_notifications,
                driverNotifications: data.driver_notifications,
                deliveryNotifications: data.delivery_notifications,
                themeMode: data.theme_mode,
                dateFormat: data.date_format
            }
            : { ...defaults };

        currentSettings = {
            ...defaults,
            ...settings
        };
        applyTheme(currentSettings.themeMode);

        return { ...currentSettings };
    }

    function get(forceRefresh = false) {
        if (forceRefresh || !settingsPromise) {
            settingsPromise = loadSettings().catch((error) => {
                settingsPromise = null;
                throw error;
            });
        }

        return settingsPromise.then((settings) => ({ ...settings }));
    }

    function update(settings) {
        currentSettings = {
            ...defaults,
            ...currentSettings,
            ...settings
        };
        settingsPromise = Promise.resolve({ ...currentSettings });
        applyTheme(currentSettings.themeMode);
    }

    function applyTheme(themeMode) {
        if (!window.matchMedia) {
            document.documentElement.dataset.sspTheme = "light";
            return;
        }

        if (!themeMediaQuery) {
            themeMediaQuery = window.matchMedia(
                "(prefers-color-scheme: dark)"
            );
            themeMediaQuery.addEventListener?.("change", () => {
                if (currentSettings?.themeMode === "system") {
                    applyTheme("system");
                }
            });
        }

        document.documentElement.dataset.sspTheme =
            themeMode === "system" && themeMediaQuery.matches
                ? "dark"
                : "light";
    }

    function formatDate(value, timeZone) {
        if (!value) {
            return "—";
        }

        const date = value instanceof Date
            ? value
            : /^\d{4}-\d{2}-\d{2}$/.test(String(value))
                ? new Date(`${value}T00:00:00`)
                : new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        const dateParts = timeZone
            ? Object.fromEntries(
                new Intl.DateTimeFormat("en-CA", {
                    timeZone,
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }).formatToParts(date)
                    .filter((part) => part.type !== "literal")
                    .map((part) => [part.type, part.value])
            )
            : {
                day: String(date.getDate()).padStart(2, "0"),
                month: String(date.getMonth() + 1).padStart(2, "0"),
                year: String(date.getFullYear())
            };
        const { day, month, year } = dateParts;

        switch (currentSettings?.dateFormat || defaults.dateFormat) {
            case "MM/DD/YYYY":
                return `${month}/${day}/${year}`;
            case "YYYY-MM-DD":
                return `${year}-${month}-${day}`;
            case "DD/MM/YYYY":
            default:
                return `${day}/${month}/${year}`;
        }
    }

    function formatDateTime(value, locale = "en-IN", timeZone) {
        if (!value) {
            return "—";
        }

        const date = value instanceof Date
            ? value
            : new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return `${formatDate(date, timeZone)}, ${date.toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
            ...(timeZone ? { timeZone } : {})
        })}`;
    }

    window.SSPAdminSettings = Object.freeze({
        defaults,
        get,
        update,
        formatDate,
        formatDateTime,
        setTheme: applyTheme,
        refresh: () => get(true)
    });
})();
