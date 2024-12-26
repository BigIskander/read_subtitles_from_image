varying vec2 textureUV;

void main() {
    textureUV = uv;
    gl_Position = vec4(position, 1.0);
}