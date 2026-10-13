from pathlib import Path
import json, zipfile, math
from pptx import Presentation
from PIL import Image, ImageDraw, ImageFont
from jsonschema import Draft202012Validator

ROOT=Path(__file__).parent
deck=ROOT/'弈有章法_金铲铲定阵与运营课_v1.pptx'
slides=json.loads((ROOT/'slides.json').read_text())
prs=Presentation(deck)
assert len(prs.slides)==len(slides)==34
fontpath='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
def font(size):return ImageFont.truetype(fontpath,size)
def wrap(text,f,width):
    lines=[]
    for para in text.split('\n'):
        current=''
        for c in para:
            if current and f.getlength(current+c)>width:
                lines.append(current);current=c
            else:current+=c
        lines.append(current)
    return lines

warnings=[]
for i,s in enumerate(prs.slides):
    assert slides[i]['notes'] in s.notes_slide.notes_text_frame.text
    for shape in s.shapes:
        assert shape.left>=0 and shape.top>=0
        assert shape.left+shape.width<=prs.slide_width+10000
        assert shape.top+shape.height<=prs.slide_height+10000
        if not shape.has_text_frame or not shape.text:continue
        height=0
        for p in shape.text_frame.paragraphs:
            size=round(p.font.size.pt if p.font.size else 20)
            lines=wrap(p.text,font(size),shape.width/12700)
            height+=len(lines)*size*1.22+ (p.space_after.pt if p.space_after else 0)
        # Last paragraph spacing is excluded at the box boundary.
        height-=8
        if height>shape.height/12700+3:warnings.append((i+1,shape.text,height,shape.height/12700))
assert not warnings, warnings

for filename in ['state.schema.json','advice.schema.json']:
    Draft202012Validator.check_schema(json.loads((ROOT/filename).read_text()))
rules=json.loads((ROOT/'strategy_rules.json').read_text())['rules']
assert len({r['id'] for r in rules})==len(rules)==17
assert all(all(1<=s<=34 for s in r['course_slides']) for r in rules)
state={'observed_at':'2026-10-13T12:00:00+08:00','version':dict.fromkeys(['game','mode','season','patch']),
    'player_goal':'steady_rank','health':None,'economy':{'gold':None,'level':None,'xp':None},
    'round':None,'board':[],'bench':[],'items':[],'augments':[],'opponents':[],'unknown_fields':['version','board','economy']}
Draft202012Validator(json.loads((ROOT/'state.schema.json').read_text())).validate(state)
advice={'generated_at':'2026-10-13T12:00:00+08:00','state_observed_at':state['observed_at'],
    'status':'needs_confirmation','main_action':None,'reasons':['当前版本与状态未确认'],
    'conditions':[],'risks':['无法验证具体阵容与预算'],'alternative':None,
    'next_observation':'请确认版本并采集当前棋盘','rule_ids':['G01','G02'],'version_sources':[],'unknown_fields':state['unknown_fields']}
Draft202012Validator(json.loads((ROOT/'advice.schema.json').read_text())).validate(advice)

# Preview reproduces textbox geometry and native shapes with Pillow; not a PowerPoint render.
pages=[]
for i,s in enumerate(prs.slides):
    im=Image.new('RGB',(960,540),'#101A24');draw=ImageDraw.Draw(im)
    scale=960/(prs.slide_width/12700)
    for sh in s.shapes:
        x,y,w,h=[v/12700*scale for v in [sh.left,sh.top,sh.width,sh.height]]
        if not sh.has_text_frame or not sh.text:
            try:
                if sh.fill.type and sh.fill.fore_color.rgb:
                    draw.rounded_rectangle((x,y,x+w,y+h),radius=8,fill='#'+str(sh.fill.fore_color.rgb))
            except (AttributeError,TypeError):pass
            continue
        offset=0
        for p in sh.text_frame.paragraphs:
            size=(p.font.size.pt if p.font.size else 20)*scale
            f=font(max(1,round(size)))
            color='#'+str(p.font.color.rgb) if p.font.color.type else '#F3F2E9'
            for line in wrap(p.text,f,w):
                draw.text((x,y+offset),line,font=f,fill=color,anchor='lt');offset+=size*1.22
            offset+=(p.space_after.pt if p.space_after else 0)*scale
    pages.append(im)
thumbw,thumbh=384,216
sheet=Image.new('RGB',(thumbw*4, (thumbh+30)*math.ceil(len(pages)/4)), '#E8E8E4')
draw=ImageDraw.Draw(sheet)
for i,im in enumerate(pages):
    x=(i%4)*thumbw;y=(i//4)*(thumbh+30)
    sheet.paste(im.resize((thumbw,thumbh)),(x,y))
    draw.text((x+8,y+220),f'{i+1:02}  {slides[i]["title"]}',font=font(12),fill='#14202A')
sheet.save(ROOT/'课程版式预览.jpg',quality=90)
pages[0].save(ROOT/'封面预览.png')
report='验证结果：34页；每页含讲师备注；文本估算适配；形状在页面内；17条规则ID唯一且页码有效；2份JSON Schema结构有效，未知状态与请求确认示例通过。\n版式预览为Pillow近似绘制，不是PowerPoint/LibreOffice渲染；尚未验证实际放映换行。\n版本事实与策略实战效果未验证。\n'
(ROOT/'验证记录.txt').write_text(report)
print(report)
