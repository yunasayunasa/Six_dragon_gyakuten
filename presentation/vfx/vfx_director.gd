class_name VFXDirector
extends Node3D

@export var dust_count: int = 28
@export var treasure_count: int = 24

func particles(parent: Node3D, at: Vector3, treasure_light: bool = false) -> CPUParticles3D:
	var emitter := CPUParticles3D.new()
	emitter.name = "TreasureLight" if treasure_light else "DustParticle"
	emitter.amount = treasure_count if treasure_light else dust_count
	emitter.lifetime = 2.6 if treasure_light else 7.0
	emitter.preprocess = 0.0 if treasure_light else 3.0
	emitter.one_shot = treasure_light
	emitter.explosiveness = 0.35 if treasure_light else 0.0
	emitter.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	emitter.emission_box_extents = Vector3(0.4,0.1,0.2) if treasure_light else Vector3(3,2,2)
	emitter.direction = Vector3.UP
	emitter.spread = 26.0
	emitter.gravity = Vector3(0,0.1,0)
	emitter.initial_velocity_min = 0.7 if treasure_light else 0.01
	emitter.initial_velocity_max = 1.7 if treasure_light else 0.06
	emitter.scale_amount_min = 0.025
	emitter.scale_amount_max = 0.07 if treasure_light else 0.035
	var mesh := QuadMesh.new()
	mesh.size = Vector2(0.07,0.07) if treasure_light else Vector2(0.035,0.035)
	var material := StandardMaterial3D.new()
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	material.billboard_keep_scale = true
	material.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	material.albedo_texture = load("res://assets/fx/spark.svg")
	material.vertex_color_use_as_albedo = true
	mesh.material = material
	emitter.mesh = mesh
	emitter.color = Color(1,0.80,0.35,0.8) if treasure_light else Color(1,0.88,0.63,0.42)
	var gradient := Gradient.new()
	gradient.set_color(0,Color(1,1,1,0))
	gradient.set_color(1,Color(1,1,1,0))
	gradient.add_point(0.15,Color.WHITE)
	emitter.scale_amount_min = 0.7
	emitter.scale_amount_max = 1.2
	emitter.color_ramp = gradient
	emitter.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(emitter)
	emitter.position = at
	emitter.emitting = not treasure_light
	return emitter

func flash(parent: Node3D, at: Vector3) -> void:
	var sprite := Sprite3D.new()
	sprite.texture = load("res://assets/fx/spark.svg")
	sprite.pixel_size = 0.012
	sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	sprite.modulate = Color(1,0.89,0.55)
	parent.add_child(sprite)
	sprite.position = at
	var tween := create_tween().set_parallel(true)
	tween.tween_property(sprite,"scale",Vector3.ONE*2.7,0.5).from(Vector3.ONE*0.2)
	tween.tween_property(sprite,"modulate:a",0.0,0.6)
	tween.chain().tween_callback(sprite.queue_free)
