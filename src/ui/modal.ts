import { Simulation } from '../engine/simulation';
import { CHAMPION_PRESET } from '../ai/presets';
import { Brain } from '../ai/brain';
import { sounds } from '../audio/soundEffects';

export class ModalManager {
  private sim: Simulation;
  private onThemeChange: (theme: 'cartoon' | 'neon' | 'sunset') => void;

  constructor(sim: Simulation, onThemeChange: (theme: 'cartoon' | 'neon' | 'sunset') => void) {
    this.sim = sim;
    this.onThemeChange = onThemeChange;
    this.injectModals();
  }

  private injectModals() {
    const modalContainer = document.createElement('div');
    modalContainer.id = 'modalContainer';
    modalContainer.innerHTML = `
      <!-- Hyperparameter Lab Modal -->
      <div class="modal-backdrop" id="labModal" style="display:none;">
        <div class="modal-card">
          <div class="modal-head">
            <h3>🧪 Hyperparameter Lab</h3>
            <button class="btn-close" id="closeLab">&times;</button>
          </div>
          <div class="modal-body">
            <div class="field-row">
              <label>Population Per Species: <b id="labPopVal">40</b></label>
              <input type="range" id="labPop" min="10" max="100" step="5" value="40">
            </div>
            <div class="field-row">
              <label>Base Mutation Rate: <b id="labMutVal">30%</b></label>
              <input type="range" id="labMut" min="5" max="80" step="5" value="30">
            </div>
            <div class="field-row">
              <label>Mutation Variance (SD): <b id="labVarVal">0.65</b></label>
              <input type="range" id="labVar" min="0.1" max="1.5" step="0.05" value="0.65">
            </div>
            <div class="field-row">
              <label>Elitism Count (Untouched Champions): <b id="labEliVal">2</b></label>
              <input type="range" id="labEli" min="0" max="6" step="1" value="2">
            </div>
            <div class="field-row">
              <label>Crossover Probability: <b id="labCrossVal">60%</b></label>
              <input type="range" id="labCross" min="0" max="100" step="10" value="60">
            </div>
            <div class="field-row">
              <label>Environment & Physics Theme:</label>
              <div class="theme-select-group">
                <button class="theme-btn active" data-theme="cartoon">☀️ Cartoon Day</button>
                <button class="theme-btn" data-theme="sunset">🌅 Sunset Horizon</button>
                <button class="theme-btn" data-theme="neon">🌃 Cyberpunk Neon</button>
              </div>
            </div>
            <div class="field-row-check">
              <label><input type="checkbox" id="labWind"> Enable Dynamic Wind & Turbulence</label>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="applyLab">Apply & Respawn</button>
            <button class="btn btn-secondary" id="cancelLab">Close</button>
          </div>
        </div>
      </div>

      <!-- Model Vault (DNA Export/Import) Modal -->
      <div class="modal-backdrop" id="vaultModal" style="display:none;">
        <div class="modal-card">
          <div class="modal-head">
            <h3>💾 Model DNA Vault</h3>
            <button class="btn-close" id="closeVault">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-desc">Export the current champion's trained synaptic weights to JSON, load a pre-trained acrobat, or import your own neural network file.</p>
            <div class="vault-actions">
              <button class="btn" id="exportChampion">📥 Download Champion JSON</button>
              <button class="btn" id="loadAcrobat">⚡ Load 'Acrobat Alpha' Champion</button>
              <label class="btn file-btn">
                📂 Import Brain JSON
                <input type="file" id="importFileInput" accept=".json" style="display:none;">
              </label>
            </div>
            <div class="vault-status" id="vaultStatus">Vault ready.</div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-secondary" id="closeVaultBtn">Done</button>
          </div>
        </div>
      </div>

      <!-- Help / Shortcuts Modal -->
      <div class="modal-backdrop" id="helpModal" style="display:none;">
        <div class="modal-card">
          <div class="modal-head">
            <h3>🎮 Controls & Neural Guide</h3>
            <button class="btn-close" id="closeHelp">&times;</button>
          </div>
          <div class="modal-body">
            <table class="shortcuts-table">
              <tr><td><span class="kbd">Space</span> / <span class="kbd">Click</span></td><td>Flap (Human Mode) or Pause/Resume</td></tr>
              <tr><td><span class="kbd">H</span></td><td>Toggle Human vs AI Flock Mode</td></tr>
              <tr><td><span class="kbd">N</span></td><td>Skip to next generation</td></tr>
              <tr><td><span class="kbd">R</span></td><td>Restart simulation</td></tr>
              <tr><td><span class="kbd">↑ / ↓</span></td><td>Increase / Decrease speed (1x–32x)</td></tr>
              <tr><td><span class="kbd">C</span></td><td>Toggle Cinema / Record Mode</td></tr>
              <tr><td><span class="kbd">M</span></td><td>Toggle Sound FX</td></tr>
            </table>
            <h4 style="margin:16px 0 6px;">How Evolution Works:</h4>
            <p style="font-size:13px;line-height:1.5;color:#4a5288;">
              Each bird possesses a neural network reading 4 real-time inputs: its altitude, distance to next pipe, gap top, and gap bottom. Outputting &gt;0.5 flaps. Only the highest-fitness birds pass weights to offspring, with subtle Gaussian mutations (highlighted in yellow in the network viewer). Over generations, natural selection develops optimal flight paths!
            </p>
          </div>
          <div class="modal-foot">
            <button class="btn" id="closeHelpBtn">Got it!</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalContainer);
    this.bindEvents();
  }

  private bindEvents() {
    const $ = (id: string) => document.getElementById(id)!;

    // Lab Modal bindings
    const labModal = $('labModal');
    $('closeLab').onclick = () => (labModal.style.display = 'none');
    $('cancelLab').onclick = () => (labModal.style.display = 'none');

    $('labPop').oninput = (e: Event) => {
      const val = (e.target as HTMLInputElement).value;
      $('labPopVal').textContent = val;
    };
    $('labMut').oninput = (e: Event) => {
      const val = (e.target as HTMLInputElement).value;
      $('labMutVal').textContent = `${val}%`;
    };
    $('labVar').oninput = (e: Event) => {
      const val = (e.target as HTMLInputElement).value;
      $('labVarVal').textContent = val;
    };
    $('labEli').oninput = (e: Event) => {
      const val = (e.target as HTMLInputElement).value;
      $('labEliVal').textContent = val;
    };
    $('labCross').oninput = (e: Event) => {
      const val = (e.target as HTMLInputElement).value;
      $('labCrossVal').textContent = `${val}%`;
    };

    // Theme selector
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const theme = target.dataset.theme as 'cartoon' | 'neon' | 'sunset';
        this.sim.settings.theme = theme;
        this.onThemeChange(theme);
        sounds.playClick();
      });
    });

    $('applyLab').onclick = () => {
      this.sim.settings.popPerSpecies = parseInt(($('labPop') as HTMLInputElement).value, 10);
      this.sim.settings.mutationRate = parseInt(($('labMut') as HTMLInputElement).value, 10) / 100;
      this.sim.settings.mutationVariance = parseFloat(($('labVar') as HTMLInputElement).value);
      this.sim.settings.elitismCount = parseInt(($('labEli') as HTMLInputElement).value, 10);
      this.sim.settings.crossoverRate = parseInt(($('labCross') as HTMLInputElement).value, 10) / 100;
      this.sim.settings.windEnabled = ($('labWind') as HTMLInputElement).checked;

      this.sim.restart();
      sounds.playClick();
      labModal.style.display = 'none';
    };

    // Vault Modal bindings
    const vaultModal = $('vaultModal');
    $('closeVault').onclick = () => (vaultModal.style.display = 'none');
    $('closeVaultBtn').onclick = () => (vaultModal.style.display = 'none');

    $('exportChampion').onclick = () => {
      const topBird = [...this.sim.birds].sort((a, b) => b.fit - a.fit)[0];
      if (!topBird) return;
      const json = topBird.brain.toJSON(
        `Champion Gen ${this.sim.gen}`,
        this.sim.speciesList[topBird.sp]?.name || 'Scarlet',
        topBird.score,
        this.sim.gen
      );
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bird-brain-champion-gen${this.sim.gen}.json`;
      a.click();
      URL.revokeObjectURL(url);
      $('vaultStatus').textContent = `✅ Exported champion model with fitness ${Math.round(topBird.fit)}!`;
      sounds.playScore();
    };

    $('loadAcrobat').onclick = () => {
      const brain = Brain.fromJSON(CHAMPION_PRESET);
      this.sim.loadChampion(brain, 0);
      $('vaultStatus').textContent = `✅ Loaded 'Acrobat Alpha' pre-trained champion into Scarlet flock!`;
      sounds.playFanfare();
    };

    $('importFileInput').onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (parsed && parsed.weights && parsed.h) {
            const brain = Brain.fromJSON(parsed);
            this.sim.loadChampion(brain, 0);
            $('vaultStatus').textContent = `✅ Successfully imported '${parsed.name || 'Custom Brain'}'!`;
            sounds.playFanfare();
          } else {
            $('vaultStatus').textContent = `❌ Invalid model JSON format.`;
          }
        } catch {
          $('vaultStatus').textContent = `❌ Error reading JSON file.`;
        }
      };
      reader.readAsText(file);
    };

    // Help Modal bindings
    const helpModal = $('helpModal');
    $('closeHelp').onclick = () => (helpModal.style.display = 'none');
    $('closeHelpBtn').onclick = () => (helpModal.style.display = 'none');
  }

  public openLab() {
    const labModal = document.getElementById('labModal');
    if (labModal) labModal.style.display = 'flex';
  }

  public openVault() {
    const vaultModal = document.getElementById('vaultModal');
    if (vaultModal) vaultModal.style.display = 'flex';
  }

  public openHelp() {
    const helpModal = document.getElementById('helpModal');
    if (helpModal) helpModal.style.display = 'flex';
  }
}
