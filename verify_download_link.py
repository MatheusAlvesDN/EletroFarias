from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to home
        page.goto("http://localhost:3000")

        # Check if "BAIXAR APK" link exists and is visible
        link = page.get_by_role("link", name="BAIXAR APK")
        expect(link).to_be_visible()

        # Verify classes to check if Tailwind was applied (rough check via class attribute)
        # We can't easily check computed styles in this simple script without evaluating JS,
        # but checking the class attribute works.
        class_attr = link.get_attribute("class")
        print(f"Class attribute: {class_attr}")

        if "bg-cyan-700" not in class_attr:
             print("ERROR: bg-cyan-700 not found in classes")

        # Take screenshot
        page.screenshot(path="verification.png")

        browser.close()

if __name__ == "__main__":
    run()
