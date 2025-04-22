import { atom, getDefaultStore } from "jotai"
import merge from "lodash/merge"
import { sidebarVisibleAtom } from "./sidebarState"
import mitt from "mitt"
import platform from "../platform"
import { nanoid } from "nanoid"

export const ChatInputHotkeyEvent = [
    "chat-input:submit",
    "chat-input:upload-file",
    "chat-input:focus",
    "chat-input:paste-last-message"
] as const
export type ChatInputHotkeyEvent = typeof ChatInputHotkeyEvent[number]

export const ChatMessageHotkeyEvent = ["chat-message:copy-last", "chat:delete"] as const
export type ChatMessageHotkeyEvent = typeof ChatMessageHotkeyEvent[number]

export const GlobalHotkeyEvent = [
  "global:new-chat",
  "global:toggle-sidebar",
  "global:close-layer",
  "global:toggle-keymap-modal",
] as const
export type GlobalHotkeyEvent = typeof GlobalHotkeyEvent[number]

export type HotkeyEvent = ChatInputHotkeyEvent|ChatMessageHotkeyEvent|GlobalHotkeyEvent

export type Modifier = "c"|"s"|"a"|"m"
export type ModifierPressed = {
  c?: boolean
  s?: boolean
  a?: boolean
  m?: boolean
}

export const emitter = mitt<Record<HotkeyEvent, undefined>>()

function getModifierPressedFromEvent(event: KeyboardEvent): ModifierPressed {
  return {
    c: event.ctrlKey,
    s: event.shiftKey,
    a: event.altKey,
    m: event.metaKey
  }
}

function compareModifierPressed(a: ModifierPressed, b: ModifierPressed): boolean {
  return !!a.c === !!b.c && !!a.s === !!b.s && !!a.a === !!b.a && !!a.m === !!b.m
}

function getModifierPressed(mods: Modifier[]): ModifierPressed {
  return mods.reduce((acc, mod) => {
    if (mod !== "s" && mod !== "c" && mod !== "a" && mod !== "m") {
      return acc
    }

    return {
      ...acc,
      [mod]: true
    }
  }, {})
}

function parseStringWithOrder(str: string) {
  const result = []
  let current = ""
  let isInTag = false

  for (let i = 0; i < str.length; i++) {
    if (str[i] === "<") {
      if (current) {
        result.push({ type: "text", content: current })
        current = ""
      }
      isInTag = true
      continue
    }

    if (str[i] === ">") {
      if (current) {
        result.push({ type: "tag", content: current })
        current = ""
      }
      isInTag = false
      continue
    }

    current += str[i]
  }

  if (current) {
    result.push({ type: isInTag ? "tag" : "text", content: current })
  }

  return result
}

function parseHotkeyComponent(component: string, event: HotkeyEvent): Record<string, any> {
  const hotkey = parseStringWithOrder(component)
  if (!hotkey || !hotkey.length) {
    return {}
  }

  // TODO support <c-c><c-a>x in next time
  if (component.startsWith("<")) {
    return parseHotkeyTag(hotkey[0].content, event)
  }

  return parseHotkeyText(hotkey[0].content, event)
}

function parseHotkeyText(text: string, event: HotkeyEvent): Record<string, any> {
  const keys = text.split("")
  keys.reverse()
  return keys.reduce((acc, key, i) => {
    if (i === 0) {
      return {
        [key]: {
          event,
        }
      }
    }

    return {
      [key]: acc
    }
  }, {} as Record<string, any>)
}

function parseHotkeyTag(hotkey: string, event: HotkeyEvent): Record<string, any> {
  // minimal hotkey is like "c-a" if include "-" and length is less than 3, it"s invalid
  if (hotkey.includes("-") && hotkey.length < 3) {
    return {}
  }

  const buffer = hotkey.split("-")
  let key = buffer.pop()!
  if (!key) {
    key = "-"
  }

  const modifier: ModifierPressed = getModifierPressed(buffer as Modifier[])
  if (key >= "A" && key <= "Z") {
    modifier.s = true
  }

  return {
    [key.toLowerCase()]: {
      event,
      modifier,
    }
  }
}

function getHotkeyMap(hotkeys: Record<HotkeyEvent, string>) {
  return Object.keys(hotkeys).reduce((acc, event) => {
    return merge(acc, parseHotkeyComponent(hotkeys[event as HotkeyEvent], event as HotkeyEvent))
  }, {})
}

let hotkeyBuffer: string[] = []
export function handleGlobalHotkey(e: KeyboardEvent) {
  const store = getDefaultStore()

  const key = e.key.toLowerCase()
  if (key !== "control" && key !== "shift" && key !== "alt" && key !== "meta") {
    hotkeyBuffer.push(key)
  }

  const event = store.set(getHotkeyEventAtom, hotkeyBuffer, getModifierPressedFromEvent(e))

  if (event !== undefined) {
    hotkeyBuffer = []
  }

  if (event === null) {
    return
  }

  if (event) {
    e.preventDefault()
  }

  if (event && event.startsWith("global:")) {
    return store.set(handleGlobalEventAtom, event)
  }

  if (event) {
    emitter.emit(event)
  }
}

export const handleGlobalEventAtom = atom(
  null, 
  (get, set, action: GlobalHotkeyEvent) => {
    const modals = get(modalsAtom)

    switch (action) {
      case "global:new-chat":
        set(activeConversationIdAtom, nanoid())
        break
      case "global:toggle-sidebar":
        set(sidebarVisibleAtom, !get(sidebarVisibleAtom))
        break
      case "global:close-layer": {
        if (modals.keymap) {
          set(modalsAtom, { ...modals, keymap: false })
        } else if (modals.settings) {
          set(modalsAtom, { ...modals, settings: false })
        } else {
          set(selectedMessagesAtom, {})
        }
        break
      }
      case "global:toggle-keymap-modal":
        set(modalsAtom, { ...modals, keymap: !modals.keymap })
        break
      default:
        break
    }
  }
)

export const hotKeymapAtom = atom<Record<string, any>|null>(null)
export const rawKeymapAtom = atom<Record<string, string>>({})

export const loadHotkeyMapAtom = atom(
  null,
  async (get, set) => {
    try {
      const rawMap = await platform.getHotkeyMap()
      if (!rawMap) {
        throw new Error("Failed to get hotkey map from platform")
      }
      const map = getHotkeyMap(rawMap)
      set(rawKeymapAtom, rawMap)
      set(hotKeymapAtom, map)
    } catch (error) {
      console.error("Error loading hotkey map:", error)
      // Provide default hotkey map as fallback
      const defaultMap = {
        "chat-input:submit": "<c-s-m>",
        "chat-input:upload-file": "<c-p>",
        "chat-input:focus": "<c-l>",
        "chat-input:paste-last-message": "<c-y>",
        "chat-message:copy-last": "<c-c>",
        "chat:delete": "<c-d>",
        "global:new-chat": "<c-n>",
        "global:toggle-sidebar": "<c-b>",
        "global:close-layer": "Escape",
        "global:toggle-keymap-modal": "<c-/>"
      }
      set(rawKeymapAtom, defaultMap)
      set(hotKeymapAtom, getHotkeyMap(defaultMap))
    }
  }
)

export const getHotkeyEventAtom = atom(
  null,
  (get, set, keys: string[], modifierPressed: ModifierPressed) => {
    const map = get(hotKeymapAtom)
    if (!map) {
      return null
    }

    let _map = map
    for (const key of keys) {
      if (!_map) {
        return null
      }
      
      _map = _map[key]

      if (!_map) {
        return null
      }

      if (!("event" in _map)) {
        continue
      }

      if (!compareModifierPressed(_map.modifier, modifierPressed)) {
        return null
      }

      return _map.event
    }

    return undefined
  }
)

// Define the missing atoms
export const activeConversationIdAtom = atom("")
export const conversationsAtom = atom({})
export const modalsAtom = atom({
  keymap: false,
  settings: false
})
export const selectedMessagesAtom = atom({})