class_name CameraDirector
extends Node3D

@export var exploration: CameraProfile
@export var indoor: CameraProfile
@export var event: CameraProfile
var camera: Camera3D
var focus_target: Node3D
var follow_target: Node3D
var current: CameraProfile
var offset := Vector3.ZERO
var framing := Vector3.ZERO
var follow_speed: float = 4.0
var follow_enabled: bool = true
var shake_amount: float = 0.0
var push_amount: float = 0.0
var blend: Tween

func bind(value: Camera3D, target: Node3D) -> void:
	camera = value
	follow_target = target
	focus_target = target

func apply(profile: CameraProfile, immediate: bool = false) -> void:
	current = profile
	follow_enabled = profile.follow
	follow_speed = profile.follow_speed
	if is_instance_valid(blend):
		blend.kill()
	var duration := 0.001 if immediate else profile.blend_seconds
	blend = create_tween().set_parallel(true).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	blend.tween_property(self,"offset",profile.position_offset,duration)
	blend.tween_property(self,"framing",profile.framing_offset,duration)
	blend.tween_property(camera,"rotation_degrees",profile.rotation_degrees,duration)
	blend.tween_property(camera,"fov",profile.fov/profile.zoom,duration)
	if immediate:
		offset = profile.position_offset
		framing = profile.framing_offset
		camera.rotation_degrees = profile.rotation_degrees
		camera.position = follow_target.global_position+profile.position_offset+profile.framing_offset

func push_in(amount: float, duration: float = 0.8) -> Tween:
	var tween := create_tween()
	tween.tween_property(self,"push_amount",amount,duration).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	return tween

func shake(strength: float = 0.05) -> void:
	shake_amount = strength

func _process(delta: float) -> void:
	if camera == null or follow_target == null:
		return
	if follow_enabled:
		var desired := follow_target.global_position+offset+framing-camera.global_basis.z*push_amount
		camera.global_position = camera.global_position.lerp(desired,1.0-exp(-follow_speed*delta))
	shake_amount = move_toward(shake_amount,0.0,delta*0.2)
	camera.h_offset = sin(Time.get_ticks_msec()*0.047)*shake_amount
	camera.v_offset = cos(Time.get_ticks_msec()*0.053)*shake_amount*0.6
