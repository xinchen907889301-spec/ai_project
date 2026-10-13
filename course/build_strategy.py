from pathlib import Path
import json

OUT=Path(__file__).parent
rules=[]
def rule(id,title,requires,conditions,actions,exceptions,source,slides,priority=50,provenance='author_strategy'):
    rules.append(dict(id=id,title=title,priority=priority,provenance=provenance,required_inputs=requires,
        conditions=conditions,actions=actions,exceptions=exceptions,source_documents=source,course_slides=slides,
        status='draft_not_runtime_validated',evaluation='true_false_unknown',numeric_win_probability_allowed=False))

rule('G01','版本与数据一致性',['version','knowledge_version'],['game、mode、season、patch与知识记录匹配'],
 ['匹配时才允许使用具体版本阵容与机制','不匹配时仅提供共性检查并请求确认'],['未知不视为匹配'],['回答ai提出的问题.docx'],[3],100,'editorial_product_guardrail')
rule('G02','关键视觉识别确认',['observations','recognition_review'],['识别字段会改变阵容或预算判断'],
 ['置信度未校准或识别不确定时请求确认','缺失字段保持unknown，不补猜'],['非关键字段可展示但不可用作决策事实'],['回答ai提出的问题.docx'],[3,33],99,'editorial_product_guardrail')
rule('G03','侦察范围与时效',['opponents','observed_at'],['建议依赖同行占牌或对手质量'],
 ['展示已侦察人数与时间','不宣称拥有完整七名对手状态'],['旧观察仅作为历史线索，不确定当前占牌'],['回答ai提出的问题.docx'],[24],98,'editorial_product_guardrail')
rule('S01','阵容候选看强度与可达性',['board','bench','items','economy','candidate_comps','version'],['存在已核验的候选阵容'],
 ['比较核心与机制强度、成型成本、装备适配及竞争','保留可沿用装备的替代方向'],['版本候选未核验时不做具体强度排名'],['金铲铲这个游戏.docx','回答补充问题.docx'],[5,6,7,8,9],70)
rule('S02','前期质量优先',['board','bench','items','version'],['有适合过渡的两星低费卡'],
 ['优先比较围绕高质量核心的有效羁绊','诊断输出与前排短板'],['有适配机制与装备的强势一星高费卡可能更好'],['回答补充问题.docx'],[10,11],70)
rule('S03','装备定向与继承',['items','board','candidate_comps','version'],['现有或拟合成装备限制候选方向'],
 ['检查当前持有者和后续接装核心','推荐主方向及兼容装备的替代方向'],['关键装备缺失时比较等待代价，不保证选秀拿到'],['回答补充问题.docx'],[12,13],70)
rule('S04','保连胜投入',['economy','board','bench','items','streak','version'],['升级、刷新或合装可改善明确短板'],
 ['说明具体新增英雄或可完成升级','比较当前收益与利息及后续成型成本'],['未侦察时只能说有潜力，不能保证胜利'],['回答补充问题.docx'],[15,16],75)
rule('S05','连败计划与止损',['health','economy','round','target_comp','streak','version'],['正在连败且计划依赖后续启动'],
 ['检查目标阵容强度与可达性','血量预算不足或争牌加剧时优先补强'],['连败经济及选秀收益需核验机制，不假设奖励必得'],['金铲铲这个游戏.docx','回答补充问题.docx'],[14,17],85)
rule('S06','经济收益适配',['augments','target_comp','economy','version'],['选择强化或评估成型预算'],
 ['作者体系通常优先一项适配经济支持','比较金币、经验、免费刷新和直接给牌的兑现价值'],
 ['强自然经济、来牌或持续连胜可能替代','拿一个经济强化不代表总预算足够'],['回答补充问题.docx','回答ai提出新的问题.docx'],[18,19],65)
rule('S07','及时启动争核心',['economy','target_comp','opponents','round','version'],['目标核心竞争明显且具备启动条件'],
 ['根据费用、等级概率与版本节奏及时启动','不把4-1当作所有阵容通用时点'],['明确的高容错冲九路线需单独评估'],['回答补充问题.docx'],[20,22],80)
rule('S08','主C二星主T一星的分支',['board','health','economy','opponents','target_comp','version'],['主C二星、主T一星'],
 ['检查目标占牌、即时替代前排和容错','容错高且经济与版本支持时评估上九','容错低时优先即时可实现的补强'],
 ['不只建议无限搜接近耗尽的单一目标','对手备战区未知时不宣称目标已耗尽'],['回答ai提出的问题.docx'],[21,31],85)
rule('S09','主C一星暂能赢的分支',['board','health','economy','opponents','target_comp','version'],['主C仍一星且能赢部分已知对手'],
 ['不能只凭暂时获胜停止搜牌','比较后续质量压力、占牌竞争与冲九计划'],['当前最优停手预算需计算，作者未提供固定金额'],['回答ai提出的问题.docx'],[22],80)
rule('S10','转阵与下位替代',['board','bench','items','economy','opponents','candidate_comps','version'],['原计划成型困难且存在可执行替代'],
 ['判断随机、竞争和预算原因','比较转阵成本、已持有替代牌及装备兼容','说明迫降可能以减少掉分为目标'],
 ['不保证替代阵容稳前三','没有可行替代时不编造变阵'],['回答补充问题.docx','回答ai提出的问题.docx'],[13,23],80)
rule('S11','牌池相对影响',['opponents','target_comp','verified_pool_rules'],['共享有限同费用牌池机制已核验'],
 ['目标被拿走减少可用量','同费其他牌被购买可能改善目标相对机会'],
 ['观察不完整时不能精算剩余量','特殊复制等机制按版本处理'],['回答ai提出的问题.docx'],[24],70)
rule('S12','冲九预算',['health','economy','round','board','version','damage_estimate','target_comp'],['考虑跳过八级搜牌冲九'],
 ['检查版本高费强度、升级后刷新购牌预算','估计启动前损血并预留转型容错','展示保守情景和更稳的替代路线'],
 ['80血与每场12血不是通用门槛','未经确认未来资源不计入确定预算'],['回答补充问题.docx','回答ai提出新的问题.docx'],[25,26,27,32],85)
rule('S13','根据玩家目标比较路线',['player_goal','candidate_actions','risk_estimates'],['存在稳健与高上限两条可执行路线'],
 ['默认稳健上分','追求第一时说明稀缺条件与额外风险'],['未统计校准不得输出数字胜率'],['回答ai提出新的问题.docx'],[28],60)
rule('G04','建议合法性与表达',['state','proposal','verified_rules'],['将向玩家展示操作建议'],
 ['验证金币、人口、持有牌、装备合成和触发条件','提供主建议、理由、风险、替代及下一观察点','引用状态事实与规则ID'],
 ['合法性不可验证时只给条件建议或请求确认','不假定可自动卸装或移动装备'],['回答ai提出的问题.docx'],[33],97,'editorial_product_guardrail')

document={'spec_version':'0.1.0','game':'金铲铲之战','default_goal':'steady_rank',
 'status':'draft_for_review_not_executable','rule_language':'human_readable_conditions_not_an_executable_DSL',
 'knowledge_policy':{'patch_match_required':True,'unknown_is_not_true':True,'version_facts_verified':False},
 'rules':rules}
(OUT/'strategy_rules.json').write_text(json.dumps(document,ensure_ascii=False,indent=2),encoding='utf-8')

nullable_num={'type':['number','null'],'minimum':0}
nullable_str={'type':['string','null']}
entity={'type':'object','additionalProperties':False,'required':['hero_id','stars','position','item_ids','confidence'],
 'properties':{'hero_id':nullable_str,'stars':{'type':['integer','null'],'minimum':1,'maximum':3},
 'position':nullable_str,'item_ids':{'type':'array','items':nullable_str},'confidence':{'type':['number','null'],'minimum':0,'maximum':1}}}
state={'$schema':'https://json-schema.org/draft/2020-12/schema','title':'金铲铲对局状态草案',
 'type':'object','additionalProperties':False,
 'required':['observed_at','version','player_goal','health','economy','round','board','bench','items','augments','opponents','unknown_fields'],
 'properties':{
 'observed_at':{'type':'string','format':'date-time'},
 'version':{'type':'object','additionalProperties':False,'required':['game','mode','season','patch'],
 'properties':{k:nullable_str for k in ['game','mode','season','patch']}},
 'player_goal':{'enum':['steady_rank','first_place']},'health':nullable_num,'round':nullable_str,
 'economy':{'type':'object','additionalProperties':False,'required':['gold','level','xp'],
 'properties':{'gold':nullable_num,'level':{'type':['integer','null'],'minimum':1},'xp':nullable_num}},
 'board':{'type':'array','items':entity},'bench':{'type':'array','items':entity},
 'items':{'type':'array','items':{'type':'object','additionalProperties':False,'required':['item_id','location','confidence'],
 'properties':{'item_id':nullable_str,'location':nullable_str,'confidence':{'type':['number','null'],'minimum':0,'maximum':1}}}},
 'augments':{'type':'array','items':nullable_str},
 'streak':{'type':['object','null'],'additionalProperties':False,'properties':{'type':{'enum':['win','loss','none','unknown']},'count':{'type':['integer','null'],'minimum':0}}},
 'opponents':{'type':'array','maxItems':7,'items':{'type':'object','additionalProperties':False,
 'required':['player_id','observed_at','board','bench','complete'],
 'properties':{'player_id':{'type':'string'},'observed_at':{'type':'string','format':'date-time'},'board':{'type':'array','items':entity},
 'bench':{'type':'array','items':entity},'complete':{'type':'boolean'}}}},
 'unknown_fields':{'type':'array','items':{'type':'string'}},
 'recognition_review':{'enum':['needs_confirmation','confirmed','partial']},
 'damage_estimate':{'type':['object','null'],'additionalProperties':False,
 'properties':{'remaining_fights':{'type':['integer','null'],'minimum':0},'loss_low':nullable_num,'loss_high':nullable_num,
 'transition_reserve':nullable_num,'basis':{'enum':['verified_rule','recent_fights','teaching_assumption','unknown']}}}
 }}
advice={'$schema':'https://json-schema.org/draft/2020-12/schema','title':'金铲铲建议草案',
 'type':'object','additionalProperties':False,
 'required':['generated_at','state_observed_at','status','main_action','reasons','conditions','risks','alternative','next_observation','rule_ids','version_sources','unknown_fields'],
 'properties':{'generated_at':{'type':'string','format':'date-time'},'state_observed_at':{'type':'string','format':'date-time'},
 'status':{'enum':['needs_confirmation','conditional_advice','validated_advice']},
 'main_action':{'type':['string','null']},'alternative':{'type':['string','null']},'next_observation':{'type':'string'},
 **{k:{'type':'array','items':{'type':'string'}} for k in ['reasons','conditions','risks','rule_ids','version_sources','unknown_fields']}}}
for name,obj in [('state.schema.json',state),('advice.schema.json',advice)]:
 (OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
print('Created',len(rules),'strategy rules and 2 schemas')
