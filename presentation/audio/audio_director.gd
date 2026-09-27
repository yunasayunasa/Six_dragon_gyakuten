class_name AudioDirector
extends Node

signal cue_requested(cue: StringName, world_position: Vector3)
const CUES := [&"StageRise",&"StageFall",&"WireMove",&"Door",&"Footstep",&"Treasure"]
@export var streams: Dictionary = {}
var counts: Dictionary = {}

func play(cue: StringName, at: Vector3 = Vector3.ZERO) -> void:
	if cue not in CUES:
		push_warning("Unknown audio cue: "+cue)
		return
	counts[cue] = int(counts.get(cue,0))+1
	cue_requested.emit(cue,at)
	if streams.get(cue) is AudioStream:
		var voice := AudioStreamPlayer3D.new()
		voice.stream = streams[cue]
		add_child(voice)
		voice.global_position = at
		voice.finished.connect(voice.queue_free)
		voice.play()
