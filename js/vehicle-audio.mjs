export const DEFAULT_VEHICLE_AUDIO_CONFIG = Object.freeze({
  idleRPM: 900,
  maxRPM: 7200,
  engineVolume: .38,
  engineTone: .56,
  rpmResponse: 5.4,
  tireScreechSensitivity: .58,
  tireScreechVolume: .28
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const smoothstep = (edge0, edge1, value) => {
  const amount = clamp((value - edge0) / Math.max(.0001, edge1 - edge0), 0, 1);
  return amount * amount * (3 - 2 * amount);
};

export class VehicleAudioManager {
  constructor({ getAudioBus, config = {} } = {}) {
    this.getAudioBus = getAudioBus;
    this.config = { ...DEFAULT_VEHICLE_AUDIO_CONFIG };
    this.configure(config);
    this.context = null;
    this.destination = null;
    this.nodes = null;
    this.sources = [];
    this.active = false;
    this.destroyed = false;
    this.currentRPM = this.config.idleRPM;
    this.targetRPM = this.config.idleRPM;
    this.gear = 1;
    this.shiftTime = 0;
    this.updateTime = 0;
    this.nodeBuilds = 0;
    this.lastMetrics = { rpm: this.currentRPM, gear: 1, tireIntensity: 0, throttle: 0 };
  }

  configure(options = {}) {
    const next = { ...this.config, ...options };
    next.idleRPM = clamp(Number(next.idleRPM) || DEFAULT_VEHICLE_AUDIO_CONFIG.idleRPM, 600, 1800);
    next.maxRPM = clamp(Number(next.maxRPM) || DEFAULT_VEHICLE_AUDIO_CONFIG.maxRPM, next.idleRPM + 2500, 9500);
    next.engineVolume = clamp(Number(next.engineVolume), 0, 1);
    next.engineTone = clamp(Number(next.engineTone), 0, 1);
    next.rpmResponse = clamp(Number(next.rpmResponse), 1, 12);
    next.tireScreechSensitivity = clamp(Number(next.tireScreechSensitivity), 0, 1);
    next.tireScreechVolume = clamp(Number(next.tireScreechVolume), 0, 1);
    this.config = next;
    this.currentRPM = clamp(this.currentRPM || next.idleRPM, next.idleRPM, next.maxRPM);
    return { ...this.config };
  }

  createNoiseBuffer(context) {
    const length = Math.ceil(context.sampleRate * .75);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      brown = clamp(brown * .965 + white * .11, -1, 1);
      data[index] = white * .58 + brown * .42;
    }
    return buffer;
  }

  ensureNodes() {
    if (this.nodes || this.destroyed) return Boolean(this.nodes);
    const bus = this.getAudioBus?.();
    const context = bus?.context;
    const destination = bus?.destination;
    if (!context || !destination) return false;

    this.context = context;
    this.destination = destination;
    const lifecycleGain = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const engineOutput = context.createGain();
    const engineFilter = context.createBiquadFilter();
    const crankGain = context.createGain();
    const pulseGain = context.createGain();
    const harmonicGain = context.createGain();
    const intakeFilter = context.createBiquadFilter();
    const intakeGain = context.createGain();
    const tireHighpass = context.createBiquadFilter();
    const tireFilter = context.createBiquadFilter();
    const tireGain = context.createGain();

    lifecycleGain.gain.value = .0001;
    compressor.threshold.value = -15;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = .004;
    compressor.release.value = .16;
    engineOutput.gain.value = this.config.engineVolume;
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 680;
    engineFilter.Q.value = .72;
    crankGain.gain.value = .18;
    pulseGain.gain.value = .13;
    harmonicGain.gain.value = .035;
    intakeFilter.type = 'bandpass';
    intakeFilter.frequency.value = 520;
    intakeFilter.Q.value = .68;
    intakeGain.gain.value = .018;
    tireHighpass.type = 'highpass';
    tireHighpass.frequency.value = 420;
    tireHighpass.Q.value = .45;
    tireFilter.type = 'bandpass';
    tireFilter.frequency.value = 1250;
    tireFilter.Q.value = .85;
    tireGain.gain.value = .0001;

    engineFilter.connect(engineOutput).connect(compressor);
    tireGain.connect(compressor);
    compressor.connect(lifecycleGain).connect(destination);

    const crank = context.createOscillator();
    crank.type = 'triangle';
    crank.connect(crankGain).connect(engineFilter);
    const pulse = context.createOscillator();
    pulse.type = 'sawtooth';
    pulse.connect(pulseGain).connect(engineFilter);
    const harmonic = context.createOscillator();
    harmonic.type = 'triangle';
    harmonic.connect(harmonicGain).connect(engineFilter);

    const noiseBuffer = this.createNoiseBuffer(context);
    const intakeNoise = context.createBufferSource();
    intakeNoise.buffer = noiseBuffer;
    intakeNoise.loop = true;
    intakeNoise.connect(intakeFilter).connect(intakeGain).connect(engineFilter);
    const tireNoise = context.createBufferSource();
    tireNoise.buffer = noiseBuffer;
    tireNoise.loop = true;
    tireNoise.connect(tireHighpass).connect(tireFilter).connect(tireGain);

    const variation = context.createOscillator();
    const variationDepth = context.createGain();
    variation.type = 'sine';
    variation.frequency.value = .73;
    variationDepth.gain.value = 7;
    variation.connect(variationDepth);
    variationDepth.connect(crank.detune);
    variationDepth.connect(pulse.detune);
    variationDepth.connect(harmonic.detune);

    const pulseVariation = context.createOscillator();
    const pulseVariationDepth = context.createGain();
    pulseVariation.type = 'sine';
    pulseVariation.frequency.value = 1.31;
    pulseVariationDepth.gain.value = .012;
    pulseVariation.connect(pulseVariationDepth).connect(pulseGain.gain);

    const start = context.currentTime;
    [crank, pulse, harmonic, intakeNoise, tireNoise, variation, pulseVariation].forEach(source => source.start(start));
    this.sources = [crank, pulse, harmonic, intakeNoise, tireNoise, variation, pulseVariation];
    this.nodes = {
      lifecycleGain, compressor, engineOutput, engineFilter,
      crank, crankGain, pulse, pulseGain, harmonic, harmonicGain,
      intakeFilter, intakeGain, tireHighpass, tireFilter, tireGain
    };
    this.nodeBuilds += 1;
    this.applyEngineParameters(this.currentRPM, 0, 0, .01);
    return true;
  }

  automate(parameter, value, timeConstant = .045) {
    if (!this.context || !parameter) return;
    const now = this.context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setTargetAtTime(Math.max(.0001, value), now, Math.max(.008, timeConstant));
  }

  start() {
    if (!this.ensureNodes()) return false;
    this.active = true;
    this.automate(this.nodes.lifecycleGain.gain, 1, .055);
    return true;
  }

  pause(fade = .14) {
    if (!this.nodes) return;
    this.active = false;
    this.automate(this.nodes.tireGain.gain, 0, .035);
    this.automate(this.nodes.lifecycleGain.gain, 0, Math.max(.025, fade / 3));
  }

  stop(fade = .18) {
    this.pause(fade);
    this.targetRPM = this.config.idleRPM;
    this.shiftTime = 0;
  }

  resume() { return this.start(); }

  reset() {
    this.currentRPM = this.config.idleRPM;
    this.targetRPM = this.config.idleRPM;
    this.gear = 1;
    this.shiftTime = 0;
    this.updateTime = 0;
    if (this.nodes) {
      this.applyEngineParameters(this.currentRPM, 0, 0, .025);
      this.automate(this.nodes.tireGain.gain, 0, .025);
    }
  }

  selectGear(speed, maxSpeed) {
    const points = [.18, .35, .55, .77].map(point => point * maxSpeed);
    let nextGear = this.gear;
    while (nextGear < 5 && speed > points[nextGear - 1] + 5) nextGear += 1;
    while (nextGear > 1 && speed < points[nextGear - 2] - 14) nextGear -= 1;
    if (nextGear !== this.gear) {
      if (nextGear > this.gear) this.shiftTime = .2;
      this.gear = nextGear;
    }
  }

  applyEngineParameters(rpm, throttle, accelerationLoad, response = .045) {
    if (!this.nodes) return;
    const { idleRPM, maxRPM, engineVolume, engineTone } = this.config;
    const rpmAmount = clamp((rpm - idleRPM) / Math.max(1, maxRPM - idleRPM), 0, 1);
    const firingFrequency = rpm / 30;
    const toneScale = lerp(.72, 1.32, engineTone);

    this.automate(this.nodes.crank.frequency, firingFrequency * .5, response);
    this.automate(this.nodes.pulse.frequency, firingFrequency, response);
    this.automate(this.nodes.harmonic.frequency, firingFrequency * 2.02, response);
    this.automate(this.nodes.crankGain.gain, .19 - rpmAmount * .055, response);
    this.automate(this.nodes.pulseGain.gain, .105 + rpmAmount * .075 + throttle * .025, response);
    this.automate(this.nodes.harmonicGain.gain, .018 + rpmAmount * .09 + throttle * .035, response);
    this.automate(this.nodes.intakeGain.gain, .012 + throttle * .075 + accelerationLoad * .025, response);
    this.automate(this.nodes.intakeFilter.frequency, (430 + rpmAmount * 1450) * toneScale, response);
    this.automate(this.nodes.engineFilter.frequency, (520 + rpmAmount * 1900 + throttle * 420) * toneScale, response);
    this.automate(this.nodes.engineOutput.gain, engineVolume * (.72 + rpmAmount * .22 + throttle * .14), response);
  }

  update(input = {}, dt = 1 / 60) {
    if (!this.active || !this.nodes || this.destroyed) return this.lastMetrics;
    this.updateTime += clamp(dt, 0, .1);
    if (this.updateTime < 1 / 30) return this.lastMetrics;
    const step = Math.min(this.updateTime, .1);
    this.updateTime = 0;

    const speed = Math.max(0, Math.abs(Number(input.speed) || 0));
    const maxSpeed = Math.max(1, Number(input.maxSpeed) || 405);
    const throttle = clamp(Math.abs(Number(input.throttle) || 0), 0, 1);
    const steering = clamp(Math.abs(Number(input.steering) || 0), 0, 1);
    const lateralVelocity = Math.abs(Number(input.lateralVelocity) || 0);
    const acceleration = Number(input.acceleration) || 0;
    const accelerationLoad = clamp(Math.max(0, acceleration) / 350, 0, 1);
    const speedAmount = clamp(speed / maxSpeed, 0, 1);
    this.selectGear(speed, maxSpeed);

    const lower = [0, 0, .18, .35, .55, .77][this.gear] * maxSpeed;
    const upper = [0, .18, .35, .55, .77, 1.04][this.gear] * maxSpeed;
    const gearProgress = clamp((speed - lower) / Math.max(1, upper - lower), 0, 1);
    const rpmRange = this.config.maxRPM - this.config.idleRPM;
    let targetRPM = this.config.idleRPM + rpmRange * (speedAmount * .62 + gearProgress * .16 + throttle * .16 + accelerationLoad * .05);
    if (input.reversing) targetRPM = Math.min(targetRPM, this.config.idleRPM + rpmRange * .48);
    if (this.shiftTime > 0) {
      const shiftProgress = 1 - this.shiftTime / .2;
      targetRPM -= Math.sin(clamp(shiftProgress, 0, 1) * Math.PI) * rpmRange * .18;
      this.shiftTime = Math.max(0, this.shiftTime - step);
    }
    this.targetRPM = clamp(targetRPM, this.config.idleRPM, this.config.maxRPM);
    const response = this.config.rpmResponse * (this.targetRPM >= this.currentRPM ? 1 : .62);
    this.currentRPM += (this.targetRPM - this.currentRPM) * (1 - Math.exp(-response * step));
    this.applyEngineParameters(this.currentRPM, throttle, accelerationLoad);

    const sensitivity = this.config.tireScreechSensitivity;
    const slipRatio = lateralVelocity / Math.max(26, speed);
    const slipThreshold = lerp(.26, .075, sensitivity);
    const sliding = clamp((slipRatio - slipThreshold) / Math.max(.18, .62 - slipThreshold), 0, 1);
    const speedGate = smoothstep(52, 115, speed);
    const handbrake = input.handbrake ? smoothstep(62, 165, speed) * .82 : 0;
    const aggressiveCorner = smoothstep(95, 235, speed) * smoothstep(.62, 1, steering) * smoothstep(.045, .18, slipRatio) * .38;
    const tractionLoss = clamp(Number(input.tractionLoss) || 0, 0, 1);
    const driftBoost = input.drifting ? .22 + tractionLoss * .42 : 0;
    const tireIntensity = clamp(Math.max(sliding, handbrake, aggressiveCorner, driftBoost) * speedGate, 0, 1);
    const tireLevel = Math.pow(tireIntensity, 1.35) * this.config.tireScreechVolume;
    this.automate(this.nodes.tireGain.gain, tireLevel, tireIntensity > this.lastMetrics.tireIntensity ? .025 : .07);
    this.automate(this.nodes.tireFilter.frequency, 1050 + tireIntensity * 1850 + speedAmount * 380, .055);
    this.automate(this.nodes.tireFilter.Q, .72 + tireIntensity * .78, .055);

    this.lastMetrics = {
      rpm: this.currentRPM,
      targetRPM: this.targetRPM,
      gear: this.gear,
      shifting: this.shiftTime > 0,
      tireIntensity,
      throttle,
      speed,
      acceleration,
      slipRatio,
      active: this.active,
      nodeBuilds: this.nodeBuilds
    };
    return this.lastMetrics;
  }

  connectExternalLayer(audioNode, kind = 'engine') {
    if (!this.ensureNodes() || !audioNode?.connect) return () => {};
    const destination = kind === 'tire' ? this.nodes.tireGain : this.nodes.engineFilter;
    audioNode.connect(destination);
    return () => { try { audioNode.disconnect(destination); } catch (_) {} };
  }

  getState() {
    return {
      ...this.lastMetrics,
      active: this.active,
      started: Boolean(this.nodes),
      nodeBuilds: this.nodeBuilds,
      config: { ...this.config }
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.stop(.06);
    this.destroyed = true;
    if (this.context) {
      const stopAt = this.context.currentTime + .09;
      this.sources.forEach(source => { try { source.stop(stopAt); } catch (_) {} });
    }
    this.sources = [];
    this.nodes = null;
    this.context = null;
    this.destination = null;
  }
}
