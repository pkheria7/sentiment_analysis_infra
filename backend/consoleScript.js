(async () => {
  // URL regex
  const postUrlRegex = /^https:\/\/x\.com\/[^\/]+\/status\/\d+$/;

  if (!postUrlRegex.test(location.href)) {
    console.error("Not a valid X post page:", location.href);
    console.info("Expected format: https://x.com/{username}/status/{tweet_id}");
    return;
  }

  const MAX_REPLIES = 10;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Load replies
  window.scrollTo(0, document.body.scrollHeight);
  await sleep(1500);

  const buttons = [...document.querySelectorAll("span")]
    .filter(span => span.innerText && /show|more/i.test(span.innerText))
    .map(span => span.closest("div[role='button']"))
    .filter(Boolean)
    .slice(0, 3);

  for (const btn of buttons) {
    btn.click();
    await sleep(1200);
  }

  window.scrollTo(0, document.body.scrollHeight);
  await sleep(1500);

  // Extract replies
  const articles = [...document.querySelectorAll("article")];
  const replies = [];

  for (const article of articles) {
    if (replies.length >= MAX_REPLIES) break;

    const textEl = article.querySelector('[data-testid="tweetText"]');
    const timeEl = article.querySelector("time");
    const userEl = article.querySelector('a[href^="/"][role="link"]');

    if (!textEl || !timeEl || !userEl) continue;

    const href = userEl.getAttribute("href");
    if (!href || href.split("/").length < 2) continue;

    replies.push({
      username: "@" + href.split("/")[1],
      text: textEl.innerText.trim(),
      timestamp: timeEl.getAttribute("datetime"),
    });
  }

  const result = {
    tweet_url: location.href,
    tweet_id: location.href.split("/status/")[1],
    extracted_at: new Date().toISOString(),
    count: replies.length,
    replies
  };

  console.log("REPLIES JSON");
  console.log(JSON.stringify(result, null, 2));

})();
