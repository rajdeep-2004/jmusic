# JMusic

A sleek, lightweight terminal-based music player (TUI) in TypeScript and Node.js. Discover and stream creative-commons music from the [Jamendo](https://www.jamendo.com) catalog directly in your terminal, with playback powered by [VLC](https://www.videolan.org/vlc/).

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ JMusic — Terminal Audio Player                                            │
├─────────────────────────────────────┬─────────────────────────────────────┤
│ Search Results [10 tracks]          │ Now Playing                         │
│                                     │                                     │
│ ▶ 1. Midnight City Lights - Synth   │ Title:  Midnight City Lights        │
│   2. Acoustic Morning Breeze        │ Artist: Synthwave Collective        │
│   3. Cyberpunk Horizon              │ Album:  Retro Waves                 │
│   4. Ambient Reflections            │ Status: [PLAYING]                   │
│   5. Chillhop Study Session         │ Volume: 80%                         │
│                                     │                                     │
│                                     │ 01:32 ━━━━━━━━━━━━░░░░░░░░ 03:45    │
├─────────────────────────────────────┴─────────────────────────────────────┤
│ Queue: [2 tracks]                                                         │
│ ▶ 1. Midnight City Lights (03:45)  2. Acoustic Morning Breeze (02:15)     │
├───────────────────────────────────────────────────────────────────────────┤
│ [Space] Play/Pause | [/] Search | [Enter] Play | [A] Enqueue | [N/P] Next/Prev │
│ [←/→] Seek -/+5s   | [+/-] Vol  | [M] Mute     | [Q] Quit                 │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture & Separation of Concerns

JMusic is strictly designed around decoupled layers:

> **"Jamendo provides the music data and audio URL. VLC plays the audio. JMusic coordinates them and provides the terminal interface."**

```text
                     Terminal User
                           │
                           ▼
                  ┌─────────────────┐
                  │    TUI Layer    │  (AppView, SearchView, NowPlaying, QueueView)
                  └────────┬────────┘
                           │ Dispatches actions
                           ▼
                  ┌─────────────────┐
                  │   Application   │  (App Coordinator, Actions, Centralized State)
                  └────┬───────┬────┘
                       │       │
        ┌──────────────┘       └──────────────┐
        ▼                                     ▼
 ┌──────────────┐                      ┌──────────────┐
 │Jamendo Client│ (REST API)           │ QueueManager │ (Pure logic, no I/O)
 └──────┬───────┘                      └──────┬───────┘
        │                                     │
        ▼ Tracks & Stream URLs                │ Enqueued tracks
        └──────────────────────┬──────────────┘
                               ▼
                        ┌─────────────┐
                        │ VLC Adapter │ (Headless RC process)
                        └──────┬──────┘
                               │
                               ▼
                       VLC Audio Playback
```

- **TUI Layer (`src/tui/`)**: Renders layout, handles raw keystrokes, and presents state. No direct network or player access.
- **App Layer (`src/app/`)**: Centralized application state and discrete actions.
- **API Layer (`src/api/`)**: Jamendo v3.0 REST client, track normalization, and HTML entity decoding.
- **Player Layer (`src/player/`)**: Headless VLC child process adapter over Remote Control (RC) interface (`-I rc --rc-fake-tty --no-video --quiet`).
- **Queue Layer (`src/queue/`)**: Pure in-memory queue management (FIFO, next/prev navigation, repeat looping, shuffle).

---

## Prerequisites

1. **Node.js**: Version `20.0.0` or higher (built-in `fetch` and `node:test` runner).
2. **VLC Media Player**: Required for audio playback.
   - **macOS**:
     ```bash
     brew install --cask vlc
     ```
   - **Ubuntu / Debian**:
     ```bash
     sudo apt-get update && sudo apt-get install -y vlc
     ```
   - **Arch Linux**:
     ```bash
     sudo pacman -S vlc
     ```
   - **Windows**:
     Download and install from [videolan.org/vlc](https://www.videolan.org/vlc/). Ensure VLC is added to your PATH or set `VLC_PATH` in `.env`.
3. **Jamendo Client ID**: A free API credential from [developer.jamendo.com](https://developer.jamendo.com).

---

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rajdeep-2004/jmusic.git
   cd jmusic
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Copy the example environment file and add your Jamendo API key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```ini
   JAMENDO_CLIENT_ID=your_jamendo_client_id_here
   # Optional: specify custom VLC binary location if not in standard PATH
   # VLC_PATH=/custom/path/to/vlc
   ```

4. **Build TypeScript:**
   ```bash
   npm run build
   ```

---

## Usage

### Run Locally
```bash
npm start
```

### Development Watch Mode
```bash
npm run dev
```

### Install Globally as CLI (Optional)
```bash
npm link
jmusic
```

---

## Keyboard Controls

| Key | Action | Description |
| :--- | :--- | :--- |
| `/` | **Search** | Enter search input mode to type a track or artist name |
| `Enter` | **Select / Play** | When navigating: plays selected track.<br>When searching: executes search query. |
| `Esc` | **Exit Search** | Cancel search input and return to list navigation |
| `↑` / `k` | **Move Up** | Navigate up through search results |
| `↓` / `j` | **Move Down** | Navigate down through search results |
| `Space` | **Play / Pause** | Toggle playback of current track |
| `A` / `a` | **Add to Queue** | Enqueue selected track into playback queue |
| `N` / `n` | **Next Track** | Advance to next track in queue |
| `P` / `p` | **Previous Track** | Return to previous track in queue |
| `←` | **Seek Backward** | Jump backward 5 seconds |
| `→` | **Seek Forward** | Jump forward 5 seconds |
| `+` / `=` | **Volume Up** | Increase audio volume (+5%) |
| `-` / `_` | **Volume Down** | Decrease audio volume (-5%) |
| `M` / `m` | **Mute / Unmute** | Toggle audio mute (restores previous volume) |
| `Q` / `q` | **Quit** | Stop audio and exit JMusic cleanly |

---

## Key Features

- **Dynamic Progress Bar**: Live playback position tracker rendering elapsed time, visual bar, and total duration (`01:32 ━━━━━━━━━━━━░░░░░░░░ 03:45`) synchronized at 500ms intervals.
- **Seamless Queue Advancement**: Automatically advances to the next track when current song reaches the end.
- **Robust Pre-flight Validation**:
  - Automatically verifies `JAMENDO_CLIENT_ID` at startup and guides the user if missing.
  - Detects VLC binary across standard platform directories (`PATH`, `/Applications/VLC.app/Contents/MacOS/VLC`, `/usr/bin/vlc`, Program Files, etc.).
- **Graceful Error Handling**:
  - Catches network timeouts and API errors without crashing.
  - Safe bounds clamping on seeking and volume (0–100%).
  - Terminal safety handlers restore cursor and raw mode on exit or interruption (`Ctrl+C`, `SIGTERM`).
  - Terminal resizing guards prevent crashes on small terminal windows.

---

## Running Tests

JMusic uses Node.js's native test runner (`node:test` and `node:assert/strict`) without external testing dependencies:

```bash
npm test
```

### Test Coverage
- `tests/formatTime.test.ts`: Zero handling, seconds formatting, hours display, boundary guards.
- `tests/progressBar.test.ts`: Ratios (0%, 50%, 100%), division-by-zero safety, length constraints.
- `tests/queue.test.ts`: Enqueuing, queue traversal, repeat wrapping, removal, queue clearing, shuffling.
- `tests/jamendo.test.ts`: Normalization, HTML entity decoding, missing client ID error detection, empty search handling.
- `tests/actions.test.ts`: Selection navigation, volume clamping, mute toggling, seek bounds, error states.

---

## Project Structure

```text
jmusic/
├── src/
│   ├── api/             # Jamendo API client, normalization & types
│   │   ├── jamendo.ts
│   │   └── types.ts
│   ├── app/             # Application coordinator, actions & state
│   │   ├── actions.ts
│   │   ├── App.ts
│   │   └── state.ts
│   ├── config/          # Environment & startup config loader
│   │   └── config.ts
│   ├── player/          # VLC process adapter & player interface
│   │   ├── Player.ts
│   │   ├── types.ts
│   │   └── VlcPlayer.ts
│   ├── queue/           # Pure queue manager
│   │   └── QueueManager.ts
│   ├── tui/             # Terminal UI rendering & subviews
│   │   ├── AppView.ts
│   │   ├── NowPlaying.ts
│   │   ├── ProgressBar.ts
│   │   ├── QueueView.ts
│   │   └── SearchView.ts
│   ├── utils/           # Utilities, formatting & custom errors
│   │   ├── errors.ts
│   │   └── formatTime.ts
│   └── index.ts         # Application entry point & pre-flight checks
├── tests/               # Native Node.js unit test suites
│   ├── actions.test.ts
│   ├── formatTime.test.ts
│   ├── jamendo.test.ts
│   ├── progressBar.test.ts
│   └── queue.test.ts
├── .env.example         # Example environment configuration
├── buildPlan.md         # Source of truth architecture & step plan
├── package.json
├── README.md
└── tsconfig.json
```

---

## License

ISC
