from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.goto("http://localhost:3000")

        # Wait for sidebar content
        page.wait_for_selector("text=INÍCIO")

        # Take screenshot
        page.screenshot(path="verification/sidebar_verification.png")
        print("Screenshot saved to verification/sidebar_verification.png")
        browser.close()

if __name__ == "__main__":
    run()
