# VoxIntel 智能录音助手

基于纯本地显卡 Whisper 与极简看板的个人会议纪要与对话速记系统。

## GitHub Actions 云端 iOS 打包
项目内置了 `.github/workflows/ios-build.yml`，每次提交即可自动在 GitHub 官方 macOS 虚拟机上完成 Xcode 编译，并输出标准未签名 `.ipa` 安装包供手机安装体验。
