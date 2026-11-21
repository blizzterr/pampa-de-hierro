import type { GraphicsSettings, HardwareProfile, HardwareTier, ServerConfig } from '../types/game';

export function detectHardwareProfile(): HardwareProfile {
  let gpuRenderer = 'WebGL Standard Adapter';
  let isSoftwareGl = false;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      isSoftwareGl = true;
      gpuRenderer = 'Software Fallback (Sin WebGL2)';
    } else {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      gpuRenderer = String(gl.getParameter(param) || 'WebGL GPU');
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuRenderer);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    isSoftwareGl = true;
    gpuRenderer = 'Software Renderer';
  }

  const cpuCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
  const navAny = navigator as Navigator & { deviceMemory?: number };
  const memoryGb = navAny.deviceMemory || 8;
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  let detectedTier: HardwareTier = 'MEDIO';
  if (isSoftwareGl || cpuCores <= 2 || memoryGb <= 2) {
    detectedTier = 'BAJO';
  } else if (
    cpuCores >= 8 &&
    memoryGb >= 8 &&
    !/Intel UHD|Intel HD|Mali-G5|Adreno 5/i.test(gpuRenderer)
  ) {
    detectedTier = 'ALTO';
  } else if (/RTX|RX 6|RX 7|Apple M|Radeon Pro|GTX 16|GTX 10|Arc/i.test(gpuRenderer)) {
    detectedTier = 'ALTO';
  }

  return {
    gpuRenderer,
    cpuCores,
    memoryGb,
    devicePixelRatio,
    isSoftwareGl,
    detectedTier,
  };
}

export function buildAutoGraphicsSettings(
  profile: HardwareProfile,
  serverConfig: Pick<ServerConfig, 'defaultFps' | 'minFps' | 'maxFps'>
): GraphicsSettings {
  const clampFps = (fps: number) =>
    Math.max(serverConfig.minFps, Math.min(serverConfig.maxFps, Math.round(fps)));

  if (profile.detectedTier === 'BAJO') {
    return {
      tier: 'BAJO',
      targetFps: clampFps(Math.min(serverConfig.defaultFps, 45)),
      pixelRatio: 1,
      shadowsEnabled: false,
      particleDensity: 0.45,
      antialiasing: false,
      autoDetected: true,
    };
  }

  if (profile.detectedTier === 'ALTO') {
    return {
      tier: 'ALTO',
      targetFps: clampFps(Math.max(serverConfig.defaultFps, 60)),
      pixelRatio: Math.min(profile.devicePixelRatio, 2),
      shadowsEnabled: !profile.isSoftwareGl,
      particleDensity: 1.0,
      antialiasing: !profile.isSoftwareGl,
      autoDetected: true,
    };
  }

  return {
    tier: 'MEDIO',
    targetFps: clampFps(serverConfig.defaultFps),
    pixelRatio: Math.min(profile.devicePixelRatio, 1.5),
    shadowsEnabled: !profile.isSoftwareGl,
    particleDensity: 0.75,
    antialiasing: !profile.isSoftwareGl,
    autoDetected: true,
  };
}
