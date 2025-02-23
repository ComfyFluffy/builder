import { useRouter } from 'vue-router'
import { useModal, useConfirmDialog } from '@/components/ui'
import { IsPublic, deleteProject } from '@/apis/project'
import ProjectCreateModal from './ProjectCreateModal.vue'
import ProjectOpenModal from './ProjectOpenModal.vue'
import ProjectSharingLinkModal from './ProjectSharingLinkModal.vue'
import { useI18n } from '@/utils/i18n'
import type { Project } from '@/models/project'
import { getProjectEditorRoute } from '@/router'

export function useCreateProject() {
  const modal = useModal(ProjectCreateModal)

  return function createProject() {
    return modal({})
  }
}

export function useOpenProject() {
  const router = useRouter()
  const modal = useModal(ProjectOpenModal)

  return async function openProject() {
    const project = await modal({})
    router.push(getProjectEditorRoute(project.name))
  }
}

export function useRemoveProject() {
  const { t } = useI18n()
  const withConfirm = useConfirmDialog()

  return async function removeProject(owner: string, name: string) {
    return withConfirm({
      title: t({ en: `Remove project ${name}`, zh: `删除项目 ${name}` }),
      content: t({
        en: `Removed projects can not be recovered. Are you sure you want to remove project ${name}?`,
        zh: `删除后的项目无法恢复，确定要删除项目 ${name} 吗？`
      }),
      confirmHandler: () => deleteProject(owner, name)
    })
  }
}

export function useCreateProjectSharingLink() {
  const modal = useModal(ProjectSharingLinkModal)

  return async function createProjectSharingLink(project: Project) {
    await modal({ project })
  }
}

/**
 * Share given project
 * - make project public
 * - copy sharing link
 */
export function useShareProject() {
  const { t } = useI18n()
  const withConfirm = useConfirmDialog()
  const createProjectSharingLink = useCreateProjectSharingLink()

  async function makePublic(project: Project) {
    project.setPublic(IsPublic.public)
    await project.saveToCloud()
  }

  return async function shareProject(project: Project) {
    if (project.isPublic !== IsPublic.public) {
      await withConfirm({
        title: t({ en: 'Share project', zh: '分享项目' }),
        content: t({
          en: 'To share the current project, it will be made public. Would you like to proceed?',
          zh: '为了分享当前项目，它将被设置为公开。确认继续吗？'
        }),
        confirmHandler: () => makePublic(project)
      })
    }
    return createProjectSharingLink(project)
  }
}

export function useStopSharingProject() {
  const { t } = useI18n()
  const withConfirm = useConfirmDialog()

  async function makePersonal(project: Project) {
    project.setPublic(IsPublic.personal)
    await project.saveToCloud()
  }

  return async function stopSharingProject(project: Project) {
    return withConfirm({
      title: t({ en: 'Stop sharing project', zh: '停止分享项目' }),
      content: t({
        en: 'If sharing is stopped, others will no longer have access to the current project, and its sharing links will expire. Would you like to proceed?',
        zh: '如果停止分享，其他人将无法访问当前项目，且分享链接将会失效。确认继续吗？'
      }),
      confirmHandler: () => makePersonal(project)
    })
  }
}
