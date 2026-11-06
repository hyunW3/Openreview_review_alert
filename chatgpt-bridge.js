let alreadySending = false;
chrome.runtime.sendMessage({ type: "CHATGPT_READY" });

function findComposer() {
  return document.querySelector("#prompt-textarea") ||
    document.querySelector('[contenteditable="true"][role="textbox"]') ||
    document.querySelector('textarea[placeholder]');
}

function setText(editor, text) {
  editor.focus();
  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(editor), "value")?.set;
    if (setter) setter.call(editor, text);
    else editor.value = text;
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  } else {
    editor.textContent = "";
    document.execCommand("insertText", false, text);
    if (!editor.innerText.trim()) editor.textContent = text;
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }
}

function findSendButton() {
  return document.querySelector('button[data-testid="send-button"]') ||
    [...document.querySelectorAll("button")].find((button) => /send|전송/i.test(
      `${button.getAttribute("aria-label") || ""} ${button.getAttribute("data-testid") || ""}`
    ));
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "FILL_AND_SEND" || alreadySending) return;
  alreadySending = true;
  (async () => {
    const deadline = Date.now() + 25000;
    let editor = null;
    while (Date.now() < deadline) {
      editor = findComposer();
      if (editor) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!editor) throw new Error("ChatGPT에 로그인했는지, 새 채팅 입력창이 열렸는지 확인하세요.");

    setText(editor, message.prompt);
    const sendDeadline = Date.now() + 10000;
    let button = null;
    while (Date.now() < sendDeadline) {
      button = findSendButton();
      if (button && !button.disabled) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!button || button.disabled) throw new Error("ChatGPT 전송 버튼을 찾지 못했습니다.");
    button.click();
    chrome.runtime.sendMessage({ type: "CHATGPT_SENT", title: message.title });
  })().catch((error) => {
    chrome.runtime.sendMessage({ type: "CHATGPT_FAILED", title: error.message });
  });
});
