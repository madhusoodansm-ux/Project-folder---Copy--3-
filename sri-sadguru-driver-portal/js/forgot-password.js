 "use strict";


/* =========================================================
   ELEMENTS
   ========================================================= */

const stepEmail =
    document.getElementById("stepEmail");

const stepOtp =
    document.getElementById("stepOtp");

const stepPassword =
    document.getElementById("stepPassword");


const email =
    document.getElementById("email");

const otp =
    document.getElementById("otp");

const newPassword =
    document.getElementById("newPassword");

const confirmPassword =
    document.getElementById("confirmPassword");


const sendOtpBtn =
    document.getElementById("sendOtpBtn");

const verifyOtpBtn =
    document.getElementById("verifyOtpBtn");

const resendOtpBtn =
    document.getElementById("resendOtpBtn");

const resetPasswordBtn =
    document.getElementById("resetPasswordBtn");


const changeEmailBtn =
    document.getElementById("changeEmailBtn");

const continueLoginBtn =
    document.getElementById("continueLoginBtn");


const maskedEmail =
    document.getElementById("maskedEmail");

const timerText =
    document.getElementById("timerText");


const successOverlay =
    document.getElementById("successOverlay");


/* =========================================================
   ERROR ELEMENTS
   ========================================================= */

const emailError =
    document.getElementById("emailError");

const otpError =
    document.getElementById("otpError");

const newPasswordError =
    document.getElementById("newPasswordError");

const confirmPasswordError =
    document.getElementById("confirmPasswordError");


/* =========================================================
   PASSWORD RULE ELEMENTS
   ========================================================= */

const ruleLength =
    document.getElementById("ruleLength");

const ruleUpper =
    document.getElementById("ruleUpper");

const ruleLower =
    document.getElementById("ruleLower");

const ruleNumber =
    document.getElementById("ruleNumber");

const ruleSpecial =
    document.getElementById("ruleSpecial");


/* =========================================================
   STATE
   ========================================================= */

let generatedOtp = "";

let otpTimer = null;

let remainingSeconds = 120;


/*
 * This variable represents the verified account
 * during this frontend prototype.
 */

let verifiedEmail = "";


/* =========================================================
   STEP CONTROL
   ========================================================= */

function showStep(step) {

    stepEmail.classList.remove("active");
    stepOtp.classList.remove("active");
    stepPassword.classList.remove("active");


    if (step === "email") {
        stepEmail.classList.add("active");
    }

    if (step === "otp") {
        stepOtp.classList.add("active");
    }

    if (step === "password") {
        stepPassword.classList.add("active");
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   ERROR HELPERS
   ========================================================= */

function showError(
    input,
    errorElement,
    message
) {

    input.classList.add("input-error");

    input.classList.remove("input-success");

    errorElement.textContent = message;
}


function clearError(
    input,
    errorElement
) {

    input.classList.remove("input-error");

    errorElement.textContent = "";
}


function markSuccess(input) {

    input.classList.remove("input-error");

    input.classList.add("input-success");
}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function validateEmail() {

    const value =
        email.value.trim().toLowerCase();


    clearError(
        email,
        emailError
    );


    if (value === "") {

        showError(
            email,
            emailError,
            "Please enter your Gmail address."
        );

        return false;
    }


    /*
     * Only Gmail is accepted.
     */

    const gmailPattern =
        /^[a-zA-Z0-9._%+-]+@gmail\.com$/;


    if (!gmailPattern.test(value)) {

        showError(
            email,
            emailError,
            "Please enter a valid Gmail address."
        );

        return false;
    }


    email.value = value;

    markSuccess(email);

    return true;
}


/* =========================================================
   MASK EMAIL
   ========================================================= */

function maskEmail(value) {

    const parts =
        value.split("@");

    if (parts.length !== 2) {
        return value;
    }


    const username = parts[0];

    const domain = parts[1];


    if (username.length <= 2) {

        return (
            username.charAt(0) +
            "*".repeat(
                Math.max(username.length - 1, 1)
            ) +
            "@" +
            domain
        );
    }


    return (
        username.substring(0, 2) +
        "*".repeat(
            Math.max(username.length - 2, 3)
        ) +
        "@" +
        domain
    );
}


/* =========================================================
   GENERATE OTP
   ========================================================= */

function generateOtp() {

    /*
     * Six digit OTP.
     */

    return Math.floor(
        100000 +
        Math.random() * 900000
    ).toString();
}


/* =========================================================
   START OTP TIMER
   ========================================================= */

function startOtpTimer() {

    clearInterval(otpTimer);

    remainingSeconds = 120;

    resendOtpBtn.disabled = true;

    timerText.classList.remove("expired");


    updateTimerText();


    otpTimer = setInterval(() => {

        remainingSeconds--;

        updateTimerText();


        if (remainingSeconds <= 0) {

            clearInterval(otpTimer);

            resendOtpBtn.disabled = false;

            timerText.textContent =
                "OTP expired. Please request a new OTP.";

            timerText.classList.add("expired");
        }

    }, 1000);
}


/* =========================================================
   TIMER DISPLAY
   ========================================================= */

function updateTimerText() {

    const minutes =
        Math.floor(
            remainingSeconds / 60
        );

    const seconds =
        remainingSeconds % 60;


    timerText.textContent =
        `OTP expires in ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


/* =========================================================
   SEND OTP
   ========================================================= */

sendOtpBtn.addEventListener(
    "click",
    () => {

        if (!validateEmail()) {
            return;
        }


        /*
         * Generate OTP for frontend testing.
         */

        generatedOtp = generateOtp();


        verifiedEmail =
            email.value.trim().toLowerCase();


        maskedEmail.textContent =
            maskEmail(verifiedEmail);


        /*
         * IMPORTANT:
         *
         * In the real production application,
         * this OTP must be generated and sent
         * by the backend/email service.
         *
         * It must NOT be generated in browser JS.
         */


        console.log(
            "Development OTP:",
            generatedOtp
        );


        showStep("otp");

        startOtpTimer();

        otp.value = "";

        otp.focus();

    }
);


/* =========================================================
   OTP INPUT
   ========================================================= */

otp.addEventListener(
    "input",
    () => {

        /*
         * Numbers only.
         */

        otp.value =
            otp.value.replace(/\D/g, "");


        /*
         * Maximum six digits.
         */

        if (otp.value.length > 6) {

            otp.value =
                otp.value.substring(0, 6);
        }


        clearError(
            otp,
            otpError
        );

    }
);


/* =========================================================
   VERIFY OTP
   ========================================================= */

verifyOtpBtn.addEventListener(
    "click",
    () => {

        clearError(
            otp,
            otpError
        );


        if (otp.value === "") {

            showError(
                otp,
                otpError,
                "Please enter the 6-digit OTP."
            );

            return;
        }


        if (!/^\d{6}$/.test(otp.value)) {

            showError(
                otp,
                otpError,
                "OTP must contain exactly 6 digits."
            );

            return;
        }


        if (remainingSeconds <= 0) {

            showError(
                otp,
                otpError,
                "OTP has expired. Please request a new OTP."
            );

            return;
        }


        if (otp.value !== generatedOtp) {

            showError(
                otp,
                otpError,
                "Incorrect OTP. Please check and try again."
            );

            return;
        }


        markSuccess(otp);


        clearInterval(otpTimer);


        showStep("password");

        newPassword.focus();

    }
);


/* =========================================================
   RESEND OTP
   ========================================================= */

resendOtpBtn.addEventListener(
    "click",
    () => {

        if (!verifiedEmail) {
            showStep("email");
            return;
        }


        generatedOtp = generateOtp();


        console.log(
            "Development OTP:",
            generatedOtp
        );


        otp.value = "";

        clearError(
            otp,
            otpError
        );


        startOtpTimer();

        otp.focus();

    }
);


/* =========================================================
   CHANGE EMAIL
   ========================================================= */

changeEmailBtn.addEventListener(
    "click",
    () => {

        clearInterval(otpTimer);

        generatedOtp = "";

        verifiedEmail = "";

        otp.value = "";

        showStep("email");

    }
);


/* =========================================================
   PASSWORD RULE CHECK
   ========================================================= */

function checkPasswordRules(value) {

    return {

        length:
            value.length >= 12,

        upper:
            /[A-Z]/.test(value),

        lower:
            /[a-z]/.test(value),

        number:
            /[0-9]/.test(value),

        special:
            /[^A-Za-z0-9]/.test(value)

    };
}


/* =========================================================
   UPDATE PASSWORD RULES
   ========================================================= */

function updatePasswordRules() {

    const rules =
        checkPasswordRules(
            newPassword.value
        );


    ruleLength.classList.toggle(
        "valid",
        rules.length
    );


    ruleUpper.classList.toggle(
        "valid",
        rules.upper
    );


    ruleLower.classList.toggle(
        "valid",
        rules.lower
    );


    ruleNumber.classList.toggle(
        "valid",
        rules.number
    );


    ruleSpecial.classList.toggle(
        "valid",
        rules.special
    );
}


/* =========================================================
   VALIDATE NEW PASSWORD
   ========================================================= */

function validateNewPassword() {

    const value =
        newPassword.value;


    clearError(
        newPassword,
        newPasswordError
    );


    updatePasswordRules();


    if (value === "") {

        showError(
            newPassword,
            newPasswordError,
            "Please enter a new password."
        );

        return false;
    }


    const rules =
        checkPasswordRules(value);


    /*
     * 12 + 4 PASSWORD RULE
     *
     * 12 = minimum 12 characters
     *
     * 4 = uppercase + lowercase +
     *     number + special character
     */

    if (
        !rules.length ||
        !rules.upper ||
        !rules.lower ||
        !rules.number ||
        !rules.special
    ) {

        showError(
            newPassword,
            newPasswordError,
            "Password must be at least 12 characters and contain uppercase, lowercase, number and special character."
        );

        return false;
    }


    markSuccess(newPassword);

    return true;
}


/* =========================================================
   VALIDATE CONFIRM PASSWORD
   ========================================================= */

function validateConfirmPassword() {

    const value =
        confirmPassword.value;


    clearError(
        confirmPassword,
        confirmPasswordError
    );


    if (value === "") {

        showError(
            confirmPassword,
            confirmPasswordError,
            "Please confirm your new password."
        );

        return false;
    }


    if (value !== newPassword.value) {

        showError(
            confirmPassword,
            confirmPasswordError,
            "Passwords do not match."
        );

        return false;
    }


    markSuccess(confirmPassword);

    return true;
}


/* =========================================================
   NEW PASSWORD LIVE CHECK
   ========================================================= */

newPassword.addEventListener(
    "input",
    () => {

        updatePasswordRules();

        newPassword.classList.remove(
            "input-error"
        );

        newPasswordError.textContent = "";


        if (
            newPassword.value !== ""
        ) {

            const rules =
                checkPasswordRules(
                    newPassword.value
                );


            if (
                rules.length &&
                rules.upper &&
                rules.lower &&
                rules.number &&
                rules.special
            ) {

                markSuccess(newPassword);
            }
        }


        if (
            confirmPassword.value !== ""
        ) {

            validateConfirmPassword();
        }

    }
);


/* =========================================================
   CONFIRM PASSWORD LIVE CHECK
   ========================================================= */

confirmPassword.addEventListener(
    "input",
    () => {

        if (
            confirmPassword.value !== ""
        ) {

            validateConfirmPassword();
        }

    }
);


/* =========================================================
   RESET PASSWORD
   ========================================================= */

resetPasswordBtn.addEventListener(
    "click",
    () => {

        const passwordValid =
            validateNewPassword();

        const confirmValid =
            validateConfirmPassword();


        if (
            !passwordValid ||
            !confirmValid
        ) {

            return;
        }


        /*
         * Do NOT store the password in localStorage.
         *
         * Production version should send the
         * verified reset request to the backend.
         */


        resetPasswordBtn.disabled = true;

        resetPasswordBtn.textContent =
            "RESETTING PASSWORD...";


        setTimeout(() => {

            resetPasswordBtn.disabled = false;

            resetPasswordBtn.textContent =
                "RESET PASSWORD";


            successOverlay.classList.add(
                "show"
            );

        }, 700);

    }
);


/* =========================================================
   SHOW / HIDE PASSWORD
   ========================================================= */

const showPasswordButtons =
    document.querySelectorAll(
        ".show-password"
    );


showPasswordButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                const targetId =
                    button.getAttribute(
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
                    target.type === "password"
                ) {

                    target.type = "text";

                    button.textContent =
                        "Hide";

                } else {

                    target.type = "password";

                    button.textContent =
                        "Show";
                }

            }
        );

    }
);


/* =========================================================
   CONTINUE TO LOGIN
   ========================================================= */

continueLoginBtn.addEventListener(
    "click",
    () => {

        window.location.href =
            "index.html";

    }
);


/* =========================================================
   INITIAL STATE
   ========================================================= */

showStep("email");