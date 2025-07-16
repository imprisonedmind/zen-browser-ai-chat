let sidebarOpen = false;

browser.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "toggle-chat") return;
  sidebarOpen = !sidebarOpen;
  try {
    if (sidebarOpen) {
      await browser.sidebarAction.open();
    } else {
      await browser.sidebarAction.close();
    }
  } catch (e) {
    console.error(e);
  }
});