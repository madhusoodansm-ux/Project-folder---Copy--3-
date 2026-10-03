/* =========================================================
   ADMIN PROFILE - SUPABASE CONNECTED
   Sri Sadguru Siddarooda Parcel Service
   Source UI/functionality: Project Folder - Copy (6)
   ========================================================= */
"use strict";

const SUPABASE = window.supabaseClient;
const DEFAULT_PHOTO = "../images/logo.png";
const PHOTO_BUCKET = "profile-photos";
const ADMIN_DISPLAY_ID = "ADM-0001";

let authUser = null;
let originalProfile = null;
let currentPhoto = DEFAULT_PHOTO;
let selectedPhotoFile = null;
let photoRemoved = false;
let toastTimer = null;

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const adminProfileForm = document.getElementById("adminProfileForm");
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const removePhotoButton = document.getElementById("removePhotoButton");

const adminId = document.getElementById("adminId");
const adminName = document.getElementById("adminName");
const adminEmail = document.getElementById("adminEmail");
const adminMobile = document.getElementById("adminMobile");
const adminAlternateMobile = document.getElementById("adminAlternateMobile");
const adminRole = document.getElementById("adminRole");
const adminDesignation = document.getElementById("adminDesignation");
const adminDepartment = document.getElementById("adminDepartment");
const adminStatus = document.getElementById("adminStatus");

const profileDisplayName = document.getElementById("profileDisplayName");
const profileDisplayRole = document.getElementById("profileDisplayRole");
const profileDisplayId = document.getElementById("profileDisplayId");
const profileDisplayStatus = document.getElementById("profileDisplayStatus");

const resetProfileButton = document.getElementById("resetProfileButton");
const saveProfileButton = document.getElementById("saveProfileButton");

const currentPassword = document.getElementById("currentPassword");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");

const toast = document.getElementById("toast");
const toastIcon = document.getElementById("toastIcon");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");
const closeToast = document.getElementById("closeToast");


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", initializePage);

async function initializePage() {
    if (!SUPABASE) {
        showToast(
            "Connection Error",
            "Supabase client is not loaded.",
            true
        );
        return;
    }

    bindEvents();
    updateProfilePreview();

    await loadAuthenticatedAdmin();
}


/* =========================================================
   AUTH + PROFILE LOAD
   ========================================================= */

async function loadAuthenticatedAdmin() {
    setPageBusy(true);

    try {
        const {
            data: userData,
            error: userError
        } = await SUPABASE.auth.getUser();

        if (userError || !userData?.user) {
            redirectToLogin(
                "Please sign in as an administrator."
            );
            return;
        }

        authUser = userData.user;

        const {
            data: profile,
            error: profileError
        } = await SUPABASE
            .from("profiles")
            .select(
                "id,email,phone,alternate_phone,full_name,role,status,designation,department,photo_url,created_at,updated_at,last_login_at"
            )
            .eq("id", authUser.id)
            .eq("role", "admin")
            .single();

        if (profileError) {
            console.error(
                "Admin profile load failed:",
                profileError
            );

            showToast(
                "Profile Error",
                getSupabaseError(profileError),
                true
            );

            return;
        }

        if (!profile || profile.role !== "admin") {
            await SUPABASE.auth.signOut();

            redirectToLogin(
                "Administrator access is required."
            );

            return;
        }

        if (profile.status !== "active") {
            await SUPABASE.auth.signOut();

            redirectToLogin(
                "This administrator account is not active."
            );

            return;
        }

        originalProfile = normalizeProfile(profile);

        applyProfileToForm(originalProfile);

        clearValidationMessages();

    } catch (error) {

        console.error(
            "Unexpected profile load error:",
            error
        );

        showToast(
            "Error",
            "Unable to load the administrator profile.",
            true
        );

    } finally {

        setPageBusy(false);
    }
}


function normalizeProfile(profile) {

    return {
        id: profile.id,

        displayId: ADMIN_DISPLAY_ID,

        name: profile.full_name || "",

        email:
            profile.email ||
            authUser?.email ||
            "",

        mobile:
            profile.phone ||
            "",

        alternateMobile:
            profile.alternate_phone ||
            "",

        role: "System Administrator",

        dbRole: "admin",

        designation:
            profile.designation ||
            "Administrator",

        department:
            profile.department ||
            "Administration",

        status:
            profile.status === "active"
                ? "Active"
                : "Inactive",

        photo:
            profile.photo_url ||
            DEFAULT_PHOTO,

        createdAt:
            profile.created_at ||
            null,

        updatedAt:
            profile.updated_at ||
            null,

        lastLoginAt:
            profile.last_login_at ||
            null
    };
}


function applyProfileToForm(profile) {

    adminId.value =
        profile.displayId;

    adminName.value =
        profile.name;

    adminEmail.value =
        profile.email;

    adminMobile.value =
        normalizePhone(profile.mobile);

    adminAlternateMobile.value =
        normalizePhone(profile.alternateMobile);

    adminRole.value =
        "System Administrator";

    adminDesignation.value =
        profile.designation;

    adminDepartment.value =
        profile.department;

    adminStatus.value =
        profile.status;

    currentPhoto =
        profile.photo ||
        DEFAULT_PHOTO;

    selectedPhotoFile = null;

    photoRemoved = false;

    profilePhoto.value = "";

    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";

    updateProfilePreview();
}


/* =========================================================
   EVENT BINDING
   ========================================================= */

function bindEvents() {

    mobileMenuButton?.addEventListener(
        "click",
        openSidebar
    );

    sidebarToggle?.addEventListener(
        "click",
        closeSidebar
    );

    sidebarOverlay?.addEventListener(
        "click",
        closeSidebar
    );

    document.addEventListener(
        "keydown",
        handleKeyboard
    );

    adminProfileForm?.addEventListener(
        "submit",
        handleProfileSubmit
    );

    resetProfileButton?.addEventListener(
        "click",
        handleReset
    );

    profilePhoto?.addEventListener(
        "change",
        handlePhotoUpload
    );

    removePhotoButton?.addEventListener(
        "click",
        handlePhotoRemove
    );

    [
        adminName,
        adminRole,
        adminDesignation,
        adminStatus,
        adminId
    ].forEach((element) => {

        element?.addEventListener(
            "input",
            updateProfilePreview
        );

        element?.addEventListener(
            "change",
            updateProfilePreview
        );

    });

    adminMobile?.addEventListener(
        "input",
        restrictPhoneInput
    );

    adminAlternateMobile?.addEventListener(
        "input",
        restrictPhoneInput
    );

    document
        .querySelectorAll(".password-toggle")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () =>
                    togglePassword(
                        button.dataset.target,
                        button
                    )
            );

        });

    closeToast?.addEventListener(
        "click",
        hideToast
    );
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function openSidebar() {

    sidebar?.classList.add("open");

    sidebarOverlay?.classList.add("show");

    document.body.style.overflow =
        "hidden";
}


function closeSidebar() {

    sidebar?.classList.remove("open");

    sidebarOverlay?.classList.remove("show");

    document.body.style.overflow =
        "";
}


function handleKeyboard(event) {

    if (event.key === "Escape") {

        closeSidebar();

        hideToast();
    }
}


/* =========================================================
   PHOTO
   ========================================================= */

function handlePhotoUpload(event) {

    const file =
        event.target.files?.[0];

    if (!file) return;


    if (!file.type.startsWith("image/")) {

        showToast(
            "Invalid File",
            "Please select a valid image file.",
            true
        );

        profilePhoto.value = "";

        return;
    }


    if (file.size > 2 * 1024 * 1024) {

        showToast(
            "File Too Large",
            "Profile photo must be smaller than 2 MB.",
            true
        );

        profilePhoto.value = "";

        return;
    }


    selectedPhotoFile = file;

    photoRemoved = false;


    const reader =
        new FileReader();


    reader.onload = () => {

        currentPhoto =
            reader.result;

        profilePhotoPreview.src =
            currentPhoto;
    };


    reader.onerror = () => {

        showToast(
            "Upload Error",
            "Unable to preview the selected image.",
            true
        );

    };


    reader.readAsDataURL(file);
}


function handlePhotoRemove() {

    selectedPhotoFile = null;

    photoRemoved = true;

    currentPhoto =
        DEFAULT_PHOTO;

    profilePhoto.value = "";

    profilePhotoPreview.src =
        DEFAULT_PHOTO;
}


async function uploadProfilePhoto() {

    if (!selectedPhotoFile) {

        return (
            originalProfile?.photo ||
            DEFAULT_PHOTO
        );
    }


    const extension =
        getFileExtension(
            selectedPhotoFile.name,
            selectedPhotoFile.type
        );


    const path =
        `admin/${authUser.id}/profile.${extension}`;


    const {
        error: uploadError
    } = await SUPABASE.storage
        .from(PHOTO_BUCKET)
        .upload(
            path,
            selectedPhotoFile,
            {
                upsert: true,
                contentType:
                    selectedPhotoFile.type,
                cacheControl:
                    "3600"
            }
        );


    if (uploadError) {

        throw new Error(
            `Profile photo upload failed: ${uploadError.message}`
        );
    }


    const { data } =
        SUPABASE.storage
            .from(PHOTO_BUCKET)
            .getPublicUrl(path);


    if (!data?.publicUrl) {

        throw new Error(
            "Unable to generate the profile photo URL."
        );
    }


    return (
        `${data.publicUrl}?v=${Date.now()}`
    );
}


async function removeStoredProfilePhoto(url) {

    if (
        !url ||
        !url.includes(
            `/storage/v1/object/public/${PHOTO_BUCKET}/`
        )
    ) {
        return;
    }


    const marker =
        `/storage/v1/object/public/${PHOTO_BUCKET}/`;


    const index =
        url.indexOf(marker);


    if (index === -1) return;


    const path =
        url
            .substring(
                index + marker.length
            )
            .split("?")[0];


    if (!path) return;


    const {
        error
    } = await SUPABASE.storage
        .from(PHOTO_BUCKET)
        .remove([path]);


    if (error) {

        console.warn(
            "Old profile photo could not be removed:",
            error.message
        );
    }
}


function getFileExtension(
    fileName,
    mimeType
) {

    const existing =
        fileName
            .split(".")
            .pop()
            ?.toLowerCase();


    if (
        existing &&
        /^[a-z0-9]{1,5}$/.test(existing)
    ) {
        return existing;
    }


    if (mimeType === "image/png") {
        return "png";
    }


    if (mimeType === "image/webp") {
        return "webp";
    }


    return "jpg";
}


/* =========================================================
   PROFILE PREVIEW
   ========================================================= */

function updateProfilePreview() {

    const name =
        adminName?.value.trim() ||
        "Admin User";


    const role =
        adminDesignation?.value.trim() ||
        "System Administrator";


    const id =
        adminId?.value.trim() ||
        ADMIN_DISPLAY_ID;


    const status =
        adminStatus?.value ||
        "Active";


    if (profileDisplayName) {

        profileDisplayName.textContent =
            name;
    }


    if (profileDisplayRole) {

        profileDisplayRole.textContent =
            role;
    }


    if (profileDisplayId) {

        profileDisplayId.textContent =
            id;
    }


    if (profileDisplayStatus) {

        profileDisplayStatus.textContent =
            status;

        profileDisplayStatus.classList.remove(
            "active",
            "inactive"
        );

        profileDisplayStatus.classList.add(
            status.toLowerCase() === "active"
                ? "active"
                : "inactive"
        );
    }


    if (profilePhotoPreview) {

        profilePhotoPreview.src =
            currentPhoto ||
            DEFAULT_PHOTO;
    }
}


/* =========================================================
   SAVE PROFILE
   ========================================================= */

async function handleProfileSubmit(event) {

    event.preventDefault();

    clearValidationMessages();


    if (
        !authUser ||
        !originalProfile
    ) {

        showToast(
            "Profile Not Ready",
            "Please wait for the profile to finish loading.",
            true
        );

        return;
    }


    if (!validateProfile()) {

        showToast(
            "Check Information",
            "Please correct the highlighted fields.",
            true
        );

        return;
    }


    saveProfileButton.disabled =
        true;

    saveProfileButton.textContent =
        "Saving...";


    try {

        const passwordRequested =
            Boolean(
                currentPassword.value ||
                newPassword.value ||
                confirmPassword.value
            );


        if (passwordRequested) {

            await changePassword();
        }


        let photoUrl =
            originalProfile.photo ||
            DEFAULT_PHOTO;


        const oldPhotoUrl =
            originalProfile.photo;


        if (selectedPhotoFile) {

            photoUrl =
                await uploadProfilePhoto();

        } else if (photoRemoved) {

            photoUrl = null;
        }


        const newEmail =
            adminEmail.value.trim();


        const emailChanged =
            newEmail.toLowerCase() !==
            (
                authUser.email ||
                ""
            ).toLowerCase();


        if (emailChanged) {

            const {
                data: emailData,
                error: emailError
            } = await SUPABASE.auth.updateUser({
                email: newEmail
            });


            if (emailError) {

                throw new Error(
                    `Email update failed: ${emailError.message}`
                );
            }


            const authEmailAfterUpdate =
                emailData?.user?.email ||
                authUser.email;


            if (
                authEmailAfterUpdate &&
                authEmailAfterUpdate.toLowerCase() !==
                newEmail.toLowerCase()
            ) {

                showToast(
                    "Email Confirmation Required",
                    "A confirmation email was sent. Your profile email will update after confirmation."
                );
            }
        }


        const status =
            adminStatus.value === "Active"
                ? "active"
                : "inactive";


        const updatePayload = {

            full_name:
                adminName.value.trim(),

            email:
                newEmail,

            phone:
                adminMobile.value.trim(),

            alternate_phone:
                adminAlternateMobile.value.trim() ||
                null,

            designation:
                adminDesignation.value.trim() ||
                null,

            department:
                adminDepartment.value ||
                null,

            status,

            photo_url:
                photoUrl === DEFAULT_PHOTO
                    ? null
                    : photoUrl,

            updated_at:
                new Date().toISOString()
        };


        const {
            data: savedProfile,
            error: profileError
        } = await SUPABASE
            .from("profiles")
            .update(updatePayload)
            .eq("id", authUser.id)
            .eq("role", "admin")
            .select(
                "id,email,phone,alternate_phone,full_name,role,status,designation,department,photo_url,created_at,updated_at,last_login_at"
            )
            .single();


        if (profileError) {

            throw new Error(
                `Profile save failed: ${profileError.message}`
            );
        }


        if (
            photoRemoved &&
            oldPhotoUrl &&
            oldPhotoUrl !== DEFAULT_PHOTO
        ) {

            await removeStoredProfilePhoto(
                oldPhotoUrl
            );
        }


        originalProfile =
            normalizeProfile(
                savedProfile
            );


        applyProfileToForm(
            originalProfile
        );


        showToast(
            "Profile Saved",
            emailChanged
                ? "Profile saved. Check your email if Supabase requested confirmation."
                : "Administrator profile updated successfully."
        );


    } catch (error) {

        console.error(
            "Profile save error:",
            error
        );


        showToast(
            "Save Failed",
            error.message ||
                "Unable to save the administrator profile.",
            true
        );


    } finally {

        saveProfileButton.disabled =
            false;

        saveProfileButton.textContent =
            "Save Changes";

        updateProfilePreview();
    }
}


/* =========================================================
   PASSWORD
   ========================================================= */

async function changePassword() {

    const current =
        currentPassword.value;


    const next =
        newPassword.value;


    if (
        !current ||
        !next ||
        next !== confirmPassword.value
    ) {

        throw new Error(
            "Please enter and confirm the new password correctly."
        );
    }


    if (next.length < 6) {

        throw new Error(
            "New password must contain at least 6 characters."
        );
    }


    if (!authUser.email) {

        throw new Error(
            "The authenticated administrator does not have an email address for password verification."
        );
    }


    const {
        error: verifyError
    } = await SUPABASE.auth.signInWithPassword({

        email:
            authUser.email,

        password:
            current
    });


    if (verifyError) {

        throw new Error(
            "Current password is incorrect."
        );
    }


    const {
        error: passwordError
    } = await SUPABASE.auth.updateUser({

        password:
            next
    });


    if (passwordError) {

        throw new Error(
            `Password update failed: ${passwordError.message}`
        );
    }
}


/* =========================================================
   VALIDATION
   ========================================================= */

function validateProfile() {

    let valid = true;


    const name =
        adminName.value.trim();


    const email =
        adminEmail.value.trim();


    const mobile =
        adminMobile.value.trim();


    const alternateMobile =
        adminAlternateMobile.value.trim();


    const passwordEntered =
        currentPassword.value ||
        newPassword.value ||
        confirmPassword.value;


    if (!name) {

        setValidation(
            adminName,
            "adminNameError",
            "Full name is required."
        );

        valid = false;

    } else if (name.length < 2) {

        setValidation(
            adminName,
            "adminNameError",
            "Name must contain at least 2 characters."
        );

        valid = false;
    }


    if (!email) {

        setValidation(
            adminEmail,
            "adminEmailError",
            "Email address is required."
        );

        valid = false;

    } else if (!isValidEmail(email)) {

        setValidation(
            adminEmail,
            "adminEmailError",
            "Enter a valid email address."
        );

        valid = false;
    }


    if (!mobile) {

        setValidation(
            adminMobile,
            "adminMobileError",
            "Mobile number is required."
        );

        valid = false;

    } else if (!/^\d{10}$/.test(mobile)) {

        setValidation(
            adminMobile,
            "adminMobileError",
            "Mobile number must contain exactly 10 digits."
        );

        valid = false;
    }


    if (
        alternateMobile &&
        !/^\d{10}$/.test(alternateMobile)
    ) {

        setValidation(
            adminAlternateMobile,
            "adminAlternateMobileError",
            "Alternate mobile number must contain exactly 10 digits."
        );

        valid = false;
    }


    if (adminStatus.value !== "Active") {

        setValidation(
            adminStatus,
            null,
            "The currently logged-in administrator must remain Active."
        );

        valid = false;
    }


    if (passwordEntered) {

        if (!currentPassword.value) {

            setValidation(
                currentPassword,
                null,
                "Enter your current password."
            );

            valid = false;
        }


        if (!newPassword.value) {

            setValidation(
                newPassword,
                "newPasswordError",
                "Enter a new password."
            );

            valid = false;

        } else if (newPassword.value.length < 6) {

            setValidation(
                newPassword,
                "newPasswordError",
                "New password must contain at least 6 characters."
            );

            valid = false;
        }


        if (!confirmPassword.value) {

            setValidation(
                confirmPassword,
                "confirmPasswordError",
                "Please confirm the new password."
            );

            valid = false;

        } else if (
            newPassword.value !==
            confirmPassword.value
        ) {

            setValidation(
                confirmPassword,
                "confirmPasswordError",
                "Passwords do not match."
            );

            valid = false;
        }
    }


    return valid;
}


function setValidation(
    input,
    errorId,
    message
) {

    input?.classList.add(
        "input-error"
    );


    if (errorId) {

        const errorElement =
            document.getElementById(
                errorId
            );


        if (errorElement) {

            errorElement.textContent =
                message;
        }


        return;
    }


    if (!input?.parentElement) {
        return;
    }


    let messageElement =
        input.parentElement.querySelector(
            ".validation-message"
        );


    if (!messageElement) {

        messageElement =
            document.createElement(
                "span"
            );

        messageElement.className =
            "validation-message";

        input.parentElement.appendChild(
            messageElement
        );
    }


    messageElement.textContent =
        message;
}


function clearValidationMessages() {

    document
        .querySelectorAll(
            ".validation-message"
        )
        .forEach((element) => {

            element.textContent = "";
        });


    document
        .querySelectorAll(
            ".input-error"
        )
        .forEach((element) => {

            element.classList.remove(
                "input-error"
            );
        });
}


function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );
}


function restrictPhoneInput(event) {

    event.target.value =
        event.target.value
            .replace(/\D/g, "")
            .slice(0, 10);
}


function normalizePhone(value) {

    return String(value || "")
        .replace(/^\+91/, "")
        .replace(/\D/g, "")
        .slice(0, 10);
}


/* =========================================================
   RESET
   ========================================================= */

function handleReset() {

    if (!originalProfile) {
        return;
    }


    const confirmed =
        window.confirm(
            "Reset all unsaved profile changes?"
        );


    if (!confirmed) {
        return;
    }


    applyProfileToForm(
        originalProfile
    );


    clearValidationMessages();


    showToast(
        "Reset Complete",
        "Unsaved changes have been reset."
    );
}


/* =========================================================
   PASSWORD TOGGLE
   ========================================================= */

function togglePassword(
    targetId,
    button
) {

    const input =
        document.getElementById(
            targetId
        );


    if (!input) {
        return;
    }


    if (input.type === "password") {

        input.type = "text";

        button.textContent =
            "Hide";

    } else {

        input.type = "password";

        button.textContent =
            "Show";
    }
}


/* =========================================================
   UI HELPERS
   ========================================================= */

function setPageBusy(busy) {

    if (!adminProfileForm) {
        return;
    }


    adminProfileForm.classList.toggle(
        "profile-loading",
        busy
    );


    document.body.classList.toggle(
        "profile-loading",
        busy
    );
}


function redirectToLogin(message) {

    if (message) {
        console.warn(message);
    }


    window.location.href =
        "../index.html";
}


function getSupabaseError(error) {

    return (
        error?.message ||
        "Unable to access the Supabase profile record."
    );
}


function showToast(
    title,
    message,
    isError = false
) {

    if (
        !toast ||
        !toastTitle ||
        !toastMessage
    ) {
        return;
    }


    clearTimeout(
        toastTimer
    );


    toastTitle.textContent =
        title;


    toastMessage.textContent =
        message;


    if (toastIcon) {

        toastIcon.textContent =
            isError
                ? "!"
                : "✓";
    }


    toast.classList.toggle(
        "error",
        isError
    );


    toast.classList.add(
        "show"
    );


    toastTimer =
        setTimeout(
            hideToast,
            5000
        );
}


function hideToast() {

    toast?.classList.remove(
        "show"
    );


    clearTimeout(
        toastTimer
    );
}