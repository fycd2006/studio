import re

with open('src/components/AdminSection.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Dark mode prominent line: fix invalid Tailwind class dark:border-white/[0.06]/50 -> dark:border-white/[0.06]
text = text.replace('dark:border-white/[0.06]/50', 'dark:border-white/[0.06]')

# 2. Qty special color remove:
# className="text-center font-fira-code font-bold text-orange-600 dark:text-amber-500"
text = text.replace('className=\"text-center font-fira-code font-bold text-orange-600 dark:text-amber-500\"', 'className=\"text-center font-fira-code font-bold text-slate-700 dark:text-slate-200\"')

# 3. Add borders to other grids. 
# Right now 	h has order-b, but no order-r or order-l. Let's add order-r border-slate-300 dark:border-white/[0.06] to all th and td.
# Wait, let's just replace all order-stone-200 with order-slate-300 first to make them clearer in light mode.
text = text.replace('border-stone-200', 'border-slate-300')
text = text.replace('border-stone-100', 'border-slate-300')

# Let's do a more robust approach for td/th:
# Find all 	h className="..."
def add_border_r_to_tag(tag, content):
    return re.sub(tag + r' className="([^"]+)"', 
           lambda m: tag + ' className="' + m.group(1) + (' border-r border-slate-300 dark:border-white/[0.06]' if 'border-r' not in m.group(1) else '') + '"', 
           content)

text = add_border_r_to_tag('<th', text)
text = add_border_r_to_tag('<td', text)

with open('src/components/AdminSection.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Execution successful')
