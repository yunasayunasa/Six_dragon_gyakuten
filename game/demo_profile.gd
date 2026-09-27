class_name DemoProfile
extends Resource

@export var rise_trigger_x: float = -4.2
@export var wire_trigger_x: float = 3.0
@export var interaction_radius: float = 2.5
@export var event_hold_seconds: float = 1.0
@export var treasure_hold_seconds: float = 2.3
@export var auto_walk_speed: float = 2.1
@export var outdoor_waypoints := PackedVector3Array([Vector3(-3.7,0,0),Vector3(3.5,0,0),Vector3(15.8,0,0.4)])
@export var indoor_waypoint := Vector3(51.6,0,-0.6)
