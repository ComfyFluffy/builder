<template>
  <div ref="editorElement" class="code-text-editor"></div>
</template>
<script lang="ts">
let monaco: typeof import('monaco-editor')
let editorCtx: EditorCtx // define `editorCtx` here so `getProject` in `initMonaco` can get the right `editorCtx.project`

type EditorState = {
  scrollLeft: number
  scrollTop: number
}

/** Map from file-path to editor-state */
const editorStates = new Map<string, EditorState>()

function saveEditorState(file: string, editor: editor.IStandaloneCodeEditor) {
  editorStates.set(file, {
    scrollLeft: editor.getScrollLeft(),
    scrollTop: editor.getScrollTop()
  })
}

function resumeEditorState(file: string, editor: editor.IStandaloneCodeEditor) {
  const state = editorStates.get(file)
  editorStates.delete(file)
  if (state == null) return
  editor.setScrollLeft(state.scrollLeft)
  editor.setScrollTop(state.scrollTop)
}
</script>
<script setup lang="ts">
import { ref, shallowRef, watch, watchEffect } from 'vue'
import { formatSpxCode as onlineFormatSpxCode } from '@/apis/util'
import loader from '@monaco-editor/loader'
import { KeyCode, type editor, Position, MarkerSeverity, KeyMod } from 'monaco-editor'
import { useUIVariables } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useEditorCtx, type EditorCtx } from '../../EditorContextProvider.vue'
import { initMonaco, defaultThemeName } from './monaco'
import { useLocalStorage } from '@/utils/utils'

const props = defineProps<{
  file: string
  value: string
}>()
const emit = defineEmits<{
  'update:value': [string]
}>()

const editorElement = ref<HTMLDivElement>()

const monacoEditor = shallowRef<editor.IStandaloneCodeEditor>()

const uiVariables = useUIVariables()
const i18n = useI18n()
editorCtx = useEditorCtx()

const loaderConfig = {
  paths: {
    vs: 'https://builder-static.gopluscdn.com/libs/monaco-editor/0.45.0/min/vs'
  }
}
if (i18n.lang.value !== 'en') {
  const langOverride = {
    zh: 'zh-cn'
  }
  const locale = langOverride[i18n.lang.value] || i18n.lang.value
  loader.config({
    ...loaderConfig,
    'vs/nls': {
      availableLanguages: {
        '*': locale
      }
    }
  })
} else {
  loader.config(loaderConfig)
}

const getMonaco = async () => {
  if (monaco) return monaco
  const monaco_ = await loader.init()
  if (monaco) return monaco
  initMonaco(monaco_, uiVariables, i18n, () => editorCtx.project)
  monaco = monaco_
  return monaco
}

const initialFontSize = 14
const fontSize = useLocalStorage('spx-gui-code-font-size', initialFontSize)

watchEffect(async (onClenaup) => {
  const monaco = await getMonaco()
  const editor = monaco.editor.create(editorElement.value!, {
    value: props.value,
    theme: defaultThemeName,
    language: 'spx',
    minimap: { enabled: false },
    selectOnLineNumbers: true,
    roundedSelection: true,
    readOnly: false,
    cursorStyle: 'line', // line, block, 'line-thin', 'block-outline', 'underline', 'underline-thin'
    automaticLayout: true,
    glyphMargin: true, // the margin is used for glyph margin and line numbers
    useTabStops: false, // use tab key
    renderControlCharacters: false,
    fontSize: fontSize.value,
    quickSuggestionsDelay: 100,
    wordWrapColumn: 40,
    tabSize: 4,
    folding: true, // code folding
    foldingHighlight: true, // 折叠等高线
    foldingStrategy: 'indentation', // 折叠方式  auto | indentation
    showFoldingControls: 'mouseover', // 是否一直显示折叠 always | mouseover
    disableLayerHinting: true, // 等宽优
    lineNumbersMinChars: 2,
    scrollBeyondLastLine: false,
    overviewRulerLanes: 0,
    renderLineHighlight: 'none',
    scrollbar: {
      useShadows: false,
      horizontalScrollbarSize: 8,
      verticalScrollbarSize: 8
    }
  })

  editor.addAction({
    id: 'format',
    label: i18n.t({ zh: '格式化', en: 'Format Code' }),
    keybindings: [KeyMod.CtrlCmd | KeyCode.KeyL],
    contextMenuGroupId: 'navigation',
    run: format
  })

  editor.onDidChangeModelContent(() => {
    const newValue = editor.getValue()
    if (newValue !== props.value) emit('update:value', newValue)
  })

  editor.onDidChangeConfiguration((e) => {
    const fontSizeId = monaco.editor.EditorOption.fontSize
    if (e.hasChanged(fontSizeId)) {
      fontSize.value = editor.getOptions().get(fontSizeId)
    }
  })

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
    // We provide global undo/redo in project editor, without keyboard shortcut support.
    // So we disable default undo behavior (Cmd/Ctrl+Z) of monaco, which may cause confusing behavior if used together with global undo/redo.
    // Note that it is not appropriate to call global undo here, because global undo/redo merges code changes, it is not expected for Cmd+Z.
  })

  monacoEditor.value = editor
  resumeEditorState(props.file, editor)

  onClenaup(() => {
    saveEditorState(props.file, editor)
    editor.dispose()
  })
})

watch(
  () => [props.file, props.value],
  ([file, value], [oldFile]) => {
    const editor = monacoEditor.value
    if (editor == null) return
    if (file !== oldFile) saveEditorState(oldFile, editor)
    if (value !== editor.getValue()) editor.setValue(value)
    if (file !== oldFile) resumeEditorState(file, editor)
  }
)

function insertSnippet(insertText: string, position?: Position) {
  const editor = monacoEditor.value
  if (editor == null) return

  if (position) {
    editor.setPosition(position)
  }
  let contribution = editor.getContribution('snippetController2')
  ;(contribution as any).insert(insertText) // FIXME: get rid of `as any`
  editor.focus()
}

async function format() {
  const editor = monacoEditor.value
  if (editor == null) return

  const editorValue = editor.getValue()
  if (!editorValue) return

  const res = await onlineFormatSpxCode(editorValue)
  if (res.error) {
    monaco?.editor.setModelMarkers(editor.getModel()!, 'owner', [
      {
        message: res.error.msg,
        severity: MarkerSeverity.Warning,
        startLineNumber: res.error.line,
        startColumn: res.error.column,
        endLineNumber: res.error.line,
        endColumn: res.error.column
      }
    ])
    return
  }
  editor.setValue(res.body)
}

const actionIds = {
  in: 'fontZoomIn',
  out: 'fontZoomOut'
}

function zoomFont(action: 'in' | 'out' | 'initial') {
  const editor = monacoEditor.value
  if (editor == null) return
  if (action === 'initial') {
    editor.updateOptions({ fontSize: initialFontSize })
    editor.trigger('keyboard', `editor.action.fontZoomReset`, {})
    return
  }
  editor.trigger('keyboard', `editor.action.${actionIds[action]}`, {})
}

defineExpose({
  insertSnippet,
  format,
  zoomFont
})
</script>

<style scoped lang="scss">
.code-text-editor {
  width: 100%;
  height: 100%;
}
</style>

<style lang="scss">
.code-text-editor .monaco-editor .monaco-hover {
  // keep consistent with component `UITooltip`
  width: auto !important;
  height: auto !important;
  border: none;
  border-radius: var(--ui-border-radius-1);
  color: var(--ui-color-grey-100);
  background-color: var(--ui-color-grey-1000);
  box-shadow: var(--ui-box-shadow-small);

  .monaco-hover-content {
    height: auto !important;
  }

  .hover-contents:not(.html-hover-contents) {
    padding: 7px 8px;
    font-size: 12px;
    line-height: 1.5;
  }

  .rendered-markdown {
    ul {
      list-style: square;
    }
    ol {
      list-style: decimal;
    }
    code {
      // keep consistent with component `UICode`
      padding: 2px 4px;
      font-size: 10px;
      font-family: var(--ui-font-family-code);
      line-height: 1.6;
      color: var(--ui-color-primary-main);
      background-color: var(--ui-color-primary-200);
      border-radius: 4px;
    }
  }
}
</style>
