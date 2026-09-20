import { jevClient, JevTelemetry } from '../ai/jevClient';

export class JevDashboard {
  private container: HTMLElement;
  private shortenLongText: boolean = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderLayout();
    this.bindEvents();

    // Initial render immediately so boxes are never empty
    this.updateTelemetry(jevClient.telemetry);

    jevClient.onTelemetryUpdate = (t: JevTelemetry) => {
      this.updateTelemetry(t);
    };
  }

  private renderLayout() {
    this.container.innerHTML = `
      <!-- Top Telemetry Header -->
      <div class="jev-header">
        <div class="jev-title-info">
          <span class="jev-brand">Jev</span>
          <span class="jev-model-tag" id="jevModelTag">${jevClient.getModel()}</span>
          <span class="jev-pipe-info">through OpenRouter, asked every 0.1 seconds of game time</span>
        </div>
        <div class="jev-stats-bar">
          <span class="jev-status-dot" id="jevDot">●</span>
          <span id="jevCallStats">call 1: HTTP 200 in 240 ms, $0.000031</span>
          <button class="jev-config-btn" id="openApiSettingsBtn">🔑 API Key</button>
        </div>
      </div>

      <!-- Two-Panel Jev Telemetry Grid -->
      <div class="jev-panels-grid">
        <!-- Panel 1: Request Going Out -->
        <div class="jev-panel">
          <div class="panel-header">
            <span class="panel-title">1. Request going out</span>
            <label class="shorten-toggle">
              <input type="checkbox" id="shortenToggle" checked> shorten long text
            </label>
          </div>

          <div class="panel-meta-http">
            <div class="http-line"><span class="http-verb">POST</span> <span class="http-url">https://openrouter.ai/api/alpha/decisions</span></div>
            <div class="http-line"><span class="http-header">Authorization:</span> Bearer &lt;${jevClient.getApiKey() ? 'API Key Active' : 'your OpenRouter key'}&gt;</div>
            <div class="http-line"><span class="http-header">Content-Type:</span> application/json</div>
          </div>

          <div class="code-box" id="requestJsonBox">
            <pre><code class="json-code" id="requestJsonCode"></code></pre>
          </div>

          <div class="panel-footer-note">
            <b>state</b> is what Jev looks at, the game inputs. <b>questions.urgency</b> is a score question: the <b>instructions</b> in words and the <b>criteria</b>, the 3 levels the answer is placed between.
          </div>
        </div>

        <!-- Panel 2: Response Coming Back -->
        <div class="jev-panel">
          <div class="panel-header">
            <span class="panel-title">2. Response coming back</span>
          </div>

          <div class="decision-banner" id="decisionBanner">
            score <b id="decisionScore">0.23</b> (confidence <span id="decisionConfidence">0.66</span>), <span id="decisionAction">under 1 so Mario waits WAIT</span>
          </div>

          <!-- Probability Distribution Bars -->
          <div class="probability-bars-container">
            <div class="prob-row" id="probRow0">
              <span class="prob-label">0 - Not at all</span>
              <div class="prob-bar-track">
                <div class="prob-bar-fill" id="barFill0" style="width: 79%;"></div>
              </div>
              <span class="prob-val" id="probVal0">0.79</span>
            </div>

            <div class="prob-row" id="probRow1">
              <span class="prob-label">1 - Soon</span>
              <div class="prob-bar-track">
                <div class="prob-bar-fill" id="barFill1" style="width: 19%;"></div>
              </div>
              <span class="prob-val" id="probVal1">0.19</span>
            </div>

            <div class="prob-row" id="probRow2">
              <span class="prob-label">2 - Right now</span>
              <div class="prob-bar-track">
                <div class="prob-bar-fill" id="barFill2" style="width: 2%;"></div>
              </div>
              <span class="prob-val" id="probVal2">0.02</span>
            </div>
          </div>

          <div class="code-box" id="responseJsonBox">
            <pre><code class="json-code" id="responseJsonCode"></code></pre>
          </div>

          <div class="panel-footer-note">
            <b>probabilities</b> is how likely each level is. <b>score</b> is where the answer lands between levels 0 and 2, the bird jumps at 1 or more.
          </div>
        </div>
      </div>

      <!-- API Key Modal -->
      <div class="modal-backdrop" id="apiKeyModal" style="display:none;">
        <div class="modal-card">
          <div class="modal-head">
            <h3>🔑 OpenRouter / LLM API Key</h3>
            <button class="btn-close" id="closeApiKeyModal">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-desc">
              Enter your <b>OpenRouter API Key</b> to enable live LLM decisions through <code>https://openrouter.ai/api/alpha/decisions</code>.
            </p>
            <div class="field-row">
              <label>OpenRouter API Key:</label>
              <input type="password" id="apiKeyInput" placeholder="sk-or-v1-..." class="api-key-text-input" value="${jevClient.getApiKey()}">
            </div>
            <div class="field-row">
              <label>Model Identifier:</label>
              <input type="text" id="modelInput" value="${jevClient.getModel()}" class="api-key-text-input">
            </div>
            <div class="api-status-tag" id="apiKeyStatus">
              ${jevClient.getApiKey() ? '🟢 Active Live API Key' : '🟡 Simulated Mode (Built-in Jev Neural Simulator)'}
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="saveApiKeyBtn">Save & Connect</button>
            <button class="btn btn-secondary" id="useSimulatedBtn">Use Simulator</button>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents() {
    const $ = (id: string) => document.getElementById(id)!;

    const shortenCheck = $('shortenToggle') as HTMLInputElement;
    shortenCheck.onchange = () => {
      this.shortenLongText = shortenCheck.checked;
      if (jevClient.telemetry.lastRequest) {
        this.updateTelemetry(jevClient.telemetry);
      }
    };

    const modal = $('apiKeyModal');
    $('openApiSettingsBtn').onclick = () => {
      modal.style.display = 'flex';
      ($('apiKeyInput') as HTMLInputElement).value = jevClient.getApiKey();
    };
    $('closeApiKeyModal').onclick = () => (modal.style.display = 'none');

    $('saveApiKeyBtn').onclick = () => {
      const key = ($('apiKeyInput') as HTMLInputElement).value;
      const model = ($('modelInput') as HTMLInputElement).value;
      jevClient.setApiKey(key);
      if (model) jevClient.setModel(model);
      $('jevModelTag').textContent = jevClient.getModel();
      modal.style.display = 'none';
    };

    $('useSimulatedBtn').onclick = () => {
      jevClient.setApiKey('');
      modal.style.display = 'none';
    };
  }

  public updateTelemetry(t: JevTelemetry) {
    const $ = (id: string) => document.getElementById(id);

    // Stats
    const statsEl = $('jevCallStats');
    if (statsEl) {
      statsEl.textContent = `call ${t.callCount}: HTTP ${t.lastStatus} in ${t.lastLatencyMs} ms, $${t.estimatedCost.toFixed(6)}`;
    }

    const dot = $('jevDot');
    if (dot) {
      dot.style.color = t.lastStatus === 200 ? '#4ade80' : '#ef4444';
    }

    // Decision banner
    const scoreEl = $('decisionScore');
    const confEl = $('decisionConfidence');
    const actionEl = $('decisionAction');
    const banner = $('decisionBanner');

    if (scoreEl && confEl && actionEl && banner) {
      scoreEl.textContent = t.lastScore.toFixed(2);
      confEl.textContent = t.lastConfidence.toFixed(2);

      const willJump = t.lastScore >= 1.0;
      if (willJump) {
        actionEl.innerHTML = `<span style="color:#4ade80;font-weight:700;">1 or over so Mario jumps JUMP</span>`;
        banner.style.borderColor = '#4ade80';
      } else {
        actionEl.innerHTML = `<span style="color:#94a3b8;">under 1 so Mario waits WAIT</span>`;
        banner.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      }
    }

    // Probability Bars
    const probs = t.lastResponse?.answers?.urgency?.probabilities || { '0': 0.79, '1': 0.19, '2': 0.02 };

    const fill0 = $('barFill0');
    const val0 = $('probVal0');
    const row0 = $('probRow0');
    if (fill0 && val0 && row0) {
      fill0.style.width = `${Math.round(probs['0'] * 100)}%`;
      val0.textContent = probs['0'].toFixed(2);
      row0.style.backgroundColor = probs['0'] >= Math.max(probs['1'], probs['2']) ? '#273259' : '#18203f';
    }

    const fill1 = $('barFill1');
    const val1 = $('probVal1');
    const row1 = $('probRow1');
    if (fill1 && val1 && row1) {
      fill1.style.width = `${Math.round(probs['1'] * 100)}%`;
      val1.textContent = probs['1'].toFixed(2);
      row1.style.backgroundColor = probs['1'] >= Math.max(probs['0'], probs['2']) ? '#273259' : '#18203f';
    }

    const fill2 = $('barFill2');
    const val2 = $('probVal2');
    const row2 = $('probRow2');
    if (fill2 && val2 && row2) {
      fill2.style.width = `${Math.round(probs['2'] * 100)}%`;
      val2.textContent = probs['2'].toFixed(2);
      row2.style.backgroundColor = probs['2'] >= Math.max(probs['0'], probs['1']) ? '#273259' : '#18203f';
    }

    // JSON Request
    const reqCode = $('requestJsonCode');
    if (reqCode && t.lastRequest) {
      let reqDisplay: Record<string, unknown> = { ...t.lastRequest };
      if (this.shortenLongText) {
        reqDisplay = {
          model: t.lastRequest.model,
          state: t.lastRequest.state,
          questions: {
            urgency: {
              type: 'score',
              instructions: 'How urgently does Mario need to jump to clear the incoming obstacle...',
              criteria: [
                'Not at all: Mario is running safely, obstacle is far ahead...',
                'Soon: The obstacle is approaching within 60-120px, prepare jump...',
                'Right now: The obstacle is directly in front (<55px), JUMP immediately!'
              ]
            }
          }
        };
      }
      reqCode.innerHTML = this.highlightJson(reqDisplay);
    }

    // JSON Response
    const resCode = $('responseJsonCode');
    if (resCode && t.lastResponse) {
      resCode.innerHTML = this.highlightJson(t.lastResponse);
    }
  }

  private highlightJson(obj: unknown): string {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, match => {
      let cls = 'json-num';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-str';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
  }
}
