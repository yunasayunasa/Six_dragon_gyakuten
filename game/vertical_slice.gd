extends Node3D

@export_range(1,10) var phase: int = 10
@export var demo_profile: DemoProfile = preload("res://game/demo_profile.tres")
var player: AnimatedPaperCharacter
var camera: Camera3D
var outdoor: Node3D
var failures: int = 0
var paper_door: PaperMesh
var stage: StageDirector
var rise_tree: PaperObject3D
var wire_sign: PaperObject3D
var camera_director: CameraDirector
var dof: DOFDirector
var lighting: LightingDirector
var weather: WeatherDirector
var indoor_root: Node3D
var transition: TransitionDirector
var audio: AudioDirector
var occlusion: OcclusionDirector
var treasure: Node3D
var treasure_lid: PaperMesh
var is_indoor: bool = false
var vfx: VFXDirector
var treasure_particles: CPUParticles3D
var item: PaperObject3D
var busy: bool = false
var stage_index: int = 0
var auto_tour: bool = false
var complete: bool = false
var hud: Label
var metrics: Label
var door_interaction: ProximityInteraction
var treasure_interaction: ProximityInteraction
var touch_controls: TouchControls
var capture_mode: bool = false
var capture_started: int = 0
var performance_samples: Array = []
var sample_clock: float = 0.0

func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--phase="):
			phase = int(arg.get_slice("=",1))
	setup_input()
	outdoor = Node3D.new()
	outdoor.name = "Forest"
	add_child(outdoor)
	if phase >= 2:
		build_ground_player()
	if phase >= 3:
		build_forest()
	if phase >= 4:
		paper_door = PaperMesh.new()
		paper_door.name = "PaperDoor"
		paper_door.texture = load("res://assets/architecture/door.svg")
		paper_door.paper_height = 2.5
		paper_door.paper_thickness = 0.08
		outdoor.add_child(paper_door)
		paper_door.position = Vector3(16,0,0)
	if phase >= 5:
		stage = StageDirector.new()
		stage.profile = load("res://presentation/stage/default.tres")
		add_child(stage)
		rise_tree = paper_prop(outdoor,"paper","tree",Vector3(-2,0,-1.8),4.6)
		rise_tree.name = "RisingTree"
		rise_tree.rotation.x = -PI*0.5
		wire_sign = paper_prop(outdoor,"paper","sign",Vector3(5,1.9,-0.8),1.6)
		wire_sign.name = "WireSign"
		wire_sign.pivot = Vector2(0.5,0)
		wire_sign.rebuild()
		wire_sign.visible = false
		for side in [-0.5,0.5]:
			WorldGeometry.box(wire_sign,"Rope",Vector3(side,3.5,-0.02),Vector3(0.018,7,0.018),Color(0.38,0.27,0.16))
	if phase >= 6:
		build_camera()
	if phase >= 7:
		build_atmosphere()
	if phase >= 8:
		build_house_indoor()
	if phase >= 9:
		build_water_vfx()
		build_interactions_hud()
	touch_controls = TouchControls.new()
	add_child(touch_controls)
	if touch_controls.visible:
		metrics.visible = false
	if "--smoke" in OS.get_cmdline_user_args():
		call_deferred("smoke")
	elif "--capture-tour" in OS.get_cmdline_user_args():
		capture_mode = true
		call_deferred("capture_tour")

func setup_input() -> void:
	var bindings := {"move_left":[KEY_A,KEY_LEFT], "move_right":[KEY_D,KEY_RIGHT], "move_up":[KEY_W,KEY_UP], "move_down":[KEY_S,KEY_DOWN], "interact":[KEY_E,KEY_SPACE], "autotour":[KEY_T], "reset_demo":[KEY_R], "debug_toggle":[KEY_F3]}
	for action in bindings:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
			for key in bindings[action]:
				var event := InputEventKey.new()
				event.physical_keycode = key
				InputMap.action_add_event(action,event)

func build_camera() -> void:
	camera_director = CameraDirector.new()
	camera_director.exploration = load("res://presentation/camera/exploration.tres")
	camera_director.indoor = load("res://presentation/camera/indoor.tres")
	camera_director.event = load("res://presentation/camera/event.tres")
	add_child(camera_director)
	camera_director.bind(camera,player)
	camera_director.apply(camera_director.exploration,true)
	dof = DOFDirector.new()
	dof.exploration = load("res://presentation/dof/exploration.tres")
	dof.indoor = load("res://presentation/dof/indoor.tres")
	dof.stage_event = load("res://presentation/dof/stage_event.tres")
	add_child(dof)
	dof.bind(camera)
	dof.apply(dof.exploration,player)

func build_atmosphere() -> void:
	get_node("TemporaryLight").queue_free()
	lighting = LightingDirector.new()
	lighting.outdoor_day = load("res://presentation/lighting/outdoor_day.tres")
	lighting.indoor_warm = load("res://presentation/lighting/indoor_warm.tres")
	lighting.stage_event = load("res://presentation/lighting/stage_event.tres")
	add_child(lighting)
	lighting.apply(lighting.outdoor_day,true)
	weather = WeatherDirector.new()
	weather.clear = load("res://presentation/weather/clear.tres")
	weather.wind = load("res://presentation/weather/wind.tres")
	add_child(weather)
	weather.apply(weather.wind)
	var mountain := PaperObject3D.new()
	mountain.name = "FarBackground"
	mountain.texture = load("res://assets/background/mountains.svg")
	mountain.paper_height = 16
	outdoor.add_child(mountain)
	mountain.position = Vector3(5,-10,-23)
	mountain.sprites[0].shaded = false
	var forest := Node3D.new()
	forest.name = "BackgroundForest"
	outdoor.add_child(forest)
	for i in 12:
		var tree := paper_prop(forest,"paper","tree",Vector3(-18+i*4.5,-0.2,-11),4.5)
		tree.sprites[0].modulate = Color(0.46,0.64,0.60)

func build_house_indoor() -> void:
	var house := HouseShell.new()
	house.name = "HouseModelSlot"
	outdoor.add_child(house)
	house.position = Vector3(16,0,-3)
	paper_door.position = Vector3(16,0,-0.82)
	for x in [14.1,17.9]:
		var window := paper_prop(outdoor,"paper","window",Vector3(x,1.1,-0.74),1.15)
		window.wind_reaction = 0
	indoor_root = Node3D.new()
	indoor_root.name = "Indoor"
	add_child(indoor_root)
	indoor_root.position = Vector3(50,0,0)
	WorldGeometry.ground(indoor_root,"Floor",Vector3.ZERO,Vector2(10,8),load("res://assets/ground/wood.png"),Vector3(3,3,1))
	WorldGeometry.box(indoor_root,"BackWall",Vector3(0,2,-4),Vector3(10,4,0.2),Color(0.40,0.35,0.28),true)
	for x in [-5,5]:
		WorldGeometry.box(indoor_root,"SideWall",Vector3(x,1.1,0),Vector3(0.2,2.2,8),Color(0.32,0.29,0.25),true)
	WorldGeometry.box(indoor_root,"FrontBoundary",Vector3(0,-0.1,4),Vector3(10,0.2,0.2),Color(0.25,0.20,0.15),true)
	WorldGeometry.barrier(indoor_root,Vector3(0,1,4),Vector3(10,2,0.2))
	for x in [-4.8,-2.5,0,2.5,4.8]:
		WorldGeometry.box(indoor_root,"WallBeam",Vector3(x,2,-3.83),Vector3(0.15,4,0.2),Color(0.20,0.16,0.12))
	var furniture := PaperMesh.new()
	furniture.texture = load("res://assets/props/cabinet.svg")
	furniture.paper_height = 2.8
	furniture.paper_thickness = 0.08
	indoor_root.add_child(furniture)
	furniture.position = Vector3(-3,0,-3.2)
	paper_prop(indoor_root,"paper","window",Vector3(0.0,1.7,-3.8),1.4)
	paper_prop(indoor_root,"paper","lamp",Vector3(-1.3,0,-2.4),1.2)
	paper_prop(indoor_root,"paper","books",Vector3(-2.2,0,-2.2),0.6)
	treasure = Node3D.new()
	treasure.name = "Treasure"
	indoor_root.add_child(treasure)
	treasure.position = Vector3(1.8,0,-1.8)
	var chest := PaperMesh.new()
	chest.texture = load("res://assets/props/chest.svg")
	chest.paper_height = 0.65
	chest.paper_thickness = 0.08
	treasure.add_child(chest)
	treasure_lid = PaperMesh.new()
	treasure_lid.texture = load("res://assets/props/chest_lid.svg")
	treasure_lid.paper_height = 0.38
	treasure_lid.paper_thickness = 0.06
	treasure.add_child(treasure_lid)
	treasure_lid.position = Vector3(0,0.64,0)
	lighting.local_light.position = Vector3(48,3.1,0.5)
	lighting.window_light.position = Vector3(50,3.3,-3.7)
	lighting.window_light.look_at(Vector3(51,0,0))
	indoor_root.visible = false
	transition = TransitionDirector.new()
	add_child(transition)
	audio = AudioDirector.new()
	add_child(audio)
	player.footstep.connect(func() -> void: audio.play(&"Footstep",player.global_position))
	stage.motion_started.connect(func(kind: StringName, target: Node3D) -> void:
		var cues := {&"Rise":&"StageRise",&"Fall":&"StageFall",&"DropFromWire":&"WireMove"}
		audio.play(cues.get(kind,&"StageRise"),target.global_position))
	occlusion = OcclusionDirector.new()
	occlusion.camera = camera
	occlusion.player = player
	add_child(occlusion)

func enter_indoor() -> void:
	player.input_enabled = false
	await transition.fade_to(1.0).finished
	outdoor.visible = false
	indoor_root.visible = true
	is_indoor = true
	player.position = Vector3(48,0.05,1.5)
	player.velocity = Vector3.ZERO
	camera_director.follow_target = player
	camera_director.apply(camera_director.indoor,true)
	dof.apply(dof.indoor,player)
	lighting.apply(lighting.indoor_warm)
	weather.apply(weather.clear)
	await transition.fade_to(0.0).finished
	player.input_enabled = true

func build_water_vfx() -> void:
	var pond := MeshInstance3D.new()
	pond.name = "WaterPlane"
	var plane := PlaneMesh.new()
	plane.size = Vector2(6,3.4)
	pond.mesh = plane
	var material := ShaderMaterial.new()
	material.shader = load("res://presentation/vfx/water.gdshader")
	pond.material_override = material
	pond.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	outdoor.add_child(pond)
	pond.position = Vector3(8,0.035,-2.8)
	for i in 6:
		paper_prop(outdoor,"billboard","rock",Vector3(5.5+i,0,-4.25),0.5)
	for x in [-6,4,13]:
		SurfaceMark.add(outdoor,Vector3(x,0,1.05),load("res://assets/ground/moss.png"))
	vfx = VFXDirector.new()
	add_child(vfx)
	vfx.particles(outdoor,Vector3(-4,2,-1))
	vfx.particles(indoor_root,Vector3(0,2,-1.5))
	treasure_particles = vfx.particles(treasure,Vector3(0,0.7,0),true)
	item = paper_prop(treasure,"billboard","item",Vector3(0,0.7,0),0.65)
	item.visible = false

func build_interactions_hud() -> void:
	door_interaction = ProximityInteraction.new()
	door_interaction.radius = demo_profile.interaction_radius
	paper_door.add_child(door_interaction)
	treasure_interaction = ProximityInteraction.new()
	treasure_interaction.radius = demo_profile.interaction_radius
	treasure.add_child(treasure_interaction)
	door_interaction.requested.connect(door_event)
	treasure_interaction.requested.connect(treasure_event)
	var layer := CanvasLayer.new()
	add_child(layer)
	hud = Label.new()
	hud.position = Vector2(32,26)
	hud.add_theme_font_size_override("font_size",18)
	hud.add_theme_color_override("font_color",Color(1,0.95,0.8))
	hud.add_theme_color_override("font_shadow_color",Color(0.02,0.04,0.04,0.9))
	hud.add_theme_constant_override("shadow_offset_x",2)
	hud.add_theme_constant_override("shadow_offset_y",2)
	layer.add_child(hud)
	metrics = Label.new()
	metrics.position = Vector2(32,610)
	metrics.add_theme_font_size_override("font_size",15)
	layer.add_child(metrics)

func _process(_delta: float) -> void:
	if phase < 9 or "--smoke" in OS.get_cmdline_user_args():
		return
	if capture_mode and capture_started > 0:
		sample_clock += _delta
		if sample_clock >= 0.5:
			sample_clock = 0.0
			performance_samples.append({"fps":Engine.get_frames_per_second(),"draw_calls":Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME),"objects":Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME)})
	if Input.is_action_just_pressed("reset_demo"):
		get_tree().reload_current_scene()
		return
	if Input.is_action_just_pressed("debug_toggle"):
		metrics.visible = not metrics.visible
	if Input.is_action_just_pressed("autotour"):
		auto_tour = not auto_tour
	player.use_override = auto_tour
	player.speed = demo_profile.auto_walk_speed if auto_tour else 3.1
	var message := "Walk through the forest"
	if busy:
		message = "Stage event"
	elif complete:
		message = "Slice complete  /  R to replay"
	elif is_indoor:
		message = "Approach the chest  /  E to open"
	elif stage_index >= 2:
		message = "Approach the door  /  E to enter"
	hud.text = "PAPER / HD2D\n"+message+("\nMove: left pad   Action: hand   Guided tour: play" if touch_controls.visible else "\nWASD / Arrows   Move     E   Interact     T   Guided tour     F3   Stats")
	metrics.text = "%.0f FPS   |   %.2f ms   |   %d draw calls   |   %d visible objects\n%s  /  %s  /  %s" % [Engine.get_frames_per_second(),1000.0/maxf(1,Engine.get_frames_per_second()),Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME),Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME),RenderingServer.get_current_rendering_method(),camera_director.current.profile_name,"DOF" if dof.enabled else "DOF unavailable"]
	if busy:
		return
	if auto_tour and not complete:
		var destination := demo_profile.indoor_waypoint if is_indoor else demo_profile.outdoor_waypoints[mini(stage_index,2)]
		var diff := Vector2(destination.x-player.position.x,destination.z-player.position.z)
		player.movement_override = diff.normalized() if diff.length() > 0.15 else Vector2.ZERO
	elif complete:
		player.movement_override = Vector2.ZERO
	if not is_indoor:
		if stage_index == 0 and player.position.x >= demo_profile.rise_trigger_x:
			stage_index = 1
			stage_event(&"Rise",rise_tree)
		elif stage_index == 1 and player.position.x >= demo_profile.wire_trigger_x:
			stage_index = 2
			wire_sign.visible = true
			stage_event(&"DropFromWire",wire_sign)
		elif stage_index >= 2 and (auto_tour or Input.is_action_just_pressed("interact")):
			door_interaction.request(player)
	elif not complete and (auto_tour or Input.is_action_just_pressed("interact")):
		treasure_interaction.request(player)

func begin_event(target: Node3D) -> void:
	busy = true
	player.input_enabled = false
	camera_director.follow_target = target
	camera_director.focus_target = target
	camera_director.apply(camera_director.event)
	dof.apply(dof.stage_event,target)
	lighting.highlight(target,lighting.indoor_warm if is_indoor else lighting.outdoor_day)

func restore_exploration() -> void:
	camera_director.follow_target = player
	camera_director.focus_target = player
	camera_director.apply(camera_director.indoor if is_indoor else camera_director.exploration)
	camera_director.push_in(0)
	dof.apply(dof.indoor if is_indoor else dof.exploration,player)
	lighting.apply(lighting.indoor_warm if is_indoor else lighting.outdoor_day)
	player.input_enabled = true
	busy = false

func stage_event(kind: StringName, target: Node3D) -> void:
	begin_event(target)
	await get_tree().create_timer(0.6).timeout
	await stage.play(kind,target).finished
	if capture_mode:
		await save_capture("02-rise" if kind == &"Rise" else "03-wire")
	camera_director.shake(0.025)
	await get_tree().create_timer(demo_profile.event_hold_seconds).timeout
	restore_exploration()

func door_event() -> void:
	if busy or is_indoor:
		return
	door_interaction.enabled = false
	if capture_mode:
		await save_capture("04-house")
	begin_event(paper_door)
	audio.play(&"Door",paper_door.global_position)
	await stage.play(&"Fall",paper_door).finished
	await enter_indoor()
	if capture_mode:
		await save_capture("05-indoor")
	restore_exploration()

func treasure_event() -> void:
	if busy or complete:
		return
	treasure_interaction.enabled = false
	begin_event(treasure)
	camera_director.push_in(1.4,1.0)
	await get_tree().create_timer(1.2).timeout
	var open := create_tween()
	open.tween_property(treasure_lid,"rotation:x",-1.35,0.7).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	await open.finished
	audio.play(&"Treasure",treasure.global_position)
	treasure_particles.emitting = true
	vfx.flash(treasure,Vector3(0,1.0,0.1))
	item.visible = true
	item.scale = Vector3.ONE*0.15
	var pop := create_tween().set_parallel(true)
	pop.tween_property(item,"position:y",1.75,0.9).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	pop.tween_property(item,"scale",Vector3.ONE,0.9).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	await pop.finished
	if capture_mode:
		await save_capture("06-treasure")
	await get_tree().create_timer(demo_profile.treasure_hold_seconds).timeout
	complete = true
	restore_exploration()

func save_capture(label: String) -> void:
	await RenderingServer.frame_post_draw
	var image := get_viewport().get_texture().get_image()
	var result := image.save_png("res://validation/"+label+".png")
	print("CAPTURE: ",label," result=",result)

func capture_tour() -> void:
	if "--no-dof" in OS.get_cmdline_user_args():
		dof.attributes.dof_blur_near_enabled = false
		dof.attributes.dof_blur_far_enabled = false
	if "--no-particles" in OS.get_cmdline_user_args():
		for child in outdoor.get_children()+indoor_root.get_children():
			if child is CPUParticles3D:
				child.visible = false
	if "--capture-indoor" in OS.get_cmdline_user_args():
		await enter_indoor()
	await get_tree().create_timer(3.0).timeout
	var capture_label := "diagnostic" if "--capture-indoor" in OS.get_cmdline_user_args() else "touch-forest" if "--touch-smoke" in OS.get_cmdline_user_args() else "01-forest"
	await save_capture(capture_label)
	if "--capture-only" in OS.get_cmdline_user_args():
		get_tree().quit()
		return
	capture_started = Time.get_ticks_msec()
	auto_tour = true
	while not complete and Time.get_ticks_msec()-capture_started < 65000:
		await get_tree().create_timer(0.25).timeout
	await get_tree().create_timer(1.5).timeout
	var report := {"complete":complete,"seconds":(Time.get_ticks_msec()-capture_started)/1000.0,"renderer":RenderingServer.get_current_rendering_method(),"dof_enabled":dof.enabled,"stage_index":stage_index,"audio_hooks":audio.counts,"samples":performance_samples}
	var file := FileAccess.open("res://validation/tour-report.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(report,"  "))
	file.close()
	print("TOUR ","PASS" if complete else "FAIL"," seconds=",report.seconds," renderer=",report.renderer)
	get_tree().quit(0 if complete else 1)

func build_ground_player() -> void:
	WorldGeometry.ground(outdoor,"GrassGround",Vector3(7,0,0),Vector2(58,34),load("res://assets/ground/grass.png"),Vector3(14,8,1))
	WorldGeometry.ground(outdoor,"DirtPath",Vector3(6,0.014,0),Vector2(35,2.6),load("res://assets/ground/dirt.png"),Vector3(12,1,1),false)
	for z in [-16.8,16.8]:
		WorldGeometry.barrier(outdoor,Vector3(7,1,z),Vector3(58,2,0.2))
	for x in [-21.8,35.8]:
		WorldGeometry.barrier(outdoor,Vector3(x,1,0),Vector3(0.2,2,34))
	var animation: PaperAnimationSet = load("res://assets/character/wilnas.tres")
	player = AnimatedPaperCharacter.new()
	player.name = "Player"
	player.animations = animation
	add_child(player)
	player.position = Vector3(-8,0.05,0)
	camera = Camera3D.new()
	add_child(camera)
	camera.position = Vector3(-5,7,11)
	camera.look_at(Vector3(-5,0.8,0))
	camera.fov = 40
	var sun := DirectionalLight3D.new()
	sun.name = "TemporaryLight"
	sun.rotation_degrees = Vector3(-45,-30,0)
	add_child(sun)

func check(condition: bool, label: String) -> void:
	if condition:
		print("PASS: ",label)
	else:
		failures += 1
		push_error("FAIL: "+label)

func paper_prop(parent: Node3D, kind: String, asset: String, at: Vector3, height: float) -> PaperObject3D:
	var node: PaperObject3D
	if kind == "cross":
		node = CrossPlaneObject.new()
	elif kind == "billboard":
		node = BillboardObject.new()
	else:
		node = PaperObject3D.new()
	node.name = asset.to_pascal_case()
	node.texture = load("res://assets/props/"+asset+".png")
	node.paper_height = height
	if asset in ["tree","tree_small","bush","rock","sign","item","grass","flowers"] and parent.name != "BackgroundForest":
		node.paper_edge = true
		node.baked_texture = load("res://assets/props/"+asset+"_edge.png")
		if asset in ["rock","item","grass","flowers"]:
			node.paper_edge_width = 1
			node.baked_edge_width = 1
	node.cast_shadow = asset in ["tree","tree_small","sign"] and at.z < 2.0 and parent.name != "BackgroundForest"
	node.wind_reaction = 0.3 if asset in ["grass","flowers","vine"] else 0.05
	node.occluder = at.z > 1.5 and height > 2.0
	parent.add_child(node)
	node.position = at
	if kind == "cross":
		node.rotation.y = 0.38
	return node

func build_forest() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 9027
	for i in 42:
		var x := rng.randf_range(-12.0,22.0)
		var z := rng.randf_range(1.8,5.5) * (-1.0 if i%2 == 0 else 1.0)
		paper_prop(outdoor,"billboard","flowers" if i%5 == 0 else "grass",Vector3(x,0,z),rng.randf_range(0.35,0.7))
	for i in 13:
		paper_prop(outdoor,"cross","tree" if i%2 == 0 else "tree_small",Vector3(-14+i*3,0,-4.5-(i%3)),4.0+(i%3)*0.6)
	for i in 7:
		paper_prop(outdoor,"cross","bush",Vector3(-11+i*5,0,2.7 if i%2 == 0 else -2.7),1.2)
	for x in [-11,-1,10,23]:
		paper_prop(outdoor,"paper","tree",Vector3(x,0,4.5),4.8)
	for i in 5:
		paper_prop(outdoor,"billboard","rock",Vector3(-9+i*7,0,-2),0.65)

func smoke() -> void:
	await get_tree().physics_frame
	if phase >= 2:
		var start := player.position
		player.use_override = true
		player.movement_override = Vector2.RIGHT
		for i in 20:
			await get_tree().physics_frame
		check(player.position.x > start.x+0.3,"3D player movement")
		check(player.clip == "Walk", "Walk clip")
		player.movement_override = Vector2.ZERO
		await get_tree().physics_frame
		await get_tree().physics_frame
		check(player.clip == "Idle", "Idle clip")
		check(absf(player.position.y) < 0.15,"ground contact")
	if phase >= 3:
		var cross_count := 0
		var billboard_count := 0
		for object in get_tree().get_nodes_in_group("paper_objects"):
			if object is CrossPlaneObject:
				cross_count += 1
				check(object.sprites.size() == 2,"cross plane pair")
			if object is BillboardObject:
				billboard_count += 1
		check(cross_count > 0 and billboard_count > 0,"Billboard + CrossPlane instantiated")
	if phase >= 4:
		check(paper_door.visuals.has_node("PaperBack") and paper_door.visuals.has_node("PaperEdges"),"PaperMesh front / back / thickness")
	if phase >= 5:
		var fast := StageMotionProfile.new()
		fast.duration = 0.06
		fast.sway_duration = 0.06
		await stage.play(&"Rise",rise_tree,fast).finished
		check(absf(rise_tree.rotation.x) < 0.01,"Stage Rise endpoint")
		await stage.play(&"Fall",rise_tree,fast).finished
		check(absf(rise_tree.rotation.x+PI*0.5) < 0.01,"Stage Fall endpoint")
		var landing := wire_sign.position
		await stage.play(&"DropFromWire",wire_sign,fast).finished
		check(wire_sign.position.is_equal_approx(landing) and absf(wire_sign.rotation.z) < 0.01,"Wire drop + settled sway")
	if phase >= 6:
		var previous := dof.focus_distance
		dof.apply(dof.stage_event,rise_tree)
		check(is_equal_approx(previous,dof.focus_distance),"Focus does not teleport on apply")
		await dof.blend.finished
		check(absf(dof.focus_distance-dof.depth_of(rise_tree)) < 0.7,"DOF interpolated target depth")
		check(camera_director.current == camera_director.exploration,"Camera profile binding")
	if phase >= 7:
		lighting.aim_at(rise_tree)
		await lighting.apply(lighting.stage_event).finished
		check(is_equal_approx(lighting.dramatic.light_energy,lighting.stage_event.dramatic_energy),"Dramatic lighting profile")
		await lighting.apply(lighting.outdoor_day).finished
		check(lighting.environment.fog_enabled and weather.strength > 0.3,"Fog + Wind active")
	if phase >= 8:
		await enter_indoor()
		await lighting.blend.finished
		check(is_indoor and indoor_root.visible and not outdoor.visible,"Outdoor to indoor transition")
		check(lighting.current.profile_name == "IndoorWarm" and lighting.local_light.light_energy > 1.0,"Indoor warm + window lighting")
		for cue in AudioDirector.CUES:
			audio.play(cue)
		check(audio.counts.size() == 6,"Six audio hooks")
	if phase >= 9:
		check(treasure_particles.amount <= 32 and outdoor.has_node("WaterPlane"),"Bounded Particle3D + water plane")
		await treasure_event()
		check(complete and item.visible and item.position.y > 1.5,"Treasure open + light + paper item popup")
		check(not busy and player.input_enabled and camera_director.current == camera_director.indoor,"Event returns to gameplay")
	if phase >= 10:
		var test_image := Image.create(16,16,false,Image.FORMAT_RGBA8)
		test_image.set_pixel(8,8,Color.RED)
		var source := ImageTexture.create_from_image(test_image)
		var outlined := PaperEdgeCache.get_outlined(source,2,Color.WHITE)
		check(outlined.get_image().get_pixel(10,8).a > 0.9 and outlined.get_image().get_pixel(8,8).r > 0.9,"Outline dilation preserves source")
		check(PaperEdgeCache.get_outlined(source,2,Color.WHITE) == outlined,"Outline cache reuse")
		var occluder := PaperObject3D.new()
		occluder.texture = load("res://assets/props/tree.png")
		occluder.paper_height = 4
		occluder.occluder = true
		add_child(occluder)
		occluder.global_position = player.global_position+Vector3(0,0,1.0)
		await get_tree().create_timer(0.5).timeout
		check(occluder.fade_amount < 0.5,"Foreground obstruction fades")
		occluder.position.x += 20
		await get_tree().create_timer(0.5).timeout
		check(occluder.fade_amount > 0.95,"Occluder opacity restores")
		occluder.queue_free()
		player.position = Vector3(50,0,3.4)
		player.movement_override = Vector2.DOWN
		await get_tree().create_timer(0.5).timeout
		check(player.position.z < 4.1,"Indoor boundary collision")
		player.movement_override = Vector2.ZERO
	print("PHASE ",phase," ","PASS" if failures == 0 else "FAIL")
	get_tree().quit(1 if failures else 0)
