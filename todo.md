# 用户功能扩展

1. 增加 昵称、qq号、邮箱、手机号4个字段，用户自行维护。
2. 昵称需要保证系统内唯一
3. 需要index.html界面提供按钮，新增用户信息维护的页面，注意用户信息维护的界面需要适配PC和移动端，尽量美观跟现有页面风格贴切。
4. 后台管理界面的系统设置里增加协议头配置，支持变量lang，模板填充可以是{{lang}}这种形式。
   协议头配置是个长文本字段，里面的内容类似下方的.其中url变量后续会拼成文件的下载链接

```json
{
  "海阔视界": "hiker://sub?lang={{lang}}&url={{url}}",
  "影图": "yt://sub?lang={{lang}}&url={{url}}",
  "皮卡丘": "peekpili://sub?lang={{lang}}&url={{url}}",
  "影视+": "vodplus://sub?lang={{lang}}&url={{url}}",
  "ZYFUN": "zyfun://sub?lang={{lang}}&url={{url}}"
}
```
5. 处理第1条之外，用户还要增加下载偏好，默认是直链下载，可以下拉选择系统管理配置过的偏号，只显示名称，如海阔视界、影图、皮卡丘、影视+、ZYFUN
6. 用户下载偏好的作用是，当选择了非直链下载的时候，自动使用第4条配置的去替换index页面文件列表的下载按钮的点击后实际打开链接。
规则是原本的下载直链替换模板里的{{url}}变量，至于{{lang}}变量的由来，根据文件类型自动识别当前下载的这个文件的lang.
可以参考 `src/routes/admin.js` 文件里 373-397行代码获取folder的逻辑。大概可以这样:
```javascript
let lang = null;
const ext = path.extname(file.filename).toLowerCase();
const tags = file.tags ? file.tags.split(',').map(t => t.trim()) : [];

if (['.json', '.txt', '.m3u'].includes(ext)) {
   lang = 'json';
} else if (ext === '.js') {
   if (tags.includes('dr2')) {
      lang = 'dr2';
   } else {
      lang = 'ds';
   }
} else if (ext === '.php') {
   folder = 'php';
} else if (ext === '.py') {
   folder = 'hipy';
}
```
以上功能全部完成后修改当前版本为1.0.2