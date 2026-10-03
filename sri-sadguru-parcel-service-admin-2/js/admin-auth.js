"use strict";

/*
    SHARED ADMIN AUTHENTICATION
    Used by every protected page inside:

    sri-sadguru-parcel-service-admin-2/admin/
*/

const ADMIN_LOGIN_URL = "../index.html";

/**
 * Redirect to the Admin Login page.
 */
function redirectToAdminLogin() {
    window.location.replace(ADMIN_LOGIN_URL);
}

/**
 * Check whether the current user is an authenticated,
 * active Admin.
 *
 * Returns:
 *     {
 *         user,
 *         profile
 *     }
 *
 * Returns null when access is denied.
 */
async function requireAdminAuth() {
    const client = window.supabaseClient;

    if (!client || !client.auth) {
        console.error("Supabase client is not available.");
        redirectToAdminLogin();
        return null;
    }

    try {
        /*
            Step 1:
            Get the existing Supabase session.
        */
        const {
            data: sessionData,
            error: sessionError
        } = await client.auth.getSession();

        if (sessionError) {
            console.error(
                "Unable to retrieve Supabase session:",
                sessionError
            );

            redirectToAdminLogin();
            return null;
        }

        if (
            !sessionData ||
            !sessionData.session ||
            !sessionData.session.user
        ) {
            redirectToAdminLogin();
            return null;
        }

        const user = sessionData.session.user;

        /*
            Step 2:
            Load the profile belonging to the
            authenticated Supabase user.
        */
        const {
            data: profile,
            error: profileError
        } = await client
            .from("profiles")
            .select(
                "id, email, phone, full_name, role, status"
            )
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error(
                "Unable to verify Admin profile:",
                profileError
            );

            await client.auth.signOut();
            redirectToAdminLogin();
            return null;
        }

        /*
            Step 3:
            Profile must exist.
        */
        if (!profile) {
            console.error("Admin profile was not found.");

            await client.auth.signOut();
            redirectToAdminLogin();
            return null;
        }

        /*
            Step 4:
            Verify the profile UUID matches
            the authenticated user UUID.
        */
        if (String(profile.id) !== String(user.id)) {
            console.error("Profile UUID does not match Auth UUID.");

            await client.auth.signOut();
            redirectToAdminLogin();
            return null;
        }

        /*
            Step 5:
            Only the Admin role is allowed.
        */
        if (
            String(profile.role || "").trim().toLowerCase() !==
            "admin"
        ) {
            console.error("Access denied: user is not an Admin.");

            await client.auth.signOut();
            redirectToAdminLogin();
            return null;
        }

        /*
            Step 6:
            Admin account must be active.
        */
        if (
            String(profile.status || "").trim().toLowerCase() !==
            "active"
        ) {
            console.error("Access denied: Admin account is inactive.");

            await client.auth.signOut();
            redirectToAdminLogin();
            return null;
        }

        /*
            Step 7:
            Auth email must match profile email.
        */
        if (
            String(profile.email || "").trim().toLowerCase() !==
            String(user.email || "").trim().toLowerCase()
        ) {
            console.error("Auth email and profile email do not match.");

            await client.auth.signOut();
            redirectToAdminLogin();
            return null;
        }

        /*
            Make the authenticated details available
            to other Admin page scripts.
        */
        window.currentAdminUser = user;
        window.currentAdminProfile = profile;

        console.log("Shared Admin session verified.");

        return {
            user,
            profile
        };

    } catch (error) {
        console.error(
            "Unexpected Admin authentication error:",
            error
        );

        try {
            await client.auth.signOut();
        } catch (signOutError) {
            console.warn(
                "Unable to clear invalid session:",
                signOutError
            );
        }

        redirectToAdminLogin();
        return null;
    }
}

/**
 * Logout from the complete Admin Portal.
 */
async function adminLogout() {
    const client = window.supabaseClient;

    if (!client || !client.auth) {
        redirectToAdminLogin();
        return;
    }

    try {
        const { error } = await client.auth.signOut();

        if (error) {
            console.error("Logout failed:", error);
            alert("Unable to logout. Please try again.");
            return;
        }

        window.location.replace(ADMIN_LOGIN_URL);

    } catch (error) {
        console.error("Unexpected logout error:", error);
        alert("An unexpected error occurred while logging out.");
    }
}