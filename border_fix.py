import os
import re

count = 0
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            def replacer(match):
                tag_start = match.group(1)
                tag_name = match.group(2)
                cls = match.group(3)
                
                # skip table elements
                if tag_name.lower() in ['table', 'th', 'td', 'tr', 'thead', 'tbody']:
                    return match.group(0)
                
                # remove borders
                new_cls = re.sub(r'\S*border\S*', '', cls) 
                new_cls = re.sub(r'\S*ring\S*', '', new_cls) 
                new_cls = new_cls.replace('border-none', '').replace('border-0', '')
                
                # add border-none and some shadow if background exists
                new_cls += ' border-none'
                if ('bg-white' in new_cls or 'bg-slate-' in new_cls or 'bg-stone-' in new_cls) and 'shadow' not in new_cls and 'bg-transparent' not in new_cls:
                    if tag_name.lower() in ['button', 'input', 'select']:
                        new_cls += ' shadow-sm hover:shadow-md transition-shadow'
                    else:
                        new_cls += ' shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]'
                
                new_cls = ' '.join(new_cls.split())
                return f"{tag_start}className=\"{new_cls}\""
                
            new_content = re.sub(r'(<([a-zA-Z0-9]+)[^>]*?)className="([^"]+)"', replacer, content)
            
            if new_content != content:
                count += 1
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)

print(f"Modified {count} files")
