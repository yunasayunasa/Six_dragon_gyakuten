"""Run Godot import + bounded smoke. Preserve diagnostics and reject script errors even at exit 0."""
from pathlib import Path
import subprocess,sys,re,time,json,os
root=Path(__file__).resolve().parents[1]
godot=os.environ.get('GODOT_EXE',str(Path.home()/'AppData/Local/Programs/Godot/Godot_v4.7.2-stable_win64_console.exe'))
phase=sys.argv[1] if len(sys.argv)>1 else '10'
started=time.time()
for label,args in [('import',['--headless','--editor','--import','--quit']),('smoke',['--headless','--','--smoke','--phase='+phase])]:
    run=subprocess.run([godot,'--path',str(root),*args],capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=90)
    log=re.sub(r'\x1b\[[0-9;]*m','',run.stdout+'\n'+run.stderr)
    (root/'validation'/f'phase-{phase}-{label}.log').write_text(log,encoding='utf-8')
    bad=bool(re.search(r'(SCRIPT ERROR|ERROR:|Parse Error|FAIL:)',log))
    diagnostics=[l for l in log.splitlines() if any(x in l for x in ('PASS','FAIL','ERROR','WARNING',' at:','GDScript','Backtrace'))]
    print(f'{label}: exit={run.returncode}, errors={bad}')
    if diagnostics: print('\n'.join(diagnostics))
    if run.returncode or bad:
        print(log[-14000:]);sys.exit(run.returncode or 1)
result={'phase':int(phase),'status':'PASS','seconds':round(time.time()-started,2),'scope':'requested phase only; headless functional check, not visual acceptance'}
(root/'validation'/f'phase-{phase}.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))
