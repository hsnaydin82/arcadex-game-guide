# Arcadex Game Guide

**English** · [Türkçe](README.tr.md)

A single reference file for building HTML5 games for the **Arcadex** game platform, by hand or with an AI assistant
(Claude, ChatGPT, Gemini, Grok…). Give the guide to your assistant and it knows how to:

- package the game so it passes the platform scan (one zip, `index.html` at the root, no outside connections),
- **submit scores to leaderboards** and show the top players,
- let the player **resume where they left off** (cloud save, with a local fallback for guests),
- **save the player's choices and settings** (sound, difficulty, character, story choices),
- use achievements, in-game currency and data collections,
- keep cheat-sensitive rules in a **server script** that runs on Arcadex,
- build **online rooms** and let players **invite friends** to play together,
- request **ad breaks** at natural pauses (never shown to Premium players).

## Files

| File | What it is |
|---|---|
| [`ARCADEX_GUIDE.md`](ARCADEX_GUIDE.md) | The guide in English |
| [`ARCADEX_REHBER.md`](ARCADEX_REHBER.md) | The guide in Turkish |
| [`examples/star-collector/`](examples/star-collector/) | A small playable game that uses every recipe in the guide |

## How to use it with an AI assistant

1. Open a new chat and attach (or paste) `ARCADEX_GUIDE.md`.
2. Copy the prompt from section **1. Prompt for your assistant** and describe your game.
3. Ask for the full file list, then save the files into one folder.
4. Test locally (section 6), zip the **contents** of the folder and upload it from the Arcadex developer dashboard.
5. In the dashboard, define the services your game uses (leaderboard, achievement and collection code names) and press **Test**.

The guide is also available on the platform itself: **Developer guide → Build with AI** (`/gelistirici/arcadex-guide.md`).

## Try the example

```bash
cd examples/star-collector
npx serve .            # or: python -m http.server
```

Open the address it prints. Outside Arcadex the SDK runs in **local mode** (saves and scores are kept in the browser).
`sdk/arcadex.js` is included only for local testing; on the platform the official SDK is served automatically.

To upload it: in the dashboard create a game, add a leaderboard `skor` (higher is better) and an achievement `ilk-bolum`,
zip the contents of `examples/star-collector` and upload it.

## License

[MIT](LICENSE) · hsnaydin82, Mesay Dijital
