@tool
class_name CrossPlaneObject
extends PaperObject3D

func rebuild() -> void:
	billboard_mode = BillboardMode.NONE
	super.rebuild()
	if texture != null:
		add_sprite(PI*0.5)
