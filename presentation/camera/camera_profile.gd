class_name CameraProfile
extends Resource

@export var profile_name: String = "Exploration"
@export var position_offset := Vector3(0,7.2,12.8)
@export var rotation_degrees := Vector3(-27.0,0,0)
@export_range(15,80) var fov: float = 38.0
@export_range(0.5,2.0) var zoom: float = 1.0
@export var follow: bool = true
@export var follow_speed: float = 4.0
@export var framing_offset := Vector3(1.2,0,0)
@export var blend_seconds: float = 1.1
