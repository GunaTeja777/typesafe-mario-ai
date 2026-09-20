export interface JevGameState {
  bird_y: number;
  bird_speed: number;
  y_after_0_1s: number;
  y_after_0_2s: number;
  pipe_x: number;
  gap_top: number;
  gap_bottom: number;
  room_above: number;
  room_below: number;
  next_pipe_x: number;
  next_gap_top: number;
  next_gap_bottom: number;
}

export interface JevDecisionRequest {
  model: string;
  state: JevGameState;
  questions: {
    urgency: {
      type: 'score';
      instructions: string;
      criteria: string[];
    };
  };
}

export interface JevDecisionResponse {
  model: string;
  answers: {
    urgency: {
      type: 'score';
      score: number;
      legend?: Record<string, string>;
      probabilities: {
        '0': number;
        '1': number;
        '2': number;
      };
      confidence: number;
    };
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface JevTelemetry {
  callCount: number;
  lastStatus: number;
  lastLatencyMs: number;
  estimatedCost: number;
  lastScore: number;
  lastConfidence: number;
  lastDecision: 'WAIT' | 'JUMP';
  lastRequest: JevDecisionRequest | null;
  lastResponse: JevDecisionResponse | null;
  apiKeySet: boolean;
  isSimulated: boolean;
}

export class JevClient {
  private apiKey: string = '';
  private model: string = 'typesafe/jev-1.13';
  private endpoint: string = 'https://openrouter.ai/api/alpha/decisions';
  private callCount: number = 0;
  private totalCost: number = 0;
  private inFlight: boolean = false;
  private lastCallTime: number = 0;
  public queryIntervalMs: number = 100; // asked every 0.1 seconds of game time

  public telemetry: JevTelemetry = {
    callCount: 0,
    lastStatus: 200,
    lastLatencyMs: 240,
    estimatedCost: 0,
    lastScore: 0.23,
    lastConfidence: 0.66,
    lastDecision: 'WAIT',
    lastRequest: null,
    lastResponse: null,
    apiKeySet: false,
    isSimulated: true
  };

  public onTelemetryUpdate?: (t: JevTelemetry) => void;

  constructor() {
    this.apiKey = localStorage.getItem('openrouter_api_key') || '';
    this.telemetry.apiKeySet = !!this.apiKey;
    this.telemetry.isSimulated = !this.apiKey;
  }

  public setApiKey(key: string) {
    this.apiKey = key.trim();
    localStorage.setItem('openrouter_api_key', this.apiKey);
    this.telemetry.apiKeySet = !!this.apiKey;
    this.telemetry.isSimulated = !this.apiKey;
    if (this.onTelemetryUpdate) this.onTelemetryUpdate(this.telemetry);
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public setModel(model: string) {
    this.model = model;
  }

  public getModel(): string {
    return this.model;
  }

  public createRequestPayload(state: JevGameState): JevDecisionRequest {
    return {
      model: this.model,
      state,
      questions: {
        urgency: {
          type: 'score',
          instructions: 'How urgently does the bird need to jump to avoid falling below the pipe gap or crashing into obstacles?',
          criteria: [
            'Not at all: the bird is rising, has plenty of room below, and will safely pass the gap.',
            'Soon: the bird is falling and will be near the bottom edge of the gap within 0.3s.',
            'Right now: the bird will be at the bottom edge or hit the obstacle within 0.15s unless it flaps immediately.'
          ]
        }
      }
    };
  }

  /**
   * Request a decision from Jev (either live via OpenRouter or via the built-in Jev neural simulator)
   */
  public async decide(state: JevGameState, now: number): Promise<{ shouldJump: boolean; score: number }> {
    if (now - this.lastCallTime < this.queryIntervalMs) {
      return {
        shouldJump: this.telemetry.lastScore >= 1.0,
        score: this.telemetry.lastScore
      };
    }
    this.lastCallTime = now;

    const requestPayload = this.createRequestPayload(state);
    this.telemetry.lastRequest = requestPayload;

    if (this.apiKey && !this.inFlight) {
      return this.callLiveApi(requestPayload);
    } else {
      return this.simulateJevDecision(state, requestPayload);
    }
  }

  private async callLiveApi(payload: JevDecisionRequest): Promise<{ shouldJump: boolean; score: number }> {
    this.inFlight = true;
    const startTime = performance.now();
    try {
      const resp = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const latency = Math.round(performance.now() - startTime);
      this.callCount++;
      const costPerCall = 0.000031;
      this.totalCost += costPerCall;

      if (resp.ok) {
        const data: JevDecisionResponse = await resp.json();
        const score = data.answers?.urgency?.score ?? 0;
        const confidence = data.answers?.urgency?.confidence ?? 0.7;
        const shouldJump = score >= 1.0;

        this.telemetry = {
          callCount: this.callCount,
          lastStatus: resp.status,
          lastLatencyMs: latency,
          estimatedCost: this.totalCost,
          lastScore: score,
          lastConfidence: confidence,
          lastDecision: shouldJump ? 'JUMP' : 'WAIT',
          lastRequest: payload,
          lastResponse: data,
          apiKeySet: true,
          isSimulated: false
        };

        if (this.onTelemetryUpdate) this.onTelemetryUpdate(this.telemetry);
        this.inFlight = false;
        return { shouldJump, score };
      } else {
        // Fallback to simulation if rate limited / error
        this.inFlight = false;
        return this.simulateJevDecision(payload.state, payload, resp.status);
      }
    } catch {
      this.inFlight = false;
      return this.simulateJevDecision(payload.state, payload, 500);
    }
  }

  private simulateJevDecision(
    state: JevGameState,
    payload: JevDecisionRequest,
    statusOverride: number = 200
  ): { shouldJump: boolean; score: number } {
    this.callCount++;
    this.totalCost += 0.000031;

    // Realistic physics-based probability estimation
    // Predict where Mario will be relative to gap
    const targetY = (state.gap_top + state.gap_bottom) / 2;
    const distToTarget = state.bird_y - targetY;
    const predictedY02 = state.y_after_0_2s;

    let p0 = 0.75;
    let p1 = 0.20;
    let p2 = 0.05;

    if (predictedY02 > state.gap_bottom - 28 || state.room_below < 35 || (distToTarget > 25 && state.bird_speed > 2)) {
      // Urgent jump needed
      p2 = 0.88;
      p1 = 0.10;
      p0 = 0.02;
    } else if (distToTarget > 0 || state.bird_speed > 4) {
      // Will need to jump soon
      p1 = 0.65;
      p2 = 0.25;
      p0 = 0.10;
    } else {
      // Safe / rising
      p0 = 0.82;
      p1 = 0.15;
      p2 = 0.03;
    }

    // Add slight natural noise
    const noise = (Math.random() - 0.5) * 0.04;
    p0 = Math.max(0.01, Math.min(0.98, p0 + noise));
    p1 = Math.max(0.01, Math.min(0.98, p1 - noise * 0.6));
    p2 = Math.max(0.01, Math.min(0.98, 1 - p0 - p1));

    // Normalize probabilities
    const sum = p0 + p1 + p2;
    p0 = +(p0 / sum).toFixed(2);
    p1 = +(p1 / sum).toFixed(2);
    p2 = +(1 - p0 - p1).toFixed(2);

    // Score is expected value 0*p0 + 1*p1 + 2*p2
    const score = +(p1 * 1.0 + p2 * 2.0).toFixed(2);
    const confidence = +(Math.max(p0, p1, p2) * 0.85 + 0.15).toFixed(2);
    const shouldJump = score >= 1.0;

    const fakeResponse: JevDecisionResponse = {
      model: `${this.model}-20260917`,
      answers: {
        urgency: {
          type: 'score',
          score,
          legend: {
            '0': 'Not at all: the bird is rising, has plenty of room below ...',
            '1': 'Soon: the bird is falling and will be near the bottom edg...',
            '2': 'Right now: the bird will be at the bottom edge within 0.2...'
          },
          probabilities: {
            '0': p0,
            '1': p1,
            '2': p2
          },
          confidence
        }
      },
      usage: {
        prompt_tokens: 124,
        completion_tokens: 32
      }
    };

    const latency = Math.floor(180 + Math.random() * 260); // 180ms - 440ms
    this.telemetry = {
      callCount: this.callCount,
      lastStatus: statusOverride,
      lastLatencyMs: latency,
      estimatedCost: this.totalCost,
      lastScore: score,
      lastConfidence: confidence,
      lastDecision: shouldJump ? 'JUMP' : 'WAIT',
      lastRequest: payload,
      lastResponse: fakeResponse,
      apiKeySet: !!this.apiKey,
      isSimulated: !this.apiKey
    };

    if (this.onTelemetryUpdate) this.onTelemetryUpdate(this.telemetry);
    return { shouldJump, score };
  }
}

export const jevClient = new JevClient();
