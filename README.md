<img width="4608" height="2592" alt="image" src="https://github.com/user-attachments/assets/07bf1c03-990c-44da-8655-ecd81cad9a05" />




# Zen LLM Chat Sidebar

This is a browser extension that provides a convenient chat sidebar, allowing you to interact with various Large Language Models (LLMs) directly within your browser. It's designed for quick queries, page summarization, and general AI assistance, all while keeping your chat history persistent.

## Features

* **Integrated AI Chat:** Access powerful LLMs directly from a sidebar in your browser.

* **Context Awareness:** The AI can understand and respond based on the content of your current web page.

* **Multiple LLM Support:** Easily switch between different AI models from OpenAI (GPT-4o, GPT-3.5), Anthropic (Claude), and Google AI (Gemini).

* ~~**Persistent Chat History:** Your conversations are saved locally, so your chat history remains even if you close and reopen the sidebar or your browser.~~

* **API Key Management:** Securely store your API keys for different LLM providers within the extension's settings.

* **Markdown Rendering:** AI responses are beautifully formatted using Markdown, including syntax-highlighted code blocks, lists, and other text formatting, making them easy to read.

* **Responsive and Readable Design:** The chat interface is designed to be clean, intuitive, and easy to read, adapting to different content types.

## Installation

This project is a browser extension. To install it in your browser (e.g., Chrome or Firefox):

1.  **Download the Project:** Get the entire project folder (e.g., clone the repository or download the ZIP).

2.  **Unpack the Extension:**

    * **Firefox:**

        1.  Open Firefox.

        2.  Go to `about:debugging#/runtime/this-firefox`.

        3.  Click "Load Temporary Add-on..." and select any file inside your project folder (e.g., `manifest.json`).

The extension should now appear in your browser's extensions list.

## Usage

1.  **Open the Sidebar:** Use the keyboard shortcut `Ctrl+E` (or `Command+Shift+E` on Mac) to toggle the chat sidebar open or closed.

2.  **Configure API Keys:**

    * Click the `⚙️` (Settings) icon at the bottom left of the sidebar.

    * Enter your API keys for OpenAI, Anthropic, and Google AI in the respective fields.

    * Click "Save Keys".

3.  **Select an AI Model:**

    * Click the model name button (e.g., "GPT-4o") next to the settings icon.

    * Choose your preferred LLM from the dropdown list.

4.  **Start Chatting:**

    * Type your question or prompt in the input field at the bottom.

    * Press `Enter` or click the `➤` (Send) button.

    * You can ask questions about the current web page, or any general topic.

5.  ~~**Persistent History:** Your chat history will automatically be saved and loaded when you reopen the sidebar.~~

## Technical Details

The extension is built using:

* **Vanilla JavaScript:** For core logic and browser API interactions.

* **HTML & CSS:** For the user interface and styling.

* **`markdown-it`:** A Markdown parser for rendering AI responses.

* **`highlight.js`:** For syntax highlighting of code blocks within Markdown.

* **`DOMPurify`:** To sanitize HTML output from Markdown rendering, preventing XSS vulnerabilities.

* **Browser Storage API (`browser.storage.local`):** For persisting settings and chat history.

## License
Apache 2.0
