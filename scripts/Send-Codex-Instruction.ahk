#Requires AutoHotkey v2.0
#SingleInstance Force

if (A_Args.Length < 1) {
    ExitApp(2)
}

instructionPath := A_Args[1]
logPath := ""
if (A_Args.Length >= 2) {
    logPath := A_Args[2]
}

if !FileExist(instructionPath) {
    ExitApp(3)
}

payload := Trim(FileRead(instructionPath, "UTF-8"), "`r`n`t ")
if (payload = "") {
    ExitApp(4)
}

Log(msg) {
    global logPath
    if (logPath = "") {
        return
    }
    try {
        ts := FormatTime(, "yyyy-MM-dd HH:mm:ss")
        FileAppend(ts " | " msg "`n", logPath, "UTF-8")
    }
}

TrySendTo(winId, label, payloadText) {
    try {
        WinActivate("ahk_id " winId)
        WinWaitActive("ahk_id " winId, , 2)
        Sleep(120)
        SendText(payloadText)
        Send("{Enter}")
        Log("sent to " label " (winId=" winId ")")
        return true
    } catch as err {
        Log("failed " label " (winId=" winId "): " err.Message)
        return false
    }
}

preferred := []
fallback := []

for hwnd in WinGetList() {
    title := WinGetTitle("ahk_id " hwnd)
    exe := ""
    try exe := WinGetProcessName("ahk_id " hwnd)

    t := StrLower(title)
    e := StrLower(exe)

    if (e = "explorer.exe" || e = "notepad.exe") {
        continue
    }

    if (e = "codex.exe" || e = "chatgpt.exe" || InStr(e, "codex") || InStr(e, "chatgpt")) {
        preferred.Push({id: hwnd, label: "preferred exe:" exe " title:" title})
        continue
    }

    if InStr(t, "codex") {
        fallback.Push({id: hwnd, label: "fallback title:" title " exe:" exe})
    }
}

for c in preferred {
    if TrySendTo(c.id, c.label, payload) {
        ExitApp(0)
    }
}

for c in fallback {
    if TrySendTo(c.id, c.label, payload) {
        ExitApp(0)
    }
}

Log("no Codex target window found")
ExitApp(5)
