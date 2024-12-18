float PI = 3.141592653589793;

uniform vec2 uResolution; // in pixel
uniform float uTime; // in s
uniform float uScrollVelocity; // - (scroll up) / + (scroll down)
uniform sampler2D uTexture; // texture
uniform vec2 uTextureSize; // size of texture
uniform vec2 uQuadSize; // size of texture element
uniform float uBorderRadius; // pixel value

#include '../utils.glsl';

out vec2 vUv;  // 0 (left) 0 (bottom) - 1 (top) 1 (right)
out vec2 vUvCover;

float easeOutExpo(float x) {
    return x == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * x);
}

float easeOutCirc(float x) {
    return sqrt(1.0 - pow(x - 1.0, 2.0));
}

vec3 deformationCurve(vec3 position, vec2 uv) {
    float maxVelocity = 5.0;
    float velocity = min(abs(uScrollVelocity), maxVelocity);
    
    // Apply easing to the velocity
    float normalizedVelocity = velocity / maxVelocity;
    float easedVelocity = easeOutCirc(normalizedVelocity) * maxVelocity;
    
    // Create smooth wave pattern
    float wave = sin(uv.x * PI);
    float edgeFalloff = sin(uv.x * PI); // Smooth falloff at edges
    
    // Combine effects with increased base amplitude
    float baseAmplitude = 0.02;
    float finalOffset = wave * easedVelocity * sign(uScrollVelocity) * -baseAmplitude * edgeFalloff;
    
    position.y += finalOffset;
    return position;
}

void main() {
    vUv = uv;
    vUvCover = getCoverUvVert(uv, uTextureSize, uQuadSize);

    vec3 deformedPosition = deformationCurve(position, vUvCover);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(deformedPosition, 1.0);
}
