"use strict"; 

/*
    Root portal navigation

    Update these paths only if your actual folder names are different.
*/

const PORTAL_URLS = {
    admin: "sri-sadguru-parcel-service-admin-2/index.html",

    driver: "sri-sadguru-driver-portal/index.html",

    customer: "sri-sadguru-parcel-service-customer%201.0%20-%20Copy/index.html"
};


/*
    Find all portal buttons
*/

const portalButtons = document.querySelectorAll("[data-portal]");


/*
    Add click navigation
*/

portalButtons.forEach((button) => {

    button.addEventListener("click", () => {

        const selectedPortal = button.dataset.portal;
        const destination = PORTAL_URLS[selectedPortal];

        if (!destination) {
            console.error("Portal URL is not configured:", selectedPortal);
            return;
        }

        window.location.href = destination;

    });
});
