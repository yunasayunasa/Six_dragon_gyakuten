from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw
import json
root=Path(__file__).resolve().parents[1]
source=Image.open(root/'assets/character/source_walk.png').convert('RGBA')
# Identical crop across all 25 cells: preserve horizontal registration and foot contacts.
sheet=Image.new('RGBA',(128*5,208*5))
for i in range(25):
    frame=source.crop(((i%5)*256+64,(i//5)*256+20,(i%5)*256+192,(i//5)*256+228))
    sheet.paste(frame,((i%5)*128,(i//5)*208))
sheet.save(root/'assets/character/walk.png')
edge=Image.new('RGBA',sheet.size,(247,233,195,0))
edge.putalpha(sheet.getchannel('A').filter(ImageFilter.MaxFilter(5)))
edge.alpha_composite(sheet);edge.save(root/'assets/character/walk_edge.png')
p=root/'assets/fx';p.mkdir(exist_ok=True,parents=True)
shadow=Image.new('RGBA',(128,128))
d=ImageDraw.Draw(shadow);d.ellipse((16,30,112,98),fill=(16,26,27,100))
shadow=shadow.filter(ImageFilter.GaussianBlur(12));shadow.save(p/'contact_shadow.png')
