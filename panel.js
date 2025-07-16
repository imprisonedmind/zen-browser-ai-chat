// ─── markdown + storage ─────────────────────────────────────────────────────────
const md    = window.markdownit({ linkify: true, breaks: true });
const store = browser.storage.local;   // or .sync if you have a fixed add-on ID

// ─── settings UI ───────────────────────────────────────────────────────────────
async function loadSettings() {
  const s = await store.get(["endpoint","model","apiKey"]);
  if (s.endpoint) document.getElementById("endpoint").value = s.endpoint;
  if (s.model)    document.getElementById("model").value    = s.model;
  if (s.apiKey)   document.getElementById("apiKey").value   = s.apiKey;
}

async function saveSettings() {
  const endpoint = document.getElementById("endpoint").value.trim();
  const model    = document.getElementById("model").value.trim();
  const apiKey   = document.getElementById("apiKey").value.trim();
  await store.set({ endpoint, model, apiKey });
}

document.getElementById("settings").addEventListener("click", () => {
  document.getElementById("settings-modal").classList.remove("hidden");
  loadSettings();
});
document.getElementById("closeSettings").addEventListener("click", () => {
  document.getElementById("settings-modal").classList.add("hidden");
});
document.getElementById("saveSettings").addEventListener("click", async () => {
  await saveSettings();
  document.getElementById("settings-modal").classList.add("hidden");
});

// ─── context grabber ───────────────────────────────────────────────────────────
async function getPageContext() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  try {
    return await browser.tabs.sendMessage(tab.id, { type: "GET_CONTEXT" });
  } catch {
    await browser.tabs.executeScript(tab.id, { file: "content.js" });
    await new Promise(r => setTimeout(r, 50));
    return browser.tabs.sendMessage(tab.id, { type: "GET_CONTEXT" });
  }
}

// ─── send routine ───────────────────────────────────────────────────────────────
async function sendPrompt() {
  const promptInput = document.getElementById("prompt");
  const prompt = promptInput.value.trim();
  if (!prompt) return;
  promptInput.value = "";

  appendMessage("user", prompt);

  const ctx = await getPageContext();
  const { endpoint, model, apiKey } = await store.get(["endpoint","model","apiKey"]);
  if (!endpoint || !model || !apiKey) {
    appendMessage("bot", "⚠️ Configure endpoint, model, and API key.");
    return;
  }

  // build headers
  const headers = { "Content-Type": "application/json" };
  if (endpoint.includes("openai.com")) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (endpoint.includes("googleapis.com")) {
    headers["X-Goog-Api-Key"] = apiKey;
  } else {
    headers.Authorization = apiKey;
  }

  const payload = buildPayload(endpoint, model, prompt, ctx);

  try {
    const resp  = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(payload) });
    const data  = await resp.json();
    const reply = parseAssistant(data);
    appendMessage("bot", reply);
  } catch (e) {
    appendMessage("bot", "Error: " + e.message);
  }
}

// ─── payload / parsing ─────────────────────────────────────────────────────────
function buildPayload(endpoint, model, prompt, ctx) {
  const prettyCtx = JSON.stringify(ctx, null, 2);
  const body = `${prompt}\n\n---- PAGE CONTEXT ----\n${prettyCtx}\n---- END ----`;

  if (endpoint.includes("openai.com")) {
    return { model, messages: [{ role: "user", content: body }] };
  } else if (endpoint.includes("googleapis.com")) {
    return { contents: [{ parts:[{ text: body }] }] };
  } else {
    return { model, prompt: body };
  }
}

function parseAssistant(d) {
  if (d.choices && d.choices[0]?.message?.content)
    return d.choices[0].message.content;
  if (d.candidates && d.candidates[0]?.content?.parts)
    return d.candidates[0].content.parts.map(p=>p.text).join("");
  return JSON.stringify(d).slice(0,1000);
}

// ─── render & copy button ─────────────────────────────────────────────────────
function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;

  // avatar + Markdown → safe HTML
  const avatar = role === "user" ? "🧑‍💻" : "🤖";
  const html   = DOMPurify.sanitize(md.render(text));
  div.innerHTML = `${avatar} ${html}`;

  // add copy button for bot only
  if (role === "bot") {
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.title = "Copy response";
    btn.innerText = "📋";
    btn.onclick = () => navigator.clipboard.writeText(text);
    div.appendChild(btn);
  }

  document.getElementById("messages").appendChild(div);
  div.scrollIntoView();
}

// ─── wire up Enter & click ────────────────────────────────────────────────────
document.getElementById("send").addEventListener("click", sendPrompt);
document.getElementById("prompt").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendPrompt();
  }
});