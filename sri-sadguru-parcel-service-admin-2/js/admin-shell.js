"use strict";

(function initializeAdminShell() {
    const pageName = window.location.pathname.split("/").pop().toLowerCase();
    const isDashboard = pageName === "dashboard.html";
    const pageRoutes = [
        ["dashboard", "Dashboard", "dashboard.html", "fa-solid fa-house"],
        ["bookings", "Bookings", "bookings.html", "fa-regular fa-calendar-days"],
        ["payments", "Payments", "payments.html", "fa-regular fa-credit-card"],
        ["tracking", "Tracking", "tracking.html", "fa-solid fa-location-dot"],
        ["recent-orders", "Recent Orders", "bookings.html", "fa-regular fa-clock"],
        ["pickup", "Pickup Management", "pickup-management.html", "fa-solid fa-box-open"],
        ["delivery", "Delivery Management", "delivery-management.html", "fa-solid fa-truck-fast"],
        ["drivers", "Drivers", "drivers.html", "fa-solid fa-users"],
        ["vehicles", "Vehicles", "vehicles.html", "fa-solid fa-truck"],
        ["customers", "Customers", "customers.html", "fa-regular fa-user"],
        ["reports", "Reports", "reports.html", "fa-regular fa-chart-bar"],
        ["profile", "Admin Profile", "admin-profile.html", "fa-regular fa-user"],
        ["settings", "Settings", "settings.html", "fa-solid fa-gear"],
        ["notifications", "Notifications", "notifications.html", "fa-regular fa-bell"]
    ];
    const sidebarRoutes = pageRoutes.slice(0, 13);
    const moreRoutes = pageRoutes.slice(4);
    const activePageByFile = {
        "add-vehicles.html": "vehicles",
        "admin-profile.html": "profile",
        "bookings-details.html": "bookings",
        "customer-details.html": "customers",
        "delivery-management.html": "delivery",
        "download-bill.html": "bookings",
        "drivers-details.html": "drivers",
        "edit-booking.html": "bookings",
        "new-booking.html": "bookings",
        "new-customer.html": "customers",
        "new-driver-registration.html": "drivers",
        "pickup-management.html": "pickup",
        "vehicle-details.html": "vehicles"
    };
    const currentPage = activePageByFile[pageName] ||
        (pageName.replace(".html", "") || "dashboard");

    function makeLink(route, className) {
        const [key, label, file, icon] = route;
        const link = document.createElement("a");
        link.className = className;
        link.href = file;
        link.dataset.page = key;
        link.setAttribute("aria-label", label);
        link.innerHTML = `<i class="${icon}" aria-hidden="true"></i><span>${label}</span>`;
        if (key === currentPage) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }
        return link;
    }

    function addFontAwesome() {
        if (document.querySelector('link[href*="font-awesome"], link[href*="fontawesome"]')) {
            return;
        }
        const iconStylesheet = document.createElement("link");
        iconStylesheet.rel = "stylesheet";
        iconStylesheet.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";
        iconStylesheet.crossOrigin = "anonymous";
        iconStylesheet.referrerPolicy = "no-referrer";
        document.head.append(iconStylesheet);
    }

    function createSidebar() {
        const existingSidebars = Array.from(
            document.querySelectorAll("#sidebar, .sidebar")
        );
        let sidebar = existingSidebars.find((item) => item.id === "sidebar") ||
            existingSidebars[0];
        if (!sidebar) {
            sidebar = document.createElement("aside");
            sidebar.id = "sidebar";
            sidebar.className = "sidebar";
            sidebar.setAttribute("aria-label", "Admin navigation");
            document.body.prepend(sidebar);
            document.body.classList.add("ssp-sidebar-injected");
        }

        existingSidebars.forEach((item) => {
            if (item !== sidebar) {
                item.remove();
            }
        });

        sidebar.classList.add("ssp-master-sidebar");
        sidebar.setAttribute("aria-label", "Admin navigation");

        let brand = sidebar.querySelector(".sidebar-brand, .sidebar-header, .brand");
        if (!brand) {
            brand = document.createElement("div");
            brand.className = "ssp-sidebar-brand";
            sidebar.prepend(brand);
        } else {
            brand.classList.add("ssp-sidebar-brand");
        }
        const existingControls = Array.from(brand.querySelectorAll("button, [id$='Close']"));
        const logoutControls = Array.from(sidebar.querySelectorAll(
            "#logoutBtn, #logoutButton, .logout-btn, .logout-button"
        ));
        const logoutButton = logoutControls[0] || document.createElement("button");
        brand.replaceChildren(...existingControls);
        const brandLink = document.createElement("a");
        brandLink.className = "ssp-brand-link";
        brandLink.href = "dashboard.html";
        brandLink.setAttribute("aria-label", "Sri Sadguru Admin Dashboard");
        brandLink.innerHTML = '<img class="ssp-brand-logo" src="../images/logo.png" alt="Sri Sadguru Siddarooda Parcel Service"><span><strong>SRI SADGURU</strong><small>SIDDAROODA PARCEL SERVICE</small></span>';
        brand.prepend(brandLink);

        let nav = sidebar.querySelector(".sidebar-nav, .side-nav");
        if (!nav) {
            nav = document.createElement("nav");
            sidebar.append(nav);
        }
        nav.classList.add("sidebar-nav", "ssp-master-nav");
        nav.setAttribute("aria-label", "Admin pages");
        nav.replaceChildren(...sidebarRoutes.map((route) => makeLink(route, "nav-item")));

        let footer = sidebar.querySelector(".sidebar-bottom, .sidebar-footer, .ssp-sidebar-footer");
        if (!footer) {
            footer = document.createElement("div");
            footer.className = "sidebar-bottom ssp-sidebar-footer";
            sidebar.append(footer);
        }

        logoutControls.slice(1).forEach((control) => control.remove());
        logoutButton.classList.add("logout-btn");
        if (!logoutButton.matches("button, a")) {
            logoutButton.removeAttribute("href");
        }
        if (!logoutButton.id) {
            logoutButton.id = "logoutBtn";
        }
        if (!logoutButton.textContent.trim()) {
            logoutButton.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i><span>Logout</span>';
        }
        if (!logoutControls.length) {
            logoutButton.type = "button";
            logoutButton.addEventListener("click", async (event) => {
                event.preventDefault();
                logoutButton.disabled = true;
                try {
                    if (typeof window.adminLogout === "function") {
                        await window.adminLogout();
                        return;
                    }
                    const client = window.supabaseClient;
                    if (!client?.auth) {
                        throw new Error("Admin authentication is unavailable.");
                    }
                    const { error } = await client.auth.signOut();
                    if (error) {
                        throw error;
                    }
                    window.location.replace("../index.html");
                } catch (error) {
                    console.error("Admin logout failed:", error);
                    logoutButton.disabled = false;
                    window.alert("Unable to log out. Please try again.");
                }
            });
        }
        logoutButton.remove();
        footer.append(logoutButton);

        let profileCard = sidebar.querySelector(
            ".sidebar-admin-card, .admin-user, .sidebar-admin"
        );
        if (!profileCard) {
            profileCard = document.createElement("div");
            profileCard.className = "sidebar-admin-card";
            profileCard.innerHTML = '<div class="avatar avatar-purple" id="sidebarAdminAvatar">AD</div><div class="sidebar-admin-info"><strong id="sidebarAdminName">Admin</strong><span id="sidebarAdminRole">Admin</span><span class="online-status"><i aria-hidden="true"></i>Online</span></div>';
        }
        profileCard.classList.add("sidebar-admin-card");
        profileCard.remove();
        footer.append(profileCard);
        return sidebar;
    }

    function createOverlay() {
        const existingOverlays = Array.from(document.querySelectorAll(
            "#sidebarOverlay, #mobileOverlay, .sidebar-overlay, .mobile-overlay"
        ));
        let overlay = document.getElementById("sidebarOverlay") ||
            document.getElementById("mobileOverlay") ||
            existingOverlays[0];
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "sidebarOverlay";
            document.body.append(overlay);
        }
        existingOverlays.forEach((item) => {
            if (item !== overlay) {
                item.remove();
            }
        });
        overlay.classList.add("sidebar-overlay", "ssp-sidebar-overlay");
        overlay.setAttribute("aria-hidden", "true");
        return overlay;
    }

    function ensureHeaderControl(sidebar) {
        const header = document.querySelector(".top-header, .topbar, .mobile-topbar, .page-header, .bill-toolbar");
        if (!header) {
            const appHeader = document.createElement("header");
            appHeader.className = "ssp-mobile-header";
            document.body.prepend(appHeader);
            appHeader.innerHTML = '<button class="ssp-menu-trigger" type="button" data-ssp-sidebar-toggle="true" aria-label="Open navigation" aria-expanded="false"><i class="fa-solid fa-bars" aria-hidden="true"></i></button>';
            appHeader.querySelector(".ssp-menu-trigger").setAttribute("aria-controls", sidebar.id);
            const pageHasBrand = isDashboard && Array.from(document.images).some((image) =>
                !image.closest(".ssp-master-sidebar") && image.src.includes("logo")
            );
            if (isDashboard && !pageHasBrand) {
                const logo = document.createElement("a");
                logo.className = "ssp-header-logo";
                logo.href = "dashboard.html";
                logo.setAttribute("aria-label", "Admin Dashboard");
                logo.innerHTML = '<img src="../images/logo.png" alt="Sri Sadguru Siddarooda Parcel Service">';
                appHeader.append(logo);
            }
            return;
        }

        header.classList.add("ssp-admin-header");
        if (!isDashboard) {
            header.querySelectorAll(".ssp-header-logo, img[src*='logo']").forEach((logo) => {
                if (logo.matches(".ssp-header-logo")) {
                    logo.remove();
                    return;
                }
                const logoLink = logo.closest("a");
                if (logoLink && logoLink.textContent.trim() === "" &&
                    Array.from(logoLink.children).every((child) => child === logo)) {
                    logoLink.remove();
                } else {
                    logo.remove();
                }
            });
        }
        const existingTrigger = header.querySelector(
            "#desktopMenuBtn, #mobileMenuBtn, #menuBtn, #menuButton, #mobileMenuButton, #sidebarToggle, #menuToggle, .menu-btn, .menu-button, .menu-toggle, .sidebar-collapse"
        );
        const trigger = existingTrigger || document.createElement("button");
        if (!existingTrigger) {
            trigger.type = "button";
            trigger.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
            header.prepend(trigger);
        }
        trigger.classList.add("ssp-menu-trigger");
        trigger.dataset.sspSidebarToggle = "true";
        trigger.setAttribute("aria-label", "Toggle navigation");
        trigger.setAttribute("aria-controls", sidebar.id);
        trigger.setAttribute("aria-expanded", "false");

        if (isDashboard && !header.querySelector(".ssp-header-logo, img[src*='logo']")) {
            const logo = document.createElement("a");
            logo.className = "ssp-header-logo";
            logo.href = "dashboard.html";
            logo.setAttribute("aria-label", "Admin Dashboard");
            logo.innerHTML = '<img src="../images/logo.png" alt="Sri Sadguru Siddarooda Parcel Service">';
            header.append(logo);
        }
    }

    function createBottomNavigation() {
        document.querySelectorAll(".mobile-bottom-nav").forEach((nav) => nav.remove());
        document.querySelectorAll("#mobileMoreMenu, .mobile-more-menu").forEach((menu) => menu.remove());

        const nav = document.createElement("nav");
        nav.className = "mobile-bottom-nav ssp-bottom-nav";
        nav.setAttribute("aria-label", "Mobile navigation");
        const primaryRoutes = pageRoutes.slice(0, 4);
        for (const route of primaryRoutes) {
            const [key, label, file, icon] = route;
            const item = document.createElement("a");
            item.className = "bottom-nav-item";
            item.href = file;
            item.dataset.bottomPage = key === "dashboard" ? "home" : key === "payments" ? "payment" : key;
            item.innerHTML = `<i class="${icon}" aria-hidden="true"></i><span>${key === "dashboard" ? "Home" : key === "payments" ? "Payment" : label}</span>`;
            if ((key === "dashboard" && currentPage === "dashboard") ||
                (key !== "dashboard" && key === currentPage)) {
                item.classList.add("active");
                item.setAttribute("aria-current", "page");
            }
            nav.append(item);
        }
        const moreButton = document.createElement("button");
        moreButton.type = "button";
        moreButton.id = "mobileMoreBtn";
        moreButton.className = "bottom-nav-item ssp-more-trigger";
        moreButton.setAttribute("aria-expanded", "false");
        moreButton.setAttribute("aria-controls", "mobileMoreMenu");
        moreButton.innerHTML = '<i class="fa-solid fa-ellipsis" aria-hidden="true"></i><span>More</span>';
        if (!primaryRoutes.some(([key]) => key === currentPage)) {
            moreButton.classList.add("active");
        }
        nav.append(moreButton);
        document.body.append(nav);

        const menu = document.createElement("div");
        menu.id = "mobileMoreMenu";
        menu.className = "mobile-more-menu ssp-more-menu";
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-hidden", "true");
        for (const route of moreRoutes) {
            const [key, label, file, icon] = route;
            const item = document.createElement(isDashboard ? "button" : "a");
            item.className = "more-menu-item";
            if (isDashboard) {
                item.type = "button";
            } else {
                item.href = file;
            }
            item.dataset.morePage = key;
            item.setAttribute("role", "menuitem");
            item.innerHTML = `<i class="${icon}" aria-hidden="true"></i><span>${label}</span>`;
            if (key === "notifications") {
                const unreadCount = document.createElement("span");
                unreadCount.id = "sidebarUnreadCount";
                unreadCount.className = "ssp-unread-count";
                unreadCount.setAttribute("aria-label", "Unread notifications");
                unreadCount.style.display = "none";
                item.append(unreadCount);
            }
            if (key === currentPage) {
                item.classList.add("active");
                item.setAttribute("aria-current", "page");
            }
            menu.append(item);
        }
        document.body.append(menu);
    }

    function annotateSummaryGrids() {
        document.querySelectorAll(
            ".summary-grid, .summary-cards, .stats-grid, .stat-grid, .kpi-grid, .metrics-grid"
        ).forEach((grid) => {
            grid.dataset.summaryCount = String(grid.children.length);
            grid.style.setProperty("--ssp-summary-count", String(grid.children.length));
        });
    }

    function setSidebarOpen(open) {
        const sidebar = document.getElementById("sidebar");
        const overlay = document.querySelector(".ssp-sidebar-overlay");
        document.body.classList.toggle("ssp-sidebar-open", open);
        sidebar?.classList.toggle("mobile-sidebar-open", open);
        overlay?.classList.toggle("show", open);
        overlay?.setAttribute("aria-hidden", String(!open));
        document.querySelectorAll(".ssp-menu-trigger").forEach((button) => {
            button.setAttribute("aria-expanded", String(open));
        });
        if (open) {
            closeMoreMenu();
            sidebar?.querySelector("a")?.focus({ preventScroll: true });
        }
        if (!open) {
            document.querySelector('[data-ssp-sidebar-toggle="true"]')?.focus({ preventScroll: true });
        }
    }

    function closeMoreMenu() {
        const menu = document.getElementById("mobileMoreMenu");
        const trigger = document.getElementById("mobileMoreBtn");
        menu?.classList.remove("show");
        menu?.setAttribute("aria-hidden", "true");
        trigger?.setAttribute("aria-expanded", "false");
    }

    function bindNavigation(sidebar, overlay) {
        if (isDashboard) {
            return;
        }
        document.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }
            if (target.closest("#sidebarClose, .sidebar-close, [data-sidebar-close]")) {
                setSidebarOpen(false);
                return;
            }
            const trigger = target.closest("[data-ssp-sidebar-toggle='true']");
            if (trigger) {
                event.preventDefault();
                const isOpen = document.body.classList.contains("ssp-sidebar-open");
                if (window.matchMedia("(max-width: 1023px)").matches) {
                    setSidebarOpen(!isOpen);
                } else {
                    document.body.classList.toggle("ssp-sidebar-collapsed");
                }
                return;
            }
            if (target.closest(".ssp-sidebar-overlay")) {
                setSidebarOpen(false);
                return;
            }
            const moreTrigger = target.closest("#mobileMoreBtn");
            if (moreTrigger) {
                event.preventDefault();
                if (document.body.classList.contains("ssp-sidebar-open")) {
                    setSidebarOpen(false);
                }
                const menu = document.getElementById("mobileMoreMenu");
                const opening = !menu?.classList.contains("show");
                menu?.classList.toggle("show", opening);
                menu?.setAttribute("aria-hidden", String(!opening));
                moreTrigger.setAttribute("aria-expanded", String(opening));
                return;
            }
            if (target.closest(".ssp-more-menu a[data-more-page]")) {
                closeMoreMenu();
                setSidebarOpen(false);
                return;
            }
            if (target.closest(".ssp-master-nav a")) {
                if (window.matchMedia("(max-width: 1023px)").matches) {
                    setSidebarOpen(false);
                }
                return;
            }
            if (document.body.classList.contains("ssp-sidebar-open") &&
                !sidebar.contains(target) &&
                !target.closest(".ssp-menu-trigger")) {
                setSidebarOpen(false);
            }
            if (document.getElementById("mobileMoreMenu")?.classList.contains("show") &&
                !target.closest("#mobileMoreMenu") &&
                !target.closest("#mobileMoreBtn")) {
                closeMoreMenu();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                setSidebarOpen(false);
                closeMoreMenu();
            }
        });

        overlay.addEventListener("click", () => setSidebarOpen(false));
    }

    function initialize() {
        if (!document.body || document.body.dataset.sspAdminShell === "ready") {
            return;
        }
        document.body.dataset.sspAdminShell = "ready";
        document.body.classList.add("ssp-admin-app");
        addFontAwesome();
        const sidebar = createSidebar();
        const overlay = createOverlay();
        ensureHeaderControl(sidebar);
        createBottomNavigation();
        annotateSummaryGrids();
        bindNavigation(sidebar, overlay);
    }

    function loadAdminPreferences() {
        if (pageName === "settings.html" || !window.supabaseClient) {
            return;
        }

        const load = () => {
            window.SSPAdminSettings?.get().catch((error) => {
                console.error(
                    "Unable to load Admin appearance settings:",
                    error
                );
            });
        };

        if (window.SSPAdminSettings) {
            load();
            return;
        }

        const script = document.createElement("script");
        script.src = "../js/admin-settings.js";
        script.onload = load;
        script.onerror = () => {
            console.error("Unable to load the shared Admin Settings helper.");
        };
        document.head.append(script);
    }

    initialize();
    document.addEventListener(
        "DOMContentLoaded",
        loadAdminPreferences
    );
})();
