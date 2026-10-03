/* =====================================================
   SSP DRIVER LOGIN
   Sri Sadguru Siddarooda Parcel Service

   Authentication:
   Supabase Auth

   Login:
   - 10-digit Indian phone number
   - Gmail address

   Driver verification:
   profiles
   +
   drivers.profile_id
===================================================== */

"use strict";


/* =====================================================
   STORAGE
===================================================== */

const REMEMBERED_LOGIN_KEY =
    "ssp_driver_remembered_login";


/* =====================================================
   ELEMENTS
===================================================== */

const loginForm =
    document.getElementById("loginForm");

const loginId =
    document.getElementById("loginId");

const password =
    document.getElementById("password");

const showPassword =
    document.getElementById("showPassword");

const rememberMe =
    document.getElementById("rememberMe");

const loginButton =
    document.getElementById("loginButton");

const loginMessage =
    document.getElementById("loginMessage");

const loginIdError =
    document.getElementById("loginIdError");

const passwordError =
    document.getElementById("passwordError");


/* =====================================================
   MESSAGE
===================================================== */

function showLoginMessage(
    message,
    type = ""
) {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent =
        message;

    loginMessage.className =
        "login-message";

    if (type) {

        loginMessage.classList.add(
            type
        );

    }

}


/* =====================================================
   CLEAR ERRORS
===================================================== */

function clearErrors() {

    if (loginIdError) {
        loginIdError.textContent = "";
    }

    if (passwordError) {
        passwordError.textContent = "";
    }


    if (loginId) {

        loginId
            .parentElement
            ?.parentElement
            ?.classList
            .remove("input-error");

    }


    if (password) {

        password
            .parentElement
            ?.parentElement
            ?.classList
            .remove("input-error");

    }


    showLoginMessage("");

}


/* =====================================================
   LOGIN TYPE
===================================================== */

function getLoginType(
    value
) {

    const trimmedValue =
        value.trim();


    /* Gmail */

    if (
        /^[^\s@]+@gmail\.com$/i.test(
            trimmedValue
        )
    ) {

        return "email";

    }


    /* Phone */

    if (
        /^\d{10}$/.test(
            trimmedValue
        )
    ) {

        return "phone";

    }


    return null;

}


/* =====================================================
   VALIDATE LOGIN ID
===================================================== */

function validateLoginId(
    value
) {

    if (!value) {

        loginIdError.textContent =
            "Please enter your phone number or Gmail address.";

        loginId
            .parentElement
            .parentElement
            .classList
            .add("input-error");

        return false;

    }


    const loginType =
        getLoginType(value);


    if (!loginType) {

        loginIdError.textContent =
            "Enter a valid 10-digit phone number or Gmail address.";

        loginId
            .parentElement
            .parentElement
            .classList
            .add("input-error");

        return false;

    }


    return true;

}


/* =====================================================
   VALIDATE PASSWORD
===================================================== */

function validatePassword(
    value
) {

    if (!value) {

        passwordError.textContent =
            "Please enter your password.";

        password
            .parentElement
            .parentElement
            .classList
            .add("input-error");

        return false;

    }


    return true;

}


/* =====================================================
   SHOW / HIDE PASSWORD
===================================================== */

showPassword.addEventListener(
    "click",
    function () {

        if (
            password.type ===
            "password"
        ) {

            password.type =
                "text";

            showPassword.textContent =
                "🙈";

            showPassword.setAttribute(
                "aria-label",
                "Hide password"
            );

        } else {

            password.type =
                "password";

            showPassword.textContent =
                "👁";

            showPassword.setAttribute(
                "aria-label",
                "Show password"
            );

        }

    }
);


/* =====================================================
   LOAD REMEMBERED LOGIN
===================================================== */

function loadRememberedLogin() {

    try {

        const rememberedLogin =
            localStorage.getItem(
                REMEMBERED_LOGIN_KEY
            );


        if (!rememberedLogin) {
            return;
        }


        loginId.value =
            rememberedLogin;

        rememberMe.checked =
            true;

    } catch (error) {

        console.error(
            "Unable to load remembered login:",
            error
        );

    }

}


/* =====================================================
   SAVE REMEMBERED LOGIN
===================================================== */

function saveRememberedLogin(
    value
) {

    try {

        if (
            rememberMe.checked
        ) {

            localStorage.setItem(
                REMEMBERED_LOGIN_KEY,
                value
            );

        } else {

            localStorage.removeItem(
                REMEMBERED_LOGIN_KEY
            );

        }

    } catch (error) {

        console.error(
            "Unable to save remembered login:",
            error
        );

    }

}


/* =====================================================
   GET DRIVER EMAIL BY PHONE
===================================================== */

async function getDriverEmailByPhone(
    phone
) {

    const {
        data,
        error
    } =
        await window.supabaseClient
            .rpc(
                "get_driver_email_by_phone",
                {
                    driver_phone:
                        "+91" + phone
                }
            );


    if (error) {

        console.error(
            "Driver phone lookup error:",
            error
        );

        throw new Error(
            "Unable to find the driver account with this phone number."
        );

    }


    if (!data) {

        throw new Error(
            "No active driver account was found with this phone number."
        );

    }


    return String(data)
        .trim()
        .toLowerCase();

}


/* =====================================================
   VERIFY DRIVER ACCOUNT
===================================================== */

async function verifyDriverAccount(
    user
) {

    /* ---------------------------------------------
       PROFILE
    --------------------------------------------- */

    const {
        data: profile,
        error: profileError
    } =
        await window.supabaseClient
            .from("profiles")
            .select(
                "id, email, phone, full_name, role, status"
            )
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


    if (profileError) {

        console.error(
            "Profile lookup failed:",
            profileError
        );

        return {
            valid: false,
            message:
                "Unable to verify your driver profile."
        };

    }


    if (!profile) {

        return {
            valid: false,
            message:
                "Driver profile not found. Please contact the administrator."
        };

    }


    /* ---------------------------------------------
       ROLE
    --------------------------------------------- */

    if (
        profile.role !==
        "driver"
    ) {

        return {
            valid: false,
            message:
                "This account is not registered as a driver account."
        };

    }


    /* ---------------------------------------------
       PROFILE STATUS
    --------------------------------------------- */

    if (
        profile.status !==
        "active"
    ) {

        return {
            valid: false,
            message:
                "Your driver account is not active. Please contact the administrator."
        };

    }


    /* ---------------------------------------------
       DRIVER RECORD
    --------------------------------------------- */

    const {
        data: driver,
        error: driverError
    } =
        await window.supabaseClient
            .from("drivers")
            .select(
                "id, profile_id, driver_id, name, phone, email, status"
            )
            .eq(
                "profile_id",
                user.id
            )
            .maybeSingle();


    if (driverError) {

        console.error(
            "Driver lookup failed:",
            driverError
        );

        return {
            valid: false,
            message:
                "Unable to verify your driver record."
        };

    }


    if (!driver) {

        return {
            valid: false,
            message:
                "Driver record not found. Please contact the administrator."
        };

    }


    /* ---------------------------------------------
       DRIVER STATUS
    --------------------------------------------- */

    if (
        driver.status !==
        "active"
    ) {

        return {
            valid: false,
            message:
                "Your driver account is not active. Please contact the administrator."
        };

    }


    return {

        valid: true,

        profile:
            profile,

        driver:
            driver

    };

}


/* =====================================================
   UPDATE LAST LOGIN
===================================================== */

async function updateLastLogin(
    userId
) {

    const {
        error
    } =
        await window.supabaseClient
            .from("profiles")
            .update({
                last_login_at:
                    new Date().toISOString()
            })
            .eq(
                "id",
                userId
            );


    if (error) {

        console.warn(
            "Unable to update last login:",
            error
        );

    }

}


/* =====================================================
   LOGIN SUBMIT
===================================================== */

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        clearErrors();


        const loginValue =
            loginId.value.trim();

        const loginPassword =
            password.value;


        /* ---------------------------------------------
           VALIDATION
        --------------------------------------------- */

        const validLoginId =
            validateLoginId(
                loginValue
            );

        const validPassword =
            validatePassword(
                loginPassword
            );


        if (
            !validLoginId ||
            !validPassword
        ) {

            return;

        }


        const loginType =
            getLoginType(
                loginValue
            );


        /* ---------------------------------------------
           LOADING
        --------------------------------------------- */

        loginButton.disabled =
            true;

        loginButton.textContent =
            "Logging in...";


        showLoginMessage(
            "Checking your account..."
        );


        try {

            let emailForLogin = "";


            /* =========================================
               GMAIL
            ========================================= */

            if (
                loginType ===
                "email"
            ) {

                emailForLogin =
                    loginValue
                        .toLowerCase();

            }


            /* =========================================
               PHONE
            ========================================= */

            else {

                showLoginMessage(
                    "Finding your driver account..."
                );


                emailForLogin =
                    await getDriverEmailByPhone(
                        loginValue
                    );

            }


            /* -----------------------------------------
               EMAIL LOGIN
            ----------------------------------------- */

            showLoginMessage(
                "Verifying your password..."
            );


            const {
                data,
                error
            } =
                await window.supabaseClient
                    .auth
                    .signInWithPassword({

                        email:
                            emailForLogin,

                        password:
                            loginPassword

                    });


            /* -----------------------------------------
               AUTH ERROR
            ----------------------------------------- */

            if (error) {

                console.error(
                    "Supabase login error:",
                    error
                );

                throw new Error(
                    "Invalid phone/Gmail or password."
                );

            }


            /* -----------------------------------------
               USER
            ----------------------------------------- */

            const user =
                data?.user;


            if (!user) {

                throw new Error(
                    "Login session could not be created."
                );

            }


            /* -----------------------------------------
               VERIFY DRIVER
            ----------------------------------------- */

            showLoginMessage(
                "Verifying driver account..."
            );


            const driverCheck =
                await verifyDriverAccount(
                    user
                );


            if (
                !driverCheck.valid
            ) {

                await window.supabaseClient
                    .auth
                    .signOut();


                throw new Error(
                    driverCheck.message
                );

            }


            /* -----------------------------------------
               LAST LOGIN
            ----------------------------------------- */

            await updateLastLogin(
                user.id
            );


            /* -----------------------------------------
               REMEMBER ME
            ----------------------------------------- */

            saveRememberedLogin(
                loginValue
            );


            /* -----------------------------------------
               SUCCESS
            ----------------------------------------- */

            showLoginMessage(
                "Login successful. Opening Driver Portal...",
                "success"
            );


            loginButton.textContent =
                "Opening Driver Portal...";


            /* -----------------------------------------
               DRIVER DASHBOARD
            ----------------------------------------- */

            setTimeout(
                function () {

                    window.location.replace(
                        "driver/dashboard.html"
                    );

                },
                500
            );

        } catch (error) {

            console.error(
                "Driver login error:",
                error
            );


            showLoginMessage(
                error?.message ||
                "Unable to login right now. Please try again.",
                "error"
            );


            loginButton.disabled =
                false;

            loginButton.textContent =
                "Login";

        }

    }
);


/* =====================================================
   LOGIN ID INPUT
===================================================== */

loginId.addEventListener(
    "input",
    function () {

        const value =
            this.value;


        /*
           Numeric input:
           keep maximum 10 digits.
        */

        if (
            /^\d+$/.test(value)
        ) {

            this.value =
                value
                    .replace(/\D/g, "")
                    .slice(0, 10);

        }


        loginIdError.textContent = "";

        loginId
            .parentElement
            .parentElement
            .classList
            .remove(
                "input-error"
            );

    }
);


/* =====================================================
   PASSWORD INPUT
===================================================== */

password.addEventListener(
    "input",
    function () {

        passwordError.textContent = "";

        password
            .parentElement
            .parentElement
            .classList
            .remove(
                "input-error"
            );

    }
);


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadRememberedLogin();

    }
); 