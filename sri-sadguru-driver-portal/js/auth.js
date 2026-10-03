"use strict";

/*
=========================================================
SSP DRIVER PORTAL
AUTHENTICATION + DRIVER IDENTITY MANAGER

SOURCE OF TRUTH:
Supabase Auth
        ↓
profiles
        ↓
drivers

IMPORTANT:
- No driver ID from localStorage
- No DRIVER001 fallback
- No demo driver
- No hardcoded driver
- Every protected Driver page gets the real
  authenticated driver UUID from Supabase
=========================================================
*/


/* =====================================================
   PAGE PATHS
===================================================== */

const DRIVER_LOGIN_PATH =
    "../index.html";


/* =====================================================
   GET SUPABASE CLIENT
===================================================== */

function getDriverSupabase() {

    if (!window.supabaseClient) {

        console.error(
            "Driver Auth: Supabase client is not available."
        );

        return null;
    }

    return window.supabaseClient;
}


/* =====================================================
   GET CURRENT SESSION
===================================================== */

async function getDriverSession() {

    const supabase =
        getDriverSupabase();

    if (!supabase) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await supabase.auth.getSession();

        if (error) {

            console.error(
                "Driver Auth: Session error:",
                error
            );

            return null;
        }

        return data?.session || null;

    } catch (error) {

        console.error(
            "Driver Auth: Unable to get session:",
            error
        );

        return null;
    }
}


/* =====================================================
   GET CURRENT AUTH USER
===================================================== */

async function getDriverAuthUser() {

    const supabase =
        getDriverSupabase();

    if (!supabase) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await supabase.auth.getUser();

        if (error) {

            console.error(
                "Driver Auth: User lookup failed:",
                error
            );

            return null;
        }

        return data?.user || null;

    } catch (error) {

        console.error(
            "Driver Auth: Unable to get user:",
            error
        );

        return null;
    }
}


/* =====================================================
   GET DRIVER PROFILE
===================================================== */

async function getDriverProfile() {

    const supabase =
        getDriverSupabase();

    if (!supabase) {
        return null;
    }

    const user =
        await getDriverAuthUser();

    if (!user) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await supabase
                .from("profiles")
                .select(`
                    id,
                    email,
                    phone,
                    full_name,
                    role,
                    status,
                    last_login_at,
                    created_at,
                    updated_at
                `)
                .eq(
                    "id",
                    user.id
                )
                .maybeSingle();

        if (error) {

            console.error(
                "Driver Auth: Profile lookup failed:",
                error
            );

            return null;
        }

        return data || null;

    } catch (error) {

        console.error(
            "Driver Auth: Profile lookup exception:",
            error
        );

        return null;
    }
}


/* =====================================================
   GET DRIVER DATABASE RECORD
===================================================== */

async function getDriverRecord() {

    const supabase =
        getDriverSupabase();

    if (!supabase) {
        return null;
    }

    const user =
        await getDriverAuthUser();

    if (!user) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await supabase
                .from("drivers")
                .select(`
                    id,
                    profile_id,
                    driver_id,
                    name,
                    date_of_birth,
                    gender,
                    blood_group,
                    phone,
                    alternate_phone,
                    email,
                    address_line1,
                    address_line2,
                    city,
                    state,
                    pin_code,
                    government_id_number,
                    driving_license_number,
                    driving_license_expiry,
                    joining_date,
                    status,
                    photo_url,
                    vehicle_assigned,
                    notes,
                    emergency_contact_name,
                    emergency_contact_phone,
                    emergency_contact_relationship,
                    created_at,
                    updated_at
                `)
                .eq(
                    "profile_id",
                    user.id
                )
                .maybeSingle();

        if (error) {

            console.error(
                "Driver Auth: Driver record lookup failed:",
                error
            );

            return null;
        }

        return data || null;

    } catch (error) {

        console.error(
            "Driver Auth: Driver lookup exception:",
            error
        );

        return null;
    }
}


/* =====================================================
   GET COMPLETE DRIVER IDENTITY

   This is the MAIN function that every Driver page
   should use.
===================================================== */

async function getCurrentDriver() {

    const supabase =
        getDriverSupabase();

    if (!supabase) {
        return null;
    }

    const session =
        await getDriverSession();

    if (!session || !session.user) {

        return null;
    }

    const user =
        session.user;


    /* ================================================
       PROFILE
    ================================================ */

    const profile =
        await getDriverProfile();

    if (!profile) {

        console.error(
            "Driver Auth: Driver profile not found."
        );

        return null;
    }


    /* ================================================
       ROLE CHECK
    ================================================ */

    if (
        profile.role !==
        "driver"
    ) {

        console.error(
            "Driver Auth: Authenticated account is not a driver."
        );

        return null;
    }


    /* ================================================
       PROFILE STATUS CHECK
    ================================================ */

    if (
        profile.status !==
        "active"
    ) {

        console.error(
            "Driver Auth: Driver profile is not active."
        );

        return null;
    }


    /* ================================================
       DRIVER RECORD
    ================================================ */

    const driver =
        await getDriverRecord();

    if (!driver) {

        console.error(
            "Driver Auth: Driver database record not found."
        );

        return null;
    }


    /* ================================================
       DRIVER STATUS CHECK
    ================================================ */

    if (
        driver.status !==
        "active"
    ) {

        console.error(
            "Driver Auth: Driver record is not active."
        );

        return null;
    }


    /* ================================================
       VERIFY RELATIONSHIP
    ================================================ */

    if (
        driver.profile_id !==
        user.id
    ) {

        console.error(
            "Driver Auth: Driver/profile relationship is invalid."
        );

        return null;
    }


    /* ================================================
       RETURN COMPLETE IDENTITY
    ================================================ */

    return {

        user: user,

        profile: profile,

        driver: driver,

        userId:
            user.id,

        profileId:
            profile.id,

        driverUuid:
            driver.id,

        driverId:
            driver.driver_id,

        name:
            driver.name ||
            profile.full_name ||
            "",

        email:
            driver.email ||
            profile.email ||
            user.email ||
            "",

        phone:
            driver.phone ||
            profile.phone ||
            "",

        status:
            driver.status

    };
}


/* =====================================================
   REQUIRE DRIVER

   Use this on every protected Driver page.
===================================================== */

async function requireDriver() { 

    const currentDriver =
        await getCurrentDriver();

    if (!currentDriver) {

        console.error(
            "Driver Auth: No valid authenticated driver."
        );

        await logoutDriver();

        window.location.replace(
            DRIVER_LOGIN_PATH
        );

        return null;
    }

    return currentDriver;
}


/* =====================================================
   LOGOUT
===================================================== */

async function logoutDriver() {

    const supabase =
        getDriverSupabase();

    if (!supabase) {
        return false;
    }

    try {

        const {
            error
        } =
            await supabase.auth.signOut();

        if (error) {

            console.error(
                "Driver Auth: Logout failed:",
                error
            );

            return false;
        }

        return true;

    } catch (error) {

        console.error(
            "Driver Auth: Logout exception:",
            error
        );

        return false;
    }
}


/* =====================================================
   GET CURRENT DRIVER UUID

   Convenience helper.
===================================================== */

async function getCurrentDriverUuid() {

    const driver =
        await getCurrentDriver();

    return driver?.driverUuid ||
        null;
}


/* =====================================================
   GET HUMAN DRIVER ID

   Example:
   DRV-0001
===================================================== */

async function getCurrentDriverId() {

    const driver =
        await getCurrentDriver();

    return driver?.driverId ||
        null;
}


/* =====================================================
   AUTH STATE LISTENER
===================================================== */

const driverSupabase =
    getDriverSupabase();

if (driverSupabase) {

    driverSupabase.auth.onAuthStateChange(
        function (
            event,
            session
        ) {

            console.log(
                "Driver Auth State:",
                event,
                session
                    ? "Session active"
                    : "No session"
            );

        }
    );
}


/* =====================================================
   EXPOSE DRIVER AUTH API
===================================================== */

window.driverAuth = {

    getSession:
        getDriverSession,

    getUser:
        getDriverAuthUser,

    getProfile:
        getDriverProfile,

    getDriverRecord:
        getDriverRecord,

    getCurrentDriver:
        getCurrentDriver,

    requireDriver:
        requireDriver,

    getDriverUuid:
        getCurrentDriverUuid,

    getDriverId:
        getCurrentDriverId,

    logout:
        logoutDriver

};