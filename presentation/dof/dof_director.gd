class_name DOFDirector
extends Node

@export var exploration: DOFProfile
@export var indoor: DOFProfile
@export var stage_event: DOFProfile
var camera: Camera3D
var attributes: CameraAttributesPractical
var target: Node3D
var focus_distance: float = 14.0
var current: DOFProfile
var blend: Tween
var enabled: bool = true
var transitioning: bool = false

func bind(value: Camera3D) -> void:
	camera = value
	attributes = CameraAttributesPractical.new()
	camera.attributes = attributes
	enabled = RenderingServer.get_current_rendering_method() != "gl_compatibility"
	attributes.dof_blur_near_enabled = enabled
	attributes.dof_blur_far_enabled = enabled

func apply(profile: DOFProfile, focus: Node3D) -> void:
	current = profile
	target = focus
	if is_instance_valid(blend):
		blend.kill()
	transitioning = true
	blend = create_tween().set_parallel(true).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	var starting_distance := focus_distance
	blend.tween_method(func(weight: float) -> void: focus_distance = lerpf(starting_distance,depth_of(target),weight),0.0,1.0,profile.focus_seconds)
	blend.tween_property(attributes,"dof_blur_amount",profile.amount,profile.focus_seconds)
	blend.chain().tween_callback(func() -> void: transitioning = false)

func depth_of(object: Node3D) -> float:
	return maxf(0.2,-camera.global_basis.z.dot(object.global_position+Vector3(0,0.8,0)-camera.global_position))

func _process(delta: float) -> void:
	if current == null or target == null:
		return
	if not transitioning:
		focus_distance = lerpf(focus_distance,depth_of(target),1.0-exp(-delta*3.0))
	attributes.dof_blur_near_distance = maxf(0.1,focus_distance-current.sharp_half_width)
	attributes.dof_blur_far_distance = focus_distance+current.sharp_half_width
	attributes.dof_blur_near_transition = current.transition_distance
	attributes.dof_blur_far_transition = current.transition_distance
