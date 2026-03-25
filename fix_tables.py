import re

with open('src/components/AdminSection.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix PropInput generic background/focus
text = text.replace('hover:bg-white', 'hover:bg-stone-50')
text = text.replace('dark:hover:bg-slate-800', 'dark:hover:bg-white/[0.06]')
text = text.replace('focus:bg-white dark:focus:bg-slate-800', 'focus:bg-stone-50 dark:focus:bg-white/[0.08]')
text = text.replace('dark:hover:border-slate-700', 'dark:hover:border-white/[0.12]')

# First table headers
text = text.replace('<th className=\"w-[18%] px-4 py-3 border-b border-stone-200 dark:border-white/[0.06]\">{t(\'PROP_NAME\')}</th>', '<th className=\"w-[16%] px-4 py-3 border-b border-stone-200 dark:border-white/[0.06] min-w-[100px]\">{t(\'PROP_NAME\')}</th>')
text = text.replace('<th className=\"w-[18%] px-4 py-3 border-b border-stone-200 dark:border-white/[0.06]\">{t(\'OP_REMARKS\')}</th>', '<th className=\"w-[16%] px-4 py-3 border-b border-stone-200 dark:border-white/[0.06] min-w-[100px]\">{t(\'OP_REMARKS\')}</th>')
text = text.replace('<th className=\"w-[5%] px-4 py-3 text-center border-b border-stone-200 dark:border-white/[0.06]\">{t(\'PACKED\')}</th>', '<th className=\"w-[7%] px-4 py-3 text-center border-b border-stone-200 dark:border-white/[0.06] whitespace-nowrap\">{t(\'PACKED\')}</th>')
text = text.replace('<th className=\"w-[5%] px-4 py-3 text-center border-b border-stone-200 dark:border-white/[0.06]\">{t(\'CHECKED\')}</th>', '<th className=\"w-[7%] px-4 py-3 text-center border-b border-stone-200 dark:border-white/[0.06] whitespace-nowrap\">{t(\'CHECKED\')}</th>')
text = text.replace('<th className=\"w-[8%] px-4 py-3 border-b border-stone-200 dark:border-white/[0.06]\">Qty</th>', '<th className=\"w-[8%] px-4 py-3 border-b border-stone-200 dark:border-white/[0.06] whitespace-nowrap\">Qty</th>')
text = text.replace('<th className=\"w-[8%] px-4 py-3 border-b border-stone-200 dark:border-white/[0.06]\">Unit</th>', '<th className=\"w-[8%] px-4 py-3 border-b border-stone-200 dark:border-white/[0.06] whitespace-nowrap\">Unit</th>')

# Second table headers
text = text.replace('<th className=\"w-[11%] px-4 py-3 text-center border-b border-stone-200 dark:border-white/[0.06]\">{t(\'PACKED\')}</th>', '<th className=\"w-[12%] px-4 py-3 text-center border-b border-stone-200 dark:border-white/[0.06] whitespace-nowrap\">{t(\'PACKED\')}</th>')
text = text.replace('<th className=\"w-[11%] px-4 py-3 text-center border-b border-stone-200 dark:border-white/[0.06]\">{t(\'CHECKED\')}</th>', '<th className=\"w-[12%] px-4 py-3 text-center border-b border-stone-200 dark:border-white/[0.06] whitespace-nowrap\">{t(\'CHECKED\')}</th>')

# Table borders in light mode
text = text.replace('border-stone-100', 'border-stone-200')

with open('src/components/AdminSection.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Execution successful')
