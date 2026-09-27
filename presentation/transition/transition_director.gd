class_name TransitionDirector
extends CanvasLayer

@export var fade_seconds: float = 0.45
var curtain: ColorRect
var busy: bool = false

func _ready() -> void:
	layer = 20
	curtain = ColorRect.new()
	curtain.color = Color(0.04,0.06,0.07,0)
	curtain.mouse_filter = Control.MOUSE_FILTER_IGNORE
	curtain.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(curtain)

func fade_to(alpha: float) -> Tween:
	var tween := create_tween()
	tween.tween_property(curtain,"color:a",alpha,fade_seconds)
	return tween
