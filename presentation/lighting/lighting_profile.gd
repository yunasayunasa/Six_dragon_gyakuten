class_name LightingProfile
extends Resource

@export var profile_name: String = "OutdoorDay"
@export var ambient_color := Color(0.69,0.78,0.77)
@export var ambient_energy: float = 0.5
@export var sun_color := Color(1.0,0.89,0.66)
@export var sun_energy: float = 1.2
@export var sun_rotation := Vector3(-42,-28,0)
@export var local_energy: float = 0.0
@export var window_energy: float = 0.0
@export var dramatic_energy: float = 0.0
@export var fog_density: float = 0.008
@export var fog_color := Color(0.46,0.65,0.67)
@export var blend_seconds: float = 1.1
