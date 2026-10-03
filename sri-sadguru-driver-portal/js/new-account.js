/* =========================================================
   SSP DRIVER PORTAL
   NEW DRIVER ACCOUNT
   SUPABASE VERSION
========================================================= */

"use strict";


document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeCreateAccount();

    }
);



/* =========================================================
   ELEMENTS
========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


const form =
    getElement("createAccountForm");

const createAccountBtn =
    getElement("createAccountBtn");

const successOverlay =
    getElement("successOverlay");

const continueLoginBtn =
    getElement("continueLoginBtn");



/* =========================================================
   INITIALIZATION
========================================================= */

function initializeCreateAccount() {

    if (!form) {
        return;
    }


    setupPasswordButtons();

    setupPasswordRules();

    setupInputRestrictions();

    setupClearErrors();

    setupFormSubmit();

    setupContinueLogin();

}



/* =========================================================
   PASSWORD SHOW / HIDE
========================================================= */

function setupPasswordButtons() {

    const buttons =
        document.querySelectorAll(
            ".show-password"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const targetId =
                        button.dataset.target;

                    const input =
                        getElement(targetId);

                    if (!input) {
                        return;
                    }


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
    );

}



/* =========================================================
   PASSWORD RULES
========================================================= */

function setupPasswordRules() {

    const password =
        getElement("password");


    if (!password) {
        return;
    }


    password.addEventListener(
        "input",
        () => {

            updatePasswordRules(
                password.value
            );

            clearError(password);

        }
    );

}


function updatePasswordRules(value) {

    setRule(
        "ruleLength",
        value.length >= 12
    );


    setRule(
        "ruleUpper",
        /[A-Z]/.test(value)
    );


    setRule(
        "ruleLower",
        /[a-z]/.test(value)
    );


    setRule(
        "ruleNumber",
        /[0-9]/.test(value)
    );


    setRule(
        "ruleSpecial",
        /[!@#$%^&*]/.test(value)
    );

}


function setRule(id, valid) {

    const element =
        getElement(id);


    if (!element) {
        return;
    }


    if (valid) {

        element.classList.add(
            "valid"
        );

    } else {

        element.classList.remove(
            "valid"
        );

    }

}



/* =========================================================
   INPUT RESTRICTIONS
========================================================= */

function setupInputRestrictions() {

    restrictDigits(
        "mobileNumber",
        10
    );


    restrictDigits(
        "alternateMobile",
        10
    );


    restrictDigits(
        "emergencyNumber",
        10
    );


    restrictDigits(
        "pinCode",
        6
    );

}



/* =========================================================
   DIGIT RESTRICTION
========================================================= */

function restrictDigits(
    id,
    maxLength
) {

    const input =
        getElement(id);


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            input.value =
                input.value
                    .replace(/\D/g, "")
                    .slice(0, maxLength);

        }
    );

}



/* =========================================================
   CLEAR ERRORS
========================================================= */

function setupClearErrors() {

    const inputs =
        form.querySelectorAll(
            "input, select, textarea"
        );


    inputs.forEach(
        input => {

            input.addEventListener(
                "input",
                () => {

                    clearError(input);

                }
            );


            input.addEventListener(
                "change",
                () => {

                    clearError(input);

                }
            );

        }
    );

}



/* =========================================================
   FORM SUBMIT
========================================================= */

function setupFormSubmit() {

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const validation =
                validateForm();


            if (!validation.valid) {

                if (
                    validation.firstInvalid
                ) {

                    validation.firstInvalid
                        .focus();

                }

                return;

            }


            if (
                !window.supabaseClient
            ) {

                alert(
                    "Supabase is not connected. Please check supabase-client.js."
                );

                return;

            }


            await createDriverAccount();

        }
    );

}



/* =========================================================
   VALIDATE FORM
========================================================= */

function validateForm() {

    clearAllErrors();


    let firstInvalid = null;

    let valid = true;


    const fullName =
        getElement("fullName");

    const dateOfBirth =
        getElement("dateOfBirth");

    const gender =
        getElement("gender");

    const mobileNumber =
        getElement("mobileNumber");

    const email =
        getElement("email");

    const password =
        getElement("password");

    const confirmPassword =
        getElement("confirmPassword");

    const address =
        getElement("address");

    const city =
        getElement("city");

    const state =
        getElement("state");

    const pinCode =
        getElement("pinCode");

    const governmentId =
        getElement("governmentId");

    const licenceNumber =
        getElement("licenceNumber");

    const licenceExpiry =
        getElement("licenceExpiry");

    const joiningDate =
        getElement("joiningDate");

    const emergencyName =
        getElement("emergencyName");

    const relationship =
        getElement("relationship");

    const emergencyNumber =
        getElement("emergencyNumber");

    const terms =
        getElement("terms");



    /* =====================================================
       HELPER
    ===================================================== */

    function fail(
        input,
        message
    ) {

        valid = false;

        showError(
            input,
            message
        );


        if (!firstInvalid) {

            firstInvalid =
                input;

        }

    }



    /* =====================================================
       FULL NAME
    ===================================================== */

    if (
        !fullName.value.trim()
    ) {

        fail(
            fullName,
            "Please enter your full name."
        );

    } else if (
        fullName.value.trim().length < 3
    ) {

        fail(
            fullName,
            "Please enter a valid name."
        );

    }



    /* =====================================================
       DATE OF BIRTH
    ===================================================== */

    if (!dateOfBirth.value) {

        fail(
            dateOfBirth,
            "Please select your date of birth."
        );

    }



    /* =====================================================
       GENDER
    ===================================================== */

    if (!gender.value) {

        fail(
            gender,
            "Please select your gender."
        );

    }



    /* =====================================================
       MOBILE
    ===================================================== */

    if (
        !/^[6-9]\d{9}$/.test(
            mobileNumber.value.trim()
        )
    ) {

        fail(
            mobileNumber,
            "Enter a valid 10-digit Indian mobile number."
        );

    }



    /* =====================================================
       EMAIL
    ===================================================== */

    const emailValue =
        email.value
            .trim()
            .toLowerCase();


    if (!emailValue) {

        fail(
            email,
            "Please enter your Gmail address."
        );

    } else if (
        !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(
            emailValue
        )
    ) {

        fail(
            email,
            "Please enter a valid Gmail address."
        );

    }



    /* =====================================================
       PASSWORD
    ===================================================== */

    const passwordValue =
        password.value;


    const passwordValid =
        passwordValue.length >= 12 &&
        /[A-Z]/.test(passwordValue) &&
        /[a-z]/.test(passwordValue) &&
        /[0-9]/.test(passwordValue) &&
        /[!@#$%^&*]/.test(passwordValue);


    if (!passwordValid) {

        showError(
            password,
            "Password does not meet the required rules."
        );

        valid = false;

        if (!firstInvalid) {

            firstInvalid =
                password;

        }

    }



    /* =====================================================
       CONFIRM PASSWORD
    ===================================================== */

    if (
        confirmPassword.value !==
        passwordValue
    ) {

        fail(
            confirmPassword,
            "Passwords do not match."
        );

    }



    /* =====================================================
       ADDRESS
    ===================================================== */

    if (
        !address.value.trim()
    ) {

        fail(
            address,
            "Please enter your complete address."
        );

    }



    /* =====================================================
       CITY
    ===================================================== */

    if (
        !city.value.trim()
    ) {

        fail(
            city,
            "Please enter your city."
        );

    }



    /* =====================================================
       STATE
    ===================================================== */

    if (
        !state.value.trim()
    ) {

        fail(
            state,
            "Please enter your state."
        );

    }



    /* =====================================================
       PIN
    ===================================================== */

    if (
        !/^\d{6}$/.test(
            pinCode.value.trim()
        )
    ) {

        fail(
            pinCode,
            "Enter a valid 6-digit PIN code."
        );

    }



    /* =====================================================
       GOVERNMENT ID
    ===================================================== */

    if (
        !governmentId.value.trim()
    ) {

        fail(
            governmentId,
            "Please enter your government ID number."
        );

    }



    /* =====================================================
       LICENCE NUMBER
    ===================================================== */

    if (
        !licenceNumber.value.trim()
    ) {

        fail(
            licenceNumber,
            "Please enter your driving licence number."
        );

    }



    /* =====================================================
       LICENCE EXPIRY
    ===================================================== */

    if (!licenceExpiry.value) {

        fail(
            licenceExpiry,
            "Please select the licence expiry date."
        );

    }



    /* =====================================================
       JOINING DATE
    ===================================================== */

    if (!joiningDate.value) {

        fail(
            joiningDate,
            "Please select your joining date."
        );

    }



    /* =====================================================
       EMERGENCY
    ===================================================== */

    if (
        !emergencyName.value.trim()
    ) {

        fail(
            emergencyName,
            "Please enter the emergency contact name."
        );

    }


    if (
        !relationship.value.trim()
    ) {

        fail(
            relationship,
            "Please enter the relationship."
        );

    }


    if (
        !/^[6-9]\d{9}$/.test(
            emergencyNumber.value.trim()
        )
    ) {

        fail(
            emergencyNumber,
            "Enter a valid emergency contact number."
        );

    }



    /* =====================================================
       TERMS
    ===================================================== */

    if (!terms.checked) {

        const termsError =
            getElement("termsError");

        if (termsError) {

            termsError.textContent =
                "Please confirm that the information provided is correct.";

        }

        valid = false;

    }



    return {
        valid,
        firstInvalid
    };

}



/* =========================================================
   CREATE DRIVER ACCOUNT
========================================================= */

async function createDriverAccount() {

    const buttonText =
        createAccountBtn.querySelector(
            "span:last-child"
        );


    createAccountBtn.disabled =
        true;


    if (buttonText) {

        buttonText.textContent =
            "CREATING ACCOUNT...";

    }


    try {

        const driverEmail =
            getElement("email")
                .value
                .trim()
                .toLowerCase();


        const driverPassword =
            getElement("password")
                .value;


        /* =================================================
           COMPLETE DRIVER INFORMATION
        ================================================= */

        const driverMetadata = {

            full_name:
                getValue("fullName"),

            phone:
                getValue("mobileNumber"),

            alternate_phone:
                getValue("alternateMobile"),

            date_of_birth:
                getValue("dateOfBirth"),

            gender:
                getValue("gender"),

            blood_group:
                getValue("bloodGroup"),

            address_line1:
                getValue("address"),

            address_line2:
                "",

            city:
                getValue("city"),

            state:
                getValue("state"),

            pin_code:
                getValue("pinCode"),

            government_id_number:
                getValue("governmentId"),

            driving_license_number:
                getValue("licenceNumber"),

            driving_license_expiry:
                getValue("licenceExpiry"),

            joining_date:
                getValue("joiningDate"),

            emergency_contact_name:
                getValue("emergencyName"),

            emergency_contact_relationship:
                getValue("relationship"),

            emergency_contact_phone:
                getValue("emergencyNumber"),

            /*
             * Vehicle is OPTIONAL.
             */

            vehicle_assigned:
                Boolean(
                    getValue("vehicleAssigned")
                ),

            vehicle_number:
                getValue("vehicleNumber"),

            vehicle_type:
                getValue("vehicleType"),

            photo_url:
                "",

            notes:
                "",

            role:
                "driver"

        };



        /* =================================================
           SUPABASE AUTH SIGNUP
        ================================================= */

        const {
            data,
            error
        } =
            await window.supabaseClient.auth.signUp({

                email:
                    driverEmail,

                password:
                    driverPassword,

                options: {

                    data:
                        driverMetadata

                }

            });



        /* =================================================
           AUTH ERROR
        ================================================= */

        if (error) {

            console.error(
                "Driver registration error:",
                error
            );


            let message =
                error.message ||
                "Unable to create driver account.";


            if (
                /already registered/i.test(
                    message
                ) ||
                /already exists/i.test(
                    message
                )
            ) {

                message =
                    "This Gmail address is already registered. Please use Login.";

            }


            alert(message);

            return;

        }



        if (!data || !data.user) {

            alert(
                "The account could not be created. Please try again."
            );

            return;

        }



        /* =================================================
           DO NOT STORE PASSWORD
        ================================================= */

        localStorage.setItem(
            "driverRegistration",
            JSON.stringify({

                fullName:
                    getValue("fullName"),

                mobile:
                    getValue("mobileNumber"),

                email:
                    driverEmail,

                createdAt:
                    new Date().toISOString()

            })
        );



        /* =================================================
           SUCCESS
        ================================================= */

        if (successOverlay) {

            successOverlay.style.display =
                "flex";

        }

    }

    catch (error) {

        console.error(
            "Unexpected driver registration error:",
            error
        );


        alert(
            "Something went wrong while creating the driver account. Please try again."
        );

    }

    finally {

        createAccountBtn.disabled =
            false;


        if (buttonText) {

            buttonText.textContent =
                "CREATE DRIVER ACCOUNT";

        }

    }

}



/* =========================================================
   GET VALUE
========================================================= */

function getValue(id) {

    const element =
        getElement(id);


    if (!element) {
        return "";
    }


    return element.value.trim();

}



/* =========================================================
   SHOW ERROR
========================================================= */

function showError(
    input,
    message
) {

    if (!input) {
        return;
    }


    const errorElement =
        getElement(
            `${input.id}Error`
        );


    if (errorElement) {

        errorElement.textContent =
            message;

    }


    input.classList.add(
        "input-error"
    );

}



/* =========================================================
   CLEAR ERROR
========================================================= */

function clearError(input) {

    if (!input) {
        return;
    }


    const errorElement =
        getElement(
            `${input.id}Error`
        );


    if (errorElement) {

        errorElement.textContent =
            "";

    }


    input.classList.remove(
        "input-error"
    );

}



/* =========================================================
   CLEAR ALL ERRORS
========================================================= */

function clearAllErrors() {

    const errorElements =
        document.querySelectorAll(
            ".field-error"
        );


    errorElements.forEach(
        element => {

            element.textContent =
                "";

        }
    );


    const inputs =
        document.querySelectorAll(
            ".input-error"
        );


    inputs.forEach(
        input => {

            input.classList.remove(
                "input-error"
            );

        }
    );

}



/* =========================================================
   CONTINUE LOGIN
========================================================= */

function setupContinueLogin() {

    if (!continueLoginBtn) {
        return;
    }


    continueLoginBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "../index.html";

        }
    );

}