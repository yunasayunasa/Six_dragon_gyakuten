class_name LightingDirector
extends Node3D

@export var outdoor_day: LightingProfile
@export var indoor_warm: LightingProfile
@export var stage_event: LightingProfile
var environment: Environment
var sun: DirectionalLight3D
var local_light: OmniLight3D
var window_light: SpotLight3D
var dramatic: SpotLight3D
var current: LightingProfile
var blend: Tween

func _ready() -> void:
	var world := WorldEnvironment.new()
	environment = Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color(0.39,0.57,0.63)
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.fog_enabled = true
	environment.fog_light_color = Color(0.57,0.70,0.71)
	world.environment = environment
	add_child(world)
	sun = DirectionalLight3D.new()
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 45.0
	sun.light_angular_distance = 1.0
	add_child(sun)
	local_light = OmniLight3D.new()
	local_light.light_color = Color(1,0.57,0.25)
	local_light.omni_range = 9.0
	local_light.light_energy = 0.0
	add_child(local_light)
	window_light = SpotLight3D.new()
	window_light.light_color = Color(0.65,0.80,1)
	window_light.spot_range = 12.0
	window_light.spot_angle = 42.0
	window_light.light_energy = 0.0
	add_child(window_light)
	dramatic = SpotLight3D.new()
	dramatic.light_color = Color(1,0.86,0.5)
	dramatic.spot_range = 16.0
	dramatic.spot_angle = 30.0
	dramatic.light_energy = 0.0
	add_child(dramatic)

func aim_at(target: Node3D) -> void:
	dramatic.global_position = target.global_position+Vector3(-1,7,4)
	dramatic.look_at(target.global_position+Vector3(0,0.8,0))

func apply(profile: LightingProfile, immediate: bool = false) -> Tween:
	current = profile
	if is_instance_valid(blend):
		blend.kill()
	var seconds := 0.001 if immediate else profile.blend_seconds
	blend = create_tween().set_parallel(true).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	blend.tween_property(environment,"background_color",profile.fog_color,seconds)
	for pair in [[environment,"ambient_light_color",profile.ambient_color],[environment,"ambient_light_energy",profile.ambient_energy],[environment,"fog_density",profile.fog_density],[environment,"fog_light_color",profile.fog_color],[sun,"light_color",profile.sun_color],[sun,"light_energy",profile.sun_energy],[sun,"rotation_degrees",profile.sun_rotation],[local_light,"light_energy",profile.local_energy],[window_light,"light_energy",profile.window_energy],[dramatic,"light_energy",profile.dramatic_energy]]:
		blend.tween_property(pair[0],pair[1],pair[2],seconds)
	return blend

func highlight(target: Node3D, base: LightingProfile) -> void:
	aim_at(target)
	var event_profile := stage_event.duplicate() as LightingProfile
	event_profile.ambient_color = base.ambient_color
	event_profile.ambient_energy = base.ambient_energy*0.72
	event_profile.sun_energy = base.sun_energy*0.58
	event_profile.local_energy = base.local_energy*0.5
	event_profile.window_energy = base.window_energy*0.5
	event_profile.fog_color = base.fog_color
	event_profile.fog_density = base.fog_density
	apply(event_profile)
