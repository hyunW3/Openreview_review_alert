const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const tableBody = $("papers");

function showStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", error);
}

function cell(text) {
  const td = document.createElement("td");
  td.textContent = text || "—";
  return td;
}

function render(state = {}) {
  tableBody.replaceChildren();
  const papers = state.papers || [];
  $("venue").textContent = papers[0]?.venue || "ICLR.cc/2027/Conference";
  $("checked").textContent = state.lastChecked
    ? `마지막 확인: ${new Date(state.lastChecked).toLocaleString()}`
    : "";
  for (const paper of papers) {
    const row = document.createElement("tr");
    row.append(cell(paper.venue), cell(paper.title), cell(paper.scores), cell(paper.confidences));
    tableBody.append(row);
  }
  if (state.error) showStatus(state.error, true);
  else if (papers.length) showStatus(`감시 중 · ${papers.length}편 · 15분마다 자동 확인`);
  else showStatus("Authors 페이지에서 한 번 감시를 시작하세요.");
}

async function getState() {
  const result = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  $("ai-prompt").value = result?.aiPrompt || "";
  $("ai-consent").checked = Boolean(result?.aiConsent);
  render(result || {});
}

async function saveAiSettings() {
  const result = await chrome.runtime.sendMessage({
    type: "SAVE_AI_SETTINGS",
    aiPrompt: $("ai-prompt").value,
    aiConsent: $("ai-consent").checked
  });
  render(result || {});
  showStatus("분석 지침과 자동 전송 설정을 저장했습니다.");
}

async function startMonitoring() {
  try {
    showStatus("현재 Authors 페이지의 논문을 등록하는 중…");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.startsWith("https://openreview.net/")) {
      throw new Error("OpenReview Authors 페이지를 먼저 여세요.");
    }
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const params = new URLSearchParams(location.search);
        const groupId = params.get("id") || "";
        if (!groupId.endsWith("/Authors")) return { error: "Authors 페이지에서 실행해 주세요." };
        const venue = groupId.replace(/\/Authors\/?$/, "");
        const papers = [];
        for (const row of document.querySelectorAll("table tbody tr")) {
          const link = row.querySelector('a[href*="/forum?id="]');
          if (!link) continue;
          const forum = new URL(link.href, location.href).searchParams.get("id");
          const title = link.textContent.trim();
          if (forum && title) papers.push({ forum, title, venue });
        }
        return { venue, papers };
      }
    });
    const page = injected?.result;
    if (page?.error) throw new Error(page.error);
    if (!page?.papers?.length) throw new Error("논문 목록을 찾지 못했습니다. Authors 페이지의 표를 확인하세요.");
    const result = await chrome.runtime.sendMessage({ type: "SET_PAPERS", papers: page.papers });
    if (!result?.ok) throw new Error(result?.error || "감시를 시작하지 못했습니다.");
    render(result.state);
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function checkNow() {
  showStatus("OpenReview API를 확인하는 중…");
  const result = await chrome.runtime.sendMessage({ type: "POLL_NOW" });
  if (result?.state) render(result.state);
  else showStatus(result?.error || "확인에 실패했습니다.", true);
}

async function analyzeNow() {
  showStatus("저장된 리뷰를 ChatGPT에 보내는 중…");
  const result = await chrome.runtime.sendMessage({ type: "SEND_TO_CHATGPT_NOW" });
  if (result?.state) render(result.state);
  if (!result?.ok) showStatus(result?.error || "전송하지 못했습니다.", true);
  else showStatus(result.message || "ChatGPT 탭에 리뷰를 전송했습니다.");
}

$("connect").addEventListener("click", startMonitoring);
$("refresh").addEventListener("click", checkNow);
$("save-prompt").addEventListener("click", saveAiSettings);
$("analyze-now").addEventListener("click", analyzeNow);
getState();
