# JMusic — Build Plan

> **Purpose:** This document is the source of truth for the coding agent.
> The agent must implement only what is defined here. If a requirement is ambiguous or a new feature is not specified, **do not invent it**. Ask for clarification or leave it out.

---

# 1. Product

**JMusic** is a terminal-based music player that allows users to discover music through the **Jamendo API** and play that music through **VLC**.

The application is a **TUI (Terminal User Interface)** rather than a traditional command-only CLI.

The user should be able to:

* Search for music.
* Browse/search returned songs.
* Select a song.
* Play a song.
* Pause/resume playback.
* Play the previous song.
* Play the next song.
* See the currently playing song.
* See playback progress.
* Seek through a song.
* Control volume.
* See the queue.
* Exit the application cleanly.

---

# 2. Hard Constraints

These constraints are mandatory.

## 2.1 Music Source

**Jamendo API is the only music/catalog source.**

Do NOT implement:

* Spotify
* YouTube
* SoundCloud
* Apple Music
* local music libraries
* other music APIs

Music metadata and playable audio URLs must come from Jamendo.

---

## 2.2 Audio Player

**VLC is the only audio playback engine.**

The application must delegate audio playback to VLC/libVLC.

Do NOT implement:

* a custom MP3 decoder
* custom audio playback
* browser-based playback
* HTML5 audio
* another audio-player engine

The application controls VLC; VLC handles actual audio playback.

---

## 2.3 Local Music

The application must **not scan or load music from the user's local filesystem**.

There is no local music library.

Do not add functionality such as:

```text
Browse ~/Music
Import MP3
Add local folder
Local music database
```

---

## 2.4 Language

Use:

**TypeScript**

Runtime:

**Node.js**

Do not switch to Python, Rust, Go, C++, Java, or another language.

---

## 2.5 Interface

The primary interface is an interactive terminal UI.

The application must work entirely inside the terminal.

Do NOT build:

* a web frontend
* Electron
* desktop GUI
* mobile app
* browser interface

---

## 2.6 API Key

The Jamendo API credential must be provided through an environment variable.

Do not hardcode credentials in source code.

Example:

```env
JAMENDO_CLIENT_ID=your_client_id
```

The actual variable name should remain consistent throughout the project.

---

## 2.7 Scope

This is a capstone/minor project.

Prioritize:

1. working music discovery
2. working playback
3. clean TUI
4. understandable architecture
5. reliable controls

Do not introduce unnecessary infrastructure or enterprise-level architecture.

No:

* microservices
* Docker requirement
* cloud backend
* custom server
* Redis
* message queues
* Kubernetes
* authentication system
* user accounts

---

# 3. Technology Stack

The target stack is:

```text
TypeScript
Node.js
Jamendo API
VLC/libVLC
TUI framework
```

The TUI framework should be selected and kept isolated behind the UI layer.

The application should not tightly couple Jamendo API code directly to UI components.

---

# 4. High-Level Architecture

```text
┌───────────────────────────────────────────────┐
│                    JMusic                     │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │                 TUI                     │  │
│  │                                         │  │
│  │ Search │ Library │ Queue │ Now Playing  │  │
│  └───────────────────┬─────────────────────┘  │
│                      │                        │
│                      ▼                        │
│  ┌─────────────────────────────────────────┐  │
│  │          Application / State            │  │
│  │                                         │  │
│  │ playback │ queue │ search │ navigation  │  │
│  └───────────────┬─────────────┬───────────┘  │
│                  │             │              │
│                  ▼             ▼              │
│        ┌──────────────┐ ┌───────────────┐    │
│        │   Jamendo    │ │ VLC Player    │    │
│        │    Client    │ │   Adapter     │    │
│        └──────┬───────┘ └───────┬───────┘    │
│               │                 │             │
└───────────────┼─────────────────┼─────────────┘
                │                 │
                ▼                 ▼
         Jamendo API             VLC
                │                 │
                │                 ▼
                │              Speakers
                ▼
          Music Metadata
          + Audio URLs
```

---

# 5. Core Application Flow

## 5.1 Application Startup

```text
Start application
       ↓
Load environment variables
       ↓
Validate Jamendo credentials
       ↓
Initialize application state
       ↓
Initialize VLC
       ↓
Initialize TUI
       ↓
Render application
       ↓
Wait for user input
```

If a required dependency is unavailable, show a clear error and exit cleanly.

---

# 6. Music Search Flow

```text
User enters search query
          ↓
TUI sends search action
          ↓
Application controller
          ↓
Jamendo client
          ↓
Jamendo API
          ↓
API response
          ↓
Normalize track data
          ↓
Update application state
          ↓
TUI rerenders search results
```

The UI must never directly construct Jamendo API requests.

---

# 7. Track Playback Flow

```text
User selects track
       ↓
Application controller
       ↓
Track contains Jamendo audio URL
       ↓
VLC Player Adapter
       ↓
VLC
       ↓
Audio playback
```

The application does not download the music first.

The audio URL should be passed to VLC for playback.

---

# 8. Playback Control Flow

## Play

```text
User selects Play
       ↓
Player Controller
       ↓
VLC Adapter
       ↓
VLC.play()
```

## Pause

```text
User presses Space
       ↓
Player Controller
       ↓
VLC Adapter
       ↓
Pause playback
```

## Resume

```text
User presses Space again
       ↓
Player Controller
       ↓
VLC Adapter
       ↓
Resume playback
```

## Next

```text
User presses N
       ↓
Queue Manager
       ↓
Get next track
       ↓
VLC Adapter
       ↓
Play next track
```

## Previous

```text
User presses P / previous control
       ↓
Queue Manager
       ↓
Get previous track
       ↓
VLC Adapter
       ↓
Play previous track
```

---

# 9. Playback Progress Flow

VLC is the source of truth for playback position.

```text
VLC
 ↓
Current playback position
 ↓
Player state
 ↓
TUI
 ↓
Progress bar
```

The application should display information such as:

```text
01:32 ━━━━━━━━━━━░░░░ 03:45
```

The UI must not assume playback position independently from VLC.

---

# 10. Seek Flow

```text
User presses seek control
       ↓
Player Controller
       ↓
Calculate new position
       ↓
VLC Adapter
       ↓
VLC seeks
       ↓
Updated position
       ↓
TUI rerenders
```

The seek amount should be implemented as a clearly defined constant/configuration value rather than duplicated throughout the code.

---

# 11. Queue Flow

The queue is maintained by the application.

Example:

```text
Queue

1. Track A
2. Track B  ← Current
3. Track C
4. Track D
```

The queue manager is responsible for:

```text
add track
remove track
get current track
get next track
get previous track
shuffle
repeat
```

The queue must not be implemented inside the TUI components.

---

# 12. Automatic Next Track

When VLC reports that the current track has finished:

```text
VLC
 ↓
Playback ended event
 ↓
Player Controller
 ↓
Queue Manager
 ↓
Next track
 ↓
VLC
 ↓
Playback
```

The UI should update to show the new current track.

---

# 13. Application State

Keep application state centralized.

At minimum, state should represent:

```ts
currentTrack
playbackStatus
currentPosition
duration
volume
queue
queueIndex
searchQuery
searchResults
selectedTrack
```

Playback state should use explicit values such as:

```text
stopped
playing
paused
buffering
error
```

Avoid scattered global variables.

---

# 14. Data Model

The application should normalize Jamendo's API response into an internal `Track` model.

Example:

```ts
interface Track {
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration: number;
    artworkUrl?: string;
    audioUrl: string;
}
```

The rest of the application should work with this internal model instead of depending directly on the raw Jamendo response structure.

---

# 15. Proposed Folder Structure

```text
jmusic/
│
├── src/
│   │
│   ├── app/
│   │   ├── App.ts
│   │   ├── state.ts
│   │   └── actions.ts
│   │
│   ├── api/
│   │   ├── jamendo.ts
│   │   └── types.ts
│   │
│   ├── player/
│   │   ├── Player.ts
│   │   ├── VlcPlayer.ts
│   │   └── types.ts
│   │
│   ├── queue/
│   │   └── QueueManager.ts
│   │
│   ├── tui/
│   │   ├── AppView.ts
│   │   ├── SearchView.ts
│   │   ├── QueueView.ts
│   │   ├── NowPlaying.ts
│   │   ├── ProgressBar.ts
│   │   └── components/
│   │
│   ├── config/
│   │   └── config.ts
│   │
│   ├── utils/
│   │   ├── formatTime.ts
│   │   └── errors.ts
│   │
│   └── index.ts
│
├── tests/
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

The exact filenames may change during implementation if the framework requires it, but the **separation of responsibilities must remain**.

---

# 16. Module Responsibilities

## `api/`

Responsible only for communicating with Jamendo.

It should handle:

```text
HTTP requests
authentication
query parameters
response parsing
API errors
track normalization
```

It should NOT:

```text
render UI
control VLC
manage keyboard input
manage the queue
```

---

## `player/`

Responsible for VLC playback.

It should expose application-friendly operations such as:

```text
play(url)
pause()
resume()
stop()
seek(position)
getPosition()
getDuration()
setVolume(volume)
```

It should hide VLC-specific implementation details from the rest of the application.

---

## `queue/`

Responsible for:

```text
queue ordering
current index
next
previous
shuffle
repeat
```

It should not know how VLC works.

---

## `app/`

Responsible for coordinating the application.

It connects:

```text
TUI
Jamendo
Player
Queue
State
```

This is where user actions become application operations.

---

## `tui/`

Responsible only for:

```text
rendering
keyboard input
navigation
displaying state
```

The TUI should not directly call Jamendo or VLC.

---

## `config/`

Responsible for application configuration.

Example:

```text
JAMENDO_CLIENT_ID
```

Credentials must come from environment variables.

---

# 17. TUI Layout

The initial UI should have four conceptual areas.

```text
┌─────────────────────────────────────────────────────┐
│                    JMusic                           │
├──────────────────────────┬──────────────────────────┤
│                          │                          │
│       Search Results     │      Now Playing         │
│                          │                          │
│  > Track 1               │      Track Name         │
│    Track 2               │      Artist              │
│    Track 3               │                          │
│    Track 4               │  01:32 ━━━━━░░ 03:45    │
│                          │                          │
├──────────────────────────┴──────────────────────────┤
│ Queue                                                │
│  1. Track 1   2. Track 2   3. Track 3               │
├─────────────────────────────────────────────────────┤
│ Space: Play/Pause | N: Next | P: Previous | Q: Quit │
└─────────────────────────────────────────────────────┘
```

The exact visual design can evolve, but these core information areas should remain:

* Search/results
* Now Playing
* Queue
* Controls

---

# 18. Keyboard Controls

Initial controls:

| Key     | Action              |
| ------- | ------------------- |
| `Space` | Play/Pause          |
| `N`     | Next                |
| `P`     | Previous            |
| `←`     | Seek backward       |
| `→`     | Seek forward        |
| `↑`     | Move selection up   |
| `↓`     | Move selection down |
| `Enter` | Select/play         |
| `Q`     | Quit                |

Do not add a large number of keyboard shortcuts unless required.

---

# 19. Error Handling

The application must gracefully handle:

```text
Jamendo API unavailable
Network unavailable
Invalid Jamendo credentials
No search results
Track has no playable audio URL
VLC unavailable
VLC playback failure
Invalid queue operation
Terminal/input errors
```

Errors should be presented to the user in the TUI where appropriate.

Do not crash with an unhandled exception for normal user/application errors.

---

# 20. Dependency Rules

Keep dependencies minimal.

Before adding a dependency, determine whether it is actually required.

Do not introduce libraries for functionality that can reasonably be handled by existing dependencies or simple application code.

Potential dependency categories:

```text
TUI framework
HTTP/API client if needed
VLC/libVLC binding
environment/configuration
testing
```

The coding agent must not add unrelated frameworks or services.

---

# 21. Architecture Rules

The following dependency direction should be maintained:

```text
TUI
 ↓
Application
 ↓
Services
 ↓
External integrations
```

Specifically:

```text
TUI → App/State
App → Jamendo
App → Player
App → Queue

Jamendo → HTTP/Jamendo
Player → VLC
Queue → no external dependency
```

Do NOT create circular dependencies.

Do NOT make UI components responsible for business logic.

Do NOT make the Jamendo client responsible for playback.

Do NOT make the VLC adapter responsible for queue management.

---

# 22. MVP Scope

The first working version is complete when a user can:

```text
1. Launch JMusic
2. Search Jamendo
3. See search results
4. Select a track
5. Play it through VLC
6. Pause/resume it
7. See playback progress
8. Seek
9. Play next
10. Play previous
11. See the queue
12. Quit cleanly
```

Everything else is secondary.

---

# 23. Implementation Order

The coding agent must build incrementally in this order:

```text
Step 1
Project setup
        ↓
Step 2
CLI/TUI bootstrapping
        ↓
Step 3
Jamendo API client
        ↓
Step 4
Display/search tracks
        ↓
Step 5
VLC integration
        ↓
Step 6
Play/pause/stop
        ↓
Step 7
Player state
        ↓
Step 8
Queue
        ↓
Step 9
Next/previous
        ↓
Step 10
Playback progress
        ↓
Step 11
Seek
        ↓
Step 12
Volume
        ↓
Step 13
Polish/error handling
        ↓
Step 14
Tests
        ↓
Step 15
Packaging/documentation
```

Do not attempt to implement the entire application in one pass.

After each major step, verify that the application still works.

---

# 24. Explicit Non-Goals

The following are **outside the scope of this project unless explicitly added later**:

* Spotify integration
* YouTube integration
* SoundCloud integration
* local music playback
* music downloading
* music uploading
* user accounts
* authentication beyond the Jamendo API credential
* cloud database
* web UI
* desktop UI
* mobile UI
* social features
* recommendations engine
* AI recommendations
* lyrics
* equalizer
* audio effects
* music purchasing
* subscription management
* streaming infrastructure
* custom audio decoder

Do not implement any of these.

---

# 25. Coding-Agent Rules

The coding agent must follow these rules throughout implementation:

### Rule 1 — This file is the source of truth

If the agent's assumptions conflict with this document, this document wins.

### Rule 2 — Do not hallucinate requirements

If a feature is not specified, do not automatically add it.

### Rule 3 — Do not change the core stack

The core stack is:

```text
TypeScript
Node.js
Jamendo
VLC
TUI
```

### Rule 4 — Keep external integrations isolated

Jamendo-specific code belongs in the API layer.

VLC-specific code belongs in the player layer.

### Rule 5 — Keep UI separate from business logic

UI components should render state and dispatch actions.

### Rule 6 — Build incrementally

Do not generate the entire project architecture and implementation simultaneously.

Implement one milestone, test it, then continue.

### Rule 7 — Prefer simple solutions

This is a capstone project, not a distributed production system.

Use the simplest architecture that correctly satisfies the requirements.

### Rule 8 — Do not silently introduce new features

If the agent believes an additional feature is necessary, explain why before adding it.

---

# 26. Final System Flow

The complete application should follow this model:

```text
                         USER
                          │
                          ▼
                    ┌───────────┐
                    │    TUI    │
                    └─────┬─────┘
                          │
                    User Actions
                          │
                          ▼
                 ┌─────────────────┐
                 │   Application   │
                 │    Controller   │
                 └────┬───────┬────┘
                      │       │
              ┌───────┘       └────────┐
              ▼                        ▼
       ┌─────────────┐          ┌─────────────┐
       │   Jamendo   │          │    Queue    │
       │    Client   │          │   Manager   │
       └──────┬──────┘          └──────┬──────┘
              │                        │
              ▼                        │
        Jamendo API                    │
              │                        │
              ▼                        │
        Track + Audio URL              │
              │                        │
              └──────────┬─────────────┘
                         ▼
                  ┌─────────────┐
                  │ VLC Adapter │
                  └──────┬──────┘
                         │
                         ▼
                       VLC
                         │
                         ▼
                      AUDIO

VLC playback state
        │
        ▼
 Player State
        │
        ▼
       TUI
        │
        ▼
Progress / Now Playing / Status
```

**Core principle:**

> **Jamendo provides the music data and audio URL. VLC plays the audio. JMusic coordinates them and provides the terminal interface.**

That separation should remain intact throughout the project.
