from google.adk.agents import Agent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from playwright.async_api import async_playwright, Page, expect
import asyncio

# Global variables for Playwright
playwright = None
browser = None
page = None


async def initialize_playwright():
    global playwright, browser, page
    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(headless=False)
    page = await browser.new_page()


async def go_to_url(url: str) -> dict:
    """
    Navigate to a URL in the browser.
    
    Args:
        url: The URL to navigate to
        
    Returns:
        A dictionary with status and message
    """
    global page
    try:
        # Initialize Playwright if not already done
        if page is None:
            await initialize_playwright()
        
        # Ensure URL has proper format
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
            
        await page.goto(url)
        return {"status": "success", "message": f"Successfully navigated to {url}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
async def parse_dom() -> dict:
    """
    Retrieves the entire DOM content.
    """
    global page
    try:
        # Ensure page is initialized
        if page is None:
            await initialize_playwright()
        
        # Get the HTML content of the page
        dom_content = await page.html()
        return {"status": "success", "dom_content": dom_content}
    except Exception as e:
        return {"status": "error", "message": str(e)}

async def type_into_selector(selector: str, text: str) -> dict:
    """
    Types text into an element identified by a CSS selector.
    
    Args:
        selector: The CSS selector to find the element
        text: The text to type into the element
        
    Returns:
        A dictionary with status and message
    """
    global page
    try: 
        # Wait for the element to be visible and type into it
        await page.wait_for_selector(selector)
        await page.fill(selector, text)
        return {"status": "success", "message": f"Successfully typed '{text}' into element with selector '{selector}'"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

async def click(selector: str) -> dict:
    """
    Clicks an element identified by a CSS selector.
    Args:
        selector: The CSS selector to find the element
        
    Returns:
        A dictionary with status
    """
    global page
    try: 
        # Wait for the element to be visible and type into it
        await page.wait_for_selector(selector)
        await page.click()
        return {"status": "success", "message": f"Sucessfully clicked selector"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    

async def press_enter() -> dict:
    """
    Presses enter
    Args:
        None
    Returns:
        A dictionary with status
    """
    global page
    await page.keyboard.press('Enter');
    try:
        return {"status" :"success"}
    except Exception as e:
        return {"status": "err", "message": str(e)}


# Create the agent with the tool
root_agent = Agent(
    name="browser_automation_agent",
    model="gemini-2.0-flash",
    description=(
        "An Agent to perform browser automation"
    ),
    instruction=(
        "You are a helpful agent who can perform tasks on the browser. "
        "You can navigate to URLs and perform actions on web pages. "
        "You are using playwright to interact with the browser so use selctors that work well with playwright"
        "Always ensure URLs start with http:// or https://"
    ),
    tools=[go_to_url, type_into_selector, click, press_enter],
)

# Create session service
session_service = InMemorySessionService()

# Create a runner with the agent
runner = Runner(
    agent=root_agent,
    app_name="browser_automation",
    session_service=session_service
)

# Cleanup function to be called when done
async def cleanup():
    global browser, playwright
    if browser:
        await browser.close()
    if playwright:
        await playwright.stop()