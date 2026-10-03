"use strict";

/*
=========================================================
 SRI SADGURU PARCEL SERVICE
 ADMIN FORGOT PASSWORD
 SUPABASE AUTHENTICATION
=========================================================

FLOW:

1. Admin enters registered Gmail.
2. Supabase sends recovery email.
3. Admin opens recovery link.
4. Supabase creates recovery session.
5. Password screen appears.
6. Admin enters new password.
7. Supabase updates the password.
8. Admin returns to Admin Login.

IMPORTANT:
This file does NOT contain any password,
OTP, secret key, or service-role key.
=========================================================
*/


/* =====================================================
   CHECK SUPABASE CLIENT
===================================================== */

if (!window.supabaseClient) {

    console.error(
        "Supabase client was not loaded."
    );

    alert(
        "Unable to connect to the authentication service. Please try again."
    );

    throw new Error(
        "Supabase client is unavailable."
    );

}


/* =====================================================
   SUPABASE CLIENT
===================================================== */

const supabaseClient =
    window.supabaseClient;



/* =====================================================
   GET ELEMENTS
===================================================== */

const detailsStep =
    document.getElementById("detailsStep");


const passwordStep =
    document.getElementById("passwordStep");


const successStep =
    document.getElementById("successStep");


const detailsForm =
    document.getElementById("detailsForm");


const email =
    document.getElementById("email");


const newPassword =
    document.getElementById("newPassword");


const confirmPassword =
    document.getElementById("confirmPassword");


const sendButton =
    document.getElementById("sendButton");


const resetButton =
    document.getElementById("resetButton");


const message =
    document.getElementById("message");


const messageText =
    document.getElementById("messageText");



/* =====================================================
   PAGE STATE
===================================================== */

let recoverySessionReady = false;



/* =====================================================
   PASSWORD RULE ELEMENTS
===================================================== */

const lengthRule =
    document.getElementById("lengthRule");


const numberRule =
    document.getElementById("numberRule");


const letterRule =
    document.getElementById("letterRule");


const specialCharRule =
    document.getElementById("specialCharRule");



/* =====================================================
   INITIAL PAGE STATE
===================================================== */

function showEmailStep() {

    if (detailsStep) {

        detailsStep.style.display =
            "block";

    }


    if (passwordStep) {

        passwordStep.style.display =
            "none";

    }


    if (successStep) {

        successStep.style.display =
            "none";

    }

}


function showPasswordStep() {

    if (detailsStep) {

        detailsStep.style.display =
            "none";

    }


    if (passwordStep) {

        passwordStep.style.display =
            "block";

    }


    if (successStep) {

        successStep.style.display =
            "none";

    }

}


function showSuccessStep() {

    if (detailsStep) {

        detailsStep.style.display =
            "none";

    }


    if (passwordStep) {

        passwordStep.style.display =
            "none";

    }


    if (successStep) {

        successStep.style.display =
            "block";

    }

}



/* =====================================================
   MESSAGE FUNCTION
===================================================== */

function showMessage(text) {

    if (!message || !messageText) {
        return;
    }


    messageText.textContent =
        text;


    message.classList.add(
        "show"
    );

}


function hideMessage() {

    if (!message) {
        return;
    }


    message.classList.remove(
        "show"
    );

}



/* =====================================================
   EMAIL VALIDATION
===================================================== */

function isValidGmail(emailAddress) {

    const gmailPattern =
        /^[a-zA-Z0-9._%+-]+@gmail\.com$/;


    return gmailPattern.test(
        emailAddress
    );

}



/* =====================================================
   GET RECOVERY REDIRECT URL
===================================================== */

function getRecoveryRedirectUrl() {

    /*
    The recovery email must return to this exact page.

    Example:

    https://your-domain.com/admin/forgot-password.html
    */


    if (
        window.location.protocol !== "http:" &&
        window.location.protocol !== "https:"
    ) {

        return null;

    }


    return (
        window.location.origin +
        window.location.pathname
    );

}



/* =====================================================
   SEND RECOVERY EMAIL
===================================================== */

detailsForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        hideMessage();


        const emailAddress =
            email.value.trim()
                .toLowerCase();



        /* ---------------------------------------------
           VALIDATE EMAIL
        --------------------------------------------- */

        if (!emailAddress) {

            showMessage(
                "Please enter your registered Gmail address."
            );

            email.focus();

            return;

        }



        if (!isValidGmail(emailAddress)) {

            showMessage(
                "Please enter a valid Gmail address."
            );

            email.focus();

            return;

        }



        /* ---------------------------------------------
           CHECK WEBSITE URL
        --------------------------------------------- */

        const redirectUrl =
            getRecoveryRedirectUrl();


        if (!redirectUrl) {

            showMessage(
                "Password recovery requires the website to be opened through a web address such as HTTPS. Do not open this page directly as a file."
            );

            return;

        }



        /* ---------------------------------------------
           LOADING
        --------------------------------------------- */

        sendButton.disabled =
            true;


        sendButton.textContent =
            "SENDING...";



        try {

            /* -----------------------------------------
               SUPABASE PASSWORD RECOVERY
            ----------------------------------------- */

            const {
                data,
                error
            } =
                await supabaseClient.auth
                    .resetPasswordForEmail(
                        emailAddress,
                        {
                            redirectTo:
                                redirectUrl
                        }
                    );



            /* -----------------------------------------
               ERROR
            ----------------------------------------- */

            if (error) {

                console.error(
                    "Password recovery error:",
                    error
                );


                showMessage(
                    getFriendlySupabaseError(
                        error
                    )
                );


                return;

            }



            /* -----------------------------------------
               SUCCESS
            ----------------------------------------- */

            showMessage(
                "If this Gmail address belongs to the Admin account, a password recovery email has been sent. Please check your Gmail inbox and Spam folder."
            );



            sendButton.textContent =
                "EMAIL SENT";


        }

        catch (error) {

            console.error(
                "Unexpected password recovery error:",
                error
            );


            showMessage(
                "Unable to send the recovery email. Please check your internet connection and try again."
            );

        }

        finally {

            if (
                sendButton.textContent !==
                "EMAIL SENT"
            ) {

                sendButton.disabled =
                    false;


                sendButton.textContent =
                    "SEND RECOVERY EMAIL";

            }

        }

    }
);



/* =====================================================
   PASSWORD RECOVERY EVENT
===================================================== */

supabaseClient.auth.onAuthStateChange(
    async function (
        event,
        session
    ) {

        console.log(
            "Supabase Auth Event:",
            event
        );



        if (
            event ===
            "PASSWORD_RECOVERY"
        ) {

            if (!session) {

                showMessage(
                    "The recovery session could not be established. Please request a new recovery email."
                );

                return;

            }


            recoverySessionReady =
                true;


            hideMessage();


            showPasswordStep();

        }

    }
);



/* =====================================================
   CHECK EXISTING RECOVERY SESSION
===================================================== */

async function checkRecoverySession() {

    try {

        /*
        Supabase JS automatically processes the
        recovery link when the page is opened.
        */


        const {
            data,
            error
        } =
            await supabaseClient.auth
                .getSession();


        if (error) {

            console.error(
                "Session check error:",
                error
            );

            return;

        }



        if (data && data.session) {

            /*
            We only show the password screen
            automatically when the URL indicates
            a recovery flow.
            */

            const hash =
                window.location.hash;


            const search =
                window.location.search;


            const isRecoveryUrl =
                hash.includes(
                    "access_token="
                ) ||
                hash.includes(
                    "type=recovery"
                ) ||
                search.includes(
                    "code="
                );


            if (isRecoveryUrl) {

                recoverySessionReady =
                    true;


                showPasswordStep();

            }

        }

    }

    catch (error) {

        console.error(
            "Recovery session check failed:",
            error
        );

    }

}



/* =====================================================
   PASSWORD VALIDATION
===================================================== */

function validatePassword(
    password
) {

    const hasLength =
        password.length >= 12;


    const hasNumber =
        /[0-9]/.test(
            password
        );


    const hasUppercase =
        /[A-Z]/.test(
            password
        );


    const hasLowercase =
        /[a-z]/.test(
            password
        );


    const hasLetter =
        hasUppercase &&
        hasLowercase;


    const hasSpecialChar =
        /[!@#$%^&*(),.?":{}|<>_\-+\[\]\\/'`;~]/.test(
            password
        );



    /* ---------------------------------------------
       UPDATE RULE DISPLAY
    --------------------------------------------- */

    if (lengthRule) {

        lengthRule.style.color =
            hasLength
                ? "#35a36b"
                : "#777";

    }


    if (numberRule) {

        numberRule.style.color =
            hasNumber
                ? "#35a36b"
                : "#777";

    }


    if (letterRule) {

        letterRule.style.color =
            hasLetter
                ? "#35a36b"
                : "#777";

    }


    if (specialCharRule) {

        specialCharRule.style.color =
            hasSpecialChar
                ? "#35a36b"
                : "#777";

    }



    return (
        hasLength &&
        hasNumber &&
        hasLetter &&
        hasSpecialChar
    );

}



/* =====================================================
   LIVE PASSWORD CHECK
===================================================== */

if (newPassword) {

    newPassword.addEventListener(
        "input",
        function () {

            validatePassword(
                this.value
            );

        }
    );

}



/* =====================================================
   RESET PASSWORD
===================================================== */

resetButton.addEventListener(
    "click",
    async function () {

        hideMessage();


        const password =
            newPassword.value;


        const confirm =
            confirmPassword.value;



        /* ---------------------------------------------
           CHECK RECOVERY SESSION
        --------------------------------------------- */

        if (!recoverySessionReady) {

            const {
                data
            } =
                await supabaseClient.auth
                    .getSession();


            if (
                !data ||
                !data.session
            ) {

                showMessage(
                    "Your recovery session is missing or has expired. Please request a new recovery email."
                );

                return;

            }


            recoverySessionReady =
                true;

        }



        /* ---------------------------------------------
           EMPTY CHECK
        --------------------------------------------- */

        if (
            password === "" ||
            confirm === ""
        ) {

            showMessage(
                "Please enter and confirm your new password."
            );

            return;

        }



        /* ---------------------------------------------
           PASSWORD RULES
        --------------------------------------------- */

        if (
            !validatePassword(
                password
            )
        ) {

            showMessage(
                "Password must contain at least 12 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character."
            );

            return;

        }



        /* ---------------------------------------------
           MATCH CHECK
        --------------------------------------------- */

        if (
            password !==
            confirm
        ) {

            showMessage(
                "New password and confirm password do not match."
            );

            return;

        }



        /* ---------------------------------------------
           LOADING
        --------------------------------------------- */

        resetButton.disabled =
            true;


        resetButton.textContent =
            "RESETTING...";



        try {

            /* -----------------------------------------
               REAL SUPABASE PASSWORD UPDATE
            ----------------------------------------- */

            const {
                data,
                error
            } =
                await supabaseClient.auth
                    .updateUser(
                        {
                            password:
                                password
                        }
                    );



            /* -----------------------------------------
               ERROR
            ----------------------------------------- */

            if (error) {

                console.error(
                    "Password update error:",
                    error
                );


                showMessage(
                    getFriendlySupabaseError(
                        error
                    )
                );


                return;

            }



            /* -----------------------------------------
               SUCCESS
            ----------------------------------------- */

            console.log(
                "Admin password updated successfully.",
                data
            );


            recoverySessionReady =
                false;


            showSuccessStep();


            /*
            Sign out the recovery session.

            This prevents the temporary recovery
            session from being used as a normal
            Admin session.
            */

            await supabaseClient.auth.signOut();

        }

        catch (error) {

            console.error(
                "Unexpected password update error:",
                error
            );


            showMessage(
                "Unable to change the password. Please request a new recovery email and try again."
            );

        }

        finally {

            resetButton.disabled =
                false;


            resetButton.textContent =
                "RESET PASSWORD";

        }

    }
);



/* =====================================================
   SHOW / HIDE PASSWORD
===================================================== */

const passwordButtons =
    document.querySelectorAll(
        ".show-password"
    );


passwordButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                const targetId =
                    this.getAttribute(
                        "data-target"
                    );


                const target =
                    document.getElementById(
                        targetId
                    );


                if (!target) {
                    return;
                }



                if (
                    target.type ===
                    "password"
                ) {

                    target.type =
                        "text";


                    this.textContent =
                        "🙈";


                    this.setAttribute(
                        "aria-label",
                        "Hide password"
                    );

                }

                else {

                    target.type =
                        "password";


                    this.textContent =
                        "👁";


                    this.setAttribute(
                        "aria-label",
                        "Show password"
                    );

                }

            }
        );

    }
);



/* =====================================================
   SUPABASE ERROR MESSAGE
===================================================== */

function getFriendlySupabaseError(
    error
) {

    if (!error) {

        return (
            "Something went wrong. Please try again."
        );

    }


    const message =
        String(
            error.message ||
            ""
        ).toLowerCase();



    if (
        message.includes(
            "redirect"
        )
    ) {

        return (
            "The password recovery redirect URL is not configured correctly in Supabase. Please check Authentication → URL Configuration."
        );

    }



    if (
        message.includes(
            "rate limit"
        )
    ) {

        return (
            "Too many recovery requests were made. Please wait and try again later."
        );

    }



    if (
        message.includes(
            "network"
        )
    ) {

        return (
            "Network error. Please check your internet connection and try again."
        );

    }



    if (
        message.includes(
            "expired"
        )
    ) {

        return (
            "This recovery link has expired. Please request a new password recovery email."
        );

    }



    if (
        message.includes(
            "session"
        )
    ) {

        return (
            "Your recovery session is invalid or expired. Please request a new recovery email."
        );

    }



    return (
        error.message ||
        "Unable to complete the password recovery request. Please try again."
    );

}



/* =====================================================
   START PAGE
===================================================== */

showEmailStep();


checkRecoverySession();