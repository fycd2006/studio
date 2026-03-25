import re

with open('src/components/AdminSection.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Title formatting. Remove '01 / ', '02 / ', '03 / '
text = text.replace('01 / 活動組 - 教案道具確認', '活動組 - 教案道具確認')
text = text.replace('02 / 教學組 - 教案道具確認', '教學組 - 教案道具確認')
text = text.replace('03 / 營期其他物品確認', '營期其他物品確認')

# 2. Button move. First find the button in the header.
btn_pattern = r'''\s*\{!isLocked && \(\s*<Button\s*onClick=\{handleAddCampItem\}\s*size="sm"\s*className="[^"]+"\s*>\s*<Plus className="h-3\.5 w-3\.5" /> \{t\('NEW_PROJECT'\)\}\s*</Button>\s*\)\}\s*'''
text = re.sub(btn_pattern, '', text)

# Insert it at the bottom of the table
table_end_pattern = r'''(</tbody>\s*</table>\s*</div>\s*</div>)'''

bottom_btn = '''
            <tfoot>
              <tr>
                <td colSpan={isLocked ? 6 : 7} className="px-4 py-3 bg-stone-50 dark:bg-white/[0.02] border-t border-slate-300 dark:border-white/[0.06]">
                  {!isLocked && (
                    <Button
                      onClick={handleAddCampItem}
                      size="sm"
                      variant="ghost"
                      className="w-full h-10 border border-dashed border-slate-300 dark:border-white/[0.1] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all gap-2"
                    >
                      <Plus className="h-4 w-4" /> 新增道具
                    </Button>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>'''

text = re.sub(table_end_pattern, bottom_btn, text)

with open('src/components/AdminSection.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Execution successful')
