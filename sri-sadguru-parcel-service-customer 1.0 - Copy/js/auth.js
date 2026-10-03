"use strict";

/*
=========================================================
SRI SADGURU SIDDAROODA PARCEL SERVICE
CUSTOMER PORTAL
AUTHENTICATION / SESSION MANAGER
AUTH-4 COMPLETE
=========================================================
*/

(function () {

    /* =====================================================
       PAGE PATHS
    ====================================================== */

    const LOGIN_PAGE_FROM_CUSTOMER =
        "../index.html";

    const CUSTOMER_DASHBOARD_FROM_ROOT =
        "customer/dashboard.html";


    /* =====================================================
       GET SUPABASE CLIENT
    ====================================================== */

    function getSupabaseClient() {

        if (!window.supabaseClient) {

            console.error(
                "SSP Auth: Supabase client is not available."
            );

            return null;
        }

        return window.supabaseClient;
    }


    /* =====================================================
       GET CURRENT SESSION
    ====================================================== */

    async function getCurrentSession() {

        const supabase =
            getSupabaseClient();

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
                    "SSP Auth: Error getting current session:",
                    error
                );

                return null;
            }


            return data?.session || null;

        } catch (error) {

            console.error(
                "SSP Auth: Session check failed:",
                error
            );

            return null;
        }
    }


    /* =====================================================
       GET CURRENT USER
    ====================================================== */

    async function getCurrentUser() {

        const session =
            await getCurrentSession();


        if (!session) {
            return null;
        }


        return session.user || null;
    }


    /* =====================================================
       GET CUSTOMER ID
    ====================================================== */

    async function getCustomerId() {

        const user =
            await getCurrentUser();


        if (!user) {
            return null;
        }


        return user.id || null;
    }


    /* =====================================================
       GET CUSTOMER EMAIL
    ====================================================== */

    async function getCustomerEmail() {

        const user =
            await getCurrentUser();


        if (!user) {
            return null;
        }


        return user.email || null;
    }


    /* =====================================================
       GET CUSTOMER PHONE
    ====================================================== */

    async function getCustomerPhone() {

        const user =
            await getCurrentUser();


        if (!user) {
            return null;
        }


        return (
            user.user_metadata?.phone ||
            null
        );
    }


    /* =====================================================
       GET USER METADATA
    ====================================================== */

    async function getUserMetadata() {

        const user =
            await getCurrentUser();


        if (!user) {
            return {};
        }


        return user.user_metadata || {};
    }
    

    /* =========================================================
   AUTH-5.1
   GET CUSTOMER PROFILE
========================================================= */

async function getCustomerProfile() {

    const supabase =
        getSupabaseClient();

    if (!supabase) {
        return null;
    }

    const user =
        await getCurrentUser();

    if (!user) {
        return null;
    }

    try {

        const { data, error } =
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
                .eq("id", user.id)
                .single();

        if (error) {

            console.error(
                "SSP Auth: Customer profile fetch failed:",
                error
            );

            return null;
        }

        return data || null;

    } catch (error) {

        console.error(
            "SSP Auth: Customer profile error:",
            error
        );

        return null;
    }
}


    /* =========================================================
   AUTH-5.2
   REQUIRE CUSTOMER ROLE
========================================================= */

async function requireCustomer() {

    const session =
        await requireAuth();

    if (!session) {
        return null;
    }

    const profile =
        await getCustomerProfile();

    if (!profile) {

        console.error(
            "SSP Auth: Customer profile not found."
        );

        await logout();

        return null;
    }

    if (profile.role !== "customer") {

        console.error(
            "SSP Auth: User is not a customer."
        );

        await logout();

        return null;
    }

    if (profile.status !== "active") {

        console.error(
            "SSP Auth: Customer account is not active."
        );

        await logout();

        return null;
    }

    return {
        session: session,
        user: session.user,
        profile: profile
    };
}

    /* =====================================================
       CHECK AUTHENTICATION
    ====================================================== */

    async function isAuthenticated() {

        const session =
            await getCurrentSession();


        return Boolean(session);
    }


    /* =====================================================
       REQUIRE AUTHENTICATION
       
       Used by protected customer pages.
    ====================================================== */

    async function requireAuth() {

        const session =
            await getCurrentSession();


        if (!session) {

            window.location.replace(
                LOGIN_PAGE_FROM_CUSTOMER
            );

            return null;
        }


        return session;
    }


    /* =====================================================
       REQUIRE USER
    ====================================================== */

    async function requireUser() {

        const session =
            await requireAuth();


        if (!session) {
            return null;
        }


        return session.user || null;
    }


    /* =====================================================
       REDIRECT IF ALREADY AUTHENTICATED
       
       Used by ROOT index.html.
    ====================================================== */

    async function redirectIfAuthenticated() {

        const session =
            await getCurrentSession();


        if (!session) {
            return false;
        }


        window.location.replace(
            CUSTOMER_DASHBOARD_FROM_ROOT
        );


        return true;
    }


    /* =====================================================
       LOGOUT
       
       AUTH-4.5

       This is the important correction.

       We must destroy the Supabase session first.
    ====================================================== */

    async function logout() {

        const supabase =
            getSupabaseClient();


        if (!supabase) {

            console.error(
                "SSP Auth: Supabase client unavailable during logout."
            );

            return false;
        }


        try {

            /* =============================================
               SIGN OUT FROM SUPABASE
            ============================================== */

            const {
                error
            } =
                await supabase.auth.signOut();


            if (error) {

                console.error(
                    "SSP Auth: Logout failed:",
                    error
                );

                throw error;
            }


            /* =============================================
               VERIFY SESSION IS GONE
            ============================================== */

            const {
                data: sessionData,
                error: sessionError
            } =
                await supabase.auth.getSession();


            if (sessionError) {

                console.error(
                    "SSP Auth: Unable to verify logout:",
                    sessionError
                );

                throw sessionError;
            }


            if (sessionData?.session) {

                console.error(
                    "SSP Auth: Session still exists after logout."
                );

                throw new Error(
                    "Supabase session was not completely cleared."
                );
            }


            /* =============================================
               REMOVE OLD DEMO LOGIN FLAG

               This does NOT replace Supabase logout.
               It only cleans the old frontend value.
            ============================================== */

            localStorage.removeItem(
                "customerLoggedIn"
            );


            /* =============================================
               RETURN TO LOGIN PAGE
            ============================================== */

            window.location.replace(
                LOGIN_PAGE_FROM_CUSTOMER
            );


            return true;

        } catch (error) {

            console.error(
                "SSP Customer Logout Error:",
                error
            );

            throw error;
        }
    }


    /* =====================================================
       AUTH STATE CHANGE LISTENER
       
       AUTH-4.6
    ====================================================== */

    function listenForAuthChanges(callback) {

        const supabase =
            getSupabaseClient();


        if (!supabase) {
            return null;
        }


        const {
            data
        } =
            supabase.auth.onAuthStateChange(
                function (
                    event,
                    session
                ) {

                    console.log(
                        "SSP Auth State:",
                        event
                    );


                    if (
                        typeof callback ===
                        "function"
                    ) {

                        callback(
                            event,
                            session
                        );
                    }

                }
            );


        return (
            data?.subscription ||
            null
        );
    }


    /* =====================================================
       EXPORT SSP AUTH
    ====================================================== */

    window.SSPAuth = {

    getCurrentSession,

    getCurrentUser,

    getCustomerId,

    getCustomerEmail,

    getCustomerPhone,

    getUserMetadata,

    getCustomerProfile,

    isAuthenticated,

    requireAuth,

    requireUser,

    requireCustomer,

    redirectIfAuthenticated,

    logout,

    listenForAuthChanges
};

    /* =====================================================
       DEBUG MESSAGE
    ====================================================== */

    console.log(
        "SSP Auth: Auth-4 session manager loaded successfully."
    );

})();