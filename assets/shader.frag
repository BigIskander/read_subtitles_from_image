uniform sampler2D tDiffuse;
uniform vec3 filterColor;
uniform bool applyFilter;

varying vec2 vUv;

bool closeEnough(vec3 color, vec3 colorF) {
	const float margin = 0.15;
	if(
		colorF.r - margin <= color.r && color.r <= colorF.r + margin &&
		colorF.g - margin <= color.g && color.g <= colorF.g + margin &&
		colorF.b - margin <= color.b && color.b <= colorF.b + margin
	) return true;
	return false;
}

void main() {
	if(applyFilter) {
		if(closeEnough(texture2D(tDiffuse, vUv).xyz, filterColor))
			gl_FragColor = vec4(vec3(0.0), 1.0);
		else
			gl_FragColor = vec4(vec3(1.0), 1.0);
	} else {
		gl_FragColor = vec4(texture2D(tDiffuse, vUv).xyz, 1.0);
	}
}