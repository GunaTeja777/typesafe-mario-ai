export interface JevMarioState {
  mario_y: number;         // Height above ground (0 = grounded)
  mario_vy: number;        // Vertical velocity
  is_grounded: boolean;    // Is Mario running on the ground
  obstacle_type: 'goomba' | 'warp_pipe' | 'none';
  obstacle_dist: number;   // Horizontal distance to closest obstacle in px
  obstacle_height: number; // Height of obstacle in px
  next_obstacle: 'goomba' | 'warp_pipe' | 'none';
  next_dist: number;       // Distance to subsequent obstacle
  run_speed: number;       // Scrolling / run speed
}

export interface JevDecisionRequest {
  model: string;
  state: JevMarioState;
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
  public queryIntervalMs: number = 100; // asked every 0.1s of game time

  public telemetry: JevTelemetry;
  public onTelemetryUpdate?: (t: JevTelemetry) => void;

  constructor() {
    this.apiKey = localStorage.getItem('openrouter_api_key') || '';

    // Initial state so UI is never blank
    const initialState: JevMarioState = {
      mario_y: 0,
      mario_vy: 0,
      is_grounded: true,
      obstacle_type: 'goomba',
      obstacle_dist: 145,
      obstacle_height: 32,
      next_obstacle: 'warp_pipe',
      next_dist: 320,
      run_speed: 3.5
    };

    const initialReq = this.createRequestPayload(initialState);
    const initialRes: JevDecisionResponse = {
      model: `${this.model}-20260917`,
      answers: {
        urgency: {
          type: 'score',
          score: 0.23,
          legend: {
            '0': 'Not at all: Mario is running safely, obstacle is far away...',
            '1': 'Soon: Obstacle is within 60-120px, prepare jump...',
            '2': 'Right now: Obstacle is directly ahead (<55px), jump immediately!'
          },
          probabilities: {
            '0': 0.79,
            '1': 0.19,
            '2': 0.02
          },
          confidence: 0.66
        }
      },
      usage: {
        prompt_tokens: 128,
        completion_tokens: 34
      }
    };

    this.telemetry = {
      callCount: 1,
      lastStatus: 200,
      lastLatencyMs: 240,
      estimatedCost: 0.000031,
      lastScore: 0.23,
      lastConfidence: 0.66,
      lastDecision: 'WAIT',
      lastRequest: initialReq,
      lastResponse: initialRes,
      apiKeySet: !!this.apiKey,
      isSimulated: !this.apiKey
    };
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

  public createRequestPayload(state: JevMarioState): JevDecisionRequest {
    return {
      model: this.model,
      state,
      questions: {
        urgency: {
          type: 'score',
          instructions: 'How urgently does Mario need to jump to clear the incoming obstacle or stomp the enemy?',
          criteria: [
            'Not at all: Mario is running safely, the obstacle is far ahead (>120px) or Mario is airborne.',
            'Soon: The obstacle is approaching within 60-120px, prepare jump.',
            'Right now: The obstacle is directly in front (<55px), JUMP immediately to clear it!'
          ]
        }
      }
    };
  }

  public async decide(state: JevMarioState, now: number): Promise<{ shouldJump: boolean; score: number }> {
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
      this.totalCost += 0.000031;

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
        this.inFlight = false;
        return this.simulateJevDecision(payload.state, payload, resp.status);
      }
    } catch {
      this.inFlight = false;
      return this.simulateJevDecision(payload.state, payload, 500);
    }
  }

  private simulateJevDecision(
    state: JevMarioState,
    payload: JevDecisionRequest,
    statusOverride: number = 200
  ): { shouldJump: boolean; score: number } {
    this.callCount++;
    this.totalCost += 0.000031;

    let p0 = 0.85;
    let p1 = 0.12;
    let p2 = 0.03;

    if (!state.is_grounded) {
      // Mario is already in the air!
      p0 = 0.94;
      p1 = 0.05;
      p2 = 0.01;
    } else if (state.obstacle_dist <= 55 && state.obstacle_dist > 0) {
      // Immediate jump required!
      p2 = 0.91;
      p1 = 0.07;
      p0 = 0.02;
    } else if (state.obstacle_dist <= 115 && state.obstacle_dist > 55) {
      // Approaching obstacle
      p1 = 0.72;
      p2 = 0.20;
      p0 = 0.08;
    } else {
      // Clear path
      p0 = 0.86;
      p1 = 0.11;
      p2 = 0.03;
    }

    const noise = (Math.random() - 0.5) * 0.03;
    p0 = Math.max(0.01, Math.min(0.98, p0 + noise));
    p1 = Math.max(0.01, Math.min(0.98, p1 - noise * 0.6));
    p2 = Math.max(0.01, Math.min(0.98, 1 - p0 - p1));

    const sum = p0 + p1 + p2;
    p0 = +(p0 / sum).toFixed(2);
    p1 = +(p1 / sum).toFixed(2);
    p2 = +(1 - p0 - p1).toFixed(2);

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
            '0': 'Not at all: Mario is running safely, obstacle is far away...',
            '1': 'Soon: Obstacle is within 60-120px, prepare jump...',
            '2': 'Right now: Obstacle is directly ahead (<55px), jump immediately!'
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
        prompt_tokens: 128,
        completion_tokens: 34
      }
    };

    const latency = Math.floor(190 + Math.random() * 240);
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
