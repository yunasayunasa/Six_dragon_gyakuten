from pathlib import Path
root=Path(__file__).resolve().parents[1]
for directory in ['core/world','core/paper','core/character','core/architecture','core/interaction','presentation/camera','presentation/dof','presentation/lighting','presentation/weather','presentation/stage','presentation/vfx','presentation/audio','presentation/occlusion','presentation/transition','optional/paper_gameplay','genres/adv','genres/rpg','genres/action','assets/character','assets/props','assets/architecture','assets/ground','assets/background','assets/fx','assets/audio','demo/forest','demo/house','demo/indoor','game','validation']:
    p=root/directory;p.mkdir(parents=True,exist_ok=True)
    if not any(p.iterdir()): (p/'.gitkeep').touch()
