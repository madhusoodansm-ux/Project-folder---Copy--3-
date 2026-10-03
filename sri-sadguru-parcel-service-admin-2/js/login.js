/* =========================================================
   SRI SADGURU PARCEL SERVICE
   ADMIN PORTAL
   LOGIN JAVASCRIPT

   AUTHENTICATION ARCHITECTURE

   Admin Login
        ↓
   Supabase Auth
        ↓
   auth.users.id
        ↓
   public.profiles.id
        ↓
   role = "admin"
        ↓
   status = "active"
        ↓
   Email + Phone verification
        ↓
   Admin Dashboard
========================================================= */

"use strict";


/* =========================================================
   SUPABASE CLIENT
========================================================= */

function getSupabaseClient() {

    if (
        typeof window === "undefined" ||
        !window.supabaseClient
    ) {

        console.error(
            "Supabase client is not available."
        );

        throw new Error(
            "Supabase client is not initialized."
        );
    }

    return window.supabaseClient;
}


/* =========================================================
   DOM ELEMENTS
========================================================= */

const loginForm =
    document.getElementById(
        "adminLoginForm"
    );

const emailInput =
    document.getElementById(
        "adminEmail"
    );

const phoneInput =
    document.getElementById(
        "adminPhone"
    );

const passwordInput =
    document.getElementById(
        "adminPassword"
    );

const loginButton =
    document.getElementById(
        "loginButton"
    );

const loginButtonText =
    document.getElementById(
        "loginButtonText"
    );

const loginLoader =
    document.getElementById(
        "loginLoader"
    );

const passwordToggle =
    document.getElementById(
        "passwordToggle"
    );

const forgotPassword =
    document.getElementById(
        "forgotPassword"
    );

const loginError =
    document.getElementById(
        "loginError"
    );

const emailError =
    document.getElementById(
        "emailError"
    );

const phoneError =
    document.getElementById(
        "phoneError"
    );

const passwordError =
    document.getElementById(
        "passwordError"
    );


/* =========================================================
   CONSTANTS
========================================================= */

const DASHBOARD_URL =
    "admin/dashboard.html";

const MIN_PASSWORD_LENGTH =
    12;

const MAX_PASSWORD_LENGTH =
    128;


/* =========================================================
   REGULAR EXPRESSIONS
========================================================= */

/*
   Existing Admin Portal requirement:
   Gmail address.
*/

const GMAIL_REGEX =
    /^[a-zA-Z0-9._%+-]+@gmail\.com$/;


/*
   Indian 10-digit mobile number.
*/

const PHONE_REGEX =
    /^[6-9][0-9]{9}$/;


/*
   Password requirements:

   - Minimum 12 characters
   - Uppercase
   - Lowercase
   - Number
   - Special character
*/

const PASSWORD_UPPERCASE_REGEX =
    /[A-Z]/;

const PASSWORD_LOWERCASE_REGEX =
    /[a-z]/;

const PASSWORD_NUMBER_REGEX =
    /[0-9]/;

const PASSWORD_SPECIAL_REGEX =
    /[^A-Za-z0-9]/;


/* =========================================================
   GENERAL HELPERS
========================================================= */

function normalizeEmail(value) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();
}


function normalizePhone(value) {

    return String(
        value || ""
    )
        .replace(/\D/g, "")
        .slice(-10);
}


/* =========================================================
   LOGIN ERROR
========================================================= */

function showLoginError(message) {

    if (!loginError) {
        return;
    }

    loginError.textContent =
        String(message || "");

    loginError.classList.add(
        "show"
    );

    loginError.removeAttribute(
        "hidden"
    );

    loginError.style.display =
        "block";
}


function hideLoginError() {

    if (!loginError) {
        return;
    }

    loginError.textContent = "";

    loginError.classList.remove(
        "show"
    );

    loginError.setAttribute(
        "hidden",
        "hidden"
    );

    loginError.style.display =
        "none";
}


/* =========================================================
   FIELD ERROR
========================================================= */

function showFieldError(
    element,
    message
) {

    if (!element) {
        return;
    }

    element.textContent =
        String(message || "");

    element.classList.add(
        "show"
    );

    element.removeAttribute(
        "hidden"
    );

    element.style.display =
        "block";
}


function hideFieldError(element) {

    if (!element) {
        return;
    }

    element.textContent = "";

    element.classList.remove(
        "show"
    );

    element.setAttribute(
        "hidden",
        "hidden"
    );

    element.style.display =
        "none";
}


/* =========================================================
   FIELD STATE
========================================================= */

function markFieldInvalid(input) {

    if (!input) {
        return;
    }

    input.classList.add(
        "error"
    );

    input.setAttribute(
        "aria-invalid",
        "true"
    );
}


function markFieldValid(input) {

    if (!input) {
        return;
    }

    input.classList.remove(
        "error"
    );

    input.setAttribute(
        "aria-invalid",
        "false"
    );
}


function clearFieldState(
    input,
    errorElement
) {

    markFieldValid(
        input
    );

    hideFieldError(
        errorElement
    );
}


/* =========================================================
   EMAIL VALIDATION
========================================================= */

function validateEmail() {

    if (!emailInput) {
        return false;
    }

    const email =
        normalizeEmail(
            emailInput.value
        );

    emailInput.value =
        email;

    if (!email) {

        showFieldError(
            emailError,
            "Email address is required."
        );

        markFieldInvalid(
            emailInput
        );

        return false;
    }

    if (!GMAIL_REGEX.test(email)) {

        showFieldError(
            emailError,
            "Please enter a valid Gmail address."
        );

        markFieldInvalid(
            emailInput
        );

        return false;
    }

    hideFieldError(
        emailError
    );

    markFieldValid(
        emailInput
    );

    return true;
}


/* =========================================================
   PHONE VALIDATION
========================================================= */

function validatePhone() {

    if (!phoneInput) {
        return false;
    }

    const phone =
        normalizePhone(
            phoneInput.value
        );

    phoneInput.value =
        phone;

    if (!phone) {

        showFieldError(
            phoneError,
            "Mobile number is required."
        );

        markFieldInvalid(
            phoneInput
        );

        return false;
    }

    if (!PHONE_REGEX.test(phone)) {

        showFieldError(
            phoneError,
            "Please enter a valid 10-digit Indian mobile number."
        );

        markFieldInvalid(
            phoneInput
        );

        return false;
    }

    hideFieldError(
        phoneError
    );

    markFieldValid(
        phoneInput
    );

    return true;
}


/* =========================================================
   PASSWORD VALIDATION
========================================================= */

function validatePassword() {

    if (!passwordInput) {
        return false;
    }

    const password =
        String(
            passwordInput.value || ""
        );

    if (!password) {

        showFieldError(
            passwordError,
            "Password is required."
        );

        markFieldInvalid(
            passwordInput
        );

        return false;
    }

    if (
        password.length <
        MIN_PASSWORD_LENGTH
    ) {

        showFieldError(
            passwordError,
            `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`
        );

        markFieldInvalid(
            passwordInput
        );

        return false;
    }

    if (
        password.length >
        MAX_PASSWORD_LENGTH
    ) {

        showFieldError(
            passwordError,
            `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`
        );

        markFieldInvalid(
            passwordInput
        );

        return false;
    }

    if (
        !PASSWORD_UPPERCASE_REGEX.test(
            password
        )
    ) {

        showFieldError(
            passwordError,
            "Password must contain at least one uppercase letter."
        );

        markFieldInvalid(
            passwordInput
        );

        return false;
    }

    if (
        !PASSWORD_LOWERCASE_REGEX.test(
            password
        )
    ) {

        showFieldError(
            passwordError,
            "Password must contain at least one lowercase letter."
        );

        markFieldInvalid(
            passwordInput
        );

        return false;
    }

    if (
        !PASSWORD_NUMBER_REGEX.test(
            password
        )
    ) {

        showFieldError(
            passwordError,
            "Password must contain at least one number."
        );

        markFieldInvalid(
            passwordInput
        );

        return false;
    }

    if (
        !PASSWORD_SPECIAL_REGEX.test(
            password
        )
    ) {

        showFieldError(
            passwordError,
            "Password must contain at least one special character."
        );

        markFieldInvalid(
            passwordInput
        );

        return false;
    }

    hideFieldError(
        passwordError
    );

    markFieldValid(
        passwordInput
    );

    return true;
}


/* =========================================================
   COMPLETE LOGIN FORM VALIDATION
========================================================= */

function validateLoginForm() {

    hideLoginError();

    const emailValid =
        validateEmail();

    const phoneValid =
        validatePhone();

    const passwordValid =
        validatePassword();

    return (
        emailValid &&
        phoneValid &&
        passwordValid
    );
}


/* =========================================================
   LOGIN LOADING STATE
========================================================= */

function setLoginLoading(
    isLoading
) {

    if (loginButton) {

        loginButton.disabled =
            Boolean(isLoading);

        loginButton.setAttribute(
            "aria-busy",
            String(
                Boolean(isLoading)
            )
        );
    }

    if (loginButtonText) {

        loginButtonText.textContent =
            isLoading
                ? "Signing in..."
                : "Login";
    }

    if (loginLoader) {

        if (isLoading) {

            loginLoader.removeAttribute(
                "hidden"
            );

            loginLoader.style.display =
                "inline-block";

        } else {

            loginLoader.setAttribute(
                "hidden",
                "hidden"
            );

            loginLoader.style.display =
                "none";
        }
    }
}


/* =========================================================
   PASSWORD VISIBILITY TOGGLE
========================================================= */

function initializePasswordToggle() {

    if (
        !passwordToggle ||
        !passwordInput
    ) {
        return;
    }

    passwordToggle.addEventListener(
        "click",
        function () {

            const currentlyPassword =
                passwordInput.type ===
                "password";

            if (currentlyPassword) {

                passwordInput.type =
                    "text";

                passwordToggle.setAttribute(
                    "aria-label",
                    "Hide password"
                );

                passwordToggle.setAttribute(
                    "title",
                    "Hide password"
                );

            } else {

                passwordInput.type =
                    "password";

                passwordToggle.setAttribute(
                    "aria-label",
                    "Show password"
                );

                passwordToggle.setAttribute(
                    "title",
                    "Show password"
                );
            }
        }
    );
}


/* =========================================================
   PHONE INPUT
========================================================= */

function initializePhoneInput() {

    if (!phoneInput) {
        return;
    }

    phoneInput.addEventListener(
        "input",
        function () {

            let value =
                String(
                    phoneInput.value || ""
                );

            value =
                value.replace(
                    /\D/g,
                    ""
                );

            value =
                value.slice(
                    0,
                    10
                );

            phoneInput.value =
                value;
        }
    );


    phoneInput.addEventListener(
        "paste",
        function () {

            setTimeout(
                function () {

                    let value =
                        String(
                            phoneInput.value || ""
                        );

                    value =
                        value.replace(
                            /\D/g,
                            ""
                        );

                    value =
                        value.slice(
                            0,
                            10
                        );

                    phoneInput.value =
                        value;

                },
                0
            );
        }
    );
}


/* =========================================================
   EMAIL INPUT
========================================================= */

function initializeEmailInput() {

    if (!emailInput) {
        return;
    }

    emailInput.addEventListener(
        "blur",
        function () {

            emailInput.value =
                normalizeEmail(
                    emailInput.value
                );
        }
    );
}


/* =========================================================
   LIVE VALIDATION
========================================================= */

function initializeLiveValidation() {

    if (emailInput) {

        emailInput.addEventListener(
            "input",
            function () {

                hideLoginError();

                if (
                    emailInput.value.trim()
                ) {

                    validateEmail();
                }
            }
        );
    }


    if (phoneInput) {

        phoneInput.addEventListener(
            "input",
            function () {

                hideLoginError();

                if (
                    phoneInput.value.trim()
                ) {

                    validatePhone();
                }
            }
        );
    }


    if (passwordInput) {

        passwordInput.addEventListener(
            "input",
            function () {

                hideLoginError();

                if (
                    passwordInput.value
                ) {

                    validatePassword();
                }
            }
        );
    }
}


/* =========================================================
   SESSION CLEANUP
========================================================= */

async function clearAuthenticatedSession() {

    try {

        const client =
            getSupabaseClient();

        await client.auth.signOut();

    } catch (error) {

        console.error(
            "Unable to clear authenticated session:",
            error
        );
    }
}


/* =========================================================
   VERIFY ADMIN ACCOUNT
========================================================= */

/*
   This is the main authorization check.

   Authentication:
       Supabase Auth

   Authorization:
       public.profiles

   Required:

       profiles.id === auth.users.id
       profiles.role === "admin"
       profiles.status === "active"
       profiles.email === login email
       profiles.phone === login phone
*/

async function verifyAdminAccount(
    userId,
    email,
    phone
) {

    try {

        const client =
            getSupabaseClient();


        /* =====================================================
           AUTH USER UUID MUST EXIST
        ===================================================== */

        if (!userId) {

            return {
                success: false,
                message:
                    "Authenticated user ID was not found."
            };
        }


        /* =====================================================
           LOAD PROFILE
        ===================================================== */

        const {
            data,
            error
        } =
            await client
                .from("profiles")
                .select(
                    "id, email, phone, role, status, full_name"
                )
                .eq(
                    "id",
                    userId
                )
                .maybeSingle();


        if (error) {

            console.error(
                "Admin profile query error:",
                error
            );

            return {
                success: false,
                message:
                    "Unable to verify the administrator profile."
            };
        }


        /* =====================================================
           PROFILE MUST EXIST
        ===================================================== */

        if (!data) {

            return {
                success: false,
                message:
                    "Admin profile not found."
            };
        }


        /* =====================================================
           UUID MATCH
        ===================================================== */

        if (
            String(data.id) !==
            String(userId)
        ) {

            console.error(
                "Profile UUID mismatch.",
                {
                    authUserId:
                        userId,

                    profileId:
                        data.id
                }
            );

            return {
                success: false,
                message:
                    "Administrator profile verification failed."
            };
        }


        /* =====================================================
           ROLE CHECK
        ===================================================== */

        if (
            String(
                data.role || ""
            ).toLowerCase() !==
            "admin"
        ) {

            return {
                success: false,
                message:
                    "This account is not authorized for the Admin Portal."
            };
        }


        /* =====================================================
           STATUS CHECK
        ===================================================== */

        if (
            String(
                data.status || ""
            ).toLowerCase() !==
            "active"
        ) {

            return {
                success: false,
                message:
                    "This administrator account is not active."
            };
        }


        /* =====================================================
           PHONE CHECK
        ===================================================== */

        if (
            normalizePhone(
                data.phone
            ) !==
            normalizePhone(
                phone
            )
        ) {

            return {
                success: false,
                message:
                    "The mobile number does not match the administrator account."
            };
        }


        /* =====================================================
           EMAIL CHECK
        ===================================================== */

        if (
            normalizeEmail(
                data.email
            ) !==
            normalizeEmail(
                email
            )
        ) {

            return {
                success: false,
                message:
                    "The email address does not match the administrator account."
            };
        }


        /* =====================================================
           UPDATE LAST LOGIN
        ===================================================== */

        try {

            const {
                error:
                    updateError
            } =
                await client
                    .from("profiles")
                    .update({
                        last_login_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        userId
                    );


            if (updateError) {

                /*
                   Login itself should not fail only because
                   the informational last_login_at update failed.
                */

                console.warn(
                    "Unable to update last_login_at:",
                    updateError
                );
            }

        } catch (
            updateException
        ) {

            console.warn(
                "Last login update failed:",
                updateException
            );
        }


        /* =====================================================
           ADMIN VERIFIED
        ===================================================== */

        return {
            success: true,
            profile: data
        };

    } catch (error) {

        console.error(
            "Admin verification exception:",
            error
        );

        return {
            success: false,
            message:
                "Unable to verify administrator account."
        };
    }
}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

async function handleForgotPassword(
    event
) {

    if (event) {
        event.preventDefault();
    }

    hideLoginError();


    if (!emailInput) {

        showLoginError(
            "Please enter your Gmail address first."
        );

        return;
    }


    const email =
        normalizeEmail(
            emailInput.value
        );


    if (
        !email ||
        !GMAIL_REGEX.test(email)
    ) {

        showFieldError(
            emailError,
            "Enter your valid Gmail address first."
        );

        markFieldInvalid(
            emailInput
        );

        showLoginError(
            "Please enter your valid Gmail address first."
        );

        return;
    }


    try {

        const client =
            getSupabaseClient();


        /*
           Supabase will send the password
           recovery email.

           The user will be returned to
           forgot-password.html.
        */

        const redirectUrl =
            new URL(
                "forgot-password.html",
                window.location.href
            ).href;


        const {
            error
        } =
            await client
                .auth
                .resetPasswordForEmail(
                    email,
                    {
                        redirectTo:
                            redirectUrl
                    }
                );


        if (error) {

            console.error(
                "Password reset error:",
                error
            );


            const message =
                String(
                    error.message || ""
                ).toLowerCase();


            if (
                message.includes(
                    "rate limit"
                )
            ) {

                showLoginError(
                    "Too many password reset requests. Please wait and try again later."
                );

            } else {

                showLoginError(
                    "Unable to send the password reset email. Please try again."
                );
            }

            return;
        }


        /*
           Deliberately generic message.
           This avoids revealing whether a particular
           email address has an account.
        */

        showLoginError(
            "If an account exists for this email, a password reset email has been sent."
        );

    } catch (error) {

        console.error(
            "Password reset exception:",
            error
        );

        showLoginError(
            "Unable to process the password reset request. Please try again."
        );
    }
}


/* =========================================================
   LOGIN SUBMISSION
========================================================= */

async function handleLoginSubmit(
    event
) {

    event.preventDefault();

    hideLoginError();


    /* =====================================================
       CLIENT-SIDE VALIDATION
    ===================================================== */

    if (
        !validateLoginForm()
    ) {

        return;
    }


    /* =====================================================
       NORMALIZE LOGIN VALUES
    ===================================================== */

    const email =
        normalizeEmail(
            emailInput.value
        );

    const phone =
        normalizePhone(
            phoneInput.value
        );


    /*
       Password exists only in memory.

       It is NOT:

       - stored in localStorage
       - stored in profiles
       - hard-coded in JS
       - sent to our own database

       It is sent only to Supabase Auth.
    */

    const enteredPassword =
        passwordInput.value;


    setLoginLoading(
        true
    );


    try {

        const client =
            getSupabaseClient();


        /* =================================================
           SUPABASE AUTHENTICATION
        ================================================= */

        const {
            data: authData,
            error: authError
        } =
            await client
                .auth
                .signInWithPassword({
                    email:
                        email,

                    password:
                        enteredPassword
                });


        /* =================================================
           AUTHENTICATION FAILURE
        ================================================= */

        if (authError) {

            console.error(
                "Supabase Auth error:",
                authError
            );


            const message =
                String(
                    authError.message || ""
                ).toLowerCase();


            if (
                message.includes(
                    "email not confirmed"
                )
            ) {

                showLoginError(
                    "Your email address is not confirmed. Please confirm your email and try again."
                );

            } else if (
                message.includes(
                    "invalid login credentials"
                )
            ) {

                showLoginError(
                    "Invalid email or password. Please check your login details and try again."
                );

            } else {

                showLoginError(
                    "Unable to sign in. Please try again."
                );
            }


            setLoginLoading(
                false
            );

            return;
        }


        /* =================================================
           AUTH USER MUST EXIST
        ================================================= */

        if (
            !authData ||
            !authData.user
        ) {

            await clearAuthenticatedSession();


            showLoginError(
                "Unable to identify the authenticated account."
            );


            setLoginLoading(
                false
            );

            return;
        }


        /* =================================================
           DYNAMIC AUTH USER UUID
        ================================================= */

        const userId =
            authData.user.id;


        /*
           IMPORTANT:

           Never hard-code a UUID.

           auth.users.id is obtained directly
           from Supabase Auth.

           Then profiles.id is checked against it.
        */


        /* =================================================
           VERIFY ADMIN PROFILE
        ================================================= */

        const profile =
            await verifyAdminAccount(
                userId,
                email,
                phone
            );


        /* =================================================
           ADMIN PROFILE FAILED
        ================================================= */

        if (
            !profile ||
            !profile.success
        ) {

            /*
               The Auth credentials may be valid,
               but the account is not authorized
               for the Admin Portal.

               Therefore immediately destroy
               the authenticated session.
            */

            await clearAuthenticatedSession();


            showLoginError(
                profile &&
                profile.message
                    ? profile.message
                    : "This account is not authorized for the Admin Portal."
            );


            setLoginLoading(
                false
            );

            return;
        }


        /* =================================================
           FINAL UUID SAFETY CHECK
        ================================================= */

        if (
            String(
                profile.profile.id
            ) !==
            String(userId)
        ) {

            console.error(
                "Final UUID verification failed."
            );


            await clearAuthenticatedSession();


            showLoginError(
                "Administrator account verification failed."
            );


            setLoginLoading(
                false
            );

            return;
        }


        /* =================================================
           FINAL ROLE SAFETY CHECK
        ================================================= */

        if (
            String(
                profile.profile.role || ""
            ).toLowerCase() !==
            "admin"
        ) {

            await clearAuthenticatedSession();


            showLoginError(
                "This account is not authorized for the Admin Portal."
            );


            setLoginLoading(
                false
            );

            return;
        }


        /* =================================================
           FINAL STATUS SAFETY CHECK
        ================================================= */

        if (
            String(
                profile.profile.status || ""
            ).toLowerCase() !==
            "active"
        ) {

            await clearAuthenticatedSession();


            showLoginError(
                "This administrator account is not active."
            );


            setLoginLoading(
                false
            );

            return;
        }


        /* =================================================
           ADMIN LOGIN SUCCESS
        ================================================= */

        console.log(
            "Admin authentication successful."
        );


        /*
           Do not store admin authentication
           information in localStorage.

           Supabase Auth maintains the session.
        */


        /* =================================================
           REDIRECT
        ================================================= */

        window.location.href =
            DASHBOARD_URL;

    } catch (error) {

        console.error(
            "Admin login exception:",
            error
        );


        showLoginError(
            "Unable to sign in. Please try again."
        );


        setLoginLoading(
            false
        );
    }
}


/* =========================================================
   AUTH STATE LISTENER
========================================================= */

/*
   IMPORTANT:

   This listener does NOT perform automatic
   dashboard redirection.

   Login submission itself performs the
   complete Admin verification.

   The Dashboard will later perform its own
   session protection.
*/

function initializeAuthListener() {

    try {

        const client =
            getSupabaseClient();


        client.auth.onAuthStateChange(
            async (
                event,
                session
            ) => {

                console.log(
                    "Auth state changed:",
                    event
                );


                if (
                    event ===
                    "SIGNED_IN" &&
                    session &&
                    session.user
                ) {

                    /*
                       The login form already performed:

                       1. Supabase Auth
                       2. profiles lookup
                       3. UUID verification
                       4. role verification
                       5. status verification
                       6. email verification
                       7. phone verification

                       Therefore do not redirect again here.
                    */

                    return;
                }


                if (
                    event ===
                    "SIGNED_OUT"
                ) {

                    console.log(
                        "Admin signed out."
                    );
                }
            }
        );

    } catch (error) {

        console.warn(
            "Unable to initialize auth listener:",
            error
        );
    }
}


/* =========================================================
   PREVENT MULTIPLE SUBMISSIONS
========================================================= */

let loginSubmissionInProgress =
    false;


async function guardedLoginSubmit(
    event
) {

    if (
        loginSubmissionInProgress
    ) {

        event.preventDefault();

        return;
    }


    loginSubmissionInProgress =
        true;


    try {

        await handleLoginSubmit(
            event
        );

    } finally {

        loginSubmissionInProgress =
            false;
    }
}


/* =========================================================
   ENTER KEY HANDLING
========================================================= */

function initializeKeyboardHandling() {

    if (!loginForm) {
        return;
    }


    loginForm.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Enter"
            ) {

                /*
                   Allow the normal form
                   submit event to execute.
                */

                return;
            }
        }
    );
}


/* =========================================================
   ACCESSIBILITY
========================================================= */

function initializeAccessibility() {

    if (emailInput) {

        emailInput.setAttribute(
            "autocomplete",
            "username"
        );
    }


    if (phoneInput) {

        phoneInput.setAttribute(
            "autocomplete",
            "tel"
        );

        phoneInput.setAttribute(
            "inputmode",
            "numeric"
        );
    }


    if (passwordInput) {

        passwordInput.setAttribute(
            "autocomplete",
            "current-password"
        );
    }
}


/* =========================================================
   INITIAL UI STATE
========================================================= */

function initializeUI() {

    hideLoginError();

    hideFieldError(
        emailError
    );

    hideFieldError(
        phoneError
    );

    hideFieldError(
        passwordError
    );

    setLoginLoading(
        false
    );
}


/* =========================================================
   LOGIN FORM INITIALIZATION
========================================================= */

function initializeLoginForm() {

    if (!loginForm) {

        console.error(
            "Admin login form #adminLoginForm was not found."
        );

        return;
    }


    loginForm.addEventListener(
        "submit",
        guardedLoginSubmit
    );
}


/* =========================================================
   FORGOT PASSWORD INITIALIZATION
========================================================= */

function initializeForgotPassword() {

    if (!forgotPassword) {
        return;
    }


    forgotPassword.addEventListener(
        "click",
        handleForgotPassword
    );
}


/* =========================================================
   ADMIN LOGIN PAGE INITIALIZATION
========================================================= */

function initializeAdminLoginPage() {

    console.log(
        "Initializing Sri Sadguru Admin Portal login..."
    );


    initializeUI();

    initializePasswordToggle();

    initializePhoneInput();

    initializeEmailInput();

    initializeLiveValidation();

    initializeKeyboardHandling();

    initializeAccessibility();

    initializeLoginForm();

    initializeForgotPassword();

    initializeAuthListener();


    /*
       IMPORTANT:

       There is intentionally NO:

           getSession()

       here.

       There is intentionally NO:

           redirectIfAuthenticated()

       here.

       The login page should remain the login page.

       The Admin Dashboard will be responsible for
       protecting itself from unauthenticated users.
    */


    console.log(
        "Admin login page initialized."
    );
}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            initializeAdminLoginPage();

        },
        {
            once: true
        }
    );

} else {

    initializeAdminLoginPage();
}


/* =========================================================
   GLOBAL ERROR HANDLING
========================================================= */

window.addEventListener(
    "error",
    function (event) {

        console.error(
            "Admin login page error:",
            event.error ||
            event.message
        );
    }
);


window.addEventListener(
    "unhandledrejection",
    function (event) {

        console.error(
            "Unhandled admin login promise rejection:",
            event.reason
        );
    }
);