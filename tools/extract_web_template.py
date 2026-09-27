"""Fetch only the official Godot 4.7.2 web template entries via HTTP ranges."""
from pathlib import Path
import struct,subprocess,tempfile,zlib,sys
root=Path(__file__).resolve().parents[1]
base=root/'.godot'/'web_templates';base.mkdir(parents=True,exist_ok=True)
length=1281349702
script=root/'tools'/'download_range.ps1'
def fetch(start,end):
    with tempfile.NamedTemporaryFile(dir=base,delete=False) as f:path=Path(f.name)
    try:
        command=['pwsh','-NoProfile','-File',str(script),'-Start',str(start),'-End',str(end),'-Output',str(path)]
        r=subprocess.run(command,capture_output=True,text=True,timeout=180)
        if r.returncode:raise RuntimeError(r.stderr or r.stdout)
        return path.read_bytes()
    finally:path.unlink(missing_ok=True)
tail=fetch(length-65536,length-1)
e=tail.rfind(b'PK\x05\x06')
assert e>=0,'ZIP end record missing'
_,_,_,_,entries,central_size,central_offset,comment=struct.unpack_from('<4s4H2LH',tail,e)
print('Central directory:',entries,'entries',central_size,'bytes')
central=fetch(central_offset,central_offset+central_size-1)
selected=[];offset=0
while offset<len(central):
    assert central[offset:offset+4]==b'PK\x01\x02','Bad central entry'
    vals=struct.unpack_from('<4s6H3L5H2L',central,offset)
    method,crc,comp,uncomp,namelen,extralen,commentlen,localoffset=vals[4],vals[7],vals[8],vals[9],vals[10],vals[11],vals[12],vals[-1]
    name=central[offset+46:offset+46+namelen].decode('utf-8',errors='replace')
    if 'web' in name.lower() and name.endswith('.zip') and ('release' in name or 'debug' in name):selected.append((name,method,crc,comp,uncomp,localoffset))
    offset+=46+namelen+extralen+commentlen
print('Candidates:',[(x[0],round(x[3]/1e6,1)) for x in selected])
assert selected,'Web template not found in official archive'
for name,method,crc,comp,uncomp,localoffset in selected:
    header=fetch(localoffset,localoffset+29)
    assert header[:4]==b'PK\x03\x04'
    namelen,extralen=struct.unpack_from('<HH',header,26)
    start=localoffset+30+namelen+extralen
    compressed=fetch(start,start+comp-1)
    data=zlib.decompress(compressed,-15) if method==8 else compressed if method==0 else None
    assert data is not None and len(data)==uncomp and zlib.crc32(data)==crc,'Template CRC/size failed'
    target=base/Path(name).name
    target.write_bytes(data)
    print('PASS:',target.name,len(data),'bytes, CRC verified')
