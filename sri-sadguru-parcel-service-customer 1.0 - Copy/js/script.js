"use strict";

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        /* =====================================================
           AUTH-4.4
           REDIRECT ALREADY LOGGED-IN CUSTOMER
        ====================================================== */

        if (
            window.SSPAuth &&
            typeof SSPAuth.redirectIfAuthenticated ===
            "function"
        ) {
 
            const redirected =
                await SSPAuth.redirectIfAuthenticated();

            if (redirected) {
                return;
            }
        }


        /* =====================================================
           ELEMENTS
        ====================================================== */

        const loginForm =
            document.getElementById("loginForm");

        const loginIdentifier =
            document.getElementById("loginIdentifier");

        const password =
            document.getElementById("password");

        const passwordToggle =
            document.getElementById("passwordToggle");

        const rememberMe =
            document.getElementById("rememberMe");

        const loginButton =
            document.getElementById("loginButton");

        const loginButtonText =
            document.getElementById("loginButtonText");

        const buttonLoader =
            document.getElementById("buttonLoader");

        const identifierError =
            document.getElementById("identifierError");

        const passwordError =
            document.getElementById("passwordError");

        const formMessage =
            document.getElementById("formMessage");

        const forgotPassword =
            document.getElementById("forgotPassword");

        const currentYear =
            document.getElementById("currentYear");


        /* =====================================================
           BASIC CHECKS
        ====================================================== */

        if (currentYear) {

            currentYear.textContent =
                new Date().getFullYear();
        }


        if (!loginForm) {

            console.error(
                "SSP: loginForm was not found."
            );

            return;
        }


        if (passwordToggle && password) {

            passwordToggle.addEventListener(
                "click",
                function () {

                    const showingPassword =
                        password.type === "text";


                    password.type =
                        showingPassword
                            ? "password"
                            : "text";


                    passwordToggle.textContent =
                        showingPassword
                            ? "Show"
                            : "Hide";


                    passwordToggle.setAttribute(
                        "aria-label",
                        showingPassword
                            ? "Show password"
                            : "Hide password"
                    );


                    passwordToggle.setAttribute(
                        "aria-pressed",
                        showingPassword
                            ? "false"
                            : "true"
                    );
                }
            );
        }


        if (!window.supabaseClient) {

            console.error(
                "SSP: Supabase client is not available."
            );

            if (formMessage) {

                formMessage.textContent =
                    "Connection error. Please refresh the page.";
            }

            return;
        }


        /* =====================================================
           HELPERS
        ====================================================== */

        function clearErrors() {

            if (identifierError) {
                identifierError.textContent = "";
            }

            if (passwordError) {
                passwordError.textContent = "";
            }

            if (formMessage) {
                formMessage.textContent = "";
                formMessage.classList.remove("show", "error");
            }
        }


        function showMessage(message) {

            if (formMessage) {
                formMessage.textContent = message;
            }
        }


        function showError(message) {

            if (formMessage) {
                formMessage.textContent = message;
                formMessage.classList.add("show", "error");
            }
        }


        function setLoading(loading) {

            if (loginButton) {
                loginButton.disabled = loading;
            }


            if (loginButtonText) {

                loginButtonText.style.display =
                    loading
                        ? "none"
                        : "inline";
            }


            if (buttonLoader) {

                buttonLoader.style.display =
                    loading
                        ? "inline-block"
                        : "none";
            }
        }


        /* =====================================================
           VALIDATION
        ====================================================== */

        function isGmail(value) {

            return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i
                .test(value);
        }


        function isPhone(value) {

            return /^[6-9][0-9]{9}$/
                .test(value);
        }


        function normalizePhone(value) {

            let phone =
                value
                    .trim()
                    .replace(/\s+/g, "")
                    .replace(/-/g, "");


            if (phone.startsWith("+91")) {

                phone =
                    phone.substring(3);
            }


            if (
                phone.startsWith("91") &&
                phone.length === 12
            ) {

                phone =
                    phone.substring(2);
            }


            return phone;
        }


        /* =====================================================
           ERROR MESSAGE
        ====================================================== */

        function getLoginError(error) {

            const message =
                error?.message?.toLowerCase() || "";


            if (
                message.includes(
                    "invalid login credentials"
                )
            ) {

                return "Your phone number/Gmail or password is wrong.";
            }


            if (
                message.includes(
                    "email not confirmed"
                )
            ) {

                return "Please confirm your Gmail before logging in.";
            }


            if (
                message.includes(
                    "too many requests"
                ) ||
                message.includes(
                    "rate limit"
                )
            ) {

                return "Too many login attempts. Please try again later.";
            }


            if (
                message.includes(
                    "user not found"
                )
            ) {

                return "No customer account was found.";
            }


            return (
                error?.message ||
                "Login failed. Please try again."
            );
        }


        /* =====================================================
           FORGOT PASSWORD
           
           OTP IS ONLY USED THERE.
        ====================================================== */

        if (forgotPassword) {

            forgotPassword.addEventListener(
                "click",
                function () {

                    window.location.href =
                        "customer/forgot-password.html";

                }
            );
        }


        /* =====================================================
           LOGIN
        ====================================================== */

        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                clearErrors();


                const identifier =
                    loginIdentifier
                        ? loginIdentifier.value.trim()
                        : "";


                const enteredPassword =
                    password
                        ? password.value
                        : "";


                /* =============================================
                   IDENTIFIER VALIDATION
                ============================================== */

                if (!identifier) {

                    if (identifierError) {

                        identifierError.textContent =
                            "Please enter your phone number or Gmail.";
                    }


                    if (loginIdentifier) {
                        loginIdentifier.focus();
                    }


                    return;
                }


                /* =============================================
                   PASSWORD VALIDATION
                ============================================== */

                if (!enteredPassword) {

                    if (passwordError) {

                        passwordError.textContent =
                            "Please enter your password.";
                    }


                    if (password) {
                        password.focus();
                    }


                    return;
                }


                setLoading(true);


                showMessage(
                    "Signing in..."
                );


                try {

                    let emailForLogin = "";


                    /* =========================================
                       GMAIL LOGIN
                    ========================================= */

                    if (identifier.includes("@")) {

                        if (!isGmail(identifier)) {

                            throw new Error(
                                "Please enter a valid Gmail address."
                            );
                        }


                        emailForLogin =
                            identifier.toLowerCase();

                    }


                    /* =========================================
                       PHONE LOGIN
                    ========================================= */

                    else {

                        const phone =
                            normalizePhone(identifier);


                        if (!isPhone(phone)) {

                            throw new Error(
                                "Please enter a valid 10-digit Indian mobile number."
                            );
                        }


                        showMessage(
                            "Checking your customer account..."
                        );


                        const {
                            data,
                            error
                        } =
                            await window.supabaseClient
                                .rpc(
                                    "get_customer_email_by_phone",
                                    {
                                        customer_phone:
                                            "+91" + phone
                                    }
                                );


                        if (error) {

                            console.error(
                                "Phone lookup error:",
                                error
                            );


                            throw new Error(
                                "Unable to find the customer account. Please try again."
                            );
                        }


                        if (!data) {

                            throw new Error(
                                "No active customer account was found with this phone number."
                            );
                        }


                        emailForLogin =
                            String(data)
                                .trim()
                                .toLowerCase();
                    }


                    /* =========================================
                       CHECK EMAIL
                    ========================================= */

                    if (!emailForLogin) {

                        throw new Error(
                            "Customer email could not be found."
                        );
                    }


                    /* =========================================
                       SUPABASE PASSWORD LOGIN
                    ========================================= */

                    showMessage(
                        "Verifying your password..."
                    );


                    const {
                        data: loginData,
                        error: loginError
                    } =
                        await window.supabaseClient
                            .auth
                            .signInWithPassword({

                                email:
                                    emailForLogin,

                                password:
                                    enteredPassword

                            });


                    if (loginError) {

                        console.error(
                            "Supabase login error:",
                            loginError
                        );

                        throw loginError;
                    }


                    /* =========================================
                       VERIFY SESSION
                    ========================================= */

                    const {
                        data: sessionData,
                        error: sessionError
                    } =
                        await window.supabaseClient
                            .auth
                            .getSession();


                    if (sessionError) {

                        console.error(
                            "Session error:",
                            sessionError
                        );

                        throw sessionError;
                    }


                    if (
                        !loginData ||
                        !loginData.session ||
                        !sessionData ||
                        !sessionData.session
                    ) {

                        throw new Error(
                            "Login session could not be created."
                        );
                    }


                    /* =========================================
                       REMEMBER ME
                    ========================================= */

                    if (rememberMe) {

                        localStorage.setItem(
                            "SSP_remember_me",
                            rememberMe.checked
                                ? "true"
                                : "false"
                        );
                    }


                    /* =========================================
                       LOGIN SUCCESS
                    ========================================= */

                    showMessage(
                        "Login successful. Redirecting..."
                    );


                    window.location.replace(
                        "customer/dashboard.html"
                    );

                }


                /* =============================================
                   LOGIN ERROR
                ============================================= */

                catch (error) {

                    console.error(
                        "SSP Customer Login Error:",
                        error
                    );


                    showError(
                        getLoginError(error)
                    );
                }


                /* =============================================
                   FINISH LOADING
                ============================================= */

                finally {

                    setLoading(false);
                }

            }
        );

    }
);