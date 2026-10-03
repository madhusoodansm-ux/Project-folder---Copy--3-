"use strict";

/*
========================================================
Sri Sadguru Siddarooda Parcel Service
Customer Portal - Payment

COMPLETE REPLACEMENT JAVASCRIPT

Current phase:
- Real Supabase booking data
- No Razorpay yet
- No real payment processing
- No fake/demo payment records

Payment gateway will be integrated later.
========================================================
*/

document.addEventListener(
  "DOMContentLoaded",
  () => {
    /* ===================================================
       DOM
    =================================================== */

    const paymentDueList =
      document.getElementById(
        "paymentDueList"
      );

    const paymentDueLoading =
      document.getElementById(
        "paymentDueLoading"
      );

    const paymentDueEmpty =
      document.getElementById(
        "paymentDueEmpty"
      );

    const paymentHistoryList =
      document.getElementById(
        "paymentHistoryList"
      );

    const paymentHistoryLoading =
      document.getElementById(
        "paymentHistoryLoading"
      );

    const paymentHistoryEmpty =
      document.getElementById(
        "paymentHistoryEmpty"
      );

    /* ===================================================
       STATUS TEXT
    =================================================== */

    function getPaymentStatusText(
      status
    ) {
      const statusMap = {
        pending:
          "Payment Pending",

        paid:
          "Paid",

        failed:
          "Payment Failed",

        cancelled:
          "Cancelled",

        refunded:
          "Refunded",
      };

      const normalizedStatus =
        String(
          status || "pending"
        )
          .trim()
          .toLowerCase();

      return (
        statusMap[
          normalizedStatus
        ] ||
        "Payment Pending"
      );
    }

    /* ===================================================
       STATUS CLASS
    =================================================== */

    function getPaymentStatusClass(
      status
    ) {
      const normalizedStatus =
        String(
          status || "pending"
        )
          .trim()
          .toLowerCase();

      const statusClassMap = {
        pending:
          "status-pending",

        paid:
          "status-paid",

        failed:
          "status-failed",

        cancelled:
          "status-cancelled",

        refunded:
          "status-refunded",
      };

      return (
        statusClassMap[
          normalizedStatus
        ] ||
        "status-pending"
      );
    }

    /* ===================================================
       DATE
    =================================================== */

    function formatDate(
      value
    ) {
      if (!value) {
        return "-";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "-";
      }

      return date.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    }

    /* ===================================================
       AMOUNT
    =================================================== */

    function formatAmount(
      amount
    ) {
      if (
        amount === null ||
        amount === undefined ||
        amount === ""
      ) {
        return null;
      }

      const number =
        Number(amount);

      if (
        Number.isNaN(number)
      ) {
        return null;
      }

      return number.toLocaleString(
        "en-IN",
        {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 2,
        }
      );
    }

    /* ===================================================
       SAFE HTML
    =================================================== */

    function escapeHtml(
      value
    ) {
      return String(
        value ?? ""
      )
        .replaceAll(
          "&",
          "&amp;"
        )
        .replaceAll(
          "<",
          "&lt;"
        )
        .replaceAll(
          ">",
          "&gt;"
        )
        .replaceAll(
          '"',
          "&quot;"
        )
        .replaceAll(
          "'",
          "&#039;"
        );
    }

    /* ===================================================
       ERROR STATE
    =================================================== */

    function showPaymentError(
      container,
      message
    ) {
      if (!container) {
        return;
      }

      container
        .querySelectorAll(
          ".payment-card"
        )
        .forEach(
          (card) =>
            card.remove()
        );

      const errorCard =
        document.createElement(
          "div"
        );

      errorCard.className =
        "payment-card payment-error-card";

      errorCard.innerHTML = `
        <div class="payment-error-message">
          ${escapeHtml(message)}
        </div>
      `;

      container.appendChild(
        errorCard
      );
    }

    /* ===================================================
       PAYMENT CARD
    =================================================== */

    function createPaymentCard(
      booking,
      isPendingSection
    ) {
      const card =
        document.createElement(
          "article"
        );

      card.className =
        "payment-card";

      const bookingId =
        booking.booking_id ||
        "-";

      const parcelName =
        booking.parcel_name ||
        booking.parcel_type ||
        "Parcel";

      const pickupCity =
        booking.pickup_city ||
        "-";

      const deliveryCity =
        booking.delivery_city ||
        "-";

      const status =
        String(
          booking.payment_status ||
            "pending"
        )
          .trim()
          .toLowerCase();

      const statusText =
        getPaymentStatusText(
          status
        );

      const statusClass =
        getPaymentStatusClass(
          status
        );

      const formattedAmount =
        formatAmount(
          booking.service_charge
        );

      const amountText =
        formattedAmount ||
        "Payment amount not available yet";

      const paymentMethod =
        booking.payment_method
          ? String(
              booking.payment_method
            )
          : "Not available";

      card.innerHTML = `
        <div class="payment-card-header">
          <div>
            <div class="payment-booking-label">
              Booking ID
            </div>

            <div class="payment-booking-id">
              ${escapeHtml(
                bookingId
              )}
            </div>
          </div>

          <span class="payment-status ${statusClass}">
            ${escapeHtml(
              statusText
            )}
          </span>
        </div>

        <div class="payment-card-body">

          <div class="payment-detail-row">
            <span class="payment-detail-label">
              Parcel
            </span>

            <span class="payment-detail-value">
              ${escapeHtml(
                parcelName
              )}
            </span>
          </div>

          <div class="payment-detail-row">
            <span class="payment-detail-label">
              Route
            </span>

            <span class="payment-detail-value">
              ${escapeHtml(
                pickupCity
              )}
              →
              ${escapeHtml(
                deliveryCity
              )}
            </span>
          </div>

          <div class="payment-detail-row">
            <span class="payment-detail-label">
              Service Charge
            </span>

            <span class="payment-detail-value payment-amount">
              ${escapeHtml(
                amountText
              )}
            </span>
          </div>

          <div class="payment-detail-row">
            <span class="payment-detail-label">
              Payment Method
            </span>

            <span class="payment-detail-value">
              ${escapeHtml(
                paymentMethod
              )}
            </span>
          </div>

          <div class="payment-detail-row">
            <span class="payment-detail-label">
              Booking Date
            </span>

            <span class="payment-detail-value">
              ${escapeHtml(
                formatDate(
                  booking.created_at
                )
              )}
            </span>
          </div>

        </div>
      `;

      /*
       * Current project phase:
       *
       * Razorpay is NOT connected yet.
       *
       * Therefore we do not process any payment here.
       *
       * If the admin has assigned a service charge,
       * show an inactive message instead of pretending
       * that a real payment button exists.
       */

      if (
        isPendingSection &&
        formattedAmount &&
        status === "pending"
      ) {
        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "payment-action";

        button.disabled =
          true;

        button.textContent =
          "Payment Integration Coming Later";

        card.appendChild(
          button
        );
      }

      return card;
    }

    /* ===================================================
       PAYMENT DUE
    =================================================== */

    function renderPaymentDue(
      bookings
    ) {
      if (
        paymentDueLoading
      ) {
        paymentDueLoading.hidden =
          true;
      }

      if (
        !paymentDueList
      ) {
        return;
      }

      paymentDueList
        .querySelectorAll(
          ".payment-card"
        )
        .forEach(
          (card) =>
            card.remove()
        );

      const pendingPayments =
        bookings.filter(
          (booking) => {
            const status =
              String(
                booking.payment_status ||
                  "pending"
              )
                .trim()
                .toLowerCase();

            return (
              status ===
              "pending"
            );
          }
        );

      if (
        pendingPayments.length ===
        0
      ) {
        if (
          paymentDueEmpty
        ) {
          paymentDueEmpty.hidden =
            false;
        }

        return;
      }

      if (
        paymentDueEmpty
      ) {
        paymentDueEmpty.hidden =
          true;
      }

      pendingPayments.forEach(
        (booking) => {
          const card =
            createPaymentCard(
              booking,
              true
            );

          paymentDueList.appendChild(
            card
          );
        }
      );
    }

    /* ===================================================
       PAYMENT HISTORY
    =================================================== */

    function renderPaymentHistory(
      bookings
    ) {
      if (
        paymentHistoryLoading
      ) {
        paymentHistoryLoading.hidden =
          true;
      }

      if (
        !paymentHistoryList
      ) {
        return;
      }

      paymentHistoryList
        .querySelectorAll(
          ".payment-card"
        )
        .forEach(
          (card) =>
            card.remove()
        );

      /*
       * Payment history contains
       * non-pending payment states.
       *
       * We do not create fake history.
       */

      const history =
        bookings.filter(
          (booking) => {
            const status =
              String(
                booking.payment_status ||
                  "pending"
              )
                .trim()
                .toLowerCase();

            return (
              status !==
              "pending"
            );
          }
        );

      if (
        history.length ===
        0
      ) {
        if (
          paymentHistoryEmpty
        ) {
          paymentHistoryEmpty.hidden =
            false;
        }

        return;
      }

      if (
        paymentHistoryEmpty
      ) {
        paymentHistoryEmpty.hidden =
          true;
      }

      history.forEach(
        (booking) => {
          const card =
            createPaymentCard(
              booking,
              false
            );

          paymentHistoryList.appendChild(
            card
          );
        }
      );
    }

    /* ===================================================
       LOAD CUSTOMER BOOKINGS
    =================================================== */

    async function loadPayments() {
      try {
        /* -----------------------------------------------
           Check authentication
        ----------------------------------------------- */

        if (
          !window.SSPAuth ||
          typeof SSPAuth.requireCustomer !==
            "function"
        ) {
          throw new Error(
            "Customer authentication is unavailable."
          );
        }

        const customer =
          await SSPAuth.requireCustomer();

        if (!customer) {
          return;
        }

        /*
         * IMPORTANT:
         * SSPAuth returns the customer object.
         * The actual Supabase Auth user is customer.user.
         */

        const user =
          customer.user;

        if (
          !user ||
          !user.id
        ) {
          throw new Error(
            "Logged-in customer was not found."
          );
        }

        /* -----------------------------------------------
           Supabase client
        ----------------------------------------------- */

        const supabase =
          window.supabaseClient;

        if (!supabase) {
          throw new Error(
            "Supabase client is unavailable."
          );
        }

        console.log(
          "SSP Payment - customer ID:",
          user.id
        );

        /* -----------------------------------------------
           Load REAL customer bookings
        ----------------------------------------------- */

        const {
          data,
          error,
        } = await supabase
          .from("bookings")
          .select(
            `
              booking_id,
              parcel_name,
              parcel_type,
              pickup_city,
              delivery_city,
              service_charge,
              payment_status,
              payment_method,
              created_at
            `
          )
          .eq(
            "customer_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

        if (error) {
          console.error(
            "SSP Payment - Supabase error:",
            error
          );

          throw new Error(
            error.message ||
              "Unable to load payment information from Supabase."
          );
        }

        const bookings =
          Array.isArray(data)
            ? data
            : [];

        console.log(
          "SSP Payment - customer bookings:",
          bookings
        );

        renderPaymentDue(
          bookings
        );

        renderPaymentHistory(
          bookings
        );
      } catch (error) {
        console.error(
          "SSP Payment page error:",
          error
        );

        if (
          paymentDueLoading
        ) {
          paymentDueLoading.hidden =
            true;
        }

        if (
          paymentHistoryLoading
        ) {
          paymentHistoryLoading.hidden =
            true;
        }

        showPaymentError(
          paymentDueList,
          error.message ||
            "Unable to load payment information."
        );

        showPaymentError(
          paymentHistoryList,
          error.message ||
            "Unable to load payment history."
        );
      }
    }

    /* ===================================================
       INITIAL LOAD
    =================================================== */

    loadPayments();
  }
);