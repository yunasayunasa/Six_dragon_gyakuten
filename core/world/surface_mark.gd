class_name SurfaceMark
extends RefCounted
## Decal in Vulkan renderers; a small transparent ground quad in Compatibility.
static func add(parent: Node3D, at: Vector3, texture: Texture2D) -> Node3D:
	if RenderingServer.get_current_rendering_method() != "gl_compatibility":
		var decal := Decal.new()
		decal.name = "MossDecal"
		decal.texture_albedo = texture
		decal.size = Vector3(2,0.6,1.6)
		decal.modulate = Color(0.8,0.9,0.7,0.8)
		parent.add_child(decal)
		decal.position = at+Vector3(0,0.16,0)
		return decal
	var quad := MeshInstance3D.new()
	quad.name = "MossSurfaceFallback"
	var plane := PlaneMesh.new()
	plane.size = Vector2(2,1.6)
	quad.mesh = plane
	var material := StandardMaterial3D.new()
	material.albedo_texture = texture
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	quad.material_override = material
	quad.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(quad)
	quad.position = at+Vector3(0,0.025,0)
	return quad
