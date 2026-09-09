# JMusic

A sleek, modern terminal-based music player (TUI) built in TypeScript and Node.js. Discover, search, and stream Creative Commons music from the [Jamendo](https://www.jamendo.com) catalog directly in your terminal, with rock-solid playback powered by [VLC](https://www.videolan.org/vlc/).

```text
╭─── ♪ JMusic  Terminal Audio Player ───────────────────────── ▶ Midnight City Lights ─╮
├─────────────┬──────────────────────────────────────────┬─────────────────────────────┤
│  ♪ JMusic   │ Discover / Featured                      │  ♪ Now Playing     320 kbps │
│             │   #   Title            Artist       Dur  │                             │
│ 1 Discover  │ ▶ 01  Midnight City    Synthwave   03:45 │      ╭──────────────╮       │
│ 2 Search    │   02  Morning Breeze   Acoustic    02:15 │      │   . ─── .    │       │
│ 3 Queue     │   03  Cyberpunk 2088   RetroWave   04:10 │      │  /   ▄▄▄   \ │Jamendo│
│ 4 NowPlay   │   04  Reflections      Ambient     03:20 │      │ |   ( ● )   ||HQ     │
│ ─────────── │   05  Chill Session    Lofi Beat   02:50 │      │  \   ▀▀▀   / │Audio  │
│ ★ Featured  │                                          │      │    ' ─── '   │       │
│ ~ Chill     │                                          │      ╰──────────────╯       │
│ ⚡ Electronic│                                          │  Midnight City Lights       │
│ ♫ Jazz      ├──────────────────────────────────────────┤  Synthwave Collective       │
│ ♦ Rock      │ Queue (2)                                │                             │
│ ◷ Recent    │ ▶ 01 Midnight City Lights  02 Morning... │ 01:32 ━━━━━━░░░░░░░░ 03:45   │
│             │                                          │      ◀◀    ⏸    ▶▶          │
│             │                                          │ 🔊 80%           ▶ PLAYING  │
├─────────────┴──────────────────────────────────────────┴─────────────────────────────┤
│ [Space] Play/Pause │ [Tab/C] Genre │ [1-4] Views │ [Enter] Play │ [A] Queue │ [/] Search │
│ Ready. Press "/" to search, "1-4" for tabs, "Q" to quit.                             │
╰──────────────────────────────────────────────────────────────────────────────────────╯
```

---

## Highlights & Features

- **3-Column Responsive Layout**:
  - **Left Sidebar**: Quick navigation across views (`1` Discover, `2` Search, `3` Queue, `4` Now Playing) and instant genre switching.
  - **Main Panel**: Column-aligned track listings with `#`, title, artist, and duration.
  - **Right Now Playing Pane**: Expansive playback panel with vinyl ASCII artwork, track metadata, responsive progress bar, transport controls, and volume level.
  - **Dynamic Queue Strip**: Automatically expands below the main panel when vertical terminal height allows (`rows >= 27`).
  - **Responsive Adaptability**: Gracefully degrades to a clean single-column view on compact terminals (< 80 columns).
- **Curated Discover Mode**:
  - Browse top Creative Commons tracks across 6 genres: *Featured*, *Chill*, *Electronic*, *Jazz*, *Rock*, and *Recently Added*.
  - Fast in-memory category caching prevents redundant network calls during genre cycling.
- **Instant Search**:
  - Query Jamendo's catalog by song title or artist name with real-time feedback and HTML entity sanitization.
- **Queue & Playback Management**:
  - Dedicated queue view (`3`) with live reordering, individual track removal (`d` or `x`), and automatic progression when a track finishes.
  - Enqueue any track directly from Discover or Search using `A`.
- **Warm Champagne Aesthetic**:
  - Elegant 24-bit TrueColor and 256-color palette (Warm Cream `#FAF7F2`, Champagne `#F3C98B`, Toasted Caramel `#DAA06D`, Oat `#B5A895`, and Roast Walnut `#5E5448`).
  - Smooth rounded box borders (`╭─╮╰─╯`) and badge-style keyboard shortcut hints.
- **Headless VLC Engine**:
  - Controls VLC via standard Remote Control (`rc`) socket interface without audio stutter or UI lag.
- **Rock-Solid Terminal Safety**:
  - Alternate screen buffer keeps terminal history clean.
  - Raw mode and cursor visibility are restored automatically on exit or unexpected interruption (`Ctrl+C`, `SIGTERM`, unhandled exceptions).
  - Pre-flight diagnostic checks detect missing API keys and locate VLC binaries across operating systems.

---

## Architecture & Separation of Concerns

JMusic is built on clean architectural boundaries where each module has a single responsibility:

> **"Jamendo provides track data and audio streams. VLC renders the sound. JMusic coordinates state and renders the terminal interface."**

```text
                     Terminal User Keystrokes / Terminal Resize
                                       │
                                       ▼
                              ┌─────────────────┐
                              │    TUI Layer    │  (AppView compositor, layout engine,
                              └────────┬────────┘   Sidebar, HomeView, SearchView,
                                       │            QueueView, NowPlaying, ProgressBar)
                                       │ Dispatches Actions
                                       ▼
                              ┌─────────────────┐
                              │   Application   │  (App Coordinator, Centralized State,
                              └────┬───────┬────┘   Action Reducers)
                                   │       │
             ┌─────────────────────┘       └─────────────────────┐
             ▼                                                   ▼
      ┌──────────────┐                                    ┌──────────────┐
      │Jamendo Client│ (REST API v3.0, track              │ QueueManager │ (In-memory FIFO,
      └──────┬───────┘  normalization, categories)        └──────┬───────┘  repeat, shuffle)
             │                                                   │
             ▼ Audio Stream URL                                  │ Enqueued Tracks
             └─────────────────────────┬─────────────────────────┘
                                       ▼
                                ┌─────────────┐
                                │ VLC Adapter │ (Headless RC process, playback sync)
                                └──────┬──────┘
                                       │
                                       ▼
                               VLC Audio Output
```

- **TUI Layer (`src/tui/`)**: Pure rendering logic and ANSI layout calculation. Computes exact dimensions via `layout.ts` and handles raw key events.
- **App Layer (`src/app/`)**: Centralized state management (`state.ts`), keyboard dispatching (`App.ts`), and discrete testable actions (`actions.ts`).
- **API Layer (`src/api/`)**: Jamendo v3.0 REST API client (`jamendo.ts`), request typing, HTML entity decoding, and category definitions.
- **Player Layer (`src/player/`)**: Process lifecycle management for headless VLC (`VlcPlayer.ts`) with 500ms playback position synchronization.
- **Queue Layer (`src/queue/`)**: Pure business logic queue manager (`QueueManager.ts`) for FIFO traversal, repeat, shuffle, and index tracking.
- **Config & Utils (`src/config/`, `src/utils/`)**: Pre-flight environment validation and timestamp formatting utilities.

---

## Prerequisites

1. **Node.js**: Version `20.0.0` or higher (uses native `fetch` and the built-in `node:test` runner).
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
     Download and install from [videolan.org/vlc](https://www.videolan.org/vlc/). Add VLC to your `PATH` or specify `VLC_PATH` in `.env`.
3. **Jamendo Client ID**: A free API key from [developer.jamendo.com](https://developer.jamendo.com).

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
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and supply your Jamendo credentials:
   ```ini
   # ─── JMusic Configuration ────────────────────────────────────────────────

   # Jamendo API Client ID (Required)
   # Get a free key at: https://developer.jamendo.com/v3.0/authentication
   JAMENDO_CLIENT_ID=your_client_id_here

   # Jamendo API Client Secret (Optional / Reserved for OAuth2 write endpoints)
   JAMENDO_CLIENT_SECRET=your_client_secret_here

   # VLC binary path (Optional)
   # Only required if VLC is in a custom path not discovered automatically.
   # Examples:
   #   macOS (Homebrew):  /opt/homebrew/bin/vlc
   #   macOS (App):       /Applications/VLC.app/Contents/MacOS/VLC
   #   Linux:             /usr/bin/vlc
   #   Windows:           C:\Program Files\VideoLAN\VLC\vlc.exe
   # VLC_PATH=/path/to/vlc
   ```

4. **Build TypeScript:**
   ```bash
   npm run build
   ```

---

## Usage

### Launch JMusic
```bash
npm start
```

### Development Watch Mode
Automatically recompile on TypeScript changes:
```bash
npm run dev
```

### Install Globally as a CLI
```bash
npm link
jmusic
```

---

## Keyboard Controls

### View Navigation
| Key | Action | Description |
| :--- | :--- | :--- |
| `1` | **Discover View** | Open curated Jamendo genre feeds |
| `2` | **Search View** | Open track & artist search |
| `3` | **Queue View** | Open queue management screen |
| `4` | **Now Playing View** | Focus now playing information |
| `Tab` | **Cycle Category / Views** | In Discover: cycle to next genre tab.<br>In other views: cycle views. |
| `Shift + Tab` | **Prev Category / Views** | In Discover: cycle to previous genre tab.<br>In other views: return to Discover. |
| `C` / `c` / `]` | **Next Category** | Advance to next genre tab in Discover |
| `[` | **Previous Category** | Return to previous genre tab in Discover |

### Track & List Selection
| Key | Action | Description |
| :--- | :--- | :--- |
| `↑` / `k` | **Move Up** | Move selection cursor up in current view |
| `↓` / `j` | **Move Down** | Move selection cursor down in current view |
| `Enter` | **Play Selected** | Play highlighted track immediately |
| `A` / `a` | **Add to Queue** | Enqueue highlighted track without interrupting current song |
| `D` / `d` / `X` / `x` | **Remove from Queue** | Remove highlighted track (when in Queue view) |

### Playback & Audio Transport
| Key | Action | Description |
| :--- | :--- | :--- |
| `Space` | **Play / Pause** | Toggle playback of active track |
| `S` / `s` | **Stop** | Stop playback and reset track position |
| `N` / `n` | **Next Track** | Skip to next track in queue |
| `P` / `p` | **Previous Track** | Skip to previous track in queue |
| `←` | **Seek Backward** | Seek backward 5 seconds |
| `→` | **Seek Forward** | Seek forward 5 seconds |
| `+` / `=` | **Volume Up** | Increase volume by +5% |
| `-` / `_` | **Volume Down** | Decrease volume by -5% |
| `M` / `m` | **Toggle Mute** | Mute or restore previous volume |

### Search & System
| Key | Action | Description |
| :--- | :--- | :--- |
| `/` | **Search Mode** | Focus search input box |
| `Enter` | **Submit Search** | Execute query against Jamendo API (when in search mode) |
| `Esc` | **Exit Search** | Cancel search input and return to list navigation |
| `Q` / `q` | **Quit** | Stop audio and cleanly exit JMusic |
| `Ctrl + C` | **Force Quit** | Emergency exit with safe terminal restoration |

---

## Running Tests

JMusic uses Node.js's built-in native test runner (`node:test` and `node:assert/strict`) with zero external testing framework dependencies:

```bash
npm test
```

### Test Suites (58 Passing Tests)
- `tests/actions.test.ts`: Central action reducers, selection movement, volume clamping, mute toggles, seek boundaries.
- `tests/discover.test.ts`: Discover feeds, category switching, caching mechanism, active selection tracking.
- `tests/formatTime.test.ts`: Millisecond and second conversions, zero handling, hour format boundaries.
- `tests/jamendo.test.ts`: API client queries, HTML entity sanitization, missing key guards, empty response handling.
- `tests/layout.test.ts`: Responsive column calculations, frame row budgets, queue strip triggers, wide vs. narrow breakpoints.
- `tests/logo.test.ts`: ASCII logo rendering and compact single-line fallbacks.
- `tests/navigation.test.ts`: View switching, view cycling, cross-view track selection and queue actions.
- `tests/nowPlaying.test.ts`: Standby card rendering, active track layout, progress display, volume indicator.
- `tests/progressBar.test.ts`: Percentage ratio calculations, division-by-zero guards, bounds clamping.
- `tests/queue.test.ts`: Queue enqueueing, FIFO iteration, repeat wrapping, track removal, shuffle integrity.

---

## Project Structure

```text
jmusic/
├── src/
│   ├── api/             # Jamendo API v3.0 REST client & data contracts
│   │   ├── jamendo.ts   # HTTP queries & track normalization
│   │   └── types.ts     # Track models, category definitions & API shapes
│   ├── app/             # Application coordinator & state
│   │   ├── actions.ts   # Reducer actions for navigation, playback & queue
│   │   ├── App.ts       # Main event loop & keystroke routing
│   │   └── state.ts     # Centralized immutable state models
│   ├── config/          # Environment configuration & pre-flight checks
│   │   └── config.ts    # Diagnostic checks for VLC and Jamendo keys
│   ├── player/          # Headless VLC child process adapter
│   │   ├── Player.ts    # High-level player interface & event emitter
│   │   ├── types.ts     # Player status & capability contracts
│   │   └── VlcPlayer.ts # VLC Remote Control (RC) socket adapter
│   ├── queue/           # Pure queue business logic
│   │   └── QueueManager.ts # FIFO management, repeat & shuffle logic
│   ├── tui/             # Terminal User Interface compositor & components
│   │   ├── AppView.ts   # Root compositor (wide 3-column & narrow modes)
│   │   ├── colors.ts    # Warm beige palette, ANSI formatting & box-drawing
│   │   ├── HomeView.ts  # Discover genre track listings
│   │   ├── layout.ts    # Responsive dimension computation
│   │   ├── Logo.ts      # ASCII slant logo & compact header mark
│   │   ├── NowPlaying.ts# Now Playing card, vinyl artwork & transport
│   │   ├── ProgressBar.ts # Responsive playback progress indicator
│   │   ├── QueueView.ts # Full queue view & bottom queue strip
│   │   ├── SearchView.ts# Interactive search results view
│   │   └── Sidebar.ts   # Left navigation & genre selector panel
│   ├── utils/           # Shared utility helpers
│   │   ├── errors.ts    # Custom error classes
│   │   └── formatTime.ts# Time string formatting (MM:SS / HH:MM:SS)
│   └── index.ts         # Application bootstrap entry point
├── tests/               # Native Node.js unit test suites
│   ├── actions.test.ts
│   ├── discover.test.ts
│   ├── formatTime.test.ts
│   ├── jamendo.test.ts
│   ├── layout.test.ts
│   ├── logo.test.ts
│   ├── navigation.test.ts
│   ├── nowPlaying.test.ts
│   ├── progressBar.test.ts
│   └── queue.test.ts
├── .env.example         # Environment template
├── buildPlan.md         # Source of truth architecture & roadmap
├── package.json
├── README.md
└── tsconfig.json
```

---

## License

ISC
