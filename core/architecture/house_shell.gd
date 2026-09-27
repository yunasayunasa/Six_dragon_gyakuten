class_name HouseShell
extends Node3D
## Replace model_scene with a Tripo GLB/PackedScene. Door remains a separate PaperMesh.
@export var model_scene: PackedScene
@export var footprint := Vector3(5.8,3.2,4.0)

func _ready() -> void:
	if model_scene != null:
		add_child(model_scene.instantiate())
		return
	var plaster := Color(0.70,0.65,0.44)
	var timber := Color(0.22,0.17,0.12)
	WorldGeometry.box(self,"BackWall",Vector3(0,1.6,-2),Vector3(5.8,3.2,0.22),plaster,true)
	for x in [-2.9,2.9]:
		WorldGeometry.box(self,"SideWall",Vector3(x,1.6,0),Vector3(0.2,3.2,4),plaster,true)
	for x in [-1.95,1.95]:
		WorldGeometry.box(self,"FrontWall",Vector3(x,1.6,2),Vector3(1.9,3.2,0.22),plaster,true)
	WorldGeometry.box(self,"DoorLintel",Vector3(0,2.94,2),Vector3(2,0.5,0.25),timber)
	for x in [-2.8,-0.95,0.95,2.8]:
		WorldGeometry.box(self,"Timber",Vector3(x,1.6,2.15),Vector3(0.12,3.2,0.14),timber)
	for y in [0.15,2.9]:
		WorldGeometry.box(self,"TimberRail",Vector3(0,y,2.15),Vector3(5.8,0.15,0.14),timber)
	var roof := MeshInstance3D.new()
	roof.name = "LowPolyRoof"
	var prism := PrismMesh.new()
	prism.size = Vector3(6.6,2.4,4.8)
	roof.mesh = prism
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(0.25,0.32,0.30)
	material.roughness = 0.9
	roof.material_override = material
	add_child(roof)
	roof.position.y = 4.2
	WorldGeometry.box(self,"Chimney",Vector3(1.7,4.7,-0.6),Vector3(0.55,1.8,0.65),Color(0.42,0.32,0.25))
