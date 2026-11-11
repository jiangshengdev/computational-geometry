import { left } from "../../../shared/math/math-lines.ts";
type Step = {
  id: string;
  text: string;
  captions: string[];
  action: string;
  focus?: string;
};
type Page = {
  id: string;
  title: string;
  source: string;
  reference: string;
  basis: string;
  diagram: string;
  steps: Step[];
};
export const pageList = (
  [
    {
      id: "inputs",
      title: "第一节：竖直输入卡在哪里",
      source: "文章第一节",
      reference:
        "same-column-reasons SR12–SR14：固定列只有一个高度；本页新增竖直反例，不重证局部更新",
      basis: "",
      diagram: "original",
      steps: [
        {
          id: "VS01",
          text: "第七章：用剪切处理竖直线段",
          captions: [
            "第六章《同列事件怎样逐点更新》已经允许同列不同高度的事件。",
            "现在接入竖直输入：先统一变换，在新坐标中扫描，再把完整答案还给原始输入。",
          ],
          action: "overview",
        },
        {
          id: "VS02",
          text: "V：(0,0) 到 (0,3)",
          captions: [
            "蓝色输入 V 从原点到x 坐标零、高度三。",
            "它是一条竖直闭线段。",
            "图中横纵每格都是一个单位，字母 O 表示原点，箭头表示坐标正方向。",
          ],
          action: "introduce-V",
        },
        {
          id: "VS03",
          text: "A：(-1,1) 到 (1,1)",
          captions: [
            "橙色输入 A 从x 坐标负一、高度一，延伸到x 坐标一、高度一。",
            "它与竖直输入的公共点用 P 表示，坐标为零、一。",
          ],
          action: "introduce-A",
        },
        {
          id: "VS04",
          text: "B：(-1,2) 到 (1,2)",
          captions: [
            "紫色输入 B 从x 坐标负一、高度二，延伸到x 坐标一、高度二。",
            "它与竖直输入相交的位置用 Q 表示，坐标为零、二。",
            "两条水平输入互相平行，没有公共点。",
          ],
          action: "introduce-B",
        },
      ],
    },
    {
      id: "obstacle",
      title: "一个顺序位置，不能同时代表两个高度",
      source: "文章第一节末",
      reference:
        "same-column-reasons SR12–SR14；same-column-events SC02：非零输入不竖直的前提；新增本例资格冲突",
      basis: "已讲：非竖直直线在固定 x 处只有一个高度",
      diagram: "original",
      steps: [
        {
          id: "VS05",
          text: "x=0：V 同时包含 P 与 Q",
          captions: [
            "在x 坐标零这一列，竖直输入同时包含低处和高处两个公共点。",
            "若把它只放在高度一的位置，就描述不了它在高度二的参与资格。",
          ],
          action: "compare-P-Q",
          focus: "同时包含",
        },
        {
          id: "VS06",
          text: "任意指定斜率，不能补上条件",
          captions: [
            "反过来，只选高度二，也不能描述低处参与。",
            "给竖直输入随意指定一个斜率，并不会改变这段高度范围。",
            "我们先恢复旧规则的适用条件，再使用它。",
          ],
          action: "range",
          focus: "条件",
        },
      ],
    },
    {
      id: "transform",
      title: "第二节：统一变换输入",
      source: "文章第二节开头",
      reference:
        "shear-intuition 204-08–204-11：正变换与撇号；本页只引用公式，新增所有输入统一应用",
      basis: "剪切专题：固定同一系数，x′=x+sy，y′=y",
      diagram: "transform",
      steps: [
        {
          id: "VS07",
          text: "所有端点使用同一个 s>0",
          captions: [
            "沿用《剪切如何改变坐标》的正变换。",
            "其中 x 坐标表示左右位置，而 y 坐标表示高度。",
            "先求系数 s 与原高度的乘积。",
            "再把这个乘积加到原来的 x 坐标上，所得的和就是新 x 坐标。",
            "高度不变。",
            "撇号区分新旧坐标，不改变输入身份。",
            "所有输入的所有端点使用同一个正系数。",
          ],
          action: "shear",
          focus: "同一个",
        },
        {
          id: "VS08",
          text: "共同位置仍对应同一个新位置",
          captions: [
            "原来共享的位置，无论沿哪份输入计算，都得到同一个新位置。",
            "若每条线各选一个系数，就不再是整幅图的同一变换，不能套用交集对应结论。",
          ],
          action: "shared-point",
        },
        {
          id: "VS09",
          text: "放大示意：s_{\\mathrm{vis}}=1/2；不用于计算",
          captions: [
            "为看清推斜过程，图中使用二分之一作为放大示意系数。",
            "坐标轴固定，把新坐标画成新点。",
            "示意的水平距离不能用来验算扫描，也不是真实执行轨迹。",
            "实际系数接下来单独确定。",
          ],
          action: "separate-scale",
        },
      ],
    },
    {
      id: "coefficient",
      title: "本例直接采用已证明的安全系数",
      source: "文章第二节系数",
      reference:
        "shear-safe-coefficient 234-01、234-15–234-16；shear-special-cases 239-04–239-16；仅承接结论，不再推导界；238-01–238-04 非零输入条件",
      basis: "安全系数：s=\\frac{1}{256(M+1)^5}，D 为正整数公共分母",
      diagram: "original",
      steps: [
        {
          id: "VS10",
          text: "D=1，M=3",
          captions: [
            "对于有理数端点坐标，取正整数 D 作为公共分母，使全部端点坐标乘它以后成为整数。",
            "符号 M 取一与这些整数绝对值的最大值。",
            "本例端点已经是整数，公共分母取一，最大值是三。",
          ],
          action: "bounds",
        },
        {
          id: "VS11",
          text: "s=1/262144（精确分数）",
          captions: [
            "直接使用《事件间距与剪切系数》中最大值为三时已经算出的系数：",
            "二十六万二千一百四十四分之一。",
            "后面的字母 s 始终表示这个精确分数，不换成演示系数，也不截成小数。",
          ],
          action: "actual-coefficient",
          focus: "精确分数",
        },
        {
          id: "VS12",
          text: "非零输入都不再竖直；点仍是点",
          captions: [
            "引用《同横坐标、退化输入与原坐标》的安全系数结论：",
            "原 x 坐标不同的端点和实际交点保留左右先后；",
            "原来同列不同高度的位置按从低到高展开。",
            "每份非零输入都不再竖直，原来不竖直的也不会变竖直。",
            "点输入仍是点。",
            "原坐标使用同一个系数，无须再乘除公共分母。",
          ],
          action: "premise",
        },
      ],
    },
    {
      id: "endpoints",
      title: "把全部端点带到新坐标",
      source: "文章第二节坐标表",
      reference:
        "shear-intuition 204-08–204-09；新增本例三个输入的端点表，不重复剪切定义证明",
      basis: "x′=x+sy，y′=y；实际 s=1/262144",
      diagram: "transform",
      steps: [
        {
          id: "VS13",
          text: "V：(0,0) 到 (3s,3)",
          captions: [
            "竖直输入的下端保持在原点，上端的新 x 坐标是零加三倍系数，也就是三倍系数。",
            "新横向长度为三倍系数，大于零。",
          ],
          action: "endpoint-V",
        },
        {
          id: "VS14",
          text: "A：(-1+s,1) 到 (1+s,1)",
          captions: [
            "橙色输入的两端高度都是一，所以两个x 坐标都加上一次系数。",
            "新左端是负一加系数，新右端是一加系数，高度仍为一。",
            "两端x 坐标之差仍为二。",
          ],
          action: "endpoint-A",
        },
        {
          id: "VS15",
          text: "B：(-1+2s,2) 到 (1+2s,2)",
          captions: [
            "紫色输入的两端高度都是二，所以两个x 坐标都加上两倍系数。",
            "高度仍为二，横向长度也仍为二。",
            "右侧坐标表使用实际系数，左图只放大展示相应关系。",
          ],
          action: "endpoint-B",
        },
      ],
    },
    {
      id: "correspondence",
      title: "同列的两个公共点怎样展开",
      source: "文章第三节",
      reference:
        "shear-preserves-intersections 243-02–243-17；shear-special-cases 237-11–237-16；新增本例事件对应；238-05–238-07 同位置；244-06–244-14 直线与同线关系",
      basis: "固定同一系数：整条闭线段与交集对应，且可唯一撤销",
      diagram: "transform",
      steps: [
        {
          id: "VS16",
          text: "P′=(s,1)，Q′=(2s,2)",
          captions: [
            "引用交集保持结论，原来的公共点不会丢失，也不会凭空新增。",
            "低处点的新坐标为一倍系数、一，",
            "高处点的新坐标为两倍系数、二，",
            "分别记作 P′和 Q′这两个点。",
          ],
          action: "transform-P-Q",
        },
        {
          id: "VS17",
          text: "2s-s=s>0",
          captions: [
            "两点的新 x 坐标之差恰好是一倍系数，严格为正。",
            "因此先遇到低处点变成的位置，",
            "再遇到高处点变成的位置，",
            "不再要求同列一个位置同时代表两个高度。",
          ],
          action: "event-separation",
        },
        {
          id: "VS18",
          text: "同位置不拆开；同线组仍保留身份",
          captions: [
            "完全重合的位置仍完全重合，不能拆成两次事件。",
            "同线关系也保持，",
            "所以第五章《完整结果怎样只报告一次》中的同线组继续适用，",
            "组内各份原始身份仍分别保留。",
            "点输入没有唯一直线，不加入同线组。",
          ],
          action: "identities",
        },
      ],
    },
    {
      id: "guarantees",
      title: "三个保证各自负责什么",
      source: "文章第三节末",
      reference:
        "shear-preserves-intersections 244-17–244-20：仅引用三种职责，新增扫描接入位置",
      basis: "",
      diagram: "none",
      steps: [
        {
          id: "VS19",
          text: "交集对应：变换可逆且保持整条线段",
          captions: [
            "可逆性与整条线段对应，保证变换前后求的是同一个交集问题。",
            "这个结论不依赖系数足够小。",
          ],
          action: "intersection",
        },
        {
          id: "VS20",
          text: "事件保序：选用安全系数",
          captions: [
            "安全系数另外负责事件先后，避免原来不同列的位置颠倒，并把同列不同高度按顺序展开。",
            "它补上扫描所需的非竖直条件。",
          ],
          action: "order",
        },
        {
          id: "VS21",
          text: "数值精确：保留分子与分母",
          captions: [
            "精确有理数运算负责不把分数截成有限位小数。",
            "后面的高度、覆盖和未来比较都保留精确值。",
            "系数很小，不等于计算没有舍入。",
          ],
          action: "exact",
          focus: "精确",
        },
      ],
    },
    {
      id: "equations",
      title: "第三节：走完主案例扫描",
      source: "文章第四节新直线与范围",
      reference:
        "exact-sweep-decisions ES28–ES42：共同比较位置与右侧斜率；新增变换后的实际直线与范围",
      basis: "x′=x+sy，y′=y；s=1/262144>0",
      diagram: "scan",
      steps: [
        {
          id: "VS22",
          text: "V：x′=sy′，所以 y′=x′/s",
          captions: [
            "现在高度、斜率、端点范围和未来比较全部使用新坐标。",
            "原竖直输入满足x 坐标为零，代入变换得到新 x 坐标等于系数乘新高度。",
            "系数为正，除以它得到新高度等于新 x 坐标除以系数。",
          ],
          action: "equation-V",
        },
        {
          id: "VS23",
          text: "V：斜率 1/s=262144；范围 [0,3s]",
          captions: [
            "因此蓝色输入的新斜率为系数的倒数，也就是二十六万二千一百四十四。",
            "它的新 x 坐标闭范围从零到三倍系数。",
            "不能再拿原来的x 坐标零来判断新候选的覆盖。",
          ],
          action: "range-V",
        },
        {
          id: "VS24",
          text: "A：y′=1；范围 [-1+s,1+s]",
          captions: [
            "橙色输入在新坐标中的高度恒为一，斜率为零。",
            "它的闭范围由刚才两个新端点给出，从负一加系数，到一加系数。",
          ],
          action: "range-A",
        },
        {
          id: "VS25",
          text: "B：y′=2；范围 [-1+2s,1+2s]",
          captions: [
            "紫色输入的新高度恒为二，斜率也为零。",
            "闭范围从负一加两倍系数，到一加两倍系数。",
            "输入名称始终代表原始身份，不按上下顺序重新编号。",
          ],
          action: "range-B",
        },
      ],
    },
    {
      id: "starts",
      title: "先到达两条水平输入的开始事件",
      source: "文章第四节开始事件",
      reference:
        "same-column-events SC14–SC18：加入和新邻居检查；新增本例开始顺序",
      basis: "0<s<1/2，因此 -1+s<-1+2s<0",
      diagram: "scan",
      steps: [
        {
          id: "VS26",
          text: "A 开始：(-1+s,1)",
          captions: [
            "全部端点预先登记。",
            "因为实际系数在零与二分之一之间，橙色左端先于紫色左端，两者都在原点左侧。",
            "先到橙色开始位置，此时只保留它自己。",
            "旁边竖列从下向上读，表示活动顺序，不是另一个坐标图。",
          ],
          action: "start-A",
        },
        {
          id: "VS27",
          text: "B 开始：(-1+2s,2)",
          captions: [
            "再到紫色开始位置，把它放在高度一的橙色输入上方。",
            "两份成为邻居，但它们是不同的平行线，没有交点可预约。",
          ],
          action: "start-B",
        },
        {
          id: "VS28",
          text: "V 开始：(0,0)；顺序 V,A,B",
          captions: [
            "接着到原点，蓝色输入从高度零开始，在两条水平输入下方。",
            "它的新邻居是橙色输入。",
            "紫色输入与它之间还隔着一份，不因这次加入直接成为邻居。",
          ],
          action: "start-V",
          focus: "V,A,B",
        },
      ],
    },
    {
      id: "candidate-p",
      title: "从新邻居发现第一个候选",
      source: "文章第四节 V 开始",
      reference:
        "same-column-reasons SR41–SR45：覆盖与未来分工；只应用，不重证",
      basis: "V：y′=x′/s，范围 [0,3s]；A：y′=1，范围 [-1+s,1+s]",
      diagram: "scan",
      steps: [
        {
          id: "VS29",
          text: "x′/s=1，所以 x′=s，P′=(s,1)",
          captions: [
            "检查蓝色与橙色这对邻居。",
            "令它们的新高度相等，得到新横坐标除以系数等于一。",
            "两边乘以系数，候选点的新横坐标等于系数，高度为一。",
          ],
          action: "candidate-P",
        },
        {
          id: "VS30",
          text: "覆盖：0<s<3s，-1+s<s<1+s",
          captions: [
            "先检查真实覆盖：一倍系数在蓝色闭范围内部，也在橙色闭范围内部。",
            "因此这不是只在线段以外相交的延长线候选。",
          ],
          action: "coverage-P",
          focus: "覆盖",
        },
        {
          id: "VS31",
          text: "未来：s>0；登记 P′，尚未报告",
          captions: [
            "再检查严格未来：候选x 坐标大于当前位置的零。",
            "两项都通过，才把这个位置登记为待处理事件。",
            "登记并不等于现在就报告结果，要等到达该位置。",
          ],
          action: "register-P",
          focus: "未来",
        },
      ],
    },
    {
      id: "at-p",
      title: "到达第一个交点，再更新顺序",
      source: "文章第四节 P′ 事件",
      reference:
        "exact-sweep-decisions ES37–ES42；same-column-events SC21–SC25：报告、右侧换序、新邻接；新增本例连接",
      basis: "P′=(s,1)；相遇块的右侧按斜率从小到大排列",
      diagram: "scan",
      steps: [
        {
          id: "VS32",
          text: "在 P′：V,A 等高；B 的高度为 2",
          captions: [
            "到达低处交点时，蓝色与橙色的高度都是一。",
            "紫色高度是二，不经过当前点，不参加这次报告。",
            "首先记录蓝色与橙色这一对，对应 P′这个位置。",
          ],
          action: "report-P",
        },
        {
          id: "VS33",
          text: "右侧：0<1/s；V,A,B → A,V,B",
          captions: [
            "点上等高，并不等于右侧任意排序。",
            "引用第三章《让精确结果支撑扫描判断》的右侧斜率结论，橙色斜率零较小，排在蓝色下方。",
            "更新后，最低是橙色，中间蓝色，最高紫色。",
          ],
          action: "swap-P",
          focus: "右侧",
        },
        {
          id: "VS34",
          text: "新的边界邻居：V 与 B",
          captions: [
            "换序以后，蓝色与紫色之间不再有橙色输入隔着。",
            "这个新邻接触发下一次检查。",
            "第二个交点不是在蓝色刚加入时直接由这对发现的。",
          ],
          action: "neighbor-Q",
          focus: "边界邻居",
        },
      ],
    },
    {
      id: "candidate-q",
      title: "第二个候选分别过两道判断",
      source: "文章第四节 Q′ 发现",
      reference:
        "same-column-reasons SR41–SR45；新增 P′ 后的 Q′ 发现链，不重证邻居机制",
      basis: "V：y′=x′/s；B：y′=2；当前位置 P′=(s,1)",
      diagram: "scan",
      steps: [
        {
          id: "VS35",
          text: "x′/s=2，所以 Q′=(2s,2)",
          captions: [
            "让新邻居的高度相等，新 x 坐标除以系数等于二。",
            "两边乘系数，得到新 x 坐标为两倍系数，高度为二，这就是高处候选。",
          ],
          action: "candidate-Q",
        },
        {
          id: "VS36",
          text: "覆盖：0<2s<3s",
          captions: [
            "先看蓝色输入：两倍系数严格夹在零和三倍系数之间，闭范围通过。",
          ],
          action: "coverage-Q-V",
          focus: "覆盖",
        },
        {
          id: "VS37",
          text: "覆盖：-1+2s<2s<1+2s",
          captions: [
            "再看紫色输入：候选x 坐标比左端大一，比右端小一，这份闭范围也通过。",
            "真实覆盖与未来资格是不同判断，不能用其中一项替代另一项。",
          ],
          action: "coverage-Q-B",
        },
        {
          id: "VS38",
          text: "未来：2s>s；登记 Q′",
          captions: [
            "最后与当前交点比较，两倍系数大于一倍系数，所以候选严格在右方。",
            "现在登记高处位置。",
            "当前已经报告的低处位置不会因为再次遇到，就重新成为未来事件。",
          ],
          action: "register-Q",
          focus: "未来",
        },
      ],
    },
    {
      id: "at-q",
      title: "到达第二个交点",
      source: "文章第四节 Q′ 处理",
      reference:
        "same-column-events SC26–SC32：局部报告与更新；新增本例第二次相遇",
      basis: "Q′=(2s,2)；A 高度为 1；B 斜率 0，V 斜率 1/s",
      diagram: "scan",
      steps: [
        {
          id: "VS39",
          text: "报告 V,B 对应 Q′；A 不参加",
          captions: [
            "到高处交点时，蓝色与紫色的高度都是二。",
            "橙色高度为一，不参加当前事件。",
            "报告蓝色与紫色这一对，对应 Q′这个位置。",
          ],
          action: "report-Q",
        },
        {
          id: "VS40",
          text: "右侧：A,V,B → A,B,V",
          captions: [
            "报告后按右侧斜率排列，紫色在蓝色下方。",
            "最低仍是橙色，中间变成紫色，最高是蓝色。",
            "蓝色不改名，变化的是它在顺序中的位置。",
          ],
          action: "swap-Q",
        },
        {
          id: "VS41",
          text: "新邻接 A,B 平行，不登记",
          captions: [
            "新的边界邻居是两条水平输入。",
            "它们平行且不在同一直线上，因此没有新交点。",
            "已经报告的两对结果继续保留。",
          ],
          action: "parallel",
        },
      ],
    },
    {
      id: "ends",
      title: "走到全部结束事件",
      source: "文章第四节全部事件表",
      reference: "same-column-events SC33–SC36：逐点退出；新增本例末端顺序",
      basis: "2s<1，所以 3s<1+s<1+2s",
      diagram: "scan",
      steps: [
        {
          id: "VS42",
          text: "V 结束：(3s,3)；保留 A,B",
          captions: [
            "由于两倍系数小于一，三倍系数小于一加系数，因此先到蓝色右端。",
            "这里没有其他输入经过，不新增结果。",
            "蓝色退出后，两条水平输入继续。",
          ],
          action: "end-V",
        },
        {
          id: "VS43",
          text: "A 结束：(1+s,1)；保留 B",
          captions: [
            "再到橙色右端，完成该位置处理后，橙色退出。",
            "此处也没有另一份参与者，只留下紫色输入。",
          ],
          action: "end-A",
        },
        {
          id: "VS44",
          text: "B 结束：(1+2s,2)；顺序为空",
          captions: [
            "最后到紫色右端，处理完后活动顺序为空。",
            "六个端点和两个真实交点都已处理。",
            "主案例只有两对点结果，水平输入这一对为空。",
          ],
          action: "end-B",
        },
      ],
    },
    {
      id: "scan-recap",
      title: "这一接入没有换掉原有扫描规则",
      source: "文章第四节末",
      reference:
        "same-point-participants SP34–SP40；overlap-discovery 覆盖延长补检；same-column-events SC38–SC42；仅引用条件与职责",
      basis: "未来比较：先比较 x′，相同再比较 y′；同位置统一处理",
      diagram: "none",
      steps: [
        {
          id: "VS45",
          text: "新坐标贯穿高度、范围和未来判断",
          captions: [
            "本例中每个事件的新 x 坐标都不同，因此未来判断表现为严格在右方。",
            "一般输入仍沿用第六章《同列事件怎样逐点更新》的完整位置比较：",
            "先比较新 x 坐标，",
            "相同再比较新高度；",
            "同位置统一处理。",
          ],
          action: "future",
        },
        {
          id: "VS46",
          text: "同点收集、同线组与覆盖补检继续适用",
          captions: [
            "一般输入仍按第四章《找齐参与者，报告全部输入对》收集身份，",
            "并沿用第五章《覆盖变化后怎样发现未来交点》的同线组与覆盖延长补检。",
            "组的最远右端也必须取新端点的新 x 坐标。",
          ],
          action: "existing-rules",
        },
      ],
    },
    {
      id: "restore-p",
      title: "第四节：还原完整答案",
      source: "文章第五节主案例还原",
      reference:
        "shear-intuition 206-01–206-06；shear-preserves-intersections 243-07–243-09；仅引用逆变换，新增输出对恢复",
      basis: "逆变换：x=x′-sy′，y=y′；使用原来同一个 s",
      diagram: "restore",
      steps: [
        {
          id: "VS47",
          text: "(V,A)：P′=(s,1)",
          captions: [
            "扫描记录的位置还在新坐标中。",
            "先取蓝色与橙色这一对，保留输入身份，使用同一系数的逆变换。",
          ],
          action: "restore-P-start",
        },
        {
          id: "VS48",
          text: "x=s-s×1=0，y=1",
          captions: [
            "先用系数乘新高度一，再从新 x 坐标的一倍系数中减去这个乘积，得到零。",
            "高度仍是一，因此这对结果恢复为原图中的 P 点，坐标零、一。",
          ],
          action: "restore-P",
        },
      ],
    },
    {
      id: "restore-q",
      title: "第二对结果也按身份还原",
      source: "文章第五节主案例还原",
      reference:
        "第一章结果契约；剪切专题逆变换；新增本例第二对恢复与空结果核对",
      basis: "逆变换：x=x′-sy′，y=y′；(V,A) 已恢复为 P=(0,1)",
      diagram: "restore",
      steps: [
        {
          id: "VS49",
          text: "(V,B)：Q′=(2s,2)",
          captions: [
            "再取蓝色与紫色这一对。",
            "新 x 坐标是两倍系数，新高度是二。",
            "仍沿用原始输入对，不能把它和前一对合成无身份的点集合。",
          ],
          action: "restore-Q-start",
        },
        {
          id: "VS50",
          text: "x=2s-s×2=0，y=2",
          captions: [
            "先求系数与二的乘积，再从两倍系数中减去这个乘积，结果为零。",
            "高度是二，所以恢复为原图中的 Q 点，坐标零、二。",
          ],
          action: "restore-Q",
        },
        {
          id: "VS51",
          text: "两对点结果；A 与 B 的交集为空",
          captions: [
            "最终蓝色与橙色对应低处点，蓝色与紫色对应高处点。",
            "两条水平输入没有公共点。",
            "原始无序输入对与完整交集一起交付，不把新坐标位置直接当成原图答案。",
          ],
          action: "restored-pairs",
        },
      ],
    },
    {
      id: "overlap",
      title: "独立短例：还原整段重叠",
      source: "文章第五节完整重叠区间",
      reference:
        "overlap-reporting OR10–OR11：加入时已知完整端点；shear-preserves-intersections 243-18–243-21；新增竖直区间恢复",
      basis: "",
      diagram: "overlap",
      steps: [
        {
          id: "VS52",
          text: "只取 V 与 W；W：(0,1) 到 (0,2)",
          captions: [
            "换一个独立短例，只取竖直输入 V 与绿色输入 W 这两份。",
            "绿色输入从零、一到零、二，完整地落在蓝色输入内部。",
            "本例没有两条水平输入，最大绝对端点坐标仍是三，实际系数不变。",
          ],
          action: "overlap-original",
        },
        {
          id: "VS53",
          text: "同线：y′=x′/s；W 范围 [s,2s]",
          captions: [
            "统一变换后，两份仍在同一条直线上。",
            "蓝色覆盖零到三倍系数，绿色覆盖一倍到两倍系数。",
            "虚线和实线只帮助辨认重合身份，不把它们挪到不同位置。",
          ],
          action: "overlap-transform",
        },
        {
          id: "VS54",
          text: "W 加入时：报告 [(s,1),(2s,2)]",
          captions: [
            "绿色输入在一倍系数、高度一的位置加入时，",
            "按第五章《完整结果怎样只报告一次》的加入报告规则与同组蓝色输入报告完整交集。",
            "从一倍系数、一，到两倍系数、二的整段都属于这一条结果，不是两个点结果。",
          ],
          action: "overlap-report",
          focus: "[(s,1),(2s,2)]",
        },
      ],
    },
    {
      id: "overlap-restore",
      title: "两个边界确定还原后的整段",
      source: "文章第五节区间还原",
      reference:
        "shear-preserves-intersections 243-20–243-21：整段对应；新增完整结果类型与原身份衔接",
      basis: "x=x′-sy′，y=y′；整条闭线段对应，(V,W) 身份保留",
      diagram: "overlap",
      steps: [
        {
          id: "VS55",
          text: "下端：s-s×1=0；上端：2s-s×2=0",
          captions: [
            "下端的新 x 坐标减去系数与一的乘积，恢复为零，高度一不变。",
            "上端的新 x 坐标减去系数与二的乘积，也恢复为零，高度二不变。",
          ],
          action: "overlap-boundaries",
        },
        {
          id: "VS56",
          text: "(V,W)：[(0,1),(0,2)]",
          captions: [
            "由整条线段对应结论，恢复的是这两个边界之间的完整闭线段。",
            "保留蓝色与绿色这一对身份，不把区间切成两个点，也不因内部穿越而把旧同线对重报为点。",
          ],
          action: "overlap-restore",
          focus: "[(0,1),(0,2)]",
        },
      ],
    },
    {
      id: "points",
      title: "第五节：接回点输入",
      source: "文章第五节点输入",
      reference:
        "shear-special-cases 238-20–238-24；same-point-participants SP52–SP59；新增统一变换后的同点身份",
      basis: "",
      diagram: "points",
      steps: [
        {
          id: "VS57",
          text: "只取 V、Z₁、Z₂；两份点都在 P=(0,1)",
          captions: [
            "再换一个独立短例，只取蓝色线段和两份点输入。",
            "用 Z₁、Z₂ 这两个编号区分点输入，它们的两个端点都在零、一这个位置。",
            "本例没有水平输入或绿色线段。",
          ],
          action: "points-original",
        },
        {
          id: "VS58",
          text: "两个端点都变为 P′=(s,1)",
          captions: [
            "全部端点仍用相同的实际系数。",
            "两份点输入的两个新端点都在一倍系数、一的位置，",
            "因此仍是零长度输入，",
            "而且仍在同一个事件中。",
            "图里的圆环与菱形中心重合，标记不表示面积。",
          ],
          action: "points-transform",
        },
        {
          id: "VS59",
          text: "同点参与：V 与两份点身份",
          captions: [
            "到这个位置时，蓝色输入严格穿过。",
            "按第四章《找齐参与者，报告全部输入对》的同点规则，把非零参与者与两份点身份一起收集。",
            "位置相同不意味着输入身份相同。",
          ],
          action: "points-participants",
        },
      ],
    },
    {
      id: "point-results",
      title: "同一个位置，保留三个输入对",
      source: "文章第五节三对结果",
      reference:
        "same-point-participants SP52–SP59；overlap-reporting OR40；新增变换后报告与逐对恢复",
      basis: "P′=(s,1)；逆变换 x=x′-sy′，y=y′",
      diagram: "points",
      steps: [
        {
          id: "VS60",
          text: "(V,Z₁) 与 (V,Z₂) 各一条点结果",
          captions: [
            "先让蓝色线段与第一份点输入配对，",
          "再与第二份点输入配对，",
          "两对各产生一条点结果。",
            "两条结果的位置都在当前点，原始身份分别保留。",
          ],
          action: "point-pairs-V",
        },
        {
          id: "VS61",
          text: "(Z₁,Z₂) 也有一条点结果",
          captions: [
            "两份点输入之间也构成一个无序输入对。",
            "它们在同一位置，所以这一对也有一条点结果。",
            "三对位置相同，不能合并成只有一份身份的记录。",
          ],
          action: "point-pair-Z",
        },
        {
          id: "VS62",
          text: "每对都恢复为 P=(0,1)",
          captions: [
            "对三条结果分别使用逆变换。",
            "新 x 坐标的一倍系数，减去系数与高度一的乘积，得到零；高度保持一。",
            "三对各自恢复为原图中的同一个位置。",
          ],
          action: "points-restore",
        },
      ],
    },
    {
      id: "point-exit",
      title: "点输入不留在后续顺序中",
      source: "文章第五节末",
      reference:
        "same-point-participants SP52–SP59：点不入右侧；本集只连接变换前后，不重证",
      basis: "点输入两端重合，没有唯一支撑直线",
      diagram: "points",
      steps: [
        {
          id: "VS63",
          text: "Z₁、Z₂ 不获得斜率，也不继续活动",
          captions: [
            "两份点输入只参与这一次事件，不获得斜率，不进入后续活动顺序。",
            "蓝色线段在这里继续，处理后仍只有它活动。",
            "点身份已经保存在结果中，退出顺序不会删除结果。",
          ],
          action: "points-exit",
        },
        {
          id: "VS64",
          text: "统一变换 → 新坐标扫描 → 按输入对还原",
          captions: [
            "本集把竖直输入接回已有扫描：",
            "统一系数补上非竖直条件，",
            "所有判断使用新坐标，",
            "点与完整区间按原始输入对还原。",
            "下一章再组织完整混合扫描，一般正确性与总工作量留给后续章节。",
          ],
          action: "close",
        },
      ],
    },
  ] as Page[]
).map((p) => ({
  ...p,
  lines: p.steps,
  groups: [left(p.steps.length)],
  holdAfterSeconds: 3,
}));
export const pages = Object.fromEntries(pageList.map((p) => [p.id, p]));
export const shots = pageList.flatMap((p) =>
  p.steps.map((s, i) => ({
    ...s,
    page: p.id,
    visibleStep: i + 1,
    pauseAfter: i === p.steps.length - 1 ? 3 : 0,
  })),
);
