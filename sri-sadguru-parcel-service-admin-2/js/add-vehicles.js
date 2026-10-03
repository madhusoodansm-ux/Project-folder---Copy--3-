/* =========================================================
   ADD VEHICLES
   Sri Sadguru Siddarooda Parcel Service

   SUPABASE VERSION

   Database tables used:
   - public.vehicles
   - public.drivers

   No localStorage is used.
   No demo vehicle data is used.

   ========================================================= */

"use strict";


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getSupabase() {

    if (!window.supabaseClient) {

        console.error(
            "Supabase client is not available."
        );

        return null;
    }

    return window.supabaseClient;
}

const editVehicleId =
    new URLSearchParams(
        window.location.search
    ).get("edit");

let vehicleBeingEdited = null;


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function checkAdminAuthentication() {

    /*
     * admin-auth.js already contains requireAdminAuth().
     *
     * If it is loaded, use it.
     * This prevents unauthorized users from opening
     * the Add Vehicle page.
     */

    if (
        typeof requireAdminAuth === "function"
    ) {

        try {

            await requireAdminAuth();

            return true;

        } catch (error) {

            console.error(
                "Admin authentication failed:",
                error
            );

            return false;
        }
    }


    /*
     * Fallback authentication check.
     */

    const supabase =
        getSupabase();

    if (!supabase) {
        return false;
    }


    const {
        data,
        error
    } =
        await supabase.auth.getSession();


    if (
        error ||
        !data ||
        !data.session
    ) {

        window.location.href =
            "../index.html";

        return false;
    }


    return true;
}


/* =========================================================
   DRIVER HELPERS
   ========================================================= */

function getDriverName(driver) {

    if (!driver) {
        return "Unnamed Driver";
    }

    return (
        driver.name ||
        "Unnamed Driver"
    );
}


/* =========================================================
   LOAD DRIVERS FROM SUPABASE
   ========================================================= */

async function loadDrivers() {

    const select =
        $("assignedDriver");

    if (!select) {
        return;
    }


    const supabase =
        getSupabase();

    if (!supabase) {

        showMessage(
            "Supabase connection is not available."
        );

        return;
    }


    /*
     * Loading state.
     */

    select.innerHTML = "";

    const loadingOption =
        document.createElement("option");

    loadingOption.value = "";

    loadingOption.textContent =
        "Loading drivers...";

    loadingOption.disabled = true;

    select.appendChild(
        loadingOption
    );


    const {
        data: drivers,
        error
    } =
        await supabase
            .from("drivers")
            .select(
                `
                id,
                driver_id,
                name,
                phone,
                status,
                vehicle_assigned
                `
            )
            .order(
                "name",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Unable to load drivers:",
            error
        );


        select.innerHTML = "";

        const errorOption =
            document.createElement("option");

        errorOption.value = "";

        errorOption.textContent =
            "Unable to load drivers";

        errorOption.disabled = true;

        select.appendChild(
            errorOption
        );


        showMessage(
            "Drivers could not be loaded from Supabase."
        );

        return;
    }


    /*
     * Clear loading option.
     */

    select.innerHTML = "";


    /*
     * No driver option.
     */

    const noneOption =
        document.createElement("option");

    noneOption.value = "";

    noneOption.textContent =
        "No Driver Assigned";

    select.appendChild(
        noneOption
    );


    /*
     * Add real database drivers.
     */

    (drivers || []).forEach(
        (driver) => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                driver.id;


            const driverName =
                getDriverName(driver);


            const driverBusinessId =
                driver.driver_id ||
                "";


            option.textContent =
                driverBusinessId
                    ? `${driverName} (${driverBusinessId})`
                    : driverName;


            /*
             * Store useful information on
             * the option without changing
             * the database structure.
             */

            option.dataset.driverId =
                driver.driver_id || "";


            option.dataset.status =
                driver.status || "";


            select.appendChild(
                option
            );
        }
    );


    /*
     * If there are no drivers.
     */

    if (
        !drivers ||
        drivers.length === 0
    ) {

        const noDriverOption =
            document.createElement(
                "option"
            );

        noDriverOption.value = "";

        noDriverOption.textContent =
            "No drivers available";

        noDriverOption.disabled = true;

        select.appendChild(
            noDriverOption
        );
    }
}


/* =========================================================
   GENERATE VEHICLE ID
   ========================================================= */

async function generateVehicleId() {

    const supabase =
        getSupabase();

    if (!supabase) {
        return "";
    }


    /*
     * Read existing human-readable
     * vehicle IDs.
     *
     * Example:
     * VEH-0001
     * VEH-0002
     * VEH-0003
     */

    const {
        data: vehicles,
        error
    } =
        await supabase
            .from("vehicles")
            .select("vehicle_id");


    if (error) {

        console.error(
            "Unable to generate vehicle ID:",
            error
        );

        return "";
    }


    let highestNumber =
        0;


    (vehicles || []).forEach(
        (vehicle) => {

            const match =
                String(
                    vehicle.vehicle_id || ""
                ).match(
                    /^VEH-(\d+)$/i
                );


            if (!match) {
                return;
            }


            const number =
                Number.parseInt(
                    match[1],
                    10
                );


            if (
                Number.isFinite(number) &&
                number > highestNumber
            ) {

                highestNumber =
                    number;
            }
        }
    );


    let nextNumber =
        highestNumber + 1;


    let vehicleId =
        `VEH-${String(
            nextNumber
        ).padStart(4, "0")}`;


    /*
     * Double-check against the database.
     */

    while (true) {

        const {
            data,
            error: checkError
        } =
            await supabase
                .from("vehicles")
                .select("id")
                .eq(
                    "vehicle_id",
                    vehicleId
                )
                .maybeSingle();


        if (checkError) {

            console.error(
                "Vehicle ID check failed:",
                checkError
            );

            return "";
        }


        if (!data) {
            break;
        }


        nextNumber += 1;


        vehicleId =
            `VEH-${String(
                nextNumber
            ).padStart(4, "0")}`;
    }


    return vehicleId;
}


/* =========================================================
   SET VEHICLE ID
   ========================================================= */

async function setVehicleId() {

    const input =
        $("vehicleId");

    if (!input) {
        return;
    }

    if (vehicleBeingEdited) {

        input.value =
            vehicleBeingEdited.vehicle_id || "";

        return;

    }


    /*
     * Show temporary value.
     */

    input.value =
        "Generating...";


    const vehicleId =
        await generateVehicleId();


    if (!vehicleId) {

        input.value = "";

        showMessage(
            "Vehicle ID could not be generated."
        );

        return;
    }


    input.value =
        vehicleId;
}


/* =========================================================
   LOAD VEHICLE FOR EDITING
   ========================================================= */

async function loadVehicleForEdit() {

    const supabase =
        getSupabase();

    if (!supabase || !editVehicleId) {
        return false;
    }

    const {
        data,
        error
    } = await supabase
        .from("vehicles")
        .select("*")
        .eq("vehicle_id", editVehicleId)
        .maybeSingle();

    if (error) {

        console.error(
            "Unable to load vehicle for editing:",
            error
        );

        alert(
            `Unable to load this vehicle: ${error.message}`
        );

        window.location.href =
            "vehicles.html";

        return false;

    }

    if (!data) {

        alert(
            "The vehicle to edit could not be found."
        );

        window.location.href =
            "vehicles.html";

        return false;

    }

    vehicleBeingEdited =
        data;

    const values = {
        vehicleId: data.vehicle_id,
        vehicleAssigned:
            data.vehicle_assigned || data.vehicle_id,
        vehicleNumber: data.vehicle_number,
        vehicleType:
            data.custom_vehicle_type
                ? "Custom"
                : data.vehicle_type,
        customVehicleType:
            data.custom_vehicle_type,
        assignedDriver: data.assigned_driver_id,
        vehicleStatus:
            data.vehicle_status === "on_delivery"
                ? "On Delivery"
                : data.vehicle_status === "inactive"
                    ? "Offline"
                    : data.vehicle_status
                        ? data.vehicle_status
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, char => char.toUpperCase())
                        : "Available",
        vehicleModel: data.vehicle_model,
        manufacturer: data.manufacturer,
        manufacturingYear: data.manufacturing_year,
        rcNumber: data.rc_number,
        rcExpiry: data.rc_expiry,
        insuranceNumber: data.insurance_number,
        insuranceExpiry: data.insurance_expiry,
        permitNumber: data.permit_number,
        permitExpiry: data.permit_expiry,
        pollutionNumber: data.pollution_number,
        pollutionExpiry: data.pollution_expiry,
        currentLocation: data.current_location,
        gpsTracking: data.gps_tracking,
        gpsDeviceId: data.gps_device_id,
        loadCapacity: data.load_capacity,
        seatingCapacity: data.seating_capacity,
        fuelType: data.fuel_type,
        currentOdometer: data.current_odometer,
        lastServiceDate: data.last_service_date,
        nextServiceDate: data.next_service_date,
        nextServiceAt: data.next_service_at,
        maintenanceStatus: data.maintenance_status,
        notes: data.notes
    };

    Object.entries(values).forEach(
        ([id, value]) => {

            const input =
                $(id);

            if (input) {

                const stringValue =
                    value === null || value === undefined
                        ? ""
                        : String(value);

                input.value =
                    input.type === "date"
                        ? stringValue.slice(0, 10)
                        : stringValue;

            }

        }
    );

    handleVehicleTypeChange();

    const heading =
        document.querySelector(
            ".page-heading h1"
        );

    if (heading) {
        heading.textContent =
            "Edit Vehicle";
    }

    const submitButton =
        $("vehicleForm")?.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {
        submitButton.lastChild.textContent =
            " Update Vehicle";
    }

    return true;

}


/* =========================================================
   NORMALIZE VEHICLE NUMBER
   ========================================================= */

function normalizeVehicleNumber(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toUpperCase()
        .replace(
            /\s+/g,
            " "
        );
}


/* =========================================================
   CHECK DUPLICATE VEHICLE NUMBER
   ========================================================= */

async function vehicleNumberExists(
    vehicleNumber,
    excludedVehicleId = ""
) {

    const supabase =
        getSupabase();

    if (!supabase) {
        return false;
    }


    const normalized =
        normalizeVehicleNumber(
            vehicleNumber
        );


    if (!normalized) {
        return false;
    }


    let query =
        supabase
            .from("vehicles")
            .select("id")
            .eq(
                "vehicle_number",
                normalized
            );

    if (excludedVehicleId) {

        query =
            query.neq(
                "id",
                excludedVehicleId
            );

    }

    const {
        data,
        error
    } = await query.maybeSingle();


    if (error) {

        console.error(
            "Duplicate vehicle check failed:",
            error
        );


        /*
         * Do not silently allow a duplicate
         * when the database check itself failed.
         */

        throw error;
    }


    return Boolean(data);
}


/* =========================================================
   GET SELECTED DRIVER
   ========================================================= */

async function getSelectedDriver(
    driverId
) {

    if (!driverId) {
        return null;
    }


    const supabase =
        getSupabase();

    if (!supabase) {
        return null;
    }


    const {
        data: driver,
        error
    } =
        await supabase
            .from("drivers")
            .select(
                `
                id,
                driver_id,
                name,
                phone,
                status,
                vehicle_assigned
                `
            )
            .eq(
                "id",
                driverId
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Unable to get selected driver:",
            error
        );

        return null;
    }


    return driver || null;
}


/* =========================================================
   READ FORM DATA
   ========================================================= */

function getFormData() {

    const vehicleTypeElement =
        $("vehicleType");

    const customVehicleTypeElement =
        $("customVehicleType");


    const selectedVehicleType =
        vehicleTypeElement
            ? vehicleTypeElement.value.trim()
            : "";


    const customVehicleType =
        customVehicleTypeElement
            ? customVehicleTypeElement.value.trim()
            : "";


    const finalVehicleType =
        selectedVehicleType === "Custom"
            ? customVehicleType
            : selectedVehicleType;


    return {

        vehicleId:
            $("vehicleId")
                ? $("vehicleId").value.trim()
                : "",

        vehicleAssigned:
            $("vehicleAssigned")
                ? $("vehicleAssigned").value.trim()
                : "",

        vehicleNumber:
            $("vehicleNumber")
                ? normalizeVehicleNumber(
                    $("vehicleNumber").value
                )
                : "",

        vehicleType:
            finalVehicleType,

        customVehicleType:
            selectedVehicleType === "Custom"
                ? customVehicleType
                : null,

        assignedDriverId:
            $("assignedDriver")
                ? $("assignedDriver").value
                : "",

        vehicleStatus:
            $("vehicleStatus")
                ? $("vehicleStatus").value
                : "Available",

        vehicleModel:
            $("vehicleModel")?.value.trim() || "",
        manufacturer:
            $("manufacturer")?.value.trim() || "",
        manufacturingYear:
            $("manufacturingYear")?.value || "",
        rcNumber:
            $("rcNumber")?.value.trim() || "",
        rcExpiry:
            $("rcExpiry")?.value || "",
        insuranceNumber:
            $("insuranceNumber")?.value.trim() || "",
        insuranceExpiry:
            $("insuranceExpiry")?.value || "",
        permitNumber:
            $("permitNumber")?.value.trim() || "",
        permitExpiry:
            $("permitExpiry")?.value || "",
        pollutionNumber:
            $("pollutionNumber")?.value.trim() || "",
        pollutionExpiry:
            $("pollutionExpiry")?.value || "",
        currentLocation:
            $("currentLocation")?.value.trim() || "",
        gpsTracking:
            $("gpsTracking")?.value || "",
        gpsDeviceId:
            $("gpsDeviceId")?.value.trim() || "",
        loadCapacity:
            $("loadCapacity")?.value || "",
        seatingCapacity:
            $("seatingCapacity")?.value || "",
        fuelType:
            $("fuelType")?.value || "",
        currentOdometer:
            $("currentOdometer")?.value || "",
        lastServiceDate:
            $("lastServiceDate")?.value || "",
        nextServiceDate:
            $("nextServiceDate")?.value || "",
        nextServiceAt:
            $("nextServiceAt")?.value || "",
        maintenanceStatus:
            $("maintenanceStatus")?.value || "",
        notes:
            $("notes")?.value.trim() || ""
    };
}


function toDatabaseVehicleStatus(status) {

    switch (
        String(status || "")
            .trim()
            .toLowerCase()
            .replace(/_/g, " ")
    ) {

        case "assigned":
            return "assigned";

        case "on delivery":
            return "on_delivery";

        case "offline":
        case "inactive":
            return "inactive";

        case "maintenance":
            return "maintenance";

        case "available":
        default:
            return "available";
    }

}


function optionalNumber(
    value,
    label,
    integer = false
) {

    if (value === "") {
        return null;
    }

    const number =
        Number(value);

    if (
        !Number.isFinite(number) ||
        (integer && !Number.isInteger(number))
    ) {

        throw new Error(
            `${label} must be a valid ${integer ? "whole number" : "number"}.`
        );

    }

    return number;

}


/* =========================================================
   VALIDATE FORM
   ========================================================= */

async function validateForm(
    data
) {

if (!data.vehicleAssigned) {

    alert(
        "Please enter Vehicle Assigned."
    );

    $("vehicleAssigned").focus();

    return false;
}

    /*
     * Vehicle Number
     */

    if (!data.vehicleNumber) {

        alert(
            "Please enter Vehicle Number."
        );

        $("vehicleNumber").focus();

        return false;
    }


    /*
     * Vehicle Type
     */

    if (!data.vehicleType) {

        alert(
            "Please select Vehicle Type."
        );

        $("vehicleType").focus();

        return false;
    }


    /*
     * Custom Vehicle Type
     */

    if (
        $("vehicleType").value === "Custom" &&
        !data.customVehicleType
    ) {

        alert(
            "Please enter the custom vehicle type."
        );

        $("customVehicleType").focus();

        return false;
    }


    /*
     * Vehicle number duplicate check.
     */

    try {

        const exists =
            await vehicleNumberExists(
                data.vehicleNumber,
                vehicleBeingEdited?.id || ""
            );


        if (exists) {

            alert(
                "A vehicle with this vehicle number already exists."
            );

            $("vehicleNumber").focus();

            return false;
        }

    } catch (error) {

        alert(
            "The vehicle number could not be verified. Please try again."
        );

        return false;
    }


    /*
     * Driver validation.
     */

    if (
        data.assignedDriverId
    ) {

        const driver =
            await getSelectedDriver(
                data.assignedDriverId
            );


        if (!driver) {

            alert(
                "The selected driver could not be found."
            );

            return false;
        }

        const supabase =
            getSupabase();

        if (!supabase) {
            return false;
        }

        let assignmentQuery =
            supabase
                .from("vehicles")
                .select("id,vehicle_id")
                .eq(
                    "assigned_driver_id",
                    data.assignedDriverId
                );

        if (vehicleBeingEdited?.id) {

            assignmentQuery =
                assignmentQuery.neq(
                    "id",
                    vehicleBeingEdited.id
                );

        }

        const {
            data: existingAssignment,
            error: assignmentError
        } = await assignmentQuery.maybeSingle();

        if (assignmentError) {

            console.error(
                "Unable to verify driver vehicle assignment:",
                assignmentError
            );

            alert(
                "The driver's current vehicle assignment could not be verified. Please try again."
            );

            return false;

        }

        if (existingAssignment) {

            alert(
                `This driver is already assigned to ${existingAssignment.vehicle_id}.`
            );

            return false;

        }

        /*
         * Do not allow inactive/suspended
         * drivers to be newly assigned.
         */

        const driverStatus =
            String(
                driver.status || ""
            )
                .trim()
                .toLowerCase();


        if (
            driverStatus &&
            driverStatus !== "active"
        ) {

            alert(
                "Only an active driver can be assigned to a vehicle."
            );

            return false;
        }

    }


    return true;
}


/* =========================================================
   SAVE VEHICLE TO SUPABASE
   ========================================================= */

async function saveVehicle(
    event
) {

    event.preventDefault();


    const supabase =
        getSupabase();


    if (!supabase) {

        alert(
            "Supabase connection is not available."
        );

        return;
    }


    const form =
        $("vehicleForm");


    /*
     * Prevent double submission.
     */

    const submitButton =
        form
            ? form.querySelector(
                'button[type="submit"]'
            )
            : null;


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.dataset.originalText =
            submitButton.textContent;

        submitButton.textContent =
            "Saving...";
    }


    try {

        const data =
            getFormData();


        /*
         * Validate.
         */

        const valid =
            await validateForm(
                data
            );


        if (!valid) {
            return;
        }


        /*
         * Vehicle ID.
         */

        let vehicleId =
            data.vehicleId;


        /*
         * If the field is empty or still
         * contains "Generating...", generate
         * a fresh ID.
         */

        if (
            !vehicleId ||
            vehicleId === "Generating..."
        ) {

            vehicleId =
                await generateVehicleId();


            if (!vehicleId) {

                throw new Error(
                    "Vehicle ID could not be generated."
                );
            }
        }


        /*
         * Prepare ONLY columns that actually
         * exist in public.vehicles.
         */

        const vehicleRecord = {

            vehicle_id:
                vehicleId,

            vehicle_assigned:
                data.vehicleAssigned,

            vehicle_number:
                data.vehicleNumber,

            vehicle_type:
                data.vehicleType,

            custom_vehicle_type:
                data.customVehicleType || null,

            assigned_driver_id:
                data.assignedDriverId || null,

            vehicle_status:
                data.assignedDriverId
                    ? (
                        toDatabaseVehicleStatus(data.vehicleStatus) === "available"
                            ? "assigned"
                            : toDatabaseVehicleStatus(data.vehicleStatus)
                    )
                    : (
                        toDatabaseVehicleStatus(data.vehicleStatus) === "assigned"
                            ? "available"
                            : toDatabaseVehicleStatus(data.vehicleStatus)
                    ),

            vehicle_model:
                data.vehicleModel || null,

            manufacturer:
                data.manufacturer || null,

            manufacturing_year:
                optionalNumber(
                    data.manufacturingYear,
                    "Manufacturing year",
                    true
                ),

            rc_number:
                data.rcNumber || null,

            rc_expiry:
                data.rcExpiry || null,

            insurance_number:
                data.insuranceNumber || null,

            insurance_expiry:
                data.insuranceExpiry || null,

            permit_number:
                data.permitNumber || null,

            permit_expiry:
                data.permitExpiry || null,

            pollution_number:
                data.pollutionNumber || null,

            pollution_expiry:
                data.pollutionExpiry || null,

            current_location:
                data.currentLocation || null,

            gps_tracking:
                data.gpsTracking || null,

            gps_device_id:
                data.gpsDeviceId || null,

            load_capacity:
                data.loadCapacity || null,

            seating_capacity:
                optionalNumber(
                    data.seatingCapacity,
                    "Seating capacity",
                    true
                ),

            fuel_type:
                data.fuelType || null,

            current_odometer:
                optionalNumber(
                    data.currentOdometer,
                    "Current odometer"
                ),

            last_service_date:
                data.lastServiceDate || null,

            next_service_date:
                data.nextServiceDate || null,

            next_service_at:
                optionalNumber(
                    data.nextServiceAt,
                    "Next service odometer"
                ),

            maintenance_status:
                data.maintenanceStatus || null,

            notes:
                data.notes || null
        };

        if (vehicleBeingEdited) {

            vehicleRecord.updated_at =
                new Date().toISOString();

        }

        console.log(
            "Saving vehicle to Supabase:",
            vehicleRecord
        );


        /*
         * INSERT INTO public.vehicles
         */

        const saveResult = vehicleBeingEdited
            ? await supabase
                .from("vehicles")
                .update(vehicleRecord)
                .eq("id", vehicleBeingEdited.id)
                .select(
                    `
                    id,
                    vehicle_id,
                    vehicle_assigned,
                    vehicle_number,
                    vehicle_type,
                    custom_vehicle_type,
                    assigned_driver_id,
                    vehicle_status,
                    created_at,
                    updated_at
                    `
                )
                .single()
            : await supabase
                .from("vehicles")
                .insert(vehicleRecord)
                .select(
                    `
                    id,
                    vehicle_id,
                    vehicle_assigned,
                    vehicle_number,
                    vehicle_type,
                    custom_vehicle_type,
                    assigned_driver_id,
                    vehicle_status,
                    created_at,
                    updated_at
                    `
                )
                .single();

        const {
            data: savedVehicle,
            error
        } = saveResult;


        if (error) {

            console.error(
                vehicleBeingEdited
                    ? "Vehicle update failed:"
                    : "Vehicle insert failed:",
                error
            );


            /*
             * Handle common duplicate
             * constraint errors.
             */

            if (
                error.code === "23505"
            ) {

                if (
                    String(
                        error.message || ""
                    ).includes(
                        "vehicle_number"
                    )
                ) {

                    throw new Error(
                        "A vehicle with this vehicle number already exists."
                    );
                }


                if (
                    String(
                        error.message || ""
                    ).includes(
                        "vehicle_id"
                    )
                ) {

                    throw new Error(
                        "This Vehicle ID already exists. Please try again."
                    );
                }

                if (
                    String(
                        error.message || ""
                    ).includes(
                        "vehicles_one_vehicle_per_driver_idx"
                    )
                ) {

                    throw new Error(
                        "This driver is already assigned to another vehicle."
                    );
                }


                throw new Error(
                    "A vehicle with the same information already exists."
                );
            }


            throw error;
        }


        console.log(
            "Vehicle saved successfully:",
            savedVehicle
        );


        /*
         * Optional driver flag synchronization.
         *
         * The actual vehicle-to-driver relationship
         * is stored in vehicles.assigned_driver_id.
         *
         * drivers.vehicle_assigned is only a boolean
         * and does not identify the vehicle, so it is
         * updated only as a convenience flag.
         */

        const previousDriverId =
            vehicleBeingEdited?.assigned_driver_id || "";

        if (
            previousDriverId &&
            previousDriverId !== data.assignedDriverId
        ) {

            const {
                error: previousDriverError
            } = await supabase
                .from("drivers")
                .update({
                    vehicle_assigned: false
                })
                .eq("id", previousDriverId);

            if (previousDriverError) {
                console.warn(
                    "Previous driver vehicle assignment flag could not be cleared:",
                    previousDriverError
                );
            }

        }

        if (
            data.assignedDriverId
        ) {

            const {
                error:
                    driverUpdateError
            } =
                await supabase
                    .from("drivers")
                    .update({
                        vehicle_assigned:
                            true
                    })
                    .eq(
                        "id",
                        data.assignedDriverId
                    );


            if (driverUpdateError) {

                /*
                 * Vehicle itself was already saved.
                 * Do not delete the vehicle because the
                 * convenience boolean failed.
                 */

                console.warn(
                    "Driver vehicle_assigned flag could not be updated:",
                    driverUpdateError
                );
            }
        }


        /*
         * Success message.
         */

        alert(
            vehicleBeingEdited
                ? `Vehicle ${savedVehicle.vehicle_id} has been updated successfully.`
                : `Vehicle ${savedVehicle.vehicle_id} has been saved successfully.`
        );


        /*
         * Return to Vehicles page.
         */

        window.location.href =
            "vehicles.html";


    } catch (error) {

        console.error(
            "Unable to save vehicle:",
            error
        );


        let message =
            "Vehicle could not be saved.";


        if (error?.code === "23505") {
            message =
                error.message?.includes("vehicle_number")
                    ? "A vehicle with this vehicle number already exists."
                    : "This Vehicle ID already exists. Please try again.";
        } else if (error?.message) {
            message = error.message;
        }


        alert(
            message
        );


    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                submitButton.dataset.originalText ||
                "Save Vehicle";
        }
    }
}


/* =========================================================
   CUSTOM VEHICLE TYPE
   ========================================================= */

function handleVehicleTypeChange() {

    const selected =
        $("vehicleType")
            ? $("vehicleType").value
            : "";


    const customGroup =
        $("customVehicleTypeGroup");


    const customInput =
        $("customVehicleType");


    if (
        !customGroup ||
        !customInput
    ) {
        return;
    }


    if (
        selected === "Custom"
    ) {

        customGroup.classList.remove(
            "hidden"
        );


        customInput.required =
            true;


        customInput.focus();

    } else {

        customGroup.classList.add(
            "hidden"
        );


        customInput.required =
            false;


        customInput.value =
            "";
    }
}


/* =========================================================
   CANCEL
   ========================================================= */

function cancelRegistration() {

    const confirmed =
        window.confirm(
            "Are you sure you want to cancel? Entered vehicle information will not be saved."
        );


    if (!confirmed) {
        return;
    }


    window.location.href =
        "vehicles.html";
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function setupSidebar() {

    const menuBtn =
        $("menuBtn");


    if (!menuBtn) {
        return;
    }


    menuBtn.addEventListener(
        "click",
        () => {

            if (
                window.innerWidth <= 760
            ) {

                document.body.classList.toggle(
                    "sidebar-open"
                );

                return;
            }


            document.body.classList.toggle(
                "sidebar-collapsed"
            );
        }
    );
}


/* =========================================================
   CLOSE MOBILE SIDEBAR
   ========================================================= */

function setupMobileSidebarLinks() {

    const links =
        document.querySelectorAll(
            ".sidebar-nav a"
        );


    links.forEach(
        (link) => {

            link.addEventListener(
                "click",
                () => {

                    if (
                        window.innerWidth <= 760
                    ) {

                        document.body.classList.remove(
                            "sidebar-open"
                        );
                    }
                }
            );
        }
    );
}


/* =========================================================
   SHOW MESSAGE
   ========================================================= */

function showMessage(
    message
) {

    console.warn(
        message
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

    const logoutBtn =
        $("logoutBtn");


    if (!logoutBtn) {
        return;
    }


    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                if (
                    typeof adminLogout ===
                    "function"
                ) {

                    await adminLogout();

                    return;
                }


                const supabase =
                    getSupabase();


                if (supabase) {

                    await supabase.auth.signOut();
                }


                window.location.href =
                    "../index.html";


            } catch (error) {

                console.error(
                    "Logout failed:",
                    error
                );
            }
        }
    );
}


/* =========================================================
   INITIALIZE PAGE
   ========================================================= */

async function initializePage() {

    /*
     * Authentication first.
     */

    const authenticated =
        await checkAdminAuthentication();


    if (!authenticated) {
        return;
    }


    /*
     * Sidebar.
     */

    setupSidebar();

    setupMobileSidebarLinks();

    setupLogout();


    /*
     * Vehicle type.
     */

    const vehicleType =
        $("vehicleType");


    if (vehicleType) {

        vehicleType.addEventListener(
            "change",
            handleVehicleTypeChange
        );


        /*
         * Set correct initial state.
         */

        handleVehicleTypeChange();
    }


    /*
     * Cancel button.
     */

    const cancelBtn =
        $("cancelBtn");


    if (cancelBtn) {

        cancelBtn.addEventListener(
            "click",
            cancelRegistration
        );
    }


    /*
     * Load drivers from Supabase.
     */

    await loadDrivers();


    /*
     * Generate Vehicle ID from
     * current Supabase records.
     */

    if (editVehicleId) {

        const loaded =
            await loadVehicleForEdit();

        if (!loaded) {
            return;
        }

    }

    await setVehicleId();


    /*
     * Form submit.
     */

    const form =
        $("vehicleForm");


    if (form) {

        form.addEventListener(
            "submit",
            saveVehicle
        );
    }
}


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePage
    );

} else {

    initializePage();
}