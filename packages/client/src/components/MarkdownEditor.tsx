import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import { common, createLowlight } from 'lowlight'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  Image as ImageIcon,
  Link as LinkIcon,
  Heading2,
  CodeSquare,
  Minus,
  Undo,
  Redo,
  Strikethrough,
  Highlighter,
} from 'lucide-react'
import api from '../lib/api'
import { toastStore } from '../App'

const lowlight = createLowlight(common)

interface MarkdownEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-primary text-white'
          : 'text-campus-text-secondary hover:bg-primary/10 hover:text-primary'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  )
}

export default function MarkdownEditor({
  content,
  onChange,
  placeholder = '写下你的内容...',
  minHeight = 'min-h-[200px]',
}: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full rounded-lg my-2' },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Highlight.configure({
        multicolor: false,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none ${minHeight} p-3 focus:outline-none text-campus-text-primary`,
      },
    },
  })

  if (!editor) return null

  const addLink = () => {
    const url = window.prompt('URL:')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  const addImage = async () => {
    // 创建文件输入
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      if (file.size > 5 * 1024 * 1024) {
        toastStore.warning('图片不能超过5MB')
        return
      }

      try {
        // 读取并上传图片
        const reader = new FileReader()
        reader.onload = async () => {
          const base64 = reader.result as string
          try {
            const res = await api.post('/upload', { image: base64, filename: file.name })
            editor.chain().focus().setImage({ src: res.data.url }).run()
            toastStore.success('图片上传成功')
          } catch {
            toastStore.error('图片上传失败')
          }
        }
        reader.readAsDataURL(file)
      } catch {
        toastStore.error('图片读取失败')
      }
    }

    input.click()
  }

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden">
      <div className="flex flex-wrap gap-0.5 p-2 border-b border-border bg-surface/50">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo size={16} />
        </ToolbarButton>
        <div className="w-px h-6 bg-border mx-1 self-center" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
        >
          <Strikethrough size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive('highlight')}
        >
          <Highlighter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
        >
          <Code size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
        >
          <CodeSquare size={16} />
        </ToolbarButton>
        <div className="w-px h-6 bg-border mx-1 self-center" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        >
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={16} />
        </ToolbarButton>
        <div className="w-px h-6 bg-border mx-1 self-center" />
        <ToolbarButton onClick={addLink} active={editor.isActive('link')}>
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={addImage}>
          <ImageIcon size={16} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
