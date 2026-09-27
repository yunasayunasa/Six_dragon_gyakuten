class_name AnimatedPaperCharacter
extends CharacterBody3D

signal footstep
@export var animations: PaperAnimationSet
@export var speed: float = 3.1
@export var character_height: float = 1.65
@export var input_enabled: bool = true
var paper: PaperObject3D
var movement_override := Vector2.ZERO
var use_override := false
var clock_time := 0.0
var step_time := 0.0
var clip := "Idle"
var last_frame := -1

func _ready() -> void:
	paper = PaperObject3D.new()
	paper.texture = animations.sheet
	paper.paper_height = character_height * animations.rows
	paper.billboard_mode = PaperObject3D.BillboardMode.Y_ONLY
	add_child(paper)
	var sprite := paper.sprites[0]
	sprite.texture = animations.edged_sheet if animations.edged_sheet != null else animations.sheet
	sprite.hframes = animations.columns
	sprite.vframes = animations.rows
	sprite.offset = Vector2(0, animations.sheet.get_height()/float(animations.rows)*0.5)
	var collision := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.24
	capsule.height = character_height
	collision.shape = capsule
	collision.position.y = character_height*0.5
	add_child(collision)
	var shadow := MeshInstance3D.new()
	var mesh := PlaneMesh.new()
	mesh.size = Vector2(0.95, 0.6)
	shadow.mesh = mesh
	shadow.position.y = 0.018
	shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var material := StandardMaterial3D.new()
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.albedo_texture = load("res://assets/fx/contact_shadow.png")
	shadow.material_override = material
	add_child(shadow)

func _physics_process(delta: float) -> void:
	var direction := Vector2.ZERO
	if input_enabled:
		direction = movement_override if use_override else Input.get_vector("move_left", "move_right", "move_up", "move_down")
	velocity.x = direction.x*speed
	velocity.z = direction.y*speed
	velocity.y = -3.0
	move_and_slide()
	var moving := Vector2(velocity.x,velocity.z).length() > 0.1 and direction.length() > 0.1
	var next_clip := "Walk" if moving else "Idle"
	if next_clip != clip:
		clock_time = 0.0
		clip = next_clip
	clock_time += delta
	var frames: Array = animations.clips.get(clip, [0])
	paper.sprites[0].frame = frames[int(clock_time*animations.fps)%frames.size()]
	if absf(direction.x) > 0.05:
		paper.sprites[0].flip_h = direction.x < 0.0
	if moving:
		step_time += delta
		if step_time >= 0.36:
			step_time = 0.0
			footstep.emit()
