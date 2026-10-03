/* =========================================================
   SSP ADMIN
   NEW CUSTOMER PAGE
   SUPABASE VERSION
   COMPLETE REPLACEMENT
   ========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       SUPABASE CLIENT
       ===================================================== */

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("SSP Supabase client was not found.");

        showToast(
            "Connection Error",
            "Supabase client could not be loaded.",
            true
        );

        return;
    }


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const customerForm =
        document.getElementById("customerForm");

    const customerPhoto =
        document.getElementById("customerPhoto");

    const photoPreview =
        document.getElementById("photoPreview");

    const removePhoto =
        document.getElementById("removePhoto");

    const customerId =
        document.getElementById("customerId");

    const customerName =
        document.getElementById("customerName");

    const mobileNumber =
        document.getElementById("mobileNumber");

    const alternateMobile =
        document.getElementById("alternateMobile");

    const emailAddress =
        document.getElementById("emailAddress");

    const customerStatus =
        document.getElementById("customerStatus");

    const customerAddress =
        document.getElementById("customerAddress");

    const customerCity =
        document.getElementById("customerCity");

    const customerState =
        document.getElementById("customerState");

    const customerPin =
        document.getElementById("customerPin");

    const customerType =
        document.getElementById("customerType");

    const companyNameGroup =
        document.getElementById("companyNameGroup");

    const companyName =
        document.getElementById("companyName");

    const customerNotes =
        document.getElementById("customerNotes");

    const saveCustomerButton =
        document.getElementById("saveCustomerButton");

    const cancelCustomerButton =
        document.getElementById("cancelCustomerButton");


    /* =====================================================
       SIDEBAR
       ===================================================== */

    const sidebar =
        document.getElementById("sidebar");

    const sidebarToggle =
        document.getElementById("sidebarToggle");

    const mobileMenuButton =
        document.getElementById("mobileMenuButton");

    const sidebarOverlay =
        document.getElementById("sidebarOverlay");


    /* =====================================================
       TOAST
       ===================================================== */

    const toast =
        document.getElementById("toast");

    const toastTitle =
        document.getElementById("toastTitle");

    const toastMessage =
        document.getElementById("toastMessage");

    const closeToast =
        document.getElementById("closeToast");

    let toastTimer = null;


    /* =====================================================
       PHOTO
       ===================================================== */

    /*
       Photo is currently used only for preview.

       IMPORTANT:
       The photo is NOT sent as Base64 to the Edge Function.
       This prevents large requests and keeps customer creation
       independent from Storage.

       Storage upload can be connected separately.
    */

    let customerPhotoData = "";


    /* =====================================================
       TOAST FUNCTIONS
       ===================================================== */

    function showToast(title, message, error) {

        if (!toast) {
            return;
        }

        if (toastTitle) {
            toastTitle.textContent = title;
        }

        if (toastMessage) {
            toastMessage.textContent = message;
        }

        toast.classList.toggle(
            "error",
            Boolean(error)
        );

        toast.classList.add("show");

        if (toastTimer) {
            clearTimeout(toastTimer);
        }

        toastTimer = setTimeout(
            hideToast,
            error ? 7000 : 3500
        );
    }


    function hideToast() {

        if (toast) {
            toast.classList.remove("show");
        }
    }


    /* =====================================================
       PHOTO RESET
       ===================================================== */

    function resetPhoto() {

        customerPhotoData = "";

        if (photoPreview) {

            photoPreview.innerHTML = `
                <div class="photo-placeholder">
                    <i class="fa-solid fa-user"></i>
                    <span>No Photo</span>
                </div>
            `;
        }

        if (removePhoto) {
            removePhoto.style.display = "none";
        }

        if (customerPhoto) {
            customerPhoto.value = "";
        }
    }


    /* =====================================================
       PHOTO SELECT
       ===================================================== */

    function handlePhotoChange(event) {

        const file =
            event.target.files &&
            event.target.files[0];

        if (!file) {
            return;
        }

        /* IMAGE CHECK */

        if (
            !file.type ||
            !file.type.startsWith("image/")
        ) {

            showToast(
                "Invalid Photo",
                "Please select an image file.",
                true
            );

            resetPhoto();

            return;
        }


        /* SIZE CHECK */

        if (
            file.size >
            2 * 1024 * 1024
        ) {

            showToast(
                "Photo Too Large",
                "Please choose an image smaller than 2 MB.",
                true
            );

            resetPhoto();

            return;
        }


        const reader =
            new FileReader();


        reader.onload =
            function (event) {

                customerPhotoData =
                    event.target.result || "";


                if (photoPreview) {

                    photoPreview.innerHTML = `
                        <img
                            src="${customerPhotoData}"
                            alt="Customer Photo"
                        >
                    `;
                }


                if (removePhoto) {

                    removePhoto.style.display =
                        "block";
                }
            };


        reader.onerror =
            function () {

                showToast(
                    "Photo Error",
                    "Unable to read the selected photo.",
                    true
                );

                resetPhoto();
            };


        reader.readAsDataURL(file);
    }


    /* =====================================================
       CUSTOMER TYPE
       ===================================================== */

    function updateCustomerType() {

        if (
            !customerType ||
            !companyNameGroup ||
            !companyName
        ) {
            return;
        }

        const value =
            String(customerType.value || "")
                .trim()
                .toLowerCase();


        if (value === "business") {

            companyNameGroup.style.display =
                "block";

        } else {

            companyNameGroup.style.display =
                "none";

            companyName.value = "";
        }
    }


    /* =====================================================
       VALIDATION
       ===================================================== */

    function clearValidation() {

        if (!customerForm) {
            return;
        }

        customerForm
            .querySelectorAll(".input-error")
            .forEach(function (element) {

                element.classList.remove(
                    "input-error"
                );
            });


        customerForm
            .querySelectorAll(".validation-message")
            .forEach(function (element) {

                element.remove();
            });
    }


    function addError(field, message) {

        if (!field) {
            return;
        }

        field.classList.add(
            "input-error"
        );


        const parent =
            field.closest(".form-group");


        if (!parent) {
            return;
        }


        const oldMessage =
            parent.querySelector(
                ".validation-message"
            );


        if (oldMessage) {
            oldMessage.remove();
        }


        const error =
            document.createElement("div");


        error.className =
            "validation-message";


        error.textContent =
            message;


        parent.appendChild(error);
    }


    /* =====================================================
       PHONE VALIDATION
       ===================================================== */

    function validPhone(value) {

        const digits =
            String(value || "")
                .replace(/\D/g, "");

        /*
           Accept:
           10 digit Indian number
           12 digit number beginning with 91
           +91XXXXXXXXXX
        */

        if (digits.length === 10) {
            return true;
        }

        if (
            digits.length === 12 &&
            digits.startsWith("91")
        ) {
            return true;
        }

        return false;
    }


    /* =====================================================
       EMAIL VALIDATION
       ===================================================== */

    function validEmail(value) {

        if (!value) {
            return true;
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(value);
    }


    /* =====================================================
       FORM VALIDATION
       ===================================================== */

    function validateForm() {

        clearValidation();

        let valid = true;


        const name =
            customerName.value.trim();

        const phone =
            mobileNumber.value.trim();

        const alternate =
            alternateMobile.value.trim();

        const email =
            emailAddress.value.trim();

        const address =
            customerAddress.value.trim();

        const city =
            customerCity.value.trim();

        const state =
            customerState.value.trim();

        const pin =
            customerPin.value.trim();


        /* NAME */

        if (!name) {

            addError(
                customerName,
                "Customer name is required."
            );

            valid = false;
        }


        /* PHONE */

        if (!phone) {

            addError(
                mobileNumber,
                "Mobile number is required."
            );

            valid = false;

        } else if (!validPhone(phone)) {

            addError(
                mobileNumber,
                "Enter a valid 10-digit mobile number."
            );

            valid = false;
        }


        /* ALTERNATE PHONE */

        if (
            alternate &&
            !validPhone(alternate)
        ) {

            addError(
                alternateMobile,
                "Enter a valid alternate mobile number."
            );

            valid = false;
        }


        /* EMAIL */

        if (
            email &&
            !validEmail(email)
        ) {

            addError(
                emailAddress,
                "Enter a valid email address."
            );

            valid = false;
        }


        /* ADDRESS */

        if (!address) {

            addError(
                customerAddress,
                "Address is required."
            );

            valid = false;
        }


        /* CITY */

        if (!city) {

            addError(
                customerCity,
                "City is required."
            );

            valid = false;
        }


        /* STATE */

        if (!state) {

            addError(
                customerState,
                "State is required."
            );

            valid = false;
        }


        /* PIN */

        if (!pin) {

            addError(
                customerPin,
                "PIN code is required."
            );

            valid = false;

        } else if (
            !/^\d{6}$/.test(pin)
        ) {

            addError(
                customerPin,
                "PIN code must contain exactly 6 digits."
            );

            valid = false;
        }


        /* BUSINESS */

        const type =
            String(customerType.value || "")
                .trim()
                .toLowerCase();


        if (type === "business") {

            if (
                !companyName.value.trim()
            ) {

                addError(
                    companyName,
                    "Company name is required for business customers."
                );

                valid = false;
            }
        }


        return valid;
    }


    /* =====================================================
       CUSTOMER ID
       ===================================================== */

    function setPendingCustomerId() {

        if (customerId) {

            customerId.value =
                "Generated automatically";
        }
    }


    /* =====================================================
       NORMALIZE PHONE
       ===================================================== */

    function normalizePhone(value) {

        const digits =
            String(value || "")
                .replace(/\D/g, "");


        if (digits.length === 10) {

            return "+91" + digits;
        }


        if (
            digits.length === 12 &&
            digits.startsWith("91")
        ) {

            return "+" + digits;
        }


        return "";
    }


    /* =====================================================
       READ EDGE FUNCTION ERROR
       ===================================================== */

    async function getFunctionErrorMessage(error) {

        let message =
            error?.message ||
            "Unable to create the customer.";


        try {

            const response =
                error?.context;


            if (
                response &&
                typeof response.clone === "function"
            ) {

                const cloned =
                    response.clone();


                const contentType =
                    cloned.headers.get(
                        "content-type"
                    ) || "";


                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {

                    const body =
                        await cloned.json();


                    if (
                        body &&
                        typeof body === "object"
                    ) {

                        message =
                            body.error ||
                            body.message ||
                            body.msg ||
                            message;
                    }

                } else {

                    const text =
                        await cloned.text();


                    if (text) {
                        message = text;
                    }
                }
            }

        } catch (readError) {

            console.error(
                "Could not read Edge Function error:",
                readError
            );
        }


        /*
           Sometimes Supabase only gives the generic
           FunctionsError message.
        */

        if (
            message ===
            "Edge Function returned a non-2xx status code"
        ) {

            message =
                "Customer creation was rejected by the Supabase server. Check the browser console for the exact server error.";
        }


        return message;
    }


    /* =====================================================
       CREATE CUSTOMER
       ===================================================== */

    async function saveCustomer() {

        /* VALIDATE */

        if (!validateForm()) {

            showToast(
                "Check Details",
                "Please correct the highlighted fields.",
                true
            );

            return;
        }


        if (!supabase) {

            showToast(
                "Connection Error",
                "Supabase is not available.",
                true
            );

            return;
        }


        /* DISABLE SAVE BUTTON */

        if (saveCustomerButton) {

            saveCustomerButton.disabled =
                true;

            saveCustomerButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Saving Customer...
            `;
        }


        try {

            /* =================================================
               GET CURRENT SESSION
               ================================================= */

            const {
                data: sessionData,
                error: sessionError
            } =
                await supabase.auth.getSession();


            if (sessionError) {
                throw sessionError;
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


            /* =================================================
               VERIFY ACTIVE ADMIN
               ================================================= */

            const {
                data: adminProfile,
                error: adminError
            } =
                await supabase
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
                    "Active admin authorization was not found. Please log in again."
                );
            }


            /* =================================================
               READ FORM VALUES
               ================================================= */

            const name =
                customerName.value.trim();

            const phone =
                normalizePhone(
                    mobileNumber.value
                );

            const alternatePhone =
                alternateMobile.value.trim()
                    ? normalizePhone(
                        alternateMobile.value
                    )
                    : "";

            const email =
                emailAddress.value
                    .trim()
                    .toLowerCase();

            const statusValue =
                String(
                    customerStatus.value || "active"
                )
                    .trim()
                    .toLowerCase();

            const status =
                statusValue === "inactive"
                    ? "inactive"
                    : "active";

            const address =
                customerAddress.value.trim();

            const city =
                customerCity.value.trim();

            const state =
                customerState.value.trim();

            const pin =
                customerPin.value.trim();

            const typeValue =
                String(
                    customerType.value ||
                    "Individual"
                )
                    .trim()
                    .toLowerCase();

            const finalCustomerType =
                typeValue === "business"
                    ? "Business"
                    : "Individual";

            const finalCompanyName =
                finalCustomerType === "Business"
                    ? companyName.value.trim()
                    : "";

            const notes =
                customerNotes.value.trim();


            /* =================================================
               FINAL CUSTOMER DATA
               ================================================= */

            const customerData = {

                name: name,

                phone: phone,

                alternatePhone:
                    alternatePhone,

                email: email,

                status: status,

                address: address,

                city: city,

                state: state,

                pin: pin,

                customerType:
                    finalCustomerType,

                companyName:
                    finalCompanyName,

                notes: notes

                /*
                   IMPORTANT:
                   NO photo/Base64 here.
                */
            };


            console.log(
                "SSP: Customer request prepared."
            );


            /* =================================================
               CALL CREATE-CUSTOMER EDGE FUNCTION
               ================================================= */

            const {
                data,
                error
            } =
                await supabase.functions.invoke(
                    "create-customer",
                    {
                        body: customerData
                    }
                );


            /* =================================================
               EDGE FUNCTION ERROR
               ================================================= */

            if (error) {

                console.error(
                    "SSP create-customer error:",
                    error
                );


                const realMessage =
                    await getFunctionErrorMessage(
                        error
                    );


                throw new Error(
                    realMessage
                );
            }


            /* =================================================
               CHECK RESPONSE
               ================================================= */

            if (!data) {

                throw new Error(
                    "Supabase did not return a response."
                );
            }


            if (!data.success) {

                throw new Error(
                    data.error ||
                    data.message ||
                    "Customer could not be created."
                );
            }


            if (!data.customer_id) {

                throw new Error(
                    "Customer was created, but Supabase did not return the customer ID."
                );
            }


            /* =================================================
               DISPLAY CUSTOMER ID
               ================================================= */

            if (customerId) {

                customerId.value =
                    data.customer_id;
            }


            /* =================================================
               SUCCESS
               ================================================= */

            showToast(
                "Customer Saved",
                name +
                " has been added successfully.",
                false
            );


            if (saveCustomerButton) {

                saveCustomerButton.innerHTML = `
                    <i class="fa-solid fa-check"></i>
                    Customer Saved
                `;
            }


            /* =================================================
               REDIRECT
               ================================================= */

            setTimeout(
                function () {

                    window.location.href =
                        "customers.html";

                },
                1200
            );


        } catch (error) {

            console.error(
                "SSP New Customer error:",
                error
            );


            const message =
                error?.message ||
                "Unable to create the customer.";


            showToast(
                "Customer Not Saved",
                message,
                true
            );


            if (saveCustomerButton) {

                saveCustomerButton.disabled =
                    false;

                saveCustomerButton.innerHTML = `
                    <i class="fa-solid fa-floppy-disk"></i>
                    Save Customer
                `;
            }
        }
    }


    /* =====================================================
       SIDEBAR
       ===================================================== */

    function openSidebar() {

        if (sidebar) {

            sidebar.classList.add(
                "open"
            );
        }

        if (sidebarOverlay) {

            sidebarOverlay.classList.add(
                "show"
            );
        }
    }


    function closeSidebar() {

        if (sidebar) {

            sidebar.classList.remove(
                "open"
            );
        }

        if (sidebarOverlay) {

            sidebarOverlay.classList.remove(
                "show"
            );
        }
    }


    function toggleSidebar() {

        if (!sidebar) {
            return;
        }


        if (
            sidebar.classList.contains(
                "open"
            )
        ) {

            closeSidebar();

        } else {

            openSidebar();
        }
    }


    /* =====================================================
       REMOVE FIELD ERROR
       ===================================================== */

    function removeFieldError(event) {

        const field =
            event.target;


        field.classList.remove(
            "input-error"
        );


        const parent =
            field.closest(
                ".form-group"
            );


        if (!parent) {
            return;
        }


        const message =
            parent.querySelector(
                ".validation-message"
            );


        if (message) {

            message.remove();
        }
    }


    /* =====================================================
       INPUT RESTRICTIONS
       ===================================================== */

    function setupInputRestrictions() {

        /* MOBILE */

        if (mobileNumber) {

            mobileNumber.addEventListener(
                "input",
                function () {

                    this.value =
                        this.value.replace(
                            /[^\d+\-\s()]/g,
                            ""
                        );
                }
            );
        }


        /* ALTERNATE MOBILE */

        if (alternateMobile) {

            alternateMobile.addEventListener(
                "input",
                function () {

                    this.value =
                        this.value.replace(
                            /[^\d+\-\s()]/g,
                            ""
                        );
                }
            );
        }


        /* PIN */

        if (customerPin) {

            customerPin.addEventListener(
                "input",
                function () {

                    this.value =
                        this.value
                            .replace(
                                /\D/g,
                                ""
                            )
                            .slice(
                                0,
                                6
                            );
                }
            );
        }
    }


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

    /* FORM */

    if (customerForm) {

        customerForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                saveCustomer();
            }
        );
    }


    /* PHOTO */

    if (customerPhoto) {

        customerPhoto.addEventListener(
            "change",
            handlePhotoChange
        );
    }


    /* REMOVE PHOTO */

    if (removePhoto) {

        removePhoto.addEventListener(
            "click",
            resetPhoto
        );
    }


    /* CUSTOMER TYPE */

    if (customerType) {

        customerType.addEventListener(
            "change",
            updateCustomerType
        );
    }


    /* CANCEL */

    if (cancelCustomerButton) {

        cancelCustomerButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "customers.html";
            }
        );
    }


    /* CLOSE TOAST */

    if (closeToast) {

        closeToast.addEventListener(
            "click",
            hideToast
        );
    }


    /* MOBILE MENU */

    if (mobileMenuButton) {

        mobileMenuButton.addEventListener(
            "click",
            toggleSidebar
        );
    }


    /* SIDEBAR TOGGLE */

    if (sidebarToggle) {

        sidebarToggle.addEventListener(
            "click",
            closeSidebar
        );
    }


    /* SIDEBAR OVERLAY */

    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            closeSidebar
        );
    }


    /* =====================================================
       SIDEBAR LINKS
       ===================================================== */

    if (sidebar) {

        sidebar
            .querySelectorAll("a")
            .forEach(function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        if (
                            window.innerWidth <= 850
                        ) {

                            closeSidebar();
                        }
                    }
                );
            });
    }


    /* =====================================================
       LIVE VALIDATION CLEANUP
       ===================================================== */

    if (customerForm) {

        customerForm
            .querySelectorAll(
                "input, textarea, select"
            )
            .forEach(function (field) {

                field.addEventListener(
                    "input",
                    removeFieldError
                );

                field.addEventListener(
                    "change",
                    removeFieldError
                );
            });
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    setPendingCustomerId();

    resetPhoto();

    updateCustomerType();

    setupInputRestrictions();


    console.log(
        "SSP New Customer initialized with Supabase."
    );

});