class_name ProximityInteraction
extends Node3D
## Gameplay request boundary only. Presentation is owned by the demo coordinator.
signal requested
@export var radius: float = 2.2
@export var prompt: String = "Interact"
@export var enabled: bool = true

func available_for(actor: Node3D) -> bool:
	return enabled and global_position.distance_to(actor.global_position) <= radius

func request(actor: Node3D) -> bool:
	if not available_for(actor):
		return false
	requested.emit()
	return true
