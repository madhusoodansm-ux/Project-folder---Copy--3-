"use strict";

/* =====================================================
   SSP SUPABASE CLIENT
   ===================================================== */

const SUPABASE_URL =
    "https://kjudjgchpwkjgmiftesl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_jYwrldmuukGL1sKdTlCL0A_mTFJD05r";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

window.supabaseClient =
    supabaseClient;