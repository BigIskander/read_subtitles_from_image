uniform sampler2D textureImage;

varying vec2 textureUV;

void main() {
	gl_FragColor = vec4(texture2D(textureImage, textureUV).xyz, 1.0);
}