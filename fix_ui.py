import os
import re

directories = ["src/app", "src/components"]

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        changed = False

        # update text colors to warm gray
        new_content = re.sub(r'\btext-(?:slate|stone|gray)-900\b', 'text-[#2C2A28]', content)
        # Update background to warm beige #FBF9F6
        new_content = re.sub(r'\bbg-(?:stone|slate|gray)-50\b', 'bg-[#FBF9F6]', new_content)
        
        # White card shadow & borders
        def replace_class(match):
            cls_str = match.group(1)
            original_cls = cls_str
            if 'bg-white' in cls_str:
                # Add shadow
                if 'shadow-[0_8px_30px_rgba(140,120,100,0.05)]' not in cls_str:
                    cls_str = re.sub(r'\bshadow-(?:sm|md|lg|xl)\b(?!\s*dark:)', '', cls_str)
                    if 'shadow-[0' not in cls_str:
                        cls_str += ' shadow-[0_8px_30px_rgba(140,120,100,0.05)]'
                
                # Remove border lines
                cls_str = re.sub(r'\bborder-none-(?:stone|slate|gray)-\d+(?:\/\d+)?\b', '', cls_str)
                cls_str = re.sub(r'\bborder-(?:stone|slate|gray|neutral)-\d+(?:\/\d+)?\b(?!\s*dark:|\s*focus:)', '', cls_str)
                
                # Turn generic border into border-none
                cls_str = re.sub(r'\bborder\b(?![-a-zA-Z])', 'border-none', cls_str)
                cls_str = re.sub(r'\s+', ' ', cls_str).strip()
            
            return 'className="' + cls_str + '"'

        new_content = re.sub(r'className="([^"]+)"', replace_class, new_content)

        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
    except Exception as e:
        print(f"Failed to process {filepath}: {e}")

for d in directories:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    process_file(os.path.join(root, file))
print("Styling update finished.")
