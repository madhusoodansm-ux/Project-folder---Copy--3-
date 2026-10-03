"use strict";

/* =====================================================
   SSP DRIVER PORTAL
   PROFILE PAGE
   SUPABASE VERSION
===================================================== */


/* =====================================================
   STATE
===================================================== */

let currentDriver = null;

let currentProfile = null;

let currentVehicle = null;

let driverBookings = [];

let toastTimer = null;

let passwordRecoveryMode = false;


/* =====================================================
   SAFE DOM HELPERS
===================================================== */

function $(id) {

    return document.getElementById(id);

}


function setText(id, value) {

    const element = $(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : String(value);

}


function setValue(id, value) {

    const element = $(id);

    if (!element) {
        return;
    }

    element.value =
        value ?? "";

}


/* =====================================================
   SUPABASE
===================================================== */

function getSupabase() {

    if (
        !window.supabaseClient
    ) {

        console.error(
            "SSP Profile: Supabase client is not available."
        );

        return null;
    }

    return window.supabaseClient;

}


/* =====================================================
   INITIALIZATION
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeProfile
);


async function initializeProfile() {

    setupSidebar();

    setupNavigation();

    setupButtons();

    setupModals();

    setupPasswordToggles();

    setupDocuments();

    setupAuthStateListener();


    const supabase =
        getSupabase();

    if (!supabase) {

        showToast(
            "Supabase connection is unavailable."
        );

        return;
    }


    /*
       Check whether this page was opened
       from a Supabase password recovery link.
    */

    const {
        data: {
            session
        }
    } =
        await supabase.auth.getSession();


    if (!session) {

        /*
           Normal profile page:
           require an authenticated driver.
        */

        currentDriver =
            await window.driverAuth.requireDriver();

        if (!currentDriver) {
            return;
        }

    } else {

        /*
           There is a valid session.
           Still verify the user is a driver,
           except when this is a password
           recovery flow.
        */

        currentDriver =
            await window.driverAuth.getCurrentDriver();

        if (!currentDriver) {

            /*
               Password recovery can temporarily
               arrive before normal driver validation.
            */

            if (!passwordRecoveryMode) {

                window.location.replace(
                    "../index.html"
                );

                return;
            }

        }

    }


    if (currentDriver) {

        await loadProfileData();

    }

}


/* =====================================================
   AUTH STATE LISTENER
===================================================== */

function setupAuthStateListener() {

    const supabase =
        getSupabase();

    if (!supabase) {
        return;
    }


    supabase.auth.onAuthStateChange(
        async (event, session) => {

            console.log(
                "SSP Profile Auth Event:",
                event
            );


            /*
               Supabase password recovery flow.
            */

            if (
                event ===
                "PASSWORD_RECOVERY"
            ) {

                passwordRecoveryMode =
                    true;

                prepareRecoveryPasswordModal();

                return;
            }


            /*
               User updated.
            */

            if (
                event ===
                "USER_UPDATED"
            ) {

                if (
                    currentDriver
                ) {

                    await refreshCurrentDriver();

                }

            }


            /*
               Signed out.
            */

            if (
                event ===
                "SIGNED_OUT"
            ) {

                window.location.replace(
                    "../index.html"
                );

            }

        }
    );

}


/* =====================================================
   REFRESH AUTHENTICATED DRIVER
===================================================== */

async function refreshCurrentDriver() {

    try {

        const driver =
            await window.driverAuth.getCurrentDriver();


        if (!driver) {

            console.error(
                "SSP Profile: Driver could not be refreshed."
            );

            return;
        }


        /*
           Replace the complete current driver
           object with freshly queried Supabase data.
        */

        currentDriver =
            driver;


        currentProfile =
            driver.profile || null;


        /*
           Reload related live data.
        */

        await loadVehicle();

        await loadBookings();


        /*
           Render everything again.
        */

        renderProfile();

        renderVehicle();

        renderActivity();

        renderDocumentStatus();


    } catch (error) {

        console.error(
            "Unable to refresh driver:",
            error
        );

    }

}

/* =====================================================
   LOAD ALL PROFILE DATA
===================================================== */

async function loadProfileData() {

    if (!currentDriver) {
        return;
    }


    currentProfile =
        currentDriver.profile;

    await loadVehicle();

    await loadBookings();

    renderProfile();

    renderVehicle();

    renderActivity();

    renderDocumentStatus();

}


/* =====================================================
   PROFILE DISPLAY
===================================================== */

function renderProfile() {

    const profile =
        currentDriver.profile || {};

    const driver =
        currentDriver.driver || {};


    const name =
        driver.name ||
        profile.full_name ||
        currentDriver.name ||
        "Driver";


    const phone =
        driver.phone ||
        profile.phone ||
        currentDriver.phone ||
        "—";


    const email =
        driver.email ||
        profile.email ||
        currentDriver.email ||
        "—";


    const driverId =
        driver.driver_id ||
        currentDriver.driverId ||
        "—";


    const address =
        buildAddress(driver);


    setText(
        "profileName",
        name
    );


    setText(
        "profileDriverId",
        `Driver ID: ${driverId}`
    );


    setText(
        "profilePhone",
        phone
    );


    setText(
        "infoName",
        name
    );


    setText(
        "infoPhone",
        phone
    );


    setText(
        "infoEmail",
        email
    );


    setText(
        "infoAddress",
        address
    );


    setText(
        "driverIdInfo",
        driverId
    );


    setText(
        "licenseNumber",
        driver.driving_license_number
    );


    setText(
        "licenseExpiry",
        formatDateOnly(
            driver.driving_license_expiry
        )
    );


    setText(
        "joiningDate",
        formatDateOnly(
            driver.joining_date
        )
    );

}


/* =====================================================
   ADDRESS
===================================================== */

function buildAddress(driver) {

    const parts = [];


    if (
        driver.address_line1
    ) {

        parts.push(
            driver.address_line1
        );

    }


    if (
        driver.address_line2
    ) {

        parts.push(
            driver.address_line2
        );

    }


    if (
        driver.city
    ) {

        parts.push(
            driver.city
        );

    }


    if (
        driver.state
    ) {

        parts.push(
            driver.state
        );

    }


    if (
        driver.pin_code
    ) {

        parts.push(
            driver.pin_code
        );

    }


    return parts.length
        ? parts.join(", ")
        : "—";

}


/* =====================================================
   DATE FORMAT
===================================================== */

function formatDateOnly(value) {

    if (!value) {
        return "—";
    }


    /*
       Date-only database values are
       formatted without timezone conversion.
    */

    const text =
        String(value);


    const match =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );


    if (!match) {
        return text;
    }


    const year =
        match[1];

    const month =
        Number(match[2]);

    const day =
        Number(match[3]);


    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];


    return `${day
        .toString()
        .padStart(2, "0")} ${months[month - 1]} ${year}`;

}


/* =====================================================
   VEHICLE
===================================================== */

async function loadVehicle() {

    currentVehicle = null;


    if (!currentDriver) {
        return;
    }


    const driverUuid =
        currentDriver.driverUuid;


    if (!driverUuid) {
        return;
    }


    const supabase =
        getSupabase();

    if (!supabase) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabase
                .from("vehicles")
                .select(`
                    id,
                    vehicle_id,
                    vehicle_number,
                    vehicle_type,
                    custom_vehicle_type,
                    assigned_driver_id,
                    vehicle_status,
                    created_at,
                    updated_at
                `)
                .eq(
                    "assigned_driver_id",
                    driverUuid
                )
                .limit(1)
                .maybeSingle();


        if (error) {

            console.error(
                "Unable to load driver vehicle:",
                error
            );

            return;
        }


        currentVehicle =
            data || null;

    } catch (error) {

        console.error(
            "Vehicle loading failed:",
            error
        );

    }

}


/* =====================================================
   VEHICLE DISPLAY
===================================================== */

function renderVehicle() {

    if (!currentVehicle) {

        setText(
            "vehicleNumber",
            "Not assigned"
        );

        setText(
            "vehicleType",
            "Not assigned"
        );

        setText(
            "vehicleModel",
            "Not available"
        );

        return;
    }


    setText(
        "vehicleNumber",
        currentVehicle.vehicle_number
    );


    setText(
        "vehicleType",
        currentVehicle.vehicle_type
    );


    /*
       The current live vehicles table does NOT
       contain a vehicle_model column.

       Therefore we do not invent a model value.

       custom_vehicle_type is a type/custom-type
       field, not a model field.
    */

    setText(
        "vehicleModel",
        "Not stored"
    );

}


/* =====================================================
   BOOKINGS / ACTIVITY
===================================================== */

async function loadBookings() {

    driverBookings = [];


    if (!currentDriver) {
        return;
    }


    const driverUuid =
        currentDriver.driverUuid;


    if (!driverUuid) {
        return;
    }


    const supabase =
        getSupabase();

    if (!supabase) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabase
                .from("bookings")
                .select("*")
                .eq(
                    "driver_id",
                    driverUuid
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Unable to load driver bookings:",
                error
            );

            return;
        }


        driverBookings =
            Array.isArray(data)
                ? data
                : [];

    } catch (error) {

        console.error(
            "Booking loading failed:",
            error
        );

        driverBookings = [];

    }

}


/* =====================================================
   ACTIVITY DISPLAY
===================================================== */

function renderActivity() {

    const shipments =
        driverBookings.length;


    let pickups = 0;

    let deliveries = 0;


    driverBookings.forEach(
        booking => {

            const status =
                normalizeStatus(
                    booking.status
                );


            /*
               Pickup completed.
            */

            if (
                status ===
                    "picked_up" ||
                status ===
                    "in_transit" ||
                status ===
                    "out_for_delivery" ||
                status ===
                    "delivered"
            ) {

                pickups++;

            }


            /*
               Delivery completed.
            */

            if (
                status ===
                "delivered"
            ) {

                deliveries++;

            }

        }
    );


    setText(
        "shipmentCount",
        shipments
    );


    setText(
        "pickupCount",
        pickups
    );


    setText(
        "deliveryCount",
        deliveries
    );


    /*
       Notification count:
       pending work belonging to
       this authenticated driver.
    */

    const pending =
        driverBookings.filter(
            booking => {

                const status =
                    normalizeStatus(
                        booking.status
                    );

                return (
                    status === "pending" ||
                    status === "confirmed" ||
                    status === "assigned" ||
                    status === "pickup_started" ||
                    status === "picked_up" ||
                    status === "in_transit" ||
                    status === "out_for_delivery"
                );

            }
        ).length;


    setText(
        "notificationCount",
        pending
    );

}


/* =====================================================
   STATUS NORMALIZATION
===================================================== */

function normalizeStatus(status) {

    return String(
        status ?? ""
    )
        .trim()
        .toLowerCase();

}


/* =====================================================
   DOCUMENT STATUS
===================================================== */

function renderDocumentStatus() {

    const driver =
        currentDriver?.driver || {};


    /*
       Current live drivers table contains
       the licence number, but it does not
       contain a licence document URL.

       Therefore display factual database
       information without pretending a file
       exists.
    */

    const licenseStatus =
        driver.driving_license_number
            ? "Licence details available"
            : "Not available";


    setText(
        "licenseDocumentStatus",
        licenseStatus
    );

}


/* =====================================================
   SIDEBAR
===================================================== */

function setupSidebar() {

    const sidebar =
        $("sidebar");

    const overlay =
        $("sidebarOverlay");

    const menuButton =
        $("menuButton");

    const closeButton =
        $("sidebarClose");


    if (
        !sidebar ||
        !overlay ||
        !menuButton ||
        !closeButton
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

    }


    function closeSidebar() {

        sidebar.classList.remove(
            "open"
        );

        overlay.classList.add(
            "hidden"
        );

    }


    menuButton.addEventListener(
        "click",
        openSidebar
    );


    closeButton.addEventListener(
        "click",
        closeSidebar
    );


    overlay.addEventListener(
        "click",
        closeSidebar
    );


    document
        .querySelectorAll(
            ".sidebar-nav a"
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


/* =====================================================
   NAVIGATION
===================================================== */

function setupNavigation() {

    const notificationButton =
        $("notificationButton");


    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            () => {

                window.location.href =
                    "notifications.html";

            }
        );

    }


    const headerProfileButton =
        $("headerProfileButton");


    if (headerProfileButton) {

        headerProfileButton.addEventListener(
            "click",
            () => {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

    }

}


/* =====================================================
   BUTTONS
===================================================== */

function setupButtons() {

    const editButton =
        $("editProfileButton");


    if (editButton) {

        editButton.addEventListener(
            "click",
            openEditProfile
        );

    }


    const saveProfileButton =
        $("saveProfileButton");


    if (saveProfileButton) {

        saveProfileButton.addEventListener(
            "click",
            saveEditedProfile
        );

    }


    const changePasswordButton =
        $("changePasswordButton");


    if (changePasswordButton) {

        changePasswordButton.addEventListener(
            "click",
            () => {

                passwordRecoveryMode =
                    false;

                resetChangePasswordFields();

                openModal(
                    "changePasswordModal"
                );

            }
        );

    }


    const resetPasswordButton =
        $("resetPasswordButton");


    if (resetPasswordButton) {

        resetPasswordButton.addEventListener(
            "click",
            openResetPassword
        );

    }


    const sendResetOtpButton =
        $("sendResetOtpButton");


    if (sendResetOtpButton) {

        sendResetOtpButton.addEventListener(
            "click",
            sendResetPasswordEmail
        );

    }


    const completeResetButton =
        $("completeResetButton");


    if (completeResetButton) {

        completeResetButton.addEventListener(
            "click",
            completePasswordReset
        );

    }


    const savePasswordButton =
        $("savePasswordButton");


    if (savePasswordButton) {

        savePasswordButton.addEventListener(
            "click",
            changePassword
        );

    }


    const helpButton =
        $("helpButton");


    if (helpButton) {

        helpButton.addEventListener(
            "click",
            () => {

                showToast(
                    "Help & Support is not connected yet."
                );

            }
        );

    }


    const logoutButton =
        $("logoutButton");


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            openLogout
        );

    }


    const sidebarLogout =
        $("sidebarLogout");


    if (sidebarLogout) {

        sidebarLogout.addEventListener(
            "click",
            openLogout
        );

    }


    const confirmLogoutButton =
        $("confirmLogoutButton");


    if (confirmLogoutButton) {

        confirmLogoutButton.addEventListener(
            "click",
            performLogout
        );

    }

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

}


/* =====================================================
   MODAL OPEN / CLOSE
===================================================== */

function openModal(id) {

    const modal =
        $(id);

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "hidden"
    );

}


function closeModal(id) {

    const modal =
        $(id);

    if (!modal) {
        return;
    }

    modal.classList.add(
        "hidden"
    );

}


/* =====================================================
   EDIT PROFILE
===================================================== */

function openEditProfile() {

    if (!currentDriver) {

        showToast(
            "Driver information is unavailable."
        );

        return;
    }


    const driver =
        currentDriver.driver || {};

    const profile =
        currentDriver.profile || {};


    setValue(
        "editName",
        driver.name ||
        profile.full_name ||
        ""
    );


    setValue(
        "editPhone",
        driver.phone ||
        profile.phone ||
        ""
    );


    setValue(
        "editEmail",
        driver.email ||
        profile.email ||
        ""
    );


    setValue(
        "editAddress",
        buildAddress(
            driver
        )
    );


    openModal(
        "editProfileModal"
    );

}



/* =====================================================
   SAVE EDITED PROFILE
===================================================== */

async function saveEditedProfile() {

    if (!currentDriver) {

        showToast(
            "Driver information is unavailable."
        );

        return;
    }


    const supabase =
        getSupabase();

    if (!supabase) {

        showToast(
            "Supabase connection is unavailable."
        );

        return;
    }


    const driverUuid =
        currentDriver.driverUuid;

    const profileId =
        currentDriver.profileId;


    const name =
        (
            $("editName")?.value ||
            ""
        ).trim();


    const phone =
        (
            $("editPhone")?.value ||
            ""
        ).trim();


    const email =
        (
            $("editEmail")?.value ||
            ""
        ).trim();


    const address =
        (
            $("editAddress")?.value ||
            ""
        ).trim();


    if (!name) {

        showToast(
            "Please enter your full name."
        );

        return;
    }


    if (!phone) {

        showToast(
            "Please enter your mobile number."
        );

        return;
    }


    if (
        !email ||
        !isValidEmail(email)
    ) {

        showToast(
            "Please enter a valid email address."
        );

        return;
    }


    const oldEmail =
        currentDriver.driver?.email ||
        currentDriver.profile?.email ||
        "";


    try {

        /* =================================================
           1. UPDATE DRIVER TABLE
        ================================================= */

        const {
            data: updatedDriver,
            error: driverError
        } =
            await supabase
                .from("drivers")
                .update({
                    name: name,
                    phone: phone,
                    email: email,
                    address_line1:
                        address || null,
                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    driverUuid
                )
                .select("*")
                .single();


        if (driverError) {

            console.error(
                "Driver profile update error:",
                driverError
            );

            showToast(
                driverError.message ||
                "Unable to update driver profile."
            );

            return;
        }


        /* =================================================
           2. UPDATE PROFILES TABLE
        ================================================= */

        const {
            data: updatedProfile,
            error: profileError
        } =
            await supabase
                .from("profiles")
                .update({
                    full_name: name,
                    phone: phone,
                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    profileId
                )
                .select("*")
                .single();


        if (profileError) {

            console.error(
                "Profile table update error:",
                profileError
            );

            /*
               Driver table has already been
               successfully updated.
            */

            currentDriver.driver =
                updatedDriver;


            renderProfile();


            showToast(
                "Driver details updated, but profile sync failed."
            );

            return;
        }


        /* =================================================
           3. USE THE FRESH DATABASE DATA
        ================================================= */

        currentDriver.driver =
            updatedDriver;


        currentDriver.profile =
            updatedProfile;


        /*
           Keep these convenience values
           synchronized as well.
        */

        currentDriver.name =
            updatedDriver.name ||
            updatedProfile.full_name ||
            "Driver";


        currentDriver.phone =
            updatedDriver.phone ||
            updatedProfile.phone ||
            "";


        currentDriver.email =
            updatedDriver.email ||
            updatedProfile.email ||
            "";


        currentProfile =
            updatedProfile;


        /* =================================================
           4. RENDER THE NEW DATA IMMEDIATELY
        ================================================= */

        renderProfile();


        renderVehicle();


        renderActivity();


        renderDocumentStatus();


        /* =================================================
           5. UPDATE AUTH EMAIL IF REQUIRED
        ================================================= */

        const emailChanged =
            oldEmail.toLowerCase() !==
            email.toLowerCase();


        if (emailChanged) {

            const {
                error:
                authEmailError
            } =
                await supabase.auth.updateUser({
                    email: email
                });


            if (authEmailError) {

                console.error(
                    "Auth email update error:",
                    authEmailError
                );

                closeModal(
                    "editProfileModal"
                );


                showToast(
                    "Profile details updated, but email login update failed."
                );

                return;
            }


            closeModal(
                "editProfileModal"
            );


            showToast(
                "Profile updated. Check your email to confirm the new address."
            );


            return;
        }


        /* =================================================
           6. CLOSE MODAL
        ================================================= */

        closeModal(
            "editProfileModal"
        );


        showToast(
            "Profile updated successfully."
        );


    } catch (error) {

        console.error(
            "Profile update failed:",
            error
        );

        showToast(
            "Unable to update profile."
        );

    }

}


/* =====================================================
   EMAIL VALIDATION
===================================================== */

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


/* =====================================================
   CHANGE PASSWORD
===================================================== */

function resetChangePasswordFields() {

    setValue(
        "currentPassword",
        ""
    );

    setValue(
        "newPassword",
        ""
    );

    setValue(
        "confirmPassword",
        ""
    );

}


async function changePassword() {

    const currentPassword =
        $("currentPassword")?.value ||
        "";


    const newPassword =
        $("newPassword")?.value ||
        "";


    const confirmPassword =
        $("confirmPassword")?.value ||
        "";


    if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
    ) {

        showToast(
            "Please fill all password fields."
        );

        return;
    }


    if (
        newPassword.length < 6
    ) {

        showToast(
            "New password must contain at least 6 characters."
        );

        return;
    }


    if (
        newPassword ===
        currentPassword
    ) {

        showToast(
            "New password must be different from the current password."
        );

        return;
    }


    if (
        newPassword !==
        confirmPassword
    ) {

        showToast(
            "New passwords do not match."
        );

        return;
    }


    const supabase =
        getSupabase();

    if (!supabase) {

        showToast(
            "Supabase connection is unavailable."
        );

        return;
    }


    try {

        /*
           Use Supabase Auth directly.

           Current-password verification is handled
           by Supabase Auth where supported.
        */

        const {
            error
        } =
            await supabase.auth.updateUser({
                password:
                    newPassword,
                current_password:
                    currentPassword
            });


        if (error) {

            console.error(
                "Password change error:",
                error
            );

            showToast(
                error.message ||
                "Unable to change password."
            );

            return;
        }


        resetChangePasswordFields();

        closeModal(
            "changePasswordModal"
        );


        showToast(
            "Password changed successfully."
        );

    } catch (error) {

        console.error(
            "Password change failed:",
            error
        );

        showToast(
            "Unable to change password."
        );

    }

}


/* =====================================================
   RESET PASSWORD
===================================================== */

function openResetPassword() {

    if (!currentDriver) {

        showToast(
            "Driver information is unavailable."
        );

        return;
    }


    const driver =
        currentDriver.driver || {};

    const profile =
        currentDriver.profile || {};


    setValue(
        "resetPhone",
        driver.phone ||
        profile.phone ||
        ""
    );


    setValue(
        "resetOtp",
        ""
    );


    setValue(
        "resetNewPassword",
        ""
    );


    setValue(
        "resetConfirmPassword",
        "");


    const otpBox =
        document.querySelector(
            ".demo-otp-box"
        );


    if (otpBox) {

        otpBox.classList.add(
            "hidden"
        );

    }


    openModal(
        "resetPasswordModal"
    );

}


/* =====================================================
   SEND REAL PASSWORD RESET EMAIL
===================================================== */

async function sendResetPasswordEmail() {

    const phone =
        (
            $("resetPhone")?.value ||
            ""
        ).trim();


    const driver =
        currentDriver?.driver || {};

    const profile =
        currentDriver?.profile || {};


    const registeredPhone =
        driver.phone ||
        profile.phone ||
        "";


    if (!phone) {

        showToast(
            "Please enter your registered mobile number."
        );

        return;
    }


    /*
       The current UI asks for mobile number.

       Verify that it belongs to the currently
       authenticated driver's database record.
    */

    if (
        normalizePhone(phone) !==
        normalizePhone(registeredPhone)
    ) {

        showToast(
            "The mobile number does not match your driver account."
        );

        return;
    }


    const email =
        driver.email ||
        profile.email ||
        currentDriver.email ||
        "";


    if (!email) {

        showToast(
            "No email address is available for password recovery."
        );

        return;
    }


    const supabase =
        getSupabase();

    if (!supabase) {

        showToast(
            "Supabase connection is unavailable."
        );

        return;
    }


    try {

        /*
           Supabase sends a real password recovery
           email. It does NOT use the old demo OTP.
        */

        const redirectTo =
            new URL(
                "profile.html",
                window.location.href
            ).href;


        const {
            error
        } =
            await supabase.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo:
                        redirectTo
                }
            );


        if (error) {

            console.error(
                "Password recovery error:",
                error
            );

            showToast(
                error.message ||
                "Unable to send password recovery email."
            );

            return;
        }


        closeModal(
            "resetPasswordModal"
        );


        showToast(
            "Password reset link has been sent to your registered email."
        );

    } catch (error) {

        console.error(
            "Password recovery failed:",
            error
        );

        showToast(
            "Unable to send password recovery email."
        );

    }

}


/* =====================================================
   PASSWORD RECOVERY MODAL
===================================================== */

function prepareRecoveryPasswordModal() {

    passwordRecoveryMode =
        true;


    /*
       The existing HTML has an OTP-based modal.
       We reuse its existing password fields,
       but remove the demo OTP behaviour.
    */

    const otpInput =
        $("resetOtp");

    if (otpInput) {

        otpInput.value =
            "";

        otpInput.closest(
            "label"
        )?.classList.add(
            "hidden"
        );

        otpInput.classList.add(
            "hidden"
        );

    }


    const otpBox =
        document.querySelector(
            ".demo-otp-box"
        );

    if (otpBox) {

        otpBox.classList.add(
            "hidden"
        );

    }


    const modal =
        $("resetOtpModal");

    if (!modal) {
        return;
    }


    const heading =
        modal.querySelector("h2");


    const paragraph =
        modal.querySelector("p");


    if (heading) {

        heading.textContent =
            "Create New Password";

    }


    if (paragraph) {

        paragraph.textContent =
            "Create a new password for your SSP driver account.";

    }


    openModal(
        "resetOtpModal"
    );

}


/* =====================================================
   COMPLETE PASSWORD RESET
===================================================== */

async function completePasswordReset() {

    const newPassword =
        $("resetNewPassword")?.value ||
        "";


    const confirmPassword =
        $("resetConfirmPassword")?.value ||
        "";


    if (!newPassword) {

        showToast(
            "Please enter a new password."
        );

        return;
    }


    if (
        newPassword.length < 6
    ) {

        showToast(
            "New password must contain at least 6 characters."
        );

        return;
    }


    if (
        newPassword !==
        confirmPassword
    ) {

        showToast(
            "Passwords do not match."
        );

        return;
    }


    const supabase =
        getSupabase();

    if (!supabase) {

        showToast(
            "Supabase connection is unavailable."
        );

        return;
    }


    try {

        const {
            error
        } =
            await supabase.auth.updateUser({
                password:
                    newPassword
            });


        if (error) {

            console.error(
                "Password reset error:",
                error
            );

            showToast(
                error.message ||
                "Unable to reset password."
            );

            return;
        }


        setValue(
            "resetOtp",
            ""
        );

        setValue(
            "resetNewPassword",
            ""
        );

        setValue(
            "resetConfirmPassword",
            ""
        );


        closeModal(
            "resetOtpModal"
        );


        passwordRecoveryMode =
            false;


        showToast(
            "Password reset successfully."
        );

    } catch (error) {

        console.error(
            "Password reset failed:",
            error
        );

        showToast(
            "Unable to reset password."
        );

    }

}


/* =====================================================
   PHONE NORMALIZATION
===================================================== */

function normalizePhone(phone) {

    return String(
        phone || ""
    ).replace(
        /\D/g,
        ""
    );

}


/* =====================================================
   PASSWORD VISIBILITY
===================================================== */

function setupPasswordToggles() {

    document
        .querySelectorAll(
            ".password-toggle"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const targetId =
                            button.dataset.target;


                        const input =
                            $(targetId);


                        const icon =
                            button.querySelector(
                                "i"
                            );


                        if (
                            !input ||
                            !icon
                        ) {

                            return;
                        }


                        if (
                            input.type ===
                            "password"
                        ) {

                            input.type =
                                "text";

                            icon.className =
                                "fa-regular fa-eye-slash";

                            button.setAttribute(
                                "aria-label",
                                "Hide password"
                            );

                        } else {

                            input.type =
                                "password";

                            icon.className =
                                "fa-regular fa-eye";

                            button.setAttribute(
                                "aria-label",
                                "Show password"
                            );

                        }

                    }
                );

            }
        );

}


/* =====================================================
   DOCUMENTS
===================================================== */

function setupDocuments() {

    document
        .querySelectorAll(
            ".document-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const documentName =
                            button.dataset.document ||
                            "Document";


                        openDocument(
                            documentName
                        );

                    }
                );

            }
        );

}


/* =====================================================
   OPEN DOCUMENT
===================================================== */

function openDocument(
    documentName
) {

    const driver =
        currentDriver?.driver || {};


    let message =
        "No document file is stored for this driver.";


    if (
        documentName ===
        "Driving Licence"
    ) {

        if (
            driver.driving_license_number
        ) {

            message =
                `Licence number ${driver.driving_license_number} is stored in the driver database, but a document file is not stored yet.`;

        }

    }


    if (
        documentName ===
        "Vehicle RC"
    ) {

        message =
            "Vehicle RC document storage is not configured in the current database.";

    }


    if (
        documentName ===
        "Insurance"
    ) {

        message =
            "Insurance document storage is not configured in the current database.";

    }


    if (
        documentName ===
        "ID Proof"
    ) {

        if (
            driver.government_id_number
        ) {

            message =
                "Government ID information is stored in the driver database, but the document file is not stored yet.";

        }

    }


    setText(
        "documentModalTitle",
        documentName
    );


    setText(
        "documentModalMessage",
        message
    );


    openModal(
        "documentModal"
    );

}


/* =====================================================
   LOGOUT
===================================================== */

function openLogout() {

    openModal(
        "logoutModal"
    );

}


async function performLogout() {

    const supabase =
        getSupabase();

    if (!supabase) {

        window.location.replace(
            "../index.html"
        );

        return;
    }


    try {

        const {
            error
        } =
            await supabase.auth.signOut();


        if (error) {

            console.error(
                "Supabase logout error:",
                error
            );

            showToast(
                error.message ||
                "Unable to logout."
            );

            return;
        }


        closeModal(
            "logoutModal"
        );


        window.location.replace(
            "../index.html"
        );

    } catch (error) {

        console.error(
            "Logout failed:",
            error
        );

        window.location.replace(
            "../index.html"
        );

    }

}


/* =====================================================
   TOAST
===================================================== */

function showToast(message) {

    const toast =
        $("toast");

    const text =
        $("toastMessage");


    if (
        !toast ||
        !text
    ) {

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
            3500
        );

}


/* =====================================================
   ESCAPE KEY
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            document
                .querySelectorAll(
                    ".modal-overlay"
                )
                .forEach(
                    modal => {

                        modal.classList.add(
                            "hidden"
                        );

                    }
                );

        }

    }
);