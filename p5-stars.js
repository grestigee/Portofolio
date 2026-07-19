const vertShader = `
precision mediump float;
attribute vec2 aVertexPosition;
attribute vec2 aUvs;
uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;
varying vec2 vUvs;
void main() {
    vUvs = aUvs;
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
}
`;

const fragShader = `
precision mediump float;
#define PI 3.14159
#define starCount 4
uniform float iTime;
uniform float speed;
uniform vec3 col1;
uniform vec3 col2;
varying vec2 vUvs;
const float teta = 1.256637;
const float cosTeta = cos(teta);
const float sinTeta = sin(teta);
const float cosHalfTeta = cos(teta * .5);
const float sinHalfTeta = sin(teta * .5);

float star(vec2 p, float radius, float inset) {
    const float n = 5.0;
    mat2 rot1 = mat2(cosTeta, sinTeta, -sinTeta, cosTeta);
	vec2 p1 = vec2(0.0, radius);
	vec2 p2 = vec2(sinHalfTeta, cosHalfTeta)*radius*inset;
	float tetaP = PI + atan(-p.x, -p.y);
	tetaP = mod(tetaP + PI / n, 2.0 * PI);
	for(float i = 1.256637; i < 100.; i+= 1.256637) {
        if (i >= tetaP) break;
		p = rot1 *p;
    }
	p.x = abs(p.x);
	vec2 ba = p2-p1;
	vec2 pa = p - p1;
	float h =clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
	float d = length(pa-h*ba);
	d *= sign(dot(p - p1, -vec2(ba.y, -ba.x)));
	return d;
}

float starPattern(vec2 p) {
	float colSum = 0.;
	for (int i = 0; i < starCount * 2; i += 1) {
		float delta = float(i) - (2. * fract(iTime * speed) - 1.);
		float radius = 1. - delta / float(starCount * 2);
		float star = 1. - smoothstep(-.008, -.001, star(p, radius, .6));
		colSum = mod(float(i), 2.) == 0. ? colSum + star: colSum - star;
	}
	float innerStarDelta = 2. * fract(iTime * speed) - 1.;
	float innerStarRadius = innerStarDelta / float(starCount * 2);
	if (innerStarRadius > 0.) {
		float innerStar = 1. - smoothstep(-.008, -.001, star(p, innerStarRadius, .6));
		colSum += innerStar;
	}
	return colSum;
}

void main() {
	vec2 uv = vUvs * 2. - 1.;
	uv.y *= -1.;
	float starCol = starPattern(uv);
	float alphaCutout = star(uv, 1., .6);
	vec3 outputCol = mix(col1, col2, starCol);
    float alpha = 1. - smoothstep(-.008, -.001, alphaCutout);
	gl_FragColor = vec4(outputCol , alpha);
}
`;

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return [
        parseInt(hex.substring(0, 2), 16) / 255,
        parseInt(hex.substring(2, 4), 16) / 255,
        parseInt(hex.substring(4, 6), 16) / 255
    ];
}

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("pixi-canvas");
    if (!canvas) return;

    // Initialize Pixi Application
    const app = new PIXI.Application({
        view: canvas,
        resizeTo: window,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        backgroundAlpha: 0, // Transparent so background color shows through
    });

    // Create a simple Quad Geometry for the shader to run on
    const geometry = new PIXI.Geometry()
        .addAttribute('aVertexPosition', [-1, -1, 1, -1, 1, 1, -1, 1], 2)
        .addAttribute('aUvs', [0, 0, 1, 0, 1, 1, 0, 1], 2)
        .addIndex([0, 1, 2, 0, 2, 3]);

    const materials = [];
    const materialVariantCount = 8;
    
    // Create multiple materials with different speeds/colors
    for (let i = 0; i < materialVariantCount; i++) {
        // Red and Black stars only
        const isRed = i % 2 === 0;
        const color1 = isRed ? hexToRgb('#e60012') : hexToRgb('#000000');
        const color2 = isRed ? hexToRgb('#7a0009') : hexToRgb('#1a1a1a'); // darker red or dark grey for the core
        const speed = i < materialVariantCount / 2 ? 0.25 : -0.25;
        const offset = Math.random() * 100;

        const uniforms = {
            iTime: offset,
            speed: speed,
            col1: color1,
            col2: color2,
        };

        const shader = PIXI.Shader.from(vertShader, fragShader, uniforms);
        materials.push(shader);

        app.ticker.add((delta) => {
            shader.uniforms.iTime += delta / 60;
        });
    }

    // Determine how many stars based on screen size
    const minScale = 150;
    const maxScale = 250;
    const count = window.innerWidth < 768 ? 30 : 60;

    // Spawn stars
    for (let i = 0; i < count; i++) {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const rotation = Math.random() * Math.PI * 2;
        const scale = (Math.random() * (maxScale - minScale) + minScale);

        const material = materials[Math.floor(Math.random() * materials.length)];
        const starMesh = new PIXI.Mesh(geometry, material);
        
        starMesh.position.set(x, y);
        starMesh.rotation = rotation;
        starMesh.scale.set(scale);
        
        app.stage.addChild(starMesh);
    }
});
