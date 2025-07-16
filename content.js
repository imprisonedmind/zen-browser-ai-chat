/* content.js */

function grabBitbucketPR() {
  const title = document.querySelector('[data-qa="pr-title"]')?.innerText || "";
  const desc = document.querySelector('[data-qa="pr-description"]')?.innerText || "";
  const diff = [...document.querySelectorAll(".diff-content")]
    .map(el => el.innerText).join("\n");
  return {title, desc, diff};
}

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "GET_CONTEXT") return;

  const ctx = {
    url: location.href,
    title: document.title,
    selection: window.getSelection()?.toString() || "",
    text: document.body.innerText.slice(0, 32_000),          // 32 kB safeguard
    html: document.documentElement.outerHTML.slice(0, 40_000)
  };

  if (location.hostname.includes("bitbucket.org")) {
    ctx.bitbucket = grabBitbucketPR();
  }

  return Promise.resolve(ctx);  // sent back to panel.js
});