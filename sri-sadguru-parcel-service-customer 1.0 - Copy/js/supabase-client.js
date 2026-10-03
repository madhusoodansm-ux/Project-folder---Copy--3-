"use strict";

/*
 * ============================================================
 * SRI SADGURU SIDDAROODA PARCEL SERVICE
 * CUSTOMER PORTAL
 * SUPABASE CLIENT
 * ============================================================
 *
 * ONE Supabase client for the complete Customer Portal.
 * ============================================================
 */

(function () {

    /* =====================================================
       SUPABASE PROJECT
    ====================================================== */

    const SUPABASE_URL =
        "https://kjudjgchpwkjgmiftesl.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_jYwrldmuukGL1sKdTlCL0A_mTFJD05r";


    /* =====================================================
       CHECK SUPABASE LIBRARY
    ====================================================== */

    if (!window.supabase) {

        console.error(
            "SSP ERROR: Supabase JavaScript library is not loaded."
        );

        return;
    }


    /* =====================================================
       CREATE SUPABASE CLIENT
       
       Supabase automatically keeps the session in the
       browser so the customer remains logged in after
       refreshing the page.
    ====================================================== */

    const supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
            {
                auth: {

                    persistSession: true,

                    autoRefreshToken: true,

                    detectSessionInUrl: true

                }
            }
        );


    /* =====================================================
       GLOBAL CLIENT
    ====================================================== */

    window.supabaseClient =
        supabaseClient;


    /* =====================================================
       CONFIGURATION
    ====================================================== */

    window.SSP_SUPABASE_CONFIG = {

        url:
            SUPABASE_URL,

        publishableKey:
            SUPABASE_PUBLISHABLE_KEY

    };


    console.log(
        "SSP: Supabase client initialized successfully."
    );

})();