from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
from datetime import datetime
from typing import List, Dict


def scrape_youtube_comments(video_url: str, max_comments: int = 50) -> List[Dict]:
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )

    driver.get(video_url)
    time.sleep(5)

    body = driver.find_element(By.TAG_NAME, "body")
    body.send_keys(Keys.END)
    time.sleep(3)

    comments = []
    seen = set()
    scrolls = 0

    while len(comments) < max_comments and scrolls < 25:
        comment_blocks = driver.find_elements(By.XPATH, '//*[@id="comment"]')

        for block in comment_blocks:
            try:
                text = block.find_element(By.ID, "content-text").text.strip()
                time_text = block.find_element(
                    By.XPATH, './/a[contains(@href,"lc=")]'
                ).text.strip()

                likes_el = block.find_elements(By.ID, "vote-count-middle")
                likes = likes_el[0].text.strip() if likes_el else "0"

                if text and text not in seen:
                    comments.append({
                        "original_text": text,
                        "timestamp": time_text,
                        "raw_metadata": likes,
                        "scraped_at": datetime.utcnow().isoformat()
                    })
                    seen.add(text)

                if len(comments) >= max_comments:
                    break

            except Exception:
                continue

        body.send_keys(Keys.END)
        time.sleep(2)
        scrolls += 1

    driver.quit()
    return comments
