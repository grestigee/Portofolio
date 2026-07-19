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
    // PREMULTIPLY ALPHA TO FIX RED BOX GLITCH IN PIXIJS
	gl_FragColor = vec4(outputCol * alpha, alpha);
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

function createStarApp(canvasId, mode) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const isTextCanvas = mode === 'red-white';
    
    const app = new PIXI.Application({
        view: canvas,
        resizeTo: isTextCanvas ? canvas.parentElement : window,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        backgroundAlpha: isTextCanvas ? 1 : 0, 
        backgroundColor: isTextCanvas ? 0x000000 : 0x000000, 
    });

    const geometry = new PIXI.Geometry()
        .addAttribute('aVertexPosition', [-1, -1, 1, -1, 1, 1, -1, 1], 2)
        .addAttribute('aUvs', [0, 0, 1, 0, 1, 1, 0, 1], 2)
        .addIndex([0, 1, 2, 0, 2, 3]);

    const materials = [];
    const materialVariantCount = 8;
    
    for (let i = 0; i < materialVariantCount; i++) {
        const isRed = i % 2 === 0;
        let color1, color2;
        
        if (mode === 'red-black') {
            color1 = hexToRgb('#e60012');
            color2 = hexToRgb('#000000');
        } else {
            // mode === 'red-white'
            color1 = isRed ? hexToRgb('#e60012') : hexToRgb('#ffffff');
            color2 = isRed ? hexToRgb('#ffffff') : hexToRgb('#e60012');
        }

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

    const minScale = 150;
    const maxScale = 250;
    const count = window.innerWidth < 768 ? 30 : 60;

    for (let i = 0; i < count; i++) {
        const x = Math.random() * (isTextCanvas ? 3000 : window.innerWidth);
        const y = Math.random() * (isTextCanvas ? 500 : window.innerHeight);
        const rotation = Math.random() * Math.PI * 2;
        const scale = (Math.random() * (maxScale - minScale) + minScale);

        const material = materials[Math.floor(Math.random() * materials.length)];
        const starMesh = new PIXI.Mesh(geometry, material);
        
        // Fix for WebGL blending
        starMesh.blendMode = PIXI.BLEND_MODES.NORMAL;
        
        starMesh.position.set(x, y);
        starMesh.rotation = rotation;
        starMesh.scale.set(scale);
        
        app.stage.addChild(starMesh);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Canvas 1: Main Background (Red & Black)
    createStarApp("pixi-canvas", "red-black");
    
    // Canvas 2: Font Background (Red & White)
    createStarApp("pixi-text-canvas", "red-white");
});
