uniform vec3 color;
uniform sampler2D tDiffuse;
uniform float opacity;

varying vec3 vColor;

void main() {
    gl_FragColor = vec4(color * vColor, 1.0) * texture2D(tDiffuse, gl_PointCoord);

    if (gl_FragColor.a < ALPHATEST) {
        discard;
    }

    gl_FragColor.a = gl_FragColor.a * opacity;
}