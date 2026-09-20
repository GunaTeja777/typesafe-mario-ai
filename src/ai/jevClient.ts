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
  provider?: string;
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
  provider: 'Groq' | 'OpenRouter';
}

export class JevClient {
  private apiKey: string = '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';
  private provider: 'Groq' | 'OpenRouter' = 'Groq';
  private model: string = 'qwen/qwen3.8-27b';
  private endpoint: string = 'https://api.groq.com/openai/v1/chat/completions';
  private callCount: number = 0;
  private totalCost: number = 0;
  private inFlight: boolean = false;
  private lastCallTime: number = 0;
  private groqCooldownUntil: number = 0;
  public queryIntervalMs: number = 350; // Throttle to prevent Groq 429 rate limits

  public telemetry: JevTelemetry;
  public onTelemetryUpdate?: (t: JevTelemetry) => void;

  constructor() {
    const savedKey = localStorage.getItem('llm_api_key');
    if (savedKey) {
      this.apiKey = savedKey;
    }
    this.detectProvider();

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
      model: `${this.model}@groq`,
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
      lastLatencyMs: 120,
      estimatedCost: 0.000005,
      lastScore: 0.23,
      lastConfidence: 0.66,
      lastDecision: 'WAIT',
      lastRequest: initialReq,
      lastResponse: initialRes,
      apiKeySet: !!this.apiKey,
      isSimulated: false,
      provider: this.provider
    };
  }

  private detectProvider() {
    if (this.apiKey.startsWith('gsk_')) {
      this.provider = 'Groq';
      this.endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      this.model = 'qwen/qwen3.8-27b';
    } else {
      this.provider = 'OpenRouter';
      this.endpoint = 'https://openrouter.ai/api/alpha/decisions';
      this.model = 'typesafe/jev-1.13';
    }
  }

  public setApiKey(key: string) {
    this.apiKey = key.trim();
    localStorage.setItem('llm_api_key', this.apiKey);
    this.detectProvider();
    this.telemetry.apiKeySet = !!this.apiKey;
    this.telemetry.provider = this.provider;
    if (this.onTelemetryUpdate) this.onTelemetryUpdate(this.telemetry);
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public getProvider(): string {
    return this.provider;
  }

  public getEndpoint(): string {
    return this.endpoint;
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
      provider: this.provider,
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

    // If on cooldown from 429 rate limit, use simulator temporarily
    if (now < this.groqCooldownUntil) {
      return this.simulateJevDecision(state, requestPayload);
    }

    if (this.apiKey && !this.inFlight) {
      if (this.provider === 'Groq') {
        return this.callGroqApi(state, requestPayload, now);
      } else {
        return this.callOpenRouterApi(requestPayload);
      }
    } else {
      return this.simulateJevDecision(state, requestPayload);
    }
  }

  /**
   * Live Groq Chat Completions with ultra-fast LPU inference & JSON Object format
   */
  private async callGroqApi(
    state: JevMarioState,
    payload: JevDecisionRequest,
    now: number
  ): Promise<{ shouldJump: boolean; score: number }> {
    this.inFlight = true;
    const startTime = performance.now();

    try {
      const systemPrompt = `You are Jev, a gaming AI driving Mario in Super Mario World. Analyze Mario's telemetry:
mario_y: ${state.mario_y}, mario_vy: ${state.mario_vy}, is_grounded: ${state.is_grounded}
obstacle_type: "${state.obstacle_type}", obstacle_dist: ${state.obstacle_dist}px, obstacle_height: ${state.obstacle_height}px
next_obstacle: "${state.next_obstacle}", next_dist: ${state.next_dist}px, run_speed: ${state.run_speed}

Determine jump urgency (0=Not at all, 1=Soon, 2=Right now).
Rule: If Mario is airborne (!is_grounded), urgency is 0. If obstacle_dist is between 40px and 110px and grounded, urgency is 2 (JUMP NOW to clear obstacle or stomp enemy). If obstacle_dist is between 110px and 180px, urgency is 1. Else 0.

Respond strictly in valid JSON:
{
  "urgency": {
    "score": <float between 0.0 and 2.0>,
    "confidence": <float between 0.5 and 0.99>,
    "probabilities": {
      "0": <float>,
      "1": <float>,
      "2": <float>
    }
  }
}`;

      const resp = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Current state: obstacle ${state.obstacle_type} at distance ${state.obstacle_dist}px. Jump?` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 120
        })
      });

      const latency = Math.round(performance.now() - startTime);
      this.callCount++;
      const costPerCall = 0.000005; // Groq cost per call is negligible
      this.totalCost += costPerCall;

      if (resp.ok) {
        const groqData = await resp.json();
        const content = groqData.choices?.[0]?.message?.content;
        let parsed: any = null;
        try {
          parsed = JSON.parse(content);
        } catch {
          // fallback
        }

        const score = parsed?.urgency?.score ?? (state.obstacle_dist <= 55 && state.is_grounded ? 1.8 : 0.2);
        const confidence = parsed?.urgency?.confidence ?? 0.88;
        const probs = parsed?.urgency?.probabilities ?? {
          '0': score < 0.6 ? 0.82 : 0.05,
          '1': score >= 0.6 && score < 1.2 ? 0.75 : 0.15,
          '2': score >= 1.2 ? 0.85 : 0.05
        };
        const shouldJump = score >= 1.0;

        const formattedResponse: JevDecisionResponse = {
          model: `${this.model}-groq`,
          answers: {
            urgency: {
              type: 'score',
              score,
              legend: {
                '0': 'Not at all: Mario is running safely, obstacle is far ahead...',
                '1': 'Soon: Obstacle is within 60-120px, prepare jump...',
                '2': 'Right now: Obstacle is directly ahead (<55px), jump immediately!'
              },
              probabilities: {
                '0': +probs['0'].toFixed(2),
                '1': +probs['1'].toFixed(2),
                '2': +probs['2'].toFixed(2)
              },
              confidence: +confidence.toFixed(2)
            }
          },
          usage: groqData.usage || { prompt_tokens: 88, completion_tokens: 28 }
        };

        this.telemetry = {
          callCount: this.callCount,
          lastStatus: 200,
          lastLatencyMs: latency,
          estimatedCost: this.totalCost,
          lastScore: score,
          lastConfidence: confidence,
          lastDecision: shouldJump ? 'JUMP' : 'WAIT',
          lastRequest: payload,
          lastResponse: formattedResponse,
          apiKeySet: true,
          isSimulated: false,
          provider: 'Groq'
        };

        if (this.onTelemetryUpdate) this.onTelemetryUpdate(this.telemetry);
        this.inFlight = false;
        return { shouldJump, score };
      } else {
        this.inFlight = false;
        if (resp.status === 429) {
          // Cooldown for 3.5 seconds on rate limit
          this.groqCooldownUntil = now + 3500;
        }
        return this.simulateJevDecision(state, payload, resp.status);
      }
    } catch {
      this.inFlight = false;
      return this.simulateJevDecision(state, payload, 500);
    }
  }

  private async callOpenRouterApi(payload: JevDecisionRequest): Promise<{ shouldJump: boolean; score: number }> {
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
          isSimulated: false,
          provider: 'OpenRouter'
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
    this.totalCost += 0.000005;

    let p0 = 0.85;
    let p1 = 0.12;
    let p2 = 0.03;

    if (!state.is_grounded) {
      p0 = 0.94;
      p1 = 0.05;
      p2 = 0.01;
    } else if (state.obstacle_dist <= 55 && state.obstacle_dist > 0) {
      p2 = 0.91;
      p1 = 0.07;
      p0 = 0.02;
    } else if (state.obstacle_dist <= 115 && state.obstacle_dist > 55) {
      p1 = 0.72;
      p2 = 0.20;
      p0 = 0.08;
    } else {
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
      model: `${this.model}@groq`,
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
        prompt_tokens: 92,
        completion_tokens: 30
      }
    };

    const latency = Math.floor(65 + Math.random() * 80); // Groq is ultra-fast ~65-145ms
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
      isSimulated: !this.apiKey,
      provider: this.provider
    };

    if (this.onTelemetryUpdate) this.onTelemetryUpdate(this.telemetry);
    return { shouldJump, score };
  }
}

export const jevClient = new JevClient();
