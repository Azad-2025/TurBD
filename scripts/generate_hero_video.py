import os
import subprocess
import math

src_img = 'src/assets/images/night_turf_match_1789901241420.jpg'
if not os.path.exists(src_img):
    src_img = 'public/hero.jpg'

os.system(f'cp {src_img} public/hero.jpg')
os.system(f'cp {src_img} public/images/turf_hero_banner.jpg')

# 6 seconds @ 30fps = 180 frames
# Smooth camera motion:
# zoom(t) = 1.0 + 0.07 * (1 - cos(2 * pi * t / 6)) / 2
# x(t) = iw/2 - (iw/zoom/2) + sin(2 * pi * t / 6) * 35
# y(t) = ih/2 - (ih/zoom/2) + cos(2 * pi * t / 6) * 10
# Because all trigonometric functions complete full cycles at t=6, frame 0 == frame 180!
# Perfect, buttery smooth infinite loop without any jump cut.

cmd_mp4 = [
    'ffmpeg', '-y',
    '-loop', '1',
    '-i', 'public/hero.jpg',
    '-vf', (
        "scale=1920:1080,"
        "zoompan=z='1.0+0.07*(1-cos(2*3.1415926*in/180))/2':"
        "x='iw/2-(iw/zoom/2)+sin(2*3.1415926*in/180)*30':"
        "y='ih/2-(ih/zoom/2)+cos(2*3.1415926*in/180)*12':"
        "d=180:s=1280x720:fps=30,"
        "eq=contrast=1.08:brightness=-0.02:saturation=1.12,"
        "format=yuv420p"
    ),
    '-t', '6',
    '-c:v', 'libx264',
    '-profile:v', 'main',
    '-preset', 'fast',
    '-crf', '22',
    '-movflags', '+faststart',
    'public/hero.mp4'
]

print("Generating public/hero.mp4...")
res = subprocess.run(cmd_mp4, capture_output=True, text=True)
if res.returncode == 0:
    print("SUCCESS: public/hero.mp4 created!")
else:
    print("ERROR:", res.stderr[-400:])

# Also generate webm for modern browsers
cmd_webm = [
    'ffmpeg', '-y',
    '-i', 'public/hero.mp4',
    '-c:v', 'libvpx-vp9',
    '-b:v', '0',
    '-crf', '28',
    '-deadline', 'realtime',
    '-cpu-used', '4',
    'public/hero.webm'
]
print("Generating public/hero.webm...")
res_webm = subprocess.run(cmd_webm, capture_output=True, text=True)
if res_webm.returncode == 0:
    print("SUCCESS: public/hero.webm created!")
else:
    print("WebM notice:", res_webm.stderr[-200:])
