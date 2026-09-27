class_name TouchControls
extends CanvasLayer
## The engine's TouchScreenButton tracks independent touches, including diagonals.
var buttons: Dictionary = {}
var icon: Texture2D = preload("res://assets/fx/touch_arrow.svg")
var action_icon: Texture2D = preload("res://assets/fx/touch_action.svg")
var auto_icon: Texture2D = preload("res://assets/fx/touch_auto.svg")

func _ready() -> void:
	visible = DisplayServer.is_touchscreen_available() or "--touch-smoke" in OS.get_cmdline_user_args()
	if not visible:
		return
	for action in ["move_left","move_right","move_up","move_down","interact","autotour"]:
		var button := TouchScreenButton.new()
		button.name = action
		button.action = action
		button.texture_normal = action_icon if action == "interact" else auto_icon if action == "autotour" else icon
		button.modulate = Color(1,1,1,0.77)
		add_child(button)
		buttons[action] = button
	get_viewport().size_changed.connect(layout)
	layout()

func layout() -> void:
	if not visible:
		return
	var size := get_viewport().get_visible_rect().size
	var unit := clampf(minf(size.x,size.y)*0.13,55.0,95.0)
	var center := Vector2(unit*2.05,size.y-unit*2.0)
	var positions := {"move_left":center+Vector2(-unit,0),"move_right":center+Vector2(unit,0),"move_up":center+Vector2(0,-unit),"move_down":center+Vector2(0,unit),"interact":Vector2(size.x-unit*2.0,size.y-unit*2.25),"autotour":Vector2(size.x-unit*3.15,size.y-unit*1.15)}
	var rotations := {"move_up":0.0,"move_right":PI*0.5,"move_down":PI,"move_left":PI*1.5}
	for action in buttons:
		var button: TouchScreenButton = buttons[action]
		button.scale = Vector2.ONE*unit/128.0
		button.position = positions[action]
		button.rotation = rotations.get(action,0.0)
