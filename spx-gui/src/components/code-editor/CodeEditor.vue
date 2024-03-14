<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:30:26
 * @LastEditors: Hu JingJing
 * @LastEditTime: 2024-02-06 17:17:27
 * @FilePath: /spx-gui/src/components/code-editor/CodeEditor.vue
 * @Description: 
-->
<template>
  <div id="code-editor" ref="code_editor"></div>
</template>
<script lang="ts">
import 'vfonts/Lato.css'
import 'vfonts/FiraCode.css'
import {
  KeyCode,
  KeyMod,
  MarkerSeverity,
  Position,
  languages,
  editor as monacoEditor
} from 'monaco-editor'

register()
</script>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, withDefaults } from 'vue'

import { type CodeEditorProps, type CodeEditorEmits, type FormatResponse } from './index'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { formatSpxCode as onlineFormatSpxCode } from '@/api/project'
import { editorOptions } from './language'
import { register } from './register'
// ----------props & emit------------------------------------
const prop = withDefaults(defineProps<CodeEditorProps>(), {
  modelValue: '',
  height: '100%',
  width: '100%'
})
const emit = defineEmits<CodeEditorEmits>()

// ----------data related -----------------------------------
// register editor worker
self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker()
  }
}
// code_editor's dom
const code_editor = ref<HTMLElement | null>(null)
//  editor instance
let editor: monacoEditor.IStandaloneCodeEditor

// ----------hooks-----------------------------------------
// init editor and register change event
onMounted(() => {
  editor = monacoEditor.create(code_editor.value as HTMLElement, {
    value: prop.modelValue, // set the initial value of the editor
    theme: 'myTransparentTheme',
    ...editorOptions,
    ...prop.editorOptions
  })

  // register format action
  editor.addAction({
    id: 'format',
    label: 'Format Code',
    keybindings: [KeyMod.CtrlCmd | KeyCode.KeyL],
    contextMenuGroupId: 'navigation',
    run: format
  })

  // register change event
  editor.onDidChangeModelContent(onEditorValueChange)
})
// destroy editor
onBeforeUnmount(() => {
  editor.dispose()
})

watch(
  () => prop.editorOptions,
  (option) => {
    if (option) {
      editor.updateOptions(option)
    }
  },
  { deep: true }
)

watch(
  () => prop.modelValue,
  (val) => {
    if (editor) {
      const editorValue = editor.getValue()
      if (val !== editorValue) {
        editor.setValue(val)
      }
    }
  }
)

// ----------methods-----------------------------------------

/**
 * @description: editor's value change event, emit change event
 * @param {*} editor.IModelContentChangedEvent
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-31 13:45:55
 */
const onEditorValueChange = () => {
  emit('change', editor.getValue())
  emit('update:modelValue', editor.getValue())
}

/**
 * @description: After the user has obtained the component, user can insert the code snippet through the exported function
 * @param {*} fn () => { position: Position;snippet: languages.CompletionItem})
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-31 13:46:49
 */
const insertSnippet = (snippet: languages.CompletionItem, position?: Position) => {
  if (position) {
    editor.setPosition(position)
  }
  let contribution = editor.getContribution(
    'snippetController2'
  ) as monacoEditor.IEditorContribution
  // @ts-ignore
  contribution.insert(snippet.insertText)
  editor.focus()
}

const formatCode = async () => {
  return new Promise<FormatResponse>((resolve) => {
    onlineFormatSpxCode(editor.getValue()).then((res) => {
      resolve(res.data.data)
    })
  })
}

/**
 * @description: Format code
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-01 11:55:13
 */
const format = async () => {
  const forRes = await formatCode()
  if (forRes.Body) {
    editor.setValue(forRes.Body)
  } else {
    monacoEditor.setModelMarkers(editor.getModel()!, 'owner', [
      {
        message: forRes.Error.Msg,
        severity: MarkerSeverity.Warning,
        startLineNumber: forRes.Error.Line,
        startColumn: forRes.Error.Column,
        endLineNumber: forRes.Error.Column,
        endColumn: forRes.Error.Line
      }
    ])
  }
}

/**
 * @description: Clear the editor
 * @return {*}
 * @Author: Hu JingJing
 * @Date: 2024-02-06 17:00:00
 */
const clear = async () => {
  editor.setValue('')
}

defineExpose({
  insertSnippet,
  format,
  clear
})
</script>

<style>
.decorationsOverviewRuler {
  border-radius: 25px;
  width: 8px !important;
}
</style>
<style scoped>
#code-editor {
  height: v-bind('prop.height');
  width: v-bind('prop.width');
}
</style>
