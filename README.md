# 🐦 Bird Brain: Evolutionary Neural Network Simulation & Game

> A flock of angry birds that evolves to fly through castle towers using **neuroevolution** and **genetic algorithms** — with no datasets and no backpropagation. Now featuring **Human vs AI Flock Mode**, **Procedural Web Audio**, **Hyperparameter Lab**, and **Model DNA Export/Import**.

---

## 🚀 Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Vite 6** | Ultra-fast development server with instant Hot Module Replacement (HMR) and optimized Rollup builds. |
| **TypeScript 5** | Strict type safety for neural network matrices, genetic operators, simulation physics, and rendering pipelines. |
| **HTML5 Canvas 2D** | Retina HiDPI multi-layer parallax rendering, procedural sprites, and real-time synaptic pulse graphs. |
| **Web Audio API** | Zero-dependency procedural retro sound synthesizer (wing flaps, score pings, crash thuds, and fanfare chords). |
| **Vanilla CSS Design System** | Modular glassmorphism, responsive grid, micro-animations, and dynamic themes (**Cartoon Day**, **Sunset Horizon**, and **Cyberpunk Neon**). |

---

## ✨ Features

### 🎮 1. Human vs AI Flock Mode
- Challenge the evolving AI flock directly!
- Press **Spacebar** or click the canvas to flap as the Human Challenger.
- Test whether your human reflexes can beat Generation 1, and watch as Generation 10+ evolves superhuman flight efficiency.

### 🧠 2. Real-Time Neural Network Visualizers
- Inspect live brain activity for each competing species:
  - **Scarlet**: Fast, nimble 4-4-1 network.
  - **Ash**: Balanced 4-8-1 network.
  - **Rust**: Deep 4-16-1 network.
- Visual features:
  - Input layer: Bird altitude ($y$), horizontal distance to pipe ($x$), gap top, and gap bottom.
  - Hidden neurons with real-time activation values and bias rings.
  - Synaptic weights color-coded (green = positive, red = negative, yellow = recently mutated).
  - Animated electrical pulses showing signal flow.
  - Sigmoid output neuron with a real-time decision gauge (`FLAP` vs `WAIT`).

### 🧪 3. Hyperparameter Lab
- Live interactive tuning of evolutionary parameters:
  - Population size per species (10 to 100 birds).
  - Base mutation rate (5% to 80%) & mutation variance ($\sigma$).
  - Elitism count (protect top-performing champions across generations).
  - Crossover probability (uniform genetic recombination).
  - Dynamic wind & turbulence physics.

### 💾 4. Model DNA Vault (Export & Import)
- **Export Champion**: Download the current top-performing bird's synaptic weights as a `.json` file.
- **Import Brain**: Upload custom neural network files directly into the simulation.
- **Pre-trained Acrobat Preset**: Instantly inject the "Acrobat Alpha" champion bird to demonstrate high-scoring flight.

### 🔊 5. Procedural Sound Engine
- 100% synthesized in-browser with the Web Audio API (zero audio file downloads):
  - Wing flap swooshes
  - Obstacle point chimes
  - Feather crash explosions
  - Generation milestone fanfare

---

## 🕹️ Controls & Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>Space</kbd> / <kbd>Click</kbd> | Flap (Human Mode) / Pause or Resume (Simulation) |
| <kbd>H</kbd> | Toggle **Human vs AI Flock Mode** |
| <kbd>N</kbd> | Skip to Next Generation |
| <kbd>R</kbd> | Restart Simulation |
| <kbd>M</kbd> | Toggle Sound Effects (Mute / Unmute) |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Increase / Decrease Simulation Speed (1x to 32x) |
| <kbd>C</kbd> | Toggle Cinema / Record Mode |

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **npm**: v9+

### Installation & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

3. Build for production:
   ```bash
   npm run build
   ```

4. Preview the production build:
   ```bash
   npm run preview
   ```

---

## 🧬 How Evolution Works
1. **Perception**: Every frame, each bird feeds 4 normalized spatial parameters into its feedforward neural network.
2. **Action**: If the sigmoid output neuron fires with probability $>0.5$, the bird flaps upward; otherwise, gravity pulls it down.
3. **Selection**: When all birds crash, the top surviving birds are selected based on fitness (distance traveled + centering precision within the pipe gap).
4. **Crossover & Mutation**: Offspring inherit weights from the best parents via uniform crossover, accompanied by subtle Gaussian perturbations ($\mu=0, \sigma$) to discover innovative flight policies.