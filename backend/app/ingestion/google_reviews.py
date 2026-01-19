from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
from datetime import datetime

# ---------------- CONFIG ---------------- #

INFRA_KEYWORDS = [
    "road",
    "junction",
    "flyover",
    "metro station",
    "bus stand",
    "railway station",
    "government office"
]

MAX_PLACES_PER_KEYWORD = 3
MAX_REVIEWS_PER_PLACE = 30
SCROLL_PAUSE = 2

# ---------------------------------------- #

def get_driver():
    options = webdriver.ChromeOptions()
    # options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    return driver


# ---------- STEP 1: FIND PLACES ---------- #

def find_places_near_coordinate(driver, lat, lon, keyword):
    search_url = f"https://www.google.com/maps/search/{keyword}/@{lat},{lon},15z"
    driver.get(search_url)
    time.sleep(6)

    places = []
    seen = set()

    for _ in range(3):
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.END)
        time.sleep(SCROLL_PAUSE)

        links = driver.find_elements(By.XPATH, '//a[contains(@href,"/maps/place")]')

        for link in links:
            href = link.get_attribute("href")
            if href and href not in seen:
                places.append(href)
                seen.add(href)

            if len(places) >= MAX_PLACES_PER_KEYWORD:
                return places

    return places


# ---------- STEP 2: SCRAPE REVIEWS ---------- #

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def scrape_reviews_from_place(driver, place_url):
    reviews = []
    seen = set()

    driver.get(place_url)

    wait = WebDriverWait(driver, 20)

    # Wait for place page to load
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    time.sleep(3)

    # Try multiple ways to open reviews
    try:
        review_buttons = driver.find_elements(
            By.XPATH,
            '//button[contains(@aria-label,"review") or contains(@jsaction,"pane.review")]'
        )
        if review_buttons:
            review_buttons[0].click()
            time.sleep(4)
    except:
        pass  # Reviews may already be open

    # Scroll reviews panel
    scrollable_div = None
    try:
        scrollable_div = driver.find_element(
            By.XPATH,
            '//div[@role="region"]'
        )
    except:
        scrollable_div = driver.find_element(By.TAG_NAME, "body")

    scrolls = 0
    while len(reviews) < MAX_REVIEWS_PER_PLACE and scrolls < 25:
        review_blocks = driver.find_elements(
            By.XPATH,
            '//div[@data-review-id]'
        )

        print(f"      Found {len(review_blocks)} review blocks")

        for block in review_blocks:
            try:
                text_el = block.find_element(
                    By.XPATH,
                    './/span[contains(@class,"wiI7pd")]'
                )
                time_el = block.find_element(
                    By.XPATH,
                    './/span[contains(text(),"ago")]'
                )
            except:
                continue

            text = text_el.text.strip()
            time_text = time_el.text.strip()

            if text and text not in seen:
                reviews.append({
                    "text": text,
                    "relative_time": time_text,
                    "place_url": place_url,
                    "source": "google_maps",
                    "scraped_at": datetime.utcnow().isoformat()
                })
                seen.add(text)

            if len(reviews) >= MAX_REVIEWS_PER_PLACE:
                break

        # Scroll
        driver.execute_script(
            "arguments[0].scrollTop = arguments[0].scrollHeight",
            scrollable_div
        )
        time.sleep(2)
        scrolls += 1

    print(f"      Extracted {len(reviews)} reviews")
    return reviews



# ---------- STEP 3: FULL PIPELINE ---------- #

def get_google_reviews_by_coordinates(lat, lon):
    driver = get_driver()
    all_reviews = []

    try:
        for keyword in INFRA_KEYWORDS:
            print(f"[+] Searching for {keyword} near ({lat},{lon})")
            places = find_places_near_coordinate(driver, lat, lon, keyword)

            for place in places:
                print(f"    → Scraping reviews from place")
                place_reviews = scrape_reviews_from_place(driver, place)
                all_reviews.extend(place_reviews)

    finally:
        driver.quit()

    return all_reviews


# ---------- RUN ---------- #

if __name__ == "__main__":
    LAT = 12.9177   # Silk Board
    LON = 77.6233

    reviews = get_google_reviews_by_coordinates(LAT, LON)

    print(f"\nCollected {len(reviews)} reviews\n")

    for r in reviews[:5]:
        print(r)
