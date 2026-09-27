class_name PaperAnimationSet
extends Resource

@export var sheet: Texture2D
@export var edged_sheet: Texture2D
@export var columns: int = 5
@export var rows: int = 5
@export var fps: float = 14.0
## Extensible named clips. Idle is a held pose; only Walk source exists in the supplied art.
@export var clips: Dictionary = {"Idle": [2], "Walk": [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]}
