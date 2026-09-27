class_name WeatherDirector
extends Node

@export var clear: WeatherProfile
@export var wind: WeatherProfile
var strength: float = 0.0
var blend: Tween

func apply(profile: WeatherProfile) -> void:
	if profile.profile_name not in ["Clear","Wind"]:
		push_warning("Weather profile reserved for future implementation: "+profile.profile_name)
		return
	if is_instance_valid(blend):
		blend.kill()
	blend = create_tween()
	blend.tween_property(self,"strength",profile.wind,profile.blend_seconds)

func _process(_delta: float) -> void:
	for object in get_tree().get_nodes_in_group("paper_objects"):
		object.wind_strength = strength
