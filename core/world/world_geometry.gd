class_name WorldGeometry
extends RefCounted

static func barrier(parent: Node3D, at: Vector3, size: Vector3) -> void:
	var body := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var volume := BoxShape3D.new()
	volume.size = size
	shape.shape = volume
	body.add_child(shape)
	parent.add_child(body)
	body.position = at

static func box(parent: Node3D, label: String, at: Vector3, size: Vector3, color: Color, solid: bool = false) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = label
	var mesh := BoxMesh.new()
	mesh.size = size
	node.mesh = mesh
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = 0.87
	node.material_override = material
	parent.add_child(node)
	node.position = at
	if solid:
		var body := StaticBody3D.new()
		var shape := CollisionShape3D.new()
		var volume := BoxShape3D.new()
		volume.size = size
		shape.shape = volume
		body.add_child(shape)
		node.add_child(body)
	return node

static func ground(parent: Node3D, label: String, at: Vector3, size: Vector2, texture: Texture2D, repeats: Vector3, solid: bool = true) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = label
	var plane := PlaneMesh.new()
	plane.size = size
	node.mesh = plane
	var material := ShaderMaterial.new()
	material.shader = load("res://core/world/ground.gdshader")
	material.set_shader_parameter("ground_texture",texture)
	material.set_shader_parameter("repetitions",Vector2(repeats.x,repeats.y))
	node.material_override = material
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(node)
	node.position = at
	if solid:
		var body := StaticBody3D.new()
		var shape := CollisionShape3D.new()
		var volume := BoxShape3D.new()
		volume.size = Vector3(size.x,0.2,size.y)
		shape.shape = volume
		shape.position.y = -0.1
		body.add_child(shape)
		node.add_child(body)
	return node
