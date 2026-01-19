from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
from datetime import datetime

def scrape_youtube_comments(video_url, max_comments=10):
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

    while len(comments) < max_comments and scrolls < 30:
        comment_blocks = driver.find_elements(By.XPATH, '//*[@id="comment"]')

        for block in comment_blocks:
            try:
                text_el = block.find_element(By.ID, "content-text")
                time_el = block.find_element(By.XPATH, './/a[contains(@href,"lc=")]')
                likes_el = block.find_element(By.ID, "vote-count-middle")

                text = text_el.text.strip()
                time_text = time_el.text.strip()
                likes = likes_el.text.strip() or "0"

                if text and text not in seen:
                    comments.append({
                        "text": text,
                        "relative_time": time_text,
                        "like_count": likes,
                        "source": "youtube",
                        "video_url": video_url,
                        "scraped_at": datetime.utcnow().isoformat()
                    })
                    seen.add(text)

                if len(comments) >= max_comments:
                    break

            except:
                continue

        body.send_keys(Keys.END)
        time.sleep(2)
        scrolls += 1

    driver.quit()
    return comments



if __name__ == "__main__":
    url = "https://www.youtube.com/watch?v=DDryy8xMuac"
    comments = scrape_youtube_comments(url)

    for i, c in enumerate(comments[:10], 1):
        print(i, c)
