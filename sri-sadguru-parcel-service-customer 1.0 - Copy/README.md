Sri Sadguru Parcel Service – Customer Portal
A modern, responsive customer portal for Sri Sadguru Parcel Service.

Project Status: Frontend development / prototype

📌 Project Overview
Sri Sadguru Parcel Service Customer Portal is a web-based customer interface designed to provide customers with an easy and convenient way to access parcel-service features.
The portal currently includes customer login, registration, dashboard, parcel tracking, parcel booking, notifications, payment, profile management, saved addresses, password management, and logout functionality.
✨ Features
🔐 Customer Login

Phone number login
Gmail login
Phone number validation
Gmail validation
Password validation
Show / hide password
Forgot password navigation
Customer registration navigation
Login loading state
Form validation messages

🏠 Customer Dashboard

Customer greeting
Parcel tracking
Active deliveries
Total orders
Payment due
Delivered orders
Notification count
Profile navigation
Booking details
Bottom navigation

📦 Parcel Booking

Parcel booking interface
Sender information
Receiver information
Pickup address
Delivery address
Parcel details
Parcel type
Weight and delivery information

🚚 Parcel Tracking

Tracking ID input
Tracking ID validation
Tracking request interface
Tracking status display

👤 Customer Profile

Customer information
Profile photo
Edit profile
Mobile number
Gmail address
District
State
Address
Customer ID
Saved addresses
Change password
Customer support
About Us
Logout

📍 Saved Addresses

Add address
Edit address
Delete address
Set default address
Contact name
Mobile number
PIN code
District
State
Complete address

🔑 Change Password
Password validation includes:

Minimum 12 characters
At least one uppercase letter
At least one number
At least one special character

🔔 Notifications
The notification section is designed for:

Parcel booking notifications
Pickup notifications
Transit notifications
Out-for-delivery notifications
Delivery notifications
Payment reminders
Service announcements

💳 Payment
The payment section is designed for future integration of:

Online payment
Payment status
Transaction ID
Payment confirmation
Payment history
Invoice generation

🔓 Logout
The logout system includes:

Logout confirmation popup
Cancel logout
Confirm logout
Clearing frontend login state
Returning to the main login page

📁 Project Structure
sri-sadguru-parcel-service-customer/
│
├── README.md
├── index.html
├── pdf.pdf
│
├── css/
│   ├── book-parcel.css
│   ├── dashboard.css
│   ├── forgot-password.css
│   ├── notifications.css
│   ├── payment.css
│   ├── profile.css
│   ├── register.css
│   ├── style.css
│   └── track-parcel.css
│
├── customer/
│   ├── book-parcel.html
│   ├── dashboard.html
│   ├── forgot-password.html
│   ├── notifications.html
│   ├── payment.html
│   ├── profile.html
│   ├── register.html
│   └── track-parcel.html
│
├── images/
│   └── logo.png
│
└── js/
    ├── book-parcel.js
    ├── dashboard.js
    ├── forgot-password.js
    ├── notifications.js
    ├── payment.js
    ├── profile.js
    ├── register.js
    ├── script.js
    └── track-parcel.js

🛠️ Technologies Used

HTML5
CSS3
JavaScript
Browser Local Storage
Responsive Web Design

💾 Current Data Storage
The current frontend prototype uses browser localStorage for development and testing.
Data currently used includes:
customerLoggedIn
customerData
customerProfilePhoto
savedAddresses
customerPassword

🔒 Security
The current project is a frontend prototype.
Future security implementation will include:

Secure authentication
Password hashing
Session/JWT authentication
Server-side validation
Secure API endpoints
Database security
Role-based access control
Rate limiting
Secure password reset
Payment security
Customer data protection

🚀 How to Run

Download or clone the project.
Open the project folder in Visual Studio Code.
Open index.html.
Run the project using a local development server such as Live Server.
Start from the login page.

🔗 Customer Portal Flow
index.html
    │
    ↓
Customer Login
    │
    ↓
customer/dashboard.html
    │
    ├── Book Parcel
    ├── Track Parcel
    ├── Notifications
    ├── Payment
    └── Profile
             │
             ├── Edit Profile
             ├── Saved Addresses
             ├── Change Password
             ├── Customer Support
             ├── About Us
             └── Logout
                    │
                    ↓
              index.html

📱 Responsive Design
The customer portal is designed to work across:

Mobile phones
Tablets
Laptops
Desktop computers

🧪 Development Status



Feature
Status




Customer Login
✅ Completed


Phone Login Validation
✅ Completed


Gmail Login Validation
✅ Completed


Password Validation
✅ Completed


Customer Registration
✅ Completed


Customer Dashboard
✅ Completed


Login → Dashboard
✅ Completed


Profile Page
✅ Completed


Profile Photo
✅ Completed


Edit Profile
✅ Completed


Saved Addresses
✅ Completed


Change Password
✅ Completed


Logout Confirmation
✅ Completed


Logout → Login
✅ Completed


Parcel Booking
🚧 Frontend


Parcel Tracking
🚧 Frontend


Notifications
🚧 Frontend


Payment
🚧 Frontend


Backend Authentication
⏳ Planned


Database
⏳ Planned


Real-time Tracking
⏳ Planned


Payment Gateway
⏳ Planned


PDF Invoice
⏳ Planned


Admin Portal
⏳ Planned


Driver Portal
⏳ Planned



🗺️ Future Development
The complete system is planned to include:
Customer

Registration
Login
Authentication
Profile management
Password reset
Address management
Parcel booking
Parcel tracking
Payment
Notifications

Driver

Driver login
Assigned parcels
Pickup confirmation
Delivery confirmation
Location updates
Delivery status management

Admin

Customer management
Driver management
Vehicle management
Parcel management
Payment management
Notifications
Reports
System management

🗄️ Planned Database
Future database collections/tables may include:
users
customers
drivers
vehicles
parcels
bookings
addresses
payments
notifications
tracking
invoices

📊 Planned Parcel Status
BOOKED
   ↓
PICKED_UP
   ↓
IN_TRANSIT
   ↓
ARRIVED_AT_HUB
   ↓
OUT_FOR_DELIVERY
   ↓
DELIVERED

Additional statuses:
CANCELLED
RETURNED
DELIVERY_FAILED

📍 Planned GPS Tracking
Driver
  ↓
GPS Location
  ↓
Backend
  ↓
Database
  ↓
Customer Dashboard
  ↓
Live Parcel Location

🧾 Planned Invoice System
Future invoices may contain:

Company information
Customer information
Parcel information
Tracking ID
Pickup address
Delivery address
Parcel weight
Service charges
GST
Total amount
Payment status

🤝 Contribution
This project is currently under active development.
Suggestions, improvements, and contributions are welcome.
📜 License
This project is currently a private/development project for Sri Sadguru Parcel Service.
👨‍💻 Developer
Sri Sadguru Parcel Service – Customer Portal
⭐ Project Goal
The long-term goal is to develop a complete digital parcel-management platform connecting:
Customers
    ↕
Parcel Service
    ↕
Drivers
    ↕
Vehicles
    ↕
Admin

The final system will provide:

Easy parcel booking
Parcel tracking
Online payments
Digital invoices
Driver management
Vehicle tracking
Customer notifications
Admin management
Secure authentication
Real-time delivery updates

📌 Project Status
Current Phase: Customer Portal Frontend
Next Phase: Backend + Database + Authentication
Long-Term Goal: Complete Parcel Service Management System
