class_name OcclusionDirector
extends Node

@export_range(0.1,0.8) var hidden_alpha: float = 0.22
@export var fade_speed: float = 7.0
var camera: Camera3D
var player: Node3D

func _process(delta: float) -> void:
	if camera == null or player == null:
		return
	var player_point := camera.unproject_position(player.global_position+Vector3(0,0.9,0))
	var player_depth := -camera.global_basis.z.dot(player.global_position-camera.global_position)
	for object: PaperObject3D in get_tree().get_nodes_in_group("paper_occluders"):
		if not object.is_visible_in_tree():
			continue
		var base := object.global_position
		var depth := -camera.global_basis.z.dot(base-camera.global_position)
		var width := object.paper_height*object.texture.get_width()/float(object.texture.get_height())
		var bottom := camera.unproject_position(base-Vector3(width*0.42,0,0))
		var top := camera.unproject_position(base+Vector3(width*0.42,object.paper_height,0))
		var rect := Rect2(Vector2(minf(bottom.x,top.x),minf(bottom.y,top.y)),Vector2(absf(top.x-bottom.x),absf(top.y-bottom.y)))
		var obscuring := depth < player_depth-0.15 and rect.has_point(player_point)
		object.set_fade(move_toward(object.fade_amount,hidden_alpha if obscuring else 1.0,delta*fade_speed))
