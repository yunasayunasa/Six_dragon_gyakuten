class_name PaperEdgeCache
extends RefCounted
## Load-time CPU outline. Shared by texture/width/color; never evaluated per frame.
## A build pipeline may populate baked_texture on PaperObject3D to bypass this.
static var textures: Dictionary = {}

static func get_outlined(source: Texture2D, width: int, color: Color) -> Texture2D:
	if source == null or width <= 0:
		return source
	var key := "%s:%s:%s" % [source.get_rid(), width, color.to_html()]
	if textures.has(key):
		return textures[key]
	var original := source.get_image()
	original.convert(Image.FORMAT_RGBA8)
	var mask := original.duplicate() as Image
	for y in mask.get_height():
		for x in mask.get_width():
			var c := color
			c.a *= mask.get_pixel(x, y).a
			mask.set_pixel(x, y, c)
	var result := Image.create(original.get_width(), original.get_height(), false, Image.FORMAT_RGBA8)
	var rect := Rect2i(Vector2i.ZERO, original.get_size())
	for offset in [Vector2i(-width, 0), Vector2i(width, 0), Vector2i(0, -width), Vector2i(0, width), Vector2i(-width,-width), Vector2i(width,width), Vector2i(width,-width), Vector2i(-width,width)]:
		result.blend_rect(mask, rect, offset)
	result.blend_rect(original, rect, Vector2i.ZERO)
	var output := ImageTexture.create_from_image(result)
	textures[key] = output
	return output
