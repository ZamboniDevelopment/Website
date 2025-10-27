# 🏒 Zamboni — NHL10 Private-Server Game & Player Statistics

Welcome to **Zamboni**, a modern, real-time statistics dashboard built for a private NHL10 server.  
It visualizes live player data, game sessions, and system status using a smooth Tailwind-powered UI.

> “For some unknown hockey game made by some unknown company called ea”  
> Yeah… welcome to the source code, I guess

## 🌐 Overview

**Zamboni.gg** is a web-based analytics dashboard that connects to a custom **Zamboni's Rest Api**.  
It provides a clear, interactive interface for viewing player stats, ongoing games, and live API data.  

The project includes:
- A **responsive TailwindCSS-based UI**
- Dynamic **REST API integration**
- Player profile visualization with **live search**
- Real-time server status display
- API documentation and JSON previews

---

## 🧩 Features

### 🔹 Real-time Server Status
- Shows online users, queued players, server version, and active games.

### 🔹 Player Database
- View all registered players.
- Search, filter, and inspect player stats.
- Click to view recent matches, ranks, and performance summaries.

### 🔹 Game Reports
- Displays combined reports for all active or finished games.
- Includes metadata, team compositions, and in-game performance analytics.

### 🔹 REST API Explorer
Easily see all available endpoints directly within the UI:
| Endpoint | Description |
|-----------|-------------|
| `GET /api/raw/games` | Returns all active/finished games |
| `GET /api/raw/reports` | Returns player reports linked to `game_id` |
| `GET /api/players` | Lists all player gamertags |
| `GET /api/player/:gamertag` | Full player stats & history |
| `GET /status` | Live server information |

---

## 🚀 Getting Started

1. **Clone the repo:**
   ```bash
   git clone https://github.com/ZamboniDevelopment/Website.git
   cd Website
