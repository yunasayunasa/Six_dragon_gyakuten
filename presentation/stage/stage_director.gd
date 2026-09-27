class_name StageDirector
extends Node

signal motion_started(kind: StringName, target: Node3D)
signal motion_finished(kind: StringName, target: Node3D)
@export var profile: StageMotionProfile
var active: Dictionary = {}

func play(kind: StringName, target: Node3D, override_profile: StageMotionProfile = null) -> Tween:
	var p := override_profile if override_profile != null else profile
	if p == null:
		p = StageMotionProfile.new()
	var id := target.get_instance_id()
	if active.has(id) and is_instance_valid(active[id]):
		active[id].kill()
	var tween := create_tween().bind_node(target)
	active[id] = tween
	motion_started.emit(kind,target)
	match kind:
		&"Rise":
			target.rotation.x = -PI*0.5
			tween.tween_property(target,"rotation:x",0.0,p.duration).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		&"Fall":
			tween.tween_property(target,"rotation:x",-PI*0.5,p.duration).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		&"DropFromWire":
			var landed := target.position
			target.position.y += p.drop_height
			tween.tween_property(target,"position",landed,p.duration).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
			tween.tween_property(target,"rotation:z",p.sway_angle,p.sway_duration*0.25).set_trans(Tween.TRANS_SINE)
			tween.tween_property(target,"rotation:z",-p.sway_angle*0.5,p.sway_duration*0.35).set_trans(Tween.TRANS_SINE)
			tween.tween_property(target,"rotation:z",0.0,p.sway_duration*0.4).set_trans(Tween.TRANS_SINE)
		_:
			push_warning("Unknown stage motion: "+kind)
			tween.tween_interval(0.01)
	tween.tween_callback(func() -> void:
		active.erase(id)
		motion_finished.emit(kind,target))
	return tween
