"""Local delivery audit; no network, source assets remain untouched."""
from pathlib import Path
import hashlib,json,re,zipfile
from PIL import Image
root=Path(__file__).resolve().parents[1]
excluded={'.godot','__pycache__','exports','edge-cdp-profile','edge-https-profile','edge-profile'}
def deliverable(p):
    return p.is_file() and not excluded.intersection(p.relative_to(root).parts) and p.suffix!='.pid'
files=[p for p in root.rglob('*') if deliverable(p)]
text_files=[p for p in files if p.suffix in {'.gd','.gdshader','.tscn','.tres','.json','.ps1','.py','.md','.godot'}]
missing=[]
secret=[]
for p in text_files:
    text=p.read_text(encoding='utf-8-sig')
    for ref in re.findall(r'res://([^"\n]+)',text) if p.suffix in {'.gd','.gdshader','.tscn','.tres','.godot'} else []:
        if '"' not in ref and not any(x in ref for x in ['`',' ',"'",'+']):
            if not (root/ref).exists() and not ref.endswith('/'):
                missing.append((str(p.relative_to(root)),ref))
    if re.search(r'-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}',text) and p.name!='audit_delivery.py':
        secret.append(str(p.relative_to(root)))
assert not missing,missing
assert not secret,secret
sheet=Image.open(root/'assets/character/walk.png')
assert sheet.size==(640,1040)
assert all(sheet.crop(((i%5)*128,(i//5)*208,(i%5+1)*128,(i//5+1)*208)).getbbox() for i in range(25))
assert len(list((root/'validation').glob('0[1-6]-*.png')))==6
tour=json.loads((root/'validation/tour-report.json').read_text())
assert tour['complete'] and tour['dof_enabled'] and 30<=tour['seconds']<=60
assert all(k in tour['audio_hooks'] for k in ['StageRise','StageFall','WireMove','Door','Footstep','Treasure'])
manifest=json.loads((root/'assets/manifest.json').read_text(encoding='utf-8'))
manifest=[x for x in manifest if not x.get('derived')]
manifest.append({'derived':True,'source':'User attachment: ウィルナス-walk.zip','output':'assets/character/source_walk.png','grid':[5,5],'cell':[256,256]})
manifest.append({'derived':True,'source':'assets/character/source_walk.png','output':['assets/character/walk.png','assets/character/walk_edge.png'],'crop_per_cell':[64,20,192,228],'edge_pixels':2})
for p in sorted((root/'assets/props').glob('*_edge.png')):
    manifest.append({'derived':True,'source':'assets/props/'+p.name.replace('_edge',''),'output':str(p.relative_to(root)).replace('\\','/'),'operation':'alpha dilation, baked outline'})
(root/'assets/manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
report={'status':'PASS','text_files_checked':len(text_files),'missing_static_resources':missing,'high_confidence_secret_candidates':secret,'character_frames':25,'captures':6,'tour_seconds':tour['seconds'],'git':'SKIPPED: new non-repository folder','writes':'new PaperHD2D directory only; source archives preserved'}
(root/'validation/delivery-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
entries=[]
for p in sorted(root.rglob('*')):
    if not deliverable(p) or p.name=='files.sha256':continue
    if p.suffix=='.log' and p.name not in ['common-verify.log','verify-import.log','verify-smoke.log','compatibility.log','editor-gallery.log']:continue
    entries.append((p,hashlib.sha256(p.read_bytes()).hexdigest()))
(root/'validation/files.sha256').write_text('\n'.join(h+'  '+str(p.relative_to(root)).replace('\\','/') for p,h in entries)+'\n',encoding='utf-8')
archive=root.parent/'PaperHD2D-MVP.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,6) as z:
    for p,_ in entries:z.write(p,'PaperHD2D/'+str(p.relative_to(root)).replace('\\','/'))
    z.write(root/'validation/files.sha256','PaperHD2D/validation/files.sha256')
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print(json.dumps(report))
print('ZIP PASS:',archive.name,'files=',len(entries)+1,'MB=',round(archive.stat().st_size/1e6,2))
