/* =========================================================
   SSP CUSTOMER PROFILE
========================================================= */


/* =========================================================
   PASSWORD RULE
   12 + 4

   12 = minimum 12 characters

   4 =
   1. Uppercase
   2. Lowercase
   3. Number
   4. Special character
========================================================= */

const PASSWORD_MIN_LENGTH = 12;



/* =========================================================
   DOM HELPERS
========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


function setText(id, value) {

    const element = getElement(id);

    if (element) {

        element.textContent =
            value === null ||
            value === undefined ||
            value === ""
                ? "—"
                : String(value);

    }

}



/* =========================================================
   CUSTOMER DATA
========================================================= */

let currentUser = null;

let currentProfile = null;



/* =========================================================
   LOAD CUSTOMER
========================================================= */

async function loadCustomerProfile() {

    try {

        if (
            !window.SSPAuth ||
            typeof window.SSPAuth.requireCustomer !== "function"
        ) {

            console.error(
                "SSPAuth.requireCustomer() is not available."
            );

            return;

        }


        currentUser =
            await window.SSPAuth.requireCustomer();


        if (!currentUser) {

            return;

        }


        if (
            typeof window.SSPAuth.getCustomerProfile ===
            "function"
        ) {

            currentProfile =
                await window.SSPAuth.getCustomerProfile();

        }


        const profile =
            currentProfile || {};


        /*
           IMPORTANT:
           Customer ID logic is kept unchanged.
        */

        const customerId =
            String(
                profile.customer_id ||
                currentUser.id ||
                "—"
            );


        const customerName =
            profile.full_name ||
            profile.name ||
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            "Customer";


        const customerEmail =
            profile.email ||
            currentUser.email ||
            "—";


        const customerPhone =
            profile.phone ||
            currentUser.phone ||
            "—";


        const customerStatus =
            profile.status ||
            "Active";


        /* SUMMARY */

        setText(
            "customerName",
            customerName
        );


        setText(
            "customerId",
            `Customer ID: ${customerId}`
        );


        /* DETAILS */

        setText(
            "detailCustomerName",
            customerName
        );


        setText(
            "detailCustomerId",
            customerId
        );


        setText(
            "detailCustomerEmail",
            customerEmail
        );


        setText(
            "detailCustomerPhone",
            customerPhone
        );


        setText(
            "detailCustomerStatus",
            customerStatus
        );


    } catch (error) {

        console.error(
            "Failed to load customer profile:",
            error
        );

        setText(
            "customerName",
            "Customer"
        );

    }

}



/* =========================================================
   VIEW MANAGEMENT
========================================================= */

const mainView =
    getElement("profileMainView");

const profileDetailsView =
    getElement("profileDetailsView");

const savedAddressView =
    getElement("savedAddressView");

const changePasswordView =
    getElement("changePasswordView");


function hideAllViews() {

    if (mainView) {
        mainView.hidden = true;
    }

    if (profileDetailsView) {
        profileDetailsView.hidden = true;
    }

    if (savedAddressView) {
        savedAddressView.hidden = true;
    }

    if (changePasswordView) {
        changePasswordView.hidden = true;
    }

}


function showMainView() {

    hideAllViews();

    if (mainView) {
        mainView.hidden = false;
    }

}


function showProfileDetails() {

    hideAllViews();

    if (profileDetailsView) {
        profileDetailsView.hidden = false;
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function showSavedAddress() {

    hideAllViews();

    if (savedAddressView) {
        savedAddressView.hidden = false;
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function showChangePassword() {

    hideAllViews();

    if (changePasswordView) {
        changePasswordView.hidden = false;
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}



/* =========================================================
   PROFILE NAVIGATION
========================================================= */

const profileSummaryCard =
    getElement("profileSummaryCard");


if (profileSummaryCard) {

    profileSummaryCard.addEventListener(
        "click",
        showProfileDetails
    );

}


const savedAddressCard =
    getElement("savedAddressCard");


if (savedAddressCard) {

    savedAddressCard.addEventListener(
        "click",
        showSavedAddress
    );

}


const changePasswordButton =
    getElement("changePasswordButton");


if (changePasswordButton) {

    changePasswordButton.addEventListener(
        "click",
        showChangePassword
    );

}


const profileDetailsBack =
    getElement("profileDetailsBack");


if (profileDetailsBack) {

    profileDetailsBack.addEventListener(
        "click",
        showMainView
    );

}


const savedAddressBack =
    getElement("savedAddressBack");


if (savedAddressBack) {

    savedAddressBack.addEventListener(
        "click",
        showMainView
    );

}


const changePasswordBack =
    getElement("changePasswordBack");


if (changePasswordBack) {

    changePasswordBack.addEventListener(
        "click",
        showMainView
    );

}



/* =========================================================
   ADD ADDRESS
========================================================= */

const addAddressButton =
    getElement("addAddressButton");


if (addAddressButton) {

    addAddressButton.addEventListener(
        "click",
        function () {

            alert(
                "Saved Address functionality will be connected when the address database structure is added."
            );

        }
    );

}



/* =========================================================
   PASSWORD RULE ELEMENTS
========================================================= */

const newPassword =
    getElement("newPassword");


const confirmPassword =
    getElement("confirmPassword");


const ruleLength =
    getElement("ruleLength");


const ruleUppercase =
    getElement("ruleUppercase");


const ruleLowercase =
    getElement("ruleLowercase");


const ruleNumber =
    getElement("ruleNumber");


const ruleSpecial =
    getElement("ruleSpecial");


const passwordRuleStatus =
    getElement("passwordRuleStatus");


const confirmPasswordError =
    getElement("confirmPasswordError");


const passwordFormMessage =
    getElement("passwordFormMessage");



/* =========================================================
   CHECK 12 + 4 PASSWORD RULE
========================================================= */

function checkPasswordRules(password) {

    const hasMinimumLength =
        password.length >= PASSWORD_MIN_LENGTH;


    const hasUppercase =
        /[A-Z]/.test(password);


    const hasLowercase =
        /[a-z]/.test(password);


    const hasNumber =
        /[0-9]/.test(password);


    const hasSpecial =
        /[^A-Za-z0-9]/.test(password);


    return {

        hasMinimumLength,

        hasUppercase,

        hasLowercase,

        hasNumber,

        hasSpecial,

        valid:
            hasMinimumLength &&
            hasUppercase &&
            hasLowercase &&
            hasNumber &&
            hasSpecial

    };

}



/* =========================================================
   UPDATE PASSWORD RULE UI
========================================================= */

function updatePasswordRuleUI() {

    const password =
        newPassword
            ? newPassword.value
            : "";


    const rules =
        checkPasswordRules(password);


    if (ruleLength) {

        ruleLength.classList.toggle(
            "valid",
            rules.hasMinimumLength
        );

    }


    if (ruleUppercase) {

        ruleUppercase.classList.toggle(
            "valid",
            rules.hasUppercase
        );

    }


    if (ruleLowercase) {

        ruleLowercase.classList.toggle(
            "valid",
            rules.hasLowercase
        );

    }


    if (ruleNumber) {

        ruleNumber.classList.toggle(
            "valid",
            rules.hasNumber
        );

    }


    if (ruleSpecial) {

        ruleSpecial.classList.toggle(
            "valid",
            rules.hasSpecial
        );

    }


    if (passwordRuleStatus) {

        passwordRuleStatus.textContent =
            rules.valid
                ? "12 + 4 Complete"
                : "Not complete";


        passwordRuleStatus.classList.toggle(
            "valid",
            rules.valid
        );

    }


    return rules;

}



if (newPassword) {

    newPassword.addEventListener(
        "input",
        function () {

            updatePasswordRuleUI();

            if (confirmPassword) {

                validatePasswordMatch();

            }

        }
    );

}



/* =========================================================
   CONFIRM PASSWORD VALIDATION
========================================================= */

function validatePasswordMatch() {

    if (!confirmPassword) {

        return false;

    }


    const password =
        newPassword
            ? newPassword.value
            : "";


    const confirmation =
        confirmPassword.value;


    if (!confirmation) {

        if (confirmPasswordError) {

            confirmPasswordError.textContent = "";

        }

        return false;

    }


    if (password !== confirmation) {

        if (confirmPasswordError) {

            confirmPasswordError.textContent =
                "Passwords do not match.";

        }

        return false;

    }


    if (confirmPasswordError) {

        confirmPasswordError.textContent = "";

    }


    return true;

}


if (confirmPassword) {

    confirmPassword.addEventListener(
        "input",
        validatePasswordMatch
    );

}



/* =========================================================
   PASSWORD VISIBILITY
========================================================= */

function setupPasswordToggle(
    inputId,
    buttonId
) {

    const input =
        getElement(inputId);


    const button =
        getElement(buttonId);


    if (!input || !button) {

        return;

    }


    button.addEventListener(
        "click",
        function () {

            const isPassword =
                input.type === "password";


            input.type =
                isPassword
                    ? "text"
                    : "password";


            button.classList.toggle(
                "showing",
                isPassword
            );


            button.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );

        }
    );

}


setupPasswordToggle(
    "newPassword",
    "toggleNewPassword"
);


setupPasswordToggle(
    "confirmPassword",
    "toggleConfirmPassword"
);



/* =========================================================
   CHANGE PASSWORD
========================================================= */

const changePasswordForm =
    getElement("changePasswordForm");


const updatePasswordButton =
    getElement("updatePasswordButton");


if (changePasswordForm) {

    changePasswordForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const password =
                newPassword
                    ? newPassword.value
                    : "";


            const confirmation =
                confirmPassword
                    ? confirmPassword.value
                    : "";


            const rules =
                updatePasswordRuleUI();


            if (!rules.valid) {

                if (passwordFormMessage) {

                    passwordFormMessage.textContent =
                        "Password must satisfy the complete 12 + 4 rule.";

                    passwordFormMessage.className =
                        "form-message error";

                }

                return;

            }


            if (password !== confirmation) {

                if (confirmPasswordError) {

                    confirmPasswordError.textContent =
                        "Passwords do not match.";

                }

                if (passwordFormMessage) {

                    passwordFormMessage.textContent =
                        "Please confirm the same password.";

                    passwordFormMessage.className =
                        "form-message error";

                }

                return;

            }


            if (
                !window.supabaseClient ||
                !window.supabaseClient.auth
            ) {

                if (passwordFormMessage) {

                    passwordFormMessage.textContent =
                        "Authentication service is not available.";

                    passwordFormMessage.className =
                        "form-message error";

                }

                return;

            }


            if (updatePasswordButton) {

                updatePasswordButton.disabled = true;

                updatePasswordButton.textContent =
                    "Updating...";

            }


            try {

                const {
                    error
                } =
                    await window.supabaseClient.auth.updateUser({
                        password: password
                    });


                if (error) {

                    throw error;

                }


                if (passwordFormMessage) {

                    passwordFormMessage.textContent =
                        "Password updated successfully.";

                    passwordFormMessage.className =
                        "form-message success";

                }


                changePasswordForm.reset();

                updatePasswordRuleUI();


                if (confirmPasswordError) {

                    confirmPasswordError.textContent = "";

                }


            } catch (error) {

                console.error(
                    "Password update failed:",
                    error
                );


                if (passwordFormMessage) {

                    passwordFormMessage.textContent =
                        error.message ||
                        "Unable to update password.";

                    passwordFormMessage.className =
                        "form-message error";

                }

            } finally {

                if (updatePasswordButton) {

                    updatePasswordButton.disabled = false;

                    updatePasswordButton.textContent =
                        "Update Password";

                }

            }

        }
    );

}



/* =========================================================
   LOGOUT
   CONFIRMATION MESSAGE
========================================================= */

const logoutButton =
    getElement("logoutButton");


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            const confirmed =
                window.confirm(
                    "Are you sure you want to logout from your SSP Customer account?"
                );


            if (!confirmed) {

                return;

            }


            try {

                if (
                    window.SSPAuth &&
                    typeof window.SSPAuth.logout ===
                    "function"
                ) {

                    await window.SSPAuth.logout();

                    return;

                }


                if (
                    window.supabaseClient &&
                    window.supabaseClient.auth
                ) {

                    await window.supabaseClient.auth.signOut();

                    window.location.href =
                        "login.html";

                }

            } catch (error) {

                console.error(
                    "Logout failed:",
                    error
                );

                alert(
                    "Unable to logout right now. Please try again."
                );

            }

        }
    );

}



/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updatePasswordRuleUI();

        loadCustomerProfile();

    }
);