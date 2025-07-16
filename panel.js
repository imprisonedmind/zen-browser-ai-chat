// Vanilla JavaScript - Zen Browser Style
var md = window.markdownit({
  html: true,
  linkify: true,
  breaks: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre><code class="hljs">' +
          hljs.highlight(str, {language: lang, ignoreIllegals: true}).value +
          '</code></pre>';
      } catch (__) {
      }
    }

    return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});
var DOMPurify = window.DOMPurify
var isLoading = false
var messageCount = 0
var currentModel = "openai:gpt-4o" // Declare browser variable
var browser = window.browser || window.chrome


// API Configuration for different companies
var API_CONFIGS = {
  openai: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    buildPayload: (model, prompt, ctx) => ({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond concisely and clearly. Format your responses using GitHub Flavored Markdown (GFM). Ensure: \n" +
            "- Code blocks use proper triple backticks (```) with language identifiers (e.g., ```javascript). \n" +
            "- Bullet lists use hyphens (-) and are properly indented for nesting (2 spaces per level). \n" +
            "- Numbered lists are ordered (1., 2., etc.). \n" +
            "- Use bold (**text**), italics (*text*), and headings (#, ##, ###) when appropriate. \n" +
            "- Always include a blank line before and after code blocks, and before and after lists, to ensure proper rendering."
        },
        {
          role: "user",
          content: prompt + "\n\n---- PAGE CONTEXT ----\n" + JSON.stringify(ctx, null, 2) + "\n---- END ----",
        },
      ],
    }),
    parseResponse: (data) =>
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "No response",
    getHeaders: (apiKey) => ({
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    }),
  },
  anthropic: {
    endpoint: "https://api.anthropic.com/v1/messages",
    buildPayload: (model, prompt, ctx) => ({
      model: model,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt + "\n\n---- PAGE CONTEXT ----\n" + JSON.stringify(ctx, null, 2) + "\n---- END ----",
        },
      ],
    }),
    parseResponse: (data) => (data.content && data.content[0] && data.content[0].text) || "No response",
    getHeaders: (apiKey) => ({
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }),
  },
  google: {
    buildPayload: (model, prompt, ctx) => ({
      contents: [
        {
          parts: [
            {
              text: prompt + "\n\n---- PAGE CONTEXT ----\n" + JSON.stringify(ctx, null, 2) + "\n---- END ----",
            },
          ],
        },
      ],
    }),
    parseResponse: (data) => {
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        var parts = data.candidates[0].content.parts
        var result = ""
        for (var i = 0; i < parts.length; i++) {
          result += parts[i].text || ""
        }
        return result || "No response"
      }
      return "No response"
    },
    getHeaders: (apiKey) => ({
      "Content-Type": "application/json",
    }),
    getEndpoint: (model, apiKey) =>
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey,
  },
}

var store = browser.storage.local

// ─── Settings Management ─────────────────────────────────────────────────────
function loadSettings() {
  store.get(["openaiKey", "anthropicKey", "googleKey", "selectedModel"]).then((settings) => {
    if (settings.openaiKey) document.getElementById("openai-key").value = settings.openaiKey
    if (settings.anthropicKey) document.getElementById("anthropic-key").value = settings.anthropicKey
    if (settings.googleKey) document.getElementById("google-key").value = settings.googleKey
    if (settings.selectedModel) {
      currentModel = settings.selectedModel
      updateCurrentModelDisplay()
    }
  })
}

function saveSettings() {
  var openaiKey = document.getElementById("openai-key").value.trim()
  var anthropicKey = document.getElementById("anthropic-key").value.trim()
  var googleKey = document.getElementById("google-key").value.trim()

  return store.set({
    openaiKey: openaiKey,
    anthropicKey: anthropicKey,
    googleKey: googleKey,
    selectedModel: currentModel,
  })
}

// ─── Model Selection ─────────────────────────────────────────────────────────
function updateCurrentModelDisplay() {
  var modelBtn = document.getElementById("current-model")
  var modelOptions = document.querySelectorAll(".model-option")

  // Remove previous selection
  for (var i = 0; i < modelOptions.length; i++) {
    modelOptions[i].classList.remove("selected")
  }

  // Find and select current model
  for (var i = 0; i < modelOptions.length; i++) {
    if (modelOptions[i].getAttribute("data-value") === currentModel) {
      modelOptions[i].classList.add("selected")
      modelBtn.textContent = modelOptions[i].getAttribute("data-name")
      break
    }
  }
}

function toggleModelDropdown() {
  var dropdown = document.getElementById("model-dropdown")
  dropdown.classList.toggle("hidden")
}

function selectModel(value, name) {
  currentModel = value
  updateCurrentModelDisplay()
  document.getElementById("model-dropdown").classList.add("hidden")
  store.set({selectedModel: currentModel})
}

// ─── Context Management ──────────────────────────────────────────────────────
function getPageContext() {
  return browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
    var tab = tabs[0]
    return browser.tabs.sendMessage(tab.id, {type: "GET_CONTEXT"}).catch(() =>
      browser.tabs.executeScript(tab.id, {file: "content.js"}).then(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(browser.tabs.sendMessage(tab.id, {type: "GET_CONTEXT"}))
            }, 50)
          }),
      ),
    )
  })
}

// ─── Message Management ──────────────────────────────────────────────────────
function hideWelcomeScreen() {
  var welcomeScreen = document.getElementById("welcome-screen")
  if (welcomeScreen) {
    welcomeScreen.classList.add("hidden")
  }
}

function appendMessage(role, text, isLoadingMsg) {
  hideWelcomeScreen()

  var messageId = "msg-" + Date.now() + "-" + messageCount++
  var time = new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})

  var messageDiv = document.createElement("div")
  messageDiv.className = "message " + role
  messageDiv.id = messageId

  var content = document.createElement("div")
  content.className = "message-content"

  var bubble = document.createElement("div")
  bubble.className = "message-bubble"

  if (isLoadingMsg) {
    bubble.innerHTML =
      '<div class="loading-message"><span>Thinking</span><div class="loading-dots"><span></span><span></span><span></span></div></div>'
  } else {
    var html = DOMPurify.sanitize(md.render(text))
    bubble.innerHTML = html

    if (role === "bot") {
      var copyBtn = document.createElement("button")
      copyBtn.className = "copy-btn"
      copyBtn.title = "Copy response"
      copyBtn.onclick = () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text)
        }
      }
      bubble.appendChild(copyBtn)
    }
  }

  var timeSpan = document.createElement("span")
  timeSpan.className = "message-time"
  timeSpan.textContent = time

  content.appendChild(bubble)
  content.appendChild(timeSpan)
  messageDiv.appendChild(content)

  document.getElementById("messages").appendChild(messageDiv)
  messageDiv.scrollIntoView({behavior: "smooth"})

  return messageId
}

function updateMessage(messageId, text) {
  var messageDiv = document.getElementById(messageId)
  if (messageDiv) {
    var bubble = messageDiv.querySelector(".message-bubble")
    if (bubble) {
      var html = DOMPurify.sanitize(md.render(text))
      bubble.innerHTML = html

      var copyBtn = document.createElement("button")
      copyBtn.className = "copy-btn"
      copyBtn.title = "Copy response"
      copyBtn.onclick = () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text)
        }
      }
      bubble.appendChild(copyBtn)
    }
  }
}

// ─── Send Logic ──────────────────────────────────────────────────────────────
function sendPrompt() {
  var promptInput = document.getElementById("prompt")
  var prompt = promptInput.value.trim()
  if (!prompt || isLoading) return

  var parts = currentModel.split(":")
  var company = parts[0]
  var model = parts[1]

  var keyName = company + "Key"

  store.get([keyName]).then((settings) => {
    var apiKey = settings[keyName]

    if (!apiKey) {
      appendMessage("bot", "⚠️ Configure " + company.toUpperCase() + " API key first.")
      return
    }

    promptInput.value = ""
    appendMessage("user", prompt)

    setLoading(true)

    var loadingMessageId = appendMessage("bot", "", true)

    getPageContext()
      .then((ctx) => {
        var config = API_CONFIGS[company]
        var endpoint = config.endpoint

        if (company === "google") {
          endpoint = config.getEndpoint(model, apiKey)
        }

        var payload = config.buildPayload(model, prompt, ctx)
        var headers = config.getHeaders(apiKey)

        fetch(endpoint, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload),
        })
          .then((resp) => {
            if (!resp.ok) {
              throw new Error("API Error: " + resp.status + " " + resp.statusText)
            }
            return resp.json()
          })
          .then((data) => {
            var reply = config.parseResponse(data)
            updateMessage(loadingMessageId, reply)
          })
          .catch((e) => {
            updateMessage(loadingMessageId, "Error: " + e.message)
          })
          .finally(() => {
            setLoading(false)
          })
      })
      .catch((e) => {
        updateMessage(loadingMessageId, "Error getting page context: " + e.message)
        setLoading(false)
      })
  })
}

function setLoading(loading) {
  isLoading = loading
  var sendBtn = document.getElementById("send")
  var sendIcon = document.getElementById("send-icon")
  var loadingIcon = document.getElementById("loading-icon")

  sendBtn.disabled = loading

  if (loading) {
    sendIcon.classList.add("hidden")
    loadingIcon.classList.remove("hidden")
  } else {
    sendIcon.classList.remove("hidden")
    loadingIcon.classList.add("hidden")
  }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Send button
  document.getElementById("send").addEventListener("click", sendPrompt)

  // Enter key in prompt
  document.getElementById("prompt").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendPrompt()
    }
  })

  // Model selection
  document.getElementById("model-btn").addEventListener("click", toggleModelDropdown)

  // Model options
  var modelOptions = document.querySelectorAll(".model-option")
  for (var i = 0; i < modelOptions.length; i++) {
    modelOptions[i].addEventListener("click", (e) => {
      var option = e.currentTarget
      var value = option.getAttribute("data-value")
      var name = option.getAttribute("data-name")
      selectModel(value, name)
    })
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    var dropdown = document.getElementById("model-dropdown")
    var modelBtn = document.getElementById("model-btn")

    if (!dropdown.contains(e.target) && !modelBtn.contains(e.target)) {
      dropdown.classList.add("hidden")
    }
  })

  // Settings modal
  document.getElementById("settings").addEventListener("click", () => {
    document.getElementById("settings-modal").classList.remove("hidden")
    loadSettings()
  })

  document.getElementById("closeSettings").addEventListener("click", () => {
    document.getElementById("settings-modal").classList.add("hidden")
  })

  document.getElementById("cancelSettings").addEventListener("click", () => {
    document.getElementById("settings-modal").classList.add("hidden")
  })

  document.getElementById("saveSettings").addEventListener("click", () => {
    saveSettings().then(() => {
      document.getElementById("settings-modal").classList.add("hidden")
    })
  })

  // Quick actions
  var quickActions = document.querySelectorAll(".quick-action")
  for (var i = 0; i < quickActions.length; i++) {
    quickActions[i].addEventListener("click", (e) => {
      var prompt = e.target.getAttribute("data-prompt")
      if (prompt) {
        document.getElementById("prompt").value = prompt
        sendPrompt()
      }
    })
  }

  // Modal backdrop click
  document.getElementById("settings-modal").addEventListener("click", (e) => {
    if (e.target.id === "settings-modal" || e.target.classList.contains("modal-backdrop")) {
      document.getElementById("settings-modal").classList.add("hidden")
    }
  })

  // Initialize
  loadSettings()
})
