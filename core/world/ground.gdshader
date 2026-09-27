shader_type spatial;
uniform sampler2D ground_texture : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec2 repetitions = vec2(4.0);
uniform float saturation = 0.56;
uniform vec4 tint : source_color = vec4(0.78,0.80,0.68,1.0);
void fragment() {
    vec3 c = texture(ground_texture,UV*repetitions).rgb;
    float luma = dot(c,vec3(0.2126,0.7152,0.0722));
    ALBEDO = mix(vec3(luma),c,saturation)*tint.rgb;
    ROUGHNESS = 0.95;
}
