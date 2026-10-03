"use strict";

const SUPABASE_URL =
    "https://kjudjgchpwkjgmiftesl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_jYwrldmuukGL1sKdTlCL0A_mTFJD05r";

if (!window.supabase) {

    console.error(
        "Supabase JavaScript library was not loaded before supabase-client.js."
    );

} else {

    const supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );

    window.supabaseClient =
        supabaseClient;
}