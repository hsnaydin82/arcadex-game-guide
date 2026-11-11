# Arcadex Game Guide (SDK v1.1)

This file explains everything you need to build an HTML5 game for the **Arcadex** platform.
If you write the game yourself, use it as a reference. If you build it with an AI assistant such as Claude, ChatGPT,
Gemini or Grok, **give the whole file to the assistant** and start with the prompt in "Prompt for your assistant" below.

> Platform page: `/gelistirici/rehber` · Latest version of this file: `/gelistirici/arcadex-guide.md`

---

## 1. Prompt for your assistant (copy and paste)

```text
I'm giving you the "Arcadex Game Guide". Write an HTML5 game that follows every rule in it.
Game: <describe your game: genre, goal, controls, levels, difficulty, rewards>
Arcadex services to use: <e.g. leaderboard "score", resume where the player left off, saved settings, achievements, 2-player online room>
Rules:
- One folder: index.html at the root, other files via relative paths. Never connect to outside servers, CDNs or font services.
- Add the SDK with <script src="/sdk/arcadex.js"></script> and call Arcadex.init() once at startup.
- Use only the SDK for saves, scores, achievements and currency; fall back to localStorage for guests.
- Listen to the "pause" and "resume" events; call Arcadex.ads.break() at natural breaks for ad breaks.
- Make it playable with touch and keyboard/mouse; the canvas must scale correctly in portrait and landscape.
- Finish with the file list, the services I must define in the dashboard (board/achievement code names) and the upload steps.
```

---

## 2. Rules that never change

| Rule | Details |
|---|---|
| Package | A single `.zip`, up to **150 MB**. `index.html` at the zip root (or inside the zip's only folder). |
| Paths | Relative: `assets/hero.png`, `js/game.js`. **Don't** use root paths (`/assets/...`). Only exception: `/sdk/arcadex.js`. |
| Internet | The game **cannot connect to any outside address** (analytics, ad networks, CDNs, Google Fonts...). The platform blocks it. Bundle libraries and fonts. |
| Forbidden files | `.exe .dll .apk .ipa .so .jar .php` and similar executables are rejected automatically. |
| Avoid | `eval`, `new Function`, `document.cookie`, `window.top`/`window.parent`, obfuscated code. Questioned in review. |
| Data | Saves, scores, achievements, currency and shared data **only through the SDK**. Don't send them to your own server. |
| Personal data | You never get the player's email or real name; `player.id` is a game-specific pseudonym. |
| Ads | Don't put ads in your game. The platform shows them (`Arcadex.ads.break()`). |
| Review | Every version is scanned automatically, then its code is read and it is played by a person. The approved version is sealed. |

---

## 3. The smallest working game

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>My game</title>
  <style>
    html, body { margin: 0; height: 100%; background: #0b0c0f; overflow: hidden; touch-action: none; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <script src="/sdk/arcadex.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

```js
// game.js
(async () => {
  const info = await Arcadex.init();     // first thing, once
  // info.player  -> { id, name, premium } or null if not signed in
  // info.mode    -> "live" (players) | "test" (developer test) | "local" (outside the platform)
  // info.invite  -> { room: "K7QM2X" } if opened from an invite link, otherwise null
  // info.ads     -> { enabled } whether ads can be shown to this player
  // info.leaderboards / info.achievements / info.currency -> what you defined in the dashboard

  Arcadex.on("pause", () => game.pause());    // tab hidden, ad break, invite window
  Arcadex.on("resume", () => game.resume());
  game.start();
})();
```

Every SDK call returns a **Promise**. On failure you get `error.code` (for code, stable) and `error.message`
(for players, localized). **Always branch on `error.code`.**

---

## 4. Recipes

### 4.1 Submitting to a leaderboard

1. In the dashboard, **Game services → Leaderboards**, add a board: code name (e.g. `score`), order (higher / lower is better),
   highest accepted score.
2. Submit the score when the game ends. The platform keeps each player's **best** score (all time and this week).

```js
async function gameOver(score) {
  if (!Arcadex.player) {                       // guest: suggest signing in to save the score
    ui.show("Sign in to put your score on the board");
    return;
  }
  try {
    const r = await Arcadex.leaderboard.submit("score", score);   // { best, rank, improved }
    ui.show(r.improved ? `New record! You're #${r.rank}` : `Your best: ${r.best}`);
  } catch (e) {
    if (e.code === "score_out_of_range") ui.show("This score wasn't accepted.");
    else ui.show("Couldn't submit the score right now.");
  }
}

async function showBoard() {
  const t = await Arcadex.leaderboard.top("score", { limit: 10, period: "week" });  // "all" | "week"
  // t.entries: [{ rank, name, playerId, score, isMe }], t.me: { score, rank } or null
  ui.renderBoard(t.entries, t.me);
}
```

**Against cheating:** a score computed in the game can be tampered with. For important boards enable
**"Server-only submissions"** in the dashboard and submit from a server script (see 4.7).

### 4.2 Let the player resume where they left off (progress save)

Cloud saves are for signed-in players and follow them across devices. For guests fall back to the browser (`localStorage`)
and move the progress to the cloud once they sign in.

```js
const SAVE_KEY = "progress";
const LOCAL = "mygame:progress";
const DEFAULT = { v: 1, level: 1, stars: {}, last: null };

async function loadProgress() {
  let data = null;
  if (Arcadex.player) {
    try { data = await Arcadex.save.get(SAVE_KEY); } catch (e) { /* offline etc. */ }
    // Progress played as a guest and nothing in the cloud yet: move it to the cloud
    const local = readLocal();
    if (!data && local) { data = local; await Arcadex.save.set(SAVE_KEY, data).catch(() => {}); }
  } else {
    data = readLocal();
  }
  return migrate(data ?? structuredClone(DEFAULT));
}

async function saveProgress(p) {
  p.last = Date.now();
  if (Arcadex.player) {
    try { await Arcadex.save.set(SAVE_KEY, p); return; }
    catch (e) { if (e.code === "too_large") console.warn("Save too large"); }
  }
  try { localStorage.setItem(LOCAL, JSON.stringify(p)); } catch { /* private tab */ }
}

function readLocal() { try { return JSON.parse(localStorage.getItem(LOCAL)); } catch { return null; } }

// If you change the save format later, upgrade old saves
function migrate(p) {
  if (!p.v) p.v = 1;
  // if (p.v === 1) { p.newField = ...; p.v = 2; }
  return p;
}
```

Tips:
- **When to save:** at the end of a level, after an important choice and on the `pause` event. Not every frame.
- **Size:** up to **64 KB** per key, **50 keys** per player (256 KB / 200 for Premium players).
  Summarize large states (e.g. a move list instead of the whole board).
- **Key names:** letters, digits, `_ . -`, up to 64 characters.
- Saves are stored encrypted; use `Arcadex.save.remove(key)` if the player wants to delete one.

### 4.3 Saving the player's choices and settings

Keep choices like sound, difficulty, selected character or control scheme **separate from progress**:
settings stay small and survive a progress reset.

```js
const SETTINGS_KEY = "settings";
let settings = { volume: 0.8, music: true, difficulty: "normal", character: "cat", lang: null };

async function loadSettings() {
  const saved = Arcadex.player
    ? await Arcadex.save.get(SETTINGS_KEY).catch(() => null)
    : JSON.parse(localStorage.getItem("mygame:settings") || "null");
  settings = { ...settings, ...(saved || {}) };
}

let settingsTimer = 0;
function settingChanged(field, value) {
  settings[field] = value;
  clearTimeout(settingsTimer);                       // don't save on every slider tick
  settingsTimer = setTimeout(async () => {
    if (Arcadex.player) await Arcadex.save.set(SETTINGS_KEY, settings).catch(() => {});
    else localStorage.setItem("mygame:settings", JSON.stringify(settings));
  }, 600);
}
```

Decisions that change the course of the game, like story choices, belong **inside the progress save**
(`p.choices = { bridge: "destroyed", ally: "Mira" }`) so the player resumes with the same story.

### 4.4 Achievements and in-game currency

Define achievements (code name, title, optional reward) and the currency (name, daily earn limit) in the dashboard.

```js
const r = await Arcadex.achievements.unlock("first-win");   // unlocks once; a defined reward is added automatically
if (r.isNew) ui.toast("Achievement unlocked!");              // the platform shows its own notice too

await Arcadex.wallet.earn(20, "level-end");                  // may hit the daily limit: error.code "daily_limit"
try { await Arcadex.wallet.spend(50, "hint"); }
catch (e) { if (e.code === "insufficient") ui.show("Not enough coins"); }
const { balance } = await Arcadex.wallet.get();
```

Currency can't be bought with real money; it's earned and spent in the game. The balance lives on the server and never goes negative.

### 4.5 Data collections (your own table)

For inventory, saved boards, puzzle of the day and similar, define a collection in the dashboard:
**per player** or **game-wide**; game access **none / read / read-write**.

```js
await Arcadex.data.set("inventory", "sword", { level: 3 });
const sword = await Arcadex.data.get("inventory", "sword");
const all = await Arcadex.data.list("inventory", { limit: 50 });   // [{ key, data }]
await Arcadex.data.remove("inventory", "sword");
```

32 KB per record; 500 records per player, 5000 game-wide. Without permission: `error.code === "forbidden"`.

### 4.6 Pause, screen and controls

```js
Arcadex.on("pause", () => { game.paused = true; audio.suspend?.(); saveProgress(game.progress); });
Arcadex.on("resume", () => { game.paused = false; audio.resume?.(); });

// Fit the canvas to any screen (portrait and landscape)
function fit() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", fit); fit();

// Touch + mouse + keyboard together
canvas.addEventListener("pointerdown", (e) => input.press(e.clientX, e.clientY));
addEventListener("keydown", (e) => input.key(e.key));
```

Pick the supported orientation (portrait / landscape) in the dashboard. Start audio after the first tap (browser rule).

### 4.7 Server script (anti-cheat, hidden rules)

If you add `server/main.js` to your package it runs **on Arcadex servers** and is never sent to players.
Use it to grant rewards, validate scores and keep secret answers.

```js
// server/main.js
exports.levelDone = function (ctx, args) {
  if (typeof args.time !== "number" || args.time < 3000) throw new Error("Invalid time.");
  arcadex.wallet.add(20, "level-" + args.level);
  arcadex.leaderboard.submit("fastest", args.time);       // "server only" board
  console.log(ctx.player.name, "finished a level");       // shows up in the dashboard log
  return { reward: 20 };
};
```

```js
// in the game
const r = await Arcadex.server.call("levelDone", { level: 3, time: 41250 });
```

Available in the script: `ctx.player`, `arcadex.data`, `arcadex.wallet`, `arcadex.leaderboard`, `arcadex.achievements`, `console.log`.
Limits: **1 second**, **32 MB**, **100 platform operations** per call. No internet, files or timers.

### 4.8 Online rooms and inviting friends

```js
// Create a room and invite a friend
const { room } = await Arcadex.rooms.create({ maxPlayers: 2 });   // room.code: "K7QM2X"
ui.show(`Room code: ${room.code}`);
await Arcadex.rooms.invite();      // the platform's invite window: the player picks friends from their follow list
                                   // the invite carries the room code; returns { invited }

// A player who opened an invite link: join the room directly
const info = await Arcadex.init();
if (info.invite?.room) await Arcadex.rooms.join(info.invite.room);

// Messages and shared state
Arcadex.on("room.state", (state) => draw(state));
Arcadex.on("room.message", ({ from, type, data }) => { /* ... */ });
Arcadex.on("room.player_joined", (p) => ui.toast(`${p.name} joined`));
await Arcadex.rooms.send("move", { cell: 4 });
```

In the dashboard choose **"2 players, online"** or **"Multiplayer"** as a game mode; invites only work for those games.
For a server referee add `exports.rooms = { onCreate, onJoin, onMessage, onLeave }` to `server/main.js`:
every move goes to the script first; invalid moves return `error.code === "rejected"`.

### 4.9 Ad breaks

Games by non-Premium developers show platform ad breaks; **Premium players never see them.**
One comes automatically when the game opens. Ask for more at natural breaks (level end, restart screen):

```js
async function levelEnd() {
  await saveProgress(game.progress);
  await Arcadex.ads.break();       // may not show (premium player, frequency cap); continue either way
  nextLevel();
}
```

- Don't call it mid-game while the player is acting.
- You get `pause` during the break and `resume` after it.
- The platform shows an ad at most every 2 minutes; extra calls return `{ shown: false }`.

---

## 5. Error codes

| `error.code` | Meaning | What to do |
|---|---|---|
| `login_required` | The player isn't signed in | `Arcadex.requireLogin()` or fall back to local saves |
| `not_ready` | SDK used before `init()` | `await Arcadex.init()` first |
| `unknown_board`, `unknown_achievement`, `unknown_collection` | Code name not in the dashboard | Define it, check the name |
| `no_currency` | Currency not enabled | Enable it in the dashboard |
| `insufficient` | Not enough balance | Tell the player |
| `daily_limit` | Daily earn limit reached | Leave it for tomorrow |
| `score_out_of_range` | Score above the maximum | Check the dashboard limit or your calculation |
| `server_only` | Only the server can write this board | Submit via `server.call` |
| `forbidden` | Game has no access to the collection | Change access in the dashboard or use a server script |
| `too_large`, `too_many_keys`, `too_many_records` | Size / count limit | Make the data smaller or combine it |
| `version_conflict` | The save changed on another device | Read again, then write |
| `script_error`, `script_failed`, `unknown_function`, `no_server_script` | Server script problem | Check the log in the dashboard |
| `room_not_found`, `room_full`, `not_in_room`, `rejected`, `not_host`, `server_authoritative` | Room problems | Show a clear message to the player |
| `session_expired` | Session expired | The platform offers to reload |
| `local_mode` | Feature doesn't work outside the platform | Use "Test" in the dashboard |
| `timeout`, `network` | Connection problem | Retry shortly |

---

## 6. Testing

- **On your computer:** start a local server in the folder (`npx serve .` or `python -m http.server`), download the SDK from
  `/gelistirici/sdk/arcadex.js` and put it in the folder as `sdk/arcadex.js`. The SDK switches to **local mode**:
  saves, scores and currency live in the browser; rooms and server scripts don't run. (Don't double-click `index.html`: the `/sdk/...` path won't resolve.)
- **On the platform:** upload the zip → **Test** in the dashboard. The game opens in the same environment as live; test data is kept separate from real players.
  For multiplayer tests send the **test invite link** under the version to a friend (valid for 24 hours).

## 7. Checklist before uploading

- [ ] `index.html` at the root; all paths relative; SDK at `/sdk/arcadex.js`.
- [ ] No outside addresses (fonts, CDNs, analytics, ads). Libraries are bundled.
- [ ] `Arcadex.init()` once, first. `pause`/`resume` handled.
- [ ] Guests can play too (saves fall back to localStorage, sign-in suggested for scores).
- [ ] Every board, achievement, collection and currency used is defined in the dashboard; code names match the code.
- [ ] Touch + keyboard work; no overflow in portrait/landscape.
- [ ] Errors handled via `error.code`; the game never freezes because of an error.
- [ ] Zip smaller than 150 MB; no forbidden files.

## 8. What to fill in on the dashboard

Game name, tagline and description (Turkish and/or English), genre, age rating, screen orientation, game mode
(single player / 2 players / online / multiplayer), rewards, disclosures, revenue model, a 3:4 cover image and the
"How to play" page (section by section: controls, difficulty and rewards, tips).

---

License: MIT · Author: hsnaydin82, Mesay Dijital
