from PIL import Image
import os

# 로고 이미지 열기
logo_path = r"C:\Users\parkyh\Desktop\AlldayPrice\public\logo.jpg"
img = Image.open(logo_path)

# 정사각형으로 크롭 (중앙 기준)
width, height = img.size
size = min(width, height)
left = (width - size) // 2
top = (height - size) // 2
right = left + size
bottom = top + size
img_square = img.crop((left, top, right, bottom))

# icons 폴더 생성
icons_dir = r"C:\Users\parkyh\Desktop\AlldayPrice\public\icons"
os.makedirs(icons_dir, exist_ok=True)

# PWA 아이콘 사이즈
sizes = [72, 96, 128, 144, 152, 192, 384, 512]

for s in sizes:
    resized = img_square.resize((s, s), Image.Resampling.LANCZOS)
    # PNG로 저장 (투명 배경 지원)
    resized_rgb = resized.convert('RGB')
    resized_rgb.save(os.path.join(icons_dir, f"icon-{s}x{s}.png"), "PNG")
    print(f"Created icon-{s}x{s}.png")

# favicon.ico 생성 (16, 32, 48 사이즈 포함)
favicon_sizes = [(16, 16), (32, 32), (48, 48)]
favicon_images = [img_square.resize(size, Image.Resampling.LANCZOS).convert('RGB') for size in favicon_sizes]
favicon_images[0].save(
    r"C:\Users\parkyh\Desktop\AlldayPrice\public\favicon.ico",
    format='ICO',
    sizes=favicon_sizes
)
print("Created favicon.ico")

# Apple Touch Icon (180x180)
apple_icon = img_square.resize((180, 180), Image.Resampling.LANCZOS).convert('RGB')
apple_icon.save(os.path.join(icons_dir, "apple-touch-icon.png"), "PNG")
print("Created apple-touch-icon.png")

print("\n✅ All icons created successfully!")
