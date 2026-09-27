from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import zipfile, json, io

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / '総合アセット/drive-download-20260926T065228Z-1-001'
manifest=[]
def take(zip_name, member, dest, limit=1024):
    z=zipfile.ZipFile(SOURCE/zip_name)
    im=Image.open(io.BytesIO(z.read(member))).convert('RGBA')
    im.thumbnail((limit,limit))
    path=ROOT/'assets'/dest
    path.parent.mkdir(parents=True,exist_ok=True)
    im.save(path)
    manifest.append(dict(source=zip_name,member=member,output='assets/'+dest,size=im.size))
    return im

for member,dest in [('41_grass_small.png','grass'),('42_flower_patch_small.png','flowers'),('35_sign_hanging_small.png','sign'),('50_vine_hanging_small.png','vine'),('48_crystal_small_blue.png','item'),('52_window_outside_forest.png','window'),('03_book_stack_small.png','books'),('17_lamp_small.png','lamp')]:
    take('Billboard_Assets_55_Transparent_PNG.zip',member,'props/'+dest+'.png',768)
for member,dest in [('07_tree_medium_A.png','tree'),('05_tree_small_A.png','tree_small'),('01_bush_large_A.png','bush'),('16_rock_cluster_A.png','rock')]:
    take('Cross_Plane_Priority12_Transparent_PNG.zip',member,'props/'+dest+'.png')
for member,dest in [('T01_village_dirt.png','dirt'),('T03_forest_ground.png','grass'),('T07_ship_deck.png','wood')]:
    take('HD2D_Seamless_Priority18_Part1.zip','Seamless/'+member,'ground/'+dest+'.png')
take('HD2D_Decals_Priority18.zip','Decals/D02_moss.png','ground/moss.png',512)
z=zipfile.ZipFile(r'C:\Users\guestuser\.codex\codex-remote-attachments\01a0e2e1-f547-7da3-8d0d-8359e95f4a17\D5856040-A91A-4CA0-BD12-4B2C98C2FAF2\1-ウィルナス-walk.zip')
im=Image.open(io.BytesIO(z.read(z.namelist()[0]))).convert('RGBA')
(ROOT/'assets/character').mkdir(parents=True,exist_ok=True)
im.save(ROOT/'assets/character/source_walk.png')
print('CHARACTER',im.size)
thumbs=[]
for p in (ROOT/'assets').rglob('*.png'):
    im=Image.open(p).convert('RGBA'); im.thumbnail((180,160))
    tile=Image.new('RGB',(210,190),'#57636a'); tile.paste(im,((210-im.width)//2,0),im)
    ImageDraw.Draw(tile).text((8,168),p.stem,fill='white'); thumbs.append(tile)
sheet=Image.new('RGB',(210*5,190*((len(thumbs)+4)//5)),'#283139')
for i,t in enumerate(thumbs):sheet.paste(t,((i%5)*210,(i//5)*190))
sheet.save(ROOT/'validation/asset_contact_sheet.jpg')
(ROOT/'assets/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
