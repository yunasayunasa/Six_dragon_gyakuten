@tool
class_name PaperMesh
extends PaperObject3D

@export var back_color := Color(0.25,0.15,0.08)
@export var side_color := Color(0.89,0.80,0.59)

func rebuild() -> void:
	billboard_mode = BillboardMode.NONE
	super.rebuild()
	if texture == null:
		return
	var width := paper_height * texture.get_width()/float(texture.get_height())
	var center := Vector3((0.5-pivot.x)*width,(pivot.y-0.5)*paper_height,0)
	var thickness := maxf(paper_thickness,0.005)
	var edges := WorldGeometry.box(visuals,"PaperEdges",center,Vector3(width,paper_height,thickness),side_color)
	var back := WorldGeometry.box(visuals,"PaperBack",center+Vector3(0,0,-thickness*0.51),Vector3(width,paper_height,0.001),back_color)
	for mesh in [edges,back]:
		mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	sprites[0].position.z = thickness*0.5+0.002
	sprites[0].double_sided = false

func extra_signature() -> String:
	return str([back_color,side_color])
