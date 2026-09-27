class_name WeatherProfile
extends Resource

@export_enum("Clear","Wind","Fog","Rain","Snow","Storm") var profile_name: String = "Clear"
@export_range(0.0,1.0) var wind: float = 0.0
@export var blend_seconds: float = 1.5
