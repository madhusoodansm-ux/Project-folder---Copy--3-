"use strict";

/* =========================================================
   SSP CUSTOMER
   AUTH-8
   FORGOT PASSWORD + OTP + PASSWORD RESET
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const emailMethod =
    document.getElementById("emailMethod");

const phoneMethod =
    document.getElementById("phoneMethod");

const emailRecovery =
    document.getElementById("emailRecovery");

const phoneRecovery =
    document.getElementById("phoneRecovery");

const emailInput =
    document.getElementById("email");

const phoneInput =
    document.getElementById("phone");

const sendOtpButton =
    document.getElementById("sendOtpButton");

const message =
    document.getElementById("message");

const otpSection =
    document.getElementById("otpSection");

const otpInput =
    document.getElementById("otp");

const otpMessage =
    document.getElementById("otpMessage");

const verifyOtpButton =
    document.getElementById("verifyOtpButton");

const resendOtpButton =
    document.getElementById("resendOtpButton");

const passwordSection =
    document.getElementById("passwordSection");

const newPassword =
    document.getElementById("newPassword");

const confirmPassword =
    document.getElementById("confirmPassword");

const resetPasswordButton =
    document.getElementById("resetPasswordButton");

const successSection =
    document.getElementById("successSection");

const loginButton =
    document.getElementById("loginButton");

const newPasswordToggle =
    document.getElementById("showNewPassword");

const confirmPasswordToggle =
    document.getElementById("showConfirmPassword");


/* =========================================================
   ERRORS
========================================================= */

const recoveryValueError =
    document.getElementById("recoveryValueError");

const otpError =
    document.getElementById("otpError");

const newPasswordError =
    document.getElementById("newPasswordError");

const confirmPasswordError =
    document.getElementById("confirmPasswordError");


/* =========================================================
   STATE
========================================================= */

let recoveryType = null;

let recoveryValue = "";

let otpSent = false;

let otpVerified = false;

let resendTimer = null;

let resendSeconds = 30;


/* =========================================================
   SUPABASE
========================================================= */

function getSupabase() {

    if (!window.supabaseClient) {

        console.error(
            "SSP Auth-8: Supabase client is not available."
        );

        showMessage(
            "Unable to connect to the authentication service.",
            "error"
        );

        return null;
    }

    return window.supabaseClient;
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    text,
    type = "info"
) {

    if (!message) {
        return;
    }

    message.textContent = text;

    message.className =
        "message show " + type;
}


function clearMessage() {

    if (!message) {
        return;
    }

    message.textContent = "";

    message.className =
        "message";
}


/* =========================================================
   ERROR
========================================================= */

function showError(
    element,
    text
) {

    if (!element) {
        return;
    }

    element.textContent =
        text;
}


function clearError(
    element
) {

    if (!element) {
        return;
    }

    element.textContent = "";
}


/* =========================================================
   EMAIL / PHONE METHOD
========================================================= */

function updateRecoveryMethod() {

    clearMessage();

    clearError(
        recoveryValueError
    );

    if (emailMethod?.checked) {

        recoveryType = "email";

        emailRecovery.hidden = false;

        phoneRecovery.hidden = true;

        if (phoneInput) {
            phoneInput.value = "";
        }

        return;
    }


    if (phoneMethod?.checked) {

        recoveryType = "phone";

        emailRecovery.hidden = true;

        phoneRecovery.hidden = false;

        if (emailInput) {
            emailInput.value = "";
        }

        return;
    }


    recoveryType = null;

    emailRecovery.hidden = true;

    phoneRecovery.hidden = true;
}


if (emailMethod) {

    emailMethod.addEventListener(
        "change",
        updateRecoveryMethod
    );
}


if (phoneMethod) {

    phoneMethod.addEventListener(
        "change",
        updateRecoveryMethod
    );
}


/* =========================================================
   PHONE INPUT
========================================================= */

if (phoneInput) {

    phoneInput.addEventListener(
        "input",
        function () {

            this.value =
                this.value.replace(
                    /[^0-9]/g,
                    ""
                );

            clearError(
                recoveryValueError
            );

        }
    );
}


/* =========================================================
   EMAIL INPUT
========================================================= */

if (emailInput) {

    emailInput.addEventListener(
        "input",
        function () {

            this.value =
                this.value.trim();

            clearError(
                recoveryValueError
            );

        }
    );
}


/* =========================================================
   GET RECOVERY VALUE
========================================================= */

function getRecoveryValue() {

    if (recoveryType === "email") {

        return (
            emailInput?.value
                .trim()
                .toLowerCase() || ""
        );
    }


    if (recoveryType === "phone") {

        return (
            phoneInput?.value
                .replace(
                    /[^0-9]/g,
                    ""
                ) || ""
        );
    }


    return "";
}


/* =========================================================
   VALIDATE RECOVERY
========================================================= */

function validateRecovery() {

    if (!recoveryType) {

        showError(
            recoveryValueError,
            "Please select Email or Mobile Number."
        );

        return false;
    }


    const value =
        getRecoveryValue();


    if (recoveryType === "email") {

        const gmailPattern =
            /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

        if (
            !gmailPattern.test(value)
        ) {

            showError(
                recoveryValueError,
                "Please enter a valid Gmail address."
            );

            return false;
        }
    }


    if (recoveryType === "phone") {

        const phonePattern =
            /^[6-9][0-9]{9}$/;

        if (
            !phonePattern.test(value)
        ) {

            showError(
                recoveryValueError,
                "Please enter a valid 10-digit mobile number."
            );

            return false;
        }
    }


    clearError(
        recoveryValueError
    );

    recoveryValue =
        value;

    return true;
}


/* =========================================================
   SEND OTP
========================================================= */

if (sendOtpButton) {

    sendOtpButton.addEventListener(
        "click",
        async function () {

            clearMessage();

            clearError(
                recoveryValueError
            );


            if (!validateRecovery()) {
                return;
            }


            const supabase =
                getSupabase();

            if (!supabase) {
                return;
            }


            sendOtpButton.disabled =
                true;

            sendOtpButton.textContent =
                "SENDING OTP...";


            try {

                /* =========================================
                   EMAIL OTP
                ========================================= */

                if (
                    recoveryType ===
                    "email"
                ) {

                    const {
                        error
                    } =
                        await supabase.auth
                            .signInWithOtp({
                                email:
                                    recoveryValue,

                                options: {
                                    shouldCreateUser:
                                        false
                                }
                            });


                    if (error) {
                        throw error;
                    }


                    otpSent = true;

                    otpVerified = false;


                    if (otpSection) {
                        otpSection.hidden = false;
                    }


                    if (passwordSection) {
                        passwordSection.hidden = true;
                    }


                    if (otpMessage) {

                        otpMessage.textContent =
                            "Enter the OTP sent to your registered Gmail address.";
                    }


                    showMessage(
                        "OTP sent to your registered Gmail address.",
                        "success"
                    );


                    startResendTimer();

                    return;
                }


                /* =========================================
                   PHONE SMS OTP
                ========================================= */

                if (
                    recoveryType ===
                    "phone"
                ) {

                    const phone =
                        "+91" +
                        recoveryValue;


                    const {
                        error
                    } =
                        await supabase.auth
                            .signInWithOtp({
                                phone:
                                    phone,

                                options: {
                                    shouldCreateUser:
                                        false
                                }
                            });


                    if (error) {
                        throw error;
                    }


                    otpSent = true;

                    otpVerified = false;


                    if (otpSection) {
                        otpSection.hidden = false;
                    }


                    if (passwordSection) {
                        passwordSection.hidden = true;
                    }


                    if (otpMessage) {

                        otpMessage.textContent =
                            "Enter the OTP sent to your registered mobile number.";
                    }


                    showMessage(
                        "OTP sent to your registered mobile number.",
                        "success"
                    );


                    startResendTimer();
                }

            } catch (error) {

                console.error(
                    "SSP Auth-8 Send OTP Error:",
                    error
                );


                showMessage(
                    getRecoveryErrorMessage(
                        error
                    ),
                    "error"
                );

            } finally {

                sendOtpButton.disabled =
                    false;

                sendOtpButton.textContent =
                    "Send OTP";
            }

        }
    );
}


/* =========================================================
   OTP INPUT
========================================================= */

if (otpInput) {

    otpInput.addEventListener(
        "input",
        function () {

            this.value =
                this.value.replace(
                    /[^0-9]/g,
                    ""
                );

            clearError(
                otpError
            );
        }
    );
}


/* =========================================================
   VERIFY OTP
========================================================= */

if (verifyOtpButton) {

    verifyOtpButton.addEventListener(
        "click",
        async function () {

            clearMessage();

            clearError(
                otpError
            );


            if (!otpSent) {

                showError(
                    otpError,
                    "Please request an OTP first."
                );

                return;
            }


            const enteredOTP =
                otpInput?.value.trim() || "";


            if (
                !/^[0-9]{6}$/.test(
                    enteredOTP
                )
            ) {

                showError(
                    otpError,
                    "Please enter the 6-digit OTP."
                );

                return;
            }


            const supabase =
                getSupabase();

            if (!supabase) {
                return;
            }


            verifyOtpButton.disabled =
                true;

            verifyOtpButton.textContent =
                "VERIFYING...";


            try {

                let verifyResult;


                /* =========================================
                   EMAIL OTP
                ========================================= */

                if (
                    recoveryType ===
                    "email"
                ) {

                    verifyResult =
                        await supabase.auth
                            .verifyOtp({
                                email:
                                    recoveryValue,

                                token:
                                    enteredOTP,

                                type:
                                    "email"
                            });
                }


                /* =========================================
                   PHONE OTP
                ========================================= */

                else {

                    verifyResult =
                        await supabase.auth
                            .verifyOtp({
                                phone:
                                    "+91" +
                                    recoveryValue,

                                token:
                                    enteredOTP,

                                type:
                                    "sms"
                            });
                }


                if (
                    verifyResult.error
                ) {

                    throw verifyResult.error;
                }


                if (
                    !verifyResult.data ||
                    !verifyResult.data.session
                ) {

                    throw new Error(
                        "OTP verification did not create a recovery session."
                    );
                }


                otpVerified =
                    true;


                if (otpSection) {
                    otpSection.hidden = true;
                }


                if (passwordSection) {
                    passwordSection.hidden = false;
                }


                showMessage(
                    "OTP verified successfully. You can now create a new password.",
                    "success"
                );

            } catch (error) {

                console.error(
                    "SSP Auth-8 Verify OTP Error:",
                    error
                );


                showError(
                    otpError,
                    getOtpErrorMessage(
                        error
                    )
                );

            } finally {

                verifyOtpButton.disabled =
                    false;

                verifyOtpButton.textContent =
                    "Verify OTP";
            }
        }
    );
}


/* =========================================================
   RESEND OTP
========================================================= */

if (resendOtpButton) {

    resendOtpButton.addEventListener(
        "click",
        async function () {

            if (
                resendOtpButton.disabled
            ) {
                return;
            }


            if (!validateRecovery()) {
                return;
            }


            const supabase =
                getSupabase();

            if (!supabase) {
                return;
            }


            resendOtpButton.disabled =
                true;


            try {

                if (
                    recoveryType ===
                    "email"
                ) {

                    const {
                        error
                    } =
                        await supabase.auth
                            .signInWithOtp({
                                email:
                                    recoveryValue,

                                options: {
                                    shouldCreateUser:
                                        false
                                }
                            });


                    if (error) {
                        throw error;
                    }

                } else {

                    const {
                        error
                    } =
                        await supabase.auth
                            .signInWithOtp({
                                phone:
                                    "+91" +
                                    recoveryValue,

                                options: {
                                    shouldCreateUser:
                                        false
                                }
                            });


                    if (error) {
                        throw error;
                    }
                }


                if (otpInput) {
                    otpInput.value = "";
                }


                otpSent = true;

                otpVerified = false;


                showMessage(
                    "A new OTP has been sent.",
                    "success"
                );


                startResendTimer();

            } catch (error) {

                console.error(
                    "SSP Auth-8 Resend OTP Error:",
                    error
                );


                showMessage(
                    getRecoveryErrorMessage(
                        error
                    ),
                    "error"
                );


                resendOtpButton.disabled =
                    false;
            }

        }
    );
}


/* =========================================================
   RESEND TIMER
========================================================= */

function startResendTimer() {

    resendSeconds =
        30;


    if (resendTimer) {

        clearInterval(
            resendTimer
        );
    }


    if (!resendOtpButton) {
        return;
    }


    resendOtpButton.disabled =
        true;


    resendOtpButton.textContent =
        "Resend OTP (" +
        resendSeconds +
        "s)";


    resendTimer =
        setInterval(
            function () {

                resendSeconds--;


                resendOtpButton.textContent =
                    "Resend OTP (" +
                    resendSeconds +
                    "s)";


                if (
                    resendSeconds <= 0
                ) {

                    clearInterval(
                        resendTimer
                    );


                    resendOtpButton.disabled =
                        false;


                    resendOtpButton.textContent =
                        "Resend OTP";
                }

            },
            1000
        );
}


/* =========================================================
   PASSWORD RULE
========================================================= */

function validateNewPassword(
    password
) {

    if (
        password.length < 12
    ) {

        return {
            valid: false,
            message:
                "Password must contain at least 12 characters."
        };
    }


    if (
        !/[A-Z]/.test(password)
    ) {

        return {
            valid: false,
            message:
                "Password must contain at least one capital letter (A-Z)."
        };
    }


    if (
        !/[a-z]/.test(password)
    ) {

        return {
            valid: false,
            message:
                "Password must contain at least one small letter (a-z)."
        };
    }


    if (
        !/[0-9]/.test(password)
    ) {

        return {
            valid: false,
            message:
                "Password must contain at least one number (0-9)."
        };
    }


    if (
        !/[!@#$%^&*(),.?":{}|<>_\-+=;'/\\[\]`~]/.test(
            password
        )
    ) {

        return {
            valid: false,
            message:
                "Password must contain at least one special character."
        };
    }


    return {
        valid: true,
        message: ""
    };
}


/* =========================================================
   PASSWORD VALIDATION
========================================================= */

function validatePasswordFields() {

    const password =
        newPassword?.value || "";

    const confirm =
        confirmPassword?.value || "";


    const result =
        validateNewPassword(
            password
        );


    if (!result.valid) {

        showError(
            newPasswordError,
            result.message
        );

        return false;
    }


    clearError(
        newPasswordError
    );


    if (!confirm) {

        showError(
            confirmPasswordError,
            "Please confirm your new password."
        );

        return false;
    }


    if (
        password !== confirm
    ) {

        showError(
            confirmPasswordError,
            "Passwords do not match."
        );

        return false;
    }


    clearError(
        confirmPasswordError
    );

    return true;
}


/* =========================================================
   RESET PASSWORD
========================================================= */

if (resetPasswordButton) {

    resetPasswordButton.addEventListener(
        "click",
        async function () {

            clearMessage();


            if (!otpVerified) {

                showMessage(
                    "Please verify the OTP before resetting your password.",
                    "error"
                );

                return;
            }


            if (
                !validatePasswordFields()
            ) {

                showMessage(
                    "Please correct the password information.",
                    "error"
                );

                return;
            }


            const supabase =
                getSupabase();

            if (!supabase) {
                return;
            }


            resetPasswordButton.disabled =
                true;

            resetPasswordButton.textContent =
                "RESETTING...";


            try {

                const {
                    error
                } =
                    await supabase.auth
                        .updateUser({
                            password:
                                newPassword.value
                        });


                if (error) {
                    throw error;
                }


                /* =========================================
                   PASSWORD UPDATED SUCCESSFULLY
                ========================================= */

                otpVerified =
                    false;

                otpSent =
                    false;


                if (newPassword) {
                    newPassword.value = "";
                }


                if (confirmPassword) {
                    confirmPassword.value = "";
                }


                if (passwordSection) {
                    passwordSection.hidden = true;
                }


                if (successSection) {
                    successSection.hidden = false;
                }


                showMessage(
                    "Your password has been reset successfully.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "SSP Auth-8 Password Reset Error:",
                    error
                );


                showMessage(
                    getPasswordResetErrorMessage(
                        error
                    ),
                    "error"
                );

            } finally {

                resetPasswordButton.disabled =
                    false;

                resetPasswordButton.textContent =
                    "Reset Password";
            }
        }
    );
}


/* =========================================================
   PASSWORD SHOW / HIDE
========================================================= */

function setupPasswordToggle(
    button,
    input
) {

    if (
        !button ||
        !input
    ) {
        return;
    }


    button.addEventListener(
        "click",
        function () {

            if (
                input.type ===
                "password"
            ) {

                input.type =
                    "text";

                button.textContent =
                    "Hide";

            } else {

                input.type =
                    "password";

                button.textContent =
                    "Show";
            }
        }
    );
}


setupPasswordToggle(
    newPasswordToggle,
    newPassword
);


setupPasswordToggle(
    confirmPasswordToggle,
    confirmPassword
);


/* =========================================================
   LOGIN AFTER RESET
========================================================= */

if (loginButton) {

    loginButton.addEventListener(
        "click",
        async function () {

            const supabase =
                getSupabase();

            if (supabase) {

                try {

                    await supabase.auth
                        .signOut();

                } catch (error) {

                    console.error(
                        "SSP Auth-8 Recovery Logout Error:",
                        error
                    );
                }
            }


            window.location.replace(
                "../index.html"
            );
        }
    );
}


/* =========================================================
   ERROR TRANSLATION
========================================================= */

function getRecoveryErrorMessage(
    error
) {

    const text =
        error?.message?.toLowerCase() ||
        "";


    if (
        text.includes(
            "email provider is disabled"
        )
    ) {

        return "Email OTP is not enabled in Supabase Authentication.";
    }


    if (
        text.includes(
            "phone provider is disabled"
        )
    ) {

        return "Mobile OTP is not enabled in Supabase Authentication.";
    }


    if (
        text.includes(
            "sms provider"
        )
    ) {

        return "SMS service is not configured in Supabase.";
    }


    if (
        text.includes(
            "rate limit"
        ) ||
        text.includes(
            "too many requests"
        )
    ) {

        return "Too many OTP requests. Please wait and try again.";
    }


    if (
        text.includes(
            "signups not allowed"
        )
    ) {

        return "This account is not registered for password recovery.";
    }


    return (
        error?.message ||
        "Unable to send OTP. Please try again."
    );
}


function getOtpErrorMessage(
    error
) {

    const text =
        error?.message?.toLowerCase() ||
        "";


    if (
        text.includes(
            "expired"
        )
    ) {

        return "This OTP has expired. Please request a new OTP.";
    }


    if (
        text.includes(
            "invalid"
        )
    ) {

        return "The OTP is incorrect or invalid.";
    }


    if (
        text.includes(
            "token"
        )
    ) {

        return "The OTP could not be verified. Please request a new OTP.";
    }


    return (
        error?.message ||
        "OTP verification failed. Please try again."
    );
}


function getPasswordResetErrorMessage(
    error
) {

    const text =
        error?.message?.toLowerCase() ||
        "";


    if (
        text.includes(
            "password"
        ) &&
        text.includes(
            "weak"
        )
    ) {

        return "This password is too weak. Please choose a stronger password.";
    }


    if (
        text.includes(
            "session"
        )
    ) {

        return "Your password-reset session has expired. Please request a new OTP.";
    }


    return (
        error?.message ||
        "Password reset failed. Please try again."
    );
}


/* =========================================================
   INITIAL STATE
========================================================= */

if (emailRecovery) {
    emailRecovery.hidden = true;
}

if (phoneRecovery) {
    phoneRecovery.hidden = true;
}

if (otpSection) {
    otpSection.hidden = true;
}

if (passwordSection) {
    passwordSection.hidden = true;
}

if (successSection) {
    successSection.hidden = true;
}

console.log(
    "SSP Auth-8: Forgot Password system loaded."
);