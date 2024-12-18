precision highp float;

uniform vec2 uResolution; // in pixel
uniform float uTime; // in s
uniform float uScrollVelocity; // - (scroll up) / + (scroll down)
uniform sampler2D uTexture; // texture
uniform vec2 uTextureSize; // size of texture
uniform vec2 uQuadSize; // size of texture element
uniform float uBorderRadius; // pixel value

in vec2 vUv; // 0 (left) 0 (bottom) - 1 (right) 1 (top)
in vec2 vUvCover;

#include '../noise.glsl';

out vec4 outColor;

void main() {
  // Skip all calculations if no effect is needed
  if (abs(uScrollVelocity) < 0.001) {
    outColor = texture(uTexture, vUvCover);
    return;
  }

  float effectStrength = uScrollVelocity * 0.1;
  
  // Early exit if effect is too small
  if (effectStrength < 0.001) {
    outColor = texture(uTexture, vUvCover);
    return;
  }

  float noise = snoise(gl_FragCoord.xy);
  float distortionAmount = noise * 0.01 * effectStrength;
  
  vec2 texCoords = vUvCover + vec2(distortionAmount);
  outColor = texture(uTexture, texCoords);
}
