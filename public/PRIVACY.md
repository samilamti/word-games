# Privacy Policy — Lexica Knights

**Effective date:** 2026-05-19

Lexica Knights ("the app") is a single-player word combat game that runs entirely on your device. This document describes what data the app handles, what it does not, and how the in-app feedback feature works.

## What the app stores on your device

The app uses your device's local storage to remember:

- **Game progress** — your current rack, board state, score, and turn.
- **Run history** (leaderboard) — total damage, turns, longest word, and biggest single hit per completed battle, saved locally so you can see your best runs over time. Storage key: `lexica_knights_runs`.
- **Word disputes** — when you dispute a rejected word, the word and any optional definition you provide are saved locally so you can review your own dispute history. Storage key: `lexica_knights_disputes`.
- **Beta feedback** — text you enter through the in-app "Beta Feedback" button is saved locally. Storage key: `lexica_knights_feedback`.

This information stays on your device. It is not synced or backed up to any server we control.

## In-app feedback — what we transmit, and when

The app includes two ways for you to send feedback to the developer:

1. The **Beta Feedback** button (bottom-right) opens a form where you choose a category (bug, suggestion, word issue, other) and type a message.
2. When a word is rejected by the in-app dictionary, a **Dispute!** button lets you explain why you believe the word should be valid.

When — and only when — you **press "Send Feedback" or "Submit Dispute"**, the app sends the text you typed (plus the category or word, the in-game turn number, and a timestamp) to the developer's email via the [Web3Forms](https://web3forms.com/) relay service. Nothing else is included in the transmission: no name, no email address, no device identifier, no account, no analytics. The text you type is the entire payload.

If you never tap either submit button, nothing leaves your device.

## What the app does not collect

- The app does **not** require an account, sign-in, or any personal information.
- The app does **not** include analytics, tracking pixels, advertising SDKs, or third-party trackers beyond the Web3Forms submission described above.
- The app does **not** collect your IDFA, advertising identifier, or any device identifier.
- The app does **not** access your contacts, photos, microphone, camera, location, or other sensitive system data.
- The app does **not** sell, share, or use your data for advertising or profiling.

## Third-party services

- **Web3Forms** (api.web3forms.com) is used exclusively as a transport for the feedback and dispute messages you explicitly submit. See the [Web3Forms privacy notice](https://web3forms.com/privacy) for how they process submissions in transit. They deliver each submission as an email to the developer and retain a temporary log per their policy.
- **GitHub Pages** (web build only) — the web version at `https://samilamti.github.io/word-games/` is served by GitHub, Inc., which may collect standard server logs (IP, user agent, request path). The native iOS App Store build serves the same web assets bundled inside the app and does not contact GitHub Pages at runtime. See [GitHub's Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## Children's privacy

The app does not knowingly collect personal data from children. The feedback feature transmits only the text a user actively types and chooses to send; no identifying information is attached. If you are a parent and believe your child has sent feedback containing personal information you'd like removed, contact the maintainer (below).

## Data retention and deletion

Local data: delete the app from your Home Screen (iOS) or clear site data (web) to remove all locally stored game data.

Feedback transmitted via Web3Forms: open a GitHub issue or contact the maintainer with the timestamp or text of the submission and we will remove it from the developer's mailbox.

## Changes to this policy

If this policy changes materially, the new version will be published at the same URL with an updated effective date.

## Contact

For privacy questions or removal requests, open a GitHub issue at:

https://github.com/samilamti/word-games/issues

Or contact the maintainer (Sami Xavier Lamti) via the same repository.
