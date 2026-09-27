@tool
class_name PaperObject3D
extends Node3D

enum BillboardMode { NONE, FULL, Y_ONLY }
@export var texture: Texture2D
@export var billboard_mode: BillboardMode = BillboardMode.NONE
@export_range(0.01, 20.0) var paper_height: float = 2.0
@export var pivot: Vector2 = Vector2(0.5, 1.0)
@export var paper_edge: bool = false
@export_range(1, 8) var paper_edge_width: int = 2
@export var paper_edge_color: Color = Color8(237,224,184)
@export var baked_texture: Texture2D
@export var baked_edge_width: int = 2
@export var baked_edge_color: Color = Color8(237,224,184)
@export_range(0.0, 0.2) var paper_thickness: float = 0.025
@export var cast_shadow: bool = false
@export_range(0.0, 1.0) var wind_reaction: float = 0.0
@export var occluder: bool = false
var visuals: Node3D
var sprites: Array[Sprite3D] = []
var wind_strength: float = 0.0
var wind_clock: float = 0.0
var fade_amount: float = 1.0
var _signature: String = ""

func _ready() -> void:
	rebuild()
	if not Engine.is_editor_hint():
		add_to_group("paper_objects")
		if occluder:
			add_to_group("paper_occluders")

func rebuild() -> void:
	if is_instance_valid(visuals):
		remove_child(visuals)
		visuals.queue_free()
	sprites.clear()
	visuals = Node3D.new()
	visuals.name = "PaperVisual"
	add_child(visuals)
	if texture != null:
		add_sprite(0.0)

func add_sprite(y_angle: float) -> Sprite3D:
	var sprite := Sprite3D.new()
	var selected := texture
	if paper_edge:
		var baked_matches := baked_texture != null and paper_edge_width == baked_edge_width and paper_edge_color.is_equal_approx(baked_edge_color)
		selected = baked_texture if baked_matches else PaperEdgeCache.get_outlined(texture, paper_edge_width, paper_edge_color)
	sprite.texture = selected
	sprite.pixel_size = paper_height / float(texture.get_height())
	sprite.offset = Vector2((0.5-pivot.x)*texture.get_width(), (pivot.y-0.5)*texture.get_height())
	sprite.billboard = int(billboard_mode) as BaseMaterial3D.BillboardMode
	sprite.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
	sprite.alpha_scissor_threshold = 0.35
	sprite.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	sprite.shaded = true
	sprite.double_sided = true
	sprite.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	sprite.rotation.y = y_angle
	visuals.add_child(sprite)
	sprites.append(sprite)
	return sprite

func set_fade(value: float) -> void:
	fade_amount = value
	for sprite in sprites:
		sprite.alpha_cut = SpriteBase3D.ALPHA_CUT_OPAQUE_PREPASS if value < 0.99 else SpriteBase3D.ALPHA_CUT_DISCARD
		sprite.modulate.a = value

func _process(delta: float) -> void:
	if Engine.is_editor_hint():
		var signature := str([texture, billboard_mode, paper_height, pivot, paper_edge, paper_edge_width, paper_edge_color, baked_texture, baked_edge_width, baked_edge_color, paper_thickness, cast_shadow, extra_signature()])
		if signature != _signature:
			_signature = signature
			rebuild()
		return
	if is_instance_valid(visuals) and wind_reaction > 0.0:
		wind_clock += delta
		visuals.rotation.z = sin(wind_clock*1.6 + position.x) * wind_reaction * wind_strength * 0.055

func extra_signature() -> String:
	return ""
