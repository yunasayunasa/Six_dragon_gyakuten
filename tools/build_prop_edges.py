from pathlib import Path
from PIL import Image,ImageFilter
root=Path(__file__).resolve().parents[1]
for name in ['tree','tree_small','bush','rock','sign','item','grass','flowers']:
    source=Image.open(root/'assets/props'/f'{name}.png').convert('RGBA')
    edge=Image.new('RGBA',source.size,(237,224,184,0))
    width=5 if name in ['tree','tree_small','bush','sign'] else 3
    edge.putalpha(source.getchannel('A').filter(ImageFilter.MaxFilter(width)))
    edge.alpha_composite(source)
    edge.save(root/'assets/props'/f'{name}_edge.png')
print('PASS: 8 cached prop outlines; original alpha PNGs preserved')
