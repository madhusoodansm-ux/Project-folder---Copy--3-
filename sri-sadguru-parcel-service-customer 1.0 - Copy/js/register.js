"use strict";

/*
 * =========================================================
 * SRI SADGURU PARCEL SERVICE
 * CUSTOMER REGISTRATION
 * AUTH-2
 * =========================================================
 */


/* =========================================================
   GET FORM ELEMENTS
========================================================= */

const registrationForm =
    document.getElementById("registrationForm");

const fullName =
    document.getElementById("fullName");

const mobile =
    document.getElementById("mobile");

const email =
    document.getElementById("email");

const password =
    document.getElementById("password");

const confirmPassword =
    document.getElementById("confirmPassword");

const terms =
    document.getElementById("terms");

const createAccountButton =
    document.getElementById("createAccountButton");

const formMessage =
    document.getElementById("formMessage");


/* =========================================================
   CHECK SUPABASE
========================================================= */

if (!window.supabaseClient) {

    console.error(
        "SSP Registration: Supabase client not available."
    );
}


/* =========================================================
   PASSWORD TOGGLE
========================================================= */

function setupPasswordToggle(
    buttonId,
    inputId
) {

    const button =
        document.getElementById(buttonId);

    const input =
        document.getElementById(inputId);


    if (!button || !input) {
        return;
    }


    button.addEventListener(
        "click",
        function () {

            if (
                input.type === "password"
            ) {

                input.type = "text";

                button.textContent =
                    "Hide";

            } else {

                input.type = "password";

                button.textContent =
                    "Show";
            }

        }
    );
}


setupPasswordToggle(
    "passwordToggle",
    "password"
);


setupPasswordToggle(
    "confirmPasswordToggle",
    "confirmPassword"
);


/* =========================================================
   PASSWORD RULES
========================================================= */

function checkPasswordRules(value) {

    return {

        length:
            value.length >= 12,

        uppercase:
            /[A-Z]/.test(value),

        lowercase:
            /[a-z]/.test(value),

        number:
            /[0-9]/.test(value),

        special:
            /[!@#$%^&*]/.test(value)

    };
}


function updatePasswordRules() {

    if (!password) {
        return;
    }


    const rules =
        checkPasswordRules(
            password.value
        );


    updateRule(
        "ruleLength",
        rules.length
    );

    updateRule(
        "ruleUppercase",
        rules.uppercase
    );

    updateRule(
        "ruleLowercase",
        rules.lowercase
    );

    updateRule(
        "ruleNumber",
        rules.number
    );

    updateRule(
        "ruleSpecial",
        rules.special
    );
}


function updateRule(
    elementId,
    valid
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    const circle =
        element.querySelector(
            ".rule-circle"
        );


    if (!circle) {
        return;
    }


    if (valid) {

        element.classList.add(
            "valid"
        );

        circle.textContent =
            "✓";

    } else {

        element.classList.remove(
            "valid"
        );

        circle.textContent =
            "○";
    }
}


/* =========================================================
   ERROR FUNCTIONS
========================================================= */

function showError(
    inputElement,
    errorElementId,
    message
) {

    if (inputElement) {

        inputElement.classList.add(
            "input-error"
        );
    }


    const errorElement =
        document.getElementById(
            errorElementId
        );


    if (errorElement) {

        errorElement.textContent =
            message;
    }
}


function clearError(
    inputElement,
    errorElementId
) {

    if (inputElement) {

        inputElement.classList.remove(
            "input-error"
        );
    }


    const errorElement =
        document.getElementById(
            errorElementId
        );


    if (errorElement) {

        errorElement.textContent =
            "";
    }
}


/* =========================================================
   FORM MESSAGE
========================================================= */

function showFormMessage(
    message,
    type
) {

    if (!formMessage) {
        return;
    }


    formMessage.textContent =
        message;


    formMessage.className =
        "form-message show " +
        type;
}


function clearFormMessage() {

    if (!formMessage) {
        return;
    }


    formMessage.textContent =
        "";

    formMessage.className =
        "form-message";
}


/* =========================================================
   FULL NAME VALIDATION
========================================================= */

function validateFullName() {

    const value =
        fullName.value.trim();


    if (!value) {

        showError(
            fullName,
            "fullNameError",
            "Please enter your full name."
        );

        return false;
    }


    if (value.length < 2) {

        showError(
            fullName,
            "fullNameError",
            "Full name must contain at least 2 characters."
        );

        return false;
    }


    if (
        !/^[A-Za-zÀ-ÿ\s.'-]+$/.test(
            value
        )
    ) {

        showError(
            fullName,
            "fullNameError",
            "Please enter a valid name."
        );

        return false;
    }


    clearError(
        fullName,
        "fullNameError"
    );

    return true;
}


/* =========================================================
   MOBILE VALIDATION
========================================================= */

function validateMobile() {

    const value =
        mobile.value.trim();


    if (
        !/^[6-9][0-9]{9}$/.test(
            value
        )
    ) {

        showError(
            mobile,
            "mobileError",
            "Enter a valid 10-digit mobile number."
        );

        return false;
    }


    clearError(
        mobile,
        "mobileError"
    );

    return true;
}


/* =========================================================
   EMAIL VALIDATION
========================================================= */

function validateEmail() {

    const value =
        email.value.trim()
            .toLowerCase();


    const gmailPattern =
        /^[a-zA-Z0-9._%+-]+@gmail\.com$/;


    if (
        !gmailPattern.test(
            value
        )
    ) {

        showError(
            email,
            "emailError",
            "Please enter a valid Gmail address."
        );

        return false;
    }


    clearError(
        email,
        "emailError"
    );

    return true;
}


/* =========================================================
   PASSWORD VALIDATION
========================================================= */

function validatePassword() {

    const rules =
        checkPasswordRules(
            password.value
        );


    const valid =
        rules.length &&
        rules.uppercase &&
        rules.lowercase &&
        rules.number &&
        rules.special;


    if (!valid) {

        showError(
            password,
            "passwordError",
            "Password must satisfy all password requirements."
        );

        return false;
    }


    clearError(
        password,
        "passwordError"
    );

    return true;
}


/* =========================================================
   CONFIRM PASSWORD
========================================================= */

function validateConfirmPassword() {

    if (
        !confirmPassword.value
    ) {

        showError(
            confirmPassword,
            "confirmPasswordError",
            "Please confirm your password."
        );

        return false;
    }


    if (
        confirmPassword.value !==
        password.value
    ) {

        showError(
            confirmPassword,
            "confirmPasswordError",
            "Passwords do not match."
        );

        return false;
    }


    clearError(
        confirmPassword,
        "confirmPasswordError"
    );

    return true;
}


/* =========================================================
   TERMS
========================================================= */

function validateTerms() {

    const error =
        document.getElementById(
            "termsError"
        );


    if (!terms.checked) {

        if (error) {

            error.textContent =
                "Please accept the Terms & Conditions and Privacy Policy.";
        }

        return false;
    }


    if (error) {

        error.textContent =
            "";
    }


    return true;
}


/* =========================================================
   MOBILE INPUT
========================================================= */

if (mobile) {

    mobile.addEventListener(
        "input",
        function () {

            this.value =
                this.value.replace(
                    /[^0-9]/g,
                    ""
                );


            this.value =
                this.value.substring(
                    0,
                    10
                );


            clearError(
                mobile,
                "mobileError"
            );
        }
    );
}


/* =========================================================
   LIVE VALIDATION
========================================================= */

if (fullName) {

    fullName.addEventListener(
        "input",
        function () {

            clearError(
                fullName,
                "fullNameError"
            );

        }
    );
}


if (email) {

    email.addEventListener(
        "input",
        function () {

            clearError(
                email,
                "emailError"
            );

        }
    );
}


if (password) {

    password.addEventListener(
        "input",
        function () {

            updatePasswordRules();

            clearError(
                password,
                "passwordError"
            );

        }
    );
}


if (confirmPassword) {

    confirmPassword.addEventListener(
        "input",
        function () {

            clearError(
                confirmPassword,
                "confirmPasswordError"
            );

        }
    );
}


/* =========================================================
   FORM SUBMISSION
========================================================= */

if (registrationForm) {

    registrationForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            clearFormMessage();


            /* -----------------------------------------------
               VALIDATE
            ----------------------------------------------- */

            const nameValid =
                validateFullName();

            const mobileValid =
                validateMobile();

            const emailValid =
                validateEmail();

            const passwordValid =
                validatePassword();

            const confirmValid =
                validateConfirmPassword();

            const termsValid =
                validateTerms();


            if (
                !nameValid ||
                !mobileValid ||
                !emailValid ||
                !passwordValid ||
                !confirmValid ||
                !termsValid
            ) {

                showFormMessage(
                    "Please correct the highlighted information.",
                    "error"
                );

                return;
            }


            /* -----------------------------------------------
               CHECK SUPABASE
            ----------------------------------------------- */

            if (!window.supabaseClient) {

                showFormMessage(
                    "Unable to connect to the registration service.",
                    "error"
                );

                return;
            }


            /* -----------------------------------------------
               LOADING
            ----------------------------------------------- */

            if (createAccountButton) {

                createAccountButton.disabled =
                    true;

                createAccountButton.classList.add(
                    "loading"
                );
            }


            try {

                const customerName =
                    fullName.value.trim();

                const customerMobile =
                    "+91" +
                    mobile.value.trim();

                const customerEmail =
                    email.value.trim()
                        .toLowerCase();

                const customerPassword =
                    password.value;


                /* -------------------------------------------
                   CREATE SUPABASE AUTH USER
                ------------------------------------------- */

                const {
                    data,
                    error
                } =
                    await window.supabaseClient
                        .auth
                        .signUp({

                            email:
                                customerEmail,

                            password:
                                customerPassword,

                            options: {

                                data: {

                                    full_name:
                                        customerName,

                                    phone:
                                        customerMobile

                                }

                            }

                        });


                /* -------------------------------------------
                   SUPABASE ERROR
                ------------------------------------------- */

                if (error) {

                    console.error(
                        "SSP Registration Error:",
                        error
                    );


                    showFormMessage(
                        error.message ||
                        "Unable to create your account.",
                        "error"
                    );


                    return;
                }


                /* -------------------------------------------
                   SUCCESS
                ------------------------------------------- */

                console.log(
                    "SSP Customer registered:",
                    data.user
                );


                /*
                   If email confirmation is enabled,
                   Supabase normally returns a user but
                   no active session.
                */

                if (
                    data.user &&
                    !data.session
                ) {

                    showFormMessage(
                        "Account created successfully. Please check your Gmail and confirm your email before logging in.",
                        "success"
                    );

                } else {

                    showFormMessage(
                        "Account created successfully. Redirecting...",
                        "success"
                    );


                    setTimeout(
                        function () {

                            window.location.href =
                                "../customer/dashboard.html";

                        },
                        1200
                    );
                }


            } catch (error) {

                console.error(
                    "SSP Registration Unexpected Error:",
                    error
                );


                showFormMessage(
                    "Something went wrong. Please try again.",
                    "error"
                );


            } finally {

                if (createAccountButton) {

                    createAccountButton.disabled =
                        false;

                    createAccountButton.classList.remove(
                        "loading"
                    );
                }
            }

        }
    );
}


/* =========================================================
   LOGIN BUTTON
========================================================= */

const loginButton =
    document.getElementById(
        "loginButton"
    );


if (loginButton) {

    loginButton.addEventListener(
        "click",
        function () {

            window.location.href =
                "../index.html";

        }
    );
}


/* =========================================================
   TERMS BUTTON
========================================================= */

const termsButton =
    document.getElementById(
        "termsButton"
    );


if (termsButton) {

    termsButton.addEventListener(
        "click",
        function () {

            alert(
                "Terms & Conditions page will be connected here."
            );

        }
    );
}


/* =========================================================
   PRIVACY BUTTON
========================================================= */

const privacyButton =
    document.getElementById(
        "privacyButton"
    );


if (privacyButton) {

    privacyButton.addEventListener(
        "click",
        function () {

            alert(
                "Privacy Policy page will be connected here."
            );

        }
    );
}


/* =========================================================
   INITIAL PASSWORD DISPLAY
========================================================= */

updatePasswordRules();