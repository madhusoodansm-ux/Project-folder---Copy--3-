"use strict";

/*
===========================================================
SSP ADMIN PORTAL
NEW DRIVER REGISTRATION

DATABASE:
Supabase

TABLES:
public.drivers
public.vehicles
public.profiles

IMPORTANT:
- No driver data is stored in localStorage.
- Driver registration is saved directly to Supabase.
- Driver profile_id is linked automatically when a matching
  driver profile already exists.
- Driver registration does NOT require an Auth account to
  already exist.
===========================================================
*/


/* =========================================================
   SUPABASE
========================================================= */

const supabase = window.supabaseClient;

if (!supabase) {

    console.error(
        "SSP: Supabase client was not found."
    );

    alert(
        "Supabase connection is not available. Please check the Supabase client setup."
    );
}


/* =========================================================
   DOM
========================================================= */

const form =
    document.getElementById(
        "driverRegistrationForm"
    );

const menuButton =
    document.getElementById(
        "menuButton"
    );

const sidebar =
    document.getElementById(
        "sidebar"
    );

const sidebarClose =
    document.getElementById(
        "sidebarClose"
    );

const sidebarOverlay =
    document.getElementById(
        "sidebarOverlay"
    );

const cancelButton =
    document.getElementById(
        "cancelButton"
    );

const backToDrivers =
    document.getElementById(
        "backToDrivers"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const driverPhotoInput =
    document.getElementById(
        "driverPhoto"
    );

const photoPreview =
    document.getElementById(
        "photoPreview"
    );

const successToast =
    document.getElementById(
        "successToast"
    );


let selectedPhotoFile = null;


/* =========================================================
   INPUT HELPERS
========================================================= */

function value(id) {

    const element =
        document.getElementById(id);

    return element
        ? element.value.trim()
        : "";
}


/* =========================================================
   NORMALIZE
========================================================= */

function normalizePhone(phone) {

    return String(phone || "")
        .replace(/\D/g, "");
}


function normalizeEmail(email) {

    return String(email || "")
        .trim()
        .toLowerCase();
}


function normalizeVehicleNumber(number) {

    return String(number || "")
        .trim()
        .toUpperCase();
}


function normalizeText(text) {

    return String(text || "")
        .trim();
}


/* =========================================================
   DRIVER STATUS
========================================================= */

function databaseDriverStatus(status) {

    switch (
        String(status || "")
            .trim()
            .toLowerCase()
    ) {

        case "offline":
            return "inactive";

        case "suspended":
            return "suspended";

        case "pending":
            return "pending";

        case "available":
        case "assigned":
        case "on delivery":
        default:
            return "active";
    }
}


/* =========================================================
   PHOTO PREVIEW
========================================================= */

if (driverPhotoInput) {

    driverPhotoInput.addEventListener(
        "change",
        function () {

            const file =
                this.files &&
                this.files[0];

            if (!file) {

                selectedPhotoFile = null;

                resetPhotoPreview();

                return;
            }


            const allowedTypes = [
                "image/jpeg",
                "image/jpg",
                "image/png"
            ];


            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {

                alert(
                    "Please upload a JPG or PNG image."
                );

                this.value = "";

                selectedPhotoFile = null;

                resetPhotoPreview();

                return;
            }


            const maxSize =
                5 * 1024 * 1024;


            if (file.size > maxSize) {

                alert(
                    "Driver photo must be smaller than 5 MB."
                );

                this.value = "";

                selectedPhotoFile = null;

                resetPhotoPreview();

                return;
            }


            selectedPhotoFile = file;


            const reader =
                new FileReader();


            reader.onload =
                function (event) {

                    photoPreview.innerHTML = "";


                    const image =
                        document.createElement(
                            "img"
                        );

                    image.src =
                        event.target.result;

                    image.alt =
                        "Driver Photo Preview";


                    photoPreview.appendChild(
                        image
                    );
                };


            reader.onerror =
                function () {

                    alert(
                        "Unable to read the selected photo."
                    );

                    selectedPhotoFile = null;

                    resetPhotoPreview();
                };


            reader.readAsDataURL(file);
        }
    );
}


function resetPhotoPreview() {

    if (!photoPreview) {
        return;
    }

    photoPreview.innerHTML = `
        <i class="fa-solid fa-user"></i>
    `;
}


/* =========================================================
   DIGITS ONLY
========================================================= */

function digitsOnly(input) {

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        function () {

            this.value =
                this.value.replace(
                    /\D/g,
                    ""
                );
        }
    );
}


digitsOnly(
    document.getElementById(
        "mobileNumber"
    )
);

digitsOnly(
    document.getElementById(
        "alternateMobile"
    )
);

digitsOnly(
    document.getElementById(
        "pinCode"
    )
);

digitsOnly(
    document.getElementById(
        "emergencyNumber"
    )
);


/* =========================================================
   DATE VALIDATION
========================================================= */

const dateOfBirth =
    document.getElementById(
        "dateOfBirth"
    );

const licenceExpiry =
    document.getElementById(
        "licenceExpiry"
    );

const joiningDate =
    document.getElementById(
        "joiningDate"
    );


function getTodayString() {

    const today =
        new Date();

    return today
        .toISOString()
        .split("T")[0];
}


function applyDateLimits() {

    const todayString =
        getTodayString();


    if (dateOfBirth) {

        dateOfBirth.max =
            todayString;
    }


    if (joiningDate) {

        joiningDate.max =
            todayString;
    }


    if (licenceExpiry) {

        licenceExpiry.min =
            todayString;
    }
}


applyDateLimits();


/* =========================================================
   VALIDATION
========================================================= */

function validateForm() {

    const requiredFields =
        form.querySelectorAll(
            "[required]"
        );


    let firstInvalid = null;


    requiredFields.forEach(
        field => {

            field.setCustomValidity("");


            if (
                !field.value.trim()
            ) {

                if (!firstInvalid) {

                    firstInvalid =
                        field;
                }

                return;
            }


            if (
                field.id ===
                    "mobileNumber" &&
                !/^\d{10}$/.test(
                    field.value
                )
            ) {

                field.setCustomValidity(
                    "Enter a valid 10-digit mobile number."
                );

                if (!firstInvalid) {
                    firstInvalid = field;
                }
            }


            if (
                field.id ===
                    "alternateMobile" &&
                field.value &&
                !/^\d{10}$/.test(
                    field.value
                )
            ) {

                field.setCustomValidity(
                    "Enter a valid 10-digit mobile number."
                );

                if (!firstInvalid) {
                    firstInvalid = field;
                }
            }


            if (
                field.id ===
                    "emergencyNumber" &&
                !/^\d{10}$/.test(
                    field.value
                )
            ) {

                field.setCustomValidity(
                    "Enter a valid 10-digit mobile number."
                );

                if (!firstInvalid) {
                    firstInvalid = field;
                }
            }


            if (
                field.id ===
                    "pinCode" &&
                !/^\d{6}$/.test(
                    field.value
                )
            ) {

                field.setCustomValidity(
                    "Enter a valid 6-digit PIN code."
                );

                if (!firstInvalid) {
                    firstInvalid = field;
                }
            }


            if (
                field.id ===
                    "dateOfBirth" &&
                field.value &&
                field.value >
                    getTodayString()
            ) {

                field.setCustomValidity(
                    "Date of birth cannot be in the future."
                );

                if (!firstInvalid) {
                    firstInvalid = field;
                }
            }


            if (
                field.id ===
                    "joiningDate" &&
                field.value &&
                field.value >
                    getTodayString()
            ) {

                field.setCustomValidity(
                    "Joining date cannot be in the future."
                );

                if (!firstInvalid) {
                    firstInvalid = field;
                }
            }


            if (
                field.id ===
                    "licenceExpiry" &&
                field.value &&
                field.value <
                    getTodayString()
            ) {

                field.setCustomValidity(
                    "Licence expiry date cannot be in the past."
                );

                if (!firstInvalid) {
                    firstInvalid = field;
                }
            }

        }
    );


    if (
        !form.checkValidity()
    ) {

        const invalid =
            firstInvalid ||
            form.querySelector(
                ":invalid"
            );


        if (invalid) {

            invalid.reportValidity();

            invalid.focus();
        }


        return false;
    }


    const mobile =
        value("mobileNumber");

    const alternate =
        value("alternateMobile");


    if (
        alternate &&
        mobile === alternate
    ) {

        alert(
            "Alternate mobile number should be different from the main mobile number."
        );


        document
            .getElementById(
                "alternateMobile"
            )
            .focus();


        return false;
    }


    return true;
}


/* =========================================================
   GENERATE DRIVER ID
========================================================= */

async function generateDriverId() {

    const {
        data,
        error
    } = await supabase
        .from("drivers")
        .select("driver_id");


    if (error) {

        throw new Error(
            "Unable to read existing drivers: " +
            error.message
        );
    }


    let highestNumber = 0;


    (data || []).forEach(
        driver => {

            const match =
                String(
                    driver.driver_id || ""
                ).match(
                    /^DRV-(\d+)$/i
                );


            if (match) {

                highestNumber =
                    Math.max(
                        highestNumber,
                        Number(
                            match[1]
                        )
                    );
            }
        }
    );


    return (
        "DRV-" +
        String(
            highestNumber + 1
        ).padStart(
            4,
            "0"
        )
    );
}


/* =========================================================
   FIND EXISTING DRIVER PROFILE
=========================================================

   A driver can be registered by Admin even if the driver
   has not created a login account yet.

   If a matching driver profile already exists, we connect
   profile_id automatically.
========================================================= */

async function findDriverProfile(
    email,
    phone
) {

    if (!email && !phone) {
        return null;
    }


    if (email) {

        const {
            data,
            error
        } = await supabase
            .from("profiles")
            .select(
                "id,email,phone,role,status"
            )
            .eq(
                "email",
                email
            )
            .eq(
                "role",
                "driver"
            )
            .maybeSingle();


        if (error) {

            throw new Error(
                "Unable to check driver profile: " +
                error.message
            );
        }


        if (data) {
            return data;
        }
    }


    if (phone) {

        const {
            data,
            error
        } = await supabase
            .from("profiles")
            .select(
                "id,email,phone,role,status"
            )
            .eq(
                "phone",
                phone
            )
            .eq(
                "role",
                "driver"
            )
            .maybeSingle();


        if (error) {

            throw new Error(
                "Unable to check driver profile phone: " +
                error.message
            );
        }


        if (data) {
            return data;
        }
    }


    return null;
}


/* =========================================================
   DUPLICATE DRIVER CHECK
========================================================= */

async function checkDuplicateDriverData() {

    const phone =
        normalizePhone(
            value("mobileNumber")
        );

    const email =
        normalizeEmail(
            value("emailAddress")
        );

    const licence =
        normalizeText(
            value("licenceNumber")
        ).toUpperCase();


    /* PHONE */

    const {
        data: phoneData,
        error: phoneError
    } = await supabase
        .from("drivers")
        .select("id")
        .eq(
            "phone",
            phone
        )
        .limit(1);


    if (phoneError) {

        throw new Error(
            "Unable to check driver phone: " +
            phoneError.message
        );
    }


    if (
        phoneData &&
        phoneData.length > 0
    ) {

        throw new Error(
            "A driver with this mobile number already exists."
        );
    }


    /* EMAIL */

    if (email) {

        const {
            data: emailData,
            error: emailError
        } = await supabase
            .from("drivers")
            .select("id")
            .eq(
                "email",
                email
            )
            .limit(1);


        if (emailError) {

            throw new Error(
                "Unable to check driver email: " +
                emailError.message
            );
        }


        if (
            emailData &&
            emailData.length > 0
        ) {

            throw new Error(
                "A driver with this email address already exists."
            );
        }
    }


    /* LICENCE */

    const {
        data: licenceData,
        error: licenceError
    } = await supabase
        .from("drivers")
        .select("id")
        .eq(
            "driving_license_number",
            licence
        )
        .limit(1);


    if (licenceError) {

        throw new Error(
            "Unable to check driving licence: " +
            licenceError.message
        );
    }


    if (
        licenceData &&
        licenceData.length > 0
    ) {

        throw new Error(
            "A driver with this driving licence number already exists."
        );
    }
}


/* =========================================================
   CREATE DRIVER DATA
========================================================= */

async function buildDriverData() {

    const phone =
        normalizePhone(
            value("mobileNumber")
        );

    const email =
        normalizeEmail(
            value("emailAddress")
        );


    const existingProfile =
        await findDriverProfile(
            email,
            phone
        );


    const driverId =
        await generateDriverId();


    return {

        driver_id:
            driverId,

        profile_id:
            existingProfile
                ? existingProfile.id
                : null,

        name:
            value("driverName"),

        date_of_birth:
            value("dateOfBirth"),

        gender:
            value("gender"),

        blood_group:
            value("bloodGroup") ||
            null,

        phone:
            phone,

        alternate_phone:
            value("alternateMobile")
                ? normalizePhone(
                    value(
                        "alternateMobile"
                    )
                )
                : null,

        email:
            email || null,

        address_line1:
            value("address"),

        address_line2:
            null,

        city:
            value("city"),

        state:
            value("state"),

        pin_code:
            value("pinCode"),

        government_id_number:
            value("governmentId"),

        driving_license_number:
            value("licenceNumber")
                .toUpperCase(),

        driving_license_expiry:
            value("licenceExpiry"),

        joining_date:
            value("joiningDate"),

        status:
            databaseDriverStatus(
                value("driverStatus")
            ),

        vehicle_assigned:
            Boolean(
                value("vehicleAssigned")
            ),

        photo_url:
            null,

        notes:
            null,

        emergency_contact_name:
            value("emergencyName") ||
            null,

        emergency_contact_relationship:
            value("relationship") ||
            null,

        emergency_contact_phone:
            value("emergencyNumber")
                ? normalizePhone(
                    value(
                        "emergencyNumber"
                    )
                )
                : null
    };
}


/* =========================================================
   HANDLE VEHICLE
========================================================= */

async function handleVehicleAssignment(
    driver
) {

    const vehicleIdentifier =
        value(
            "vehicleAssigned"
        );

    const vehicleNumber =
        normalizeVehicleNumber(
            value(
                "vehicleNumber"
            )
        );

    const vehicleType =
        value(
            "vehicleType"
        );


    /*
       Vehicle assignment is optional.
    */

    if (
        !vehicleIdentifier &&
        !vehicleNumber &&
        !vehicleType
    ) {

        return null;
    }


    if (
        !vehicleIdentifier ||
        !vehicleNumber ||
        !vehicleType
    ) {

        throw new Error(
            "Please complete all vehicle assignment details."
        );
    }


    /* =========================================
       CHECK VEHICLE IDENTIFIER
    ========================================= */

    const {
        data: existingVehicle,
        error: vehicleLookupError
    } = await supabase
        .from("vehicles")
        .select("*")
        .eq(
            "vehicle_id",
            vehicleIdentifier
        )
        .maybeSingle();


    if (vehicleLookupError) {

        throw new Error(
            "Unable to check vehicle: " +
            vehicleLookupError.message
        );
    }


    /* =========================================
       CHECK VEHICLE NUMBER
    ========================================= */

    const {
        data: vehicleNumberRows,
        error: vehicleNumberError
    } = await supabase
        .from("vehicles")
        .select(
            "id,vehicle_id,assigned_driver_id"
        )
        .eq(
            "vehicle_number",
            vehicleNumber
        );


    if (vehicleNumberError) {

        throw new Error(
            "Unable to check vehicle number: " +
            vehicleNumberError.message
        );
    }


    const conflictingVehicle =
        (vehicleNumberRows || [])
            .find(
                vehicle =>
                    !existingVehicle ||
                    vehicle.id !==
                        existingVehicle.id
            );


    if (conflictingVehicle) {

        throw new Error(
            "This vehicle number is already registered."
        );
    }


    /* =========================================
       EXISTING VEHICLE
    ========================================= */

    if (existingVehicle) {

        if (
            existingVehicle.assigned_driver_id &&
            existingVehicle.assigned_driver_id !==
                driver.id
        ) {

            throw new Error(
                `${vehicleIdentifier} is already assigned to another driver.`
            );
        }


        const {
            data: updatedVehicle,
            error: updateError
        } = await supabase
            .from("vehicles")
            .update({

                vehicle_number:
                    vehicleNumber,

                vehicle_type:
                    vehicleType,

                assigned_driver_id:
                    driver.id,

                vehicle_status:
                    "assigned",

                updated_at:
                    new Date().toISOString()
            })
            .eq(
                "id",
                existingVehicle.id
            )
            .select()
            .single();


        if (updateError) {

            throw new Error(
                "Unable to assign vehicle: " +
                updateError.message
            );
        }


        return updatedVehicle;
    }


    /* =========================================
       CREATE NEW VEHICLE
    ========================================= */

    const {
        data: newVehicle,
        error: newVehicleError
    } = await supabase
        .from("vehicles")
        .insert({

            vehicle_id:
                vehicleIdentifier,

            vehicle_number:
                vehicleNumber,

            vehicle_type:
                vehicleType,

            custom_vehicle_type:
                null,

            assigned_driver_id:
                driver.id,

            vehicle_status:
                "assigned"
        })
        .select()
        .single();


    if (newVehicleError) {

        throw new Error(
            "Unable to create vehicle: " +
            newVehicleError.message
        );
    }


    return newVehicle;
}


/* =========================================================
   DELETE DRIVER AFTER FAILED VEHICLE OPERATION
========================================================= */

async function rollbackDriver(
    driverId
) {

    if (!driverId) {
        return;
    }


    const {
        error
    } = await supabase
        .from("drivers")
        .delete()
        .eq(
            "id",
            driverId
        );


    if (error) {

        console.error(
            "SSP rollback failed:",
            error
        );
    }
}


/* =========================================================
   SAVE DRIVER
========================================================= */

async function saveDriver() {

    if (!supabase) {

        throw new Error(
            "Supabase client is not available."
        );
    }


    /* =========================================
       ADMIN SESSION
    ========================================= */

    const {
        data: sessionData,
        error: sessionError
    } = await supabase.auth.getSession();


    if (sessionError) {

        throw new Error(
            "Unable to verify admin session: " +
            sessionError.message
        );
    }


    const session =
        sessionData?.session;


    if (
        !session ||
        !session.user
    ) {

        throw new Error(
            "Admin session not found. Please log in again."
        );
    }


    /* =========================================
       VERIFY ACTIVE ADMIN
    ========================================= */

    const {
        data: adminProfile,
        error: adminError
    } = await supabase
        .from("profiles")
        .select(
            "id,role,status"
        )
        .eq(
            "id",
            session.user.id
        )
        .eq(
            "role",
            "admin"
        )
        .eq(
            "status",
            "active"
        )
        .maybeSingle();


    if (adminError) {

        throw new Error(
            "Admin authorization check failed: " +
            adminError.message
        );
    }


    if (!adminProfile) {

        throw new Error(
            "Active admin authorization was not found."
        );
    }


    /* =========================================
       DUPLICATE CHECK
    ========================================= */

    await checkDuplicateDriverData();


    /* =========================================
       BUILD DRIVER
    ========================================= */

    const driverData =
        await buildDriverData();


    console.log(
        "SSP: Saving driver:",
        driverData
    );


    /* =========================================
       INSERT DRIVER
    ========================================= */

    const {
        data: driver,
        error: driverError
    } = await supabase
        .from("drivers")
        .insert(
            driverData
        )
        .select()
        .single();


    if (driverError) {

        console.error(
            "SSP driver insert error:",
            driverError
        );

        throw new Error(
            "Driver could not be saved: " +
            driverError.message
        );
    }


    if (!driver) {

        throw new Error(
            "Driver was not returned by Supabase after saving."
        );
    }


    /* =========================================
       VEHICLE
    ========================================= */

    try {

        await handleVehicleAssignment(
            driver
        );

    } catch (vehicleError) {

        await rollbackDriver(
            driver.id
        );

        throw vehicleError;
    }


    /* =========================================
       PHOTO
       
       NOTE:
       The photo is currently previewed only.
       We intentionally do not store Base64 data
       in PostgreSQL.
       
       Storage upload can be connected separately
       without affecting driver registration.
    ========================================= */


    return driver;
}


/* =========================================================
   FORM SUBMIT
========================================================= */

if (form) {

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (!validateForm()) {
                return;
            }


            const saveButton =
                form.querySelector(
                    ".save-button"
                );


            const originalButtonHTML =
                saveButton
                    ? saveButton.innerHTML
                    : "";


            try {

                if (saveButton) {

                    saveButton.disabled =
                        true;

                    saveButton.innerHTML =
                        `
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        Saving...
                        `;
                }


                const driver =
                    await saveDriver();


                showSuccessToast();


                setTimeout(
                    function () {

                        window.location.href =
                            `drivers.html?driverAdded=${encodeURIComponent(
                                driver.driver_id
                            )}`;

                    },
                    900
                );


            } catch (error) {

                console.error(
                    "SSP driver registration error:",
                    error
                );


                alert(
                    error?.message ||
                    "Driver could not be saved."
                );


                if (saveButton) {

                    saveButton.disabled =
                        false;

                    saveButton.innerHTML =
                        originalButtonHTML;
                }
            }
        }
    );
}


/* =========================================================
   SUCCESS TOAST
========================================================= */

function showSuccessToast() {

    if (!successToast) {
        return;
    }


    successToast.classList.add(
        "show"
    );


    setTimeout(
        function () {

            successToast.classList.remove(
                "show"
            );

        },
        2500
    );
}


/* =========================================================
   CANCEL
========================================================= */

if (cancelButton) {

    cancelButton.addEventListener(
        "click",
        function () {

            const confirmed =
                window.confirm(
                    "Are you sure you want to cancel? Entered driver information will be lost."
                );


            if (!confirmed) {
                return;
            }


            window.location.href =
                "drivers.html";
        }
    );
}


/* =========================================================
   BACK TO DRIVERS
========================================================= */

if (backToDrivers) {

    backToDrivers.addEventListener(
        "click",
        function () {

            window.location.href =
                "drivers.html";
        }
    );
}


/* =========================================================
   SIDEBAR
========================================================= */

function openMobileSidebar() {

    if (sidebar) {

        sidebar.classList.add(
            "mobile-open"
        );
    }


    if (sidebarOverlay) {

        sidebarOverlay.classList.add(
            "show"
        );
    }


    document.body.style.overflow =
        "hidden";
}


function closeMobileSidebar() {

    if (sidebar) {

        sidebar.classList.remove(
            "mobile-open"
        );
    }


    if (sidebarOverlay) {

        sidebarOverlay.classList.remove(
            "show"
        );
    }


    document.body.style.overflow =
        "";
}


if (menuButton) {

    menuButton.addEventListener(
        "click",
        function () {

            if (
                window.innerWidth <= 900
            ) {

                openMobileSidebar();

                return;
            }


            document.body.classList.toggle(
                "sidebar-collapsed"
            );


            localStorage.setItem(
                "ssp_sidebar_collapsed",
                document.body.classList.contains(
                    "sidebar-collapsed"
                )
                    ? "1"
                    : "0"
            );
        }
    );
}


if (sidebarClose) {

    sidebarClose.addEventListener(
        "click",
        closeMobileSidebar
    );
}


if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        closeMobileSidebar
    );
}


document.querySelectorAll(
    ".sidebar-nav a"
).forEach(
    link => {

        link.addEventListener(
            "click",
            function () {

                if (
                    window.innerWidth <= 900
                ) {

                    closeMobileSidebar();
                }
            }
        );
    }
);


window.addEventListener(
    "resize",
    function () {

        if (
            window.innerWidth > 900
        ) {

            closeMobileSidebar();
        }
    }
);


/* =========================================================
   RESTORE SIDEBAR STATE
========================================================= */

(function restoreSidebarState() {

    const collapsed =
        localStorage.getItem(
            "ssp_sidebar_collapsed"
        );


    if (
        collapsed === "1" &&
        window.innerWidth > 900
    ) {

        document.body.classList.add(
            "sidebar-collapsed"
        );
    }

})();


/* =========================================================
   LOGOUT
========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();


            const confirmed =
                window.confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmed) {
                return;
            }


            try {

                if (supabase) {

                    await supabase.auth.signOut();
                }

            } catch (error) {

                console.warn(
                    "Supabase logout warning:",
                    error
                );
            }


            window.location.href =
                "login.html";
        }
    );
}