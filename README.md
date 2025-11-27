
# CERBERUS UNIT: Secure Serial Communication Simulator

**Version:** 3.1  
**Developer:** Sagar  
**Stack:** React.js, Web Serial API, Tailwind CSS, Node.js

---

## 🍎 MACOS USERS IMPORTANT INFO
If you are running this on a Mac (MacBook/iMac):
1.  **DO NOT USE SAFARI.** Safari blocks the USB connection required for this tool.
2.  **USE GOOGLE CHROME OR MICROSOFT EDGE.**
3.  The application will automatically detect your OS and warn you if you use an unsupported browser.

---

## 1. ABSTRACT
The **Cerberus Unit** is a web-based security interface designed to simulate high-level military communication protocols. It bridges the gap between software simulation and physical hardware control. Built using **React.js** and the **Web Serial API**, the system functions as a dual-purpose console: it acts as a standalone simulator for LCD/OLED displays and acts as a controller for physical Arduino hardware via USB. The system features custom encryption algorithms, role-based authentication, and real-time system logging.

---

## 2. SYSTEM COMPONENTS

The project is divided into Software Architecture and Simulated/Physical Hardware components.

### A. Software Stack
*   **React.js (v18):** The core framework managing the application state, component rendering, and logic loops.
*   **Web Serial API:** An advanced browser API that allows the website to communicate directly with USB devices (Arduino/Microcontrollers) without installing external drivers.
*   **Tailwind CSS:** Used to create the "Cyberpunk/Sci-Fi" aesthetic, implementing glass-morphism, neon glows, and responsive layouts.
*   **Lucide React:** A library for vector icons used to represent hardware status (Locks, WiFi, CPU, Battery).

### B. Simulated Hardware Modules
The web interface digitally replicates the behavior of the following physical components:
*   **LCD_1602 (Liquid Crystal Display):** A 16x2 character display used for system prompts and encrypted cipher output.
*   **SSD1306 OLED:** A graphic display used for high-priority alerts, visual icons (Locks, Envelopes), and status text.
*   **Status LEDs:** Red and Yellow indicators simulating GPIO logic for power and data transmission.
*   **Watchdog Timer:** A software logic that detects inactivity and forces the system into a "Sleep/Entropy" mode to save resources.

---

## 3. THE "BACKSLASH" CIPHER ALGORITHM

To ensure secure transmission, the system utilizes a custom substitution cipher known as the "Backslash Code." When a message is sent, it is intercepted, encrypted according to the map below, and displayed on the LCD.

### Encryption Key Map

| Letter | Encrypted Code | Letter | Encrypted Code |
| :--- | :--- | :--- | :--- |
| **A** | `@1*` | **N** | `#1` |
| **B** | `#21` | **O** | `3@` |
| **C** | `*31` | **P** | `@*1` |
| **D** | `#11` | **Q** | `*##` |
| **E** | `107` | **R** | `@11` |
| **F** | `*121` | **S** | `111` |
| **G** | `##3` | **T** | `3` |
| **H** | `11&` | **U** | `113` |
| **I** | `11` | **V** | `1@%` |
| **J** | `@33` | **W** | `@13` |
| **K** | `@#3` | **X** | `#113` |
| **L** | `1#11` | **Y** | `#33` |
| **M** | `##` | **Z** | `#11` |

### Numeric Encryption

| Digit | Code | Digit | Code |
| :--- | :--- | :--- | :--- |
| **0** | `@1` | **5** | `*121` |
| **1** | `#21@` | **6** | `##3` |
| **2** | `*31%` | **7** | `11*%` |
| **3** | `#11$` | **8** | `11#%` |
| **4** | `1` | **9** | `@333` |

---

## 4. WORKING PRINCIPLE (WORKFLOW)

The system operates based on a specific Finite State Machine (FSM).

1.  **Boot Sequence:** Upon loading, the system runs a simulated kernel initialization and enters a **LOCKED** state.
2.  **Authentication:**
    *   Input `SAGAR` -> Grants Admin Access.
    *   Input `SAGAR*` -> Grants Guest Access.
3.  **Transmission & Encryption:**
    *   User types a message.
    *   System animates "ENCRYPTING..." on the LCD.
    *   System displays the **Backslash Cipher Code** on the LCD and the Plaintext on the OLED.
4.  **Hardware Interaction:**
    *   Clicking "INITIALIZE LINK" opens the Web Serial port to connect with physical Arduino hardware.
5.  **Emergency Protocols:**
    *   Typing "SOS" triggers a visual panic mode.

---

## 5. INSTALLATION & USAGE

### Online Demo
This project is deployed and compatible with Google Chrome and Microsoft Edge (Windows/Mac/Linux).

### Local Installation
1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Run the terminal report: `node report.js`
4.  Start the web app: `npx serve .`
