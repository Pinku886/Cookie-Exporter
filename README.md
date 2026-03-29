# Cookie Exporter

Cookie Exporter is a simple, secure, and professional-grade Chrome Extension that allows users to extract cookies from open browser tabs and export them into widely used formats like Netscape or JSON. With a user-friendly and resizable side panel interface, extracting cookies is now seamless and deeply integrated with your browser.

## Features & Functionality

* **Domain & Scope Filtering:** Precisely target which cookies to extract. Filter by Open Tabs, Closed Tabs (All Cookies for the session), or restrict to a Specific Domain.
* **Multiple Export Formats:** Export structured cookie data in Netscape (perfect for `curl`, `wget`, or `yt-dlp`) or JSON formats.
* **Side Panel Integration:** Accessible directly from the Chrome Side Panel, allowing you to export cookies smoothly alongside your active browsing session.
* **Robust Security:** Built with a strictly offline CSP (Content Security Policy). `script-src 'self'; object-src 'self'; connect-src 'none';` ensures absolutely no external scripts or trackers can execute. Safely renders cookies using XSS-proof DOM construction methods.
* **Custom User Interface:** Clean interface with copy-to-clipboard functionality and direct file download saving.

## How it's Different from Other Extensions

* **Privacy First (No Internet Connectivity Needed):** Most cookie exporters connect to third parties or include telemetry. Cookie Exporter strictly enforces a `connect-src 'none'` CSP, meaning it is **functionally impossible** for this extension to phone home or leak your session cookies over the internet.
* **Side Panel Centric:** Instead of using disappearing popups that close when you click away, Cookie Exporter lives persistently in the side panel. It stays active while you switch tabs and securely inspect different pages.
* **Secure DOM Rendering:** Instead of using vulnerable `innerHTML` rendering, all UI updates and dynamic data populations rely strictly on secure, direct native DOM manipulation techniques.

## Use Cases

* **Web Scraping & API Automation:** Export session cookies in Netscape format to seamlessly pass into terminal utilities like `curl` or language-level tools for automated testing.
* **Session Migration:** Export your current login state in JSON or text formats and securely import it into another browser profile or automation environment.
* **Developer Diagnostics:** Developer-friendly extraction flow to easily inspect the exact cookies set across various web properties and debugging SSO logins.

## Installation

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the cloned `. /Cookie Exporter` directory.
5. Click on the extension icon or open your Chrome Side Panel and choose "Cookie Exporter" from the dropdown.

## License

This project is licensed under the MIT License.
