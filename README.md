# text-poster

锁屏文字海报生成器：纯灰阶、颗粒巨字、五套版心，浏览器端 Canvas 渲染，导出 PNG。

在浏览器里打开 `index.html` 即可使用；文字规则测试用 `node --test typo.test.js`。

界面组件来自 [mdui](https://www.mdui.org/)（通过 unpkg CDN 引入），主色取自 `#6285BC`。组件脚本、样式、图标字体需要联网加载。

## 算法来源与修改

本项目把 [AnkioTomas/moon](https://github.com/AnkioTomas/moon)（GPL-3.0）中的以下文件移植为 JavaScript / Canvas：

- `book.koplugin/features/lockscreen/typo.lua` — 五套版式的排版与颗粒绘制
- `book.koplugin/features/lockscreen/typo_text.lua` — 切词、按词断行、避头尾、分句、竖排标点、关键词挑选
- `book.koplugin/features/lockscreen/typo_words.txt` — 词表（见下方第三方）
- `book.koplugin/features/lockscreen/danxiangli.lua` — 单向历版式（公历日、农历、按日期固定的每日一句）

修改说明：2026-11-17 移植到浏览器，保留排版算法本身，改为 Canvas 2D 绘制；替换了字体测量、颗粒着色与界面部分，并新增尺寸选择、版式缩略图、每行字数与强制换行等浏览器端功能。单向历的农历数据在勾选后取自公开接口 `api.530.news`（该接口没有节气，故第三行只显示节日），取不到时只画公历。修改后的实现见 `index.html`、`typo_words.js`、`typo.test.js`。

## 许可证

本项目是上述 GPL-3.0 作品的衍生作品，整体以 **GNU General Public License v3.0**（GPL-3.0）发布，许可证全文见 [LICENSE](LICENSE)。本程序不提供任何担保。

Copyright (C) 2026 Henry

## 第三方

`typo_words.js` 内的词表来自 jieba 的 `dict.txt`（截取 2–4 字常用词并压缩编码），以 MIT 许可证分发：

Copyright (c) 2013 Sun Junyi

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

`index.html` 通过 CDN 使用 mdui v2.1.5 与 Material Icons 字体，以 MIT 许可证分发：

Copyright (c) 2016-present zdhxiong@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
