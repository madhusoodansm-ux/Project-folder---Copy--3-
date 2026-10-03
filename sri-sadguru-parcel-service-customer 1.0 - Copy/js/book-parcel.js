/* =========================================================
   SRI SADGURU SIDDAROODA PARCEL SERVICE
   CUSTOMER PORTAL - BOOK PARCEL

   Complete booking flow:

   STEP 1  → Pickup Details
   STEP 2  → Delivery Details
   STEP 3  → Parcel Details
   STEP 4  → Review Booking
   STEP 5  → Confirmation

   Supabase:
   - Creates booking in public.bookings
   - Uses Supabase generated booking_id
   - Shows actual booking reference on Step 5

   IMPORTANT:
   HTML/design is not changed.
========================================================= */


/* =========================================================
   1. SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL =
    "https://kjudjgchpwkjgmiftesl.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_jYwrldmuukGL1sKdTlCL0A_mTFJD05r";


/* =========================================================
   2. CHECK SUPABASE
========================================================= */

if (!window.supabase) {

    console.error(
        "Supabase library was not loaded."
    );

} else {

    console.log(
        "Supabase library loaded successfully."
    );

}


let supabaseClient = null;


if (window.supabase) {

    supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );

}


/* =========================================================
   3. MAIN BOOKING APPLICATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        /* =================================================
           BASIC ELEMENTS
        ================================================= */

        const steps =
            document.querySelectorAll(
                ".booking-step"
            );

        const progressSteps =
            document.querySelectorAll(
                ".progress-step"
            );

        const progressLines =
            document.querySelectorAll(
                ".progress-line"
            );


        let currentStep = 1;

        let finalBookingData = null;

        let bookingSaved = false;

        let isSaving = false;


        /* =================================================
           HELPER - GET ELEMENT
        ================================================= */

        function getElement(id) {

            return document.getElementById(id);

        }


        /* =================================================
           HELPER - GET VALUE
        ================================================= */

        function getValue(id) {

            const element =
                getElement(id);

            if (!element) {

                return "";

            }

            return String(
                element.value ?? ""
            ).trim();

        }


        /* =================================================
           HELPER - GET NUMBER VALUE
        ================================================= */

        function getNumberValue(id) {

            const value =
                getValue(id);


            if (value === "") {

                return null;

            }


            const number =
                Number(value);


            return Number.isFinite(number)
                ? number
                : null;

        }


        /* =================================================
           HELPER - SELECT TEXT
        ================================================= */

        function getSelectedText(id) {

            const select =
                getElement(id);


            if (
                !select ||
                select.selectedIndex < 0
            ) {

                return "";

            }


            return (
                select.options[
                    select.selectedIndex
                ]?.text || ""
            ).trim();

        }


        /* =================================================
           HELPER - SET REVIEW VALUE
        ================================================= */

        function setReviewValue(
            id,
            value
        ) {

            const element =
                getElement(id);


            if (!element) {

                console.warn(
                    `Review element not found: ${id}`
                );

                return;

            }


            const cleanValue =
                value === null ||
                value === undefined ||
                String(value).trim() === ""
                    ? "—"
                    : String(value);


            element.textContent =
                cleanValue;

        }


        /* =================================================
           STEP NAVIGATION
        ================================================= */

        function showStep(stepNumber) {

            if (
                stepNumber < 1 ||
                stepNumber > 5
            ) {

                return;

            }


            currentStep =
                stepNumber;


            /* ---------------------------------------------
               Hide all steps
            --------------------------------------------- */

            steps.forEach(
                (step) => {

                    step.classList.remove(
                        "active"
                    );

                }
            );


            /* ---------------------------------------------
               Show selected step
            --------------------------------------------- */

            const selectedStep =
                getElement(
                    `step${stepNumber}`
                );


            if (selectedStep) {

                selectedStep.classList.add(
                    "active"
                );

            }


            /* ---------------------------------------------
               Progress steps
            --------------------------------------------- */

            progressSteps.forEach(
                (step) => {

                    const number =
                        Number(
                            step.dataset.step
                        );


                    step.classList.remove(
                        "active"
                    );

                    step.classList.remove(
                        "completed"
                    );


                    if (
                        number === stepNumber
                    ) {

                        step.classList.add(
                            "active"
                        );

                    }


                    if (
                        number < stepNumber
                    ) {

                        step.classList.add(
                            "completed"
                        );

                    }

                }
            );


            /* ---------------------------------------------
               Progress lines
            --------------------------------------------- */

            progressLines.forEach(
                (line, index) => {

                    const lineNumber =
                        index + 1;


                    line.classList.remove(
                        "completed"
                    );


                    if (
                        lineNumber < stepNumber
                    ) {

                        line.classList.add(
                            "completed"
                        );

                    }

                }
            );


            /* ---------------------------------------------
               Scroll to top
            --------------------------------------------- */

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }


        /* =================================================
           ERROR HANDLING
        ================================================= */

        function clearFieldError(field) {

            if (!field) {

                return;

            }


            field.classList.remove(
                "input-error"
            );


            field.style.borderColor =
                "";


            const errorElement =
                getElement(
                    `${field.id}Error`
                );


            if (errorElement) {

                errorElement.textContent =
                    "";

            }

        }


        function showFieldError(
            field,
            message
        ) {

            if (!field) {

                return;

            }


            field.classList.add(
                "input-error"
            );


            field.style.borderColor =
                "#dc2626";


            const errorElement =
                getElement(
                    `${field.id}Error`
                );


            if (errorElement) {

                errorElement.textContent =
                    message;

            }

        }


        /* =================================================
           FORM VALIDATION
        ================================================= */

        function validateForm(form) {

            if (!form) {

                console.error(
                    "Form not found."
                );

                return false;

            }


            let valid = true;


            /* ---------------------------------------------
               REQUIRED FIELDS
            --------------------------------------------- */

            const requiredFields =
                form.querySelectorAll(
                    "[required]"
                );


            requiredFields.forEach(
                (field) => {

                    clearFieldError(field);


                    const value =
                        String(
                            field.value ?? ""
                        ).trim();


                    if (!value) {

                        valid = false;


                        showFieldError(
                            field,
                            "This field is required."
                        );

                    }

                }
            );


            /* ---------------------------------------------
               PHONE VALIDATION
            --------------------------------------------- */

            const phoneFields =
                form.querySelectorAll(
                    'input[type="tel"]'
                );


            phoneFields.forEach(
                (field) => {

                    const phone =
                        String(
                            field.value ?? ""
                        ).trim();


                    if (
                        phone !== "" &&
                        !/^[0-9]{10}$/.test(phone)
                    ) {

                        valid = false;


                        showFieldError(
                            field,
                            "Enter a valid 10-digit mobile number."
                        );

                    }

                }
            );


            /* ---------------------------------------------
               GMAIL VALIDATION
            --------------------------------------------- */

            const emailFields =
                form.querySelectorAll(
                    'input[type="email"]'
                );


            emailFields.forEach(
                (field) => {

                    const email =
                        String(
                            field.value ?? ""
                        ).trim();


                    if (email === "") {

                        return;

                    }


                    const gmailPattern =
                        /^[a-zA-Z0-9._%+-]+@gmail\.com$/;


                    if (
                        !gmailPattern.test(
                            email
                        )
                    ) {

                        valid = false;


                        showFieldError(
                            field,
                            "Enter a valid Gmail address ending with @gmail.com."
                        );

                    }

                }
            );


            /* ---------------------------------------------
               PIN CODE VALIDATION
            --------------------------------------------- */

            const pinFields =
                form.querySelectorAll(
                    'input[id*="Pincode"]'
                );


            pinFields.forEach(
                (field) => {

                    const pin =
                        String(
                            field.value ?? ""
                        ).trim();


                    if (
                        pin !== "" &&
                        !/^[0-9]{6}$/.test(pin)
                    ) {

                        valid = false;


                        showFieldError(
                            field,
                            "Enter a valid 6-digit PIN code."
                        );

                    }

                }
            );


            /* ---------------------------------------------
               PIECES VALIDATION
            --------------------------------------------- */

            const piecesField =
                getElement(
                    "parcelPieces"
                );


            if (
                piecesField &&
                piecesField.value !== ""
            ) {

                const pieces =
                    Number(
                        piecesField.value
                    );


                if (
                    !Number.isFinite(pieces) ||
                    pieces < 1 ||
                    !Number.isInteger(pieces)
                ) {

                    valid = false;


                    showFieldError(
                        piecesField,
                        "Pieces must be at least 1."
                    );

                }

            }


            /* ---------------------------------------------
               WEIGHT VALIDATION
            --------------------------------------------- */

            const weightField =
                getElement(
                    "parcelWeight"
                );


            if (
                weightField &&
                weightField.value !== ""
            ) {

                const weight =
                    Number(
                        weightField.value
                    );


                if (
                    !Number.isFinite(weight) ||
                    weight <= 0
                ) {

                    valid = false;


                    showFieldError(
                        weightField,
                        "Weight must be greater than 0."
                    );

                }

            }


            /* ---------------------------------------------
               DIMENSION VALIDATION
            --------------------------------------------- */

            const lengthField =
                getElement(
                    "parcelLength"
                );

            const widthField =
                getElement(
                    "parcelWidth"
                );

            const heightField =
                getElement(
                    "parcelHeight"
                );


            const length =
                getNumberValue(
                    "parcelLength"
                );

            const width =
                getNumberValue(
                    "parcelWidth"
                );

            const height =
                getNumberValue(
                    "parcelHeight"
                );


            const dimensionValues =
                [
                    length,
                    width,
                    height
                ];


            const someDimensionsEntered =
                dimensionValues.some(
                    (value) =>
                        value !== null
                );


            if (someDimensionsEntered) {

                const allDimensionsEntered =
                    dimensionValues.every(
                        (value) =>
                            value !== null
                    );


                if (!allDimensionsEntered) {

                    valid = false;


                    [
                        lengthField,
                        widthField,
                        heightField
                    ].forEach(
                        (field) => {

                            if (field) {

                                showFieldError(
                                    field,
                                    "Enter all three dimensions or leave all three empty."
                                );

                            }

                        }
                    );

                } else {

                    [
                        lengthField,
                        widthField,
                        heightField
                    ].forEach(
                        (field) => {

                            if (
                                field &&
                                Number(field.value) <= 0
                            ) {

                                valid = false;


                                showFieldError(
                                    field,
                                    "Dimension must be greater than 0."
                                );

                            }

                        }
                    );

                }

            }


            /* ---------------------------------------------
               FINAL VALIDATION MESSAGE
            --------------------------------------------- */

            if (!valid) {

                alert(
                    "Please check the highlighted fields and enter the required information."
                );

            }


            return valid;

        }


        /* =================================================
           CLEAR ERRORS WHILE TYPING
        ================================================= */

        document
            .querySelectorAll(
                "input, textarea, select"
            )
            .forEach(
                (field) => {

                    field.addEventListener(
                        "input",
                        () => {

                            clearFieldError(
                                field
                            );

                        }
                    );


                    field.addEventListener(
                        "change",
                        () => {

                            clearFieldError(
                                field
                            );

                        }
                    );

                }
            );


        /* =================================================
           ONLY NUMBERS FOR PHONE AND PIN
        ================================================= */

        document
            .querySelectorAll(
                'input[type="tel"], input[id*="Pincode"]'
            )
            .forEach(
                (input) => {

                    input.addEventListener(
                        "input",
                        () => {

                            input.value =
                                input.value.replace(
                                    /[^0-9]/g,
                                    ""
                                );

                        }
                    );

                }
            );


        /* =================================================
           UPDATE STEP 4 REVIEW
        ================================================= */

        function updateReview() {


            /* ---------------------------------------------
               PICKUP DETAILS
            --------------------------------------------- */

            setReviewValue(
                "reviewPickupName",
                getValue("pickupName")
            );


            setReviewValue(
                "reviewPickupPhone",
                getValue("pickupPhone")
            );


            setReviewValue(
                "reviewPickupEmail",
                getValue("pickupEmail")
            );


            setReviewValue(
                "reviewPickupAddress",
                getValue("pickupAddress")
            );


            setReviewValue(
                "reviewPickupCity",
                getValue("pickupCity")
            );


            setReviewValue(
                "reviewPickupPincode",
                getValue("pickupPincode")
            );


            /* ---------------------------------------------
               DELIVERY DETAILS
            --------------------------------------------- */

            setReviewValue(
                "reviewReceiverName",
                getValue("receiverName")
            );


            setReviewValue(
                "reviewReceiverPhone",
                getValue("receiverPhone")
            );


            setReviewValue(
                "reviewReceiverEmail",
                getValue("receiverEmail")
            );


            setReviewValue(
                "reviewDeliveryAddress",
                getValue("deliveryAddress")
            );


            setReviewValue(
                "reviewDeliveryCity",
                getValue("deliveryCity")
            );


            setReviewValue(
                "reviewDeliveryDistrict",
                getValue("deliveryDistrict")
            );


            setReviewValue(
                "reviewDeliveryState",
                getValue("deliveryState")
            );


            setReviewValue(
                "reviewDeliveryPincode",
                getValue("deliveryPincode")
            );


            setReviewValue(
                "reviewDeliveryLandmark",
                getValue("deliveryLandmark")
            );


            /* ---------------------------------------------
               PARCEL DETAILS
            --------------------------------------------- */

            setReviewValue(
                "reviewParcelName",
                getValue("parcelName")
            );


            setReviewValue(
                "reviewParcelType",
                getSelectedText("parcelType")
            );


            setReviewValue(
                "reviewParcelDescription",
                getValue("parcelDescription")
            );


            setReviewValue(
                "reviewParcelPieces",
                getValue("parcelPieces")
            );


            /* ---------------------------------------------
               WEIGHT
            --------------------------------------------- */

            const weight =
                getValue("parcelWeight");


            setReviewValue(
                "reviewParcelWeight",
                weight
                    ? `${weight} kg`
                    : "—"
            );


            /* ---------------------------------------------
               DIMENSIONS
            --------------------------------------------- */

            const length =
                getValue("parcelLength");

            const width =
                getValue("parcelWidth");

            const height =
                getValue("parcelHeight");


            let dimensions =
                "—";


            if (
                length &&
                width &&
                height
            ) {

                dimensions =
                    `${length} × ${width} × ${height} cm`;

            }


            setReviewValue(
                "reviewParcelDimensions",
                dimensions
            );


            /* ---------------------------------------------
               SPECIAL INSTRUCTIONS
            --------------------------------------------- */

            setReviewValue(
                "reviewSpecialInstructions",
                getValue("specialInstructions")
            );


            console.log(
                "Step 4 review updated successfully."
            );

        }


        /* =================================================
           CREATE BOOKING DATA
        ================================================= */

        function createBookingData() {


            const bookingData = {


                /* -----------------------------------------
                   CUSTOMER
                ----------------------------------------- */

                customer_id:
                    null,


                /* -----------------------------------------
                   PICKUP
                ----------------------------------------- */

                pickup_name:
                    getValue("pickupName"),

                pickup_phone:
                    getValue("pickupPhone"),

                pickup_email:
                    getValue("pickupEmail"),

                pickup_address:
                    getValue("pickupAddress"),

                pickup_city:
                    getValue("pickupCity"),

                pickup_pincode:
                    getValue("pickupPincode"),


                /* -----------------------------------------
                   RECEIVER
                ----------------------------------------- */

                receiver_name:
                    getValue("receiverName"),

                receiver_phone:
                    getValue("receiverPhone"),

                receiver_email:
                    getValue("receiverEmail"),


                /* -----------------------------------------
                   DELIVERY
                ----------------------------------------- */

                delivery_address:
                    getValue("deliveryAddress"),

                delivery_city:
                    getValue("deliveryCity"),

                delivery_district:
                    getValue("deliveryDistrict"),

                delivery_state:
                    getValue("deliveryState"),

                delivery_pincode:
                    getValue("deliveryPincode"),

                delivery_landmark:
                    getValue("deliveryLandmark"),


                /* -----------------------------------------
                   PARCEL
                ----------------------------------------- */

                parcel_name:
                    getValue("parcelName") ||
                    "Parcel",

                parcel_type:
                    getValue("parcelType"),

                parcel_description:
                    getValue("parcelDescription"),


                /* -----------------------------------------
                   NUMERIC PARCEL DATA
                ----------------------------------------- */

                parcel_weight:
                    getNumberValue(
                        "parcelWeight"
                    ),

                parcel_length:
                    getNumberValue(
                        "parcelLength"
                    ),

                parcel_width:
                    getNumberValue(
                        "parcelWidth"
                    ),

                parcel_height:
                    getNumberValue(
                        "parcelHeight"
                    ),


                /* -----------------------------------------
                   PIECES
                ----------------------------------------- */

                pieces:
                    getNumberValue(
                        "parcelPieces"
                    ) || 1,


                /* -----------------------------------------
                   OTHER
                ----------------------------------------- */

                special_instructions:
                    getValue(
                        "specialInstructions"
                    ),


                /* -----------------------------------------
                   BOOKING STATUS
                ----------------------------------------- */

                status:
                    "pending",


                /* -----------------------------------------
                   CALL CONFIRMATION
                ----------------------------------------- */

                call_confirmation_status:
                    "required",

                call_confirmed_at:
                    null,

                call_confirmed_by:
                    null,


                /* -----------------------------------------
                   DRIVER
                ----------------------------------------- */

                driver_id:
                    null,


                /* -----------------------------------------
                   SERVICE CHARGE
                ----------------------------------------- */

                service_charge:
                    null,


                /* -----------------------------------------
                   PAYMENT
                ----------------------------------------- */

                payment_status:
                    "pending",

                payment_method:
                    null,


                /* -----------------------------------------
                   ADMIN
                ----------------------------------------- */

                admin_notes:
                    null

            };


            return bookingData;

        }


        /* =================================================
           SAVE BOOKING TO SUPABASE
        ================================================= */

        async function saveBookingToSupabase(
            bookingData
        ) {


            if (!supabaseClient) {

                throw new Error(
                    "Supabase is not available. Please check the Supabase script in the HTML."
                );

            }


            console.log(
                "Sending booking to Supabase..."
            );


            console.log(
                "Booking data:",
                bookingData
            );


            const {
                data: authData,
                error: authError
            } =
                await supabaseClient.auth.getUser();

            if (
                !authError &&
                authData?.user?.id
            ) {

                bookingData.customer_id =
                    authData.user.id;

            }


            const {
                data,
                error
            } =
                await supabaseClient
                    .from("bookings")
                    .insert(
                        [bookingData]
                    )
                    .select(
                        "id, booking_id"
                    )
                    .single();


            if (error) {

                console.error(
                    "Supabase booking error:",
                    error
                );


                throw error;

            }


            if (!data) {

                throw new Error(
                    "Supabase did not return booking information."
                );

            }


            console.log(
                "Booking successfully created:",
                data
            );


            return data;

        }


        /* =================================================
           SET BOOKING REFERENCE
        ================================================= */

        function setBookingReference(
            bookingId
        ) {

            const referenceElement =
                getElement(
                    "bookingReference"
                );


            if (!referenceElement) {

                console.warn(
                    "bookingReference element not found."
                );

                return;

            }


            referenceElement.textContent =
                bookingId ||
                "SSP-PENDING";

        }


        /* =================================================
           SHOW SAVING STATE
        ================================================= */

        function setConfirmButtonState(
            saving
        ) {

            const confirmButton =
                document.querySelector(
                    '.next-button[data-next="5"]'
                );


            if (!confirmButton) {

                return;

            }


            if (saving) {

                confirmButton.disabled =
                    true;

                confirmButton.dataset.originalText =
                    confirmButton.innerHTML;

                confirmButton.innerHTML =
                    "Creating Booking...";

            } else {

                confirmButton.disabled =
                    false;


                if (
                    confirmButton.dataset.originalText
                ) {

                    confirmButton.innerHTML =
                        confirmButton.dataset.originalText;

                }

            }

        }


        /* =================================================
           NEXT BUTTONS
        ================================================= */

        document
            .querySelectorAll(
                ".next-button"
            )
            .forEach(
                (button) => {


                    button.addEventListener(
                        "click",
                        async () => {


                            const nextStep =
                                Number(
                                    button.dataset.next
                                );


                            /* =================================
                               STEP 1 → STEP 2
                            ================================= */

                            if (
                                currentStep === 1
                            ) {

                                const pickupForm =
                                    getElement(
                                        "pickupForm"
                                    );


                                if (
                                    !validateForm(
                                        pickupForm
                                    )
                                ) {

                                    return;

                                }

                            }


                            /* =================================
                               STEP 2 → STEP 3
                            ================================= */

                            if (
                                currentStep === 2
                            ) {

                                const deliveryForm =
                                    getElement(
                                        "deliveryForm"
                                    );


                                if (
                                    !validateForm(
                                        deliveryForm
                                    )
                                ) {

                                    return;

                                }

                            }


                            /* =================================
                               STEP 3 → STEP 4
                            ================================= */

                            if (
                                currentStep === 3
                            ) {

                                const parcelForm =
                                    getElement(
                                        "parcelForm"
                                    );


                                if (
                                    !validateForm(
                                        parcelForm
                                    )
                                ) {

                                    return;

                                }


                                /*
                                 * Update Step 4 preview
                                 */

                                updateReview();


                                /*
                                 * Prepare booking data
                                 * but DO NOT save yet.
                                 */

                                finalBookingData =
                                    createBookingData();


                                console.log(
                                    "Booking prepared for review:",
                                    finalBookingData
                                );

                            }


                            /* =================================
                               STEP 4 → STEP 5
                            ================================= */

                            if (
                                currentStep === 4
                            ) {


                                /*
                                 * Prevent double-click
                                 */

                                if (isSaving) {

                                    return;

                                }


                                /*
                                 * If already saved,
                                 * do not insert again.
                                 */

                                if (bookingSaved) {

                                    showStep(5);

                                    return;

                                }


                                /*
                                 * Make sure review is
                                 * completely updated.
                                 */

                                updateReview();


                                /*
                                 * Create fresh booking data.
                                 */

                                finalBookingData =
                                    createBookingData();


                                /*
                                 * Start saving
                                 */

                                isSaving =
                                    true;


                                setConfirmButtonState(
                                    true
                                );


                                try {


                                    console.log(
                                        "Creating booking in Supabase..."
                                    );


                                    /*
                                     * REAL SUPABASE INSERT
                                     */

                                    const savedBooking =
                                        await saveBookingToSupabase(
                                            finalBookingData
                                        );


                                    /*
                                     * Save returned booking ID
                                     */

                                    bookingSaved =
                                        true;


                                    /*
                                     * Store returned data
                                     * for later use.
                                     */

                                    finalBookingData.id =
                                        savedBooking.id;

                                    finalBookingData.booking_id =
                                        savedBooking.booking_id;


                                    /*
                                     * Display ACTUAL
                                     * Supabase booking ID
                                     */

                                    setBookingReference(
                                        savedBooking.booking_id
                                    );


                                    console.log(
                                        "Final booking:",
                                        savedBooking
                                    );


                                    /*
                                     * Move to Step 5
                                     */

                                    showStep(5);


                                } catch (error) {


                                    console.error(
                                        "Booking creation failed:",
                                        error
                                    );


                                    /*
                                     * Keep user on Step 4.
                                     */

                                    bookingSaved =
                                        false;


                                    let message =
                                        "Unable to create the booking.";


                                    /*
                                     * Supabase common errors
                                     */

                                    if (
                                        error?.message
                                    ) {

                                        message +=
                                            `\n\n${error.message}`;

                                    }


                                    if (
                                        error?.details
                                    ) {

                                        message +=
                                            `\n${error.details}`;

                                    }


                                    if (
                                        error?.hint
                                    ) {

                                        message +=
                                            `\n${error.hint}`;

                                    }


                                    alert(
                                        message
                                    );


                                } finally {


                                    isSaving =
                                        false;


                                    setConfirmButtonState(
                                        false
                                    );

                                }


                                /*
                                 * Do NOT execute
                                 * showStep(nextStep)
                                 * here because Step 4
                                 * requires async saving.
                                 */

                                return;

                            }


                            /* =================================
                               NORMAL STEP NAVIGATION
                            ================================= */

                            showStep(
                                nextStep
                            );

                        }
                    );

                }
            );


        /* =================================================
           BACK BUTTONS
        ================================================= */

        document
            .querySelectorAll(
                ".back-step-button"
            )
            .forEach(
                (button) => {

                    button.addEventListener(
                        "click",
                        () => {

                            const previousStep =
                                Number(
                                    button.dataset.back
                                );


                            showStep(
                                previousStep
                            );

                        }
                    );

                }
            );


        /* =================================================
           EDIT BUTTONS
        ================================================= */

        document
            .querySelectorAll(
                ".edit-step-button"
            )
            .forEach(
                (button) => {

                    button.addEventListener(
                        "click",
                        () => {

                            const editStep =
                                Number(
                                    button.dataset.edit
                                );


                            showStep(
                                editStep
                            );

                        }
                    );

                }
            );


        /* =================================================
           DASHBOARD BUTTON
        ================================================= */

        const goDashboardButton =
            getElement(
                "goDashboardButton"
            );


        if (goDashboardButton) {

            goDashboardButton.addEventListener(
                "click",
                () => {

                    window.location.href =
                        "dashboard.html";

                }
            );

        }


        /* =================================================
           INITIAL STEP
        ================================================= */

        showStep(1);


        /* =================================================
           DEBUG INFORMATION
        ================================================= */

        console.log(
            "SSP Customer Book Parcel initialized successfully."
        );


        console.log(
            "Current step:",
            currentStep
        );


    }
);