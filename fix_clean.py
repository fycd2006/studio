import os
import re

directories = ["src/app", "src/components"]

for d in directories:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    filepath = os.path.join(root, file)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()

                    new_content = re.sub(r'\bdark:\s+', '', content)
                    new_content = re.sub(r'\bhover:\s+', '', new_content)
                    new_content = re.sub(r'\bsm:\s+', '', new_content)
                    new_content = re.sub(r'\bmd:\s+', '', new_content)
                    new_content = re.sub(r'\bborder-none-[a-zA-Z0-9/-]+\b', '', new_content)

                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Cleaned {filepath}")
print("Cleanup finished.")
