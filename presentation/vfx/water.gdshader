shader_type spatial;
render_mode cull_disabled, depth_draw_opaque;
uniform vec4 deep_color : source_color = vec4(0.075,0.30,0.34,0.84);
uniform vec4 light_color : source_color = vec4(0.40,0.69,0.67,0.90);
uniform vec2 scroll_speed = vec2(0.035,0.013);
uniform float ripple_scale = 24.0;
void fragment() {
    vec2 p = UV + TIME * scroll_speed;
    float wave = sin(p.x*ripple_scale + sin(p.y*18.0))*sin(p.y*32.0 + TIME*0.65);
    vec2 q = (UV-0.5)*2.0;
    float shore = 1.0-smoothstep(0.82,1.0,length(q));
    ALBEDO = mix(deep_color.rgb, light_color.rgb, 0.25+wave*0.12);
    ALPHA = deep_color.a*shore;
    ROUGHNESS = 0.22;
    METALLIC = 0.16;
    NORMAL = normalize(NORMAL + vec3(wave*0.06,0.0,cos(p.x*30.0)*0.06));
    SPECULAR = 0.7;
}
