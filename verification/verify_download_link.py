from playwright.sync_api import sync_playwright

def verify_download_link():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Navigate to the login page
        print("Navigating to login page...")
        page.goto("http://localhost:3000")

        # Wait for the download link to be visible
        print("Waiting for 'BAIXAR APK' link...")
        # Use a more specific selector if needed, or get_by_role
        download_link = page.get_by_role("link", name="BAIXAR APK")
        download_link.wait_for(state="visible")

        # Verify the href attribute
        # Due to `trailingSlash: true` in next.config.ts, Next.js might be rewriting this or the browser normalizing it.
        # Let's check if it *starts with* /download or is exactly /download/
        href = download_link.get_attribute("href")
        print(f"Found link with href: {href}")

        if href != "/download" and href != "/download/":
            print(f"ERROR: Link href is incorrect! Expected '/download' or '/download/', got '{href}'")
            exit(1)

        # Take a screenshot of the login page showing the link
        print("Taking screenshot of login page...")
        page.screenshot(path="verification/login_page.png")

        # Click the link to verify navigation
        print("Clicking 'BAIXAR APK' link...")
        download_link.click()

        # Wait for navigation to /download
        # Next.js client-side navigation should work
        page.wait_for_url("**/download/")
        print("Navigated to download page.")

        # Take a screenshot of the download page
        print("Taking screenshot of download page...")
        page.screenshot(path="verification/download_page.png")

        # Verify the 'BAIXAR APK' button on the download page also exists and has the correct href
        # This one is a direct file link, so it shouldn't have a trailing slash appended by Next.js navigation logic for pages
        download_button_apk = page.get_by_role("link", name="BAIXAR APK")
        apk_href = download_button_apk.get_attribute("href")
        print(f"Found APK download button with href: {apk_href}")

        if apk_href != "/downloads/EletroFariasLog.apk":
             print("ERROR: APK download link href is incorrect!")
             exit(1)

        browser.close()
        print("Verification successful!")

if __name__ == "__main__":
    verify_download_link()
