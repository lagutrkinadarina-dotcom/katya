"""Package the production build and Windows local browser launcher.
Run after npm run build: python scripts/package-game.py
"""
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SERVER = "$ErrorActionPreference = 'Stop'\n$root = $PSScriptRoot\n$listener = New-Object System.Net.HttpListener\n$listener.Prefixes.Add('http://localhost:8765/')\ntry {\n $listener.Start()\n Start-Process 'http://localhost:8765/'\n Write-Host 'Game running. Keep this window open. Close it to stop.'\n while ($listener.IsListening) {\n  $context = $listener.GetContext()\n  try {\n   $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')\n   if (!$relative) { $relative = 'index.html' }\n   $path = [IO.Path]::GetFullPath((Join-Path $root $relative))\n   if (!$path.StartsWith($root + [IO.Path]::DirectorySeparatorChar) -or !(Test-Path -LiteralPath $path -PathType Leaf)) {\n    $context.Response.StatusCode = 404\n   } else {\n    $types = @{'.html'='text/html; charset=utf-8';'.js'='text/javascript';'.css'='text/css';'.png'='image/png';'.glb'='model/gltf-binary';'.json'='application/json'}\n    $type = $types[[IO.Path]::GetExtension($path)]\n    if (!$type) { $type = 'application/octet-stream' }\n    $context.Response.ContentType = $type\n    $bytes = [IO.File]::ReadAllBytes($path)\n    $context.Response.ContentLength64 = $bytes.Length\n    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)\n   }\n  } finally { $context.Response.Close() }\n }\n} finally { $listener.Close() }\n"
LAUNCHER = '@echo off\r\ncd /d "%~dp0"\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Game.ps1"\r\npause\r\n'


def package():
    build = ROOT / 'dist'
    if not (build / 'index.html').is_file():
        raise SystemExit('Run npm run build first.')
    destination = ROOT / 'releases' / 'night-shift-game.zip'
    destination.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in sorted(build.rglob('*')):
            relative = path.relative_to(build)
            # Editable Blender/FBX sources are not loaded by the game.
            if path.is_file() and 'models' not in relative.parts:
                archive.write(path, 'night-shift/' + relative.as_posix())
        archive.write(ROOT / 'public/models/source-preparation/ATTRIBUTION.md', 'night-shift/licenses/ATTRIBUTION.md')
        archive.writestr('night-shift/Start-Game.ps1', SERVER)
        archive.writestr('night-shift/Start-Game.bat', LAUNCHER)
        archive.writestr('night-shift/README.txt',
            'Ночная смена — игровая сборка\n\n'
            'Распакуйте архив полностью. На Windows запустите Start-Game.bat.\n'
            'Игра откроется в браузере. Окно запуска оставьте открытым.\n'
            'Для остановки закройте окно запуска.\n\n'
            'WASD — движение, мышь — обзор, E — взаимодействие, Esc — меню.\n'
            'Требуется настольный браузер с WebGL.\n'
            'На других системах: python3 -m http.server 8765 из папки игры, затем http://localhost:8765/.\n')
    with zipfile.ZipFile(destination) as archive:
        assert archive.testzip() is None, 'Archive integrity failure'
        names = set(archive.namelist())
        for name in names:
            if name.endswith(('.js', '.html', '.css')):
                for asset in re.findall(r'/assets/[A-Za-z0-9_.-]+', archive.read(name).decode()):
                    assert 'night-shift' + asset in names, f'Missing bundled asset {asset}'
    print(f'Packaged {destination.name}: {destination.stat().st_size:,} bytes')


if __name__ == '__main__':
    package()
