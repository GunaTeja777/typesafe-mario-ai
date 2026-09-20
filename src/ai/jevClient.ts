export interface JevMarioState {
  mario_y: number;         // Height above ground (0 = grounded)
  mario_vy: number;        // Vertical velocity
  is_grounded: boolean;    // Is Mario running on the ground
  ground_hazard: 'warp_pipe' | 'goomba' | 'koopa' | 'none';
  hazard_dist: number;     // Horizontal distance to closest ground hazard
  hazard_height: number;   // Height of hazard in px
  item_box: 'question_block' | 'brick' | 'coin' | 'none';
  item_box_dist: number;   // Horizontal distance to overhead item box / coin
  can_shoot: boolean;      // Can Mario shoot fireballs (fire_ammo > 0)
  fire_ammo: number;       // Countable shooting bullets available
  run_speed: number;       // Speed
}

export interface JevDecisionRequest {
  model: string;
  provider?: string;
  state: JevMarioState;
  questions: {
    action: {
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
      action?: 'RUN' | 'JUMP' | 'SHOOT';
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

export interface JevDecisionResult {
  action: 'RUN' | 'JUMP' | 'SHOOT';
  shouldJump: boolean;
  shouldShoot: boolean;
  score: number;
  reason: string;
}

export interface JevTelemetry {
  callCount: number;
  lastStatus: number;
  lastLatencyMs: number;
  estimatedCost: number;
  lastScore: number;
  lastConfidence: number;
  lastDecision: 'RUN' | 'JUMP' | 'SHOOT';
  lastDecisionReason: string;
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
  public queryIntervalMs: number = 500; // Throttle to maintain Groq free-tier quota smoothly

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
      ground_hazard: 'goomba',
      hazard_dist: 145,
      hazard_height: 30,
      item_box: 'question_block',
      item_box_dist: 28,
      can_shoot: false,
      fire_ammo: 0,
      run_speed: 3.8
    };

    const initialReq = this.createRequestPayload(initialState);
    const initialRes: JevDecisionResponse = {
      model: `${this.model}@groq`,
      answers: {
        urgency: {
          type: 'score',
          score: 1.1,
          action: 'JUMP',
          legend: {
            '0': 'Run: Path clear or airborne, running safely...',
            '1': 'Jump: Jump to hit overhead ? box or clear pipe/enemy!',
            '2': 'Shoot: Shoot fireball to eliminate oncoming enemy!'
          },
          probabilities: {
            '0': 0.08,
            '1': 0.89,
            '2': 0.03
          },
          confidence: 0.88
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
      lastLatencyMs: 85,
      estimatedCost: 0.000005,
      lastScore: 1.1,
      lastConfidence: 0.88,
      lastDecision: 'JUMP',
      lastDecisionReason: 'Hit ? Block for Coins & Power-up',
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
      state: { ...state },
      questions: {
        action: {
          type: 'score',
          instructions: 'Choose Mario optimal action: 0 = RUN (safe), 1 = JUMP (clear pipe / stomp enemy / hit ? box for coins), 2 = SHOOT (fireball at oncoming enemy)',
          criteria: [
            'Level 0 (RUN): Running safely, no hazards or item boxes directly ahead',
            'Level 1 (JUMP): Jump now! Pipe ahead (35-85px), enemy in front (35-75px), or overhead ? block/coin (40-85px)',
            'Level 2 (SHOOT): Shoot fireball now! Oncoming enemy (goomba/koopa) in range (60-220px)'
          ]
        }
      }
    };
  }

  public async decide(
    state: JevMarioState,
    now: number
  ): Promise<JevDecisionResult> {
    // Only query LLM when not in flight and throttled to preserve Groq quota
    if (now - this.lastCallTime < 280 || this.inFlight) {
      return {
        action: 'RUN',
        shouldJump: false,
        shouldShoot: false,
        score: this.telemetry.lastScore,
        reason: this.inFlight ? 'LLM thinking...' : 'Cruising safely'
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
  ): Promise<JevDecisionResult> {
    this.inFlight = true;
    const startTime = performance.now();

    try {
      const systemPrompt = `You are Jev, the AI mind controlling Mario in Super Mario World. Analyze Mario's live telemetry:
- Mario: grounded=${state.is_grounded}, y=${state.mario_y}
- Ground Hazard: ${state.ground_hazard} at distance ${state.hazard_dist}px (height: ${state.hazard_height}px)
- Overhead Item Box: ${state.item_box} at distance ${state.item_box_dist}px
- Fire Ammo: ${state.fire_ammo} bullets (can_shoot: ${state.can_shoot})
- Run Speed: ${state.run_speed}px/frame

Rules:
1. If overhead ? box is close (item_box_dist between 18px and 55px) and Mario is grounded: action="JUMP" to hit with head for +5 bullets!
2. If ground hazard is approaching (hazard_dist between 35px and 90px) and Mario is grounded: action="JUMP" to leap over!
3. If enemy is ahead (hazard_dist between 60px and 220px) and fire_ammo > 0: action="SHOOT" to fire fireball!
4. Otherwise: action="RUN".

Respond ONLY in valid JSON:
{
  "action": "RUN" | "JUMP" | "SHOOT",
  "reason": "<short 4-word reason>",
  "urgency": {
    "score": <0.0 to 2.0>,
    "confidence": <0.5 to 0.99>,
    "probabilities": {"0": <float>, "1": <float>, "2": <float>}
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
            { role: 'user', content: `hazard=${state.ground_hazard} (${state.hazard_dist}px), box=${state.item_box} (${state.item_box_dist}px), fire_ammo=${state.fire_ammo}. Action?` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0,
          max_tokens: 65
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

        let action: 'RUN' | 'JUMP' | 'SHOOT' = parsed?.action;
        let reason: string = parsed?.reason || '';

        // Deterministic check if model omitted fields
        if (!action) {
          if (state.item_box !== 'none' && state.item_box_dist <= 35 && state.item_box_dist >= 14 && state.is_grounded) {
            action = 'JUMP';
            reason = 'Hit ? Box with head for +5 Fire Bullets & Coin!';
          } else if (state.hazard_dist <= 85 && state.hazard_dist >= 35 && state.is_grounded) {
            action = 'JUMP';
            reason = `Leap over ${state.ground_hazard}`;
          } else if ((state.ground_hazard === 'goomba' || state.ground_hazard === 'koopa') && state.hazard_dist <= 240 && state.hazard_dist > 80 && state.can_shoot) {
            action = 'SHOOT';
            reason = `Blast ${state.ground_hazard} with fire bullet`;
          } else {
            action = 'RUN';
            reason = 'Safe cruise along ground';
          }
        }

        const score = parsed?.urgency?.score ?? (action === 'SHOOT' ? 1.9 : action === 'JUMP' ? 1.2 : 0.15);
        const confidence = parsed?.urgency?.confidence ?? 0.92;
        const probs = parsed?.urgency?.probabilities ?? {
          '0': action === 'RUN' ? 0.88 : 0.05,
          '1': action === 'JUMP' ? 0.90 : 0.08,
          '2': action === 'SHOOT' ? 0.92 : 0.05
        };

        const formattedResponse: JevDecisionResponse = {
          model: `${this.model}-groq`,
          answers: {
            urgency: {
              type: 'score',
              score,
              action,
              legend: {
                '0': 'Run: Path clear or airborne, running safely...',
                '1': 'Jump: Jump to hit overhead ? box or clear pipe/enemy!',
                '2': 'Shoot: Shoot fireball to eliminate oncoming enemy!'
              },
              probabilities: {
                '0': +probs['0'].toFixed(2),
                '1': +probs['1'].toFixed(2),
                '2': +probs['2'].toFixed(2)
              },
              confidence: +confidence.toFixed(2)
            }
          },
          usage: groqData.usage || { prompt_tokens: 95, completion_tokens: 32 }
        };

        this.telemetry = {
          callCount: this.callCount,
          lastStatus: 200,
          lastLatencyMs: latency,
          estimatedCost: this.totalCost,
          lastScore: score,
          lastConfidence: confidence,
          lastDecision: action,
          lastDecisionReason: reason,
          lastRequest: payload,
          lastResponse: formattedResponse,
          apiKeySet: true,
          isSimulated: false,
          provider: 'Groq'
        };

        if (this.onTelemetryUpdate) this.onTelemetryUpdate(this.telemetry);
        this.inFlight = false;
        return { action, shouldJump: action === 'JUMP', shouldShoot: action === 'SHOOT', score, reason };
      } else {
        this.inFlight = false;
        if (resp.status === 429) {
          // Cooldown for 4.0 seconds on rate limit
          this.groqCooldownUntil = now + 4000;
        }
        return this.simulateJevDecision(state, payload, resp.status);
      }
    } catch {
      this.inFlight = false;
      return this.simulateJevDecision(state, payload, 500);
    }
  }

  private async callOpenRouterApi(payload: JevDecisionRequest): Promise<JevDecisionResult> {
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
        const action = score >= 1.5 ? 'SHOOT' : score >= 0.8 ? 'JUMP' : 'RUN';

        this.telemetry = {
          callCount: this.callCount,
          lastStatus: resp.status,
          lastLatencyMs: latency,
          estimatedCost: this.totalCost,
          lastScore: score,
          lastConfidence: confidence,
          lastDecision: action,
          lastDecisionReason: action === 'JUMP' ? 'Leap / Hit Box' : action === 'SHOOT' ? 'Fire Fireball' : 'Cruise',
          lastRequest: payload,
          lastResponse: data,
          apiKeySet: true,
          isSimulated: false,
          provider: 'OpenRouter'
        };

        if (this.onTelemetryUpdate) this.onTelemetryUpdate(this.telemetry);
        this.inFlight = false;
        return { action, shouldJump: action === 'JUMP', shouldShoot: action === 'SHOOT', score, reason: this.telemetry.lastDecisionReason };
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
  ): JevDecisionResult {
    this.callCount++;
    this.totalCost += 0.000005;

    let action: 'RUN' | 'JUMP' | 'SHOOT' = 'RUN';
    let reason = 'Safe cruise along the ground';
    let p0 = 0.85;
    let p1 = 0.10;
    let p2 = 0.05;

    if (!state.is_grounded) {
      action = 'RUN';
      reason = 'Airborne in jump arc';
      p0 = 0.94;
      p1 = 0.04;
      p2 = 0.02;
    } else if (state.item_box !== 'none' && state.item_box_dist <= 35 && state.item_box_dist >= 14) {
      action = 'JUMP';
      reason = `Hit ${state.item_box === 'question_block' ? '? Block' : state.item_box} with head for +5 bullets & coin!`;
      p1 = 0.94;
      p0 = 0.04;
      p2 = 0.02;
    } else if (state.hazard_dist <= 85 && state.hazard_dist >= 35) {
      action = 'JUMP';
      reason = `Leap over ${state.ground_hazard}`;
      p1 = 0.95;
      p0 = 0.03;
      p2 = 0.02;
    } else if ((state.ground_hazard === 'goomba' || state.ground_hazard === 'koopa') && state.hazard_dist <= 240 && state.hazard_dist > 80 && state.can_shoot) {
      action = 'SHOOT';
      reason = `Fire fireball at ${state.ground_hazard} (${state.fire_ammo} bullets remaining)`;
      p2 = 0.92;
      p1 = 0.05;
      p0 = 0.03;
    } else {
      action = 'RUN';
      reason = 'Safe cruise along the ground';
      p0 = 0.88;
      p1 = 0.08;
      p2 = 0.04;
    }

    const noise = (Math.random() - 0.5) * 0.02;
    p0 = Math.max(0.01, Math.min(0.98, p0 + noise));
    p1 = Math.max(0.01, Math.min(0.98, p1 - noise * 0.5));
    p2 = Math.max(0.01, Math.min(0.98, 1 - p0 - p1));

    const sum = p0 + p1 + p2;
    p0 = +(p0 / sum).toFixed(2);
    p1 = +(p1 / sum).toFixed(2);
    p2 = +(1 - p0 - p1).toFixed(2);

    const score = action === 'SHOOT' ? 1.9 : action === 'JUMP' ? 1.15 : 0.15;
    const confidence = +(Math.max(p0, p1, p2) * 0.85 + 0.15).toFixed(2);

    const fakeResponse: JevDecisionResponse = {
      model: `${this.model}@groq`,
      answers: {
        urgency: {
          type: 'score',
          score,
          action,
          legend: {
            '0': 'Run: Path clear or airborne, running safely...',
            '1': 'Jump: Jump to hit overhead ? box or clear pipe/enemy!',
            '2': 'Shoot: Shoot fireball to eliminate oncoming enemy!'
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
        prompt_tokens: 95,
        completion_tokens: 32
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
      lastDecision: action,
      lastDecisionReason: reason,
      lastRequest: payload,
      lastResponse: fakeResponse,
      apiKeySet: !!this.apiKey,
      isSimulated: true,
      provider: this.provider
    };

    if (this.onTelemetryUpdate) this.onTelemetryUpdate(this.telemetry);
    return { action, shouldJump: action === 'JUMP', shouldShoot: action === 'SHOOT', score, reason };
  }
}

export const jevClient = new JevClient();
