from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    # Mock authentication
    # JWT format: header.payload.signature
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiQURNSU4ifQ.signature"

    # Go to root first to set local storage
    page.goto("http://localhost:3000/")

    page.evaluate(f"localStorage.setItem('authToken', '{token}')")

    # Navigate to protected page
    page.goto("http://localhost:3000/inicio")

    # Wait for page to load
    try:
        page.wait_for_selector('button[aria-label="menu"]', timeout=10000)
    except:
        print("Menu button not found, dumping page content")
        print(page.content())
        page.screenshot(path="verification_error.png")
        browser.close()
        return

    # Click menu button to open sidebar
    page.get_by_label("menu", exact=True).click()

    # Wait for sidebar animation
    page.wait_for_timeout(1000)

    # Take screenshot of the sidebar
    # We look for the image we added
    # It has src="/logo.png" (Next.js might modify the src if optimized, but unoptimized: true is set now? No, I set it in next.config.ts)
    # If unoptimized is true, src will be "/logo.png" (or close to it).
    # If not, it will be "/_next/image?url=%2Flogo.png&w=..."

    # Let's take a screenshot of the whole page with sidebar open
    page.screenshot(path="verification_sidebar.png")
    print("Screenshot taken: verification_sidebar.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
