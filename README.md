# 🕵️ Find The Imposter (Party Deduction Game)

A sleek, mobile-first party game to play locally with friends on your mobile browser or desktop.

## 🚀 Quick Start

1. **Start the local server:**
   ```bash
   npm run dev -- --host
   ```
2. **Open on your phone:**
   - Connect your phone to the same Wi-Fi or mobile hotspot.
   - Open your mobile browser (Safari, Chrome, etc.) and visit:
     ```
     http://<YOUR_LOCAL_IP>:5173
     ```
     *(e.g., `http://192.168.1.249:5173`)*

---

## 🎮 How to Play

### 1. Setup Phase
- **Players:** Choose 3 to 20 players.
- **Imposters:** 1 (standard) or 2 (chaos mode for 5+ players).
- **Categories:** Pick from 7+ built-in categories (Food, Places, Animals, Everyday Objects, Movies, Sports, Jobs) or type a **Custom Word & Hint**!
- **Timer:** Choose an optional round discussion countdown (1 min, 2 min, 3 min, or Untimed).

### 2. Pass & Play (Secret Cards)
- **Random Card Colors:** Every player gets a unique, vibrant colored card. The Imposter's card also receives a random color from the same pool so nobody can deduce the imposter from a distance!
- **Privacy Handover:** Between turns, the screen prompts: *"Pass phone to [Player]"*.
- **Peek Mechanics:** 
  - **Hold to Peek:** As long as you press your finger down, your card is revealed. When you let go, it hides immediately!
  - **Tap to Reveal:** Quick tap to view and lock.
- **Roles:**
  - 🛡️ **Citizens:** See the exact Secret Word.
  - 🕵️ **Imposter:** Sees the category and a subtle **single-word hint** (e.g. *Italian* for Pizza, *Flights* for Airport, *Marine* for Dolphin) to bluff with without revealing the secret immediately.

### 3. Discussion Phase
- **First Speaker:** A starting speaker is picked at random to avoid awkward silences!
- **Round Timer:** Live countdown with pause, play, and +30s extension buttons.
- **Group Voting:** Tap to select the suspect agreed upon by the group.

### 4. Imposter Reveal
- Dramatic reveal with sound effects and confetti celebration.
- Shows whether the citizens caught the imposter or the imposter fooled everyone!
- Instant **Play Again** button to roll a new round with the same group.

---

## 🛠️ Tech Stack
- **Framework:** React 19 + Vite 8
- **Styling:** Tailwind CSS v4 (dark mode optimized, tactile mobile touch-action)
- **Audio:** Web Audio API synthesizer (0ms latency, works offline)
- **Icons:** Lucide React
- **FX:** Canvas Confetti
