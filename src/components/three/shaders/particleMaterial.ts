import * as THREE from 'three'

export function createParticleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aScale;
      attribute float aIsTarget;   // 1.0 if this particle has a text-target position
      uniform float uConvergence;  // 0 = network, 1 = fully converged
      uniform float uSize;
      varying float vAlpha;
      varying vec3 vColor;

      void main() {
        // Color: #00D4FF (0,0.831,1) at convergence=0 → #FFFFFF at convergence=1
        // Outlier particles (aIsTarget=0) stay at dim #0066AA
        vec3 networkColor  = vec3(0.0, 0.831, 1.0);
        vec3 chargingColor = vec3(1.0, 1.0, 1.0);
        vec3 outlierColor  = vec3(0.0, 0.4, 0.67);

        float chargeT = clamp(uConvergence * 1.4, 0.0, 1.0);
        vec3  targetColor = mix(networkColor, chargingColor, chargeT);
        vColor = mix(outlierColor, targetColor, aIsTarget);

        // Fade out target particles as they crystallize (convergence > 0.85)
        float crystallizeFade = aIsTarget * clamp((uConvergence - 0.85) / 0.15, 0.0, 1.0);
        float baseAlpha = mix(0.6, 0.9, aIsTarget) * (1.0 - crystallizeFade);
        vAlpha = baseAlpha;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Size attenuation
        float sizeAtten = uSize * aScale * (300.0 / -mvPosition.z);
        gl_PointSize = clamp(sizeAtten, 1.0, 6.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying vec3 vColor;

      void main() {
        // Soft circle
        vec2  uv   = gl_PointCoord - 0.5;
        float dist = length(uv);
        if (dist > 0.5) discard;
        float edge  = 1.0 - smoothstep(0.3, 0.5, dist);
        gl_FragColor = vec4(vColor, vAlpha * edge);
      }
    `,
    uniforms: {
      uConvergence: { value: 0.0 },
      uSize:        { value: 1.0 },
    },
  })
}
