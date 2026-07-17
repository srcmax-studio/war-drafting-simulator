import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FRONT_DEFINITIONS } from '../app/common/src/fronts.js';

interface VisualDirection {
  theme: string;
  scene: string;
}

const directions: Record<string, VisualDirection> = {
  'bronze-road': { theme: '青铜驿路与高效补给', scene: '一条穿越青灰群山的青铜铺装驿道，连续烽亭、空载辎重车与明亮路标形成快速通行的纵深动线' },
  'taxed-crossing': { theme: '重税渡口与资源阻滞', scene: '宽阔河面上的关税渡口被层层闸门、沉重秤台和堆积货箱截断，等待过河的空船形成拥堵压迫感' },
  'signal-ridge': { theme: '烽讯高地与战力增幅', scene: '高耸山脊上成列烽火台接力点亮，铜制反射镜将晨光汇聚到中央制高点，远处战线尽收眼底' },
  'salt-marsh': { theme: '白盐湿地与力量衰减', scene: '苍白盐碱沼泽吞没旧栈道与残破拒马，腐蚀性雾气贴地流动，远景中的军旗褪色倾斜' },
  'age-archive': { theme: '纪元档案与神话回响', scene: '巨型地下档案馆由青铜星盘、古老石刻与层叠年代环构成，最深处的神话时代遗物被柔和金光唤醒' },
  'eastern-meridian': { theme: '东陆经纬与地域共鸣', scene: '山河沙盘、经纬铜轨与东方古城轴线在高台交汇，朝阳沿着东方地平线照亮连续关隘' },
  'artificer-yard': { theme: '百工营造与建设增益', scene: '宏大的古代营造场布满木构榫卯、起重滑轮、石料坡道与半成要塞，工序井然却不出现人物特写' },
  'crown-court': { theme: '列王议庭与统御权威', scene: '环形石质议庭中央陈列多文明的空王座与礼制铜器，穹顶光束聚向中央战略沙盘' },
  'westward-current': { theme: '西迁风道与向左调遣', scene: '强劲西风推动旌旗、尘沙与空辎重车沿山间道路由右向左汇流，多层道路清楚呈现迁移动线' },
  'broken-compass': { theme: '失准罗盘与随机调遣', scene: '破碎的巨型罗盘嵌在岔路荒原，磁针分裂指向数条相邻道路，旋转尘卷制造不确定方向感' },
  'muster-gate': { theme: '万民征集与持续补员', scene: '巨型征集城门连接纵深营区，空旷校场、卷轴架与源源延伸的补给道路象征不断补充后备力量' },
  'mirror-foundry': { theme: '镜铸工坊与复制资源', scene: '铜镜与熔炉组成对称工坊，一件未完成的器物在多面镜中形成一致倒影，冷暖炉光层层反射' },
  'sealed-dispatch': { theme: '封缄驿站与手牌压力', scene: '密封文书堆满昏暗驿站，蜡封匣柜与即将焚毁的过量卷宗形成资源过载和被迫舍弃的氛围' },
  'execution-ground': { theme: '断旌刑场与弱者淘汰', scene: '肃穆空旷的古战场上低矮残旗倒伏于风中，中央石台被冷光照亮，不出现刑具、人物或血腥元素' },
  'returning-shore': { theme: '归帆古岸与阵亡复归', scene: '薄暮古岸上残旧船帆从雾海归来，石阶尽头点亮归航灯火，潮水带回失落的旗帜与器物' },
  'wide-formation': { theme: '开阔阵原与扩展容量', scene: '辽阔平整的高原被多条阵列刻线分区，宽阔营位和延展拒马展示可容纳大军的横向空间' },
  'narrow-pass': { theme: '一线天关与容量收缩', scene: '两面绝壁夹出仅容单列通过的险关，沉重城门与狭窄栈道压缩中央空间，远处天空仅余一线' },
  'light-foot-ward': { theme: '轻骑戒域与低费突入', scene: '狭窄浅滩、轻型木桥与快速曲折的骑道环绕戒域，重型结构无法进入，构图突出轻快小队路线' },
  'heavy-standard': { theme: '重旌禁区与重装准入', scene: '厚重石门、巨型吊桥与大型战争构件守住禁区，轻型便道被封闭，只留下适合重装通行的中央大道' },
  'silent-obelisk': { theme: '无铭碑林与技能沉默', scene: '无字黑色碑林整齐延伸，所有机关与火光都静止熄灭，吸音浓雾让场景呈现绝对克制和寂静' },
  'echo-chamber': { theme: '回响军府与双重触发', scene: '对称军府内的铜制声学拱壁将一次鼓波反射为两重可见涟漪，空间形成清晰的重复节奏' },
  'mist-bastion': { theme: '雾锁堡垒与延迟揭示', scene: '层叠城垣大半隐没于浓雾，只有下一层闸门的灯火若隐若现，伏击道路在近景后突然消失' },
  'watchtower-zero': { theme: '先觉望楼与提前情报', scene: '超高望楼在黎明前率先点亮第三座远方信标，铜制观测镜越过两层山脊捕捉尚未公开的战场' },
  'cipher-field': { theme: '密算原与隐藏战力', scene: '荒原上的机械算筹、折叠屏风与加密光栅遮住核心营地，仅留下无法解读的能量轮廓和数量线索' },
  'upended-dais': { theme: '倒悬武台与终局反转', scene: '重力错置的石台上下倒悬，断裂台阶与旗杆映出相反方向，终局光线让低处结构翻转成制高点' },
  'debtor-camp': { theme: '负功营与逆境反弹', scene: '低洼营地被沉重账牌和锁链结构压住，却有六道暖金支撑梁从地下托起破败阵地，形成由负转正的视觉叙事' },
  'plain-banner': { theme: '素旌台与基础战力', scene: '朴素无纹的旗台由裸露石材和未装饰铜件构成，没有机关或铭文，坚实几何结构成为唯一力量来源' },
  'lone-watch': { theme: '孤烽哨与单卡坚守', scene: '孤立烽火哨塔矗立于广阔雪岭，一束强光保护唯一阵位，四周空旷留白强调孤军优势' },
  'packed-rampart': { theme: '连营壁与满场奖励', scene: '连续营垒将所有预留阵位严密填满，盾墙、拒马与火盆无缝闭合，最后一段缺口刚被封住' },
  'confluence-table': { theme: '万代会盟与跨时代协同', scene: '圆形会盟沙盘汇聚神话石柱、青铜器、古典拱门、工业桁架和未来光轨，多种年代材质和谐衔接' },
  'ancient-concord': { theme: '上古盟誓与古代共鸣', scene: '神话巨石、青铜祭器与古典柱廊围合成盟誓坛，三段古代文明结构被同一火光连接' },
  'medieval-bastion': { theme: '中世壁垒与时代排他', scene: '层层中世纪石堡、木制攻城结构与高墙占据画面，外围异时代建筑被阴影与风雪压低' },
  'modern-exchange': { theme: '近世交易与节奏补给', scene: '工业时代仓站连接现代玻璃交易大厅，轨道货运与自动文书交换形成一次高效资源流转' },
  'future-beacon': { theme: '未来信标与时空加速', scene: '未来量子信标耸立于古老山河之上，环形能量轨与时空裂隙缩短通向阵地的路径，冷青光中点缀铜金' },
  'single-era-citadel': { theme: '同代城塞与纯系集中', scene: '一座材质、比例和年代完全统一的宏伟城塞严密闭合，所有塔楼遵循同一建筑语汇' },
  'seven-age-forum': { theme: '七纪论坛与时代多样', scene: '七段不同历史年代的建筑扇形围绕中央论坛，各段保持真实材质并由同一地基和天幕统合' },
  'homeland-redoubt': { theme: '乡土要塞与地域纯度', scene: '同一地域材料修筑的山地要塞与周边地貌自然融合，本地石材、林木和水系形成完整防御闭环' },
  'world-congress': { theme: '寰宇议会与地域多样', scene: '多种地理地貌和文明建筑沿环形议会广场交汇，雪山、河谷、沙漠与海岸在沙盘般地形上连接' },
  'coalition-ground': { theme: '联军会场与阵营协同', scene: '数座风格一致的联盟营垒通过桥梁和信号火线互相支援，成组空旗杆形成紧密阵营网络' },
  'guild-conclave': { theme: '百业会馆与职业叠加', scene: '工匠、学者、航海与军务空间围绕会馆中庭分区，每一职业区域的第二座设施被额外灯光强化' },
  'oath-chain': { theme: '连誓长廊与相邻连携', scene: '长廊两侧相邻门拱以共同纹理和铜链逐段连接，连续节点彼此点亮，强调部署顺序与邻接关系' },
  'many-crowns': { theme: '众身份议庭与身份广度', scene: '多种礼制形态的空座与冠冕陈列环绕议庭，每个身份保留独特轮廓又共同指向中央沙盘' },
  'eastward-current': { theme: '东归风道与向右调遣', scene: '晨风推动旌旗、尘沙与空辎重车沿谷地由左向右汇流，多层道路清楚呈现东归方向' },
  'central-muster': { theme: '中军聚合与两翼汇流', scene: '左右两侧山道与补给线同时向中央大营收束，中央校场逐渐扩大成为唯一视觉焦点' },
  'flank-sortie': { theme: '两翼出击与弱侧增援', scene: '中央堡门分出两条对称出击道路，其中一条通往更昏暗脆弱的侧翼并被援军灯火照亮' },
  'wheel-formation': { theme: '轮转军阵与周期位移', scene: '三座阵地由巨型环形道路相连，偶数刻度的铜轮机关驱动空战车按顺时针方向轮换位置' },
  'adjacent-exchange': { theme: '邻阵易位与强弱交换', scene: '跨越峡谷的双层桥梁连接相邻阵地，一侧巨型战争构件与另一侧轻型器械正沿交错轨道互换位置' },
  'immovable-fort': { theme: '不动坚城与位移免疫', scene: '整体从山体凿出的巨城以深埋地基和封闭吊桥固定于岩盘，风暴中依然纹丝不动' },
  'growing-camp': { theme: '扩建营盘与阶段增容', scene: '营盘呈三层同心扩建结构，第三与第五阶段的外圈工事依次亮起，预留阵位向远处扩展' },
  'single-file-gate': { theme: '单列军门与逐回合部署', scene: '狭长军门只开放一条有序通道，多重闸门逐级放行，无法形成一次性拥入的宽阔入口' },
  'first-standard': { theme: '先登旌台与首次奖励', scene: '每个回合刻度前方都有一座最先被晨光照亮的空旗位，第一条足迹沿石阶抵达制高台' },
  'last-bastion': { theme: '末席堡垒与满位终结', scene: '堡垒阵位几乎全部闭合，最后一个缺口嵌入强化铜甲并爆发克制金光，强调填满瞬间' },
  'quartermaster-dock': { theme: '辎重码头与阶段补给', scene: '军需码头的第三与第五泊位亮起装卸灯，封存货箱、索道和空货船构成两次明确补给波次' },
  'mobile-foundry': { theme: '随军铸坊与重装减费', scene: '安装在巨型履带与木轮底盘上的移动铸坊在行军中锻造重型构件，让庞大装备更早抵达战线' },
  'conscription-tax': { theme: '轻兵附税与低费抑制', scene: '小型通道前设置密集税闸和称量台，轻便物资被额外阻拦，而重型货道保持通畅' },
  'reserve-converter': { theme: '余令转势与资源蓄积', scene: '未启用的军令筹码被投入铜制蓄能塔，逐回合转化为永久点亮的防御灯带和阵地能量' },
  'veteran-pass': { theme: '重将关券与高费窗口', scene: '宏伟山关在每个回合只为一件重型战争构件开启快速吊桥，专用通行券以无文字铜牌象征' },
  'opening-requisition': { theme: '先遣征调与首张优惠', scene: '黎明征调处的第一条运输轨道率先无阻通行，随后闸门逐渐恢复常态，突出首批优先权' },
  'final-requisition': { theme: '终局征调与第六回合爆发', scene: '六重刻度门在最后一重同时开启，封存的重型补给沿铜轨涌向终局阵地，天空进入决战暮色' },
  'ash-ledger': { theme: '灰烬账簿与弃置转化', scene: '废弃卷宗在无字焚化炉中化为金色余烬，余烬沿地面沟槽永久汇入战线能量阵列' },
  'archive-recycler': { theme: '旧卷回收与牌库循环', scene: '旧卷回收库的环形传送带将破损卷轴清理、重新封装并送回高耸档案架，形成闭合循环' },
  'reverse-theatre': { theme: '逆序演武与后发先至', scene: '层叠演武台的灯火从最深处向入口逆向依次点亮，脚印与门扇显示最后进入者最先抵达中央' },
  'ambush-valley': { theme: '伏兵幽谷与未揭示增益', scene: '幽深山谷被浓雾和密林遮蔽，隐藏营位在雾中发出强烈但克制的暖光，公开区域反而平静暗淡' },
  'late-intelligence': { theme: '迟报军府与第四回合揭示', scene: '四重封闭情报门横贯军府，前三重沉入阴影，第四重门后才透出完整战场晨光' },
  'masked-strength': { theme: '匿势营与身份遮蔽', scene: '重重屏风、伪装网与无标记帐篷遮住营地规模，只有模糊轮廓与不可靠影子暴露投入程度' },
  'dawn-signal': { theme: '破晓号台与全局揭示', scene: '破晓第一束光触发中央号台，光波越过三条山脊同时驱散浓雾并点亮所有远方信标' },
  'phoenix-gate': { theme: '凤还关与首次复归', scene: '赤铜关门后的熄灭火盆重新燃起，一面烧灼但完整的空旗从灰烬中升起，象征首次阵亡后的强化返场' },
  'ancestor-field': { theme: '先祖原与阵亡积累', scene: '肃穆原野上无字纪念石与残旗逐层延伸，每一处遗迹向中央阵地送出一线柔和力量' },
  'martyr-memorial': { theme: '殉志碑与跨线增益', scene: '中央无字纪念碑接收来自远方两条战线的火光，碑下最微弱的一盏灯随每次远方熄灭而增强' },
  'closing-chasm': { theme: '闭合裂谷与第五回合清场', scene: '巨大裂谷两壁正于第五道刻度处闭合，旧阵地将被吞没，而远端第六道新桥正在重新展开' },
  'balancing-tide': { theme: '均势潮汐与领先压制', scene: '潮汐战场上的双侧石台如天平起伏，较高一侧被冷浪削平，较低一侧被暖潮托起，差距持续收窄' },
  'migrating-crown': { theme: '迁徙王冠与跨线支援', scene: '中央高台的超额能量沿两条铜金光路分流，其中一半流向远方最暗弱的侧翼阵地，形成终局支援' }
};

const masterStyle = '高完成度现代东方历史幻想战略游戏场景，电影级环境概念艺术，历史战争沙盘与轻度未来档案视觉结合，厚重云层，细腻空气透视，克制的铜金和朱砂红光线，墨黑与青灰主色，真实建筑和自然环境质感，宏大但不夸张，统一中高位广角镜头和细节密度，横版 3:2。';
const safeArea = '画面中央和下方保持较低视觉噪声，为卡牌、战力数字和规则 UI 留出清晰安全区；焦点位于中上部。';
const negativePrompt = '人物特写，具体可辨识人物，商业角色，血腥，伤口，尸体，文字，书法，数字，标志，Logo，水印，边框，卡牌，界面，按钮，HUD，现代品牌，过饱和霓虹，卡通渲染，低清晰度。';

const enabled = FRONT_DEFINITIONS.filter((front) => front.enabled);
const missing = enabled.filter((front) => !directions[front.frontId]).map((front) => front.frontId);
const extra = Object.keys(directions).filter((frontId) => !enabled.some((front) => front.frontId === frontId));
if (enabled.length !== 72 || missing.length || extra.length) {
  throw new Error(`Front prompt directions are incomplete: enabled=${enabled.length}, missing=${missing.join(',')}, extra=${extra.join(',')}`);
}

const prompts = enabled.map((front) => {
  const direction = directions[front.frontId]!;
  return {
    frontId: front.frontId,
    nameZh: front.nameZh,
    theme: direction.theme,
    gameplayMeaning: front.descriptionZh,
    prompt: `${masterStyle} ${direction.scene}。以环境叙事表达“${direction.theme}”以及规则含义“${front.descriptionZh}”，不将规则画成文字或界面。${safeArea} 无人物特写，无文字，无标志，无水印。`,
    negativePrompt,
    focalPoint: front.art.focalPoint
  };
});

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'data/front-art-prompts.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(prompts, null, 2)}\n`, 'utf8');
console.log(`Wrote ${prompts.length} front artwork prompts to ${output}`);
