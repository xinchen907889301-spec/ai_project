# 弈有章法：金铲铲定阵助手与课程

## 软件原型 v0.1

已接入 DataTFT 金铲铲 S18 的阵容研究快照，支持装备与强化驱动的潜在同行预判、自己及七名对手的观察记录、时间与回合校验、简单/专业分析，以及安卓手动悬浮采集入口。

- [安卓调试 APK](downloads/assistant-v0.1-debug.apk)：用于初步安装和交互测试；尚未在荣耀 Magic9 上实测。
- [软件使用说明与限制](docs/软件原型使用说明.md)
- [数据源验证](docs/数据源验证.md)
- [桌面界面预览](docs/images/desktop.png)
- [手机界面预览](docs/images/mobile.png)

```bash
npm ci
npm test
npm start
```

应用默认监听本机3000端口。安卓APK自带本地界面和资料快照，可先手动记录和体验演示。真实截图识别需要额外配置视觉模型与手机可访问的HTTPS服务；当前不是已经实战验证的自动识别助手。课程文件保留如下。

## 下载

- [课程 PPT（34 页，含讲师备注）](downloads/course.pptx)
- [完整资料包 ZIP（含 PPT、讲稿、练习册与产品策略）](downloads/course_bundle.zip)

打开文件页面后点击 **Download raw file**（下载原始文件）或下载图标，保存到本地。PPT 用 WPS Office 或 Microsoft PowerPoint 打开；ZIP 解压后使用。

## 在线审阅

- [课程讲稿](course/课程讲稿.md)
- [练习册与行动卡](course/练习册与行动卡.md)
- [产品决策规则](course/产品决策规则.md)
- [来源与核验清单](course/来源与核验清单.md)
- [版式预览](course/课程版式预览.jpg)

课程第一版依据作者提供的四份文档整理，默认目标为稳健上分，条件允许时追求吃鸡。具体版本事实与实战效果尚未核验，正式售卖前需作者审稿。课程目录中的产品规则保留原始规格；本次软件实现与边界以软件使用说明为准。
