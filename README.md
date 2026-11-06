# OpenReview Score Check

A small Chrome Manifest V3 extension that monitors review scores and confidence for papers listed on an OpenReview Authors page.

## Quick start

1. Sign in to OpenReview in Chrome.
2. Open your venue's Authors page (for example, `ICLR.cc/2027/Conference/Authors`).
3. Open `chrome://extensions` and enable **Developer mode**.
4. Select **Load unpacked** and choose this repository folder.
5. Open the extension on the Authors page and select **Start monitoring papers on this Authors page**.
6. The Authors page can be closed after setup. The extension checks every 15 minutes and sends a Chrome notification when a score or confidence changes.

Chrome must remain running for scheduled checks. If your OpenReview session expires, sign in again and start monitoring from the Authors page.

## What it reads

- Paper title and forum ID from the currently open Authors page during setup.
- Review notes and their score and confidence fields through the OpenReview API.
- The extension only receives information that the signed-in OpenReview account is allowed to access.

The extension does not ask for or store your OpenReview password or API token. It stores the configured paper list and last-seen review values in Chrome local extension storage. It contacts `api2.openreview.net` to check the reviews.

## Permissions

- `activeTab` and `scripting`: read paper links from the Authors page when you start monitoring.
- `storage`: keep the monitored paper list and last-seen values between browser sessions.
- `alarms`: schedule the 15-minute check.
- `notifications`: alert when review values change.
- Host access to `openreview.net` and `api2.openreview.net`: read the Authors page and query the OpenReview API.

## Notes

Review form field names vary by venue. The extension recognizes common score fields such as `rating`, `score`, and `overall assessment`, plus `confidence`. If your venue uses other field names, update the matchers in `service-worker.js`.

This project is not affiliated with OpenReview.

## 한국어 안내

Authors 페이지를 연 상태에서 확장 프로그램을 한 번 설정하면, 이후 페이지를 닫아도 Chrome이 실행 중인 동안 15분마다 리뷰 점수와 confidence를 확인합니다. 새 값이 생기거나 바뀌면 Chrome 알림을 보냅니다. 로그인 세션이 만료되면 OpenReview에 다시 로그인하고 Authors 페이지에서 감시를 다시 시작하세요.

## Automated email and AI summary pipeline

The repository also includes a scheduled GitHub Actions job. It checks the configured official reviews every 15 minutes (GitHub may start scheduled jobs later than the requested time), sends an email when scores or review contents change, and summarizes the reviews with either the OpenAI API or Anthropic API. The action stores only a SHA-256 fingerprint per forum in its cache; it does not save review text in the repository or workflow logs.

### Setup

Use a **private GitHub repository** for this workflow. Add the following under **Settings → Secrets and variables → Actions**.

**Repository secrets**

- `OPENREVIEW_USERNAME`
- `OPENREVIEW_PASSWORD`
- `OPENREVIEW_PAPERS_JSON` — JSON array with `venue`, `title`, and `forum`; start from `papers.example.json`.
- `OPENAI_API_KEY` if `AI_PROVIDER` is `openai`, or `ANTHROPIC_API_KEY` if it is `anthropic`.
- `SMTP_USERNAME` and `SMTP_PASSWORD` — use an app password or mail-provider credential, not your normal email password.
- `OPENREVIEW_TOTP_SECRET` only if unattended login requires OpenReview authenticator-app MFA.

**Repository variables**

- `AI_PROVIDER`: `openai` or `anthropic`.
- `OPENAI_MODEL` or `ANTHROPIC_MODEL`: a model available to your API account.
- `SMTP_HOST`: for Gmail, `smtp.gmail.com`.
- `SMTP_PORT`: optional; defaults to `587`.
- `EMAIL_FROM` and `EMAIL_TO`.

OpenReview's unattended MFA flow supports authenticator-app codes; email codes and passkeys require a person to complete login. The TOTP secret grants login capability and must be protected like the account password. See [OpenReview's MFA guide](https://docs.openreview.net/getting-started/using-the-api/using-multi-factor-authentication-in-unattended-scripts) before configuring it.

Enable the workflow on the default branch. Use **Actions → OpenReview review monitor → Run workflow** for an initial run. If a score is already visible, that run sends the first email; later runs send only when monitored review fields change.

### Data and policy

Only official review notes visible to the configured OpenReview account are retrieved; reviewer identities and non-review discussion notes are not included in the AI prompt. When analysis runs, the official review text is sent to the selected provider's API, and the resulting summary and scores are sent to `EMAIL_TO`. This is an external transfer of review text; configure the provider only if you accept that data flow. API usage may be billed separately from a ChatGPT or Claude app subscription.

ICLR 2027's author AI policy lists qualitative and thematic data analysis among tasks that require disclosure. If you use these summaries to analyze feedback for research or the paper, check the current policy and disclose AI use as required. Reviews were scheduled for release to authors on November 5, 2026; do not add private AC/reviewer discussion or other notes to the workflow.

## Local extension and ChatGPT web handoff

The extension can send a changed official review to a new ChatGPT web chat without an OpenAI API key:

1. Sign in to ChatGPT in Chrome.
2. In the extension popup, enter your analysis instructions and save them.
3. Check the box that allows automatic review transfer and save it.
4. When a score or review changes, the extension opens a background ChatGPT tab, inserts the instructions and review in one user message, and submits it.

The instructions are prepended to the user message; the regular ChatGPT website does not let this extension set a true system-role message. The extension does not read ChatGPT's response back. Therefore, the web handoff can create the analysis in ChatGPT, but cannot automatically email that generated answer. The separate GitHub Actions workflow can email summaries when configured to use an OpenAI or Anthropic API.

The extension stores the prompt, consent toggle, paper list, and last-seen score/confidence locally in Chrome. It does not persist review text after sending. Review text is sent to OpenAI when the automatic-transfer box is enabled. Uncheck it to stop automatic transfer. The “send now” button also requires the box to be checked.

Load this directory as an unpacked extension from `chrome://extensions`; scheduled checks run while Chrome is running. ChatGPT must be signed in. If the ChatGPT page changes its composer UI, automatic insertion may stop working and require an extension update.
